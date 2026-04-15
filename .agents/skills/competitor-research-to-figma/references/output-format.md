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

The markdown report should include these sections:

### 1. Research goal
What was being investigated and why.

### 2. Scope and competitors covered
Which competitors were included, why, and at what confidence level.

### 3. Methodology
How evidence was gathered — which source types were used, what tools were involved.

### 4. Competitor summaries
Per-competitor section with:
- Overview of what was found
- Key screenshots with source links
- Notable patterns, strengths, and friction points

### 5. Feature or pattern comparison
Side-by-side comparison of capabilities, approaches, or patterns across competitors.

### 6. Reconstructed flows
Flows reconstructed from public evidence — feature pages, help center steps, video walkthroughs, app store screenshots.

### 7. Key findings
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

### 8. Unknowns and gaps
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
[how to validate later]
```

### 9. Design implications
What the findings mean for the user's product or design decisions.

### 10. Source index
Complete list of all sources consulted, organized by competitor.

## Source index format (sources.md, optional)

```markdown
## Competitor A

| Source | URL | Type | Notes |
|---|---|---|---|
| Homepage | https://... | Website | Full-page screenshot captured |
| Pricing | https://... | Pricing page | Three tiers documented |
| Help: Setup guide | https://... | Help center | Step-by-step flow documented |
```

## Evidence model

Every finding must distinguish:

| Label | Meaning |
|---|---|
| **Observed** | Directly seen in source material |
| **Inferred** | Conclusion drawn from evidence, clearly labeled |
| **Unknown** | Could not be determined from available sources |
| **Confidence** | High / Medium / Low |
