# Research Rules

## Default approach

Public evidence first. Do not ask for credentials or treat login as the starting point.

## Context isolation rules

- Start each new research run from the user's current request, current public sources, and explicit inputs for that run.
- Do not read, search, summarize, or use older `runs/<research-slug>/<run-id>/` outputs when starting a new research run.
- Previous run artifacts may influence a current run only when the user explicitly asks to resume, audit, compare, or import that specific run, or when `resume_from_run_path` or `evidence_import_path` points to it.
- Keep all writes inside the active run directory and its `output/assets/` folder.

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
13. Case studies and customer success stories — named customer examples with measurable outcomes
14. Developer community discussions — Stack Overflow, GitHub Issues/Discussions, Hacker News, developer blogs
15. News articles and press coverage — product launches, partnerships, notable deployments

## Discovery rules

- Find 5-10 relevant competitors per research question.
- Use web search dynamically — do not rely solely on a hardcoded catalog.
- Search for "[topic] competitors", "best [category] tools [year]", "alternatives to [known product]".
- Search G2, Capterra, and TrustRadius category pages.
- Avoid selecting the user's own company when `company_name` is provided.
- Prefer competitors with mature, publicly documented products.
- Record why each competitor was included and at what confidence level.

## Evidence capture rules

- Public evidence capture is the default. Capture public sources for every included competitor before attempting authenticated capture.
- Missing credentials must not exclude a competitor from public research.
- Write and use a source map before capture. Record homepage, feature page, pricing, help/docs, changelog, app store, video, review/forum, case study, and news candidates when available.
- Full-page screenshots for homepage, pricing, and key feature pages.
- Focused screenshots for specific UI patterns, sections, or evidence points.
- Crops where necessary to highlight a specific pattern.
- Consistent naming: `{competitor}-{source}-{topic}.png`.
- Every image must have a source URL and context note.
- Save all images to the active run directory's `output/assets/`.
- Normalize evidence records with observed fact, inference, unknown, confidence, source URL, observed date, and screenshot path when available.

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

## Feature matrix rules

- Only claim a subfeature is "supported" if there is direct evidence (feature page, help doc, changelog, screenshot).
- Mark as "partial" if the evidence suggests limited or conditional support.
- Mark as "not supported" only if the absence is confirmable (e.g., the help center covers the parent feature but never mentions this subfeature, or a comparison page explicitly excludes it).
- Mark as "unknown" when there is insufficient evidence either way.
- Do not infer feature support solely from marketing copy — help center articles and changelogs are more reliable.
- Identify table-stakes (supported by most) vs. differentiators (supported by few).

## Pricing analysis rules

- Always capture the pricing page URL as evidence.
- Note whether pricing is publicly available or gated behind a sales call.
- Record the currency used on the pricing page.
- Note when the pricing was last observed (date of research).
- Distinguish list price from promotional or discounted pricing.
- Record billing frequency (monthly, annual, or both).
- If pricing requires contacting sales, record this as an unknown with the URL.
- Classify the model: usage-based, seat-based, flat-rate, freemium, custom, hybrid.

## Customer sentiment rules

- Distinguish direct user quotes from paraphrases. Mark quotes with quotation marks and attribute the source.
- Always record the source URL and platform name (G2, Reddit, App Store, etc.).
- Note the date of the review or post when available.
- Note the sample size (e.g., "based on 150 G2 reviews" or "3 Reddit threads").
- Do not conflate reviews of different product versions or different products by the same company.
- Separate verified user reviews (G2, App Store) from anonymous forum posts in terms of confidence.
- Look for recurring themes, not just individual complaints.
- Record both positive and negative sentiment — avoid selection bias.

## Citation rules

- Every factual claim in the report must have an inline citation using numbered footnotes `[N]`.
- Citations must appear inline next to the claim, not clustered at the end of a section.
- Feature matrix cells should include a footnote number when the support status is based on a specific source. Example: `Supported [12]` or `Partial — max 20 items [14]`.
- Pricing figures must cite the source page and access date.
- When the same source supports multiple claims, reuse the same footnote number.
- The footnote index at the end of the report must list every footnote number with full URL, source title, and access date.
- Format: `[N]` in the body, then `N. Source title, accessed on YYYY-MM-DD. URL` in the index.

## Regional and regulatory research rules

When `locale` is provided, or when the research question references a specific region or country:

- Search for "[locale] [product category] regulations [year]" and "[locale] [product category] compliance requirements"
- Search for "[locale] [feature domain] adoption statistics" or "[locale] dominant [product category] platforms" to understand the local competitive landscape
- Identify if any competitor has locale-specific product pages, documentation, or pricing
- Note which competitors are available in the target locale vs. not
- Cite the specific regulation name, effective date, and government source where possible
- Note how each competitor handles local compliance requirements (tax, data residency, industry mandates) if relevant to the domain
- Search for dominant local platforms or services in the feature domain and their market share (e.g., for payments: local A2A methods; for messaging: local apps; for cloud storage: local providers)
- Search for news about upcoming regulatory changes in the locale that affect the domain

## Market context rules

- Cite the source for every market claim (article, report, press release).
- Note publication dates — market data older than 2 years should be flagged.
- Distinguish facts (company X raised $Y) from projections (market expected to reach $X by 2030).
- Focus on context relevant to the research question, not general industry overviews.
- Note geographic scope of market data when applicable.

## Authenticated research (optional fallback)

Only use when:
- The user explicitly requests it
- Public evidence is insufficient
- The user provides credentials for the specific competitor being investigated
- The login path is realistic and worth the effort

When using authenticated mode:
- Follow the same evidence model and output format
- Never fabricate credentials
- Use credentials only for the matching competitor, never as a general credential pool
- Do not persist real passwords in run artifacts; redact credential payloads written to disk and prefer environment variables for secrets
- Mask email/password inputs in screenshots captured during login
- Fill only ordinary login fields and submit at most two automated attempts before manual handoff
- If 2FA, OTP, SMS/email verification, CAPTCHA, bot checks, suspicious-login prompts, or identity verification appear, tell the user what happened and hand over a visible browser session
- Resume capture only after the user completes the challenge and confirms continuation
- If the challenge cannot be completed, record a manual-intervention checkpoint with the URL and reason, then continue with public evidence
- Stop on payment steps, legal agreements, or destructive actions

## Safety rules

Never attempt:
- CAPTCHA bypass
- OTP bypass
- SMS bypass
- Email verification bypass
- Account-verification completion on behalf of the user
- Credential fabrication
- Account takeover
- Destructive product actions
- Payments or money movement
- Legal agreement acceptance

## Output rules

- Write `<run_directory>/output/research.md` as the primary deliverable.
- Write `<run_directory>/source-map.json` before capture.
- Save screenshots to `<run_directory>/output/assets/`.
- Use the finding template, unknown template, pricing template, and sentiment template from SKILL.md.
- Optionally write `<run_directory>/output/sources.md` as a standalone source index.
