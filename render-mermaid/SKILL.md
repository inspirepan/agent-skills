---
name: "render-mermaid"
description: "Render Mermaid diagrams to standalone PNG/SVG/HTML files. Only use when the user explicitly asks for a separate Mermaid image or file (e.g. \"export as PNG\", \"save the diagram to a file\", \"give me an SVG/HTML\"). For architecture diagrams, workflows, sequences, or any other visual explanation, do NOT use this skill by default -- write a ```mermaid code block directly in the reply, since the client renders it inline. Do not use for general image generation or non-Mermaid charting tools."
---

# Render Mermaid

Render Mermaid diagrams to PNG/SVG/HTML using the official Mermaid renderer.

> **Default behavior**: when a diagram helps explain something, just write a ```` ```mermaid ```` fenced block in the reply -- the client renders it inline. Only follow this workflow when the user explicitly wants a standalone image or file.

## Workflow

### Progress Checklist

```
Render Mermaid Progress:
- [ ] Step 0: Check setup (EXTEND.md + deps) -- BLOCKING
- [ ] Step 1: Generate Mermaid source code
- [ ] Step 2: Route by output_mode → render diagram
- [ ] Step 3: Return result
```

### Step 0: Check Setup -- BLOCKING

Check EXTEND.md existence and dependencies:

```bash
# Check EXTEND.md (priority: project -> user)
test -f .render-mermaid/EXTEND.md && echo "project"
test -f "$HOME/.render-mermaid/EXTEND.md" && echo "user"

# Check dependencies
cd "{SKILL_BASE_DIR}" && npx tsx -e 'Promise.all([import("mermaid"), import("jsdom"), import("puppeteer-core")]).then(() => console.log("deps-ok")).catch(() => { console.log("deps-missing"); process.exit(1); })'
```

| Result | Action |
|--------|--------|
| deps-missing | Run `bash "{SKILL_BASE_DIR}/scripts/setup.sh"` -- BLOCKING |
| EXTEND.md not found | Run first-time setup ([references/config/first-time-setup.md](references/config/first-time-setup.md)) -- BLOCKING |
| Both found | Load EXTEND.md, note `output_mode` value for Step 2 routing, continue |

### Step 1: Generate Mermaid Source

1. Determine diagram type: `flowchart` / `graph` / `sequenceDiagram` / `classDiagram` / `erDiagram` / `stateDiagram-v2` / `gantt` / `pie` / `gitgraph` / etc.
2. Generate Mermaid source code.

### Step 2: Route and Render

Read `output_mode` from EXTEND.md to decide rendering path. **This is mandatory -- do NOT default to Option A without checking.**

```
output_mode = ?
├── "standalone" ──────────────────→ Option B (always)
├── "script" (or unset) ──────────→ Option A
└── deps missing / setup failed ──→ Fallback (CDN template)
```

**Option A: Script render -- PNG primary** (requires Chrome)

```bash
cd "{SKILL_BASE_DIR}" && npx tsx scripts/render_mermaid.js \
  --output "<OUTPUT_PATH>.png" \
  --theme "<THEME>" \
  --curve "<CURVE>" \
  --config "<EXTEND_MD_PATH>" \
  --svg-output "<OUTPUT_PATH>.svg" \
  --html-output "<OUTPUT_PATH>.html" <<'MERMAID'
<MERMAID_TEXT>
MERMAID
```

When only PNG is needed, omit `--svg-output` and `--html-output`.

**Option B: Script render -- HTML primary** (no Chrome needed)

Same script, pass `--html-output` only (no `--output`). Uses the official Mermaid renderer and skips PNG/Chrome entirely.

```bash
cd "{SKILL_BASE_DIR}" && npx tsx scripts/render_mermaid.js \
  --html-output "<OUTPUT_PATH>.html" \
  --theme "<THEME>" \
  --curve "<CURVE>" \
  --config "<EXTEND_MD_PATH>" <<'MERMAID'
<MERMAID_TEXT>
MERMAID
```

Optionally add `--svg-output` for SVG alongside HTML.

**Fallback: CDN template** (when deps not installed)

Read the template at [references/templates/standalone.html](references/templates/standalone.html), substitute placeholders, and write the output file directly. No script execution needed. Uses Mermaid CDN themes.

| Placeholder | EXTEND.md field | Default | Example |
|-------------|-----------------|---------|---------|
| `{{TITLE}}` | - | `Mermaid Diagram` | `Architecture Overview` |
| `{{BACKGROUND}}` | `standalone_background` | `#ffffff` | `#1a1a2e` |
| `{{MERMAID_CODE}}` | - | - | `flowchart TD ...` |
| `{{MERMAID_THEME}}` | `standalone_theme` | `default` | `dark`, `neutral`, `forest` |
| `{{MERMAID_CURVE}}` | `curve` | `basis` | `linear`, `basis`, `step` |

**Common notes for Option A and B:**

Pass `--config` pointing to the user's EXTEND.md for saved preferences. CLI args override config values.

Use stdin heredoc form to avoid shell escaping issues.

Override rules (take precedence over `output_mode`):
- User explicitly asks for PNG → Option A regardless of config
- User explicitly asks for HTML → Option B regardless of config
- Deps not installed / setup failed → Fallback (CDN template)

### Step 3: Return Result

| Script output | Action |
|---------------|--------|
| `RENDER_SUCCESS: <path>` | Read PNG, return with `![Diagram](path.png)` |
| `RENDER_SUCCESS_HTML: <path>` | Return HTML path, tell user to open in browser |
| `RENDER_DEGRADED:` | Return available outputs (SVG/HTML), explain PNG was unavailable |
| `RENDER_FAILED:` | Relay error, correct Mermaid source, retry once |
| Fallback (CDN) | Return HTML path, tell user to open in browser |

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--output <path.png>` | PNG output (requires Chrome) | - |
| `--svg-output <path.svg>` | SVG output | - |
| `--html-output <path.html>` | HTML wrapper output | - |
| `--theme <name>` | Mermaid official theme | default |
| `--curve <name>` | Flowchart curve | basis |
| `--background <color>` | HTML/PNG background | theme default |
| `--scale <number>` | PNG scale factor | 2 |
| `--width <number>` | Viewport width | 2400 |
| `--html-padding <px>` | HTML padding | 40 |
| `--chrome-path <path>` | Chrome executable | auto-detect |
| `--config <path>` | EXTEND.md config file | - |
| `--mermaid <text>` | Mermaid text (prefer stdin) | - |

## Themes

Official Mermaid themes: `default`, `neutral`, `dark`, `forest`, `base`.

## Flowchart Curves

Supported Mermaid curve values: `linear`, `basis`, `bumpX`, `bumpY`, `cardinal`, `catmullRom`, `monotoneX`, `monotoneY`, `natural`, `step`, `stepAfter`, `stepBefore`.

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
