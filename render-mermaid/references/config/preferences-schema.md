---
name: preferences-schema
description: EXTEND.md YAML schema for render-mermaid user preferences
---

# Preferences Schema

## Full Schema

```yaml
---
version: 1
theme: zinc-light        # beautiful-mermaid theme name
scale: 2                 # Device scale factor for PNG (1, 2, or 3)
width: 2400              # Viewport width in pixels
html_padding: 40         # Padding around diagram in HTML wrapper (pixels)
chrome_path: null         # Chrome/Chromium path override (null = auto-detect)
---
```

## Field Reference

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `version` | int | 1 | Schema version |
| `theme` | string | zinc-light | beautiful-mermaid theme |
| `scale` | int | 2 | PNG scale factor |
| `width` | int | 2400 | Viewport width |
| `html_padding` | int | 40 | HTML wrapper padding |
| `chrome_path` | string | null | Chrome executable path |

## Available Themes

| Theme | Description |
|-------|-------------|
| `zinc-light` | Clean light with gray tones |
| `zinc-dark` | Clean dark with gray tones |
| `tokyo-night` | Dark with vibrant accents |
| `tokyo-night-storm` | Darker tokyo-night variant |
| `tokyo-night-light` | Light tokyo-night variant |
| `catppuccin-mocha` | Warm dark pastel |
| `catppuccin-latte` | Warm light pastel |
| `nord` | Cool blue-gray |
| `nord-light` | Light nord variant |
| `dracula` | Purple-tinted dark |
| `github-light` | GitHub light theme |
| `github-dark` | GitHub dark theme |
| `solarized-light` | Solarized light |
| `solarized-dark` | Solarized dark |
| `one-dark` | Atom One Dark |

## Theme Aliases

| Alias | Maps to |
|-------|---------|
| `default` | `zinc-light` |
| `solarized` | `solarized-light` |
