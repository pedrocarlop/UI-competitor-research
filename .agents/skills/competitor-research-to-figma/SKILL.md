---
name: competitor-research-to-figma
description: Researches competitor implementations of a target feature, validates Figma and browser setup, captures login-based evidence step by step, analyzes the observed experience, and exports an HTML-first benchmark board that is captured into Figma.
tags:
  - research
  - competitor-analysis
  - figma
  - browser-automation
  - benchmarking
---

# competitor-research-to-figma

Use this skill when a user wants an evidence-backed benchmark of how competitors implement a feature or workflow and wants the result exported to Figma for review through a reusable HTML research board.

## Trigger conditions

Trigger this skill when the user asks to:
- benchmark competitor implementations of a feature
- inspect product flows behind login walls
- compare screenshots and UX patterns across competitors
- export competitor research into a Figma review board

## Required inputs

The skill must not run without:
- `feature_description`
- `figma_destination_url`

If either mandatory input is missing:
- ask for the missing value first
- do not start setup validation
- do not start discovery
- do not start browser navigation
- do not start Figma export

## Optional inputs

- `company_name`
- `competitor_credentials`
- `catalog_path`
- `resume_from_run_path`

`competitor_credentials` may contain:
- `competitor_name`
- `login_url`
- `email`
- `password`
- `notes`
- `start_url`
- `navigation_hints`

## Ordered procedure

1. Validate setup with `scripts/checkSetup.ts`.
2. Stop immediately if Figma or browser setup is missing.
3. Discover 5 to 10 relevant competitors with `scripts/discoverCompetitors.ts`, using the built-in starter catalog unless `catalog_path` is provided.
4. Compare the shortlist against the provided credential registry.
5. Ask the user for missing credentials for shortlisted competitors.
6. Exclude competitors without credentials from live capture and record the reason.
7. Capture browser flows competitor by competitor with `scripts/captureCompetitorFlows.ts`.
8. Use credential notes, navigation hints, structured start URLs, and optional `resume_from_run_path` to stay on the intended feature path.
9. Stop for manual intervention if verification barriers or unsafe actions appear.
10. Analyze only the observed screenshots and notes with `scripts/analyzeCapturedFlows.ts`.
11. Export a deterministic HTML research board plus supporting payloads with `scripts/exportResearchToFigma.ts`.
12. Save machine-readable outputs locally in the run directory.

## Setup validation gate

Setup validation is mandatory and happens before any research work.

The setup check must confirm:
- Figma access is configured correctly
- browser agent tooling is configured correctly

If setup is invalid:
- print actionable setup instructions
- stop immediately
- do not continue into discovery, credential checks, capture, analysis, or export

## Credential gate

After competitor discovery:
- compare discovered competitors against the credential registry
- for competitors without usable credentials, ask the user to create the account and provide credentials
- make it explicit that competitors without credentials will be excluded from live capture
- use any provided `notes`, `start_url`, and `navigation_hints` as safe guidance after login rather than guessing

The skill must:
- never fabricate credentials
- never attempt account takeover
- never reuse credentials for a different competitor

## Capture rules

For each included competitor:
- start from the most realistic feature entry point available
- log in with the provided credentials
- capture each meaningful state transition with an ordered screenshot
- save screenshot metadata including step number, label, URL, what changed, and why it matters

Meaningful capture points include:
- feature-relevant entry pages
- sign-in
- onboarding or setup states
- empty states
- configuration forms
- selection and review steps
- success states
- post-creation management states
- relevant warnings or errors that belong to the primary flow

## Analysis rules

The analysis must be grounded in observed screenshots and captured notes only.

Always distinguish:
- directly observed evidence
- reasonable inference
- missing or uncertain evidence

Do not invent:
- hidden settings
- unseen features
- unvisited states
- unsupported conclusions

## Figma export rules

The export must target a page named `Investigación`.

Layout requirements:
- all competitors on one page
- one vertically stacked section per competitor
- screenshots arranged left to right in capture order
- use the shared dark HTML template that mirrors the Figma source of truth
- save all screenshots and related research content into the generated HTML board bundle before Figma handoff
- send the HTML board to Figma as the final research record
- keep a final compact comparison area at the bottom

## Stop conditions

Stop and ask for manual intervention when any of the following appears:
- CAPTCHA
- OTP challenge
- SMS verification
- email verification requiring user action
- ambiguous or unsafe destructive action
- payment or money movement step
- signing or accepting legal agreements
- production data modification risk
- missing or invalid credentials

## Safety boundaries

This skill must never:
- bypass CAPTCHA, OTP, SMS, or email verification barriers
- execute destructive actions
- send money or complete payments
- sign legal agreements
- change production data
- create accounts without user approval and user-provided credentials
- access a competitor without valid credentials

## Output definition

Each run must produce a machine-readable JSON output containing:
- input parameters
- discovered competitors
- included competitors
- excluded competitors and reasons
- screenshot metadata
- step notes
- per-competitor summaries
- cross-competitor findings
- Figma export metadata
- timestamps
- warnings
- manual intervention checkpoints

Use the JSON schemas in `schemas/` and the examples in `examples/` as the source of truth for output shape.
