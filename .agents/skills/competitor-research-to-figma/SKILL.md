---
name: competitor-research
description: Researches competitor implementations of a target feature using public evidence — websites, pricing pages, help centers, changelogs, app stores, videos, reviews, forums — and produces a comprehensive competitive intelligence dossier with screenshots, feature matrices, pricing comparisons, customer sentiment, and sourced findings.
tags:
  - research
  - competitor-analysis
  - benchmarking
  - public-evidence
---

# competitor-research

Use this skill when a user wants a comprehensive, evidence-backed competitive intelligence report on how competitors implement a feature, pattern, or workflow. The output is a structured markdown report that enables a designer or product owner to become a domain expert.

## Trigger conditions

Trigger this skill when the user asks to:
- benchmark competitor implementations of a feature
- compare UX patterns, pricing, positioning, or workflows across competitors
- audit how competitors document, market, or present a capability
- gather public evidence about competitor products
- produce a competitive research dossier
- understand an industry or feature domain through competitive lens
- identify what customers praise or complain about across competitors

## Required inputs

The skill must not run without:
- `research_question` — a clear description of what to benchmark (also accepted as `feature_description`)

If the research question is missing, ask for it first. Do not proceed without it.

## Optional inputs

- `company_name` — the user's company, to exclude from competitor lists
- `competitors` — explicit list of competitors to include
- `scope` — specific sources or areas to focus on (e.g., "pricing pages only", "help center articles")
- `research_name` — short label used to name the run directory (defaults to a slug derived from `research_question`)
- `output_path` — where to write the report (defaults to `./runs/<research-name>/<run-id>/output/`)
- `figma_destination_url` — Figma file URL for optional visual export

## Model routing

This skill uses model routing to delegate data-gathering steps to faster, cheaper models while keeping strategic analysis and final prose on the main orchestrator model.

For Codex specifically, keep the orchestrator and subagents on `gpt-5.5`, reserve `high` reasoning effort for the synthesis-heavy steps (5, 9, 9b, 11), and run straightforward discovery/mapping/documentation work with lower reasoning effort where quality is not materially reduced.

### Routing table

Subagent model tiers range from high-reasoning to minimal, matched to task complexity. In the Codex column, the format is `model / reasoning effort`:

| Step | Role | Claude Code | Codex | Antigravity | Why |
|------|------|-------------|-------|-------------|-----|
| 1. Define question | Orchestrator | opus (main) | gpt-5.5 / medium (main) | Main Orchestrator | Interactive, needs conversation context |
| 2. Market context | **Subagent/Tool** | sonnet | gpt-5.5 / medium | `search_web` Tool | Evaluating and synthesizing market trends |
| 3. Discover competitors | **Subagent/Tool** | sonnet | gpt-5.5 / medium | `search_web` Tool | Broad search, ranking, and filtering are lighter than synthesis |
| 4. Build source map | **Subagent/Tool** | haiku | gpt-5.5 / low | `read_url_content` Tool | Systematic URL enumeration |
| 5. Feature matrix | Orchestrator | opus (main) | gpt-5.5 / high (main) | Main Orchestrator | High synthesis, cross-referencing many sources |
| 6+7+8. Evidence + Pricing + Sentiment | **Subagent ×N** | sonnet | gpt-5.5 / medium | Browser Use / `browser_subagent` Tool | Per-competitor data gathering, needs judgment |
| 9. Analysis & synthesis | Orchestrator | opus (main) | gpt-5.5 / high (main) | Main Orchestrator | Core strategic reasoning |
| 9b. Strategic thesis | Orchestrator | opus (main) | gpt-5.5 / high (main) | Main Orchestrator | Highest reasoning required |
| 10. Unknowns | **Subagent/Tool** | haiku | gpt-5.5 / low | Main Orchestrator (Artifacting) | Systematic gap documentation |
| 11. Report | Orchestrator | opus (main) | gpt-5.5 / high (main) | Native Artifacts | Final prose quality matters |
| 12. Figma export | **Subagent** | haiku | gpt-5.5 / low | Not natively supported | Mechanical tool invocation |

Steps 6, 7, and 8 are merged into a **single subagent per competitor** to reduce spawn overhead. One subagent handles evidence capture, pricing analysis, and sentiment gathering for its assigned competitor.

### Parallelization

- **Steps 2 + 3:** Spawn market context and competitor discovery subagents concurrently. Wait for both before proceeding to step 4. In Codex, prefer separate agents for these steps so competitor discovery can use a lower reasoning-effort path.
- **Steps 6+7+8:** Spawn one combined subagent per competitor concurrently (up to all competitors in parallel). Collect all results before proceeding to step 9.

### Platform-specific spawn mechanics

#### Claude Code

Use the `Agent` tool with a `model` parameter matched to the routing table. Use `model: "sonnet"` for steps requiring judgment (2, 3, 6+7+8) and `model: "haiku"` for mechanical steps (4, 10, 12). Multiple `Agent` calls in a single message run concurrently:

```
Agent(model="sonnet", prompt="<subagent prompt for steps needing judgment>")
Agent(model="haiku", prompt="<subagent prompt for mechanical steps>")
```

#### Codex (OpenAI)

Use custom agent TOML files in `.codex/agents/`. Each TOML defines a subagent role with a model and reasoning effort tier matched to task complexity. Prefer the exact Codex agent names below when spawning. Parallelism is controlled by `[agents] max_threads` in `config.toml` (default 6).

Available agent definitions:
- `market_researcher` — step 2 (market context) — `gpt-5.5` / medium effort
- `competitor_discoverer` — step 3 (competitor discovery) — `gpt-5.5` / medium effort
- `source_mapper` — step 4 (source map) — `gpt-5.5` / low effort
- `evidence_gatherer` — steps 6+7+8 combined (per-competitor evidence, pricing, sentiment) — `gpt-5.5` / medium effort
- `gap_documenter` — step 10 (unknowns) — `gpt-5.5` / low effort

Agent template availability:
- The repo keeps the canonical Codex agent definitions in the root `.codex/agents/` directory.
- The installable skill bundles mirrored copies in `codex/agents/` so Codex users can copy them into `~/.codex/agents/` after installing the skill.

Codex orchestration policy:
- Keep the main Codex thread on `gpt-5.5` throughout the run.
- Use `medium` reasoning for coordination, clarification, and step handoffs.
- Raise the main thread to `high` reasoning only for steps 5, 9, 9b, and 11.
- Keep straightforward URL enumeration, competitor list generation, and gap documentation on the lower-effort agents above.
- If `competitor_discoverer` is unavailable, `market_researcher` may be used as a backward-compatible fallback for a combined steps 2+3 pass, but the preferred Codex path is to split them.

Codex screenshot capture note:
- The evidence-gathering agent must be able to write files. In `.codex/agents/evidence-gatherer.toml`, keep `sandbox_mode = "workspace-write"` so PNG assets can actually be persisted.
- Do not instruct Codex to use `mcp__Claude_in_Chrome__*` or `mcp__computer-use__screenshot`; those are Claude-oriented examples and do not guarantee saved files in Codex.
- Prefer the current Browser Use CLI (`browser-use`, latest verified: 0.12.6) when the environment exposes it for interactive browser inspection. Configure `BROWSER_USE_COMMAND` if the binary is installed under a non-default command.
- When Codex needs persistent screenshots, prefer the bundled Playwright-backed scripts in this repo (`npm run check:setup`, `npm run capture`, `npm run run:research`) so captured images are written to disk and can be verified.

#### Antigravity

Antigravity utilizes specialized native tools instead of generic thinking subagents:
- Use the `search_web` tool concurrently for Market Context and Competitor Discovery.
- Use the `read_url_content` tool concurrently for building the Source Map.
- Use the current Browser Use browser automation tool when available. If Antigravity exposes `browser_subagent`, run it concurrently for specific Competitor Evidence, Pricing, and Sentiment. Configure the `Task` prompt to explicitly instruct the browser worker to extract the required JSON data payloads. Provide a descriptive `RecordingName` when the environment supports browser-session recordings.
- Use the `write_to_file` tool with `IsArtifact: true` to output the final `research.md` (using carousels to embed WebP recordings and screenshots) directly to the user's workspace.

### Fallback behavior

Model routing and specialized native tools are an optimization, not a requirement. The skill must produce identical output regardless of whether routing is used.

- If the platform does not support subagent spawning, execute all steps on the main model.
- If a subagent fails or returns incomplete results: log the failure as a warning, re-execute the step on the main model, and continue the workflow.

## Ordered procedure

When model routing is active (see above), the execution flow is:

1. **Step 1** on orchestrator (interactive)
2. **Steps 2 + 3** on subagents concurrently → wait for both
3. **Step 4** on subagent → wait
4. **Step 5** on orchestrator (needs all prior results)
5. **Steps 6+7+8** on subagents concurrently (one per competitor) → wait for all
6. **Steps 9, 9b** on orchestrator (strategic analysis)
7. **Step 10** on subagent → wait
8. **Step 11** on orchestrator (final report prose)
9. **Step 12** on subagent (if Figma URL provided)

When model routing is not available, execute all steps sequentially on the main model as before.

### 1. Define the research question and scope

Confirm the research question with the user. Clarify:
- What feature, workflow, or capability to benchmark
- Whether specific competitors are already known or should be discovered
- Whether the scope is broad (full audit) or narrow (specific sources only)
- What the user most needs to learn (e.g., "how do they all handle pricing?", "what do customers hate?")

### 2. Gather industry and market context

Before diving into individual competitors, build a landscape view:
- Web search for recent market overviews and landscape articles for the domain
- Identify key market segments (SMB vs enterprise, vertical-specific, geographic)
- Note recent funding rounds, acquisitions, or major product launches
- Identify notable industry standards, regulations, or compliance considerations
- Record 3-5 key trends shaping the space

When a `locale` is provided, or when the research question mentions a specific region or country, conduct locale-specific research:
- Search for dominant local platforms, services, or alternatives relevant to the feature domain (e.g., for payments: Bizum in Spain, iDEAL in Netherlands; for messaging: KakaoTalk in Korea, WeChat in China; for e-commerce: Mercado Libre in Latin America)
- Search for relevant regulatory mandates affecting the feature domain in that jurisdiction (e.g., tax reporting requirements, data residency laws, industry-specific compliance mandates)
- Search for each competitor's availability, localization quality, and regional pricing in that market
- Record regional pricing structures if they differ from the global default
- Note market share data for local vs. global platforms or services in the feature domain

Produce a "Market Landscape" section for the report. When locale-specific research was conducted, also produce a "Regional Analysis" section.

#### Subagent delegation (step 2)

Delegate this step to a fast/cheap subagent. Spawn concurrently with step 3.

- **Input:** `research_question`, `locale` (optional)
- **Output:** Markdown containing a "## Market Landscape" section (with subsections for segments, trends, events, sources) and optionally a "## Regional Analysis" section. All claims must include source URLs.
- **Subagent prompt:** "You are a market research analyst. Research the market landscape for the following domain: {research_question}. Search the web for recent market overviews, key segments, trends, funding rounds, and regulatory considerations. If locale is provided ({locale}), also research dominant local platforms, regulatory mandates, and regional pricing dynamics. Produce two markdown sections: '## Market Landscape' and (if locale applies) '## Regional Analysis'. Cite every claim with its source URL. Be thorough but concise."

### 3. Discover competitors dynamically

Find 5-10 relevant competitors using web search and the user's input:
- Search for "[research topic] competitors [current year]"
- Search for "best [product category] tools" and "alternatives to [known product]"
- Search G2, Capterra, and TrustRadius category pages for the domain
- Search product comparison and review aggregator sites
- Check "vs" pages and product directory listings

For each competitor, record:
- Company name
- Product URL
- Why it is relevant to the research question
- Confidence level (high / medium / low)

If the user provides a `competitors` list, use it directly and skip discovery.

Prefer competitors with mature, publicly documented products. Avoid selecting the user's own company when `company_name` is provided.

#### Subagent delegation (step 3)

Delegate this step to a fast/cheap subagent. Spawn concurrently with step 2.

- **Input:** `research_question`, `company_name` (optional, to exclude), `competitors` (optional, if provided skip discovery)
- **Output:** JSON array of objects: `[{"competitor_name": "...", "product_url": "...", "reason": "...", "confidence": "high|medium|low"}]` (5-10 entries)
- **Subagent prompt:** "You are a competitive intelligence researcher. Find 5-10 relevant competitors for: {research_question}. Search the web for '[topic] competitors [current year]', 'best [category] tools', 'alternatives to [known product]'. Search G2, Capterra, and TrustRadius category pages. Exclude {company_name} if provided. For each competitor, return: competitor_name, product_url, reason for inclusion, and confidence level (high/medium/low). Prefer competitors with mature, publicly documented products. Return results as a JSON array."

### 4. Build a source map

For each competitor, identify which public sources are available and relevant:
- Company website (homepage, navigation, footer)
- Feature pages
- Pricing pages
- Use-case and solution pages
- Help centers and support documentation
- FAQs
- Changelogs and release notes
- Blog posts (when directly relevant)
- App store pages and screenshots (iOS, Android, web directories)
- YouTube demos and walkthrough videos
- User reviews and forums
- Product directories and comparison pages

Record the source map before starting evidence collection.

#### Subagent delegation (step 4)

Delegate this step to a fast/cheap subagent.

- **Input:** `research_question`, competitor list (names + product URLs from step 3)
- **Output:** JSON object mapping each competitor name to an array of `{"source_type": "...", "url": "...", "notes": "..."}` objects
- **Subagent prompt:** "You are mapping public sources for competitive research on: {research_question}. For each competitor below, identify which public sources are available and relevant: company website, feature pages, pricing pages, help centers, changelogs, app store pages, YouTube demos, review pages, etc. Visit each competitor's product URL to find these pages. Return a JSON object mapping each competitor name to an array of {source_type, url, notes} objects. Competitors: {competitor_list_json}"

### 5. Identify subfeatures and build feature matrix

For the target feature, identify all subfeatures and capabilities mentioned across competitors:
- Scan feature pages, help center articles, changelogs, and comparison pages
- List every distinct subfeature or capability (e.g., for "payment links": branding customization, expiration dates, partial payments, analytics, webhooks, multi-currency, QR codes; for "user onboarding": step sequencing, progress indicators, email triggers, SSO, localization, in-app guidance; for "search": filters, autocomplete, ranking controls, analytics, personalization)
- Build a feature matrix: rows = subfeatures, columns = competitors
- For each cell: supported / partially supported / not supported / unknown
- Identify table-stakes features (supported by most or all competitors)
- Identify differentiators (supported by few competitors)
- Note which competitor has the best implementation of each subfeature and why

For each subfeature, go beyond binary support status. Document:
- Specific constraints or limits (e.g., "maximum 20 items per bundle", "capped at $10,000 per link")
- How the implementation qualitatively differs between competitors (e.g., "Stripe supports adjustable quantities; Square uses rigid one-to-one links")
- Which public source confirms the support level (for inline citation)
- Whether the feature requires a specific tier, plan, or add-on to access

### 6. Collect evidence and capture flows

For each competitor, visit the mapped sources and:
- Capture full-page screenshots for homepage, pricing, and key feature pages
- Capture focused screenshots for specific UI patterns, sections, or evidence points
- Crop where necessary to highlight a specific pattern
- Record the source URL and a short context note for each screenshot
- Use consistent naming: `{competitor}-{source}-{topic}.png`
  - Examples: `stripe-pricing-tier-comparison.png`, `square-helpcenter-payment-links.png`
- Save screenshots to the active run directory's `output/assets/`

Where possible, reconstruct task flows and user journeys from:
- Help center step-by-step guides
- YouTube demo walkthroughs
- App store screenshot sequences
- Feature page descriptions and diagrams

For each competitor, also search for:
- **Case studies and customer stories:** Search `[competitor] case study [feature]`, `[competitor] customer story`, `[competitor] used by [company]`. Record any named customer examples with their use case and measurable outcomes (e.g., "OpenAI used Stripe Payment Links for ChatGPT Plus subscriptions", "MemberPress reported 30% conversion lift after integrating Stripe Link").
- **Developer community discourse:** Search `[competitor] [feature] site:stackoverflow.com`, `[competitor] [feature] site:github.com`, `[competitor] site:news.ycombinator.com`. These provide technical depth and candid assessments that marketing pages and review platforms miss.
- **News and press coverage:** Search for recent articles about product launches, partnerships, or notable deployments related to the feature.

#### Subagent delegation (steps 6+7+8 combined — per competitor)

Steps 6, 7, and 8 are merged into a single subagent per competitor. Spawn one subagent per competitor concurrently. Each subagent handles evidence capture, pricing analysis, and sentiment gathering for its assigned competitor.

- **Input:** `competitor_name`, `product_url`, `source_map` (from step 4), `research_question`, `subfeature_list` (from step 5), `locale` (optional), `output_assets_path`
- **Output:** A structured JSON bundle containing:
  - `screenshots[]` — array of `{"path": "...", "source_url": "...", "context_note": "..."}` saved to the active run directory's `output/assets/`
  - `pricing` — `{"pricing_model": "...", "tiers": [...], "cost_breakdowns": [...], "operational_fees": [...], "notable_strategies": [...], "enterprise_available": bool, "confidence": "..."}`
  - `sentiment` — `{"overall_direction": "...", "top_praised": [...], "top_criticized": [...], "notable_quotes": [...], "sources": [...]}`
  - `case_studies[]` — `[{"company_name": "...", "use_case": "...", "outcome": "...", "source_url": "...", "source_type": "..."}]`
  - `evidence_notes[]` — raw observations about the competitor's implementation, strengths, weaknesses
  - `flow_reconstruction[]` — step-by-step task flow with screenshot references
- **Subagent prompt:** "You are a competitive intelligence researcher focused on a single competitor. Gather comprehensive public evidence for {competitor_name} ({product_url}) regarding: {research_question}.

  YOUR TASKS:
  1. EVIDENCE CAPTURE: Visit the sources listed in the source map below. For each key page (homepage, pricing, feature pages, help center):
     - Navigate to the page using the Chrome browser MCP tools (mcp__Claude_in_Chrome__navigate, then mcp__Claude_in_Chrome__read_page or mcp__Claude_in_Chrome__get_page_text for content).
     - Capture a screenshot using the computer-use screenshot tool (mcp__computer-use__screenshot), then write the image bytes to {output_assets_path}/{competitor_slug}-{source}-{topic}.png using the Write tool.
     - If computer-use screenshot is unavailable, use mcp__Claude_in_Chrome__read_page to get full page content as a fallback and note 'no screenshot captured' in the context note.
     - Record the source URL and a short context note for each captured asset.
     - Reconstruct task flows from help center guides, YouTube demos, or app store screenshots.
     - Search for case studies, developer discourse (Stack Overflow, GitHub, Hacker News), and news coverage.
  2. PRICING ANALYSIS: Visit the pricing page. Record tier names, prices, billing frequency, currency. Classify the pricing model. Note per-usage breakdowns, operational fees, add-on costs, and notable strategies. {locale_pricing_instruction}
  3. SENTIMENT: Search G2, Capterra, App Store, Google Play, Reddit, Stack Overflow, GitHub, and Hacker News for reviews and discussions about {competitor_name} and {research_question}. Record overall rating, sentiment direction, top praised/criticized aspects, and notable quotes with source URLs.

  For each subfeature in the list below, note whether {competitor_name} supports it (supported/partial/not_supported/unknown) with evidence.

  SOURCE MAP: {source_map_json}
  SUBFEATURES: {subfeature_list_json}

  Return your findings as a single JSON object with keys: screenshots, pricing, sentiment, case_studies, evidence_notes, flow_reconstruction."

- **Codex override:** When running this step in Codex, do not use the Claude-specific MCP instructions above as the primary screenshot path. Instead:
  - Prefer the bundled Playwright workflow in this repository when screenshots must persist to disk:
    - `npm run check:setup` to validate browser tooling
    - `npm run capture -- --input <capture.json>` for targeted evidence capture
    - `npm run run:research -- --input <research.json>` for end-to-end runs
  - Only report screenshot paths that were actually written and verified on disk.
  - If browser capture is unavailable, continue the research with public evidence and explicitly mark the screenshot as missing in the returned JSON rather than fabricating an asset path.

### 7. Analyze pricing models

For each competitor with a public pricing page:
- Visit the pricing page and capture a full-page screenshot
- Record: tier names, prices, billing frequency (monthly/annual), currency
- Note feature differences between tiers
- Identify free tier or freemium offering details
- Note enterprise or custom pricing availability
- Classify the pricing model: usage-based, seat-based, flat-rate, freemium, custom, hybrid
- Note any notable pricing strategies (e.g., reverse trial, volume discounts, startup programs)

For each competitor, also research:
- Pricing breakdowns by usage dimension, tier, or transaction type that applies to the feature domain (e.g., for payments: per-method rates; for APIs: per-call tiers; for SaaS: per-seat or per-workspace; for marketplaces: per-transaction or percentage fees)
- Overage, penalty, or operational fees beyond the headline rate (e.g., dispute fees for payments, overage fees for API rate limits, seat overages for SaaS)
- Hidden or add-on costs that unlock key capabilities (e.g., custom domain fees, branding unlock fees, export fees, premium integrations)
- Notable pricing strategies or developer/community critiques (e.g., layered SaaS add-on fees, "Indie Tax" dynamics, feature-gating criticism)

When a `locale` is specified, also research regional pricing differences. Note whether competitors charge different rates or have different tiers for that market, and whether any locally dominant platforms in that domain affect the competitive pricing dynamic.

Produce a pricing comparison table in the report. When the domain has meaningful per-usage or per-dimension breakdowns, include those — not just the headline rate. Follow the table with narrative analysis of pricing strategy differences.

If pricing is gated behind a sales call or not publicly available, record this as an unknown with confidence level.

### 8. Gather customer sentiment

For each competitor, search for and collect customer feedback:
- **App store reviews**: Search iOS App Store and Google Play Store pages. Record overall rating, review count, and 3-5 representative reviews (positive and negative).
- **Review platforms**: Search G2, Capterra, TrustRadius for the product. Note overall score, number of reviews, and top praised/criticized aspects.
- **Reddit discussions**: Search Reddit for "[product name] [feature]" threads. Note common complaints, praise, and feature requests.
- **Forum and community mentions**: Search for community discussions, Stack Overflow questions, or product-specific forums.
- **Developer community**: Search Stack Overflow for technical questions and pain points, GitHub Issues/Discussions for bug reports and feature requests, and Hacker News for candid industry commentary. Developer sentiment often reveals architectural limitations and operational friction that review platforms miss.

For each source, record:
- Source URL
- Sentiment: positive / negative / mixed
- Key quote or paraphrase
- Theme (e.g., "pricing complaint", "UX praise", "reliability issue", "feature request")

Produce a **sentiment summary** per competitor:
- Overall sentiment direction
- Top 3 praised aspects
- Top 3 criticized aspects
- Notable quotes with attribution

Then produce a cross-competitor sentiment summary identifying recurring themes.

### 9. Analyze and synthesize

Review all collected evidence and produce real, specific analysis:

**Per competitor:**
- What is their philosophy and approach to this feature? What trade-offs did they make?
- Who is the target user? (SMB, enterprise, developer, non-technical)
- What design patterns do they use? (wizard, dashboard-first, inline editing, modal, tabs)
- What is the navigation depth to reach the feature?
- Evaluate strengths with specific evidence: cite screenshots, URLs, or quotes
- Evaluate weaknesses with specific evidence: cite screenshots, URLs, or quotes
- What is unique or differentiated about their approach?

**Cross-competitor:**
- What recurring patterns appear across most competitors?
- What are common gaps or blind spots?
- What are industry best practices that emerge from the evidence?
- Where do competitors cluster vs. diverge in their approaches?

**Strategic narrative:**
Write a strategic narrative (3-5 paragraphs) that synthesizes the most important comparative insight. This should read like an analyst brief, not a checklist. Structure it as: thesis statement → supporting evidence across competitors → implications for someone building or evaluating in this space. Every factual claim must have an inline citation using numbered footnotes `[N]`.

### 9b. Build strategic thesis

After completing the analysis, step back and identify the single most important strategic insight:

1. **Identify the fundamental philosophical difference** between the competitors. What operating model, target user, or design philosophy separates them? (e.g., "programmable infrastructure vs. omnichannel POS extension", "developer-first vs. operations-first", "horizontal platform vs. vertical solution")
2. **Articulate a 1-2 sentence thesis statement** that captures this core competitive dynamic. This becomes the opening line of the executive summary.
3. **Validate the thesis** against evidence from each competitor — does it explain the feature choices, pricing models, and positioning you observed?
4. **Identify 3-5 thematic dimensions** where the competitors diverge in interesting ways (e.g., architecture philosophy, cart dynamics, pricing economics, customization depth, regional strategy). These become the thematic analysis sections.
5. **Write 2-4 paragraphs of narrative synthesis** for each theme, comparing all competitors side by side with inline citations. Each theme should end with a key insight.

For every finding, clearly distinguish:
- **Observed** — directly seen in the source material
- **Inferred** — a conclusion drawn from observed evidence (clearly labeled)
- **Unknown** — something that could not be determined
- **Confidence** — High / Medium / Low

### 10. Record unknowns

For anything that could not be determined from public evidence:
- State the question clearly
- Explain why it remains unresolved
- Note what evidence is missing
- Suggest a next validation step (user interview, authenticated access, sales call, trial signup, etc.)

#### Subagent delegation (step 10)

Delegate this step to a fast/cheap subagent.

- **Input:** `research_question`, feature matrix (from step 5), all per-competitor evidence bundles (from steps 6-8), analysis findings (from step 9)
- **Output:** Markdown using the Unknown template (see below), listing all identified gaps
- **Subagent prompt:** "You are documenting research gaps for a competitive intelligence report on: {research_question}. Review the evidence collected and analysis produced below. For anything that could not be determined from public evidence, produce an entry using this template:

  ### Unknown NN
  **Question** — what remains unclear
  **Why unresolved** — why public evidence was not enough
  **Missing evidence** — what could not be found
  **Next validation step** — how to validate later (user interview, trial signup, sales call, etc.)

  FEATURE MATRIX: {feature_matrix_summary}
  EVIDENCE GAPS: {evidence_gaps_summary}
  ANALYSIS FINDINGS: {analysis_findings_summary}"

### 11. Produce the markdown report

Write `<run_directory>/output/research.md` with these sections (for Antigravity, use `write_to_file` with `IsArtifact: true` to generate a rich markdown viewer):

1. **Executive summary** — Open with a 1-2 sentence strategic thesis that captures the fundamental competitive dynamic. Follow with 3-5 key insights that support, nuance, or qualify the thesis. Write in narrative prose with inline citations, not as a bullet list. This is the "if you read one section" summary that a decision-maker can act on.
2. **Market landscape** — industry context, segments, trends, recent events, with source citations
3. **Regional analysis** (when applicable) — appears when `locale` is specified or when regional dynamics are material. Includes dominant local platforms or services, regulatory mandates, competitor availability in the market, and locale-specific pricing differences.
4. **Research goal and scope** — what was investigated and why
5. **Competitors covered** — which competitors, why, and at what confidence level
6. **Methodology** — how evidence was gathered, which source types, what tools
7. **Feature matrix** — subfeature comparison table across all competitors. Each cell should include constraints, limits, and a footnote reference. Go beyond Yes/No — capture nuance (e.g., `Partial — max 20 items, no cross-sells [14]`).
8. **Per-competitor deep dives** — for each competitor:
   - Overview and positioning
   - Key screenshots with source links
   - Task flows and user journeys
   - Case studies (if any named customer examples were found)
   - Pricing model summary with per-method fee breakdowns
   - Strengths (with evidence and inline citations)
   - Weaknesses (with evidence and inline citations)
   - Customer sentiment summary
9. **Pricing comparison** — cross-competitor pricing table. When the domain has per-usage or per-dimension pricing, include a breakdown table with those dimensions (adapted to the domain — not just headline rates). Follow with 1-2 paragraphs of narrative analysis on pricing strategy differences.
10. **Customer sentiment analysis** — cross-competitor themes, recurring praise and complaints, notable quotes with source attribution
11. **Cross-competitor patterns and findings** — using the finding template
12. **Thematic analysis** — 3-5 thematic deep dives organized by analytical theme, not by competitor. Each theme compares all competitors side by side in 2-4 paragraphs of narrative prose with inline citations. Use the thematic deep dive template. This section is the heart of the strategic analysis — it synthesizes evidence from the per-competitor deep dives into comparative insights a decision-maker can act on.
13. **Opportunities and recommendations** — actionable insights for the PO/designer based on gaps, weaknesses, and unmet customer needs
14. **Unknowns and gaps** — using the unknown template
15. **Source index** — numbered footnote index. Each entry includes its footnote number, source title, date accessed, and full URL. This must match the inline `[N]` footnotes used throughout the report.

Use numbered footnotes `[N]` for inline citations throughout the entire report. Every factual claim, feature matrix cell, and pricing figure should cite its source inline. The footnote index at the end of the report provides the full URLs.

Optionally write `<run_directory>/output/sources.md` as a standalone source index.

### 12. Optionally export to Figma

Only when `figma_destination_url` is provided:
- Plan the Figma layout with competitor sections and screenshot placements
- Export the visual research board to the Figma file

If no Figma URL is provided, skip this step entirely.

#### Subagent delegation (step 12)

Delegate this step to a fast/cheap subagent when `figma_destination_url` is provided.

- **Input:** `figma_destination_url`, path to `<run_directory>/output/research.md`, path to `<run_directory>/output/assets/`
- **Output:** Figma export status confirmation
- **Subagent prompt:** "You are exporting a competitive research report to Figma. Plan a layout with one section per competitor, including screenshot placements. Export the visual research board to the Figma file at: {figma_destination_url}. Use screenshots from {output_assets_path} and findings from {report_path}."

## Finding template

Use this structure for each finding:

```markdown
### Finding NN

**Pattern**
[short description]

**Observed**
[what was directly seen in the source material]

**Evidence**
- Screenshot: assets/{filename}.png
- Source: [Title](url)

**Inference**
[what this likely means, clearly marked as inference]

**Confidence**
High / Medium / Low

**Why it matters**
[why this is relevant to the research question]
```

## Unknown template

Use this structure for each unknown:

```markdown
### Unknown NN

**Question**
[what remains unclear]

**Why unresolved**
[why public evidence was not enough]

**Missing evidence**
[what could not be found]

**Next validation step**
[how this could be validated later — user interview, trial signup, sales call, etc.]
```

## Pricing finding template

Use this structure for pricing findings:

```markdown
### Pricing Finding NN

**Competitor**
[competitor name]

**Model**
[usage-based / seat-based / flat-rate / freemium / custom / hybrid]

**Tiers**
| Tier | Price | Billing | Key features | Limitations |
|------|-------|---------|-------------|-------------|
| ... | ... | ... | ... | ... |

**Notable**
[anything unusual or strategic about the pricing]

**Evidence**
- Screenshot: assets/{filename}.png
- Source: [Pricing page](url)

**Confidence**
High / Medium / Low
```

## Sentiment finding template

Use this structure for sentiment findings:

```markdown
### Sentiment Finding NN

**Theme**
[e.g., "Onboarding complexity", "Pricing frustration", "Feature praise"]

**Direction**
Positive / Negative / Mixed

**Competitors affected**
[which competitors this theme applies to]

**Evidence**
- "[Direct quote from review]" — [Source](url), [date if available]
- "[Another quote]" — [Source](url)

**Why it matters**
[what this means for a product building in this space]
```

## Thematic deep dive template

Use this structure for each thematic analysis section:

```markdown
### Theme: [Theme Title]

[2-4 paragraphs of comparative analysis across all competitors, with inline footnote citations. Write like an analyst brief — build an argument, cite evidence, draw conclusions. Compare how each competitor's approach to this theme reflects their broader philosophy.]

**Key insight:** [1-2 sentence takeaway that a decision-maker can act on]

**Evidence:**
- [Source title](url) — [what it shows]
- [Source title](url) — [what it shows]
```

Example themes: Architecture and deployment philosophy, Cart dynamics and itemization, Customization and branding psychology, Pricing economics and fee layering, Regional and regulatory positioning.

## Evidence capture rules

- Full-page screenshots for homepage, pricing, and key feature pages
- Focused screenshots for specific UI patterns, sections, or evidence points
- Crops where necessary to highlight a pattern
- Consistent naming: `{competitor}-{source}-{topic}.png` (Note: for Antigravity, native WebP recordings are automatically saved to the artifacts directory and should be embedded instead of static PNGs)
- Every image or recording must have a source URL and context note
- Save all images to the active run directory's `output/assets/` (For Antigravity, reference the captured WebP artifacts)
- In Codex, only claim an image was captured if the file exists on disk; prefer the bundled Playwright scripts over browser-read-only tool flows when persistent PNGs are required

## Analysis rules

The analysis must be grounded in collected evidence only.

Always distinguish:
- Directly observed evidence
- Reasonable inference (clearly labeled)
- Missing or uncertain evidence

Do not invent:
- Hidden features or settings
- Capabilities not visible in public sources
- Unsupported conclusions

## Research modes

### Public research mode (default)

This is the default. Use only public sources. Do not ask for credentials.

### Authenticated research mode (optional)

Use only when ALL of the following are true:
- The user explicitly requests authenticated research
- Public evidence is insufficient for the research question
- The user has credentials and wants to provide them
- The login path is realistic and worth the effort

When using authenticated mode:
- Never fabricate credentials
- Never attempt account takeover
- Stop on CAPTCHAs, OTP, SMS verification, email verification
- Stop on payment steps, legal agreements, or destructive actions
- Add authenticated evidence to the same markdown report structure

The deliverable format is the same in both modes.

## Safety boundaries

This skill must never:
- Ask for credentials at the start of a research session
- Treat login as the default research method
- Bypass CAPTCHA, OTP, SMS, or email verification barriers
- Execute destructive actions
- Send money or complete payments
- Sign legal agreements
- Change production data
- Create accounts without explicit user approval
- Present inference as observed fact

## Output contract

Every run must produce:
- A research-specific run directory, e.g. `runs/<research-slug>/<run-id>/`
- A markdown report at `runs/<research-slug>/<run-id>/output/research.md`
- Screenshot evidence at `runs/<research-slug>/<run-id>/output/assets/`
- Clear separation of observed facts, inferences, and unknowns
- Source attribution for every finding
- Confidence levels for every finding
