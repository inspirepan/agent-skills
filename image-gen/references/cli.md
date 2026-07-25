# Image Generation CLI

Run all examples as `uv run scripts/image_gen.py ...`. Live commands require
`YOUTU_API_KEY`; `YOUTU_BASE_URL` defaults to `https://api.youtu.uk`.

## Commands

```bash
uv run scripts/image_gen.py models [--all] [--json]
uv run scripts/image_gen.py generate --prompt TEXT [common options]
uv run scripts/image_gen.py edit --input ROLE=HTTPS_URL --prompt TEXT [common options]
uv run scripts/image_gen.py generate-batch --batch-input jobs.jsonl --out-dir output [common options]
```

`models` shows image models by default. `--all` includes non-image models;
`--json` emits the filtered list (or the raw list shape with `--all`).

## Common options

`--model` defaults to `gpt-image-2`. Use `--prompt` or `--prompt-file`.
Only explicit common controls enter the provider body: `--n`, `--size`,
`--quality`, `--aspect-ratio`, `--resolution`, `--background`, and
`--output-format`. Use `--param KEY=VALUE` repeatedly for provider controls;
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

Use repeated `--input` as JSON or `ROLE=HTTPS_URL`. URL shorthand infers only
PNG/JPEG/WebP MIME types. JSON is required for other types:

```bash
--input 'reference=https://cdn.example.com/look.webp'
--input '{"role":"mask","url":"https://cdn.example.com/mask.png","mimeType":"image/png"}'
```

`edit` requires at least one input. Inputs remain in the same `/image-jobs`
generation request as ordinary generation; they are not local uploads.

## Model examples

```bash
# GPT Image
uv run scripts/image_gen.py generate --model gpt-image-2 --prompt "Studio product photo" --size 1536x1024

# Google: nested provider configuration
uv run scripts/image_gen.py generate --model nano-banana-2 --prompt "A small cabin in snow" \
  --param generationConfig.imageConfig.aspectRatio='"16:9"' \
  --param generationConfig.imageConfig.imageSize='"2K"' \
  --param 'generationConfig.responseModalities=["IMAGE"]'

uv run scripts/image_gen.py generate --model midjourney --prompt "Cinematic misty coast" \
  --param mj_model='"v8.1"' --param resolution='"sd"' --out output/coast
uv run scripts/image_gen.py generate --model ideogram-v4 --prompt "Poster reading verbatim: MINT TEA"
uv run scripts/image_gen.py generate --model doubao-seedream-5-0-pro-260628 --prompt "Wide architectural panorama" --aspect-ratio 21:9
```

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
uv run scripts/image_gen.py edit --input source=https://cdn.example.com/item.jpg \
  --prompt "Change only the tabletop to walnut; preserve the item" --dry-run

cat > jobs.jsonl <<'EOF'
"A precise botanical illustration of a fern"
{"prompt":"Premium tea package", "model":"ideogram-v4", "out":"tea", "params":{"rendering_speed":"turbo"}}
EOF
uv run scripts/image_gen.py generate-batch --batch-input jobs.jsonl --out-dir output --concurrency 3
```