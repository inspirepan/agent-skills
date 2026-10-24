---
name: design-outline
description: Turn a change request and codebase evidence into a concise design and a phased, verifiable implementation outline, or revise those documents after feedback. Use when design choices or implementation structure need review; a planning request alone does not authorize code changes.
license: Apache-2.0
---

# Design and outline a change

Produce the design or outline the user needs. Do not require research, design, and planning ceremonies for a small settled change. If the user asks only for design, stop at design; if they ask for an outline, create the outline from available evidence and confirmed choices.

## Read the decision context

- Read repository instructions, the user's request, and named inputs. Inspect relevant research, current design, and affected code as needed.
- Use completed research for current-system findings. A separate research-question list is optional context only when gaps remain.
- Recheck source where a design depends on a stale or uncertain finding. Distinguish current behavior from the desired result.
- Reuse an existing task location. Otherwise use `docs/tasks/<task-slug>/design.md` and `outline.md` for durable deliverables, subject to repository conventions. Do not create documents that the task does not need.

## Make choices explicit

Keep the confirmed design trunk concise: goal, relevant constraints, decided behavior, and scope. Match the user's document style. Include only the detail needed for the decision or implementation boundary under discussion.

Put unsettled ideas and recommendations in a separate pending section (`待确认` when writing Chinese). Do not silently promote a recommendation to a confirmed choice or add speculative edge cases to the settled design. Explore alternatives only when they materially affect the result or the user asks for them.

For a consequential unresolved choice, give the user a concrete comparison and request the missing decision. Continue independent analysis while waiting. Make routine implementation choices within existing authorization, and do not ask again for an already clear decision.

Record a confirmed decision where it belongs, with a concise rationale when supplied or needed to explain a consequential tradeoff. Preserve a rejected alternative only when it prevents a likely misunderstanding. Mark excluded work as `本期不做` in Chinese documents.

## Shape a verifiable outline

Read [the document shapes](references/document-templates.md) when saving a design or outline. Adapt rather than fill every section mechanically.

For each phase, describe:

- The observable result and its scope.
- The affected responsibilities and important interfaces, data structures, or control flow. Prefer small trees, signatures, examples, or structural diffs to full implementations.
- Dependencies on earlier phases and any remaining blocker.
- Verification using the repository's actual commands and meaningful behavioral checks. Add manual checks only for outcomes requiring human judgment.

Prefer phases that deliver independently verifiable behavior across the necessary boundaries. Do not split mechanically into all schemas, then all services, then all tests when that postpones useful validation. Use a single phase when additional phases would only add ceremony.

Include phase and verification checkboxes to support resumption. Keep blocking choices visibly unresolved rather than hiding assumptions inside executable instructions.

## Preserve decision authority

The user's latest explicit direction controls the task. Among compatible, confirmed task documents, a current outline refines the design, and the design refines the original request. Drafts and unresolved proposals do not override confirmed decisions merely because they are newer. Source and tests establish current implementation behavior, not the authority of a proposed future design.

On feedback, update the existing document in place and recheck affected facts. Feedback on a design or outline authorizes revising that document; it does not by itself start implementation. If implementation was already explicitly authorized, preserve that authorization instead of adding a new approval gate.

Finish with the saved paths, material pending choices, and the next useful action. Do not invoke another skill, create a worktree, commit, or start implementation solely because the outline is complete.
