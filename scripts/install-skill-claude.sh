#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SKILL_FILE="$REPO_ROOT/.agents/skills/competitor-research-to-figma/SKILL.md"
DEST_DIR="$HOME/.claude/commands"
DEST="$DEST_DIR/competitor-research.md"

if [ ! -f "$SKILL_FILE" ]; then
  echo "Error: skill file not found at $SKILL_FILE"
  exit 1
fi

mkdir -p "$DEST_DIR"
cp "$SKILL_FILE" "$DEST"

# Clean up old name if present
rm -f "$DEST_DIR/competitor-research-to-figma.md"

echo "Installed: $DEST"
echo "Restart Claude Code to use /competitor-research"
