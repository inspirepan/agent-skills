---
name: troubleshooting
description: Common issues and solutions for render-mermaid skill
---

# Troubleshooting

## Setup Issues

### "Cannot find package mermaid"
Dependencies not installed. Run:
```bash
bash "{SKILL_BASE_DIR}/scripts/setup.sh"
```

### "npx tsx: command not found" or tsx errors
Node.js required (>= 18). Check: `node --version`

If Node is installed but tsx fails:
```bash
npx tsx --version
```

## Rendering Issues

### "missing Chrome/Chromium executable"
PNG rendering requires Chrome. Options:
1. Install Chrome or Chromium
2. Set path: `--chrome-path /path/to/chrome`
3. Set env: `export CHROME_PATH=/path/to/chrome`
4. Save in EXTEND.md: `chrome_path: /path/to/chrome`

SVG/HTML output works without Chrome.

### Black shapes, no text in PNG
This happens if using resvg or other non-browser SVG renderers. The skill uses Chrome for PNG so Mermaid SVG text and CSS render through a browser.

### Chinese/CJK text garbled or missing
1. Ensure CJK fonts are installed on the system
2. Chrome uses system fonts; install e.g. Noto Sans CJK
3. Mermaid renders text as SVG text elements, which Chrome renders with system fonts

### "unknown theme" error
Check available themes with: `--help`
Themes: default, neutral, dark, forest, base

### "unknown curve" error
Check available curves with: `--help`
Common curves: basis, linear, natural, step

## Degradation Behavior

| Scenario | PNG | SVG | HTML | Source |
|----------|-----|-----|------|--------|
| All working | OK | OK | OK | OK |
| No Chrome | FAIL | OK | OK | OK |
| No puppeteer-core | FAIL | OK | OK | OK |
| No mermaid | FAIL | FAIL | FAIL | OK |
| No jsdom | FAIL | FAIL | FAIL | OK |
| No Node/tsx | FAIL | FAIL | FAIL | OK |

When PNG fails, the script outputs `RENDER_DEGRADED: svg-only` and still produces SVG/HTML if requested.

## Output Markers

The script outputs structured markers for the agent:
- `RENDER_SUCCESS: <path>` - file written successfully
- `RENDER_SUCCESS_SVG: <path>` - SVG file written successfully
- `RENDER_SUCCESS_HTML: <path>` - HTML file written successfully
- `RENDER_DEGRADED: <reason>` - partial success
- `RENDER_FAILED: <reason>` - complete failure
