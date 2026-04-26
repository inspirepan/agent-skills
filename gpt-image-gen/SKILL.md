---
name: "gpt-image-gen"
description: "Use when the user asks to generate or edit images via the OpenAI Image API (for example: generate image, edit/inpaint/mask, background removal or replacement, transparent background, product shots, concept art, covers, or batch variants); run the bundled CLI (`scripts/image_gen.py`) and require `OPENAI_API_KEY` for live calls."
license: "Apache License 2.0"
---


# Image Generation Skill

Generates or edits raster images for the current project (e.g., website assets, game assets, UI mockups, product mockups, wireframes, logo design, photorealistic images, infographics). Defaults to `gpt-image-2` and the OpenAI Image API through the bundled CLI for deterministic, reproducible runs.

## When to use
- Generate a new image (concept art, product shot, cover, website hero)
- Generate a new image using one or more reference images for style, composition, mood, or subject guidance
- Edit an existing image (inpainting, masked edits, lighting or weather transformations, background replacement, object removal, compositing, transparent background)
- Batch runs (many prompts, or many variants across prompts)

## When not to use
- Extending or matching an existing SVG/vector icon set, logo system, or illustration library inside the repo
- Creating simple shapes, diagrams, wireframes, or icons that are better produced directly in SVG, HTML/CSS, or canvas
- Making a small project-local asset edit when the source file already exists in an editable native format
- Any task where the user clearly wants deterministic code-native output instead of a generated bitmap

## Decision tree (generate vs edit vs batch)
Think about two separate questions: intent and execution strategy.

Intent:
- If the user wants to modify an existing image while preserving parts of it, treat the request as **edit**.
- If the user provides images only as references for style, composition, mood, or subject guidance, treat the request as **generate** with references.
- If the user provides no images, treat the request as **generate**.

Execution strategy:
- If the user needs many different prompts/assets, use **generate-batch**.
- If the user needs variants of one prompt, use `--n`.
- Otherwise, use **generate** or **edit** for a single asset.

Assume the user wants a new image unless they clearly ask to change an existing one.

## Workflow
1. Confirm the request calls for a generated raster image rather than repo-native SVG/vector/code output.
2. Decide intent: generate vs edit, and decide the execution strategy: single asset, variants with `--n`, or batch JSONL.
3. Collect inputs up front: prompt(s), exact text (verbatim), constraints/avoid list, and any input image(s)/mask(s).
4. For every input image, label its role explicitly: reference image, edit target, or supporting insert/style/compositing input.
5. If batch: write a temporary JSONL under `tmp/imagegen/` (one job per line), run once, then delete the JSONL.
6. Augment prompt into a short labeled spec (structure + constraints) without inventing new creative requirements.
7. Run the bundled CLI (`scripts/image_gen.py`) with sensible defaults (see `references/cli.md`).
8. For complex edits/generations, inspect outputs and validate: subject, style, composition, text accuracy, and invariants/avoid items.
9. Iterate with a single targeted change (prompt, mask, model, size, or quality), then re-check.
10. Save/return final outputs and note the final prompt + important flags used.

## Temp and output conventions
- Use `tmp/imagegen/` for intermediate files (for example JSONL batches); delete them when done.
- Write final artifacts under `output/imagegen/` when working in this repo.
- Use `--out` or `--out-dir` to control output paths; keep filenames stable and descriptive.
- Do not overwrite an existing asset unless the user explicitly asked for replacement; otherwise create a sibling versioned filename such as `hero-v2.png` or `item-icon-edited.png`.

## Dependencies (install if missing)
Prefer `uv` for dependency management.

Python packages:
```
uv add openai pillow
```

## Environment
- `OPENAI_API_KEY` must be set for live API calls.

If the key is missing, give the user these steps:
1. Create an API key in the OpenAI platform UI: https://platform.openai.com/api-keys
2. Set `OPENAI_API_KEY` as an environment variable in their system.
3. Offer to guide them through setting the environment variable for their OS/shell if needed.
- Never ask the user to paste the full key in chat. Ask them to set it locally and confirm when ready.

If installation isn't possible in this environment, tell the user which dependency is missing and how to install it locally.

## Defaults & rules
- Use `gpt-image-2` unless one of the model-selection rules below applies.
- Assume the user wants a new image unless they explicitly ask for an edit.
- Require `OPENAI_API_KEY` before any live API call.
- Use the OpenAI Python SDK (`openai` package) for all API calls; do not use raw HTTP.
- If the user requests edits, use `client.images.edit(...)` and include input images (and mask if provided).
- Prefer the bundled CLI (`scripts/image_gen.py`) over writing new one-off scripts.
- Never modify `scripts/image_gen.py`. If something is missing, ask the user before doing anything else.
- If the result isn't clearly relevant or doesn't satisfy constraints, iterate with small targeted prompt changes; only ask a question if a missing detail blocks success.

## Model selection
- Default: `gpt-image-2` — supports flexible image sizes and always processes image inputs at high fidelity. Explicit `WxH` sizes must have both width and height divisible by 16 (for example `2256x960`, not `2350x1000`). It does **not** support transparent backgrounds or the `input_fidelity` parameter.
- Fall back to `gpt-image-1.5` when the request needs a transparent background (the `background-extraction` use case) or explicit `input_fidelity` control. The CLI will refuse `--background transparent` on `gpt-image-2` and will drop `--input-fidelity` with a warning.
- Use `gpt-image-1-mini` when the user explicitly prefers a faster, cheaper run.

## Prompt augmentation
Reformat user prompts into a structured, production-oriented spec. Make the user's goal clearer and more actionable, but do not blindly add detail.

Specificity policy:
- If the user's prompt is already specific and detailed, preserve that specificity and only normalize/structure it.
- If the user's prompt is generic, add tasteful augmentation only when it materially improves output quality.

Allowed augmentations:
- composition or framing hints
- polish level or intended-use hints
- practical layout guidance
- reasonable scene concreteness that supports the stated request

Do not add:
- extra characters, props, or objects that are not implied by the request
- brand names, slogans, palettes, or narrative beats that are not implied
- arbitrary side-specific placement unless the surrounding layout supports it

## Use-case taxonomy (exact slugs)
Classify each request into one of these buckets and keep the slug consistent across prompts and references.

Generate:
- photorealistic-natural — candid/editorial lifestyle scenes with real texture and natural lighting.
- product-mockup — product/packaging shots, catalog imagery, merch concepts.
- ui-mockup — app/web interface mockups that look shippable.
- infographic-diagram — diagrams/infographics with structured layout and text.
- logo-brand — logo/mark exploration, vector-friendly.
- illustration-story — comics, children’s book art, narrative scenes.
- stylized-concept — style-driven concept art, 3D/stylized renders.
- historical-scene — period-accurate/world-knowledge scenes.

Edit:
- text-localization — translate/replace in-image text, preserve layout.
- identity-preserve — try-on, person-in-scene; lock face/body/pose.
- precise-object-edit — remove/replace a specific element (incl. interior swaps).
- lighting-weather — time-of-day/season/atmosphere changes only.
- background-extraction — transparent background / clean cutout. (Requires `--model gpt-image-1.5` since `gpt-image-2` does not support transparent output.)
- style-transfer — apply reference style while changing subject/scene.
- compositing — multi-image insert/merge with matched lighting/perspective.
- sketch-to-render — drawing/line art to photoreal render.

Quick clarification (augmentation vs invention):
- If the user says “a hero image for a landing page”, you may add *layout/composition constraints* that are implied by that use (e.g., “generous negative space on the right for headline text”).
- Do not introduce new creative elements the user didn’t ask for (e.g., adding a mascot, changing the subject, inventing brand names/logos).

Template (include only relevant lines):
```
Use case: <taxonomy slug>
Asset type: <where the asset will be used>
Primary request: <user's main prompt>
Input images: <Image 1: role; Image 2: role> (optional)
Scene/backdrop: <visual environment>
Subject: <main subject>
Style/medium: <photo/illustration/3D/etc>
Composition/framing: <wide/close/top-down; placement>
Lighting/mood: <lighting + mood>
Color palette: <palette notes>
Materials/textures: <surface details>
Quality: <low/medium/high/auto>
Input fidelity (edits): <low/high>
Text (verbatim): "<exact text>"
Constraints: <must keep/must avoid>
Avoid: <negative constraints>
```

Notes:
- `Scene/backdrop` is the visual setting in the prompt. It is not the same as the CLI/API `--background` parameter, which controls output transparency behavior.
- `Quality`, `Input fidelity`, masks, output format, and output paths are CLI/API execution controls. Use them as flags when needed, not as creative prompt content.

Augmentation rules:
- Keep it short.
- Add only the details needed to improve the prompt materially.
- Always classify the request into a taxonomy slug above and tailor constraints/composition/quality to that bucket. Use the slug to find the matching example in `references/sample-prompts.md`.
- If the user gives a broad request (e.g., "Generate images for this website"), use judgment to propose tasteful, context-appropriate assets and map each to a taxonomy slug.
- For edits, explicitly list invariants ("change only X; keep Y unchanged").
- If any critical detail is missing and blocks success, ask a question; otherwise proceed.

## Examples

### Generation example (hero image)
```
Use case: stylized-concept
Asset type: landing page hero
Primary request: a minimal hero image of a ceramic coffee mug
Style/medium: clean product photography
Composition/framing: centered product, generous negative space on the right
Lighting/mood: soft studio lighting
Constraints: no logos, no text, no watermark
```

### Edit example (invariants)
```
Use case: precise-object-edit
Asset type: product photo background replacement
Primary request: replace the background with a warm sunset gradient
Constraints: change only the background; keep the product and its edges unchanged; no text; no watermark
```

## Prompting best practices (short list)
- Structure prompt as scene/backdrop -> subject -> details -> constraints.
- Include intended use (ad, UI mock, infographic) to set the mode and polish level.
- Use camera/composition language for photorealism.
- Quote exact text and specify typography + placement.
- For tricky words, spell them letter-by-letter and require verbatim rendering.
- For multi-image inputs, reference images by index and describe how to combine them.
- For edits, repeat invariants every iteration to reduce drift.
- Iterate with single-change follow-ups.
- For latency-sensitive runs, start with quality=low; use quality=high for text-heavy or detail-critical outputs.
- For strict edits (identity/layout lock) on `gpt-image-1.5`/`gpt-image-1-mini`, consider input_fidelity=high. `gpt-image-2` always processes inputs at high fidelity and ignores this parameter.
- If results feel “tacky”, add a brief “Avoid:” line (stock-photo vibe; cheesy lens flare; oversaturated neon; harsh bloom; oversharpening; clutter) and specify restraint (“editorial”, “premium”, “subtle”).

More principles: `references/prompting.md`. Copy/paste specs: `references/sample-prompts.md`.

## Guidance by asset type
Asset-type templates (website assets, game assets, wireframes, logo) are consolidated in `references/sample-prompts.md`.

## CLI + environment notes
- CLI commands + examples: `references/cli.md`
- API parameter quick reference: `references/image-api.md`

## Reference map
- **`references/cli.md`**: how to *run* image generation/edits/batches via `scripts/image_gen.py` (commands, flags, recipes).
- **`references/image-api.md`**: what knobs exist at the API level (parameters, sizes, quality, background, edit-only fields).
- **`references/prompting.md`**: prompting principles (structure, constraints/invariants, iteration patterns).
- **`references/sample-prompts.md`**: copy/paste prompt recipes (generate + edit workflows; examples only).
