#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SKILL_DIR="$REPO_ROOT/.agents/skills/competitor-research-to-figma"
DEST_ROOT="$HOME/.agents/skills"
DEST_DIR="$DEST_ROOT/competitor-research"

if [ ! -d "$SKILL_DIR" ]; then
  echo "Error: skill directory not found at $SKILL_DIR"
  exit 1
fi

mkdir -p "$DEST_DIR"

# Use rsync if available for cleaner updates, otherwise rm and cp
if command -v rsync >/dev/null 2>&1; then
  rsync -av --delete "$SKILL_DIR/" "$DEST_DIR/"
else
  rm -rf "$DEST_DIR"
  mkdir -p "$DEST_DIR"
  cp -R "$SKILL_DIR/." "$DEST_DIR/"
fi

find "$DEST_DIR" -name '.DS_Store' -delete

# Clean up old name if present
rm -rf "$DEST_ROOT/competitor-research-to-figma"

echo "Installed: $DEST_DIR"
echo "Restart Antigravity to use competitor-research"
