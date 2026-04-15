# AGENTS.md

This repository contains the `competitor-research` skill for Codex, Claude Code, and Antigravity.

The installable skill lives in `.agents/skills/competitor-research-to-figma/` (legacy path retained for installation compatibility).

## Principles

- Default to public-evidence-first research. Do not treat login as the starting point.
- Produce markdown reports with screenshots, links, and structured findings.
- Every finding must distinguish observed facts, inferences, and unknowns.
- Capture screenshots systematically with consistent naming and source attribution.
- Credentials are optional and only used when explicitly requested by the user.

## When extending the repository

- Prefer additive changes over breaking shape changes.
- Keep the output contract stable: `output/research.md` + `output/assets/`.
- Do not reintroduce credential gates or login-first workflows as defaults.
- Update examples alongside any methodology or output format change.
