# AGENTS.md

This repository contains the `competitor-research` skill for Codex, Claude Code, and Antigravity.

The installable skill lives in `.agents/skills/competitor-research-to-figma/` (legacy path retained for installation compatibility).

## Principles

- Default to public-evidence-first research. Do not treat login as the starting point.
- Produce comprehensive markdown reports with screenshots, links, and structured findings.
- Every finding must distinguish observed facts, inferences, and unknowns.
- Capture screenshots systematically with consistent naming and source attribution.
- Credentials are optional and only used when explicitly requested by the user.
- Customer sentiment must always cite sources (review platform, date, direct quote vs paraphrase).
- Pricing analysis must distinguish public pricing from gated/sales-only pricing.
- Feature matrix claims must be backed by evidence — do not infer support from marketing copy alone.
- Market context claims must cite sources and note publication dates.
- Figma export is optional — the skill must work without it.

## When extending the repository

- Prefer additive changes over breaking shape changes.
- Keep the output contract stable: `output/research.md` + `output/assets/`.
- Do not reintroduce credential gates or login-first workflows as defaults.
- Update examples alongside any methodology or output format change.
- `SKILL.md` is the single source of truth for the skill definition. The Claude install script copies it directly to `~/.claude/commands/`.
- Keep `.codex/agents/*.toml` in sync with the Codex subagent model routing described in `SKILL.md`.
- Ensure changes work across all three platforms: Claude Code, Codex, and Antigravity.
