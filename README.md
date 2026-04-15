# competitor-research

A skill for Codex, Claude Code, and Antigravity that researches how competitors implement a feature using public evidence — websites, pricing pages, help centers, changelogs, app store listings, videos, reviews, and forums — and produces a structured markdown dossier with screenshots, links, and sourced findings.

You describe the feature you want to benchmark. The skill finds competitors, collects evidence from public sources, captures screenshots, and synthesizes everything into a markdown report your team can review immediately.

---

## Why public evidence first

Login-based competitor research sounds thorough, but in practice it is brittle:

- Competitors change login flows, add CAPTCHAs, require phone verification, or flag unfamiliar accounts.
- Maintaining research accounts across dozens of products is expensive and unreliable.
- Authenticated flows only show what one account tier can see — not the full picture.
- The research breaks the moment a credential expires.

Meanwhile, public sources are rich, stable, and underappreciated:

- **Websites** show positioning, messaging, and navigation structure.
- **Feature and pricing pages** reveal capabilities, tiers, and trade-offs.
- **Help centers** document the real product — including edge cases marketing pages skip.
- **Changelogs** show velocity, priorities, and recent investments.
- **App store pages** show screenshots of actual UI, ratings, and user complaints.
- **YouTube demos** walk through real flows step by step.
- **Reviews and forums** surface what users actually experience.

A well-executed public-source audit often produces more actionable insight than a login-based capture of one flow in one account tier.

---

## What it does

```
You describe the feature
you want to benchmark
          |
          v
+-----------------------------+
|  Define research question   |
|  and scope                  |
+-----------------------------+
          |
          v
+-----------------------------+
|  Identify competitors       |
|  5–10 relevant products     |
+-----------------------------+
          |
          v
+-----------------------------+
|  Build source map           |
|  For each competitor, map   |
|  public sources to visit    |
+-----------------------------+
          |
          v
+-----------------------------+
|  Collect evidence           |
|  Visit sources, capture     |
|  screenshots, record links  |
+-----------------------------+
          |
          v
+-----------------------------+
|  Analyze and synthesize     |
|  Reconstruct flows and      |
|  patterns from evidence     |
+-----------------------------+
          |
          v
+-----------------------------+
|  Produce markdown report    |
|  research.md + assets/      |
|  with sourced findings      |
+-----------------------------+
```

---

## Output

The skill produces a markdown report with linked evidence:

```
output/
  assets/
    competitor-a-homepage-full.png
    competitor-a-pricing.png
    competitor-a-help-checkout.png
    competitor-b-appstore-01.png
    competitor-b-youtube-flow-step-03.png
  research.md
  sources.md          (optional — full source index)
```

The markdown report includes:

- Research goal and scope
- Competitors covered
- Methodology
- Per-competitor summaries with source-backed evidence
- Feature or pattern comparison
- Reconstructed flows from public evidence
- Key findings (with observation, inference, and confidence levels)
- Unknowns and gaps
- Design implications
- Source index

No Figma export is required. The output is self-contained markdown that works in any review workflow.

---

## Research modes

### Public research mode (default)

Uses only public sources. No credentials needed. This is the default and recommended mode.

### Authenticated research mode (optional)

Used only when:
- The user explicitly requests it
- Public evidence is insufficient for the research question
- The user has access credentials and wants to provide them
- The login path is realistic and worth the effort

The deliverable format is the same in both modes. Authenticated research adds logged-in evidence to the same markdown structure.

---

## Evidence model

Every finding distinguishes between:

| Label | Meaning |
|---|---|
| **Observed** | Directly seen in a source — screenshot, page content, video frame |
| **Inferred** | A conclusion drawn from observed evidence, clearly marked |
| **Unknown** | Something that could not be determined from available sources |
| **Confidence** | High, Medium, or Low — how much evidence supports the finding |

This is part of the output contract. The skill never presents inference as fact.

---

## Sources the skill uses

The skill gathers evidence from:

- Company websites — homepage, navigation, footer
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

---

## Before you start

You will need:
- **Codex**, **Claude Code**, or **Antigravity** installed
- A clear feature or workflow you want to benchmark

That's it. No Figma file, no competitor accounts, no API keys required for the default public research mode.

---

## Install

### For Codex

```bash
python3 ~/.codex/skills/.system/skill-installer/scripts/install-skill-from-github.py \
  --repo pedrocarlop/competitor-research \
  --path .agents/skills/competitor-research
```

Then close and reopen Codex.

### For Claude Code

```bash
git clone https://github.com/pedrocarlop/competitor-research.git /tmp/competitor-research && \
bash /tmp/competitor-research/scripts/install-skill-claude.sh && \
rm -rf /tmp/competitor-research
```

Then restart Claude Code.

### For Antigravity

```bash
git clone https://github.com/pedrocarlop/competitor-research.git /tmp/competitor-research && \
bash /tmp/competitor-research/scripts/install-skill-antigravity.sh && \
rm -rf /tmp/competitor-research
```

Then restart Antigravity.

---

## Update (uninstall and reinstall)

### Update in Codex

```bash
rm -rf ~/.codex/skills/competitor-research && \
python3 ~/.codex/skills/.system/skill-installer/scripts/install-skill-from-github.py \
  --repo pedrocarlop/competitor-research \
  --path .agents/skills/competitor-research
```

### Update in Claude Code

```bash
rm -f ~/.claude/commands/competitor-research.md && \
git clone https://github.com/pedrocarlop/competitor-research.git /tmp/competitor-research && \
bash /tmp/competitor-research/scripts/install-skill-claude.sh && \
rm -rf /tmp/competitor-research
```

### Update in Antigravity

```bash
rm -rf ~/.antigravity/skills/competitor-research && \
git clone https://github.com/pedrocarlop/competitor-research.git /tmp/competitor-research && \
bash /tmp/competitor-research/scripts/install-skill-antigravity.sh && \
rm -rf /tmp/competitor-research
```

---

## How to use it

Send a message like:

```
Please run competitor-research.

research_question:
How do competitors handle payment link creation, management, and sharing?

company_name:
Northstar Commerce
```

Or more targeted:

```
Please run competitor-research.

research_question:
Compare onboarding flows for developer-facing API products.

competitors:
["Stripe", "Twilio", "Algolia"]
```

See more examples in the [example prompts](/.agents/skills/competitor-research/examples/invocation.example.md).

---

## Example prompts

**Broad competitive audit:**
> Research how top project management tools handle recurring task automation. Focus on Asana, Monday.com, ClickUp, and Notion.

**Pricing and positioning comparison:**
> Compare pricing page structure and tier naming across Figma, Sketch, and Framer. Capture screenshots of each pricing page and note how they frame their free tier.

**Feature-specific deep dive:**
> How do Stripe, Square, and PayPal present payment link creation to merchants? Gather evidence from their feature pages, help centers, and any public demos.

**Help center and documentation audit:**
> Compare how Intercom, Zendesk, and Freshdesk document their chatbot setup process. Focus on help center articles and any public video walkthroughs.

**App store and review analysis:**
> Analyze the app store presence of Notion, Coda, and Airtable. Capture store screenshots, recent reviews, and ratings across iOS and Android.

---

## Finding template

Each finding in the report follows this structure:

```markdown
### Finding 01

**Pattern**
[short description]

**Observed**
[what was directly seen in the source material]

**Evidence**
- Screenshot: assets/competitor-a-pricing-tier-comparison.png
- Source: [Competitor A — Pricing](https://example.com/pricing)
- Source: [Competitor A — Help: Plans overview](https://example.com/help/plans)

**Inference**
[what this likely means, clearly marked as inference]

**Confidence**
High / Medium / Low

**Why it matters**
[why this is relevant to the product or design question]
```

---

## Unknown template

```markdown
### Unknown 01

**Question**
[what remains unclear]

**Why unresolved**
[why public evidence was not enough]

**Missing evidence**
[what could not be found]

**Next validation step**
[how this could be validated later — user interview, sales call, authenticated access, etc.]
```

---

## Credential handling

The skill does **not** ask for credentials at the start.

Credentials are only relevant when:
- The user explicitly requests authenticated research
- Public evidence is genuinely insufficient
- Access is realistic and worth the effort

If authenticated research is requested, the skill follows the same safety rules: never fabricate credentials, stop on CAPTCHAs or verification barriers, and never perform destructive actions.
