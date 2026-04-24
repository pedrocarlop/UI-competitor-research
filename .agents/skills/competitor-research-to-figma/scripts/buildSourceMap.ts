import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  DiscoveredCompetitor,
  ResearchInput,
  SourceMap,
  SourceMapEntry,
  SourceType,
  assertSafeToProceed,
  ensureDir,
  normalizeResearchInput,
  nowIso,
  readJsonFile,
  requireInput,
  slugify,
  writeJsonFile,
} from "./_shared.js";

interface SourceMapRequest extends Partial<ResearchInput> {
  discovered_competitors: DiscoveredCompetitor[];
  run_directory?: string;
}

function safeUrl(value: string | undefined): URL | undefined {
  if (!value) {
    return undefined;
  }
  try {
    return new URL(value);
  } catch {
    return undefined;
  }
}

function originOf(value: string): string {
  const parsed = safeUrl(value);
  return parsed ? parsed.origin : value;
}

function entry(
  competitor: DiscoveredCompetitor,
  sourceType: SourceType,
  url: string,
  notes: string,
  confidence: SourceMapEntry["confidence"],
  discoveredVia: SourceMapEntry["discovered_via"],
): SourceMapEntry {
  return {
    competitor_name: competitor.competitor_name,
    source_type: sourceType,
    url,
    notes,
    confidence,
    discovered_via: discoveredVia,
  };
}

function uniqueEntries(entries: SourceMapEntry[]): SourceMapEntry[] {
  const seen = new Set<string>();
  return entries.filter((candidate) => {
    const key = `${slugify(candidate.competitor_name)}:${candidate.source_type}:${candidate.url}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function buildHeuristicEntries(competitor: DiscoveredCompetitor): SourceMapEntry[] {
  const productUrl = competitor.product_url;
  const origin = originOf(productUrl);
  const entries: SourceMapEntry[] = [
    entry(
      competitor,
      "homepage",
      origin,
      "Company homepage; useful for positioning, navigation, and entry-point framing.",
      "high",
      "heuristic",
    ),
    entry(
      competitor,
      "feature_page",
      productUrl,
      "Primary product or feature URL from discovery.",
      competitor.confidence,
      "catalog",
    ),
    entry(
      competitor,
      "pricing",
      `${origin}/pricing`,
      "Likely pricing page derived from the product origin.",
      "medium",
      "heuristic",
    ),
    entry(
      competitor,
      "help_center",
      `${origin}/help`,
      "Likely public help center entry point derived from the product origin.",
      "low",
      "heuristic",
    ),
    entry(
      competitor,
      "docs",
      `${origin}/docs`,
      "Likely public documentation entry point derived from the product origin.",
      "low",
      "heuristic",
    ),
    entry(
      competitor,
      "changelog",
      `${origin}/changelog`,
      "Likely changelog or release notes entry point derived from the product origin.",
      "low",
      "heuristic",
    ),
  ];

  return uniqueEntries(entries);
}

export function buildSourceMap(
  input: Partial<ResearchInput>,
  competitors: DiscoveredCompetitor[],
): SourceMap {
  assertSafeToProceed(input);
  return {
    generated_at: nowIso(),
    entries: competitors.flatMap(buildHeuristicEntries),
  };
}

export function sourceMapPath(runDirectory: string): string {
  return path.join(runDirectory, "source-map.json");
}

export function writeSourceMap(runDirectory: string, sourceMap: SourceMap): string {
  ensureDir(runDirectory);
  const outputPath = sourceMapPath(runDirectory);
  writeJsonFile(outputPath, sourceMap);
  return outputPath;
}

async function main(): Promise<void> {
  const input = normalizeResearchInput(
    requireInput<SourceMapRequest>(
      process.argv.slice(2),
      "Usage: npm run source-map -- --input ./input/source-map.json",
    ),
  );
  const sourceMap = buildSourceMap(input, input.discovered_competitors);
  const outputPath = input.run_directory
    ? writeSourceMap(input.run_directory, sourceMap)
    : path.resolve("source-map.json");

  if (!input.run_directory) {
    writeJsonFile(outputPath, sourceMap);
  }
  console.log(`Source map written to ${outputPath}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
