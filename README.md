# competitor-research-to-figma

A skill for Codex and Claude Code that researches how competitors implement a feature, captures evidence from real product flows, and delivers a visual benchmark board directly into your Figma file.

You tell it what to research. It opens the competitors' products, takes screenshots step by step, analyzes the patterns, and sends everything to Figma so your team can review it.

---

## What it does

```
You describe the feature
you want to benchmark
          |
          v
+-------------------------+
|   Setup check           |
|  Is Figma connected?    |
|  Is the browser ready?  |
+-------------------------+
          |
     Yes  |  No → get instructions to fix setup
          v
+-------------------------+
|   Discover competitors  |
|  Finds 5–10 relevant    |
|  products automatically |
+-------------------------+
          |
          v
+-------------------------+
|   Credential check      |
|  Do you have accounts   |
|  for these products?    |
+-------------------------+
          |
          |  Missing credentials?
          |  → skill asks you for them
          |    or skips that competitor
          v
+-------------------------+
|   Capture flows         |
|  Opens each product in  |
|  a browser, logs in,    |
|  and takes screenshots  |
|  of every key step      |
+-------------------------+
          |
          |  Hits a CAPTCHA or
          |  verification screen?
          |  → stops and asks you
          |    to handle it manually
          v
+-------------------------+
|   Analyze               |
|  Reviews what was       |
|  captured and writes    |
|  observations per       |
|  competitor             |
+-------------------------+
          |
          v
+-------------------------+
|   Export to Figma       |
|  Builds a visual HTML   |
|  research board and     |
|  sends it to your       |
|  Figma file             |
+-------------------------+
          |
          v
  Your Figma file has
  a page called
  "Investigación" with
  all the evidence
```

---

## Before you start

You will need:
- **Codex** or **Claude Code** installed on your Mac
- **A Figma file** where you want the results to appear — copy the URL from Figma
- **Accounts** at the competitor products you want to research (the skill will ask you for these)

---

## Install

You do not need coding knowledge for this.

### 1. Open Terminal

On Mac:
- Press `Command + Space`
- Type `Terminal`
- Press `Enter`

### 2. Clone this repository

```bash
git clone https://github.com/pedrocarlop/codex-skill-template-private.git
cd codex-skill-template-private
```

### 3. Install for Codex

```bash
python3 ~/.codex/skills/.system/skill-installer/scripts/install-skill-from-github.py \
  --repo pedrocarlop/codex-skill-template-private \
  --path .agents/skills/competitor-research-to-figma
```

What this does:
- Downloads the skill from GitHub
- Installs it into Codex
- Keeps the correct folder structure

Then close Codex fully and open it again.

### Install for Claude Code

From the repository root, run:

```bash
bash scripts/install-skill-claude.sh
```

What this does:
- Copies the Claude skill file to `~/.claude/commands/`
- Makes `/competitor-research-to-figma` available in Claude Code

Then restart Claude Code.

---

## Update (uninstall and reinstall)

Use these to pick up the latest version after pulling changes.

### Update in Codex

```bash
rm -rf ~/.codex/skills/competitor-research-to-figma && \
python3 ~/.codex/skills/.system/skill-installer/scripts/install-skill-from-github.py \
  --repo pedrocarlop/codex-skill-template-private \
  --path .agents/skills/competitor-research-to-figma
```

### Update in Claude Code

```bash
rm -f ~/.claude/commands/competitor-research-to-figma.md && \
bash scripts/install-skill-claude.sh
```

---

## How to use it

Open Codex and send a message like this:

```
Please run competitor-research-to-figma.

feature_description:
Create payment link and manage payment links.

figma_destination_url:
https://www.figma.com/design/YOURFILEKEY/Your-File-Name?node-id=0-1
```

The two required pieces are:
- `feature_description` — describe what part of a product you want to study
- `figma_destination_url` — paste the URL to your Figma file

The skill will ask for anything else it needs, including competitor credentials.

---

## What happens during a run

1. The skill checks that your Figma and browser tools are working. If something is missing, it tells you how to fix it before doing anything else.
2. It finds 5–10 competitors relevant to your feature automatically.
3. It asks you for login credentials for those competitors. If you do not have an account for one of them, that competitor is skipped.
4. It opens each product in a browser, logs in, and captures screenshots of the feature flow step by step.
5. If it hits a CAPTCHA, a verification code, or anything that requires human action, it stops and waits for you.
6. After capture, it analyzes the screenshots and writes observations.
7. It builds an HTML research board and exports it to a page called `Investigación` in your Figma file.

---

## Handling credentials safely

The skill never guesses or creates credentials. You provide them when asked.

If you want to prepare credentials in advance, create a JSON file based on the example at:

```
.agents/skills/competitor-research-to-figma/examples/competitor-credentials.example.json
```

Keep that file outside version control and never commit real passwords.

---

## What you get in Figma

A page called `Investigación` containing:
- One section per competitor
- Screenshots arranged left to right in the order they were captured
- A summary comparison at the bottom
