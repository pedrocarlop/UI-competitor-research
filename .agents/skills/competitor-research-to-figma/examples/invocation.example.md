# Example Invocations

## Basic usage — broad competitive audit

```text
Please run competitor-research.

research_question:
How do top project management tools handle recurring task automation?

company_name:
Acme Project Tools
```

Expected behavior:
- Discovers 5–10 relevant competitors automatically
- Gathers evidence from feature pages, help centers, pricing pages, and app stores
- Produces `output/research.md` with findings and `output/assets/` with screenshots

## Targeted competitors — specific list

```text
Please run competitor-research.

research_question:
Compare onboarding flows for developer-facing API products.

competitors:
["Stripe", "Twilio", "Algolia", "SendGrid"]
```

Expected behavior:
- Skips discovery and uses the provided competitor list directly
- Focuses on public onboarding evidence: feature pages, docs, getting-started guides, YouTube tutorials

## Pricing and positioning comparison

```text
Please run competitor-research.

research_question:
Compare pricing page structure, tier naming, and free-tier positioning across design tools.

competitors:
["Figma", "Sketch", "Framer", "Canva"]

scope:
Pricing pages only. Capture full-page screenshots of each pricing page.
```

Expected behavior:
- Narrow scope — focuses only on pricing pages
- Captures full-page screenshots of each competitor's pricing page
- Compares tier structure, naming conventions, and free-tier positioning

## Help center and documentation audit

```text
Please run competitor-research.

research_question:
How do support platforms document their chatbot setup process?

competitors:
["Intercom", "Zendesk", "Freshdesk", "Drift"]

scope:
Help center articles and public video walkthroughs only.
```

Expected behavior:
- Focuses on help center content and YouTube walkthroughs
- Reconstructs the chatbot setup flow from documentation evidence
- Notes gaps where documentation is incomplete

## App store and review analysis

```text
Please run competitor-research.

research_question:
Analyze app store presence, ratings, and recent user feedback for productivity tools.

competitors:
["Notion", "Coda", "Airtable"]

scope:
iOS App Store and Google Play Store pages, recent reviews, and ratings.
```

Expected behavior:
- Captures app store page screenshots
- Records ratings and recent review themes
- Compares store presence and user sentiment

## Feature deep dive

```text
Please run competitor-research.

research_question:
How do Stripe, Square, and PayPal present payment link creation to merchants?

scope:
Feature pages, help centers, and any public demos or walkthroughs.
```

Expected behavior:
- Gathers evidence from multiple source types per competitor
- Reconstructs the payment link creation flow from public evidence
- Captures screenshots of feature pages, help center articles, and demo videos
- Clearly labels what was observed vs. inferred

## With authenticated research (optional)

```text
Please run competitor-research.

research_question:
How does Stripe's payment link creation flow work from inside the dashboard?

competitors:
["Stripe"]

I have a Stripe test account and can provide credentials if needed for authenticated research.
```

Expected behavior:
- Starts with public evidence first
- Only asks for credentials after public evidence is gathered
- If the user provides credentials, adds authenticated evidence to the same report
- Follows all safety rules for authenticated mode
