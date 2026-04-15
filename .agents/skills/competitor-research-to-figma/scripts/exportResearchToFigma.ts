import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  ExcludedCompetitor,
  FigmaExportPlan,
  FigmaLayoutSection,
  ResearchRun,
  logSection,
  requireInput,
  slugify,
  writeJsonFile,
} from "./_shared.js";

const PAGE_PADDING = 32;
const SECTION_GAP_Y = 40;
const SECTION_PADDING = 32;
const SCREENSHOT_GUTTER = 24;
const SCREENSHOT_WIDTH = 480;
const SCREENSHOT_HEIGHT = 300;
const SECTION_HEADER_HEIGHT = 140;
const STEP_TEXT_HEIGHT = 92;

interface FigmaAssetManifest {
  run_id: string;
  generated_at: string;
  assets: Array<{
    competitor_name: string;
    step_label: string;
    screenshot_path: string;
  }>;
}

interface FigmaWritePayload {
  run_id: string;
  destination_url: string;
  file_key: string;
  page_name: string;
  generated_at: string;
  description: string;
  plan_path: string;
  asset_manifest_path: string;
  asset_count: number;
  code: string;
  skill_names: string;
}

interface FigmaCapturePayload {
  run_id: string;
  destination_url: string;
  file_key: string;
  page_name: string;
  generated_at: string;
  html_entry_path: string;
  server_root: string;
  asset_manifest_path: string;
  plan_path: string;
}

function computeSectionHeight(): number {
  return SECTION_PADDING * 2 + SECTION_HEADER_HEIGHT + SCREENSHOT_HEIGHT + STEP_TEXT_HEIGHT;
}

function computeSectionWidth(stepCount: number): number {
  if (stepCount === 0) {
    return SECTION_PADDING * 2 + SCREENSHOT_WIDTH;
  }
  return SECTION_PADDING * 2 + stepCount * SCREENSHOT_WIDTH + Math.max(0, stepCount - 1) * SCREENSHOT_GUTTER;
}

function buildSections(run: ResearchRun): FigmaLayoutSection[] {
  let currentY = PAGE_PADDING;
  return run.captures.map((capture) => {
    const width = computeSectionWidth(capture.steps.length);
    const height = computeSectionHeight();
    const section: FigmaLayoutSection = {
      competitor_name: capture.competitor_name,
      summary: capture.analysis.experience_summary,
      x: PAGE_PADDING,
      y: currentY,
      width,
      height,
      steps: capture.steps.map((step, index) => ({
        step_label: step.step_label,
        screenshot_path: step.screenshot_path,
        x: PAGE_PADDING + SECTION_PADDING + index * (SCREENSHOT_WIDTH + SCREENSHOT_GUTTER),
        y: currentY + SECTION_PADDING + SECTION_HEADER_HEIGHT,
        width: SCREENSHOT_WIDTH,
        height: SCREENSHOT_HEIGHT,
        note: step.change_note,
      })),
    };
    currentY += height + SECTION_GAP_Y;
    return section;
  });
}

function buildComparisonArea(sections: FigmaLayoutSection[], excluded: ExcludedCompetitor[], run: ResearchRun) {
  const width = Math.max(...sections.map((section) => section.width), 1200);
  const lastSection = sections.at(-1);
  const lastSectionBottom = lastSection ? lastSection.y + lastSection.height : PAGE_PADDING;
  return {
    x: PAGE_PADDING,
    y: lastSectionBottom + 48,
    width,
    height: 440,
    recurring_capabilities: run.cross_competitor_findings.recurring_capabilities,
    recurring_patterns: run.cross_competitor_findings.recurring_patterns,
    recurring_strengths: run.cross_competitor_findings.recurring_strengths,
    recurring_friction_points: run.cross_competitor_findings.recurring_friction_points,
    excluded_competitors: excluded,
  };
}

export function buildFigmaExportPlan(run: ResearchRun): FigmaExportPlan {
  const sections = buildSections(run);
  return {
    run_id: run.run_id,
    destination_url: run.input.figma_destination_url ?? "",
    page_name: "Investigación",
    generated_at: new Date().toISOString(),
    layout: {
      page_padding: PAGE_PADDING,
      section_gap_y: SECTION_GAP_Y,
      section_padding: SECTION_PADDING,
      screenshot_gutter: SCREENSHOT_GUTTER,
      screenshot_width: SCREENSHOT_WIDTH,
      screenshot_height: SCREENSHOT_HEIGHT,
    },
    sections,
    comparison_area: buildComparisonArea(sections, run.excluded_competitors, run),
  };
}

function parseFigmaFileKey(destinationUrl: string): string {
  const parsed = new URL(destinationUrl);
  const segments = parsed.pathname.split("/").filter(Boolean);
  const designIndex = segments.indexOf("design");

  if (designIndex === -1 || designIndex + 1 >= segments.length) {
    throw new Error(`Could not extract a Figma file key from destination URL: ${destinationUrl}`);
  }

  if (segments[designIndex + 2] === "branch" && designIndex + 3 < segments.length) {
    return segments[designIndex + 3] ?? "";
  }

  return segments[designIndex + 1] ?? "";
}

function buildAssetManifest(plan: FigmaExportPlan): FigmaAssetManifest {
  return {
    run_id: plan.run_id,
    generated_at: new Date().toISOString(),
    assets: plan.sections.flatMap((section) =>
      section.steps.map((step) => ({
        competitor_name: section.competitor_name,
        step_label: step.step_label,
        screenshot_path: step.screenshot_path,
      })),
    ),
  };
}

function findCapture(run: ResearchRun, competitorName: string) {
  return run.captures.find((capture) => slugify(capture.competitor_name) === slugify(competitorName));
}

function humanizeStepLabel(label: string): string {
  return label
    .replaceAll(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatCaptureStatus(status: ResearchRun["captures"][number]["status"]): string {
  switch (status) {
    case "captured":
      return "Captured";
    case "partial":
      return "Partial";
    case "blocked":
      return "Blocked";
    case "excluded":
      return "Excluded";
    default:
      return status;
  }
}

function readScreenshotBytes(plan: FigmaExportPlan): Record<string, number[]> {
  const bytesByPath: Record<string, number[]> = {};

  for (const section of plan.sections) {
    for (const step of section.steps) {
      if (!existsSync(step.screenshot_path)) {
        throw new Error(`Screenshot referenced by export plan does not exist: ${step.screenshot_path}`);
      }

      bytesByPath[step.screenshot_path] = Array.from(readFileSync(step.screenshot_path));
    }
  }

  return bytesByPath;
}

function buildFigmaWriteCode(plan: FigmaExportPlan, screenshotBytesByPath: Record<string, number[]>): string {
  const planJson = JSON.stringify(plan);
  const bytesJson = JSON.stringify(screenshotBytesByPath);

  return `
const plan = ${planJson};
const screenshotBytesByPath = ${bytesJson};

function rgb(hex) {
  const normalized = hex.replace("#", "");
  return {
    r: parseInt(normalized.slice(0, 2), 16) / 255,
    g: parseInt(normalized.slice(2, 4), 16) / 255,
    b: parseInt(normalized.slice(4, 6), 16) / 255,
  };
}

function solidFill(hex) {
  return [{ type: "SOLID", color: rgb(hex) }];
}

function buildSummaryLines(section) {
  const lines = [section.summary || "No analysis summary was generated for this competitor."];
  for (const step of section.steps) {
    lines.push(step.step_label + ": " + step.note);
  }
  return lines.join("\\n");
}

async function pickFonts() {
  const fonts = await figma.listAvailableFontsAsync();

  function choose(stylePreferences) {
    const preferredFamilies = ["Inter", "Geist", "Roboto"];
    for (const family of preferredFamilies) {
      for (const style of stylePreferences) {
        const match = fonts.find((font) => font.fontName.family === family && font.fontName.style === style);
        if (match) {
          return match.fontName;
        }
      }
    }

    for (const style of stylePreferences) {
      const fallback = fonts.find((font) => font.fontName.style === style);
      if (fallback) {
        return fallback.fontName;
      }
    }

    return fonts[0].fontName;
  }

  const regular = choose(["Regular", "Book", "Medium"]);
  const strong = choose(["Semi Bold", "Bold", "Medium", "Regular"]);
  await figma.loadFontAsync(regular);
  if (regular.family !== strong.family || regular.style !== strong.style) {
    await figma.loadFontAsync(strong);
  }
  return { regular, strong };
}

function createTextNode(text, fontName, fontSize, fillHex) {
  const node = figma.createText();
  node.fontName = fontName;
  node.fontSize = fontSize;
  node.characters = text;
  node.fills = solidFill(fillHex);
  return node;
}

function contentBounds() {
  const sectionRight = plan.sections.length > 0
    ? Math.max(...plan.sections.map((section) => section.x + section.width))
    : plan.layout.page_padding + 800;
  const comparisonRight = plan.comparison_area.x + plan.comparison_area.width;
  const comparisonBottom = plan.comparison_area.y + plan.comparison_area.height;
  return {
    width: Math.max(sectionRight, comparisonRight) + plan.layout.page_padding,
    height: comparisonBottom + plan.layout.page_padding,
  };
}

function computeNextBoardOrigin(page) {
  const baselineX = 40;
  const baselineY = 40;
  const bottom = page.children.reduce((maxBottom, node) => {
    if ("y" in node && "height" in node) {
      return Math.max(maxBottom, node.y + node.height);
    }
    return maxBottom;
  }, baselineY);
  return { x: baselineX, y: bottom + 120 };
}

let page = figma.root.children.find((candidate) => candidate.name === plan.page_name);
if (!page) {
  page = figma.createPage();
  page.name = plan.page_name;
}

await figma.setCurrentPageAsync(page);
const { regular, strong } = await pickFonts();
const boardName = "Benchmark Run / " + plan.run_id;
const existingBoard = page.children.find((candidate) => candidate.name === boardName);
const boardOrigin = existingBoard
  ? { x: existingBoard.x, y: existingBoard.y }
  : computeNextBoardOrigin(page);
if (existingBoard) {
  existingBoard.remove();
}

const bounds = contentBounds();
const board = figma.createFrame();
board.name = boardName;
board.x = boardOrigin.x;
board.y = boardOrigin.y;
board.resize(bounds.width, bounds.height);
board.fills = solidFill("#F5F1E8");
board.cornerRadius = 32;
board.clipsContent = false;
page.appendChild(board);

const title = createTextNode("Competitor Research", strong, 40, "#1F1A14");
title.x = plan.layout.page_padding;
title.y = 40;
board.appendChild(title);

const subtitle = createTextNode("Run: " + plan.run_id + "  |  Generated: " + plan.generated_at, regular, 16, "#6A625B");
subtitle.x = plan.layout.page_padding;
subtitle.y = 92;
board.appendChild(subtitle);

const createdNodeIds = [board.id];
const detailNodeIds = [title.id, subtitle.id];

for (const section of plan.sections) {
  const sectionFrame = figma.createFrame();
  sectionFrame.name = "Competitor / " + section.competitor_name;
  sectionFrame.x = section.x;
  sectionFrame.y = section.y;
  sectionFrame.resize(section.width, section.height);
  sectionFrame.fills = solidFill("#FFFDF8");
  sectionFrame.strokes = [{ type: "SOLID", color: rgb("#D7CEC1") }];
  sectionFrame.strokeWeight = 1;
  sectionFrame.cornerRadius = 20;
  sectionFrame.clipsContent = false;
  board.appendChild(sectionFrame);
  createdNodeIds.push(sectionFrame.id);

  const heading = createTextNode(section.competitor_name, strong, 28, "#1F1A14");
  heading.x = 32;
  heading.y = 28;
  sectionFrame.appendChild(heading);
  detailNodeIds.push(heading.id);

  const summary = createTextNode(buildSummaryLines(section), regular, 14, "#4E463F");
  summary.x = 32;
  summary.y = 74;
  summary.resize(section.width - 64, 60);
  sectionFrame.appendChild(summary);
  detailNodeIds.push(summary.id);

  for (const step of section.steps) {
    const localX = step.x - section.x;
    const localY = step.y - section.y;
    const tile = figma.createFrame();
    tile.name = "Step / " + step.step_label;
    tile.x = localX;
    tile.y = localY;
    tile.resize(step.width, step.height + 78);
    tile.cornerRadius = 16;
    tile.fills = solidFill("#F6EFE3");
    tile.strokes = [{ type: "SOLID", color: rgb("#D7CEC1") }];
    tile.strokeWeight = 1;
    tile.clipsContent = false;
    sectionFrame.appendChild(tile);
    detailNodeIds.push(tile.id);

    const bytes = screenshotBytesByPath[step.screenshot_path];
    const image = figma.createImage(Uint8Array.from(bytes));
    const imageRect = figma.createRectangle();
    imageRect.x = 0;
    imageRect.y = 0;
    imageRect.resize(step.width, step.height);
    imageRect.cornerRadius = 16;
    imageRect.fills = [{
      type: "IMAGE",
      scaleMode: "FILL",
      imageHash: image.hash,
    }];
    tile.appendChild(imageRect);
    detailNodeIds.push(imageRect.id);

    const label = createTextNode(step.step_label.replaceAll("-", " "), strong, 14, "#1F1A14");
    label.x = 12;
    label.y = step.height + 12;
    tile.appendChild(label);
    detailNodeIds.push(label.id);

    const note = createTextNode(step.note, regular, 12, "#5D544C");
    note.x = 12;
    note.y = step.height + 34;
    note.resize(step.width - 24, 36);
    tile.appendChild(note);
    detailNodeIds.push(note.id);
  }
}

const comparison = plan.comparison_area;
const comparisonFrame = figma.createFrame();
comparisonFrame.name = "Comparison Summary";
comparisonFrame.x = comparison.x;
comparisonFrame.y = comparison.y;
comparisonFrame.resize(comparison.width, comparison.height);
comparisonFrame.fills = solidFill("#1F1A14");
comparisonFrame.cornerRadius = 24;
comparisonFrame.strokes = [];
comparisonFrame.clipsContent = false;
board.appendChild(comparisonFrame);
createdNodeIds.push(comparisonFrame.id);

const comparisonTitle = createTextNode("Cross-Competitor Comparison", strong, 24, "#FFF8EE");
comparisonTitle.x = 32;
comparisonTitle.y = 28;
comparisonFrame.appendChild(comparisonTitle);
detailNodeIds.push(comparisonTitle.id);

const columns = [
  { title: "Capabilities", items: comparison.recurring_capabilities },
  { title: "Patterns", items: comparison.recurring_patterns },
  { title: "Strengths", items: comparison.recurring_strengths },
  { title: "Friction", items: comparison.recurring_friction_points },
];

columns.forEach((column, index) => {
  const columnFrame = figma.createFrame();
  columnFrame.name = "Summary / " + column.title;
  columnFrame.x = 32 + index * 280;
  columnFrame.y = 84;
  columnFrame.resize(248, 184);
  columnFrame.cornerRadius = 16;
  columnFrame.fills = solidFill("#2C251F");
  columnFrame.strokes = [{ type: "SOLID", color: rgb("#4C433B") }];
  columnFrame.strokeWeight = 1;
  comparisonFrame.appendChild(columnFrame);
  detailNodeIds.push(columnFrame.id);

  const columnTitle = createTextNode(column.title, strong, 16, "#FFF8EE");
  columnTitle.x = 16;
  columnTitle.y = 16;
  columnFrame.appendChild(columnTitle);
  detailNodeIds.push(columnTitle.id);

  const body = createTextNode(
    (column.items.length ? column.items : ["No evidence captured yet."]).map((item) => "• " + item).join("\\n"),
    regular,
    12,
    "#E8DED1",
  );
  body.x = 16;
  body.y = 44;
  body.resize(216, 124);
  columnFrame.appendChild(body);
  detailNodeIds.push(body.id);
});

if (comparison.excluded_competitors.length > 0) {
  const excluded = createTextNode(
    "Excluded: " + comparison.excluded_competitors.map((entry) => entry.competitor_name + " (" + entry.reason + ")").join("; "),
    regular,
    12,
    "#D6C7B7",
  );
  excluded.x = 32;
  excluded.y = comparison.height - 28;
  excluded.resize(comparison.width - 64, 16);
  comparisonFrame.appendChild(excluded);
  detailNodeIds.push(excluded.id);
}

return {
  pageId: page.id,
  pageName: page.name,
  boardId: board.id,
  createdNodeIds,
  detailNodeIds,
  sectionCount: plan.sections.length,
};
`.trim();
}

function buildFigmaWritePayload(
  plan: FigmaExportPlan,
  planPath: string,
  assetManifestPath: string,
): FigmaWritePayload {
  const fileKey = parseFigmaFileKey(plan.destination_url);
  const screenshotBytesByPath = readScreenshotBytes(plan);
  const assetManifest = buildAssetManifest(plan);
  return {
    run_id: plan.run_id,
    destination_url: plan.destination_url,
    file_key: fileKey,
    page_name: plan.page_name,
    generated_at: new Date().toISOString(),
    description: `Fallback direct-write materialization for the competitor research board on page "${plan.page_name}". Prefer the HTML capture payload when available.`,
    plan_path: planPath,
    asset_manifest_path: assetManifestPath,
    asset_count: assetManifest.assets.length,
    code: buildFigmaWriteCode(plan, screenshotBytesByPath),
    skill_names: "figma-use",
  };
}

function toRelativeWebPath(root: string, targetPath: string): string {
  return path.relative(root, targetPath).split(path.sep).join("/");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderListItems(items: string[], fallback: string): string {
  const values = items.length > 0 ? items : [fallback];
  return values.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function buildHtmlBoard(run: ResearchRun, plan: FigmaExportPlan): string {
  const sectionMarkup = plan.sections
    .map((section) => {
      const capture = findCapture(run, section.competitor_name);
      const stats = [
        {
          label: "Status",
          value: capture ? formatCaptureStatus(capture.status) : "Unknown",
        },
        {
          label: "Observed states",
          value: String(capture?.steps.length ?? section.steps.length),
        },
        {
          label: "Warnings",
          value: String(capture?.warnings.length ?? 0),
        },
      ];
      const stepsMarkup = section.steps
        .map((step) => {
          const src = toRelativeWebPath(run.run_directory, step.screenshot_path);
          const matchingStep = capture?.steps.find((candidate) => candidate.screenshot_path === step.screenshot_path);
          return `
            <article class="step-card">
              <img src="${escapeHtml(src)}" alt="${escapeHtml(`${section.competitor_name} ${step.step_label}`)}" loading="lazy" />
              <div class="step-meta">
                <h3>${escapeHtml(humanizeStepLabel(step.step_label))}</h3>
                <p>${escapeHtml(step.note)}</p>
                ${
                  matchingStep?.url
                    ? `<p class="step-url">${escapeHtml(matchingStep.url)}</p>`
                    : ""
                }
              </div>
            </article>
          `.trim();
        })
        .join("\n");

      return `
        <section class="competitor-section">
          <header class="section-header">
            <div class="section-heading">
              <h2>${escapeHtml(section.competitor_name)}</h2>
              <div class="section-stats">
                ${stats
                  .map(
                    (stat) => `
                      <div class="stat">
                        <span class="stat-label">${escapeHtml(stat.label)}</span>
                        <span class="stat-value">${escapeHtml(stat.value)}</span>
                      </div>
                    `.trim(),
                  )
                  .join("\n")}
              </div>
            </div>
            <p class="summary">${escapeHtml(section.summary || "No analysis summary was generated for this competitor.")}</p>
          </header>
          <div class="step-row">
            ${stepsMarkup}
          </div>
          ${
            capture?.warnings.length
              ? `<p class="section-warning">Warnings: ${escapeHtml(capture.warnings.join(" | "))}</p>`
              : ""
          }
        </section>
      `.trim();
    })
    .join("\n");

  const embeddedRecord = escapeHtml(
    JSON.stringify(
      {
        run_id: run.run_id,
        generated_at: plan.generated_at,
        feature_description: run.input.feature_description,
        destination_url: run.input.figma_destination_url ?? "",
        included_competitors: run.included_competitors,
        excluded_competitors: run.excluded_competitors,
        captures: run.captures,
        cross_competitor_findings: run.cross_competitor_findings,
        figma_export: {
          page_name: plan.page_name,
          layout_plan_path: path.basename(path.join(run.run_directory, "figma-export-plan.json")),
          asset_manifest_path: path.basename(path.join(run.run_directory, "figma-assets-manifest.json")),
        },
      },
      null,
      2,
    ),
  );

  return `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Competitor Research / ${escapeHtml(run.run_id)}</title>
    <style>
      :root {
        color-scheme: light;
        --page-bg: #141414;
        --header-bg: #353535;
        --panel-bg: #141414;
        --panel-border: rgba(255, 255, 255, 0.18);
        --text: #ffffff;
        --muted: #adadad;
        --deep: #141414;
        --deep-panel: rgba(255, 255, 255, 0.08);
        --deep-border: rgba(255, 255, 255, 0.08);
        --light-text: #ffffff;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        font-family: "Inter", "Geist", "Segoe UI", sans-serif;
        background: var(--page-bg);
        color: var(--text);
      }

      .board {
        width: 100%;
        background: var(--page-bg);
      }

      .page-header {
        padding: 48px 32px;
        border-top: 8px solid #ffffff;
        background: var(--header-bg);
      }

      .page-header h1 {
        margin: 0;
        font-size: 80px;
        line-height: 1;
        letter-spacing: -0.4px;
      }

      .page-header .feature-title {
        margin: 32px 0 0;
        font-size: 40px;
        font-weight: 700;
        line-height: 1.08;
        letter-spacing: -0.4px;
      }

      .page-header .meta {
        margin: 22px 0 0;
        color: var(--muted);
        font-size: 15px;
        font-weight: 600;
        letter-spacing: 0.2px;
      }

      .sections {
        display: flex;
        flex-direction: column;
        gap: 40px;
        padding: 0 32px 32px;
      }

      .competitor-section {
        padding: 32px 0 48px;
        border-bottom: 1px solid var(--panel-border);
        background: var(--panel-bg);
      }

      .section-header {
        display: flex;
        flex-direction: column;
        gap: 24px;
      }

      .section-heading {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      .section-header h2 {
        margin: 0;
        font-size: 40px;
        line-height: 1.08;
        letter-spacing: -0.4px;
      }

      .section-stats {
        display: flex;
        gap: 32px;
        overflow-x: auto;
        padding-bottom: 4px;
      }

      .stat {
        min-width: max-content;
      }

      .stat-label {
        display: block;
        color: var(--muted);
        font-size: 13px;
        font-weight: 500;
        line-height: 20px;
        letter-spacing: 0.2px;
      }

      .stat-value {
        display: block;
        color: var(--text);
        font-size: 15px;
        font-weight: 600;
        line-height: 22px;
        letter-spacing: 0.2px;
      }

      .summary {
        margin: 0;
        max-width: 1120px;
        color: var(--muted);
        font-size: 13px;
        line-height: 20px;
        letter-spacing: 0.2px;
      }

      .step-row {
        display: flex;
        gap: 24px;
        margin-top: 28px;
        overflow-x: auto;
        padding: 4px 0 8px;
      }

      .step-card {
        min-width: 480px;
        max-width: 480px;
        background: transparent;
      }

      .step-card img {
        display: block;
        width: 100%;
        height: 300px;
        object-fit: cover;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.06);
        box-shadow: inset 0 0 0 0.5px rgba(255, 255, 255, 0.16);
      }

      .step-meta {
        padding: 16px 4px 0;
      }

      .step-meta h3 {
        margin: 0 0 2px;
        font-size: 15px;
        font-weight: 600;
        line-height: 22px;
        letter-spacing: 0.2px;
      }

      .step-meta p {
        margin: 0;
        font-size: 13px;
        line-height: 20px;
        color: var(--muted);
        letter-spacing: 0.2px;
      }

      .step-url {
        margin-top: 8px;
        word-break: break-all;
      }

      .section-warning {
        margin: 20px 0 0;
        color: #d3b57a;
        font-size: 13px;
        line-height: 20px;
      }

      .comparison {
        padding: 24px 32px 32px;
        background: var(--deep);
        color: var(--light-text);
      }

      .comparison h2 {
        margin: 0;
        font-size: 22px;
        line-height: 30px;
      }

      .comparison-summary {
        margin: 8px 0 0;
        color: var(--muted);
        font-size: 13px;
        line-height: 20px;
        letter-spacing: 0.2px;
      }

      .comparison-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 16px;
        margin-top: 24px;
      }

      .comparison-card {
        min-height: 400px;
        padding: 32px;
        border-radius: 28px;
        border: 1px solid var(--deep-border);
        background: var(--deep-panel);
      }

      .comparison-card h3 {
        margin: 0 0 10px;
        font-size: 15px;
      }

      .comparison-card ul {
        margin: 16px 0 0;
        padding-left: 18px;
        color: var(--muted);
      }

      .comparison-card li {
        margin-bottom: 8px;
        line-height: 1.45;
      }

      .excluded {
        margin-top: 18px;
        font-size: 13px;
        color: var(--muted);
      }

      .machine-record {
        display: none;
      }

      @media (max-width: 1100px) {
        .page-header h1 {
          font-size: 56px;
        }

        .page-header .feature-title,
        .section-header h2 {
          font-size: 32px;
        }

        .comparison-grid {
          grid-template-columns: 1fr 1fr;
        }
      }

      @media (max-width: 720px) {
        .page-header {
          padding: 32px 20px;
        }

        .sections,
        .comparison {
          padding-left: 20px;
          padding-right: 20px;
        }

        .comparison-grid {
          grid-template-columns: 1fr;
        }

        .step-card {
          min-width: 320px;
          max-width: 320px;
        }

        .step-card img {
          height: 220px;
        }
      }
    </style>
  </head>
  <body>
    <main class="board">
      <header class="page-header">
        <h1>Competitor Research</h1>
        <p class="feature-title">${escapeHtml(run.input.feature_description)}</p>
        <p class="meta">Run: ${escapeHtml(run.run_id)} | Generated: ${escapeHtml(plan.generated_at)}</p>
      </header>

      <section class="sections">
        ${sectionMarkup}
      </section>

      <section class="comparison">
        <h2>Cross-Competitor Comparison</h2>
        <p class="comparison-summary">${escapeHtml(run.cross_competitor_findings.coverage_summary)}</p>
        <div class="comparison-grid">
          <article class="comparison-card">
            <h3>Capabilities</h3>
            <ul>${renderListItems(run.cross_competitor_findings.recurring_capabilities, "No evidence captured yet.")}</ul>
          </article>
          <article class="comparison-card">
            <h3>Patterns</h3>
            <ul>${renderListItems(run.cross_competitor_findings.recurring_patterns, "No evidence captured yet.")}</ul>
          </article>
          <article class="comparison-card">
            <h3>Strengths</h3>
            <ul>${renderListItems(run.cross_competitor_findings.recurring_strengths, "No evidence captured yet.")}</ul>
          </article>
          <article class="comparison-card">
            <h3>Friction</h3>
            <ul>${renderListItems(run.cross_competitor_findings.recurring_friction_points, "No evidence captured yet.")}</ul>
          </article>
        </div>
        ${
          run.excluded_competitors.length > 0
            ? `<p class="excluded">Excluded: ${escapeHtml(
                run.excluded_competitors.map((entry) => `${entry.competitor_name} (${entry.reason})`).join("; "),
              )}</p>`
            : ""
        }
      </section>
      <script class="machine-record" type="application/json" id="research-run-data">${embeddedRecord}</script>
    </main>
  </body>
</html>
`.trim();
}

function buildFigmaCapturePayload(
  plan: FigmaExportPlan,
  planPath: string,
  assetManifestPath: string,
  htmlBoardPath: string,
  serverRoot: string,
): FigmaCapturePayload {
  return {
    run_id: plan.run_id,
    destination_url: plan.destination_url,
    file_key: parseFigmaFileKey(plan.destination_url),
    page_name: plan.page_name,
    generated_at: new Date().toISOString(),
    html_entry_path: htmlBoardPath,
    server_root: serverRoot,
    asset_manifest_path: assetManifestPath,
    plan_path: planPath,
  };
}

function executeOptionalCommand(command: string | undefined, payloadPath: string): { success: boolean; error?: string } {
  if (!command) {
    return { success: false };
  }

  try {
    execSync(`${command} "${payloadPath}"`, { stdio: "inherit" });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export function exportResearchToFigma(run: ResearchRun): ResearchRun {
  const plan = buildFigmaExportPlan(run);
  const assetManifest = buildAssetManifest(plan);
  const planPath = path.join(run.run_directory, "figma-export-plan.json");
  const assetManifestPath = path.join(run.run_directory, "figma-assets-manifest.json");
  const payloadPath = path.join(run.run_directory, "figma-write-payload.json");
  const htmlBoardPath = path.join(run.run_directory, "figma-board.html");
  const capturePayloadPath = path.join(run.run_directory, "figma-capture-payload.json");

  writeJsonFile(planPath, plan);
  writeJsonFile(assetManifestPath, assetManifest);
  writeJsonFile(payloadPath, buildFigmaWritePayload(plan, planPath, assetManifestPath));
  writeFileSync(htmlBoardPath, `${buildHtmlBoard(run, plan)}\n`, "utf8");
  writeJsonFile(
    capturePayloadPath,
    buildFigmaCapturePayload(plan, planPath, assetManifestPath, htmlBoardPath, run.run_directory),
  );

  const notes = [
    "Figma export plan generated successfully.",
    "Figma asset manifest generated successfully.",
    "Figma write payload generated successfully.",
    "HTML board bundle generated successfully from the reusable research template.",
    "Figma capture payload generated successfully.",
  ];

  const captureResult = executeOptionalCommand(process.env.FIGMA_CAPTURE_COMMAND, capturePayloadPath);
  if (captureResult.success) {
    notes.push("Figma capture command executed successfully from figma-capture-payload.json.");
  } else if (captureResult.error) {
    notes.push(`Figma capture command failed: ${captureResult.error}`);
  }

  let writeResult: ReturnType<typeof executeOptionalCommand> = { success: false };
  if (!captureResult.success) {
    writeResult = executeOptionalCommand(process.env.FIGMA_WRITE_COMMAND, payloadPath);
    if (writeResult.success) {
      notes.push("Figma write command executed successfully from figma-write-payload.json as a fallback.");
    } else if (writeResult.error) {
      notes.push(`Figma write command failed: ${writeResult.error}`);
    }
  }

  const exported = captureResult.success || writeResult.success;
  if (!exported) {
    notes.push(
      "Use FIGMA_CAPTURE_COMMAND with figma-capture-payload.json to capture the generated HTML board into the destination file.",
    );
    notes.push(
      "Use Codex Figma tooling or FIGMA_WRITE_COMMAND with figma-write-payload.json only as a fallback when HTML capture is unavailable.",
    );
  }

  return {
    ...run,
    updated_at: new Date().toISOString(),
    figma_export: {
      destination_url: run.input.figma_destination_url ?? "",
      page_name: "Investigación",
      status: exported ? "exported" : "planned",
      layout_plan_path: planPath,
      asset_manifest_path: assetManifestPath,
      write_payload_path: payloadPath,
      html_board_path: htmlBoardPath,
      capture_payload_path: capturePayloadPath,
      ...(exported ? { exported_at: new Date().toISOString() } : {}),
      notes,
    },
  };
}

async function main(): Promise<void> {
  const run = requireInput<ResearchRun>(
    process.argv.slice(2),
    "Usage: npm run export:figma -- --input ./runs/<timestamp>/research-run.json",
  );
  const exported = exportResearchToFigma(run);
  writeJsonFile(path.join(exported.run_directory, "research-run.json"), exported);

  logSection("Figma Export");
  console.log(`Destination: ${exported.figma_export?.destination_url}`);
  console.log(`Page: ${exported.figma_export?.page_name}`);
  console.log(`Status: ${exported.figma_export?.status}`);
  console.log(`Plan: ${exported.figma_export?.layout_plan_path}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
