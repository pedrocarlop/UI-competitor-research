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

3-5 key takeaways a product owner or designer should know immediately. This is the "if you only read one section" summary. Focus on:
- The most important patterns across competitors
- The biggest opportunity or gap
- The most surprising finding
- What the user should prioritize in their own product

### 2. Market landscape

Industry context gathered before competitor-level research:
- Market size and growth (if available from public sources)
- Key market segments (SMB vs enterprise, vertical-specific, geographic)
- Recent funding, acquisitions, or major product launches
- Notable industry trends (3-5 trends shaping the space)
- Regulatory or compliance considerations
- Source attribution for all claims

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

#### Pricing model
Summary of pricing relevant to this feature:
- Model type (usage-based, seat-based, flat-rate, freemium, custom)
- Tier breakdown if publicly available
- Where this feature sits in the pricing tiers

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

### 8. Pricing comparison

Cross-competitor pricing analysis:

| Competitor | Model | Free tier | Starting price | Enterprise | Currency |
|---|---|---|---|---|---|
| ... | ... | Yes/No | ... | Yes/No/Contact | ... |

Analysis of pricing strategies, positioning, and notable approaches.

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

### 13. Source index

Complete list of all sources consulted, organized by competitor.

## Source index format (sources.md, optional)

```markdown
## Competitor A

| Source | URL | Type | Notes |
|---|---|---|---|
| Homepage | https://... | Website | Full-page screenshot captured |
| Pricing | https://... | Pricing page | Three tiers documented |
| Help: Setup guide | https://... | Help center | Step-by-step flow documented |
| G2 Reviews | https://... | Review platform | 4.5/5, 200+ reviews |
```

## Evidence model

Every finding must distinguish:

| Label | Meaning |
|---|---|
| **Observed** | Directly seen in source material |
| **Inferred** | Conclusion drawn from evidence, clearly labeled |
| **Unknown** | Could not be determined from available sources |
| **Confidence** | High / Medium / Low |
