# AGENTS.md

This directory contains generated competitor-research run artifacts.

- When starting a new research run, do not read, search, summarize, or use older sibling runs as context.
- Treat `runs/<research-slug>/<run-id>/` directories as isolated historical artifacts.
- Only read an existing run when the user explicitly asks to resume, audit, compare, or import that specific run, or when an input path such as `resume_from_run_path` or `evidence_import_path` points to it.
- For a new run, create and write only inside the active run directory and its `output/assets/` folder.
