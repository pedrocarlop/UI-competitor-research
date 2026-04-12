# Figma Layout Spec

This document defines the deterministic HTML-first layout produced by `exportResearchToFigma.ts`.

## Page

- Page name: `Investigación`
- One page per benchmark run
- Dark full-width board that mirrors the shared Figma template

## Global spacing

- Page padding: 32 px
- Section vertical gap: 40 px
- Section internal padding: 32 px
- Screenshot gutter: 24 px
- Screenshot tile width: 480 px
- Screenshot tile height: 300 px
- Comparison area top gap: 48 px

## Competitor section

Each competitor section contains:
1. Competitor name
2. Compact run stats row
3. One short experience summary
4. Ordered screenshot row from left to right
5. Step labels paired with each screenshot

Section rules:
- sections are stacked vertically
- sections use the shared dark template styling and a bottom divider
- widths are normalized to the widest screenshot row within the section
- step order is strictly the screenshot sequence order
- screenshot tiles use a shared width for the same run when possible

## Screenshot tile

Each screenshot tile contains:
- image frame
- step label
- short note

Tile rules:
- image appears above text by default
- labels are short and stable
- notes should be concise and evidence-based

## Comparison area

The final area at the bottom summarizes recurring patterns across competitors.

It contains:
- coverage summary
- recurring capabilities
- repeated interaction patterns
- strengths seen repeatedly
- friction points seen repeatedly
- competitors excluded from live capture

The generated HTML file is the canonical research record and should be the artifact captured into Figma.

## Deterministic placement

The export planner computes section coordinates from:
- page padding
- max section width
- measured screenshot count
- shared tile width and height assumptions

It should not use freeform placement or manual nudging.
