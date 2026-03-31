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
test -d "$SKILL_DIR/node_modules/beautiful-mermaid" && echo "deps-ok" || echo "deps-missing"
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
  - label: "zinc-light (Recommended)"
    description: "Clean light theme with gray tones"
  - label: "github-light"
    description: "GitHub-style light theme"
  - label: "nord"
    description: "Nord color palette, cool blue-gray"
  - label: "tokyo-night"
    description: "Dark theme with vibrant colors"
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

### Question 3: Save Location

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
theme: zinc-light
scale: 2
width: 2400
html_padding: 40
chrome_path: null
---
```

## After Setup

1. Create directory if needed
2. Write EXTEND.md
3. Confirm: "Preferences saved to [path]"
4. Continue to rendering
