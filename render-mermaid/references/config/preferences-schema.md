---
name: preferences-schema
description: EXTEND.md YAML schema for render-mermaid user preferences
---

# Preferences Schema

## Full Schema

```yaml
---
version: 1
theme: default                  # Mermaid official theme name
curve: basis                    # Flowchart curve style
background: "#ffffff"           # HTML/PNG wrapper background
scale: 2                        # Device scale factor for PNG (1, 2, or 3)
width: 2400                     # Viewport width in pixels
html_padding: 40                # Padding around diagram in HTML wrapper (pixels)
chrome_path: null                # Chrome/Chromium path override (null = auto-detect)
output_mode: script              # Default output mode: script | standalone
standalone_theme: default        # Mermaid theme for CDN fallback only
standalone_background: "#ffffff" # Background color for CDN fallback only
---
```

## Field Reference

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `version` | int | 1 | Schema version |
| `theme` | string | default | Mermaid official theme |
| `curve` | string | basis | Flowchart curve style |
| `background` | string | #ffffff | HTML/PNG wrapper background |
| `scale` | int | 2 | PNG scale factor |
| `width` | int | 2400 | Viewport width |
| `html_padding` | int | 40 | HTML wrapper padding |
| `chrome_path` | string | null | Chrome executable path |
| `output_mode` | string | script | Default mode: `script` or `standalone` |
| `standalone_theme` | string | default | Mermaid built-in theme for CDN fallback only |
| `standalone_background` | string | #ffffff | Background color for CDN fallback only |

## Available Themes

| Theme | Description |
|-------|-------------|
| `default` | Mermaid default light theme |
| `neutral` | Muted grayscale palette |
| `dark` | Mermaid dark theme |
| `forest` | Green-tinted palette |
| `base` | Minimal base theme |

## Available Curves

| Curve | Description |
|-------|-------------|
| `linear` | Straight segments |
| `basis` | Smooth basis spline |
| `bumpX` | Horizontal bump curve |
| `bumpY` | Vertical bump curve |
| `cardinal` | Cardinal spline |
| `catmullRom` | Catmull-Rom spline |
| `monotoneX` | Monotone curve in x direction |
| `monotoneY` | Monotone curve in y direction |
| `natural` | Natural cubic spline |
| `step` | Stepped line |
| `stepAfter` | Step-after line |
| `stepBefore` | Step-before line |

## Standalone HTML Themes (CDN Fallback)

Mermaid themes for CDN fallback (when deps not installed):

| Theme | Background | Description |
|-------|------------|-------------|
| `default` | `#ffffff` | Clean light theme |
| `dark` | `#1a1a2e` | Dark background |
| `neutral` | `#ffffff` | Muted grayscale |
| `forest` | `#ffffff` | Green-tinted palette |
| `base` | `#ffffff` | Minimal base theme |
