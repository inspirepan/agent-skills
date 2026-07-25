# Model Routing

This is a heuristic, not a static model directory. Always respect a model the
user explicitly selected and run `models` when availability is uncertain.

- `gpt-image-2`: default for strict editing, identity, CJK, and exact text.
- `nano-banana-2-lite`: simple low-cost work when available.
- `nano-banana-2` and `nano-banana-pro`: use when the user explicitly chooses
  them; `nano-banana-2` is also useful when its 512 output is required.
- Luma: use for multi-image composition when the user explicitly chooses it.
- Midjourney: atmosphere and visual direction, not structural edits.
- Ideogram V4: new transparent-background logos, icons, and stickers; it does
  not support inputs. Use `gpt-image-2` for posters and text-heavy layouts.
- `ideogram-remove-background`: background removal.
- Seedream: extreme aspect ratios and high-resolution work.

Model routing is a request choice, not prompt content. Provider capabilities
and names evolve, so do not state unsupported settings as fact without checking
the current gateway model metadata.