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
  ExcludedCompetitor,
  ManualInterventionCheckpoint,
  ResearchRun,
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
  return page.evaluate(() => {
    const results: string[] = [];
    const seen = new Set<string>();
    const selector = "h1, h2, h3, h4, [role='heading'], button, a, label, p, li, span, div";
    const codeLikePattern = /[{}<>]|function\(|window\.|document\.|__cf|ray=|mdrd:|cType:|cdn-cgi/i;

    function isVisible(element: Element): boolean {
      const htmlElement = element as HTMLElement;
      const style = window.getComputedStyle(htmlElement);
      if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
        return false;
      }
      const rect = htmlElement.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }

    for (const element of Array.from(document.querySelectorAll(selector))) {
      if (!isVisible(element)) {
        continue;
      }
      if (!["BUTTON", "A", "LABEL"].includes(element.tagName) && element.childElementCount > 0) {
        continue;
      }

      const rawText = (element as HTMLElement).innerText || element.textContent || "";
      const normalized = rawText.replace(/\s+/g, " ").trim();
      if (normalized.length < 4 || normalized.length > 140) {
        continue;
      }
      if (codeLikePattern.test(normalized)) {
        continue;
      }
      if ((normalized.match(/[=<>{}]/g)?.length ?? 0) > 1) {
        continue;
      }

      const key = normalized.toLowerCase();
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      results.push(normalized);
      if (results.length >= 24) {
        break;
      }
    }

    return results;
  });
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
  await page.screenshot({ path: screenshotPath, fullPage: true });
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
  writeJsonFile(payload.output.request_path, payload);

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
  console.log("Complete login manually in the opened browser.");
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
): Promise<ManualLoginResolution> {
  let activeSession = session;

  if (!process.env.PLAYWRIGHT_WS_ENDPOINT && headless) {
    await closeBrowserSession(activeSession);
    activeSession = await launchBrowserSession(false);
    await activeSession.page.goto(credential.login_url ?? competitor.login_url, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await waitForPageToSettle(activeSession.page);
  }

  await saveStep(
    activeSession.page,
    competitorDir,
    steps,
    "manual-login-required",
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
        reason: "manual_login_required_after_two_attempts",
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
      await saveStep(
        activeSession.page,
        competitorDir,
        steps,
        "manual-intervention-required",
        `Encountered a guarded state containing "${barrier}" after automated sign-in.`,
        "Shows where the flow stopped because manual intervention is required.",
      );
      warnings.push(`Encountered blocked verification or unsafe state: ${barrier}.`);
      return {
        session: activeSession,
        capture: {
          competitor_name: competitor.competitor_name,
          status: "blocked",
          summary: "Capture stopped because a verification or unsafe barrier appeared.",
          steps,
          analysis: emptyAnalysis(),
          warnings,
          ...(navigationHints.length > 0 ? { navigation_hints_used: navigationHints } : {}),
          ...(resumeContext.resume_url ? { resume_url: resumeContext.resume_url } : {}),
        },
        checkpoint: {
          competitor_name: competitor.competitor_name,
          reason: `Blocked by guarded state: ${barrier}`,
          url: activeSession.page.url(),
          created_at: nowIso(),
        },
      };
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
      await saveStep(
        session.page,
        competitorDir,
        steps,
        "manual-intervention-required",
        `Encountered a guarded state containing "${barrier}".`,
        "Shows where the flow stopped because manual intervention is required.",
      );
      warnings.push(`Encountered blocked verification or unsafe state: ${barrier}.`);
      return {
        capture: {
          competitor_name: competitor.competitor_name,
          status: "blocked",
          summary: "Capture stopped because a verification or unsafe barrier appeared.",
          steps,
          analysis: emptyAnalysis(),
          warnings,
          ...(navigationHints.length > 0 ? { navigation_hints_used: navigationHints } : {}),
          ...(resumeContext.resume_url ? { resume_url: resumeContext.resume_url } : {}),
        },
        checkpoint: {
          competitor_name: competitor.competitor_name,
          reason: `Blocked by guarded state: ${barrier}`,
          url: session.page.url(),
          created_at: nowIso(),
        },
      };
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
      warnings.push(`Encountered blocked verification or unsafe state: ${secondBarrier}.`);
      return {
        capture: {
          competitor_name: competitor.competitor_name,
          status: "partial",
          summary: "Capture reached a guarded state after feature discovery.",
          steps,
          analysis: emptyAnalysis(),
          warnings,
          ...(navigationHints.length > 0 ? { navigation_hints_used: navigationHints } : {}),
          ...(resumeContext.resume_url ? { resume_url: resumeContext.resume_url } : {}),
        },
        checkpoint: {
          competitor_name: competitor.competitor_name,
          reason: `Blocked after feature discovery by guarded state: ${secondBarrier}`,
          url: session.page.url(),
          created_at: nowIso(),
        },
      };
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
    ...(request.figma_destination_url ? { figma_destination_url: request.figma_destination_url } : {}),
    ...(request.company_name ? { company_name: request.company_name } : {}),
    ...(credentialRegistryPath ? { credential_registry_path: credentialRegistryPath } : {}),
    ...(request.catalog_path ? { catalog_path: request.catalog_path } : {}),
    ...(request.resume_from_run_path ? { resume_from_run_path: request.resume_from_run_path } : {}),
    ...(request.competitor_allowlist ? { competitor_allowlist: request.competitor_allowlist } : {}),
    ...(request.locale ? { locale: request.locale } : {}),
    ...(request.evidence_import_path ? { evidence_import_path: request.evidence_import_path } : {}),
  });
}

export async function captureDiscoveredCompetitors(
  request: CaptureRequest,
  options: { runId: string; runDirectory: string },
): Promise<CaptureExecutionResult> {
  const registry = loadCredentialRegistry(resolveCredentialPath(request), request.credentials);
  const included: string[] = [];
  const excluded: ExcludedCompetitor[] = [];
  const captures: CompetitorCapture[] = [];
  const warnings: string[] = [];
  const checkpoints: ManualInterventionCheckpoint[] = [];
  const headless = request.headless ?? process.env.HEADLESS !== "false";

  for (const competitor of request.discovered_competitors) {
    const credential = findCredential(registry, competitor.competitor_name);
    if (!credential) {
      excluded.push({
        competitor_name: competitor.competitor_name,
        reason: "No usable credentials were provided, so the competitor was excluded from live capture.",
      });
      continue;
    }

    included.push(competitor.competitor_name);
    const competitorDir = ensureDir(path.join(options.runDirectory, slugify(competitor.competitor_name)));
    const navigationHints = buildNavigationHints(credential);
    const resumeContext = loadResumeContext(request.resume_from_run_path, competitor.competitor_name);

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
          feature_description: request.feature_description,
          run_id: options.runId,
          run_directory: options.runDirectory,
          screenshot_directory: competitorDir,
          auth_attempts_max: MAX_AUTH_ATTEMPTS,
          manual_login_required_after_two_attempts: true,
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
        captures.push(result.capture);
        if (result.checkpoint) {
          checkpoints.push(result.checkpoint);
        }
      } catch (error) {
        captures.push(
          buildEmptyCapture(
            competitor.competitor_name,
            "blocked",
            "Capture failed while invoking the configured browser-agent command.",
            error instanceof Error ? error.message : String(error),
            navigationHints,
            resumeContext.resume_url,
          ),
        );
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
      captures.push(result.capture);
      if (result.checkpoint) {
        checkpoints.push(result.checkpoint);
      }
    } catch (error) {
      captures.push(
        buildEmptyCapture(
          competitor.competitor_name,
          "blocked",
          "Capture failed before completing a safe mainline flow.",
          error instanceof Error ? error.message : String(error),
          navigationHints,
          resumeContext.resume_url,
        ),
      );
      checkpoints.push({
        competitor_name: competitor.competitor_name,
        reason: "Unexpected Playwright failure during capture.",
        url: resumeContext.resume_url ?? competitor.login_url,
        created_at: nowIso(),
      });
    }
  }

  warnings.push(...excluded.map((entry) => `${entry.competitor_name}: ${entry.reason}`));

  return {
    included_competitors: included,
    excluded_competitors: excluded,
    captures,
    warnings,
    manual_intervention_checkpoints: checkpoints,
  };
}

export async function captureCompetitorFlows(request: CaptureRequest): Promise<ResearchRun> {
  assertSafeToProceed(request);

  const setup = await runSetupValidation(request.figma_destination_url);
  if (!setup.ok) {
    console.warn("Setup validation warning: some tooling is unavailable. Capture will proceed with available tools.");
  }

  const { runId, runDirectory } = createRunDirectory(process.cwd(), request.run_id);
  const startedAt = nowIso();
  const result = await captureDiscoveredCompetitors(request, { runId, runDirectory });

  const run: ResearchRun = {
    run_id: runId,
    run_directory: runDirectory,
    started_at: startedAt,
    updated_at: nowIso(),
    input: buildStoredInputForCapture(request),
    setup_validation: setup,
    discovered_competitors: request.discovered_competitors,
    included_competitors: result.included_competitors,
    excluded_competitors: result.excluded_competitors,
    captures: result.captures,
    cross_competitor_findings: emptyCrossFindings(),
    ...(request.figma_destination_url
      ? { figma_export: defaultFigmaExport(request.figma_destination_url, runDirectory) }
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
