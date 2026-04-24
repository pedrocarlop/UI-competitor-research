import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

function readJson(filePath: string): unknown {
  return JSON.parse(readFileSync(filePath, "utf8")) as unknown;
}

function assertObject(value: unknown, label: string): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
}

function assertArray(value: unknown, label: string): asserts value is unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array.`);
  }
}

function validateTopLevelRequired(schema: Record<string, unknown>, example: Record<string, unknown>): void {
  const required = schema.required;
  assertArray(required, "research-run.schema.json required");
  for (const key of required) {
    if (typeof key !== "string") {
      throw new Error("research-run.schema.json required entries must be strings.");
    }
    if (!(key in example)) {
      throw new Error(`benchmark-output.example.json is missing required top-level key: ${key}`);
    }
  }
}

export function validateSchemas(repoRoot = process.cwd()): void {
  const skillRoot = path.join(repoRoot, ".agents/skills/competitor-research-to-figma");
  const schemaDir = path.join(skillRoot, "schemas");
  const exampleDir = path.join(skillRoot, "examples");

  for (const fileName of readdirSync(schemaDir).filter((name) => name.endsWith(".json"))) {
    assertObject(readJson(path.join(schemaDir, fileName)), fileName);
  }

  for (const fileName of readdirSync(exampleDir).filter((name) => name.endsWith(".json"))) {
    readJson(path.join(exampleDir, fileName));
  }

  const researchRunSchema = readJson(path.join(schemaDir, "research-run.schema.json"));
  assertObject(researchRunSchema, "research-run.schema.json");
  const defs = researchRunSchema.$defs;
  assertObject(defs, "research-run.schema.json $defs");
  const regionalAnalysis = defs.regionalAnalysis;
  assertObject(regionalAnalysis, "regionalAnalysis");
  const regionalRequired = regionalAnalysis.required;
  assertArray(regionalRequired, "regionalAnalysis required");
  if (!regionalRequired.includes("dominant_local_platforms")) {
    throw new Error("regionalAnalysis must require dominant_local_platforms.");
  }
  if (regionalRequired.includes("dominant_payment_methods")) {
    throw new Error("regionalAnalysis must not require dominant_payment_methods.");
  }

  const benchmark = readJson(path.join(exampleDir, "benchmark-output.example.json"));
  assertObject(benchmark, "benchmark-output.example.json");
  validateTopLevelRequired(researchRunSchema, benchmark);
}

async function main(): Promise<void> {
  validateSchemas();
  console.log("Schema and example validation passed.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
