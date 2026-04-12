# Codex Skill

A simple repository for a Codex skill.

Use this README as a starting point for any skill repo. Replace the GitHub repo name and skill folder path if you use it for a different project.

## Workflow

```text
Start
  |
  v
Open Codex
  |
  v
Run the install command in Terminal
  |
  v
Restart Codex
  |
  v
Use the skill in Codex
```

## Install

You do not need coding knowledge for this.

### 1. Open Terminal

On Mac:
- Press `Command + Space`
- Type `Terminal`
- Press `Enter`

### 2. Copy and paste this command

Paste this into Terminal, then press `Enter`:

```bash
python3 ~/.codex/skills/.system/skill-installer/scripts/install-skill-from-github.py \
  --repo pedrocarlop/codex-skill-template-private \
  --path .agents/skills/competitor-research-to-figma
```

What this does:
- Downloads the skill from GitHub
- Installs it into Codex
- Keeps the correct skill folder structure

### 3. Restart Codex

Close Codex fully, then open it again.

### 4. Use the skill

After Codex restarts, the skill should be available.

## For Other Projects

If you reuse this README for another skill, change:
- `pedrocarlop/codex-skill-template-private` to your GitHub repo
- `.agents/skills/competitor-research-to-figma` to your skill folder inside the repo
