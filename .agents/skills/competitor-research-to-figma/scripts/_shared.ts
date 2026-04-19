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
  research_name?: string;
  figma_destination_url?: string;
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
  design_patterns?: string[];
  information_architecture?: string[];
  unique_differentiators?: string[];
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
  sentiment?: CompetitorSentiment;
  pricing?: CompetitorPricing;
  case_studies?: CaseStudy[];
  developer_discourse?: DeveloperDiscourseEntry[];
}

export interface ThematicDeepDive {
  theme_title: string;
  narrative: string;
  competitors_compared: string[];
  key_insight: string;
  evidence_urls: string[];
}

export interface CrossCompetitorFindings {
  recurring_capabilities: string[];
  recurring_patterns: string[];
  recurring_strengths: string[];
  recurring_friction_points: string[];
  coverage_summary: string;
  feature_matrix?: FeatureMatrix;
  sentiment_themes?: string[];
  strategic_thesis?: string;
  strategic_narrative?: string;
  thematic_deep_dives?: ThematicDeepDive[];
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
  figma_export?: FigmaExportMetadata;
  market_context?: MarketContext;
  citations?: InlineCitation[];
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

// --- Customer sentiment types ---

export type SentimentDirection = "positive" | "negative" | "mixed" | "neutral";
export type SentimentSourceType = "app_store" | "review_platform" | "reddit" | "forum" | "social" | "developer_community" | "case_study" | "news" | "other";
export type CaseStudySourceType = "case_study_page" | "blog_post" | "press_release" | "community_post" | "news_article";

export interface SentimentEntry {
  source_url: string;
  source_type: SentimentSourceType;
  source_name: string;
  date?: string;
  sentiment: SentimentDirection;
  quote_or_paraphrase: string;
  theme: string;
}

export interface CompetitorSentiment {
  competitor_name: string;
  overall_direction: SentimentDirection;
  rating?: { score: number; max: number; source: string };
  review_count?: number;
  top_praised: string[];
  top_criticized: string[];
  notable_quotes: string[];
  entries: SentimentEntry[];
}

// --- Pricing types ---

export interface PricingTier {
  tier_name: string;
  price?: string;
  billing_frequency?: string;
  key_features: string[];
  limitations?: string[];
}

export interface CostBreakdown {
  cost_dimension: string;
  rate: string;
  conditions?: string;
}

export interface CompetitorPricing {
  competitor_name: string;
  pricing_model: string;
  currency?: string;
  tiers: PricingTier[];
  free_tier?: PricingTier;
  enterprise_available: boolean;
  pricing_page_url?: string;
  screenshot_path?: string;
  notes: string[];
  confidence: ConfidenceLevel;
  cost_breakdowns?: CostBreakdown[];
  operational_fees?: string[];
  notable_strategies?: string[];
}

export interface CaseStudy {
  company_name: string;
  use_case: string;
  competitor_used: string;
  outcome?: string;
  source_url: string;
  source_type: CaseStudySourceType;
  confidence: ConfidenceLevel;
}

export interface DeveloperDiscourseEntry {
  source_url: string;
  source_name: string;
  topic: string;
  sentiment: SentimentDirection;
  key_point: string;
  date?: string;
}

export interface InlineCitation {
  ref_number: number;
  title: string;
  url: string;
  accessed_date?: string;
}

// --- Feature matrix types ---

export type FeatureSupport = "supported" | "partial" | "not_supported" | "unknown";

export interface SubfeatureEntry {
  subfeature_name: string;
  description: string;
  support_by_competitor: Record<string, FeatureSupport>;
  detail_by_competitor?: Record<string, string>;
  citation_by_competitor?: Record<string, number>;
  constraints_by_competitor?: Record<string, string>;
  best_implementation?: string;
  notes?: string;
}

export interface FeatureMatrix {
  feature_name: string;
  subfeatures: SubfeatureEntry[];
  table_stakes: string[];
  differentiators: string[];
}

// --- Market context types ---

export interface RegulatoryContext {
  jurisdiction: string;
  regulation_name: string;
  effective_date?: string;
  impact_summary: string;
  affected_competitors: string[];
  evidence_url: string;
  confidence: ConfidenceLevel;
}

export interface RegionalAnalysis {
  locale: string;
  market_overview: string;
  dominant_local_platforms: string[];
  regulatory_contexts: RegulatoryContext[];
  locale_specific_pricing?: string;
  competitor_coverage: Record<string, string>;
  evidence_urls: string[];
}

export interface MarketContext {
  domain: string;
  market_segments: string[];
  key_trends: string[];
  recent_events: string[];
  regulatory_notes?: string[];
  sources: Array<{ title: string; url: string }>;
  regional_analyses?: RegionalAnalysis[];
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

function truncateSlug(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  return value.slice(0, maxLength).replace(/-+$/g, "");
}

export function resolveResearchSlug(input: Pick<ResearchInput, "feature_description" | "research_name">): string {
  const rawValue =
    isNonEmptyString(input.research_name)
      ? input.research_name
      : input.feature_description;
  const slug = truncateSlug(slugify(rawValue), 80);
  return slug || "research";
}

export function createRunDirectory(
  baseDir: string,
  options: { runId?: string; researchName?: string; featureDescription: string },
): { runId: string; researchSlug: string; runDirectory: string } {
  const resolvedRunId = options.runId ?? makeRunId();
  const researchSlug = resolveResearchSlug({
    feature_description: options.featureDescription,
    ...(options.researchName ? { research_name: options.researchName } : {}),
  });
  const runDirectory = path.join(baseDir, "runs", researchSlug, resolvedRunId);
  ensureDir(runDirectory);
  return { runId: resolvedRunId, researchSlug, runDirectory };
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
      `Missing mandatory input: ${missing.join(", ")}.\nProvide feature_description before running setup validation, discovery, capture, or export.`,
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
    ...(input.research_name ? { research_name: input.research_name } : {}),
    ...(input.figma_destination_url ? { figma_destination_url: input.figma_destination_url } : {}),
    ...(input.company_name ? { company_name: input.company_name } : {}),
    ...(input.credential_registry_path ? { credential_registry_path: input.credential_registry_path } : {}),
    ...(input.catalog_path ? { catalog_path: input.catalog_path } : {}),
    ...(input.resume_from_run_path ? { resume_from_run_path: input.resume_from_run_path } : {}),
    ...(input.competitor_allowlist ? { competitor_allowlist: input.competitor_allowlist } : {}),
    ...(input.locale ? { locale: input.locale } : {}),
    ...(input.evidence_import_path ? { evidence_import_path: input.evidence_import_path } : {}),
  };
}
