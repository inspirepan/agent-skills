# Prompting

Separate analysis from the final prompt. First identify goal, intended asset,
invariants, source/reference roles, and an appropriate model. Then write a
clean visual specification; do not include AI meta-instructions or provider
parameter choices in it.

For generation, include only relevant parts: asset type, scene, subject,
style, composition, lighting, palette, materials, exact text, constraints, and
negative constraints. Quote text as verbatim and state its placement and
typography. Refer to inputs as `Image 1` plus their role, for example
`Image 1 (style reference)`.

For edits, use preserve-then-change: state what must remain unchanged first,
then one requested change. Make invariants explicit (identity, pose, framing,
product geometry, logos, layout). Change one thing per iteration and match the
source's perspective, lighting, shadows, material, and physical contact.

Example:

```
Preserve Image 1 (source): the person's identity, pose, clothing, crop, and
lighting. Change only the jacket color to deep forest green. Match the existing
fabric texture, folds, highlights, and cast shadows. No other changes.
```