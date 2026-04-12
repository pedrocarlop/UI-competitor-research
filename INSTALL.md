# INSTALL.md

## Purpose

This repository is meant to be installed and used as a native Codex skill named `competitor-research-to-figma`.

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

If your Codex installation expects skills under a central `$CODEX_HOME/skills` directory, symlink or copy the skill folder:

```bash
ln -s "/absolute/path/to/repo/.agents/skills/competitor-research-to-figma" "$CODEX_HOME/skills/competitor-research-to-figma"
```

## Figma setup requirements

The skill validates Figma availability before research begins. At least one of the following should be true:
- Codex Figma tooling is installed and available in your environment
- `FIGMA_ACCESS_TOKEN` or `FIGMA_API_TOKEN` is set for read-oriented validation
- `FIGMA_WRITE_COMMAND` is set if you want command-based write execution from the export script
- `FIGMA_CAPTURE_COMMAND` is set if you want command-based HTML capture execution from the export script

Recommended approach:
- use Codex with the Figma plugin enabled
- provide a valid `figma_destination_url` pointing to a file or page you can edit

### `FIGMA_WRITE_COMMAND` contract

When `FIGMA_WRITE_COMMAND` is set, `npm run export:figma` will invoke it with one argument:

```text
<absolute path>/runs/<timestamp>/figma-write-payload.json
```

The payload contains:
- `run_id`
- `file_key`
- `page_name`
- `description`
- `plan_path`
- `asset_manifest_path`
- `asset_count`
- `code`
- `skill_names`

The `code` field is deterministic Plugin API JavaScript intended for Codex Figma execution. A command wrapper can read the payload and forward those values into your preferred Figma automation path.

### `FIGMA_CAPTURE_COMMAND` contract

When `FIGMA_CAPTURE_COMMAND` is set, `npm run export:figma` will invoke it with one argument:

```text
<absolute path>/runs/<timestamp>/figma-capture-payload.json
```

The payload contains:
- `run_id`
- `destination_url`
- `file_key`
- `page_name`
- `html_entry_path`
- `server_root`
- `asset_manifest_path`
- `plan_path`

Use this contract for the primary export path: the skill generates a reusable HTML research board first, then sends that HTML into Figma as the final record.

## Browser agent setup requirements

The skill validates browser tooling before discovery and capture. At least one of the following should be true:
- Playwright is installed locally through `npm install`
- `BROWSER_AGENT_COMMAND` points to a custom browser automation command
- `PLAYWRIGHT_WS_ENDPOINT` is configured for remote browser execution

The included implementation uses Playwright directly for browser capture and can also defer to a configured browser-agent command when your environment requires it.

When `BROWSER_AGENT_COMMAND` is set, the script also writes:
- `browser-agent-request.json`
- `browser-agent-result.json` when the command returns a structured result

The command receives a single JSON argument plus the environment variables `BROWSER_AGENT_REQUEST_PATH` and `BROWSER_AGENT_RESULT_PATH`. The JSON includes credentials, navigation hints, safe/blocked keyword lists, output paths, optional resume URL, `auth_attempts_max`, and `manual_login_required_after_two_attempts`.

## Providing competitor credentials safely

Create a JSON file based on:

```text
.agents/skills/competitor-research-to-figma/examples/competitor-credentials.example.json
```

Recommended practices:
- keep the real file outside version control
- store only the accounts you want included in live capture
- use `email_env` and `password_env` for secrets you want resolved from environment variables
- use `notes`, `navigation_hints`, and optional `start_url` to describe safe navigation after login
- do not commit real passwords

## Invocation flow after installation

1. Provide the mandatory inputs:
   - `feature_description`
   - `figma_destination_url`
2. Optionally provide:
   - `company_name`
   - `competitor_allowlist`
   - `locale`
   - `credential_registry_path`
   - `catalog_path`
   - `resume_from_run_path`
   - `evidence_import_path`
3. Run the full orchestrated workflow:

   ```bash
   npm run run:research -- --input ./input/research.json
   ```

4. Optionally run the stages individually when you need tighter control:

   ```bash
   npm run check:setup -- --input ./input/research.json
   npm run discover -- --input ./input/discovery.json --output ./runs/latest/discovery.json
   npm run capture -- --input ./input/capture.json
   npm run analyze -- --input ./runs/<timestamp>/research-run.json
   npm run export:figma -- --input ./runs/<timestamp>/research-run.json
   npm run ingest:evidence -- --input ./input/evidence-ingest.json --output ./runs/<timestamp>/imported-evidence.json
   ```

The preferred export path is:
- populate `figma-board.html` from the reusable template
- send it to Figma through `figma-capture-payload.json`
- use `figma-write-payload.json` only as a fallback

## Native skill usage

Once installed, invoke the skill from Codex with a prompt that includes:
- the target feature description
- the Figma destination URL
- optional company context
- optional allowlist and locale
- optional credential registry
- optional manual evidence import path

See `.agents/skills/competitor-research-to-figma/examples/invocation.example.md` for a full example.
