---
name: first-time-setup
description: First-time setup flow for render-mermaid preferences
---

# First-Time Setup

## Overview

When no EXTEND.md is found, guide user through preference setup before rendering.

**BLOCKING**: Complete setup before any rendering steps.

## Prerequisites Check

Before asking preference questions, verify the environment:

```bash
# Check node
node --version

# Check dependencies installed
SKILL_DIR="{SKILL_BASE_DIR}"
cd "$SKILL_DIR" && npx tsx -e 'Promise.all([import("mermaid"), import("jsdom"), import("puppeteer-core")]).then(() => console.log("deps-ok")).catch(() => { console.log("deps-missing"); process.exit(1); })'
```

If deps-missing, run setup script first:
```bash
bash "{SKILL_BASE_DIR}/scripts/setup.sh"
```

## Questions

Use AskUserQuestion with ALL questions in ONE call:

### Question 1: Theme

```yaml
header: "Theme"
question: "Default Mermaid theme?"
options:
  - label: "default (Recommended)"
    description: "Mermaid default light theme"
  - label: "neutral"
    description: "Muted grayscale palette"
  - label: "dark"
    description: "Mermaid dark theme"
  - label: "forest"
    description: "Green-tinted palette"
```

### Question 2: Scale

```yaml
header: "Scale"
question: "PNG output scale factor?"
options:
  - label: "2x (Recommended)"
    description: "High-DPI, good for retina displays and articles"
  - label: "1x"
    description: "Standard resolution, smaller file size"
  - label: "3x"
    description: "Extra high resolution, large files"
```

### Question 3: Output Mode

```yaml
header: "Output"
question: "Preferred output mode?"
options:
  - label: "Script render (Recommended)"
    description: "PNG primary via Mermaid + Chrome, best for embedding in docs"
  - label: "Standalone HTML"
    description: "HTML primary via Mermaid, no Chrome needed, open in browser"
```

### Question 4: Save Location

```yaml
header: "Save"
question: "Where to save preferences?"
options:
  - label: "User (Recommended)"
    description: "~/.render-mermaid/ (all projects)"
  - label: "Project"
    description: ".render-mermaid/ (this project only)"
```

## Save Locations

| Choice | Path |
|--------|------|
| User | `~/.render-mermaid/EXTEND.md` |
| Project | `.render-mermaid/EXTEND.md` |

## EXTEND.md Template

```yaml
---
version: 1
theme: default
curve: basis
background: "#ffffff"
scale: 2
width: 2400
html_padding: 40
chrome_path: null
output_mode: script
standalone_theme: default
standalone_background: "#ffffff"
---
```

## After Setup

1. Create directory if needed
2. Write EXTEND.md
3. Confirm: "Preferences saved to [path]"
4. Continue to rendering
