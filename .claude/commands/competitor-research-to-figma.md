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

1. **Validate setup.** Confirm the Figma MCP tool and browser MCP tool are reachable. Use the available MCP tools to run a lightweight probe — attempt a Figma identity check and a browser navigation to a known safe URL. Stop immediately if either fails and print actionable instructions.
2. **Discover competitors.** Use web search to find 5–10 products relevant to `feature_description` and `company_name` (if provided). Prefer direct competitors with live web products. Return a ranked shortlist with login URLs.
3. **Credential gate.** Compare the shortlist against any provided `competitor_credentials`. For competitors without credentials, ask the user to provide them or confirm they should be skipped. Never proceed to capture without valid credentials. Never fabricate credentials.
4. **Capture flows.** For each included competitor, open the product in the browser MCP tool, log in with the provided credentials, and capture an ordered screenshot at each meaningful state transition. Save step number, label, URL, what changed, and why it matters alongside each screenshot.
5. **Handle barriers.** Stop and ask for manual intervention when any of the following appears: CAPTCHA, OTP, SMS verification, email verification, ambiguous or unsafe destructive action, payment step, legal agreement, or production data modification risk.
6. **Analyze.** Review only the captured screenshots and step notes. Distinguish directly observed evidence from reasonable inference. Do not invent hidden settings, unseen features, or unvisited states.
7. **Export to Figma.** Build an HTML research board using a dark template. Embed all screenshots and observations. Target a page named `Investigación` in the provided Figma file. Layout: one vertically stacked section per competitor, screenshots left to right in capture order, compact cross-competitor comparison at the bottom.
8. **Save outputs.** Write a machine-readable JSON run record locally containing all inputs, competitor list, included/excluded entries with reasons, screenshot metadata, step notes, per-competitor summaries, cross-competitor findings, Figma export metadata, timestamps, warnings, and intervention checkpoints.

## Setup validation gate

Setup validation is mandatory and happens before any research work.

Confirm:
- Figma MCP is reachable and the target file is accessible
- Browser MCP tool is reachable and can open a URL

If either check fails:
- print actionable setup instructions for the missing tool
- stop immediately
- do not continue into discovery, credential checks, capture, analysis, or export

## Credential gate

After competitor discovery:
- compare discovered competitors against provided credentials
- for competitors without usable credentials, explicitly ask the user to provide them or confirm skip
- make it clear that competitors without credentials are excluded from live capture
- use `notes`, `start_url`, and `navigation_hints` as safe post-login guidance rather than guessing

The skill must never:
- fabricate credentials
- attempt account takeover
- reuse credentials across competitors

## Capture rules

For each included competitor:
- start from the most realistic feature entry point available
- log in with the provided credentials
- capture each meaningful state transition with an ordered screenshot
- save metadata: step number, label, URL, what changed, why it matters

Meaningful capture points:
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
- use a shared dark HTML template
- embed all screenshots and research content in the HTML board before Figma handoff
- send the HTML board to Figma as the final research record
- compact cross-competitor comparison area at the bottom

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
