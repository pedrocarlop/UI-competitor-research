# Output Format

This document defines the output structure produced by the competitor-research skill.

## Directory structure

```
output/
  assets/
    {competitor}-{source}-{topic}.png
    ...
  research.md
  sources.md   (optional)
```

## Screenshot naming

Use consistent naming: `{competitor}-{source}-{topic}.png`

- `competitor` — lowercase competitor name (e.g., `stripe`, `square`)
- `source` — where the screenshot came from (e.g., `homepage`, `pricing`, `helpcenter`, `appstore`, `youtube`)
- `topic` — what the screenshot shows (e.g., `tier-comparison`, `payment-links`, `onboarding-step-03`)

Examples:
- `stripe-pricing-tier-comparison.png`
- `square-helpcenter-payment-links.png`
- `asana-appstore-ios-01.png`
- `notion-youtube-templates-walkthrough-step-03.png`

## Report structure (research.md)

The markdown report must include these sections:

### 1. Executive summary

Start with a strategic thesis — 1-2 sentences that capture the fundamental competitive dynamic (e.g., "These two products embody fundamentally different philosophies: one is programmable payment infrastructure, the other is an omnichannel POS extension"). Follow with 3-5 key insights that support, nuance, or qualify the thesis. Write in narrative prose with inline citations `[N]`, not as a bullet list.

This is the "if you only read one section" summary. A decision-maker should be able to act on this section alone. Focus on:
- The core philosophical or strategic split between competitors
- The biggest opportunity or gap
- The most surprising or non-obvious finding
- What the reader should prioritize based on the evidence

### 2. Market landscape

Industry context gathered before competitor-level research:
- Market size and growth (if available from public sources)
- Key market segments (SMB vs enterprise, vertical-specific, geographic)
- Recent funding, acquisitions, or major product launches
- Notable industry trends (3-5 trends shaping the space)
- Regulatory or compliance considerations
- Source attribution for all claims (inline footnotes `[N]`)

### 2b. Regional analysis (when applicable)

Appears when `locale` is specified or when regional dynamics are material to the research question. This section provides locale-specific depth that the general market landscape cannot cover.

Include:
- **Market overview** — brief narrative on the local market dynamics for this feature domain
- **Dominant local platforms or services** — which local alternatives or incumbents dominate the market in this locale, with market share data where available (e.g., for payments: "Bizum represents 95% of instant transfers in Spain"; for social: "LINE has 90% penetration in Japan"; for e-commerce: "Mercado Libre leads in Brazil")
- **Regulatory mandates** — specific laws, decrees, or compliance requirements affecting the domain in this jurisdiction. Include regulation name, effective date, and government source.
- **Competitor availability and localization** — which competitors are available in the locale, how well-localized their products are, and any locale-specific pricing or feature differences
- **Locale-specific pricing analysis** — pricing structures that differ from global defaults, including any region-specific tiers, surcharges, or cost factors relevant to the domain
- **Compliance handling** — how competitors handle local compliance requirements (e.g., tax, data residency, industry-specific regulations) if relevant to the feature domain

### 3. Research goal and scope

What was being investigated and why. Include the original research question verbatim.

### 4. Competitors covered

Which competitors were included, why, and at what confidence level. Use a table:

| Competitor | Product URL | Why included | Confidence |
|---|---|---|---|
| ... | ... | ... | High / Medium / Low |

### 5. Methodology

How evidence was gathered — which source types were used, what tools were involved, what was accessible vs. gated.

### 6. Feature matrix

Subfeature comparison table across all competitors:

| Subfeature | Competitor A | Competitor B | Competitor C | ... |
|---|---|---|---|---|
| [subfeature name] | Supported | Partial | Not supported | ... |
| ... | ... | ... | ... | ... |

Each cell should include constraints, limits, and a footnote reference to the confirming source. Go beyond simple Yes/No — capture nuance. Example: instead of `Partial`, write `Partial — max 20 items, no cross-sells [14]`.

Below the table:
- **Table stakes** — subfeatures supported by most or all competitors
- **Differentiators** — subfeatures supported by few competitors
- **Best implementations** — which competitor does each subfeature best and why

### 7. Per-competitor deep dives

For each competitor, a dedicated section with:

#### Overview and positioning
How the competitor positions this feature. Target audience. Key messaging.

#### Key screenshots with source links
Embedded screenshot references with source URLs and context notes.

#### Task flows and user journeys
Reconstructed flows from help center guides, video walkthroughs, app store screenshots, or direct observation. Step-by-step with screenshots where available.

#### Case studies (if available)
Named customer examples showing real-world use of the competitor's feature. For each case study, include the customer name, what they used the feature for, and any measurable outcome (e.g., conversion lift, time savings, adoption metrics). Cite the source.

#### Pricing model
Summary of pricing relevant to this feature:
- Model type (usage-based, seat-based, flat-rate, freemium, custom)
- Tier breakdown if publicly available
- Where this feature sits in the pricing tiers
- Per-usage or per-dimension breakdowns when applicable to the domain (e.g., for payments: per-method rates; for APIs: per-call tiers; for SaaS: per-seat or usage limits)
- Operational or penalty fees beyond the headline rate (e.g., dispute fees, overage fees, export fees)
- Add-on costs that unlock key capabilities (e.g., advanced branding, custom domains, premium integrations)

#### Strengths (with evidence)
What this competitor does well, backed by specific evidence:
- Screenshot references
- Source URLs
- User review quotes

#### Weaknesses (with evidence)
Where this competitor falls short, backed by specific evidence.

#### Customer sentiment summary
- Overall sentiment direction (positive / negative / mixed)
- Top praised aspects
- Top criticized aspects
- Notable user quotes with source attribution

Per-competitor deep dives provide the evidence base. The thematic analysis sections (section 10b) synthesize this evidence into comparative insights. Both are required.

### 8. Pricing comparison

Cross-competitor pricing analysis with two tables:

**Headline pricing table:**

| Competitor | Model | Free tier | Starting price | Enterprise | Currency |
|---|---|---|---|---|---|
| ... | ... | Yes/No | ... | Yes/No/Contact | ... |

**Per-dimension breakdown table (when applicable):**

When the domain has meaningful per-usage, per-transaction, or per-dimension pricing, include a second table with those breakdowns. The dimensions depend on the feature domain — adapt the rows to what is relevant:

| Cost dimension | Competitor A | Competitor B | ... |
|---|---|---|---|
| [Primary usage dimension] | ... | ... | ... |
| [Secondary dimension] | ... | ... | ... |
| [Penalty / operational fee] | ... | ... | ... |
| [Add-on cost for key capability] | ... | ... | ... |

For example, for payment products: rows might be "Online card rate", "ACH rate", "Dispute fee", "Custom domain fee". For SaaS analytics tools: rows might be "Events per month (Starter)", "Events per month (Pro)", "Data retention", "Export fee". For APIs: rows might be "Per-call rate (paid tier)", "Rate limit (free tier)", "Overage cost", "Premium endpoint fee".

Follow the tables with 1-2 paragraphs of narrative analysis on pricing strategy differences — not just what the numbers are, but what they mean strategically (e.g., layered add-on fees vs. bundled flat-rate, "Indie Tax" dynamics, when the cheaper headline rate becomes more expensive at scale).

### 9. Customer sentiment analysis

Cross-competitor sentiment themes:
- Recurring praise themes across competitors (with quotes)
- Recurring complaint themes across competitors (with quotes)
- Feature requests that appear across multiple products
- Satisfaction differences between competitors

### 10. Cross-competitor patterns and findings

Using the finding template:

```markdown
### Finding NN

**Pattern**
[short description]

**Observed**
[what was directly seen]

**Evidence**
- Screenshot: assets/{filename}.png
- Source: [Title](url)

**Inference**
[what this likely means]

**Confidence**
High / Medium / Low

**Why it matters**
[relevance to the research question]
```

### 10b. Thematic analysis

3-5 thematic deep dives organized by analytical theme, not by competitor. Each theme compares all competitors side by side in 2-4 paragraphs of narrative prose with inline citations. This section is the heart of the strategic analysis — it synthesizes the evidence collected in the per-competitor deep dives into comparative insights that a decision-maker can act on.

Use the thematic deep dive template:

```markdown
### Theme: [Theme Title]

[2-4 paragraphs of comparative analysis across all competitors, with inline footnote citations `[N]`. Write like an analyst brief — build an argument, cite evidence, draw conclusions. Compare how each competitor's approach to this theme reflects their broader philosophy.]

**Key insight:** [1-2 sentence takeaway that a decision-maker can act on]

**Evidence:**
- [Source title](url) — [what it shows]
- [Source title](url) — [what it shows]
```

Example themes (choose based on what the research actually reveals):
- Architecture and deployment philosophy
- Cart dynamics and itemization logic
- Customization, branding, and consumer psychology
- Pricing economics and fee layering
- Regional and regulatory positioning

### 11. Opportunities and recommendations

Actionable insights for the product owner or designer:
- Gaps in the market that no competitor addresses well
- Customer pain points that represent opportunities
- Best practices to adopt from competitor strengths
- Anti-patterns to avoid based on competitor weaknesses
- Differentiation opportunities based on the feature matrix

### 12. Unknowns and gaps

Using the unknown template:

```markdown
### Unknown NN

**Question**
[what remains unclear]

**Why unresolved**
[why public evidence was not enough]

**Missing evidence**
[what could not be found]

**Next validation step**
[how to validate later — user interview, trial signup, sales call, etc.]
```

### 13. Source index (footnote index)

Numbered footnote index matching the inline `[N]` citations used throughout the report. Each entry includes:

```markdown
1. [Source title], accessed on [date]. [full URL]
2. [Source title], accessed on [date]. [full URL]
...
```

This replaces a per-competitor source table. Every `[N]` footnote in the report must have a corresponding entry here. When the same source supports multiple claims, reuse the same footnote number.

## Source index format (sources.md, optional)

When producing a standalone `sources.md`, use the numbered footnote format matching the main report:

```markdown
# Sources

1. [Source title], accessed on [date]. [full URL]
2. [Source title], accessed on [date]. [full URL]
...
```

Alternatively, for richer standalone source files, organize by competitor with a table:

```markdown
## Competitor A

| # | Source | URL | Type | Notes |
|---|---|---|---|---|
| 1 | Homepage | https://... | Website | Full-page screenshot captured |
| 3 | Pricing | https://... | Pricing page | Three tiers documented |
| 7 | Help: Setup guide | https://... | Help center | Step-by-step flow documented |
| 12 | G2 Reviews | https://... | Review platform | 4.5/5, 200+ reviews |
```

The `#` column corresponds to the footnote numbers used in the main report.

## Evidence model

Every finding must distinguish:

| Label | Meaning |
|---|---|
| **Observed** | Directly seen in source material |
| **Inferred** | Conclusion drawn from evidence, clearly labeled |
| **Unknown** | Could not be determined from available sources |
| **Confidence** | High / Medium / Low |
