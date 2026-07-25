---
name: "image-gen"
description: "Use when the user asks to generate, edit, use reference images, or batch-create raster images with any gateway image model. Uses YOUTU_API_KEY and the bundled image-jobs CLI. Do not use for SVG, pure CSS/HTML graphics, or image analysis only."
license: "Apache License 2.0"
---

# Image Generation

Use the model-agnostic Youtu image-jobs gateway through `scripts/image_gen.py`.
It defaults to `gpt-image-2`, but supports any model exposed by the gateway.
Live requests require `YOUTU_API_KEY`; `YOUTU_BASE_URL` optionally replaces
`https://api.youtu.uk`. Run commands with `uv run`.

## When to use

- Create raster artwork, product images, covers, illustrations, or UI imagery.
- Edit an existing image, make a masked change, or combine HTTPS-hosted images.
- Make variants or a JSONL batch using a gateway image model.

## When not to use

- SVG/vector work, diagrams, simple CSS/HTML visuals, or native editable assets.
- Requests that only analyze, describe, or classify an image.

## Workflow

1. Decide whether the goal is **generate** (new asset or reference-guided asset) or
   **edit** (preserve an existing image while changing it). Use batch for
   distinct prompts. Use `--n` for variants only when the selected model
   supports it; some models fix the output count.
2. Ask only about ambiguity that materially changes the result: exact text,
   required invariants, intended use, or missing source image. Do not ask for
   routine details that can be reasonably inferred.
3. Respect a user-selected model. Otherwise apply the maintainable heuristics in
   `references/model-routing.md`. Run `models` when availability matters; a
   network query is not required for every job.
4. Analyze the request, then form one complete final prompt. Keep provider/model
   controls in CLI flags or `--param`, not in prose. If the prompt is already a
   complete spec, pass `--no-augment` to avoid double processing.
5. For input images, obtain gateway-downloadable HTTPS URLs first. A local path
   cannot be sent by this skill and must not be represented as uploaded. Label
   every URL with its role (`source`, `reference`, `mask`, `style`, `character`).
   Masks must be PNG.
6. Run `generate` or `edit`, save outputs deliberately, then read/inspect the
   generated images. The gateway can return more outputs than requested.
7. Iterate one factor at a time: change the prompt, a provider parameter, an
   input role, or the model, then inspect again.

See `references/cli.md` for commands, `references/prompting.md` for prompt
construction, and `references/gateway-api.md` for the stable gateway contract.
Read `references/sample-prompts.md` only when a concrete generation or edit
template would help form the final prompt.

## Basic commands

```bash
uv run scripts/image_gen.py models
uv run scripts/image_gen.py generate --prompt "Editorial photo of a red umbrella" --out output/umbrella
uv run scripts/image_gen.py edit --input source=https://cdn.example.com/photo.jpg --prompt "Replace only the sky with a clear dawn sky" --out output/edit
```

Use `--dry-run` to print the complete gateway payload without a key. Never put
API keys in a prompt, command output, or source file.