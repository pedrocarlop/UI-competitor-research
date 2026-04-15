---
name: competitor-research
description: Researches competitor implementations of a target feature using public evidence — websites, pricing pages, help centers, changelogs, app stores, videos, reviews — and produces a structured markdown dossier with screenshots, links, and sourced findings.
tags:
  - research
  - competitor-analysis
  - benchmarking
  - public-evidence
---

# competitor-research

Use this skill when a user wants an evidence-backed benchmark of how competitors implement a feature, pattern, or workflow. The default output is a structured markdown report with screenshots and sourced findings.

## Trigger conditions

Trigger this skill when the user asks to:
- benchmark competitor implementations of a feature
- compare UX patterns, pricing, positioning, or workflows across competitors
- audit how competitors document, market, or present a capability
- gather public evidence about competitor products
- produce a competitive research dossier

## Required inputs

The skill must not run without:
- `research_question` — a clear description of what to benchmark

If the research question is missing, ask for it first. Do not proceed without it.

## Optional inputs

- `company_name` — the user's company, to exclude from competitor lists
- `competitors` — explicit list of competitors to include
- `scope` — specific sources or areas to focus on (e.g., "pricing pages only", "help center articles")
- `output_path` — where to write the report (defaults to `./output/`)

## Ordered procedure

### 1. Define the research question and scope

Confirm the research question with the user. Clarify:
- What feature, workflow, or capability to benchmark
- Whether specific competitors are already known or should be discovered
- Whether the scope is broad (full audit) or narrow (specific sources only)

### 2. Identify competitors

Find 5–10 relevant competitors using web search and the user's input. For each competitor, record:
- Company name
- Product URL
- Why it is relevant to the research question
- Confidence level (high / medium / low)

If the user provides a `competitors` list, use it directly and skip discovery.

### 3. Build a source map

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

### 4. Collect evidence

For each competitor, visit the mapped sources and:
- Capture full-page screenshots for homepage, pricing, and key feature pages
- Capture focused screenshots for specific UI patterns, sections, or evidence points
- Crop where necessary to highlight a specific pattern
- Record the source URL and a short context note for each screenshot
- Use consistent naming: `{competitor}-{source}-{topic}.png`
  - Examples: `stripe-pricing-tier-comparison.png`, `square-helpcenter-payment-links.png`
- Save screenshots to `output/assets/`

### 5. Analyze and synthesize

Review the collected evidence and:
- Reconstruct flows, patterns, and positioning from the evidence
- Identify recurring patterns across competitors
- Note strengths, friction points, and differentiators
- Compare feature coverage, messaging, and documentation quality

For every finding, clearly distinguish:
- **Observed** — directly seen in the source material
- **Inferred** — a conclusion drawn from observed evidence
- **Unknown** — something that could not be determined
- **Confidence** — High / Medium / Low

### 6. Record unknowns

For anything that could not be determined from public evidence:
- State the question clearly
- Explain why it remains unresolved
- Note what evidence is missing
- Suggest a next validation step (user interview, authenticated access, sales call, etc.)

### 7. Produce the markdown report

Write `output/research.md` with these sections:
- Research goal
- Scope and competitors covered
- Methodology
- Per-competitor summaries with source-backed evidence
- Feature or pattern comparison
- Reconstructed flows from public evidence
- Key findings (using the finding template)
- Unknowns and gaps (using the unknown template)
- Design implications
- Source index

Optionally write `output/sources.md` as a standalone source index.

### 8. Save outputs

Write all files to the output directory:
```
output/
  assets/
    {competitor}-{source}-{topic}.png
    ...
  research.md
  sources.md   (optional)
```

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
[how this could be validated later]
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
