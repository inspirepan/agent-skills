#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Check node >= 18
if ! command -v node &>/dev/null; then
  echo "ERROR: node is not installed or not in PATH"
  exit 1
fi

NODE_VERSION="$(node -v)"
NODE_MAJOR="${NODE_VERSION#v}"
NODE_MAJOR="${NODE_MAJOR%%.*}"
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "ERROR: node >= 18 required, found $NODE_VERSION"
  exit 1
fi
echo "Node: $NODE_VERSION"

# Check npx
if ! command -v npx &>/dev/null; then
  echo "ERROR: npx is not available"
  exit 1
fi

# Check Chrome/Chromium
CHROME_PATHS=(
  "${CHROME_PATH:-}"
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  "/Applications/Chromium.app/Contents/MacOS/Chromium"
  "/usr/bin/google-chrome"
  "/usr/bin/chromium-browser"
  "/usr/bin/chromium"
)

FOUND_CHROME=""
for p in "${CHROME_PATHS[@]}"; do
  if [ -n "$p" ] && [ -x "$p" ]; then
    FOUND_CHROME="$p"
    break
  fi
done

if [ -n "$FOUND_CHROME" ]; then
  echo "Chrome: $FOUND_CHROME"
else
  echo "WARNING: Chrome/Chromium not found. PNG output won't work but SVG will."
fi

# Install dependencies
echo "Installing dependencies..."
cd "$SKILL_DIR"
npm install --no-package-lock

# Verify install
echo "Verifying beautiful-mermaid..."
npx tsx -e 'import("beautiful-mermaid").then(m => console.log("beautiful-mermaid OK, themes:", Object.keys(m.THEMES).length))'

# Summary
echo ""
echo "render-mermaid setup complete!"
echo "  Node: $NODE_VERSION"
if [ -n "$FOUND_CHROME" ]; then
  echo "  Chrome: $FOUND_CHROME"
else
  echo "  Chrome: not found (SVG only)"
fi
echo "  Dependencies: installed"
