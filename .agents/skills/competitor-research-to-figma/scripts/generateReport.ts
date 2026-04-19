import { copyFileSync, existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  ResearchRun,
  RegionalAnalysis,
  ThematicDeepDive,
  CaseStudy,
  InlineCitation,
  CostBreakdown,
  ensureDir,
  logSection,
  requireInput,
  slugify,
  writeJsonFile,
} from "./_shared.js";
import { writeFileSync } from "node:fs";

function writeTextFile(filePath: string, content: string): void {
  ensureDir(path.dirname(filePath));
  writeFileSync(filePath, content, "utf8");
}

function screenshotRef(screenshotPath: string, outputAssetsDir: string): string {
  const basename = path.basename(screenshotPath);
  if (existsSync(screenshotPath)) {
    const dest = path.join(outputAssetsDir, basename);
    copyFileSync(screenshotPath, dest);
  }
  return `assets/${basename}`;
}

function renderExecutiveSummary(run: ResearchRun): string {
  const lines: string[] = ["## Executive Summary", ""];
  const findings = run.cross_competitor_findings;

  if (findings.strategic_thesis) {
    lines.push(findings.strategic_thesis, "");
  }

  if (findings.strategic_narrative) {
    lines.push(findings.strategic_narrative, "");
  } else {
    // Fallback to structured summary when no narrative is available
    if (findings.recurring_capabilities.length > 0) {
      lines.push(`- **Key capabilities across competitors:** ${findings.recurring_capabilities.slice(0, 3).join("; ")}`);
    }
    if (findings.recurring_strengths.length > 0) {
      lines.push(`- **Common strengths:** ${findings.recurring_strengths.slice(0, 2).join("; ")}`);
    }
    if (findings.recurring_friction_points.length > 0) {
      lines.push(`- **Recurring friction:** ${findings.recurring_friction_points.slice(0, 2).join("; ")}`);
    }
    lines.push(`- **Coverage:** ${findings.coverage_summary}`);
    lines.push("");
  }
  return lines.join("\n");
}

function renderMarketContext(run: ResearchRun): string {
  if (!run.market_context) {
    return "";
  }
  const mc = run.market_context;
  const lines: string[] = ["## Market Landscape", ""];
  lines.push(`**Domain:** ${mc.domain}`, "");
  if (mc.market_segments.length > 0) {
    lines.push(`**Segments:** ${mc.market_segments.join(", ")}`, "");
  }
  if (mc.key_trends.length > 0) {
    lines.push("**Key trends:**");
    for (const trend of mc.key_trends) {
      lines.push(`- ${trend}`);
    }
    lines.push("");
  }
  if (mc.recent_events.length > 0) {
    lines.push("**Recent events:**");
    for (const event of mc.recent_events) {
      lines.push(`- ${event}`);
    }
    lines.push("");
  }
  if (mc.sources.length > 0) {
    lines.push("**Sources:**");
    for (const source of mc.sources) {
      lines.push(`- [${source.title}](${source.url})`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

function renderRegionalAnalysis(run: ResearchRun): string {
  if (!run.market_context?.regional_analyses || run.market_context.regional_analyses.length === 0) {
    return "";
  }

  const lines: string[] = ["## Regional Analysis", ""];

  for (const ra of run.market_context.regional_analyses) {
    lines.push(`### ${ra.locale}`, "");
    lines.push(ra.market_overview, "");

    if (ra.dominant_local_platforms.length > 0) {
      lines.push("**Dominant local platforms / services:**");
      for (const platform of ra.dominant_local_platforms) {
        lines.push(`- ${platform}`);
      }
      lines.push("");
    }

    if (ra.regulatory_contexts.length > 0) {
      lines.push("**Regulatory mandates:**");
      for (const reg of ra.regulatory_contexts) {
        const date = reg.effective_date ? ` (effective ${reg.effective_date})` : "";
        lines.push(`- **${reg.regulation_name}**${date} — ${reg.impact_summary}`);
        lines.push(`  - Affects: ${reg.affected_competitors.join(", ")}`);
        lines.push(`  - Confidence: ${reg.confidence}`);
      }
      lines.push("");
    }

    if (ra.locale_specific_pricing) {
      lines.push("**Locale-specific pricing:**", "");
      lines.push(ra.locale_specific_pricing, "");
    }

    const coverageEntries = Object.entries(ra.competitor_coverage);
    if (coverageEntries.length > 0) {
      lines.push("**Competitor coverage:**");
      for (const [competitor, coverage] of coverageEntries) {
        lines.push(`- **${competitor}:** ${coverage}`);
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

function renderGoalAndScope(run: ResearchRun): string {
  const lines: string[] = [
    "## Research Goal and Scope",
    "",
    `**Research question:** ${run.input.feature_description}`,
    "",
  ];
  if (run.input.company_name) {
    lines.push(`**Company (excluded from results):** ${run.input.company_name}`, "");
  }
  return lines.join("\n");
}

function renderCompetitorsCovered(run: ResearchRun): string {
  const lines: string[] = ["## Competitors Covered", ""];
  lines.push("| Competitor | Product URL | Why included | Confidence |");
  lines.push("|---|---|---|---|");
  for (const comp of run.discovered_competitors) {
    lines.push(`| ${comp.competitor_name} | ${comp.product_url} | ${comp.reason_for_inclusion} | ${comp.confidence} |`);
  }
  lines.push("");
  if (run.excluded_competitors.length > 0) {
    lines.push("**Excluded:**");
    for (const exc of run.excluded_competitors) {
      lines.push(`- ${exc.competitor_name}: ${exc.reason}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

function renderMethodology(run: ResearchRun): string {
  const lines: string[] = [
    "## Methodology",
    "",
    "Evidence was gathered from public sources including:",
    "- Company websites and feature pages",
    "- Pricing pages",
    "- Help centers and documentation",
    "- App store listings",
    "- YouTube demos and walkthroughs",
    "- User reviews (G2, Capterra, Reddit)",
    "- Changelogs and blog posts",
    "",
  ];
  const browserOk = run.setup_validation.browser.ok;
  if (browserOk) {
    lines.push("Browser automation was used for screenshot capture where available.", "");
  }
  return lines.join("\n");
}

function renderFeatureMatrix(run: ResearchRun): string {
  const matrix = run.cross_competitor_findings.feature_matrix;
  if (!matrix || matrix.subfeatures.length === 0) {
    return "";
  }
  const competitors = Object.keys(matrix.subfeatures[0]?.support_by_competitor ?? {});
  if (competitors.length === 0) {
    return "";
  }

  const lines: string[] = ["## Feature Matrix", ""];
  lines.push(`| Subfeature | ${competitors.join(" | ")} |`);
  lines.push(`|---|${competitors.map(() => "---").join("|")}|`);
  for (const sf of matrix.subfeatures) {
    const cells = competitors.map((c) => {
      const support = sf.support_by_competitor[c] ?? "unknown";
      let label: string;
      switch (support) {
        case "supported": label = "Yes"; break;
        case "partial": label = "Partial"; break;
        case "not_supported": label = "No"; break;
        default: label = "?";
      }
      const constraint = sf.constraints_by_competitor?.[c];
      if (constraint) {
        label += ` — ${constraint}`;
      }
      const citation = sf.citation_by_competitor?.[c];
      if (citation !== undefined) {
        label += ` [${citation}]`;
      }
      return label;
    });
    lines.push(`| ${sf.subfeature_name} | ${cells.join(" | ")} |`);
  }
  lines.push("");

  if (matrix.table_stakes.length > 0) {
    lines.push(`**Table stakes:** ${matrix.table_stakes.join(", ")}`, "");
  }
  if (matrix.differentiators.length > 0) {
    lines.push(`**Differentiators:** ${matrix.differentiators.join(", ")}`, "");
  }
  return lines.join("\n");
}

function renderCompetitorDeepDive(
  run: ResearchRun,
  outputAssetsDir: string,
): string {
  const lines: string[] = ["## Per-Competitor Deep Dives", ""];

  for (const capture of run.captures) {
    lines.push(`### ${capture.competitor_name}`, "");
    lines.push(`**Status:** ${capture.status}`, "");
    lines.push(`**Summary:** ${capture.analysis.experience_summary}`, "");

    // Task flow
    if (capture.steps.length > 0) {
      lines.push("#### Task Flow", "");
      for (const step of capture.steps) {
        const ref = screenshotRef(step.screenshot_path, outputAssetsDir);
        lines.push(`**Step ${step.step_number}: ${step.step_label}**`);
        lines.push(`- ${step.change_note}`);
        lines.push(`- Why it matters: ${step.why_it_matters}`);
        lines.push(`- Screenshot: ![${step.step_label}](${ref})`);
        lines.push(`- URL: ${step.url}`);
        lines.push("");
      }
    }

    // Strengths
    if (capture.analysis.strengths.length > 0) {
      lines.push("#### Strengths", "");
      for (const s of capture.analysis.strengths) {
        lines.push(`- ${s}`);
      }
      lines.push("");
    }

    // Friction
    if (capture.analysis.friction_points.length > 0) {
      lines.push("#### Weaknesses / Friction", "");
      for (const f of capture.analysis.friction_points) {
        lines.push(`- ${f}`);
      }
      lines.push("");
    }

    // Case studies
    if (capture.case_studies && capture.case_studies.length > 0) {
      lines.push("#### Case Studies", "");
      for (const cs of capture.case_studies) {
        const outcome = cs.outcome ? ` — ${cs.outcome}` : "";
        lines.push(`- **${cs.company_name}**: ${cs.use_case}${outcome}`);
        lines.push(`  - Source: ${cs.source_url} (${cs.source_type})`);
      }
      lines.push("");
    }

    // Pricing
    if (capture.pricing) {
      lines.push("#### Pricing", "");
      lines.push(`- Model: ${capture.pricing.pricing_model}`);
      if (capture.pricing.tiers.length > 0) {
        lines.push("- Tiers:");
        for (const tier of capture.pricing.tiers) {
          const price = tier.price ?? "N/A";
          lines.push(`  - **${tier.tier_name}**: ${price} ${tier.billing_frequency ?? ""}`);
        }
      }
      lines.push(`- Enterprise: ${capture.pricing.enterprise_available ? "Yes" : "No"}`);

      // Cost breakdowns
      if (capture.pricing.cost_breakdowns && capture.pricing.cost_breakdowns.length > 0) {
        lines.push("", "**Cost breakdown:**", "");
        lines.push("| Cost dimension | Rate | Conditions |");
        lines.push("|---|---|---|");
        for (const cb of capture.pricing.cost_breakdowns) {
          lines.push(`| ${cb.cost_dimension} | ${cb.rate} | ${cb.conditions ?? "—"} |`);
        }
      }
      if (capture.pricing.operational_fees && capture.pricing.operational_fees.length > 0) {
        lines.push("", "**Operational fees:**");
        for (const fee of capture.pricing.operational_fees) {
          lines.push(`- ${fee}`);
        }
      }
      if (capture.pricing.notable_strategies && capture.pricing.notable_strategies.length > 0) {
        lines.push("", "**Notable pricing strategies:**");
        for (const strategy of capture.pricing.notable_strategies) {
          lines.push(`- ${strategy}`);
        }
      }
      lines.push("");
    }

    // Sentiment
    if (capture.sentiment) {
      lines.push("#### Customer Sentiment", "");
      lines.push(`- Overall: ${capture.sentiment.overall_direction}`);
      if (capture.sentiment.rating) {
        lines.push(`- Rating: ${capture.sentiment.rating.score}/${capture.sentiment.rating.max} (${capture.sentiment.rating.source})`);
      }
      if (capture.sentiment.top_praised.length > 0) {
        lines.push(`- Praised: ${capture.sentiment.top_praised.join(", ")}`);
      }
      if (capture.sentiment.top_criticized.length > 0) {
        lines.push(`- Criticized: ${capture.sentiment.top_criticized.join(", ")}`);
      }
      if (capture.sentiment.notable_quotes.length > 0) {
        lines.push("- Quotes:");
        for (const q of capture.sentiment.notable_quotes) {
          lines.push(`  - "${q}"`);
        }
      }
      lines.push("");
    }

    // Caveats
    if (capture.analysis.caveats.length > 0) {
      lines.push("#### Caveats", "");
      for (const c of capture.analysis.caveats) {
        lines.push(`- ${c}`);
      }
      lines.push("");
    }

    lines.push("---", "");
  }

  return lines.join("\n");
}

function renderCrossCompetitorFindings(run: ResearchRun): string {
  const findings = run.cross_competitor_findings;
  const lines: string[] = ["## Cross-Competitor Patterns and Findings", ""];

  if (findings.recurring_capabilities.length > 0) {
    lines.push("### Recurring Capabilities", "");
    for (const c of findings.recurring_capabilities) {
      lines.push(`- ${c}`);
    }
    lines.push("");
  }
  if (findings.recurring_patterns.length > 0) {
    lines.push("### Recurring Patterns", "");
    for (const p of findings.recurring_patterns) {
      lines.push(`- ${p}`);
    }
    lines.push("");
  }
  if (findings.recurring_strengths.length > 0) {
    lines.push("### Recurring Strengths", "");
    for (const s of findings.recurring_strengths) {
      lines.push(`- ${s}`);
    }
    lines.push("");
  }
  if (findings.recurring_friction_points.length > 0) {
    lines.push("### Recurring Friction Points", "");
    for (const f of findings.recurring_friction_points) {
      lines.push(`- ${f}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

function renderThematicDeepDives(run: ResearchRun): string {
  const dives = run.cross_competitor_findings.thematic_deep_dives;
  if (!dives || dives.length === 0) {
    return "";
  }

  const lines: string[] = ["## Thematic Analysis", ""];

  for (const dive of dives) {
    lines.push(`### Theme: ${dive.theme_title}`, "");
    lines.push(dive.narrative, "");
    lines.push(`**Key insight:** ${dive.key_insight}`, "");

    if (dive.evidence_urls.length > 0) {
      lines.push("**Evidence:**");
      for (const url of dive.evidence_urls) {
        lines.push(`- ${url}`);
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

function renderFootnoteIndex(run: ResearchRun): string {
  if (!run.citations || run.citations.length === 0) {
    return "";
  }

  const lines: string[] = ["## Source Index", ""];
  const sorted = [...run.citations].sort((a, b) => a.ref_number - b.ref_number);
  for (const cite of sorted) {
    const date = cite.accessed_date ? `, accessed on ${cite.accessed_date}` : "";
    lines.push(`${cite.ref_number}. ${cite.title}${date}. ${cite.url}`);
  }
  lines.push("");
  return lines.join("\n");
}

function renderSourceIndex(run: ResearchRun): string {
  const lines: string[] = ["## Source Index", ""];
  for (const capture of run.captures) {
    lines.push(`### ${capture.competitor_name}`, "");
    lines.push("| Step | URL | Screenshot |");
    lines.push("|---|---|---|");
    for (const step of capture.steps) {
      lines.push(`| ${step.step_label} | ${step.url} | assets/${path.basename(step.screenshot_path)} |`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

export function generateMarkdownReport(run: ResearchRun, outputDir?: string): string {
  const baseOutputDir = outputDir ?? path.join(run.run_directory, "output");
  const outputAssetsDir = path.join(baseOutputDir, "assets");
  ensureDir(outputAssetsDir);

  const sections: string[] = [
    `# Competitive Research: ${run.input.feature_description}`,
    "",
    `*Generated: ${run.completed_at ?? run.updated_at}*`,
    "",
    renderExecutiveSummary(run),
    renderMarketContext(run),
    renderRegionalAnalysis(run),
    renderGoalAndScope(run),
    renderCompetitorsCovered(run),
    renderMethodology(run),
    renderFeatureMatrix(run),
    renderCompetitorDeepDive(run, outputAssetsDir),
    renderCrossCompetitorFindings(run),
    renderThematicDeepDives(run),
    run.citations && run.citations.length > 0
      ? renderFootnoteIndex(run)
      : renderSourceIndex(run),
  ];

  const report = sections.filter(Boolean).join("\n");
  const reportPath = path.join(baseOutputDir, "research.md");
  writeTextFile(reportPath, report);

  return reportPath;
}

async function main(): Promise<void> {
  const run = requireInput<ResearchRun>(
    process.argv.slice(2),
    "Usage: npm run generate:report -- --input ./runs/<research-slug>/<run-id>/research-run.json",
  );
  const reportPath = generateMarkdownReport(run);

  logSection("Report Generated");
  console.log(`Report written to: ${reportPath}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
