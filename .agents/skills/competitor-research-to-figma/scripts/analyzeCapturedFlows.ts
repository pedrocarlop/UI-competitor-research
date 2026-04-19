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

// --- Evidence-grounded analysis helpers ---

function extractCorpus(capture: CompetitorCapture): string {
  return capture.steps
    .flatMap((step) => [
      ...(step.visible_headings ?? []),
      ...(step.visible_text_snippets ?? []),
      step.change_note,
      step.why_it_matters,
      step.step_label,
    ])
    .join(" ")
    .toLowerCase();
}

function inferCapabilities(capture: CompetitorCapture): string[] {
  const corpus = extractCorpus(capture);
  const headings = capture.steps.flatMap((step) => step.visible_headings ?? []);
  const snippets = capture.steps.flatMap((step) => step.visible_text_snippets ?? []);

  // Extract capabilities from actual visible text rather than hardcoded hints
  const capabilities: string[] = [];
  const allText = [...headings, ...snippets];

  for (const text of allText) {
    const lower = text.toLowerCase();
    // Look for action-oriented phrases that indicate product capabilities
    if (/\b(create|add|new|build|generate|set up|configure)\b/.test(lower) && text.length > 5 && text.length < 80) {
      capabilities.push(text.trim());
    }
    if (/\b(manage|edit|update|delete|archive|export|share|send|copy)\b/.test(lower) && text.length > 5 && text.length < 80) {
      capabilities.push(text.trim());
    }
  }

  if (capabilities.length === 0 && corpus.length > 0) {
    return ["Evidence collected but specific capabilities require manual interpretation of screenshots."];
  }

  return dedupe(capabilities).slice(0, 8);
}

function extractUiElements(capture: CompetitorCapture): string[] {
  const headings = capture.steps.flatMap((step) => step.visible_headings ?? []);
  return summarizeList(headings, "No visible UI elements were captured.", 8);
}

function detectDesignPatterns(capture: CompetitorCapture): string[] {
  const patterns: string[] = [];
  const corpus = extractCorpus(capture);
  const urls = capture.steps.map((step) => step.url);
  const labels = capture.steps.map((step) => step.step_label.toLowerCase());

  // Detect navigation depth from URL structure
  const maxDepth = Math.max(...urls.map((url) => {
    try {
      return new URL(url).pathname.split("/").filter(Boolean).length;
    } catch {
      return 0;
    }
  }));
  if (maxDepth <= 2) {
    patterns.push("Shallow navigation — feature is accessible within 2 levels of the URL hierarchy.");
  } else if (maxDepth >= 5) {
    patterns.push("Deep navigation — feature requires navigating 5+ URL levels.");
  }

  // Detect flow type from step progression
  if (capture.steps.length >= 3 && labels.some((l) => /step|wizard|next|continue/.test(l))) {
    patterns.push("Wizard or multi-step flow pattern.");
  }
  if (labels.some((l) => /dashboard|overview|home/.test(l))) {
    patterns.push("Dashboard-first pattern — feature accessed from a central overview.");
  }
  if (corpus.includes("modal") || corpus.includes("dialog") || corpus.includes("popup")) {
    patterns.push("Modal or dialog-based interaction for key actions.");
  }
  if (corpus.includes("inline") || corpus.includes("in-place")) {
    patterns.push("Inline editing pattern.");
  }
  if (corpus.includes("tab") || corpus.includes("tabs")) {
    patterns.push("Tab-based organization for feature sections.");
  }

  return summarizeList(patterns, "Design patterns require manual interpretation of the captured screenshots.", 5);
}

function detectInformationArchitecture(capture: CompetitorCapture): string[] {
  const ia: string[] = [];
  const headings = capture.steps.flatMap((step) => step.visible_headings ?? []);
  const urls = capture.steps.map((step) => step.url);

  // Analyze URL structure for IA signals
  const pathSegments = urls.flatMap((url) => {
    try {
      return new URL(url).pathname.split("/").filter(Boolean);
    } catch {
      return [];
    }
  });
  const uniqueSegments = dedupe(pathSegments);
  if (uniqueSegments.length > 0) {
    ia.push(`URL structure suggests sections: ${uniqueSegments.slice(0, 5).join(" > ")}`);
  }

  // Analyze heading hierarchy
  if (headings.length > 2) {
    ia.push(`Visible heading structure: ${headings.slice(0, 4).join(" / ")}`);
  }

  return summarizeList(ia, "Information architecture requires manual interpretation of screenshots.", 4);
}

function buildStrengths(capture: CompetitorCapture): string[] {
  const strengths: string[] = [];
  const corpus = extractCorpus(capture);

  // Evidence-grounded strength detection
  if (capture.steps.length >= 3 && capture.status === "captured") {
    strengths.push(`Complete flow captured in ${capture.steps.length} steps — the feature is accessible and well-structured.`);
  }

  // Check for clear, descriptive headings
  const headingCount = capture.steps.reduce(
    (count, step) => count + (step.visible_headings?.length ?? 0),
    0,
  );
  if (headingCount > 3) {
    strengths.push("Rich heading structure makes the interface self-explanatory.");
  }

  // Check URL simplicity
  const urls = capture.steps.map((step) => step.url);
  const avgDepth = urls.reduce((sum, url) => {
    try {
      return sum + new URL(url).pathname.split("/").filter(Boolean).length;
    } catch {
      return sum;
    }
  }, 0) / Math.max(urls.length, 1);
  if (avgDepth <= 3) {
    strengths.push("Clean URL structure suggests low navigation complexity.");
  }

  // Check for rich text content
  const snippetCount = capture.steps.reduce(
    (count, step) => count + (step.visible_text_snippets?.length ?? 0),
    0,
  );
  if (snippetCount > 10) {
    strengths.push("Dense visible content suggests a feature-rich interface.");
  }

  return summarizeList(strengths, "Strengths require manual analysis of the captured screenshots.", 5);
}

function buildFriction(capture: CompetitorCapture): string[] {
  const friction: string[] = [...capture.warnings];

  if (capture.status === "partial") {
    friction.push("The flow could not be fully captured — some states remain unobserved.");
  }
  if (capture.status === "blocked") {
    friction.push("A barrier (CAPTCHA, verification, or guard) interrupted the capture.");
  }

  // Check for excessive steps
  if (capture.steps.length > 6) {
    friction.push(`Flow requires ${capture.steps.length} steps, which may indicate unnecessary complexity.`);
  }

  // Check for deep navigation
  for (const step of capture.steps) {
    try {
      const depth = new URL(step.url).pathname.split("/").filter(Boolean).length;
      if (depth >= 5) {
        friction.push(`Deep URL path (${depth} levels) at step "${step.step_label}" suggests the feature is buried.`);
        break;
      }
    } catch {
      // Ignore invalid URLs
    }
  }

  return summarizeList(friction, "No friction points were directly observed in the captured evidence.", 5);
}

function buildReusableIdeas(capture: CompetitorCapture): string[] {
  const ideas: string[] = [];
  const corpus = extractCorpus(capture);

  if (capture.steps.length >= 2 && capture.steps.length <= 4 && capture.status === "captured") {
    ideas.push("Concise flow design — accomplishes the task in few steps.");
  }

  const headings = capture.steps.flatMap((step) => step.visible_headings ?? []);
  if (headings.some((h) => h.length > 3 && h.length < 40)) {
    ideas.push("Clear, descriptive section headings guide the user through the flow.");
  }

  if (corpus.includes("preview") || corpus.includes("live preview")) {
    ideas.push("Live preview during creation reduces uncertainty.");
  }
  if (corpus.includes("template") || corpus.includes("templates")) {
    ideas.push("Templates accelerate initial setup and reduce blank-page anxiety.");
  }

  return summarizeList(ideas, "Reusable ideas require manual analysis of the captured evidence.", 4);
}

function buildCaveats(capture: CompetitorCapture): string[] {
  const caveats: string[] = [];
  if (capture.status !== "captured") {
    caveats.push("Evidence is incomplete — the full flow was not captured.");
  }
  if (capture.steps.length === 0) {
    caveats.push("No screenshot evidence was available for this competitor.");
  }
  if (capture.steps.length > 0 && capture.steps.length <= 2) {
    caveats.push("Limited evidence — only a few states were captured, analysis may be incomplete.");
  }
  return summarizeList(caveats, "Analysis is grounded in the observed screenshots and notes only.", 3);
}

export function analyzeCompetitorCapture(capture: CompetitorCapture): CompetitorAnalysis {
  const stepReconstruction = capture.steps.map(
    (step) => `Step ${step.step_number}: ${step.change_note} — ${step.why_it_matters}`,
  );
  const visibleUiElements = extractUiElements(capture);
  const inferredCapabilities = inferCapabilities(capture);
  const interactionPatterns = detectDesignPatterns(capture);
  const strengths = buildStrengths(capture);
  const frictionPoints = buildFriction(capture);
  const reusableIdeas = buildReusableIdeas(capture);
  const caveats = buildCaveats(capture);
  const designPatterns = detectDesignPatterns(capture);
  const informationArchitecture = detectInformationArchitecture(capture);

  return {
    experience_summary:
      capture.steps.length > 0
        ? `Captured ${capture.steps.length} states for ${capture.competitor_name}. Analysis is based on visible headings, text snippets, URL structure, and step progression.`
        : `No direct screenshot evidence was captured for ${capture.competitor_name}.`,
    step_reconstruction: stepReconstruction,
    visible_ui_elements: visibleUiElements,
    inferred_capabilities: inferredCapabilities,
    interaction_patterns: interactionPatterns,
    strengths,
    friction_points: frictionPoints,
    reusable_ideas: reusableIdeas,
    caveats,
    design_patterns: designPatterns,
    information_architecture: informationArchitecture,
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

  const recurringCapabilities = dedupe(captures.flatMap((capture) => capture.analysis.inferred_capabilities)).slice(0, 8);
  const recurringPatterns = dedupe(captures.flatMap((capture) => capture.analysis.interaction_patterns)).slice(0, 8);
  const recurringStrengths = dedupe(captures.flatMap((capture) => capture.analysis.strengths)).slice(0, 8);
  const recurringFrictionPoints = dedupe(captures.flatMap((capture) => capture.analysis.friction_points)).slice(0, 8);

  // Preserve LLM-populated strategic fields if they already exist on the run
  const existing = run.cross_competitor_findings;

  const crossCompetitorFindings: CrossCompetitorFindings = {
    recurring_capabilities: recurringCapabilities,
    recurring_patterns: recurringPatterns,
    recurring_strengths: recurringStrengths,
    recurring_friction_points: recurringFrictionPoints,
    coverage_summary: `${run.included_competitors.length} of ${run.discovered_competitors.length} shortlisted competitors were covered by captured or imported evidence.`,
    // Preserve existing fields populated by the LLM
    ...(existing.feature_matrix ? { feature_matrix: existing.feature_matrix } : {}),
    ...(existing.sentiment_themes ? { sentiment_themes: existing.sentiment_themes } : {}),
    ...(existing.strategic_thesis ? { strategic_thesis: existing.strategic_thesis } : {}),
    ...(existing.strategic_narrative ? { strategic_narrative: existing.strategic_narrative } : {}),
    ...(existing.thematic_deep_dives ? { thematic_deep_dives: existing.thematic_deep_dives } : {}),
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
    "Usage: npm run analyze -- --input ./runs/<research-slug>/<run-id>/research-run.json",
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
