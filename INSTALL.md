# INSTALL.md

## Purpose

This repository is a skill for deep competitor research using public evidence. It runs in Codex, Claude Code, or Antigravity.

## Skill location

The installable skill folder is:

```text
.agents/skills/competitor-research-to-figma/
```

## Installation options

### Option 1: Keep the repository in place

If your Codex environment already reads skills from this repository layout, install dependencies and use the skill directly:

```bash
npm install
```

### Option 2: Link the skill into your Codex skills directory

```bash
ln -s "/absolute/path/to/repo/.agents/skills/competitor-research-to-figma" "$CODEX_HOME/skills/competitor-research"
```

## Setup requirements

### Minimum (public research mode)

No external services are required. The skill uses web search and browser tools to gather public evidence and produce a markdown report.

You need:
- Codex, Claude Code, or Antigravity installed
- A clear research question

### Optional: Browser automation

For automated screenshot capture, at least one of the following should be available:
- Playwright installed locally (`npm install`)
- `BROWSER_AGENT_COMMAND` pointing to a custom browser automation command
- `PLAYWRIGHT_WS_ENDPOINT` configured for remote browser execution
- A browser MCP tool available in your environment

If no browser automation is available, the skill can still produce research using web search, web fetch, and manual evidence — but automated screenshot capture will not be available.

### Optional: Authenticated research

Only relevant when the user explicitly requests login-based evidence gathering. See the credential examples at:

```text
.agents/skills/competitor-research-to-figma/examples/competitor-credentials.example.json
```

Keep credential files outside version control. Never commit real passwords.

## Invocation

### Required input

- `research_question` — what feature, workflow, or capability to benchmark

### Optional inputs

- `company_name` — your company, to exclude from competitor lists
- `competitors` — explicit list of competitors to include
- `scope` — specific sources or areas to focus on
- `output_path` — where to write the report (defaults to `./output/`)

### Example

```text
Please run competitor-research.

research_question:
How do competitors handle payment link creation, management, and sharing?

company_name:
Northstar Commerce
```

## Output

The skill produces:

```
output/
  assets/
    {competitor}-{source}-{topic}.png
    ...
  research.md
  sources.md   (optional)
```

See the [README](./README.md) for the full output format and evidence model.

## Native skill usage

Once installed, invoke the skill from Codex, Claude Code, or Antigravity with a prompt that includes the research question and any optional context. See `.agents/skills/competitor-research-to-figma/examples/invocation.example.md` for examples.
