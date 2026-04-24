import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { captureDiscoveredCompetitors } from "./captureCompetitorFlows.js";
import { discoverCompetitors } from "./discoverCompetitors.js";
import { generateMarkdownReport } from "./generateReport.js";
import {
  DiscoveredCompetitor,
  ResearchRun,
  SourceMap,
  normalizeResearchInput,
} from "./_shared.js";
import { buildSourceMap } from "./buildSourceMap.js";
import { validateSchemas } from "./validateSchemas.js";

function tempDir(): string {
  return mkdtempSync(path.join(os.tmpdir(), "competitor-research-test-"));
}

function competitor(): DiscoveredCompetitor {
  return {
    competitor_name: "ExampleCo",
    product_url: "https://example.com/product",
    login_url: "https://example.com/login",
    reason_for_inclusion: "Fixture competitor.",
    confidence: "high",
    product_category: "fixture",
    keyword_matches: [],
  };
}

test("normalizes research_question into feature_description", () => {
  const input = normalizeResearchInput({
    research_question: "How do competitors handle saved views?",
  });

  assert.equal(input.feature_description, "How do competitors handle saved views?");
  assert.equal(input.research_question, "How do competitors handle saved views?");
});

test("uses explicit competitors instead of the payments catalog", () => {
  const discovered = discoverCompetitors({
    feature_description: "Component library publishing",
    competitors: [
      { competitor_name: "Figma", product_url: "https://www.figma.com" },
      "Penpot",
    ],
  });

  assert.deepEqual(discovered.map((entry) => entry.competitor_name), ["Figma", "Penpot"]);
  assert.equal(discovered[0]?.product_url, "https://www.figma.com");
  assert.equal(discovered[1]?.product_url, "https://www.penpot.com");
});

test("builds source map entries before capture", () => {
  const sourceMap = buildSourceMap(
    { feature_description: "Payment links" },
    [competitor()],
  );

  assert.ok(sourceMap.entries.some((entry) => entry.source_type === "feature_page"));
  assert.ok(sourceMap.entries.some((entry) => entry.source_type === "pricing"));
});

test("schema exposes revamp fields and regional source naming", () => {
  const schemaPath = path.resolve(
    ".agents/skills/competitor-research-to-figma/schemas/research-run.schema.json",
  );
  const schema = JSON.parse(readFileSync(schemaPath, "utf8"));

  assert.ok(schema.properties.source_map);
  assert.ok(schema.$defs.sourceMap);
  assert.ok(schema.$defs.evidenceRecord);
  assert.ok(schema.$defs.designerProductAnalysis);
  assert.ok(schema.$defs.regionalAnalysis.required.includes("dominant_local_platforms"));
  assert.ok(!schema.$defs.regionalAnalysis.required.includes("dominant_payment_methods"));
});

test("schema validation utility passes for bundled schemas and examples", () => {
  validateSchemas();
});

test("public capture includes competitors without credentials", async () => {
  const runDirectory = tempDir();
  try {
    const fixturePath = path.join(runDirectory, "fixture.html");
    writeFileSync(
      fixturePath,
      "<html><body><h1>Saved views</h1><button>Create view</button><p>Share, filter, and manage views.</p></body></html>",
      "utf8",
    );
    const dataUrl = pathToFileURL(fixturePath).href;
    const fixtureCompetitor = { ...competitor(), product_url: dataUrl };
    const sourceMap: SourceMap = {
      generated_at: new Date().toISOString(),
      entries: [
        {
          competitor_name: fixtureCompetitor.competitor_name,
          source_type: "feature_page",
          url: dataUrl,
          notes: "Local fixture public feature page.",
          confidence: "high",
          discovered_via: "explicit_input",
        },
      ],
    };

    const result = await captureDiscoveredCompetitors(
      {
        feature_description: "Saved views",
        discovered_competitors: [fixtureCompetitor],
        source_map: sourceMap,
      },
      { runId: "test-run", runDirectory },
    );

    assert.deepEqual(result.included_competitors, ["ExampleCo"]);
    assert.equal(result.excluded_competitors.length, 0);
    assert.equal(result.captures.length, 1);
    assert.ok(result.captures[0]?.steps.length);
    assert.ok(result.captures[0]?.evidence_records?.length);
  } finally {
    rmSync(runDirectory, { recursive: true, force: true });
  }
});

test("generated report contains promised decision sections", () => {
  const runDirectory = tempDir();
  try {
    const run: ResearchRun = {
      run_id: "test-run",
      run_directory: runDirectory,
      started_at: "2026-04-24T00:00:00.000Z",
      updated_at: "2026-04-24T00:00:00.000Z",
      input: {
        feature_description: "Saved views",
        research_question: "Saved views",
      },
      setup_validation: {
        ok: true,
        figma: { ok: false, verification_level: "missing", summary: "No Figma.", signals: [], instructions: [] },
        browser: { ok: true, verification_level: "verified", summary: "Browser ok.", signals: [], instructions: [] },
      },
      discovered_competitors: [competitor()],
      included_competitors: ["ExampleCo"],
      excluded_competitors: [],
      captures: [
        {
          competitor_name: "ExampleCo",
          status: "captured",
          summary: "Captured public fixture.",
          steps: [],
          analysis: {
            experience_summary: "Fixture analysis.",
            step_reconstruction: [],
            visible_ui_elements: [],
            inferred_capabilities: ["Create view"],
            interaction_patterns: ["Dashboard-first pattern"],
            strengths: ["Clear entry point"],
            friction_points: [],
            reusable_ideas: ["Shareable views"],
            caveats: [],
            designer_product_analysis: {
              use_cases: ["Create saved views"],
              entry_points: ["Feature page"],
              navigation_model: ["Public feature page"],
              navigation_depth: ["1 URL level"],
              ui_patterns: ["Dashboard-first pattern"],
              key_states: ["feature-page"],
              empty_states: ["No empty state was directly observed."],
              error_states: ["No error state was directly observed."],
              edge_states: ["No edge state was directly observed."],
              affordances: ["Create view"],
              constraints: ["No explicit constraints were observed in captured text."],
              tier_or_permission_gates: ["No tier or permission gate was directly observed."],
              friction_points: [],
              reusable_ideas: ["Shareable views"],
              unknowns: ["Pricing details require additional verification."],
            },
          },
          warnings: [],
          evidence_records: [
            {
              id: "exampleco-01-feature-page",
              competitor_name: "ExampleCo",
              source_type: "feature_page",
              source_url: "https://example.com/product",
              observed_at: "2026-04-24T00:00:00.000Z",
              observed_fact: "Captured visible public evidence: Saved views.",
              inference: "Likely supports saved view creation.",
              confidence: "high",
            },
          ],
        },
      ],
      cross_competitor_findings: {
        recurring_capabilities: ["Create view"],
        recurring_patterns: ["Dashboard-first pattern"],
        recurring_strengths: ["Clear entry point"],
        recurring_friction_points: [],
        coverage_summary: "1 of 1 shortlisted competitors were covered.",
        opportunities: ["Shareable views"],
        unknowns: ["Pricing details require additional verification."],
      },
      warnings: [],
      manual_intervention_checkpoints: [],
    };

    const reportPath = generateMarkdownReport(run);
    const report = readFileSync(reportPath, "utf8");
    for (const heading of [
      "## Pricing Comparison",
      "## Customer Sentiment Analysis",
      "## Opportunities and Recommendations",
      "## Unknowns and Gaps",
      "## Source Index",
    ]) {
      assert.match(report, new RegExp(heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }
  } finally {
    rmSync(runDirectory, { recursive: true, force: true });
  }
});
