# competitor-research

A competitive intelligence skill for Codex, Claude Code, and Antigravity. Describe a feature domain and the skill produces a comprehensive research dossier — competitor profiles, subfeature matrices, pricing comparisons, customer sentiment analysis, task flows with screenshots, and actionable recommendations.

You say "I want to become an expert on payment links" and the skill delivers a full report covering the competitive landscape: who the players are, what they offer, how they price it, what customers love and hate, and where the opportunities are.

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
you want to understand
          |
          v
+-----------------------------+
|  1. Define research question|
+-----------------------------+
          |
          v
+-----------------------------+
|  2. Market landscape        |
|  Industry context & trends  |
+-----------------------------+
          |
          v
+-----------------------------+
|  3. Discover competitors    |
|  5-10 via web search        |
+-----------------------------+
          |
          v
+-----------------------------+
|  4. Build source map        |
|  Write source-map.json      |
+-----------------------------+
          |
          v
+-----------------------------+
|  5. Feature matrix          |
|  Subfeature comparison      |
+-----------------------------+
          |
          v
+-----------------------------+
|  6. Collect evidence        |
|  Screenshots & flows        |
+-----------------------------+
          |
          v
+-----------------------------+
|  7. Pricing analysis        |
+-----------------------------+
          |
          v
+-----------------------------+
|  8. Customer sentiment      |
|  Reviews, Reddit, forums    |
+-----------------------------+
          |
          v
+-----------------------------+
|  9. Analyze & synthesize    |
+-----------------------------+
          |
          v
+-----------------------------+
| 10. Produce research.md     |
|  + assets/ + sources.md     |
+-----------------------------+
          |
          v
+-----------------------------+
| 11. Optional: Figma export  |
+-----------------------------+
```

---

## Output

The skill produces a markdown report with linked evidence:

```
runs/
  AGENTS.md
  payment-links/
    AGENTS.md
    2026-04-19T10-30-00Z/
      AGENTS.md
      output/
        assets/
          competitor-a-homepage-full.png
          competitor-a-pricing.png
          competitor-a-help-checkout.png
          competitor-b-appstore-01.png
          competitor-b-youtube-flow-step-03.png
        research.md
        sources.md          (optional — full source index)
      source-map.json       (public source candidates attempted)
```

Each run gets its own research-named directory under `runs/`, so the same project folder can hold multiple research topics without collisions.

The generated `AGENTS.md` files are context-isolation hooks. Agents must not read or use older sibling runs when starting a new research run; historical runs are only read when the user explicitly asks to resume, audit, compare, or import that specific run.

The markdown report includes:

1. **Executive summary** — 3-5 key takeaways
2. **Market landscape** — industry context, segments, trends
3. **Research goal and scope**
4. **Competitors covered** — with confidence levels
5. **Methodology**
6. **Feature matrix** — subfeature comparison table
7. **Per-competitor deep dives** — positioning, screenshots, task flows, pricing, strengths, weaknesses, customer sentiment
8. **Pricing comparison** — cross-competitor pricing analysis
9. **Customer sentiment analysis** — themes, quotes, ratings from reviews and forums
10. **Cross-competitor patterns and findings** — with observation, inference, and confidence levels
11. **Opportunities and recommendations** — actionable insights for the PO/designer
12. **Unknowns and gaps**
13. **Source index**

No Figma export is required. The output is self-contained markdown that works in any review workflow (in Antigravity, the output is rendered directly as a rich, interactive Markdown Artifact alongside captured native WebP browser recordings). Figma export is available as an optional add-on.

Default capture is public-first. A run attempts public feature pages, homepages, pricing pages, help/docs, and other mapped sources for every included competitor. Credentials are additive: competitors without credentials remain in the report with public evidence and explicit unknowns.

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

Authenticated research is assisted, not login-first. Credentials can be supplied for a specific competitor through a credential registry, and the workflow will use them only for that competitor. If 2FA, CAPTCHA, SMS/email verification, suspicious-login checks, or similar barriers appear, the workflow opens or keeps a visible browser, tells the user what happened, waits while the user completes the challenge, then resumes capture after confirmation.

The deliverable format is the same in both modes. Authenticated research adds logged-in evidence to the same markdown structure, and unresolved verification is recorded as a manual-intervention checkpoint rather than silently skipped.

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

## Install or update

Pick your app, paste one command into Terminal, wait for it to finish, then reopen the app. The same command works for both first-time install and future updates.

### Codex

```bash
rm -rf /tmp/ui-competitor-research-install && \
git clone https://github.com/pedrocarlop/UI-competitor-research.git /tmp/ui-competitor-research-install && \
bash /tmp/ui-competitor-research-install/scripts/install-skill-codex.sh && \
rm -rf /tmp/ui-competitor-research-install
```

Then close and reopen Codex.

### Claude Code

```bash
rm -rf /tmp/ui-competitor-research-install && \
git clone https://github.com/pedrocarlop/UI-competitor-research.git /tmp/ui-competitor-research-install && \
bash /tmp/ui-competitor-research-install/scripts/install-skill-claude.sh && \
rm -rf /tmp/ui-competitor-research-install
```

Then close and reopen Claude Code.

### Antigravity

```bash
rm -rf /tmp/ui-competitor-research-install && \
git clone https://github.com/pedrocarlop/UI-competitor-research.git /tmp/ui-competitor-research-install && \
bash /tmp/ui-competitor-research-install/scripts/install-skill-antigravity.sh && \
rm -rf /tmp/ui-competitor-research-install
```

Then close and reopen Antigravity.

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

See more examples in the [example prompts](/.agents/skills/competitor-research-to-figma/examples/invocation.example.md).

---

## Example prompts

**Become a domain expert:**
> I want to become an expert on payment links. How do competitors handle creation, management, sharing, pricing, and what do customers love or hate?

**Broad competitive audit:**
> Research how top project management tools handle recurring task automation. Focus on Asana, Monday.com, ClickUp, and Notion.

**Pricing and positioning comparison:**
> Compare pricing page structure and tier naming across Figma, Sketch, and Framer. Capture screenshots of each pricing page and note how they frame their free tier.

**Feature-specific deep dive:**
> How do Stripe, Square, and PayPal present payment link creation to merchants? Gather evidence from their feature pages, help centers, and any public demos.

**Customer sentiment analysis:**
> What do customers love and hate about project management tools for remote teams? Focus on reviews from G2, Reddit, and app stores for Asana, Monday.com, ClickUp, Linear, and Notion.

**Non-payments domain — analytics:**
> Compare how analytics platforms handle custom event tracking and funnel analysis.

**Help center and documentation audit:**
> Compare how Intercom, Zendesk, and Freshdesk document their chatbot setup process. Focus on help center articles and any public video walkthroughs.

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

If authenticated research is requested, the skill follows the same safety rules: never fabricate credentials, never persist real passwords in run artifacts, never bypass CAPTCHAs or verification barriers, and never perform destructive actions. Login inputs are masked in screenshots. When verification appears, it hands the browser to the user and resumes only after the user completes it.

Credential registry example:

```json
{
  "competitors": [
    {
      "competitor_name": "Stripe",
      "login_url": "https://dashboard.stripe.com/login",
      "email_env": "STRIPE_RESEARCH_EMAIL",
      "password_env": "STRIPE_RESEARCH_PASSWORD",
      "start_url": "https://dashboard.stripe.com/payment-links",
      "navigation_hints": ["payment links"]
    }
  ]
}
```

Run inputs can reference this file with `credential_registry_path` or `credentials_path`. Keep real credential files outside version control.

## Development checks

```bash
npm run typecheck
npm run validate:schemas
npm test
```

The tests cover canonical input normalization, explicit competitor discovery, source-map generation, public capture without credentials, schema drift guards, and report contract sections.
