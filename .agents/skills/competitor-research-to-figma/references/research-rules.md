# Research Rules

## Default approach

Public evidence first. Do not ask for credentials or treat login as the starting point.

## Evidence standard

All conclusions must be grounded in:
- Captured screenshots from public sources
- Source URLs with context notes
- Visible page content (headings, text, navigation structure)

Anything beyond direct evidence must be labeled as inference.

## Source types

Gather evidence from these public sources (in priority order for most research questions):

1. Company websites — homepage, navigation, footer structure
2. Feature pages — capability descriptions, screenshots, demos
3. Pricing pages — tiers, positioning, trade-offs
4. Help centers and support docs — real product documentation
5. Changelogs and release notes — velocity, priorities, recent changes
6. App store pages — screenshots, ratings, reviews
7. YouTube demos — walkthrough videos, product tours
8. Use-case and solution pages — positioning, target audience
9. FAQs
10. Blog posts (when directly relevant to the research question)
11. User reviews and forums — real user experience
12. Product directories and comparison pages

## Discovery rules

- Find 5–10 relevant competitors per research question.
- Avoid selecting the user's own company when `company_name` is provided.
- Prefer competitors with mature, publicly documented products.
- Record why each competitor was included and at what confidence level.

## Evidence capture rules

- Full-page screenshots for homepage, pricing, and key feature pages.
- Focused screenshots for specific UI patterns, sections, or evidence points.
- Crops where necessary to highlight a specific pattern.
- Consistent naming: `{competitor}-{source}-{topic}.png`.
- Every image must have a source URL and context note.
- Save all images to `output/assets/`.

## Analysis rules

- Separate observed behavior from inference.
- Call out uncertainty explicitly.
- Do not infer hidden features from marketing copy alone.
- Do not claim parity across competitors unless the evidence is comparable.
- Record confidence levels: High / Medium / Low.

## Evidence model

Every finding must include:
- **Observed** — what was directly seen
- **Inferred** — what was concluded from evidence (clearly labeled)
- **Unknown** — what could not be determined
- **Confidence** — High / Medium / Low

## Authenticated research (optional fallback)

Only use when:
- The user explicitly requests it
- Public evidence is insufficient
- Credentials are available and realistic

When using authenticated mode:
- Follow the same evidence model and output format
- Never fabricate credentials
- Stop on verification barriers, payment steps, or destructive actions

## Safety rules

Never attempt:
- CAPTCHA bypass
- OTP bypass
- SMS bypass
- Email verification bypass
- Credential fabrication
- Account takeover
- Destructive product actions
- Payments or money movement
- Legal agreement acceptance

## Output rules

- Write `output/research.md` as the primary deliverable.
- Save screenshots to `output/assets/`.
- Use the finding template and unknown template from SKILL.md.
- Optionally write `output/sources.md` as a standalone source index.
