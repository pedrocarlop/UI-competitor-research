#!/bin/bash
set -e

SKILL_FILE=".claude/commands/competitor-research-to-figma.md"
DEST_DIR="$HOME/.claude/commands"
DEST="$DEST_DIR/competitor-research-to-figma.md"

if [ ! -f "$SKILL_FILE" ]; then
  echo "Error: run this script from the repository root."
  exit 1
fi

mkdir -p "$DEST_DIR"
cp "$SKILL_FILE" "$DEST"

echo "Installed: $DEST"
echo "Restart Claude Code to use /competitor-research-to-figma"
