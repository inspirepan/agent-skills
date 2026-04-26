# Prompting best practices (GPT Image)

## Contents
- [Structure](#structure)
- [Specificity policy](#specificity-policy)
- [Allowed and disallowed augmentation](#allowed-and-disallowed-augmentation)
- [Avoiding “tacky” outputs](#avoiding-tacky-outputs)
- [Composition & layout](#composition--layout)
- [Constraints & invariants](#constraints--invariants)
- [Text in images](#text-in-images)
- [Input images and references](#input-images-and-references)
- [Iterate deliberately](#iterate-deliberately)
- [Quality vs latency](#quality-vs-latency)
- [Use-case tips](#use-case-tips)
- [Where to find copy/paste recipes](#where-to-find-copypaste-recipes)

## Structure
- Use a consistent order: scene/backdrop -> subject -> key details -> constraints -> output intent.
- Include intended use (ad, UI mock, infographic) to set the level of polish.
- For complex requests, use short labeled lines instead of a long paragraph.

## Specificity policy
- If the user prompt is already specific and detailed, normalize it into a clean spec without adding creative requirements.
- If the prompt is generic, you may add tasteful detail when it materially improves the output.
- Treat examples in `sample-prompts.md` as fully-authored recipes, not as the default amount of augmentation to add to every request.

## Allowed and disallowed augmentation

Allowed augmentation for generic prompts:
- composition and framing cues
- intended-use or polish-level hints
- practical layout guidance
- reasonable scene concreteness that supports the request

Do not add:
- extra characters, props, or objects that are not implied
- brand palettes, slogans, or story beats that are not implied
- arbitrary side-specific placement unless the surrounding layout supports it

## Visual specificity
- Name materials, textures, and visual medium (photo, watercolor, 3D render).
- For photorealism, include camera/composition language (lens, framing, lighting).
- Add targeted quality cues only when needed (film grain, textured brushstrokes, macro detail); avoid generic "8K" style prompts.

## Avoiding “tacky” outputs
- Don’t use vibe-only buzzwords (“epic”, “cinematic”, “trending”, “8k”, “award-winning”, “unreal engine”, “artstation”) unless the user explicitly wants that look.
- Specify restraint: “minimal”, “editorial”, “premium”, “subtle”, “natural color grading”, “soft contrast”, “no harsh bloom”, “no oversharpening”.
- For 3D/illustration, name the finish you want: “matte”, “paper grain”, “ink texture”, “flat color with soft shadow”; avoid “glossy plastic” unless requested.
- Add a short negative line when needed (especially for marketing art): “Avoid: stock-photo vibe; cheesy lens flare; oversaturated neon; excessive bokeh; fake-looking smiles; clutter”.

## Composition & layout
- Specify framing and viewpoint (close-up, wide, top-down) and placement only when it materially helps.
- Call out negative space if the asset clearly needs room for UI or copy.
- Avoid making left/right layout decisions unless the user or surrounding layout supports them.

## Constraints & invariants
- State what must not change ("keep background unchanged").
- For edits, say "change only X; keep Y unchanged" and repeat invariants on every iteration to reduce drift.

## Text in images
- Put literal text in quotes or ALL CAPS and specify typography (font style, size, color, placement).
- Spell uncommon words letter-by-letter if accuracy matters.
- For in-image copy, require verbatim rendering and no extra characters.

## Input images and references
- Do not assume that every provided image is an edit target.
- Label each image by index and role ("Image 1: edit target", "Image 2: style reference").
- If the user provides images for style, composition, or mood guidance and does not ask to modify them, treat the request as generation with references.
- If the user asks to preserve an existing image while changing specific parts, treat the request as an edit.
- For compositing, specify what moves where and what must remain unchanged.

## Iterate deliberately
- Start with a clean base prompt, then make small single-change edits.
- Re-specify critical constraints when you iterate.
- Prefer one targeted follow-up at a time over rewriting the whole prompt.

## Quality vs latency
- For latency-sensitive runs, start at `quality=low` and only raise it if needed.
- Use `quality=high` for text-heavy or detail-critical images.
- For strict edits (identity preservation, layout lock) on `gpt-image-1.5` / `gpt-image-1-mini`, consider `input_fidelity=high`. `gpt-image-2` always processes inputs at high fidelity and does not accept this parameter.

## Use-case tips
Generate:
- photorealistic-natural: Prompt as if a real photo is captured in the moment; use photography language (lens, lighting, framing); call for real texture (pores, wrinkles, fabric wear, imperfections); avoid studio polish or staging; use `quality=high` when detail matters.
- product-mockup: Describe the product/packaging and materials; ensure clean silhouette and label clarity; if in-image text is needed, require verbatim rendering and specify typography.
- ui-mockup: Describe a real product; focus on layout, hierarchy, and common UI elements; avoid concept-art language so it looks shippable.
- infographic-diagram: Define the audience and layout flow; label parts explicitly; require verbatim text; use `quality=high`.
- logo-brand: Keep it simple and scalable; ask for a strong silhouette and balanced negative space; avoid gradients and fine detail.
- illustration-story: Define panels or scene beats; keep each action concrete; for continuity, restate character traits and outfit each time.
- stylized-concept: Specify style cues, material finish, and rendering approach (3D, painterly, clay); add a short "Avoid" line to prevent tacky effects.
- historical-scene: State the location/date and required period accuracy; constrain clothing, props, and environment to match the era.

Edit:
- text-localization: Change only the text; preserve layout, typography, spacing, and hierarchy; no extra words or reflow unless needed.
- identity-preserve: Lock identity (face, body, pose, hair, expression); change only the specified elements; match lighting and shadows; use `input_fidelity=high` if likeness drifts (requires `gpt-image-1.5` — `gpt-image-2` is always high fidelity).
- precise-object-edit: Specify exactly what to remove/replace; preserve surrounding texture and lighting; keep everything else unchanged.
- lighting-weather: Change only environmental conditions (light, shadows, atmosphere, precipitation); keep geometry, framing, and subject identity.
- background-extraction: Request transparent background; crisp silhouette; no halos; preserve label text exactly; optionally add a subtle contact shadow. Requires `--model gpt-image-1.5` (or `gpt-image-1-mini`); `gpt-image-2` does not support transparent backgrounds.
- style-transfer: Specify style cues to preserve (palette, texture, brushwork) and what must change; add "no extra elements" to prevent drift.
- compositing: Reference inputs by index; specify what moves where; match lighting, perspective, and scale; keep background and framing unchanged.
- sketch-to-render: Preserve layout, proportions, and perspective; add plausible materials, lighting, and environment; "do not add new elements or text."

## Where to find copy/paste recipes
For copy/paste prompt specs (examples only), see `references/sample-prompts.md`. This file focuses on principles, structure, and iteration patterns.
