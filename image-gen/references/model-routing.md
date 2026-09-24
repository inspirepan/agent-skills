# Model Routing

This is a heuristic aligned with image-playground, not a static model
directory. Run `models` when availability is uncertain; provider capabilities
change, so check gateway metadata before stating a setting as fact.

## Priority

1. A model the user names.
2. A specialized route below.
3. The complexity default.

A provider refusal on allowed content is a routing event: retry on up to two
other capable models instead of rewording the same request repeatedly.

## Complexity default

- `nano-banana-2-lite`: fast, low-cost draft path for a clearly simple,
  single-subject image with no in-image text, no real brand or product, no
  transparent background, and no complex composition.
- `gpt-image-2.5-flare` (CLI default): everything else, including
  multi-subject or narrative scenes, photorealism, named brands, real places and
  products, exact or CJK text, posters, typographic layouts, infographics,
  identity preservation, packaging, and complex edits. Treat uncertain work as
  complex.

## Specialized routes

- `gpt-image-2.5-sunburst`: premium precision tier for production campaign
  creative, polished product imagery, or a demanding edit that keeps missing fine
  detail. It is slower than Flare, so do not spend it on work Flare covers.
- Midjourney (`midjourney-v8-2`, `midjourney-niji-7`): mood, vibe, and
  aesthetic exploration. Avoid it for named real-world subjects, heavy text,
  identity-locked edits, infographics, structural edits, or strict deliverables.
  For tileable patterns prefer `midjourney-v8-2` with `--tile` in the prompt.
  One task returns four images; prompts are capped at 1024 characters.
- Transparent logos, icons, stickers, badges, and cutouts: this is a prompt
  instruction, not a model switch. Use `gpt-image-2.5-flare` with
  `on a transparent background, no scene, no backdrop` in the prompt and PNG
  output. If the result is still opaque, run `ideogram-remove-background` on it.
  Never send transparent work to `nano-banana-2-lite`, Midjourney, or Seedream.
- `ideogram-remove-background`: cutting a subject out of an existing image;
  exactly one `source` input.
- Seedream: do not pick proactively, except for an extreme aspect ratio (such as
  1:4, 4:1, 1:8, 8:1) or ultra-high resolution, where it wins regardless of
  complexity. `doubao-seedream-4-5` supports 2K/4K and the widest ratio set.
- `nano-banana-2`: only when a `512` output is required or the user asks.

## Not selected proactively

`gpt-image-2`, `ideogram-v4`, `luma-uni-1`, `luma-uni-1-max`, `nano-banana-2`,
and `nano-banana-pro` are covered by Flare or `nano-banana-2-lite` at better
quality or cost. Use them when the user chooses them. For Luma prefer
`luma-uni-1-max`. `ideogram-v4` is text-to-image only at 2K and must not receive
any input images.

## Sizes

All GPT Image models (`gpt-image-2`, `gpt-image-2.5-flare`,
`gpt-image-2.5-sunburst`) take `size`, not `aspect_ratio`. The CLI maps
`--aspect-ratio` + `--resolution` (1K/2K/4K) to the canonical table, for
example `16:9` → `1280x720` / `2048x1152` / `3840x2160`; `adaptive` sends
`size: auto`. Edges are multiples of 16, ratios at most 3:1, and the long edge
is at most 3840. Nano Banana uses
`generationConfig.imageConfig.aspectRatio/imageSize` through `--param`.
