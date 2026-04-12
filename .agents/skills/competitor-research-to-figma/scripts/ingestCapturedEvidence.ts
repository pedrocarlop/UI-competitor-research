import { copyFileSync, existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  CaptureStep,
  CompetitorCapture,
  DiscoveredCompetitor,
  ImportedEvidenceFile,
  ImportedEvidenceResult,
  ImportedEvidenceStep,
  assertSafeToProceed,
  emptyAnalysis,
  ensureDir,
  isNonEmptyString,
  isNonEmptyStringArray,
  namesMatch,
  readJsonFile,
  requireInput,
  slugify,
  writeJsonFile,
} from "./_shared.js";

interface EvidenceIngestRequest {
  feature_description: string;
  figma_destination_url: string;
  evidence_import_path: string;
  discovered_competitors: DiscoveredCompetitor[];
  run_directory: string;
}

interface EvidenceIngestOutput extends ImportedEvidenceResult {
  generated_at: string;
}

function assertImportedStep(step: ImportedEvidenceStep, competitorName: string, index: number): void {
  const label = `Imported evidence step ${index + 1} for ${competitorName}`;
  if (!isNonEmptyString(step.step_label)) {
    throw new Error(`${label} is missing step_label.`);
  }
  if (!isNonEmptyString(step.screenshot_path)) {
    throw new Error(`${label} is missing screenshot_path.`);
  }
  if (!existsSync(path.resolve(step.screenshot_path))) {
    throw new Error(`${label} references a screenshot that does not exist: ${step.screenshot_path}`);
  }
  if (!isNonEmptyString(step.url)) {
    throw new Error(`${label} is missing url.`);
  }
  if (!isNonEmptyString(step.change_note)) {
    throw new Error(`${label} is missing change_note.`);
  }
  if (!isNonEmptyString(step.why_it_matters)) {
    throw new Error(`${label} is missing why_it_matters.`);
  }
  if (step.visible_headings && !isNonEmptyStringArray(step.visible_headings)) {
    throw new Error(`${label} has invalid visible_headings.`);
  }
  if (step.visible_text_snippets && !isNonEmptyStringArray(step.visible_text_snippets)) {
    throw new Error(`${label} has invalid visible_text_snippets.`);
  }
}

function assertImportedEvidenceFile(file: ImportedEvidenceFile): void {
  if (!Array.isArray(file.competitors) || file.competitors.length === 0) {
    throw new Error("Imported evidence file must contain at least one competitor.");
  }

  for (const [index, competitor] of file.competitors.entries()) {
    const label = `Imported evidence competitor ${index + 1}`;
    if (!isNonEmptyString(competitor.competitor_name)) {
      throw new Error(`${label} is missing competitor_name.`);
    }
    if (!Array.isArray(competitor.steps) || competitor.steps.length === 0) {
      throw new Error(`${label} must include at least one step.`);
    }
    if (!Array.isArray(competitor.warnings)) {
      throw new Error(`${label} must include a warnings array.`);
    }
    if (!["captured", "partial", "blocked", "excluded"].includes(competitor.status)) {
      throw new Error(`${label} has an unsupported status: ${competitor.status}`);
    }
    for (const [stepIndex, step] of competitor.steps.entries()) {
      assertImportedStep(step, competitor.competitor_name, stepIndex);
    }
  }
}

function buildImportedSteps(
  competitorName: string,
  steps: ImportedEvidenceStep[],
  competitorDirectory: string,
): CaptureStep[] {
  return steps.map((step, index) => {
    const extension = path.extname(step.screenshot_path) || ".png";
    const destination = path.join(
      competitorDirectory,
      `${String(index + 1).padStart(2, "0")}-${slugify(step.step_label)}${extension.toLowerCase()}`,
    );
    copyFileSync(path.resolve(step.screenshot_path), destination);

    return {
      step_number: index + 1,
      step_label: slugify(step.step_label),
      screenshot_path: destination,
      url: step.url,
      change_note: step.change_note,
      why_it_matters: step.why_it_matters,
      ...(step.visible_headings ? { visible_headings: step.visible_headings } : {}),
      ...(step.visible_text_snippets ? { visible_text_snippets: step.visible_text_snippets } : {}),
    };
  });
}

function buildImportedCapture(
  competitorName: string,
  status: CompetitorCapture["status"],
  warnings: string[],
  summary: string | undefined,
  steps: CaptureStep[],
): CompetitorCapture {
  const resumeUrl = steps.at(-1)?.url;
  return {
    competitor_name: competitorName,
    status,
    summary: summary ?? `Imported ${steps.length} evidence step${steps.length === 1 ? "" : "s"} for ${competitorName}.`,
    steps,
    analysis: emptyAnalysis(),
    warnings,
    ...(resumeUrl ? { resume_url: resumeUrl } : {}),
  };
}

export function ingestCapturedEvidence(
  evidenceImportPath: string,
  discoveredCompetitors: DiscoveredCompetitor[],
  runDirectory: string,
): ImportedEvidenceResult {
  const evidence = readJsonFile<ImportedEvidenceFile>(evidenceImportPath);
  assertImportedEvidenceFile(evidence);

  const captures: CompetitorCapture[] = [];
  const warnings: string[] = [];
  const coveredCompetitors: string[] = [];

  for (const competitor of discoveredCompetitors) {
    const imported = evidence.competitors.find((entry) => namesMatch(entry.competitor_name, competitor.competitor_name));
    if (!imported) {
      continue;
    }

    const competitorDirectory = ensureDir(path.join(runDirectory, slugify(competitor.competitor_name)));
    const importedSteps = buildImportedSteps(competitor.competitor_name, imported.steps, competitorDirectory);
    captures.push(
      buildImportedCapture(
        competitor.competitor_name,
        imported.status,
        imported.warnings,
        imported.summary,
        importedSteps,
      ),
    );
    coveredCompetitors.push(competitor.competitor_name);
  }

  for (const imported of evidence.competitors) {
    const matched = discoveredCompetitors.some((competitor) => namesMatch(competitor.competitor_name, imported.competitor_name));
    if (!matched) {
      warnings.push(
        `Imported evidence for ${imported.competitor_name} did not match any discovered competitor and was skipped.`,
      );
    }
  }

  return {
    included_competitors: coveredCompetitors,
    captures,
    warnings,
    covered_competitors: coveredCompetitors,
  };
}

async function main(): Promise<void> {
  const input = requireInput<EvidenceIngestRequest>(
    process.argv.slice(2),
    "Usage: npm run ingest:evidence -- --input ./input/evidence-ingest.json --output ./runs/<timestamp>/imported-evidence.json",
  );

  assertSafeToProceed(input);
  if (!isNonEmptyString(input.evidence_import_path)) {
    throw new Error("Missing evidence_import_path.");
  }

  const result: EvidenceIngestOutput = {
    ...ingestCapturedEvidence(input.evidence_import_path, input.discovered_competitors, input.run_directory),
    generated_at: new Date().toISOString(),
  };

  const outputPath = process.argv.includes("--output")
    ? process.argv[process.argv.indexOf("--output") + 1]
    : path.join(input.run_directory, "imported-evidence.json");
  if (!outputPath) {
    throw new Error("Missing output path.");
  }

  writeJsonFile(outputPath, result);
  console.log(`Imported evidence written to ${outputPath}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
