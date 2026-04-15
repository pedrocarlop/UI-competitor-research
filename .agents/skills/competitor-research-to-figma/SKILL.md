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
- `output_path` — where to write the report (defaults to `./output/`)
- `figma_destination_url` — Figma file URL for optional visual export

## Ordered procedure

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
- Save screenshots to `output/assets/`

Where possible, reconstruct task flows and user journeys from:
- Help center step-by-step guides
- YouTube demo walkthroughs
- App store screenshot sequences
- Feature page descriptions and diagrams

For each competitor, also search for:
- **Case studies and customer stories:** Search `[competitor] case study [feature]`, `[competitor] customer story`, `[competitor] used by [company]`. Record any named customer examples with their use case and measurable outcomes (e.g., "OpenAI used Stripe Payment Links for ChatGPT Plus subscriptions", "MemberPress reported 30% conversion lift after integrating Stripe Link").
- **Developer community discourse:** Search `[competitor] [feature] site:stackoverflow.com`, `[competitor] [feature] site:github.com`, `[competitor] site:news.ycombinator.com`. These provide technical depth and candid assessments that marketing pages and review platforms miss.
- **News and press coverage:** Search for recent articles about product launches, partnerships, or notable deployments related to the feature.

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

### 11. Produce the markdown report

Write `output/research.md` with these sections:

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

Optionally write `output/sources.md` as a standalone source index.

### 12. Optionally export to Figma

Only when `figma_destination_url` is provided:
- Plan the Figma layout with competitor sections and screenshot placements
- Export the visual research board to the Figma file

If no Figma URL is provided, skip this step entirely.

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
- Consistent naming: `{competitor}-{source}-{topic}.png`
- Every image must have a source URL and context note
- Save all images to `output/assets/`

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
- A markdown report at `output/research.md`
- Screenshot evidence at `output/assets/`
- Clear separation of observed facts, inferences, and unknowns
- Source attribution for every finding
- Confidence levels for every finding
