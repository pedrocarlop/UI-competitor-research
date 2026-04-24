import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Browser, BrowserContext, chromium, Page } from "playwright";
import { runSetupValidation } from "./checkSetup.js";
import {
  CaptureExecutionResult,
  CaptureRequest,
  CaptureStep,
  CompetitorCapture,
  CredentialEntry,
  DiscoveredCompetitor,
  EvidenceRecord,
  ExcludedCompetitor,
  ManualInterventionCheckpoint,
  ResearchRun,
  SourceMap,
  SourceMapEntry,
  assertSafeToProceed,
  buildStoredResearchInput,
  createRunDirectory,
  defaultFigmaExport,
  dedupe,
  emptyAnalysis,
  emptyCrossFindings,
  ensureDir,
  findCredential,
  loadCredentialRegistry,
  logSection,
  normalizeResearchInput,
  nowIso,
  readJsonFile,
  requireInput,
  slugify,
  summarizeList,
  writeJsonFile,
} from "./_shared.js";

const SAFE_KEYWORDS = [
  "create",
  "payment link",
  "payment links",
  "links",
  "checkout",
  "online checkout",
  "catalog",
  "products",
  "settings",
  "branding",
  "manage",
];

const BLOCKED_KEYWORDS = [
  "captcha",
  "security verification",
  "verifies you are human",
  "verify you are human",
  "checking your browser",
  "enable javascript and cookies",
  "challenge-platform",
  "verify it's you",
  "verification code",
  "enter code",
  "sms",
  "two-factor",
  "2fa",
  "one-time passcode",
  "confirm payment",
  "pay now",
  "send money",
  "purchase",
  "delete",
  "remove account",
  "legal",
  "agreement",
];

const NOTE_PHRASES = [
  "payment links",
  "payment link",
  "online checkout",
  "checkout",
  "dashboard",
  "branding",
  "settings",
  "products",
  "catalog",
  "manage",
];

const EMAIL_INPUT_SELECTORS = [
  "input[type='email']",
  "input[name='email']",
  "input[name='username']",
  "input[id*='email']",
];

const PASSWORD_INPUT_SELECTORS = [
  "input[type='password']",
  "input[name='password']",
  "input[id*='password']",
];

const AUTH_SUBMIT_KEYWORDS = ["sign in", "log in", "continue", "next"];

const CREDENTIAL_ERROR_KEYWORDS = [
  "incorrect password",
  "incorrect email",
  "incorrect credentials",
  "invalid password",
  "invalid email",
  "invalid login",
  "wrong password",
  "wrong email",
  "try again",
  "couldn't sign you in",
  "unable to sign in",
];

const MAX_AUTH_ATTEMPTS = 2;

interface ResumeContext {
  resume_url?: string;
  source_run_id?: string;
}

interface BrowserAgentRequestPayload {
  contract_version: 2;
  competitor_name: string;
  product_url: string;
  login_url: string;
  feature_description: string;
  run_id: string;
  run_directory: string;
  screenshot_directory: string;
  auth_attempts_max: number;
  manual_login_required_after_two_attempts: true;
  manual_intervention_policy: {
    handoff_required_for: string[];
    user_resolves_in_visible_browser: true;
    resume_signal: "terminal_enter";
    never_bypass: string[];
  };
  credentials: {
    login_url?: string;
    email: string;
    password: string;
    notes?: string;
    start_url?: string;
    navigation_hints?: string[];
  };
  navigation_hints: string[];
  resume_url?: string;
  blocked_keywords: string[];
  safe_keywords: string[];
  output: {
    request_path: string;
    result_path: string;
  };
}

interface BrowserAgentResultPayload {
  capture?: Partial<CompetitorCapture>;
  checkpoint?: ManualInterventionCheckpoint;
}

interface BrowserSession {
  browser: Browser;
  context: BrowserContext;
  page: Page;
}

interface ManualLoginResolution {
  session: BrowserSession;
  checkpoint?: ManualInterventionCheckpoint;
  aborted?: boolean;
}

interface AutomatedLoginOutcome {
  session: BrowserSession;
  checkpoint?: ManualInterventionCheckpoint;
  capture?: CompetitorCapture;
}

function buildEmptyCapture(
  competitorName: string,
  status: CompetitorCapture["status"],
  summary: string,
  warning: string,
  navigationHints: string[],
  resumeUrl?: string,
): CompetitorCapture {
  return {
    competitor_name: competitorName,
    status,
    summary,
    steps: [],
    analysis: emptyAnalysis(),
    warnings: [warning],
    ...(navigationHints.length > 0 ? { navigation_hints_used: navigationHints } : {}),
    ...(resumeUrl ? { resume_url: resumeUrl } : {}),
  };
}

function normalizeTextSnippet(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function extractTitleCasePhrases(notes: string): string[] {
  return notes.match(/\b[A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+)+\b/g) ?? [];
}

function buildNavigationHints(credential: CredentialEntry): string[] {
  const lowerNotes = credential.notes?.toLowerCase() ?? "";
  const noteHints = NOTE_PHRASES.filter((phrase) => lowerNotes.includes(phrase));
  const titleCasePhrases = extractTitleCasePhrases(credential.notes ?? "");

  return dedupe([...(credential.navigation_hints ?? []), ...titleCasePhrases, ...noteHints]).map((hint) => hint.toLowerCase());
}

function loadResumeContext(maybePath: string | undefined, competitorName: string): ResumeContext {
  if (!maybePath) {
    return {};
  }

  const previousRun = readJsonFile<ResearchRun>(maybePath);
  const checkpoint = previousRun.manual_intervention_checkpoints.find(
    (entry) => slugify(entry.competitor_name) === slugify(competitorName),
  );
  if (checkpoint) {
    return {
      resume_url: checkpoint.url,
      source_run_id: previousRun.run_id,
    };
  }

  const previousCapture = previousRun.captures.find((entry) => slugify(entry.competitor_name) === slugify(competitorName));
  const lastStep = previousCapture?.steps.at(-1);
  return {
    ...(lastStep?.url ? { resume_url: lastStep.url } : {}),
    source_run_id: previousRun.run_id,
  };
}

async function collectVisibleHeadings(page: Page): Promise<string[]> {
  return page
    .locator("h1, h2, h3, [role='heading']")
    .evaluateAll((elements) =>
      elements
        .map((element) => element.textContent?.trim() ?? "")
        .filter((text) => text.length > 0)
        .slice(0, 8),
    );
}

async function collectVisibleTextSnippets(page: Page): Promise<string[]> {
  const bodyText = await page.locator("body").innerText({ timeout: 5_000 }).catch(() => "");
  const codeLikePattern = /[{}<>]|function\(|window\.|document\.|__cf|ray=|mdrd:|cType:|cdn-cgi/i;
  return dedupe(
    bodyText
      .split(/\n+/)
      .map((line) => line.replace(/\s+/g, " ").trim())
      .filter((line) => line.length >= 4 && line.length <= 140)
      .filter((line) => !codeLikePattern.test(line))
      .filter((line) => (line.match(/[=<>{}]/g)?.length ?? 0) <= 1),
  ).slice(0, 24);
}

async function waitForPageToSettle(page: Page): Promise<void> {
  await page.waitForLoadState("domcontentloaded", { timeout: 60_000 }).catch(() => undefined);
  await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => undefined);
  await page.waitForTimeout(1_000).catch(() => undefined);
}

async function detectBarrier(page: Page): Promise<string | undefined> {
  const content = (await page.locator("body").innerText().catch(() => page.textContent("body")))?.toLowerCase() ?? "";
  const url = page.url().toLowerCase();
  const keywordMatch = BLOCKED_KEYWORDS.find((keyword) => content.includes(keyword));
  if (keywordMatch) {
    return keywordMatch;
  }
  if (url.includes("__cf_chl") || url.includes("/cdn-cgi/challenge-platform/")) {
    return "cloudflare challenge";
  }
  return undefined;
}

async function detectCredentialError(page: Page): Promise<string | undefined> {
  const content = (await page.locator("body").innerText().catch(() => page.textContent("body")))?.toLowerCase() ?? "";
  return CREDENTIAL_ERROR_KEYWORDS.find((keyword) => content.includes(keyword));
}

async function saveStep(
  page: Page,
  competitorDir: string,
  steps: CaptureStep[],
  stepLabel: string,
  changeNote: string,
  whyItMatters: string,
): Promise<void> {
  const stepNumber = steps.length + 1;
  const fileName = `${String(stepNumber).padStart(2, "0")}-${slugify(stepLabel)}.png`;
  const screenshotPath = path.join(competitorDir, fileName);
  await page.screenshot({
    path: screenshotPath,
    fullPage: true,
    mask: [...EMAIL_INPUT_SELECTORS, ...PASSWORD_INPUT_SELECTORS].map((selector) => page.locator(selector)),
  });
  const visibleHeadings = await collectVisibleHeadings(page);
  const visibleTextSnippets = (await collectVisibleTextSnippets(page)).map(normalizeTextSnippet);
  steps.push({
    step_number: stepNumber,
    step_label: slugify(stepLabel),
    screenshot_path: screenshotPath,
    url: page.url(),
    change_note: changeNote,
    why_it_matters: whyItMatters,
    visible_headings: visibleHeadings,
    visible_text_snippets: visibleTextSnippets,
  });
}

async function fillIfVisible(page: Page, selectors: string[], value: string): Promise<boolean> {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if ((await locator.count()) > 0 && (await locator.isVisible())) {
      await locator.fill(value);
      return true;
    }
  }
  return false;
}

async function hasVisibleLocator(page: Page, selectors: string[]): Promise<boolean> {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if ((await locator.count()) > 0 && (await locator.isVisible().catch(() => false))) {
      return true;
    }
  }
  return false;
}

async function isAuthSurface(page: Page): Promise<boolean> {
  return (await hasVisibleLocator(page, EMAIL_INPUT_SELECTORS)) || (await hasVisibleLocator(page, PASSWORD_INPUT_SELECTORS));
}

async function clickFirstMatchingText(page: Page, keywords: string[]): Promise<string | undefined> {
  const candidates = page.getByRole("link").or(page.getByRole("button"));
  const count = await candidates.count();
  for (let index = 0; index < count; index += 1) {
    const locator = candidates.nth(index);
    const text = ((await locator.innerText().catch(() => "")) ?? "").toLowerCase();
    if (BLOCKED_KEYWORDS.some((keyword) => text.includes(keyword))) {
      continue;
    }
    if (keywords.some((keyword) => text.includes(keyword.toLowerCase()))) {
      await locator.click().catch(() => undefined);
      return text;
    }
  }
  return undefined;
}

async function submitAuthSurface(page: Page): Promise<string | undefined> {
  const clicked = await clickFirstMatchingText(page, AUTH_SUBMIT_KEYWORDS);
  if (clicked) {
    await waitForPageToSettle(page);
    return clicked;
  }

  if (await hasVisibleLocator(page, PASSWORD_INPUT_SELECTORS)) {
    await page.keyboard.press("Enter").catch(() => undefined);
    await waitForPageToSettle(page);
    return "enter";
  }

  return undefined;
}

async function navigateToTargetUrl(
  page: Page,
  competitorDir: string,
  steps: CaptureStep[],
  targetUrl: string,
  label: string,
  changeNote: string,
): Promise<void> {
  await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await waitForPageToSettle(page);
  await saveStep(
    page,
    competitorDir,
    steps,
    label,
    changeNote,
    "Shows the precise state the run is resuming from or targeting after login.",
  );
}

async function tryGuidedNavigation(
  page: Page,
  competitorDir: string,
  steps: CaptureStep[],
  navigationHints: string[],
): Promise<string | undefined> {
  for (const hint of navigationHints) {
    const clicked = await clickFirstMatchingText(page, [hint]);
    if (!clicked) {
      continue;
    }

    await waitForPageToSettle(page);
    await saveStep(
      page,
      competitorDir,
      steps,
      "guided-navigation",
      `Used competitor credential guidance to navigate via "${clicked}".`,
      "Shows where a note-based hint was necessary to keep the benchmark on the intended feature path.",
    );
    return clicked;
  }

  return undefined;
}

function normalizeBrowserAgentResult(
  competitorName: string,
  result: BrowserAgentResultPayload | undefined,
  navigationHints: string[],
  resumeUrl?: string,
): { capture: CompetitorCapture; checkpoint?: ManualInterventionCheckpoint } {
  if (!result?.capture) {
    return {
      capture: buildEmptyCapture(
        competitorName,
        "partial",
        "Capture delegated to the configured browser-agent command.",
        "The browser-agent command completed without returning a structured result payload.",
        navigationHints,
        resumeUrl,
      ),
    };
  }

  const resolvedResumeUrl = result.capture.resume_url ?? resumeUrl;
  const capture: CompetitorCapture = {
    competitor_name: result.capture.competitor_name ?? competitorName,
    status: result.capture.status ?? "partial",
    summary: result.capture.summary ?? "Capture delegated to the configured browser-agent command.",
    steps: result.capture.steps ?? [],
    analysis: result.capture.analysis ?? emptyAnalysis(),
    warnings: result.capture.warnings ?? [],
    navigation_hints_used: result.capture.navigation_hints_used ?? navigationHints,
    ...(resolvedResumeUrl ? { resume_url: resolvedResumeUrl } : {}),
  };

  return {
    capture,
    ...(result.checkpoint ? { checkpoint: result.checkpoint } : {}),
  };
}

function runBrowserAgentCommand(
  command: string,
  payload: BrowserAgentRequestPayload,
): { capture: CompetitorCapture; checkpoint?: ManualInterventionCheckpoint } {
  writeJsonFile(payload.output.request_path, {
    ...payload,
    credentials: {
      ...payload.credentials,
      password: "[redacted]",
    },
  });

  const shell = process.env.SHELL ?? "zsh";
  const result = spawnSync(shell, ["-lc", `${command} "$BROWSER_AGENT_PAYLOAD_JSON"`], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      BROWSER_AGENT_PAYLOAD_JSON: JSON.stringify(payload),
      BROWSER_AGENT_REQUEST_PATH: payload.output.request_path,
      BROWSER_AGENT_RESULT_PATH: payload.output.result_path,
    },
    stdio: "inherit",
  });

  if (result.status !== 0) {
    throw new Error(`Browser-agent command exited with status ${result.status ?? 1}.`);
  }

  const structuredResult = existsSync(payload.output.result_path)
    ? readJsonFile<BrowserAgentResultPayload>(payload.output.result_path)
    : undefined;

  return normalizeBrowserAgentResult(
    payload.competitor_name,
    structuredResult,
    payload.navigation_hints,
    payload.resume_url,
  );
}

async function launchBrowserSession(headless: boolean): Promise<BrowserSession> {
  const browser = process.env.PLAYWRIGHT_WS_ENDPOINT
    ? await chromium.connect(process.env.PLAYWRIGHT_WS_ENDPOINT)
    : await chromium.launch({ headless });
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const page = await context.newPage();
  return { browser, context, page };
}

async function closeBrowserSession(session: BrowserSession): Promise<void> {
  await session.context.close().catch(() => undefined);
  await session.browser.close().catch(() => undefined);
}

function printManualLoginInstructions(competitorName: string): void {
  logSection(`Manual Login Required / ${competitorName}`);
  console.log("Complete login, 2FA, CAPTCHA, or account verification manually in the opened browser.");
  console.log("Do not complete payments, destructive actions, or legal agreements.");
  console.log("Press Enter in this terminal to continue capture.");
  console.log("Press Ctrl+C to stop and keep the checkpoint.");
}

async function waitForManualLoginDecision(): Promise<"continue" | "abort"> {
  if (!process.stdin.isTTY) {
    return "abort";
  }

  return new Promise((resolve) => {
    const stdin = process.stdin;
    const onData = (chunk: Buffer | string) => {
      const value = Buffer.isBuffer(chunk) ? chunk.toString("utf8") : chunk;
      if (value.includes("\u0003")) {
        cleanup();
        resolve("abort");
        return;
      }
      if (value.includes("\r") || value.includes("\n")) {
        cleanup();
        resolve("continue");
      }
    };

    const cleanup = () => {
      stdin.off("data", onData);
      if (stdin.isTTY) {
        stdin.setRawMode(false);
      }
      stdin.pause();
    };

    stdin.resume();
    stdin.setEncoding("utf8");
    if (stdin.isTTY) {
      stdin.setRawMode(true);
    }
    stdin.on("data", onData);
  });
}

async function resolveManualLogin(
  session: BrowserSession,
  competitor: DiscoveredCompetitor,
  credential: CredentialEntry,
  competitorDir: string,
  steps: CaptureStep[],
  attempts: number,
  headless: boolean,
  options: {
    targetUrl?: string;
    stepLabel?: string;
    changeNote?: string;
    checkpointReason?: string;
  } = {},
): Promise<ManualLoginResolution> {
  let activeSession = session;

  if (!process.env.PLAYWRIGHT_WS_ENDPOINT && headless) {
    await closeBrowserSession(activeSession);
    activeSession = await launchBrowserSession(false);
    await activeSession.page.goto(options.targetUrl ?? credential.login_url ?? competitor.login_url, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await waitForPageToSettle(activeSession.page);
  }

  await saveStep(
    activeSession.page,
    competitorDir,
    steps,
    options.stepLabel ?? "manual-login-required",
    options.changeNote ??
      `Stopped automated login after ${attempts} unresolved sign-in attempt${attempts === 1 ? "" : "s"}.`,
    "Shows the handoff point where the operator must continue safely in a visible browser.",
  );

  printManualLoginInstructions(competitor.competitor_name);
  const decision = await waitForManualLoginDecision();
  if (decision === "abort") {
    return {
      session: activeSession,
      aborted: true,
      checkpoint: {
        competitor_name: competitor.competitor_name,
        reason: options.checkpointReason ?? "manual_login_required_after_two_attempts",
        url: activeSession.page.url(),
        created_at: nowIso(),
      },
    };
  }

  await waitForPageToSettle(activeSession.page);
  await saveStep(
    activeSession.page,
    competitorDir,
    steps,
    "manual-login-resumed",
    "Resumed capture after the operator completed login manually.",
    "Shows the first visible state after manual login handoff.",
  );

  return { session: activeSession };
}

async function resolveGuardedState(
  session: BrowserSession,
  competitor: DiscoveredCompetitor,
  credential: CredentialEntry,
  competitorDir: string,
  steps: CaptureStep[],
  warnings: string[],
  navigationHints: string[],
  headless: boolean,
  resumeContext: ResumeContext,
  barrier: string,
  context: string,
): Promise<AutomatedLoginOutcome> {
  warnings.push(`Encountered guarded state requiring user handoff: ${barrier}.`);
  const manual = await resolveManualLogin(session, competitor, credential, competitorDir, steps, 1, headless, {
    targetUrl: session.page.url(),
    stepLabel: "manual-intervention-required",
    changeNote: `Encountered a guarded state containing "${barrier}" during ${context}.`,
    checkpointReason: `Manual intervention required for guarded state: ${barrier}`,
  });

  if (manual.aborted) {
    warnings.push("The operator stopped at the manual handoff and kept a checkpoint for later resume.");
    return {
      session: manual.session,
      capture: {
        competitor_name: competitor.competitor_name,
        status: "blocked",
        summary: `Capture paused because ${context} encountered a guarded state that requires manual user action.`,
        steps,
        analysis: emptyAnalysis(),
        warnings,
        ...(navigationHints.length > 0 ? { navigation_hints_used: navigationHints } : {}),
        ...(resumeContext.resume_url ? { resume_url: resumeContext.resume_url } : {}),
      },
      checkpoint: manual.checkpoint ?? {
        competitor_name: competitor.competitor_name,
        reason: `Blocked by guarded state: ${barrier}`,
        url: manual.session.page.url(),
        created_at: nowIso(),
      },
    };
  }

  const remainingBarrier = await detectBarrier(manual.session.page);
  if (remainingBarrier) {
    warnings.push(`Guarded state remained after manual handoff: ${remainingBarrier}.`);
    return {
      session: manual.session,
      capture: {
        competitor_name: competitor.competitor_name,
        status: "blocked",
        summary: "Capture stopped because a verification or unsafe barrier remained after manual handoff.",
        steps,
        analysis: emptyAnalysis(),
        warnings,
        ...(navigationHints.length > 0 ? { navigation_hints_used: navigationHints } : {}),
        ...(resumeContext.resume_url ? { resume_url: resumeContext.resume_url } : {}),
      },
      checkpoint: {
        competitor_name: competitor.competitor_name,
        reason: `Blocked by guarded state after manual handoff: ${remainingBarrier}`,
        url: manual.session.page.url(),
        created_at: nowIso(),
      },
    };
  }

  warnings.push("Manual handoff completed; capture resumed from the visible browser state.");
  return { session: manual.session };
}

async function runAutomatedLogin(
  session: BrowserSession,
  competitor: DiscoveredCompetitor,
  credential: CredentialEntry,
  competitorDir: string,
  steps: CaptureStep[],
  warnings: string[],
  navigationHints: string[],
  headless: boolean,
  resumeContext: ResumeContext,
): Promise<AutomatedLoginOutcome> {
  let activeSession = session;
  let attempts = 0;

  while (await isAuthSurface(activeSession.page)) {
    const emailFilled = await fillIfVisible(activeSession.page, EMAIL_INPUT_SELECTORS, credential.email);
    const passwordFilled = await fillIfVisible(activeSession.page, PASSWORD_INPUT_SELECTORS, credential.password);

    if (!emailFilled && !passwordFilled) {
      break;
    }

    await saveStep(
      activeSession.page,
      competitorDir,
      steps,
      attempts === 0 ? "sign-in" : `sign-in-attempt-${attempts + 1}`,
      attempts === 0
        ? "Filled visible login fields using the provided competitor credentials."
        : `Retried the visible login form with the provided competitor credentials (attempt ${attempts + 1}).`,
      "Captures the authentication surface and any relevant sign-in framing.",
    );

    const submission = await submitAuthSurface(activeSession.page);
    if (!submission) {
      warnings.push("The login form was visible, but no safe automated submit action could be identified.");
      break;
    }

    attempts += 1;

    const barrier = await detectBarrier(activeSession.page);
    if (barrier) {
      const handoff = await resolveGuardedState(
        activeSession,
        competitor,
        credential,
        competitorDir,
        steps,
        warnings,
        navigationHints,
        headless,
        resumeContext,
        barrier,
        "automated sign-in",
      );
      activeSession = handoff.session;
      if (handoff.capture) {
        return handoff;
      }
      return { session: activeSession };
    }

    const credentialError = await detectCredentialError(activeSession.page);
    const stillOnAuthSurface = await isAuthSurface(activeSession.page);
    if (!stillOnAuthSurface && !credentialError) {
      return { session: activeSession };
    }

    if (credentialError) {
      warnings.push(`Authentication attempt ${attempts} showed a credential-related message: ${credentialError}.`);
    } else {
      warnings.push(`Authentication attempt ${attempts} did not advance beyond the visible login surface.`);
    }

    if (attempts >= MAX_AUTH_ATTEMPTS) {
      const manual = await resolveManualLogin(
        activeSession,
        competitor,
        credential,
        competitorDir,
        steps,
        attempts,
        headless,
      );
      activeSession = manual.session;

      if (manual.aborted) {
        warnings.push("Automated login stopped after two attempts and the operator kept a manual checkpoint instead of resuming.");
        return {
          session: activeSession,
          capture: {
            competitor_name: competitor.competitor_name,
            status: "partial",
            summary: "Capture paused because manual login is required after two automated sign-in attempts.",
            steps,
            analysis: emptyAnalysis(),
            warnings,
            ...(navigationHints.length > 0 ? { navigation_hints_used: navigationHints } : {}),
            ...(resumeContext.resume_url ? { resume_url: resumeContext.resume_url } : {}),
          },
          ...(manual.checkpoint ? { checkpoint: manual.checkpoint } : {}),
        };
      }

      const barrierAfterManual = await detectBarrier(activeSession.page);
      if (barrierAfterManual) {
        warnings.push(`Encountered blocked verification or unsafe state: ${barrierAfterManual}.`);
        return {
          session: activeSession,
          capture: {
            competitor_name: competitor.competitor_name,
            status: "blocked",
            summary: "Capture stopped because a verification or unsafe barrier remained after manual login.",
            steps,
            analysis: emptyAnalysis(),
            warnings,
            ...(navigationHints.length > 0 ? { navigation_hints_used: navigationHints } : {}),
            ...(resumeContext.resume_url ? { resume_url: resumeContext.resume_url } : {}),
          },
          checkpoint: {
            competitor_name: competitor.competitor_name,
            reason: `Blocked by guarded state after manual login: ${barrierAfterManual}`,
            url: activeSession.page.url(),
            created_at: nowIso(),
          },
        };
      }

      return { session: activeSession };
    }
  }

  return { session: activeSession };
}

async function captureWithPlaywright(
  competitor: DiscoveredCompetitor,
  credential: CredentialEntry,
  competitorDir: string,
  headless: boolean,
  navigationHints: string[],
  resumeContext: ResumeContext,
): Promise<{ capture: CompetitorCapture; checkpoint?: ManualInterventionCheckpoint }> {
  let session = await launchBrowserSession(headless);
  const steps: CaptureStep[] = [];
  const warnings: string[] = [];
  const targetUrl = resumeContext.resume_url ?? credential.start_url ?? competitor.start_url;

  try {
    await session.page.goto(credential.login_url ?? competitor.login_url, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await waitForPageToSettle(session.page);
    await saveStep(
      session.page,
      competitorDir,
      steps,
      "entry",
      "Opened the most likely login or dashboard entry for the feature.",
      "Shows the realistic starting point before authentication or feature discovery.",
    );

    const automatedLogin = await runAutomatedLogin(
      session,
      competitor,
      credential,
      competitorDir,
      steps,
      warnings,
      navigationHints,
      headless,
      resumeContext,
    );
    session = automatedLogin.session;

    if (automatedLogin.capture) {
      return {
        capture: automatedLogin.capture,
        ...(automatedLogin.checkpoint ? { checkpoint: automatedLogin.checkpoint } : {}),
      };
    }

    const barrier = await detectBarrier(session.page);
    if (barrier) {
      const handoff = await resolveGuardedState(
        session,
        competitor,
        credential,
        competitorDir,
        steps,
        warnings,
        navigationHints,
        headless,
        resumeContext,
        barrier,
        "post-login capture",
      );
      session = handoff.session;
      if (handoff.capture) {
        return {
          capture: handoff.capture,
          ...(handoff.checkpoint ? { checkpoint: handoff.checkpoint } : {}),
        };
      }
    }

    if (targetUrl && session.page.url() !== targetUrl) {
      await navigateToTargetUrl(
        session.page,
        competitorDir,
        steps,
        targetUrl,
        resumeContext.resume_url ? "resume-target" : "guided-target",
        resumeContext.resume_url
          ? `Resumed from previous checkpoint state saved in run ${resumeContext.source_run_id ?? "unknown"}.`
          : "Used structured credential guidance to target the intended feature surface after login.",
      );
    }

    const clickedGuided = await tryGuidedNavigation(session.page, competitorDir, steps, navigationHints);
    if (!clickedGuided) {
      const clickedFeature = await clickFirstMatchingText(session.page, SAFE_KEYWORDS);
      if (clickedFeature) {
        await waitForPageToSettle(session.page);
        await saveStep(
          session.page,
          competitorDir,
          steps,
          "feature-entry",
          `Navigated deeper into the feature flow by clicking "${clickedFeature}".`,
          "Shows how the logged-in product exposes the target capability.",
        );
      }
    }

    const secondBarrier = await detectBarrier(session.page);
    if (secondBarrier) {
      const handoff = await resolveGuardedState(
        session,
        competitor,
        credential,
        competitorDir,
        steps,
        warnings,
        navigationHints,
        headless,
        resumeContext,
        secondBarrier,
        "feature discovery",
      );
      session = handoff.session;
      if (handoff.capture) {
        return {
          capture: {
            ...handoff.capture,
            status: handoff.capture.status === "blocked" ? "partial" : handoff.capture.status,
            summary: handoff.capture.summary || "Capture reached a guarded state after feature discovery.",
          },
          ...(handoff.checkpoint ? { checkpoint: handoff.checkpoint } : {}),
        };
      }
    }

    await saveStep(
      session.page,
      competitorDir,
      steps,
      "current-state",
      "Captured the current mainline state after login and safe navigation.",
      "Provides evidence of the visible configuration or management surface.",
    );

    const headings = summarizeList(steps.flatMap((step) => step.visible_headings ?? []), "No visible headings captured.", 4);
    return {
      capture: {
        competitor_name: competitor.competitor_name,
        status: steps.length >= 3 ? "captured" : "partial",
        summary: `Captured ${steps.length} meaningful states. Key headings observed: ${headings.join(", ")}.`,
        steps,
        analysis: emptyAnalysis(),
        warnings,
        ...(navigationHints.length > 0 ? { navigation_hints_used: navigationHints } : {}),
        ...(resumeContext.resume_url ? { resume_url: resumeContext.resume_url } : {}),
      },
    };
  } finally {
    await closeBrowserSession(session);
  }
}

function resolveCredentialPath(request: CaptureRequest): string | undefined {
  return request.credentials_path ?? request.credential_registry_path;
}

function buildStoredInputForCapture(request: CaptureRequest): ResearchRun["input"] {
  const credentialRegistryPath = resolveCredentialPath(request);
  return buildStoredResearchInput({
    feature_description: request.feature_description,
    ...(request.research_question ? { research_question: request.research_question } : {}),
    ...(request.research_name ? { research_name: request.research_name } : {}),
    ...(request.figma_destination_url ? { figma_destination_url: request.figma_destination_url } : {}),
    ...(request.company_name ? { company_name: request.company_name } : {}),
    ...(credentialRegistryPath ? { credential_registry_path: credentialRegistryPath } : {}),
    ...(request.credentials_path ? { credentials_path: request.credentials_path } : {}),
    ...(request.catalog_path ? { catalog_path: request.catalog_path } : {}),
    ...(request.resume_from_run_path ? { resume_from_run_path: request.resume_from_run_path } : {}),
    ...(request.competitor_allowlist ? { competitor_allowlist: request.competitor_allowlist } : {}),
    ...(request.competitors ? { competitors: request.competitors } : {}),
    ...(request.scope ? { scope: request.scope } : {}),
    ...(request.locale ? { locale: request.locale } : {}),
    ...(request.evidence_import_path ? { evidence_import_path: request.evidence_import_path } : {}),
    ...(request.output_path ? { output_path: request.output_path } : {}),
  });
}

function fallbackSourceEntries(competitor: DiscoveredCompetitor): SourceMapEntry[] {
  let origin = competitor.product_url;
  try {
    origin = new URL(competitor.product_url).origin;
  } catch {
    // Keep product URL as the fallback origin.
  }

  return [
    {
      competitor_name: competitor.competitor_name,
      source_type: "feature_page",
      url: competitor.product_url,
      notes: "Primary product URL from competitor discovery.",
      confidence: competitor.confidence,
      discovered_via: "catalog",
    },
    {
      competitor_name: competitor.competitor_name,
      source_type: "homepage",
      url: origin,
      notes: "Homepage inferred from product URL origin.",
      confidence: "medium",
      discovered_via: "heuristic",
    },
    {
      competitor_name: competitor.competitor_name,
      source_type: "pricing",
      url: `${origin}/pricing`,
      notes: "Likely pricing URL inferred from product URL origin.",
      confidence: "medium",
      discovered_via: "heuristic",
    },
  ];
}

function sourceEntriesForCompetitor(sourceMap: SourceMap | undefined, competitor: DiscoveredCompetitor): SourceMapEntry[] {
  const entries = sourceMap?.entries.filter(
    (entry) => slugify(entry.competitor_name) === slugify(competitor.competitor_name),
  ) ?? [];
  return entries.length > 0 ? entries : fallbackSourceEntries(competitor);
}

function captureStatusFromSteps(steps: CaptureStep[], warnings: string[]): CompetitorCapture["status"] {
  if (steps.length >= 2) {
    return "captured";
  }
  if (steps.length === 1 || warnings.length > 0) {
    return "partial";
  }
  return "blocked";
}

function evidenceFromStep(
  competitorName: string,
  source: SourceMapEntry,
  step: CaptureStep,
): EvidenceRecord {
  const observedBits = [
    ...(step.visible_headings ?? []).slice(0, 3),
    ...(step.visible_text_snippets ?? []).slice(0, 3),
  ];
  return {
    id: `${slugify(competitorName)}-${String(step.step_number).padStart(2, "0")}-${slugify(source.source_type)}`,
    competitor_name: competitorName,
    source_type: source.source_type,
    source_url: step.url,
    ...(source.title ? { source_title: source.title } : {}),
    screenshot_path: step.screenshot_path,
    observed_at: nowIso(),
    observed_fact:
      observedBits.length > 0
        ? `Captured visible public evidence: ${observedBits.join(" / ")}.`
        : step.change_note,
    inference: "Design and product implications require synthesis against other captured sources.",
    confidence: source.confidence,
  };
}

async function capturePublicSources(
  competitor: DiscoveredCompetitor,
  competitorDir: string,
  sourceMap: SourceMap | undefined,
): Promise<CompetitorCapture> {
  const entries = sourceEntriesForCompetitor(sourceMap, competitor)
    .filter((entry) => ["homepage", "feature_page", "pricing", "help_center", "docs"].includes(entry.source_type))
    .slice(0, 5);
  const steps: CaptureStep[] = [];
  const warnings: string[] = [];
  const evidenceRecords: EvidenceRecord[] = [];
  const session = await launchBrowserSession(true);

  try {
    for (const source of entries) {
      try {
        await session.page.goto(source.url, { waitUntil: "domcontentloaded", timeout: 45_000 });
        await waitForPageToSettle(session.page);
        const barrier = await detectBarrier(session.page);
        if (barrier) {
          warnings.push(`${source.source_type} skipped because a guarded state was detected: ${barrier}.`);
          continue;
        }

        await saveStep(
          session.page,
          competitorDir,
          steps,
          `public-${source.source_type}`,
          `Captured public ${source.source_type.replaceAll("_", " ")} evidence from ${source.url}.`,
          source.notes,
        );
        const step = steps.at(-1);
        if (step) {
          evidenceRecords.push(evidenceFromStep(competitor.competitor_name, source, step));
        }
      } catch (error) {
        warnings.push(
          `${source.source_type} capture failed for ${source.url}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  } finally {
    await closeBrowserSession(session);
  }

  const status = captureStatusFromSteps(steps, warnings);
  return {
    competitor_name: competitor.competitor_name,
    status,
    summary:
      steps.length > 0
        ? `Captured ${steps.length} public evidence state${steps.length === 1 ? "" : "s"} across ${entries.length} mapped source${entries.length === 1 ? "" : "s"}.`
        : "No public evidence screenshots could be captured automatically.",
    steps,
    analysis: emptyAnalysis(),
    warnings,
    source_map_entries: entries,
    evidence_records: evidenceRecords,
  };
}

function mergePublicAndAuthenticatedCaptures(
  publicCapture: CompetitorCapture,
  authenticatedCapture: CompetitorCapture,
): CompetitorCapture {
  const publicStepCount = publicCapture.steps.length;
  const authenticatedSteps = authenticatedCapture.steps.map((step, index) => ({
    ...step,
    step_number: publicStepCount + index + 1,
  }));

  return {
    ...publicCapture,
    status: authenticatedCapture.status === "captured" || publicCapture.status === "captured"
      ? "captured"
      : authenticatedCapture.status === "blocked" && publicCapture.status === "blocked"
        ? "blocked"
        : "partial",
    summary: `${publicCapture.summary} Authenticated lane: ${authenticatedCapture.summary}`,
    steps: [...publicCapture.steps, ...authenticatedSteps],
    warnings: [...publicCapture.warnings, ...authenticatedCapture.warnings],
    ...(authenticatedCapture.navigation_hints_used
      ? { navigation_hints_used: authenticatedCapture.navigation_hints_used }
      : {}),
    ...(authenticatedCapture.resume_url ?? publicCapture.resume_url
      ? { resume_url: authenticatedCapture.resume_url ?? publicCapture.resume_url }
      : {}),
    ...(publicCapture.source_map_entries ? { source_map_entries: publicCapture.source_map_entries } : {}),
    ...(publicCapture.evidence_records ? { evidence_records: publicCapture.evidence_records } : {}),
  };
}

export async function captureDiscoveredCompetitors(
  request: CaptureRequest,
  options: { runId: string; runDirectory: string },
): Promise<CaptureExecutionResult> {
  const normalized = normalizeResearchInput(request);
  const registry = loadCredentialRegistry(resolveCredentialPath(normalized), normalized.credentials);
  const included: string[] = [];
  const excluded: ExcludedCompetitor[] = [];
  const captures: CompetitorCapture[] = [];
  const warnings: string[] = [];
  const checkpoints: ManualInterventionCheckpoint[] = [];
  const hasCredentialInput = Boolean(resolveCredentialPath(normalized) ?? normalized.credentials);
  const headless = normalized.headless ?? (process.env.HEADLESS ? process.env.HEADLESS !== "false" : !hasCredentialInput);

  for (const competitor of normalized.discovered_competitors) {
    included.push(competitor.competitor_name);
    const competitorDir = ensureDir(path.join(options.runDirectory, slugify(competitor.competitor_name)));
    const publicCapture = await capturePublicSources(competitor, competitorDir, normalized.source_map);
    const credential = findCredential(registry, competitor.competitor_name);
    if (!credential) {
      captures.push(publicCapture);
      continue;
    }

    const navigationHints = buildNavigationHints(credential);
    const resumeContext = loadResumeContext(normalized.resume_from_run_path, competitor.competitor_name);

    if (process.env.BROWSER_AGENT_COMMAND) {
      try {
        const browserAgentRequestPath = path.join(competitorDir, "browser-agent-request.json");
        const browserAgentResultPath = path.join(competitorDir, "browser-agent-result.json");
        const browserAgentCredentials = {
          email: credential.email,
          password: credential.password,
          ...(credential.login_url ? { login_url: credential.login_url } : {}),
          ...(credential.notes ? { notes: credential.notes } : {}),
          ...(credential.start_url ?? competitor.start_url ? { start_url: credential.start_url ?? competitor.start_url } : {}),
          ...(credential.navigation_hints ? { navigation_hints: credential.navigation_hints } : {}),
        };

        const result = runBrowserAgentCommand(process.env.BROWSER_AGENT_COMMAND, {
          contract_version: 2,
          competitor_name: competitor.competitor_name,
          product_url: competitor.product_url,
          login_url: competitor.login_url,
          feature_description: normalized.feature_description,
          run_id: options.runId,
          run_directory: options.runDirectory,
          screenshot_directory: competitorDir,
          auth_attempts_max: MAX_AUTH_ATTEMPTS,
          manual_login_required_after_two_attempts: true,
          manual_intervention_policy: {
            handoff_required_for: ["2FA", "OTP", "SMS verification", "email verification", "CAPTCHA", "bot checks"],
            user_resolves_in_visible_browser: true,
            resume_signal: "terminal_enter",
            never_bypass: ["CAPTCHA", "OTP", "SMS", "email verification", "payment", "legal agreement"],
          },
          credentials: browserAgentCredentials,
          navigation_hints: navigationHints,
          ...(resumeContext.resume_url ? { resume_url: resumeContext.resume_url } : {}),
          blocked_keywords: BLOCKED_KEYWORDS,
          safe_keywords: SAFE_KEYWORDS,
          output: {
            request_path: browserAgentRequestPath,
            result_path: browserAgentResultPath,
          },
        });
        captures.push(mergePublicAndAuthenticatedCaptures(publicCapture, result.capture));
        if (result.checkpoint) {
          checkpoints.push(result.checkpoint);
        }
      } catch (error) {
        const failedAuthCapture = buildEmptyCapture(
            competitor.competitor_name,
            "blocked",
            "Capture failed while invoking the configured browser-agent command.",
            error instanceof Error ? error.message : String(error),
            navigationHints,
            resumeContext.resume_url,
          );
        captures.push(mergePublicAndAuthenticatedCaptures(publicCapture, failedAuthCapture));
        checkpoints.push({
          competitor_name: competitor.competitor_name,
          reason: "Custom browser-agent command failed.",
          url: resumeContext.resume_url ?? competitor.login_url,
          created_at: nowIso(),
        });
      }
      continue;
    }

    try {
      const result = await captureWithPlaywright(
        competitor,
        credential,
        competitorDir,
        headless,
        navigationHints,
        resumeContext,
      );
      captures.push(mergePublicAndAuthenticatedCaptures(publicCapture, result.capture));
      if (result.checkpoint) {
        checkpoints.push(result.checkpoint);
      }
    } catch (error) {
      const failedAuthCapture = buildEmptyCapture(
          competitor.competitor_name,
          "blocked",
          "Capture failed before completing a safe mainline flow.",
          error instanceof Error ? error.message : String(error),
          navigationHints,
          resumeContext.resume_url,
        );
      captures.push(mergePublicAndAuthenticatedCaptures(publicCapture, failedAuthCapture));
      checkpoints.push({
        competitor_name: competitor.competitor_name,
        reason: "Unexpected Playwright failure during capture.",
        url: resumeContext.resume_url ?? competitor.login_url,
        created_at: nowIso(),
      });
    }
  }

  return {
    included_competitors: included,
    excluded_competitors: excluded,
    captures,
    warnings,
    manual_intervention_checkpoints: checkpoints,
  };
}

export async function captureCompetitorFlows(request: CaptureRequest): Promise<ResearchRun> {
  const normalized = normalizeResearchInput(request);
  assertSafeToProceed(normalized);

  const setup = await runSetupValidation(normalized.figma_destination_url);
  if (!setup.ok) {
    console.warn("Setup validation warning: some tooling is unavailable. Capture will proceed with available tools.");
  }

  const { runId, runDirectory } = createRunDirectory(process.cwd(), {
    featureDescription: normalized.feature_description,
    ...(normalized.research_name ? { researchName: normalized.research_name } : {}),
    ...(normalized.run_id ? { runId: normalized.run_id } : {}),
  });
  const startedAt = nowIso();
  const result = await captureDiscoveredCompetitors(normalized, { runId, runDirectory });

  const run: ResearchRun = {
    run_id: runId,
    run_directory: runDirectory,
    started_at: startedAt,
    updated_at: nowIso(),
    input: buildStoredInputForCapture(normalized),
    setup_validation: setup,
    discovered_competitors: normalized.discovered_competitors,
    included_competitors: result.included_competitors,
    excluded_competitors: result.excluded_competitors,
    captures: result.captures,
    cross_competitor_findings: emptyCrossFindings(),
    ...(normalized.source_map ? { source_map: normalized.source_map } : {}),
    ...(normalized.figma_destination_url
      ? { figma_export: defaultFigmaExport(normalized.figma_destination_url, runDirectory) }
      : {}),
    warnings: result.warnings,
    manual_intervention_checkpoints: result.manual_intervention_checkpoints,
  };

  const outputPath = path.join(runDirectory, "research-run.json");
  writeJsonFile(outputPath, run);
  return run;
}

async function main(): Promise<void> {
  const input = requireInput<CaptureRequest>(
    process.argv.slice(2),
    "Usage: npm run capture -- --input ./input/capture.json",
  );
  const run = await captureCompetitorFlows(input);
  logSection("Capture Completed");
  console.log(`Run directory: ${run.run_directory}`);
  console.log(`Included competitors: ${run.included_competitors.join(", ") || "none"}`);
  if (run.excluded_competitors.length > 0) {
    console.log("Excluded competitors:");
    for (const excluded of run.excluded_competitors) {
      console.log(`- ${excluded.competitor_name}: ${excluded.reason}`);
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
