import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";

export type ConfidenceLevel = "high" | "medium" | "low";
export type CaptureStatus = "captured" | "partial" | "excluded" | "blocked";
export type ExportStatus = "planned" | "exported" | "skipped";
export type VerificationLevel = "missing" | "detected" | "verified";

export interface CredentialEntryInput {
  competitor_name: string;
  login_url?: string;
  email?: string;
  password?: string;
  email_env?: string;
  password_env?: string;
  notes?: string;
  start_url?: string;
  navigation_hints?: string[];
}

export interface CredentialEntry {
  competitor_name: string;
  login_url?: string;
  email: string;
  password: string;
  notes?: string;
  start_url?: string;
  navigation_hints?: string[];
}

export interface CredentialRegistryInput {
  competitors: CredentialEntryInput[];
}

export interface CredentialRegistry {
  competitors: CredentialEntry[];
}

export interface ToolCheckResult {
  ok: boolean;
  verification_level: VerificationLevel;
  summary: string;
  signals: string[];
  instructions: string[];
  verified_with?: string[];
  warnings?: string[];
}

export interface SetupValidationResult {
  ok: boolean;
  figma: ToolCheckResult;
  browser: ToolCheckResult;
}

export interface ResearchInput {
  feature_description: string;
  figma_destination_url: string;
  company_name?: string;
  credential_registry_path?: string;
  catalog_path?: string;
  resume_from_run_path?: string;
  competitor_allowlist?: string[];
  locale?: string;
  evidence_import_path?: string;
}

export interface DiscoveredCompetitor {
  competitor_name: string;
  product_url: string;
  login_url: string;
  start_url?: string;
  reason_for_inclusion: string;
  confidence: ConfidenceLevel;
  product_category: string;
  keyword_matches?: string[];
}

export interface ExcludedCompetitor {
  competitor_name: string;
  reason: string;
}

export interface ManualInterventionCheckpoint {
  competitor_name: string;
  reason: string;
  url: string;
  created_at: string;
}

export interface CaptureStep {
  step_number: number;
  step_label: string;
  screenshot_path: string;
  url: string;
  change_note: string;
  why_it_matters: string;
  visible_headings?: string[];
  visible_text_snippets?: string[];
}

export interface CompetitorAnalysis {
  experience_summary: string;
  step_reconstruction: string[];
  visible_ui_elements: string[];
  inferred_capabilities: string[];
  interaction_patterns: string[];
  strengths: string[];
  friction_points: string[];
  reusable_ideas: string[];
  caveats: string[];
}

export interface CompetitorCapture {
  competitor_name: string;
  status: CaptureStatus;
  summary: string;
  steps: CaptureStep[];
  analysis: CompetitorAnalysis;
  warnings: string[];
  navigation_hints_used?: string[];
  resume_url?: string;
}

export interface CrossCompetitorFindings {
  recurring_capabilities: string[];
  recurring_patterns: string[];
  recurring_strengths: string[];
  recurring_friction_points: string[];
  coverage_summary: string;
}

export interface FigmaLayoutStep {
  step_label: string;
  screenshot_path: string;
  x: number;
  y: number;
  width: number;
  height: number;
  note: string;
}

export interface FigmaLayoutSection {
  competitor_name: string;
  summary: string;
  x: number;
  y: number;
  width: number;
  height: number;
  steps: FigmaLayoutStep[];
}

export interface FigmaExportMetadata {
  destination_url: string;
  page_name: string;
  status: ExportStatus;
  layout_plan_path: string;
  asset_manifest_path?: string;
  write_payload_path?: string;
  html_board_path?: string;
  capture_payload_path?: string;
  exported_at?: string;
  notes?: string[];
}

export interface FigmaExportPlan {
  run_id: string;
  destination_url: string;
  page_name: string;
  generated_at: string;
  layout: {
    page_padding: number;
    section_gap_y: number;
    section_padding: number;
    screenshot_gutter: number;
    screenshot_width: number;
    screenshot_height: number;
  };
  sections: FigmaLayoutSection[];
  comparison_area: {
    x: number;
    y: number;
    width: number;
    height: number;
    recurring_capabilities: string[];
    recurring_patterns: string[];
    recurring_strengths: string[];
    recurring_friction_points: string[];
    excluded_competitors: ExcludedCompetitor[];
  };
}

export interface ResearchRun {
  run_id: string;
  run_directory: string;
  started_at: string;
  updated_at: string;
  completed_at?: string;
  input: ResearchInput;
  setup_validation: SetupValidationResult;
  discovered_competitors: DiscoveredCompetitor[];
  included_competitors: string[];
  excluded_competitors: ExcludedCompetitor[];
  captures: CompetitorCapture[];
  cross_competitor_findings: CrossCompetitorFindings;
  figma_export: FigmaExportMetadata;
  warnings: string[];
  manual_intervention_checkpoints: ManualInterventionCheckpoint[];
}

export interface DiscoveryRequest extends ResearchInput {
  min_competitors?: number;
  max_competitors?: number;
}

export interface CaptureRequest extends ResearchInput {
  discovered_competitors: DiscoveredCompetitor[];
  credentials?: CredentialRegistryInput;
  credentials_path?: string;
  run_id?: string;
  headless?: boolean;
}

export interface CaptureExecutionResult {
  included_competitors: string[];
  excluded_competitors: ExcludedCompetitor[];
  captures: CompetitorCapture[];
  warnings: string[];
  manual_intervention_checkpoints: ManualInterventionCheckpoint[];
}

export interface ImportedEvidenceStep {
  step_label: string;
  screenshot_path: string;
  url: string;
  change_note: string;
  why_it_matters: string;
  visible_headings?: string[];
  visible_text_snippets?: string[];
}

export interface ImportedEvidenceCompetitor {
  competitor_name: string;
  status: CaptureStatus;
  steps: ImportedEvidenceStep[];
  warnings: string[];
  summary?: string;
}

export interface ImportedEvidenceFile {
  competitors: ImportedEvidenceCompetitor[];
}

export interface ImportedEvidenceResult {
  included_competitors: string[];
  captures: CompetitorCapture[];
  warnings: string[];
  covered_competitors: string[];
}

export function parseArgs(argv: string[]): Record<string, string> {
  const args: Record<string, string> = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index] ?? "";
    if (!token.startsWith("--")) {
      continue;
    }
    const key = token.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      args[key] = "true";
      continue;
    }
    args[key] = value;
    index += 1;
  }
  return args;
}

export function requireInput<T>(argv: string[], help: string): T {
  const args = parseArgs(argv);
  const inputPath = args.input;
  if (!inputPath) {
    throw new Error(`Missing --input.\n${help}`);
  }
  return readJsonFile<T>(inputPath);
}

export function writeJsonFile(filePath: string, value: unknown): void {
  ensureDir(path.dirname(filePath));
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function readJsonFile<T>(filePath: string): T {
  return JSON.parse(readFileSync(path.resolve(filePath), "utf8")) as T;
}

export function ensureDir(directoryPath: string): string {
  mkdirSync(directoryPath, { recursive: true });
  return directoryPath;
}

export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function makeRunId(date = new Date()): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z").replace(/:/g, "-");
}

export function createRunDirectory(baseDir: string, runId?: string): { runId: string; runDirectory: string } {
  const resolvedRunId = runId ?? makeRunId();
  const runDirectory = path.join(baseDir, "runs", resolvedRunId);
  ensureDir(runDirectory);
  return { runId: resolvedRunId, runDirectory };
}

export function getRepoRoot(): string {
  return process.cwd();
}

export function getCodexHome(): string {
  return process.env.CODEX_HOME ?? path.join(os.homedir(), ".codex");
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function isNonEmptyStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => isNonEmptyString(entry));
}

export function validateMandatoryInputs(input: Partial<ResearchInput>): string[] {
  const missing: string[] = [];
  if (!isNonEmptyString(input.feature_description)) {
    missing.push("feature_description");
  }
  if (!isNonEmptyString(input.figma_destination_url)) {
    missing.push("figma_destination_url");
  }
  return missing;
}

function requireCredentialValue(
  entry: CredentialEntryInput,
  envName: string,
  fieldName: "email_env" | "password_env",
): string {
  const value = process.env[envName];
  if (!isNonEmptyString(value)) {
    throw new Error(
      `Credential entry "${entry.competitor_name}" references ${fieldName}="${envName}", but that environment variable is missing or empty.`,
    );
  }
  return value;
}

function resolveCredentialEntry(entry: CredentialEntryInput): CredentialEntry {
  const hasLiteralPair = isNonEmptyString(entry.email) || isNonEmptyString(entry.password);
  const hasEnvPair = isNonEmptyString(entry.email_env) || isNonEmptyString(entry.password_env);

  if (hasLiteralPair && hasEnvPair) {
    throw new Error(
      `Credential entry "${entry.competitor_name}" mixes literal credentials with env-backed credentials. Provide only one complete pair.`,
    );
  }

  if (!hasLiteralPair && !hasEnvPair) {
    throw new Error(
      `Credential entry "${entry.competitor_name}" must provide either email/password or email_env/password_env.`,
    );
  }

  if (hasLiteralPair) {
    if (!isNonEmptyString(entry.email) || !isNonEmptyString(entry.password)) {
      throw new Error(
        `Credential entry "${entry.competitor_name}" must provide both email and password when using literal credentials.`,
      );
    }
    return {
      competitor_name: entry.competitor_name,
      email: entry.email,
      password: entry.password,
      ...(entry.login_url ? { login_url: entry.login_url } : {}),
      ...(entry.notes ? { notes: entry.notes } : {}),
      ...(entry.start_url ? { start_url: entry.start_url } : {}),
      ...(entry.navigation_hints ? { navigation_hints: entry.navigation_hints } : {}),
    };
  }

  if (!isNonEmptyString(entry.email_env) || !isNonEmptyString(entry.password_env)) {
    throw new Error(
      `Credential entry "${entry.competitor_name}" must provide both email_env and password_env when using env-backed credentials.`,
    );
  }

  return {
    competitor_name: entry.competitor_name,
    email: requireCredentialValue(entry, entry.email_env, "email_env"),
    password: requireCredentialValue(entry, entry.password_env, "password_env"),
    ...(entry.login_url ? { login_url: entry.login_url } : {}),
    ...(entry.notes ? { notes: entry.notes } : {}),
    ...(entry.start_url ? { start_url: entry.start_url } : {}),
    ...(entry.navigation_hints ? { navigation_hints: entry.navigation_hints } : {}),
  };
}

function resolveCredentialRegistry(registry: CredentialRegistryInput): CredentialRegistry {
  if (!Array.isArray(registry.competitors) || registry.competitors.length === 0) {
    throw new Error("Credential registry must contain at least one competitor entry.");
  }

  return {
    competitors: registry.competitors.map(resolveCredentialEntry),
  };
}

export function loadCredentialRegistry(
  maybePath?: string,
  inline?: CredentialRegistryInput,
): CredentialRegistry | undefined {
  if (inline) {
    return resolveCredentialRegistry(inline);
  }
  if (!maybePath) {
    return undefined;
  }
  if (!existsSync(path.resolve(maybePath))) {
    throw new Error(`Credential registry file not found: ${maybePath}`);
  }
  return resolveCredentialRegistry(readJsonFile<CredentialRegistryInput>(maybePath));
}

export function findCredential(
  registry: CredentialRegistry | undefined,
  competitorName: string,
): CredentialEntry | undefined {
  if (!registry) {
    return undefined;
  }
  const target = slugify(competitorName);
  return registry.competitors.find((entry) => slugify(entry.competitor_name) === target);
}

export function dedupe(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export function namesMatch(left: string, right: string): boolean {
  return slugify(left) === slugify(right);
}

export function toSlugSet(values: string[]): Set<string> {
  return new Set(values.map((value) => slugify(value)).filter(Boolean));
}

export function summarizeList(values: string[], fallback: string, limit = 3): string[] {
  const unique = dedupe(values);
  if (unique.length === 0) {
    return [fallback];
  }
  return unique.slice(0, limit);
}

export function logSection(title: string): void {
  console.log(`\n=== ${title} ===`);
}

export function assertSafeToProceed(input: Partial<ResearchInput>): void {
  const missing = validateMandatoryInputs(input);
  if (missing.length > 0) {
    throw new Error(
      `Missing mandatory input: ${missing.join(", ")}.\nProvide feature_description and figma_destination_url before running setup validation, discovery, capture, or export.`,
    );
  }
}

export function emptyAnalysis(): CompetitorAnalysis {
  return {
    experience_summary: "Analysis has not been generated yet.",
    step_reconstruction: [],
    visible_ui_elements: [],
    inferred_capabilities: [],
    interaction_patterns: [],
    strengths: [],
    friction_points: [],
    reusable_ideas: [],
    caveats: [],
  };
}

export function emptyCrossFindings(): CrossCompetitorFindings {
  return {
    recurring_capabilities: [],
    recurring_patterns: [],
    recurring_strengths: [],
    recurring_friction_points: [],
    coverage_summary: "No competitors were analyzed yet.",
  };
}

export function defaultFigmaExport(destinationUrl: string, runDirectory: string): FigmaExportMetadata {
  return {
    destination_url: destinationUrl,
    page_name: "Investigación",
    status: "skipped",
    layout_plan_path: path.join(runDirectory, "figma-export-plan.json"),
    notes: ["Figma export has not run yet."],
  };
}

export function buildStoredResearchInput(input: ResearchInput): ResearchInput {
  return {
    feature_description: input.feature_description,
    figma_destination_url: input.figma_destination_url,
    ...(input.company_name ? { company_name: input.company_name } : {}),
    ...(input.credential_registry_path ? { credential_registry_path: input.credential_registry_path } : {}),
    ...(input.catalog_path ? { catalog_path: input.catalog_path } : {}),
    ...(input.resume_from_run_path ? { resume_from_run_path: input.resume_from_run_path } : {}),
    ...(input.competitor_allowlist ? { competitor_allowlist: input.competitor_allowlist } : {}),
    ...(input.locale ? { locale: input.locale } : {}),
    ...(input.evidence_import_path ? { evidence_import_path: input.evidence_import_path } : {}),
  };
}
