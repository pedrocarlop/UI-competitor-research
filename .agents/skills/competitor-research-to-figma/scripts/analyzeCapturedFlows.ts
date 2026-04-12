import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  CompetitorAnalysis,
  CompetitorCapture,
  CrossCompetitorFindings,
  ResearchRun,
  dedupe,
  logSection,
  requireInput,
  summarizeList,
  writeJsonFile,
} from "./_shared.js";

const CAPABILITY_HINTS = [
  "payment link",
  "payment links",
  "branding",
  "expiration",
  "dashboard",
  "manage",
  "checkout",
  "products",
  "status",
  "settings",
];

function inferCapabilities(capture: CompetitorCapture): string[] {
  const corpus = capture.steps
    .flatMap((step) => [...(step.visible_headings ?? []), ...(step.visible_text_snippets ?? []), step.change_note, step.why_it_matters])
    .join(" ")
    .toLowerCase();

  const matches = CAPABILITY_HINTS.filter((hint) => corpus.includes(hint));
  return summarizeList(matches, "Observed workflow-specific capability evidence was limited.", 5);
}

function extractUiElements(capture: CompetitorCapture): string[] {
  const headings = capture.steps.flatMap((step) => step.visible_headings ?? []);
  return summarizeList(headings, "No clear visible UI elements were captured.", 6);
}

function buildPatterns(capture: CompetitorCapture): string[] {
  const labels = capture.steps.map((step) => step.step_label);
  const patterns: string[] = [];
  if (labels.some((label) => label.includes("entry"))) {
    patterns.push("Feature discovery begins from a logged-in entry surface.");
  }
  if (labels.some((label) => label.includes("sign-in"))) {
    patterns.push("Authentication is part of the observed benchmark path.");
  }
  if (labels.some((label) => label.includes("feature"))) {
    patterns.push("Feature-specific navigation is required after login.");
  }
  if (labels.some((label) => label.includes("current-state"))) {
    patterns.push("A stable in-product state was captured after navigation.");
  }
  return summarizeList(patterns, "Observed interaction patterns were limited.", 4);
}

function buildStrengths(capture: CompetitorCapture): string[] {
  const strengths: string[] = [];
  if (capture.steps.length >= 3) {
    strengths.push("The observed flow exposed multiple meaningful states without requiring deep exploration.");
  }
  if (capture.steps.some((step) => (step.visible_headings ?? []).length > 0)) {
    strengths.push("The UI exposed readable headings that made the flow easier to interpret.");
  }
  if (capture.status === "captured") {
    strengths.push("A safe mainline flow was completed without immediate blocker states.");
  }
  return summarizeList(strengths, "The captured evidence did not show a clear strength yet.", 3);
}

function buildFriction(capture: CompetitorCapture): string[] {
  const friction: string[] = [...capture.warnings];
  if (capture.status === "partial") {
    friction.push("The observed flow did not reach a full completion state.");
  }
  if (capture.status === "blocked") {
    friction.push("The flow was interrupted by a barrier or automation failure.");
  }
  return summarizeList(friction, "No major friction point was directly observed in the captured states.", 4);
}

function buildReusableIdeas(capture: CompetitorCapture): string[] {
  const ideas: string[] = [];
  if (capture.steps.some((step) => step.step_label.includes("entry"))) {
    ideas.push("Provide a clear feature entry point inside the logged-in product.");
  }
  if (capture.steps.some((step) => step.step_label.includes("feature"))) {
    ideas.push("Use a dedicated feature-specific transition after the main dashboard.");
  }
  if (capture.steps.some((step) => step.step_label.includes("current-state"))) {
    ideas.push("Capture a stable management or configuration state after the main setup step.");
  }
  return summarizeList(ideas, "The captured evidence did not expose a reusable pattern confidently enough.", 3);
}

function buildCaveats(capture: CompetitorCapture): string[] {
  const caveats: string[] = [];
  if (capture.status !== "captured") {
    caveats.push("Evidence is incomplete because the full mainline flow was not captured.");
  }
  if (capture.steps.length === 0) {
    caveats.push("No screenshot evidence was available for this competitor.");
  }
  return summarizeList(caveats, "Analysis is grounded in the observed screenshots and notes only.", 3);
}

export function analyzeCompetitorCapture(capture: CompetitorCapture): CompetitorAnalysis {
  const stepReconstruction = capture.steps.map(
    (step) => `Step ${step.step_number}: ${step.change_note} Why it matters: ${step.why_it_matters}`,
  );
  const visibleUiElements = extractUiElements(capture);
  const inferredCapabilities = inferCapabilities(capture);
  const interactionPatterns = buildPatterns(capture);
  const strengths = buildStrengths(capture);
  const frictionPoints = buildFriction(capture);
  const reusableIdeas = buildReusableIdeas(capture);
  const caveats = buildCaveats(capture);

  return {
    experience_summary:
      capture.steps.length > 0
        ? `Observed ${capture.steps.length} meaningful states for ${capture.competitor_name}. The summary is grounded in screenshots and step notes only.`
        : `No direct screenshot evidence was captured for ${capture.competitor_name}.`,
    step_reconstruction: stepReconstruction,
    visible_ui_elements: visibleUiElements,
    inferred_capabilities: inferredCapabilities,
    interaction_patterns: interactionPatterns,
    strengths,
    friction_points: frictionPoints,
    reusable_ideas: reusableIdeas,
    caveats,
  };
}

export function analyzeRun(run: ResearchRun): ResearchRun {
  const captures = run.captures.map((capture) => {
    const analysis = analyzeCompetitorCapture(capture);
    const summary = analysis.experience_summary;
    return {
      ...capture,
      analysis,
      summary,
    };
  });

  const recurringCapabilities = dedupe(captures.flatMap((capture) => capture.analysis.inferred_capabilities)).slice(0, 6);
  const recurringPatterns = dedupe(captures.flatMap((capture) => capture.analysis.interaction_patterns)).slice(0, 6);
  const recurringStrengths = dedupe(captures.flatMap((capture) => capture.analysis.strengths)).slice(0, 6);
  const recurringFrictionPoints = dedupe(captures.flatMap((capture) => capture.analysis.friction_points)).slice(0, 6);

  const crossCompetitorFindings: CrossCompetitorFindings = {
    recurring_capabilities: recurringCapabilities,
    recurring_patterns: recurringPatterns,
    recurring_strengths: recurringStrengths,
    recurring_friction_points: recurringFrictionPoints,
    coverage_summary: `${run.included_competitors.length} of ${run.discovered_competitors.length} shortlisted competitors were covered by captured or imported evidence.`,
  };

  return {
    ...run,
    updated_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    captures,
    cross_competitor_findings: crossCompetitorFindings,
  };
}

async function main(): Promise<void> {
  const run = requireInput<ResearchRun>(
    process.argv.slice(2),
    "Usage: npm run analyze -- --input ./runs/<timestamp>/research-run.json",
  );
  const analyzed = analyzeRun(run);
  const outputPath = path.join(analyzed.run_directory, "research-run.json");
  writeJsonFile(outputPath, analyzed);

  logSection("Analysis Completed");
  console.log(`Updated run file: ${outputPath}`);
  console.log(`Recurring capabilities: ${analyzed.cross_competitor_findings.recurring_capabilities.join(", ") || "none"}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
