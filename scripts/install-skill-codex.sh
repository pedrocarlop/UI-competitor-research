#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
SKILL_SRC="$REPO_ROOT/.agents/skills/competitor-research-to-figma"
AGENTS_SRC="$SKILL_SRC/codex/agents"
SKILL_DEST_ROOT="$CODEX_HOME/skills"
SKILL_DEST="$SKILL_DEST_ROOT/competitor-research-to-figma"
AGENTS_DEST="$CODEX_HOME/agents"

if [ ! -d "$SKILL_SRC" ]; then
  echo "Error: skill directory not found at $SKILL_SRC"
  exit 1
fi

mkdir -p "$SKILL_DEST_ROOT" "$AGENTS_DEST"
rm -rf "$SKILL_DEST"
mkdir -p "$SKILL_DEST"

if command -v rsync >/dev/null 2>&1; then
  rsync -a --delete "$SKILL_SRC/" "$SKILL_DEST/"
else
  cp -R "$SKILL_SRC/." "$SKILL_DEST/"
fi

find "$SKILL_DEST" -name '.DS_Store' -delete

for agent_file in "$AGENTS_SRC"/*.toml; do
  if [ -e "$agent_file" ]; then
    cp "$agent_file" "$AGENTS_DEST/"
  fi
done

echo "Installed: $SKILL_DEST"
echo "Updated agent templates in: $AGENTS_DEST"
echo "Close and reopen Codex to use competitor-research."
