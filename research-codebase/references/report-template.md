# Research report shape

Use only the sections needed for an independently understandable account. Adapt headings and language to the user's preferences.

```markdown
# Research: <question or behavior>

## Scope and evidence baseline

- Questions investigated:
- Repository / revision or working-tree scope:
- Relevant starting paths and symbols:

## Findings

Explain the observed behavior, ownership, and data flow.
Attach source references to the claims they support.
Distinguish verified facts from inferences.

## Constraints and testing

- Relevant contracts, invariants, and failure behavior:
- Existing test locations and patterns:
- Checks actually run and their results, or state that this was inspection only:

## Open questions

List remaining investigative gaps and what evidence would resolve them.
Do not use this section as an unsolicited feature wishlist.

## Handoff

- Facts and constraints the next stage needs:
- Decisions, if explicitly made by the user:
- Relevant source and document pointers:
- Next investigation or design question:
```

Use a short summary before detailed findings for larger reports. Include an exact context pointer from the request when it remains relevant. Avoid reproducing complete transcripts, repeated tool output, or speculative implementation sections.
