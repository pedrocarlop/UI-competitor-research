# Example Invocations

## Become an expert on a feature domain

```text
Please run competitor-research.

research_question:
I want to become an expert on payment links — how do competitors handle creation, management, sharing, pricing, and what do customers love or hate about them?

research_name:
Payment Links

company_name:
Northstar Commerce
```

Expected behavior:
- Gathers market landscape context for the payment links space
- Discovers 5-10 relevant competitors automatically via web search
- Builds a subfeature matrix (branding, expiration, analytics, multi-currency, etc.)
- Captures pricing pages and compares pricing models
- Gathers customer sentiment from G2, App Store, Reddit
- Produces a comprehensive `runs/payment-links/<run-id>/output/research.md` with all sections

## Basic usage — broad competitive audit

```text
Please run competitor-research.

research_question:
How do top project management tools handle recurring task automation?

research_name:
Recurring Task Automation

company_name:
Acme Project Tools
```

Expected behavior:
- Discovers 5-10 relevant competitors automatically
- Gathers evidence from feature pages, help centers, pricing pages, and app stores
- Produces `runs/recurring-task-automation/<run-id>/output/research.md` with findings and `runs/recurring-task-automation/<run-id>/output/assets/` with screenshots

## Non-payments domain — design tools

```text
Please run competitor-research.

research_question:
How do design tools handle component libraries and design system management?

competitors:
["Figma", "Sketch", "Framer", "Penpot"]
```

Expected behavior:
- Uses the provided competitor list directly
- Identifies subfeatures: component variants, auto-layout, token management, versioning, publishing
- Builds a feature matrix comparing support across competitors
- Captures help center documentation on component management workflows

## Non-payments domain — analytics

```text
Please run competitor-research.

research_question:
Compare how analytics platforms handle custom event tracking and funnel analysis.
```

Expected behavior:
- Discovers analytics competitors via web search (Mixpanel, Amplitude, PostHog, etc.)
- Compares event tracking setup flows and funnel builders
- Captures pricing models (usage-based vs seat-based patterns common in analytics)
- Gathers customer sentiment on ease of implementation

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
- Classifies pricing models and produces a comparison table

## Customer sentiment focus

```text
Please run competitor-research.

research_question:
What do customers love and hate about project management tools for remote teams?

competitors:
["Asana", "Monday.com", "ClickUp", "Linear", "Notion"]

scope:
Focus on customer reviews and sentiment. Check G2, Capterra, Reddit, and app stores.
```

Expected behavior:
- Prioritizes review platforms, forums, and app store reviews
- Produces per-competitor sentiment summaries with quotes
- Identifies recurring themes across all competitors
- Highlights unmet needs and feature requests

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

## With optional Figma export

```text
Please run competitor-research.

research_question:
How do e-commerce platforms handle product catalog management?

figma_destination_url:
https://www.figma.com/design/abc123/Research-Board

competitors:
["Shopify", "WooCommerce", "BigCommerce", "Squarespace"]
```

Expected behavior:
- Runs the full research workflow
- Produces `runs/e-commerce-platform-catalog-management/<run-id>/output/research.md` as always
- Additionally exports a visual research board to the specified Figma file

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
