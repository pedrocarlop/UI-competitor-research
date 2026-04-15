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

Produce a brief "Market Landscape" section for the report.

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
- List every distinct subfeature or capability (e.g., for "payment links": branding customization, expiration dates, partial payments, analytics, webhooks, multi-currency, QR codes)
- Build a feature matrix: rows = subfeatures, columns = competitors
- For each cell: supported / partially supported / not supported / unknown
- Identify table-stakes features (supported by most or all competitors)
- Identify differentiators (supported by few competitors)
- Note which competitor has the best implementation of each subfeature and why

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

### 7. Analyze pricing models

For each competitor with a public pricing page:
- Visit the pricing page and capture a full-page screenshot
- Record: tier names, prices, billing frequency (monthly/annual), currency
- Note feature differences between tiers
- Identify free tier or freemium offering details
- Note enterprise or custom pricing availability
- Classify the pricing model: usage-based, seat-based, flat-rate, freemium, custom, hybrid
- Note any notable pricing strategies (e.g., reverse trial, volume discounts, startup programs)

Produce a pricing comparison table in the report.

If pricing is gated behind a sales call or not publicly available, record this as an unknown with confidence level.

### 8. Gather customer sentiment

For each competitor, search for and collect customer feedback:
- **App store reviews**: Search iOS App Store and Google Play Store pages. Record overall rating, review count, and 3-5 representative reviews (positive and negative).
- **Review platforms**: Search G2, Capterra, TrustRadius for the product. Note overall score, number of reviews, and top praised/criticized aspects.
- **Reddit discussions**: Search Reddit for "[product name] [feature]" threads. Note common complaints, praise, and feature requests.
- **Forum and community mentions**: Search for community discussions, Stack Overflow questions, or product-specific forums.

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

1. **Executive summary** — 3-5 key takeaways a PO or designer should know immediately
2. **Market landscape** — industry context, segments, trends, recent events
3. **Research goal and scope** — what was investigated and why
4. **Competitors covered** — which competitors, why, and at what confidence level
5. **Methodology** — how evidence was gathered, which source types, what tools
6. **Feature matrix** — subfeature comparison table across all competitors
7. **Per-competitor deep dives** — for each competitor:
   - Overview and positioning
   - Key screenshots with source links
   - Task flows and user journeys
   - Pricing model summary
   - Strengths (with evidence)
   - Weaknesses (with evidence)
   - Customer sentiment summary
8. **Pricing comparison** — cross-competitor pricing table and analysis
9. **Customer sentiment analysis** — cross-competitor themes, recurring praise and complaints, notable quotes
10. **Cross-competitor patterns and findings** — using the finding template
11. **Opportunities and recommendations** — actionable insights for the PO/designer based on gaps, weaknesses, and unmet customer needs
12. **Unknowns and gaps** — using the unknown template
13. **Source index** — complete list of all sources consulted, organized by competitor

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
