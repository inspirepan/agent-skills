# Image Generation CLI

Run all examples as `uv run scripts/image_gen.py ...`. Live commands require
`YOUTU_API_KEY`; `YOUTU_BASE_URL` defaults to `https://api.youtu.uk`.

## Commands

```bash
uv run scripts/image_gen.py models [--all] [--json]
uv run scripts/image_gen.py generate --prompt TEXT [common options]
uv run scripts/image_gen.py edit --input ROLE=LOCAL_PATH --prompt TEXT [common options]
uv run scripts/image_gen.py generate-batch --batch-input jobs.jsonl --out-dir output [common options]
```

`models` shows image models by default. `--all` includes non-image models;
`--json` emits the filtered list (or the raw list shape with `--all`).

## Common options

`--model` defaults to `gpt-image-2.5-flare`. Use `--prompt` or `--prompt-file`.
Only explicit common controls enter the provider body: `--n`, `--size`,
`--quality`, `--aspect-ratio`, `--resolution`, `--background`, and
`--output-format`. OpenAI Images has no `aspect_ratio`/`resolution`, so for
`gpt-image*` models the CLI converts them into `size` (for example `16:9` +
`2K` becomes `2048x1152`, `adaptive` becomes `auto`); an explicit `--size` wins. Use `--param KEY=VALUE` repeatedly for provider controls;
VALUE is JSON-decoded when possible and dot paths construct objects. Use
`--body-json JSON_OR_@FILE` for an initial JSON object.

The CLI selects the OpenAI Images path for OpenAI-style providers and the
native `generateContent` path for known Gemini image model names. Use
`--request-path /path` for a newly added protocol or alias that the CLI does not
yet recognize; the path controls the provider protocol and must match the model.

Precedence is deterministic: `--body-json` < `--param` < explicit common flags
< final model and prompt. Within repeated `--param`, the last compatible value
wins; a scalar/object path conflict is rejected.

Prompt fields for optional structured augmentation are `--use-case`,
`--asset-type`, `--scene`, `--subject`, `--style`, `--composition`, `--lighting`,
`--palette`, `--materials`, `--text`, `--constraints`, and `--negative`.
Augmentation is on by default; use `--no-augment` when `--prompt` already holds
the final prompt specification.

Runtime and output controls are `--out`, `--out-dir`, `--force`, `--dry-run`,
`--timeout`, `--poll-interval`, `--request-timeout`, `--max-attempts`,
`--downscale-max-dim`, and `--downscale-suffix`. Batch additionally supports
`--concurrency` and `--fail-fast`.

Use repeated `--input` as JSON, `ROLE=LOCAL_PATH`, or `ROLE=HTTPS_URL`. Local
PNG/JPEG/WebP paths are the preferred form for edits and references. Shorthand
infers MIME type from `.png`, `.jpg`, `.jpeg`, or `.webp`. JSON can specify a
local `path` and `mimeType` explicitly:

```bash
--input 'source=./photo.jpg'
--input '{"role":"reference","path":"./look.webp","mimeType":"image/webp"}'
--input 'reference=https://cdn.example.com/look.webp'
--input '{"role":"mask","url":"https://cdn.example.com/mask.png","mimeType":"image/png"}'
```

Local files must exist, be no larger than 20 MiB, and be PNG, JPEG, or WebP.
Explicit URL schemes must use HTTPS. Before a live job, the CLI uploads local
inputs to `/image-inputs` and replaces each path with the returned HTTPS URL.
`edit` requires at least one local or HTTPS input.

## Model examples

```bash
# GPT Image
uv run scripts/image_gen.py generate --prompt "Studio product photo" --aspect-ratio 3:2 --resolution 2K
uv run scripts/image_gen.py generate --model gpt-image-2.5-sunburst --prompt "Campaign hero shot" --size 2400x1600

# Google: Nano Banana 2.1 with nested generateContent configuration
uv run scripts/image_gen.py generate --model nano-banana-2.1 --prompt "A small cabin in snow" \
  --param generationConfig.imageConfig.aspectRatio='"16:9"' \
  --param generationConfig.imageConfig.imageSize='"2K"' \
  --param 'generationConfig.responseModalities=["IMAGE"]'

# Google: multi-reference fusion with explicit thinking
uv run scripts/image_gen.py generate --model nano-banana-2.1 \
  --input reference=./product.jpg --input character=./person.png \
  --prompt "Show the person from Image 2 holding the product from Image 1; preserve both identities" \
  --param generationConfig.imageConfig.imageSize='"4K"' \
  --param generationConfig.thinkingConfig.thinkingLevel='"high"'

# Google: web and image search grounding
uv run scripts/image_gen.py generate --model nano-banana-2.1 \
  --prompt "Use search to create an accurate illustrated guide to the resplendent quetzal" \
  --param 'tools=[{"googleSearch":{"searchTypes":{"webSearch":{},"imageSearch":{}}}}]' \
  --param generationConfig.imageConfig.imageSize='"1K"'

uv run scripts/image_gen.py generate --model midjourney --prompt "Cinematic misty coast" \
  --param mj_model='"v8.2"' --param resolution='"hd"' --out output/coast
uv run scripts/image_gen.py generate --model ideogram-v4 --prompt "Poster reading verbatim: MINT TEA"
uv run scripts/image_gen.py generate --model doubao-seedream-5-0-pro-260628 --prompt "Wide architectural panorama" --aspect-ratio 21:9
```

See `model-routing.md` for Nano Banana 2.1 limits and model selection. The alias
`nano-banana-2.1` and canonical ID `gemini-nano-banana-2.1` both select
`/gemini/v1beta/models/gemini-nano-banana-2.1:generateContent`.
Omit thinking configuration to keep the model default; this CLI retains the
gateway's `generationConfig` contract, not the Interactions API format.
For a `512` output or an explicit Nano Banana 2 request, use `--model nano-banana-2`
with `--param generationConfig.imageConfig.imageSize='"512"'` when needed.
`nano-banana-latest` remains on Nano Banana 2.

## Outputs, dry run, and batch

`--out output/hero` writes one result as an extension inferred from MIME; many
outputs become `hero-1`, `hero-2`, etc. `--out-dir output` writes `image-1`,
`image-2`, etc. Existing files require `--force`. All gateway outputs download,
not just `n`. `--downscale-max-dim` needs Pillow (`uv add pillow` or
`uv run --with pillow ...`).

For batch, `--out-dir output` isolates each job under `output/job-001/`, then
uses `image-1`, `image-2`, and so on because the output count is not known
before a job finishes. Without `--out-dir`, every requested name receives a
job prefix such as `001-hero.png`, preventing derived multi-output names from
colliding across concurrent jobs.

```bash
uv run scripts/image_gen.py edit --input source=./item.jpg \
  --prompt "Change only the tabletop to walnut; preserve the item" --dry-run

cat > jobs.jsonl <<'EOF'
"A precise botanical illustration of a fern"
{"prompt":"Premium tea package", "model":"ideogram-v4", "out":"tea", "params":{"rendering_speed":"turbo"}}
{"prompt":"Use this composition", "inputs":[{"role":"reference","path":"./layout.png"}]}
EOF
uv run scripts/image_gen.py generate-batch --batch-input jobs.jsonl --out-dir output --concurrency 3
```

Dry-run checks that each local path is a file but does not read or upload its
bytes. Its JSON output includes an `uploads` plan. The nested job request uses
safe `https://image-input.invalid/...` placeholders instead of local paths.
Batch live uploads run inside each concurrent worker and follow `--fail-fast`.