---
name: "render-mermaid"
description: "Use when the user asks you to analyze a repository, draw an architecture diagram, analyze a workflow/process, or explain something through a visual diagram. Prefer this skill whenever structured relationships, flows, states, sequences, or decision paths need to be communicated clearly. Do not use for general image generation or non-Mermaid charting tools."
---

# Render Mermaid

Render Mermaid diagrams to PNG/SVG/HTML using beautiful-mermaid themes.

## Workflow

### Progress Checklist

```
Render Mermaid Progress:
- [ ] Step 0: Check setup (EXTEND.md + deps) -- BLOCKING
- [ ] Step 1: Generate Mermaid source code
- [ ] Step 2: Render diagram
- [ ] Step 3: Return result
```

### Step 0: Check Setup -- BLOCKING

Check EXTEND.md existence and dependencies:

```bash
# Check EXTEND.md (priority: project -> user)
test -f .render-mermaid/EXTEND.md && echo "project"
test -f "$HOME/.render-mermaid/EXTEND.md" && echo "user"

# Check dependencies
test -d "{SKILL_BASE_DIR}/node_modules/beautiful-mermaid" && echo "deps-ok" || echo "deps-missing"
```

| Result | Action |
|--------|--------|
| deps-missing | Run `bash "{SKILL_BASE_DIR}/scripts/setup.sh"` -- BLOCKING |
| EXTEND.md not found | Run first-time setup ([references/config/first-time-setup.md](references/config/first-time-setup.md)) -- BLOCKING |
| Both found | Load EXTEND.md, continue |

### Step 1: Generate Mermaid Source

1. Determine diagram type: `flowchart` / `graph` / `sequenceDiagram` / `classDiagram` / `erDiagram` / `stateDiagram-v2` / `gantt` / `pie` / `gitgraph` / etc.
2. Generate Mermaid source code.
3. Choose output path with `.png` suffix.

### Step 2: Render

```bash
cd "{SKILL_BASE_DIR}" && npx tsx scripts/render_mermaid.js \
  --output "<OUTPUT_PATH>.png" \
  --theme "<THEME>" \
  --config "<EXTEND_MD_PATH>" \
  --svg-output "<OUTPUT_PATH>.svg" \
  --html-output "<OUTPUT_PATH>.html" <<'MERMAID'
<MERMAID_TEXT>
MERMAID
```

When only PNG is needed, keep `--output` and `--config`, omit `--svg-output` and `--html-output`.

Pass `--config` pointing to the user's EXTEND.md for saved preferences. CLI args override config values.

Use stdin heredoc form to avoid shell escaping issues.

### Step 3: Return Result

- On `RENDER_SUCCESS:` -- read the image path and return with markdown image syntax: `![Diagram](path.png)`
- On `RENDER_DEGRADED:` -- return available outputs (SVG/HTML) and explain PNG was unavailable
- On `RENDER_FAILED:` -- relay error, correct the Mermaid source, retry once

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--output <path.png>` | PNG output (requires Chrome) | - |
| `--svg-output <path.svg>` | SVG output | - |
| `--html-output <path.html>` | HTML wrapper output | - |
| `--theme <name>` | Theme name | zinc-light |
| `--scale <number>` | PNG scale factor | 2 |
| `--width <number>` | Viewport width | 2400 |
| `--html-padding <px>` | HTML padding | 40 |
| `--chrome-path <path>` | Chrome executable | auto-detect |
| `--config <path>` | EXTEND.md config file | - |
| `--mermaid <text>` | Mermaid text (prefer stdin) | - |

## Themes

Built-in themes from beautiful-mermaid: `zinc-light`, `zinc-dark`, `tokyo-night`, `tokyo-night-storm`, `tokyo-night-light`, `catppuccin-mocha`, `catppuccin-latte`, `nord`, `nord-light`, `dracula`, `github-light`, `github-dark`, `solarized-light`, `solarized-dark`, `one-dark`.

Aliases: `default` -> `zinc-light`, `solarized` -> `solarized-light`.

Full list: [references/config/preferences-schema.md](references/config/preferences-schema.md)

## Degradation

| Scenario | PNG | SVG | HTML |
|----------|-----|-----|------|
| All working | OK | OK | OK |
| No Chrome | FAIL | OK | OK |
| No puppeteer-core | FAIL | OK | OK |
| No deps | FAIL | FAIL | FAIL |

When PNG fails, request `--svg-output` as fallback.

If all rendering fails, return the Mermaid source code in a fenced code block as final fallback.

## Troubleshooting

See [references/troubleshooting.md](references/troubleshooting.md) for common issues.

## Extension Support

User preferences via EXTEND.md. See Step 0 for paths.

Schema: [references/config/preferences-schema.md](references/config/preferences-schema.md)

## References

**Config**: [first-time-setup.md](references/config/first-time-setup.md) | [preferences-schema.md](references/config/preferences-schema.md)
**Troubleshooting**: [troubleshooting.md](references/troubleshooting.md)
