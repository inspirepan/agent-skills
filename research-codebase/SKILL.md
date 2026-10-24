---
name: research-codebase
description: Investigate how an existing codebase works by tracing source, callers, state changes, and tests, then produce an evidence-backed explanation or reusable research document. Use for codebase questions and research before design; do not turn a research-only request into implementation.
license: Apache-2.0
---

# Research a codebase

Build a reliable account of current behavior. Keep observed facts, inferences, and unanswered questions distinct. Match the depth to the question; a bounded lookup does not require a full report or separate research-planning phase.

## Select the context

1. Read applicable repository instructions and the user's named inputs. Preserve exact paths, symbols, dependency names, and links as investigation starting points.
2. Turn the request into a small set of questions about current behavior: entry points, ownership, contracts, state transitions, failure paths, or testing patterns.
3. A ticket may establish scope, but its requested behavior and suggested solution are not evidence of current behavior. If an explicit research-questions document exists, use it as the investigation boundary.
4. Read related task documents only when they answer a question or establish a relevant constraint. Do not load an entire task archive by default.

## Trace and verify

- Locate entry points, then follow the relevant call/data flow through its boundaries. Use targeted search before broad file reading.
- Inspect callers, configuration, schemas, and tests where they affect the answer. Read enough surrounding code to verify each claim; read a whole file when scattered context makes excerpts misleading.
- Separate a test assertion, a test you actually ran, and an inference from code. Do not describe inspection as successful execution.
- Record concrete evidence using real paths, symbols, and line references. Include the revision or working-tree scope when saving findings that may become stale.
- Verify unfamiliar external behavior against authoritative documentation when necessary. Local declarations or dependency names alone do not establish runtime behavior.
- If independent exploration would help and delegation is available and authorized, delegate bounded questions. Give each worker the question and relevant pointers, request evidence and unknowns, then reconcile its findings. Otherwise perform the same investigation directly; no special agent types are required.

## Synthesize a useful result

Explain the behavior as a connected account, organized by concepts or flow rather than a dump of search hits. Use a small call tree, contract sketch, or diagram when it clarifies the answer.

Include the constraints, existing test patterns, and genuinely unresolved questions that matter to the request. Do not invent a redesign, start editing implementation files, or add unsolicited recommendations to a research-only task. Diagnosis or recommendations explicitly requested by the user remain in scope; label them separately from observed facts.

Resolve important gaps with targeted follow-up investigation when feasible. Stop when the question is answered or remaining uncertainty is clearly identified; report blockers without inventing a conclusion.

## Save or revise findings

- A chat answer is sufficient for a small standalone question.
- For a requested report or an ongoing multi-stage task, reuse its established document location. If none exists, use `docs/tasks/<task-slug>/research.md` as a fallback, respecting repository conventions.
- Read [the report template](references/report-template.md) when creating a durable report. Keep only sections useful to this task; do not create empty companion documents.
- On revision, read the current report and feedback first. Recheck affected claims and update them in place rather than appending contradictory corrections. Preserve stable paths so later stages can keep referring to the document.

The final response should answer the question, link any saved report, and identify material uncertainty. Do not require fixed wording, a cloud permalink, or an automatic handoff to another skill.
