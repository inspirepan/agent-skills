# CLI reference (`scripts/image_gen.py`)

This file contains the “command catalog” for the bundled image generation CLI. Keep `SKILL.md` as overview-first; put verbose CLI details here.

## What this CLI does
- `generate`: generate new images from a prompt
- `edit`: edit an existing image (optionally with a mask) — inpainting / background replacement / “change only X”
- `generate-batch`: run many jobs from a JSONL file (one job per line)

Real API calls require **network access** + `OPENAI_API_KEY`. `--dry-run` does not.

## Quick start
From this repository, set a stable path to the skill CLI:

```
export IMAGE_GEN="$PWD/gpt-image-gen/scripts/image_gen.py"
```

If the skill is installed elsewhere, point `IMAGE_GEN` at that installed `scripts/image_gen.py` instead.

Dry-run (no API call; no network required; does not require the `openai` package):

```
uv run python "$IMAGE_GEN" generate --prompt "Test" --dry-run
```

Generate (requires `OPENAI_API_KEY` + network):

```
uv run --with openai python "$IMAGE_GEN" generate --prompt "A cozy alpine cabin at dawn" --size 1024x1024
```

## Guardrails (important)
- Use `uv run --with openai python "$IMAGE_GEN" ...` (or an equivalent repo-approved uv environment) for generations/edits/batch work.
- Do **not** create one-off runners (e.g. `gen_images.py`) unless the user explicitly asks for a custom wrapper.
- **Never modify** `scripts/image_gen.py`. If something is missing, ask the user before doing anything else.
- Use `--out` or `--out-dir` for project-bound assets. Keep filenames stable and descriptive.

## Defaults (unless overridden by flags)
- Model: `gpt-image-2`
- Size: `1024x1024`
- Quality: `auto`
- Output format: `png`
- Background: unspecified (API default). If you set `--background transparent`, also set `--output-format png` or `webp`. Transparent is **not** supported on `gpt-image-2` — use `--model gpt-image-1.5`.

## Size guidance
- For `gpt-image-2` (default), use an explicit `WxH` size that matches the target asset, or `auto`.
- For `gpt-image-2`, both width and height must be divisible by 16. Round requested dimensions to nearby 16-multiples before calling the API (for example `2256x960`, not `2350x1000`).
- Outputs above `2560x1440` total pixels are experimental and may be slower or less predictable.
- For older GPT Image models, use `1024x1024`, `1536x1024`, `1024x1536`, or `auto`.
- Pick aspect ratio from the destination: hero/banner often wants wide, mobile/card art often wants portrait, icons/textures often want square.

## Quality + input fidelity
- `--quality` works for `generate`, `edit`, and `generate-batch`: `low|medium|high|auto`.
- `--input-fidelity` is **edit-only**: `low|high` (use `high` for strict edits like identity or layout lock).
  - Not supported on `gpt-image-2` — the CLI drops the flag with a warning; that model always processes inputs at high fidelity.
  - Use `gpt-image-1.5` / `gpt-image-1-mini` if you need to control this.

Example:
```
uv run --with openai python "$IMAGE_GEN" edit --image input.png --prompt "Change only the background" --quality high --input-fidelity high
```

## Masks (edits)
- Use a **PNG** mask; an alpha channel is strongly recommended.
- The mask should match the input image dimensions.
- In the edit prompt, repeat invariants (e.g., “change only the background; keep the subject unchanged”) to reduce drift.

## Optional deps
Prefer `uv run --with ...` for an out-of-the-box run without changing the current project env; otherwise install into your active env:

```
uv add openai
```

## Common recipes

Generate + also write a downscaled copy for fast web loading:

```
uv run --with openai --with pillow python "$IMAGE_GEN" generate \
  --prompt "A cozy alpine cabin at dawn" \
  --size 1024x1024 \
  --downscale-max-dim 1024
```

Notes:
- Downscaling writes an extra file next to the original (default suffix `-web`, e.g. `output-web.png`).
- Downscaling requires Pillow (use `uv run --with pillow ...` or install it into your env).

Generate with augmentation fields:

```
uv run --with openai python "$IMAGE_GEN" generate \
  --prompt "A minimal hero image of a ceramic coffee mug" \
  --use-case "product-mockup" \
  --style "clean product photography" \
  --composition "wide product shot with usable negative space for page copy" \
  --constraints "no logos, no text"
```

Generate multiple prompts concurrently (async batch):

```
mkdir -p tmp/imagegen
cat > tmp/imagegen/prompts.jsonl << 'EOF'
{"prompt":"Cavernous hangar interior with a compact shuttle parked center-left, open bay door","use_case":"game concept art environment","composition":"wide-angle, low-angle, cinematic framing","lighting":"volumetric light rays through drifting fog","constraints":"no logos or trademarks; no watermark","size":"1536x1024"}
{"prompt":"Gray wolf in profile in a snowy forest, crisp fur texture","use_case":"wildlife photography print","composition":"100mm, eye-level, shallow depth of field","constraints":"no logos or trademarks; no watermark","size":"1024x1024"}
EOF

uv run --with openai python "$IMAGE_GEN" generate-batch --input tmp/imagegen/prompts.jsonl --out-dir output/imagegen/batch --concurrency 5

# Cleanup (recommended)
trash tmp/imagegen/prompts.jsonl
```

Notes:
- Use `--concurrency` to control parallelism (default `5`). Higher concurrency can hit rate limits; the CLI retries on transient errors.
- Per-job overrides are supported in JSONL (e.g., `size`, `quality`, `background`, `output_format`, `output_compression`, `moderation`, `n`, `model`, `out`, and prompt-augmentation fields).
- `--n` generates multiple variants for a single prompt; `generate-batch` is for many different prompts.
- Treat the JSONL file as temporary: write it under `tmp/` and delete it after the run (don’t commit it).

Edit:

```
uv run --with openai python "$IMAGE_GEN" edit --image input.png --mask mask.png --prompt "Replace only the background with a warm sunset; keep the subject unchanged"
```

## CLI notes
- Supported sizes:
  - `gpt-image-2` (default): explicit `WxH` resolution with both dimensions divisible by 16, or `auto`. Outputs above `2560x1440` total pixels are considered experimental by the API.
  - `gpt-image-1.5` / `gpt-image-1` / `gpt-image-1-mini`: `1024x1024`, `1536x1024`, `1024x1536`, or `auto`.
- Transparent backgrounds require `output_format` to be `png` or `webp`, and are only supported on `gpt-image-1.5` / `gpt-image-1-mini` — not `gpt-image-2`.
- Default output is `output.png`; multiple images become `output-1.png`, `output-2.png`, etc.
- Use `--no-augment` to skip prompt augmentation.
- The prompt's visual `Scene/backdrop` is not the same as the API/CLI `--background` parameter. Use `--background` only for output transparency behavior.

## See also
- API parameter quick reference: `references/image-api.md`
- Prompt examples: `references/sample-prompts.md`
