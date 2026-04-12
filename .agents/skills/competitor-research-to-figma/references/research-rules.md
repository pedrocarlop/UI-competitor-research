# Research Rules

## Evidence standard

All conclusions must be grounded in:
- captured screenshots
- captured URLs
- per-step notes recorded during navigation

Anything beyond direct evidence must be labeled as inference.

## Discovery rules

- Prefer mature products with real logged-in workflows.
- Avoid selecting the user’s own company when `company_name` is provided.
- Favor competitors with realistic account-based journeys over pure marketing pages.
- Keep the shortlist between 5 and 10 competitors.

## Capture rules

- Capture every meaningful state transition.
- Use deterministic, ordered filenames.
- Stop when security barriers or risky actions appear.
- Prefer the mainline flow over edge-case exploration.

## Safety rules

Never attempt:
- CAPTCHA bypass
- OTP bypass
- SMS bypass
- email verification bypass
- credential fabrication
- takeover attempts
- destructive product actions
- payments or money movement
- legal agreement acceptance

## Analysis rules

- Separate observed behavior from inference.
- Call out uncertainty explicitly.
- Do not infer hidden features from marketing copy alone.
- Do not claim parity across competitors unless the evidence is comparable.

## Export rules

- Use one `Investigación` page.
- Stack competitors vertically.
- Keep screenshots left to right in capture order.
- Generate the final board from the shared HTML template.
- Treat `figma-board.html` as the canonical research record before Figma handoff.
- End with a compact comparison summary area.
