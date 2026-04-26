# Image API quick reference

## Endpoints
- Generate: `POST /v1/images/generations` (`client.images.generate(...)`)
- Edit: `POST /v1/images/edits` (`client.images.edit(...)`)

## Models
- Default: `gpt-image-2` (snapshot `gpt-image-2-2026-04-21`). State-of-the-art quality, supports flexible image sizes, always processes image inputs at high fidelity. Does **not** support transparent backgrounds or the `input_fidelity` parameter.
- `gpt-image-1.5`: required when you need a transparent background (`background: "transparent"`) or explicit `input_fidelity` control.
- `gpt-image-1-mini`: faster, lower-cost generation.

## Core parameters (generate + edit)
- `prompt`: text prompt
- `model`: image model
- `n`: number of images (1-10)
- `size`:
  - `gpt-image-2`: explicit `WxH` resolution with both width and height divisible by 16, or `auto`. Outputs larger than `2560x1440` (3,686,400 total pixels) are considered experimental.
  - `gpt-image-1.5` / `gpt-image-1` / `gpt-image-1-mini`: `1024x1024`, `1536x1024`, `1024x1536`, or `auto`.
- `quality`: `low`, `medium`, `high`, or `auto`
- `background`: `transparent`, `opaque`, or `auto` (transparent requires `png`/`webp`; not supported on `gpt-image-2`)
- `output_format`: `png` (default), `jpeg`, `webp`
- `output_compression`: 0-100 (jpeg/webp only)
- `moderation`: `auto` (default) or `low`

Parameter notes:
- Use explicit `size` values that match the destination asset instead of generating square images by habit.
- For `gpt-image-2`, round requested dimensions to nearby 16-multiples before calling the API (for example `2256x960`, not `2350x1000`).
- The prompt's visual `Scene/backdrop` is not the same as `background`; `background` controls transparency behavior only.
- Keep execution controls (`quality`, `size`, `background`, `output_format`, `input_fidelity`) in CLI flags or JSONL fields rather than burying them as creative prose.

## Edit-specific parameters
- `image`: one or more input images (first image is primary)
- `mask`: optional mask image (same size, alpha channel required)
- `input_fidelity`: `low` (default) or `high`.
  - Not supported on `gpt-image-2`; the model always processes inputs at high fidelity automatically (edit requests with reference images may use more input tokens as a result).
  - On `gpt-image-1.5` / `gpt-image-1-mini`, set to `high` if the user needs a very specific edit and the default `low` isn't enough.

## Output
- `data[]` list with `b64_json` per image
- The bundled CLI decodes `b64_json` and writes output files for you.

## Limits & notes
- Input images and masks must be under 50MB.
- Use edits endpoint when the user requests changes to an existing image.
- Masking is prompt-guided; exact shapes are not guaranteed.
- Large sizes and high quality increase latency and cost.
- For fast iteration or latency-sensitive runs, start with `quality=low`; raise to `high` for text-heavy or detail-critical outputs.
- Use `input_fidelity=high` for strict edits (identity preservation, layout lock, or precise compositing) on `gpt-image-1.5` / `gpt-image-1-mini`. `gpt-image-2` ignores this parameter — it is always high fidelity.
