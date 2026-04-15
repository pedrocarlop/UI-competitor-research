import { existsSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";
import {
  ResearchInput,
  SetupValidationResult,
  ToolCheckResult,
  VerificationLevel,
  getCodexHome,
  logSection,
  parseArgs,
  requireInput,
} from "./_shared.js";

const require = createRequire(import.meta.url);

function detectSkillSignals(candidatePaths: string[]): string[] {
  return candidatePaths.filter((candidate) => existsSync(candidate));
}

function extractCommandBinary(command: string): string {
  let current = "";
  let quote: "'" | '"' | undefined;

  for (let index = 0; index < command.length; index += 1) {
    const character = command[index] ?? "";
    if (!quote && /\s/.test(character)) {
      if (current.length > 0) {
        break;
      }
      continue;
    }

    if (character === "'" || character === '"') {
      if (!quote) {
        quote = character;
        continue;
      }
      if (quote === character) {
        quote = undefined;
        continue;
      }
    }

    if (character === "\\" && index + 1 < command.length) {
      current += command[index + 1] ?? "";
      index += 1;
      continue;
    }

    current += character;
  }

  return current.trim();
}

function commandExists(command: string): boolean {
  const binary = extractCommandBinary(command);
  if (!binary) {
    return false;
  }

  const shell = process.env.SHELL ?? "zsh";
  const result = spawnSync(shell, ["-lc", 'command -v "$CHECK_BINARY"'], {
    env: {
      ...process.env,
      CHECK_BINARY: binary,
    },
    stdio: "ignore",
  });
  return result.status === 0;
}

function validateFigmaDestinationUrl(destinationUrl: string): string {
  const parsed = new URL(destinationUrl);
  const segments = parsed.pathname.split("/").filter(Boolean);
  const designIndex = segments.indexOf("design");
  if (designIndex === -1 || designIndex + 1 >= segments.length) {
    throw new Error("Destination URL must include a Figma design file key.");
  }
  return segments[designIndex + 1] ?? "";
}

function maxVerificationLevel(levels: VerificationLevel[]): VerificationLevel {
  if (levels.includes("verified")) {
    return "verified";
  }
  if (levels.includes("detected")) {
    return "detected";
  }
  return "missing";
}

function buildToolCheckResult(
  summary: string,
  signals: string[],
  instructions: string[],
  warnings: string[],
  verifiedWith: string[],
): ToolCheckResult {
  const verificationLevel = maxVerificationLevel([
    verifiedWith.length > 0 ? "verified" : "missing",
    signals.length > 0 ? "detected" : "missing",
  ]);

  return {
    ok: verificationLevel !== "missing",
    verification_level: verificationLevel,
    summary,
    signals,
    instructions,
    ...(verifiedWith.length > 0 ? { verified_with: verifiedWith } : {}),
    ...(warnings.length > 0 ? { warnings } : {}),
  };
}

async function verifyFigmaToken(token: string): Promise<string | undefined> {
  const response = await fetch("https://api.figma.com/v1/me", {
    headers: {
      "X-Figma-Token": token,
    },
  }).catch(() => undefined);

  if (!response || !response.ok) {
    return undefined;
  }

  const payload = (await response.json().catch(() => ({}))) as { email?: string; handle?: string };
  return payload.email ?? payload.handle ?? "Authenticated against the Figma API";
}

async function validateFigmaSetup(destinationUrl?: string): Promise<ToolCheckResult> {
  const codexHome = getCodexHome();
  const signals: string[] = [];
  const warnings: string[] = [];
  const verifiedWith: string[] = [];

  if (destinationUrl) {
    try {
      const fileKey = validateFigmaDestinationUrl(destinationUrl);
      verifiedWith.push(`Validated figma_destination_url with file key ${fileKey}`);
    } catch (error) {
      warnings.push(error instanceof Error ? error.message : String(error));
    }
  }

  const token = process.env.FIGMA_ACCESS_TOKEN ?? process.env.FIGMA_API_TOKEN;
  if (process.env.FIGMA_ACCESS_TOKEN) {
    signals.push("Detected FIGMA_ACCESS_TOKEN");
  }
  if (process.env.FIGMA_API_TOKEN) {
    signals.push("Detected FIGMA_API_TOKEN");
  }
  if (process.env.FIGMA_WRITE_COMMAND) {
    signals.push("Detected FIGMA_WRITE_COMMAND");
    if (commandExists(process.env.FIGMA_WRITE_COMMAND)) {
      signals.push(`Resolved FIGMA_WRITE_COMMAND binary "${extractCommandBinary(process.env.FIGMA_WRITE_COMMAND)}"`);
    } else {
      warnings.push("FIGMA_WRITE_COMMAND is set, but its executable could not be resolved.");
    }
  }
  if (process.env.FIGMA_CAPTURE_COMMAND) {
    signals.push("Detected FIGMA_CAPTURE_COMMAND");
    if (commandExists(process.env.FIGMA_CAPTURE_COMMAND)) {
      signals.push(`Resolved FIGMA_CAPTURE_COMMAND binary "${extractCommandBinary(process.env.FIGMA_CAPTURE_COMMAND)}"`);
    } else {
      warnings.push("FIGMA_CAPTURE_COMMAND is set, but its executable could not be resolved.");
    }
  }

  if (token) {
    const identity = await verifyFigmaToken(token);
    if (identity) {
      verifiedWith.push(`Verified Figma token via /v1/me (${identity})`);
    } else {
      warnings.push("Figma API token was detected, but /v1/me verification failed.");
    }
  }

  const skillSignals = detectSkillSignals([
    path.join(codexHome, "skills", "figma", "SKILL.md"),
    path.join(codexHome, "skills", "figma-use", "SKILL.md"),
    path.join(codexHome, "plugins", "cache", "openai-curated", "figma"),
  ]);
  signals.push(...skillSignals.map((signal) => `Detected ${signal}`));

  const result = buildToolCheckResult(
    verifiedWith.length > 0
      ? "Figma setup was verified through the destination URL, API token, or both."
      : signals.length > 0
        ? "Figma tooling was detected, but not every path was execution-verified."
        : "Figma setup is missing.",
    signals,
    verifiedWith.length > 0 || signals.length > 0
      ? []
      : [
          "Enable the Codex Figma plugin or install the Figma skill set in your Codex environment.",
          "Alternatively set FIGMA_ACCESS_TOKEN or FIGMA_API_TOKEN for API verification, and FIGMA_WRITE_COMMAND or FIGMA_CAPTURE_COMMAND for command-based export execution.",
          "Provide a valid figma_destination_url when available so setup can validate the destination shape too.",
        ],
    warnings,
    verifiedWith,
  );

  return result;
}

async function verifyLocalPlaywright(): Promise<string | undefined> {
  try {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto("about:blank");
    await browser.close();
    return "Launched local Playwright browser and opened about:blank";
  } catch {
    return undefined;
  }
}

async function verifyRemotePlaywright(endpoint: string): Promise<string | undefined> {
  try {
    const browser = await chromium.connect(endpoint);
    const page = await browser.newPage();
    await page.goto("about:blank");
    await browser.close();
    return "Connected to PLAYWRIGHT_WS_ENDPOINT and opened about:blank";
  } catch {
    return undefined;
  }
}

async function validateBrowserSetup(): Promise<ToolCheckResult> {
  const codexHome = getCodexHome();
  const signals: string[] = [];
  const warnings: string[] = [];
  const verifiedWith: string[] = [];

  try {
    require.resolve("playwright");
    signals.push("Resolved playwright package");
  } catch {
    // Ignore. The absence of Playwright can still be acceptable if a custom browser command exists.
  }

  if (process.env.BROWSER_AGENT_COMMAND) {
    signals.push("Detected BROWSER_AGENT_COMMAND");
    if (commandExists(process.env.BROWSER_AGENT_COMMAND)) {
      signals.push(`Resolved BROWSER_AGENT_COMMAND binary "${extractCommandBinary(process.env.BROWSER_AGENT_COMMAND)}"`);
    } else {
      warnings.push("BROWSER_AGENT_COMMAND is set, but its executable could not be resolved.");
    }
  }

  if (process.env.PLAYWRIGHT_WS_ENDPOINT) {
    signals.push("Detected PLAYWRIGHT_WS_ENDPOINT");
    const remoteResult = await verifyRemotePlaywright(process.env.PLAYWRIGHT_WS_ENDPOINT);
    if (remoteResult) {
      verifiedWith.push(remoteResult);
    } else {
      warnings.push("PLAYWRIGHT_WS_ENDPOINT was detected, but the remote browser verification failed.");
    }
  } else if (signals.includes("Resolved playwright package")) {
    const localResult = await verifyLocalPlaywright();
    if (localResult) {
      verifiedWith.push(localResult);
    } else {
      warnings.push("Playwright was detected, but a local browser launch check failed.");
    }
  }

  const skillSignals = detectSkillSignals([
    path.join(codexHome, "skills", "agent-browser", "SKILL.md"),
    path.join(codexHome, "plugins", "cache", "openai-curated", "vercel"),
  ]);
  signals.push(...skillSignals.map((signal) => `Detected ${signal}`));

  return buildToolCheckResult(
    verifiedWith.length > 0
      ? "Browser automation was verified by launching or connecting to a browser."
      : signals.length > 0
        ? "Browser automation tooling was detected, but not every path was execution-verified."
        : "Browser automation setup is missing.",
    signals,
    verifiedWith.length > 0 || signals.length > 0
      ? []
      : [
          "Run npm install so the local Playwright dependency becomes available.",
          "If you use a remote browser or a custom browser agent, set PLAYWRIGHT_WS_ENDPOINT or BROWSER_AGENT_COMMAND.",
          "Make sure your Codex environment has browser-agent tooling enabled before running discovery or capture.",
        ],
    warnings,
    verifiedWith,
  );
}

export async function runSetupValidation(destinationUrl?: string): Promise<SetupValidationResult> {
  const [figma, browser] = await Promise.all([
    validateFigmaSetup(destinationUrl),
    validateBrowserSetup(),
  ]);
  // Figma is only required when a destination URL is provided.
  // Browser is optional — the skill can run with just web search and web fetch.
  const figmaRequired = Boolean(destinationUrl);
  return {
    ok: figmaRequired ? figma.ok && browser.ok : true,
    figma,
    browser,
  };
}

export function printSetupValidation(result: SetupValidationResult): void {
  logSection("Setup Validation");
  console.log(`Overall status: ${result.ok ? "OK" : "INVALID"}`);

  logSection("Figma");
  console.log(`${result.figma.summary} Verification level: ${result.figma.verification_level}.`);
  for (const signal of result.figma.signals) {
    console.log(`- ${signal}`);
  }
  for (const verification of result.figma.verified_with ?? []) {
    console.log(`- Verified: ${verification}`);
  }
  for (const warning of result.figma.warnings ?? []) {
    console.log(`- Warning: ${warning}`);
  }
  for (const instruction of result.figma.instructions) {
    console.log(`- ${instruction}`);
  }

  logSection("Browser");
  console.log(`${result.browser.summary} Verification level: ${result.browser.verification_level}.`);
  for (const signal of result.browser.signals) {
    console.log(`- ${signal}`);
  }
  for (const verification of result.browser.verified_with ?? []) {
    console.log(`- Verified: ${verification}`);
  }
  for (const warning of result.browser.warnings ?? []) {
    console.log(`- Warning: ${warning}`);
  }
  for (const instruction of result.browser.instructions) {
    console.log(`- ${instruction}`);
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const input = args.input ? requireInput<ResearchInput>(process.argv.slice(2), "") : undefined;
  const destinationUrl = input?.figma_destination_url ?? args["destination-url"];
  const result = await runSetupValidation(destinationUrl);
  printSetupValidation(result);
  if (!result.ok) {
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
