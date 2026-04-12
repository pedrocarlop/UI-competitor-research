import path from "node:path";
import { pathToFileURL } from "node:url";
import { analyzeRun } from "./analyzeCapturedFlows.js";
import { captureDiscoveredCompetitors } from "./captureCompetitorFlows.js";
import { runSetupValidation } from "./checkSetup.js";
import { discoverCompetitors } from "./discoverCompetitors.js";
import { exportResearchToFigma } from "./exportResearchToFigma.js";
import { ingestCapturedEvidence } from "./ingestCapturedEvidence.js";
import {
  CaptureExecutionResult,
  CaptureRequest,
  CompetitorCapture,
  DiscoveredCompetitor,
  ImportedEvidenceResult,
  ResearchInput,
  ResearchRun,
  assertSafeToProceed,
  buildStoredResearchInput,
  createRunDirectory,
  defaultFigmaExport,
  emptyCrossFindings,
  logSection,
  nowIso,
  requireInput,
  slugify,
  writeJsonFile,
} from "./_shared.js";

interface RunResearchRequest extends ResearchInput {
  credentials_path?: string;
  run_id?: string;
  min_competitors?: number;
  max_competitors?: number;
  headless?: boolean;
}

function orderedCompetitorNames(discovered: DiscoveredCompetitor[], names: string[]): string[] {
  const nameSet = new Set(names.map((name) => slugify(name)));
  return discovered
    .filter((competitor) => nameSet.has(slugify(competitor.competitor_name)))
    .map((competitor) => competitor.competitor_name);
}

function mergeCapturesByDiscoveryOrder(
  discovered: DiscoveredCompetitor[],
  importedCaptures: CompetitorCapture[],
  liveCaptures: CompetitorCapture[],
): CompetitorCapture[] {
  const importedMap = new Map(importedCaptures.map((capture) => [slugify(capture.competitor_name), capture]));
  const liveMap = new Map(liveCaptures.map((capture) => [slugify(capture.competitor_name), capture]));

  return discovered
    .map((competitor) => importedMap.get(slugify(competitor.competitor_name)) ?? liveMap.get(slugify(competitor.competitor_name)))
    .filter((capture): capture is CompetitorCapture => Boolean(capture));
}

function emptyCaptureExecution(): CaptureExecutionResult {
  return {
    included_competitors: [],
    excluded_competitors: [],
    captures: [],
    warnings: [],
    manual_intervention_checkpoints: [],
  };
}

function emptyImportedEvidenceResult(): ImportedEvidenceResult {
  return {
    included_competitors: [],
    captures: [],
    warnings: [],
    covered_competitors: [],
  };
}

function resolveCredentialRegistryPath(request: RunResearchRequest): string | undefined {
  return request.credential_registry_path ?? request.credentials_path;
}

function buildStoredInput(request: RunResearchRequest): ResearchRun["input"] {
  const credentialRegistryPath = resolveCredentialRegistryPath(request);
  return buildStoredResearchInput({
    feature_description: request.feature_description,
    figma_destination_url: request.figma_destination_url,
    ...(request.company_name ? { company_name: request.company_name } : {}),
    ...(credentialRegistryPath ? { credential_registry_path: credentialRegistryPath } : {}),
    ...(request.catalog_path ? { catalog_path: request.catalog_path } : {}),
    ...(request.resume_from_run_path ? { resume_from_run_path: request.resume_from_run_path } : {}),
    ...(request.competitor_allowlist ? { competitor_allowlist: request.competitor_allowlist } : {}),
    ...(request.locale ? { locale: request.locale } : {}),
    ...(request.evidence_import_path ? { evidence_import_path: request.evidence_import_path } : {}),
  });
}

function writeRun(run: ResearchRun): void {
  writeJsonFile(path.join(run.run_directory, "research-run.json"), run);
}

export async function runResearch(request: RunResearchRequest): Promise<ResearchRun> {
  assertSafeToProceed(request);

  const setup = await runSetupValidation(request.figma_destination_url);
  if (!setup.ok) {
    throw new Error("Setup validation failed. Run checkSetup.ts and resolve missing Figma or browser tooling before research.");
  }

  const { runId, runDirectory } = createRunDirectory(process.cwd(), request.run_id);
  const discovered = discoverCompetitors({
    ...request,
    ...(request.min_competitors ? { min_competitors: request.min_competitors } : {}),
    ...(request.max_competitors ? { max_competitors: request.max_competitors } : {}),
  });

  let run: ResearchRun = {
    run_id: runId,
    run_directory: runDirectory,
    started_at: nowIso(),
    updated_at: nowIso(),
    input: buildStoredInput(request),
    setup_validation: setup,
    discovered_competitors: discovered,
    included_competitors: [],
    excluded_competitors: [],
    captures: [],
    cross_competitor_findings: emptyCrossFindings(),
    figma_export: defaultFigmaExport(request.figma_destination_url, runDirectory),
    warnings: [],
    manual_intervention_checkpoints: [],
  };
  writeRun(run);

  const importedEvidence = request.evidence_import_path
    ? ingestCapturedEvidence(request.evidence_import_path, discovered, runDirectory)
    : emptyImportedEvidenceResult();

  run = {
    ...run,
    updated_at: nowIso(),
    included_competitors: orderedCompetitorNames(discovered, importedEvidence.included_competitors),
    captures: mergeCapturesByDiscoveryOrder(discovered, importedEvidence.captures, []),
    warnings: importedEvidence.warnings,
  };
  writeRun(run);

  const coveredSet = new Set(importedEvidence.covered_competitors.map((name) => slugify(name)));
  const remainingCompetitors = discovered.filter((competitor) => !coveredSet.has(slugify(competitor.competitor_name)));
  const credentialRegistryPath = resolveCredentialRegistryPath(request);

  const liveCaptureRequest: CaptureRequest = {
    feature_description: request.feature_description,
    figma_destination_url: request.figma_destination_url,
    discovered_competitors: remainingCompetitors,
    ...(request.company_name ? { company_name: request.company_name } : {}),
    ...(credentialRegistryPath ? { credential_registry_path: credentialRegistryPath } : {}),
    ...(credentialRegistryPath ? { credentials_path: credentialRegistryPath } : {}),
    ...(request.catalog_path ? { catalog_path: request.catalog_path } : {}),
    ...(request.resume_from_run_path ? { resume_from_run_path: request.resume_from_run_path } : {}),
    ...(request.competitor_allowlist ? { competitor_allowlist: request.competitor_allowlist } : {}),
    ...(request.locale ? { locale: request.locale } : {}),
    ...(request.headless !== undefined ? { headless: request.headless } : {}),
  };

  const liveCaptureResult =
    remainingCompetitors.length > 0
      ? await captureDiscoveredCompetitors(liveCaptureRequest, { runId, runDirectory })
      : emptyCaptureExecution();

  run = {
    ...run,
    updated_at: nowIso(),
    included_competitors: orderedCompetitorNames(discovered, [
      ...importedEvidence.included_competitors,
      ...liveCaptureResult.included_competitors,
    ]),
    excluded_competitors: liveCaptureResult.excluded_competitors,
    captures: mergeCapturesByDiscoveryOrder(discovered, importedEvidence.captures, liveCaptureResult.captures),
    warnings: [...importedEvidence.warnings, ...liveCaptureResult.warnings],
    manual_intervention_checkpoints: liveCaptureResult.manual_intervention_checkpoints,
  };
  writeRun(run);

  run = analyzeRun(run);
  writeRun(run);

  run = exportResearchToFigma(run);
  writeRun(run);

  return run;
}

async function main(): Promise<void> {
  const input = requireInput<RunResearchRequest>(
    process.argv.slice(2),
    "Usage: npm run run:research -- --input ./input/research.json",
  );
  const run = await runResearch(input);

  logSection("Research Run Completed");
  console.log(`Run directory: ${run.run_directory}`);
  console.log(`Captured competitors: ${run.included_competitors.join(", ") || "none"}`);
  console.log(`Figma export status: ${run.figma_export.status}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
