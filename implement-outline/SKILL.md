---
name: implement-outline
description: Implement or resume an existing phased outline, verify each authorized phase, and write progress and material deviations back to the document. Use when the user asks to execute a plan or outline; do not treat review or planning feedback as permission to implement.
license: Apache-2.0
---

# Implement an outline

Use the outline as a persistent execution guide. Keep the current phase focused while retaining the design constraints that affect it. No special tools, agent roles, or companion skills are required.

## Establish the execution boundary

1. Locate the outline named by the user or clearly associated with the current task. Follow repository conventions; `docs/tasks/<task-slug>/outline.md` is only a fallback. Ask for selection if multiple candidates are genuinely ambiguous; do not guess from an unrelated task.
2. Read its goal, decisions, progress, and authorized phases. Read companion design/research sections and relevant code where they affect those phases. Do not load the whole task archive by default.
3. Honor the user's requested scope: one phase, a named range, or the full outline. When the user asks to implement the outline without narrowing scope, work through its remaining phases. A request only to review or revise the plan does not authorize code edits.
4. Use the latest explicit user direction and confirmed outline/design. Unresolved proposals do not override confirmed decisions. Check whether current code still matches the assumptions behind the next phase.

## Execute and verify each phase

- Find the first incomplete phase in scope. Use prior results as context, but cheaply recheck prerequisites when later code changes may have invalidated them.
- Implement the observable result with the repository's normal tools and conventions. The outline describes intent and important seams; it need not prescribe every line of code.
- Run the relevant checks from the outline and required repository instructions. Adapt obsolete commands to the actual environment and record that adjustment. Add meaningful tests when warranted by the behavior and repository expectations, not simply to mirror the implementation.
- Fix failures caused by the changes within scope. Distinguish pre-existing failures, missing dependencies, unavailable services, and checks not run from passing verification.
- Write progress back to the outline: completed behavior, checks actually passed, material deviations, and outstanding validation. Check off the phase only when all required outcomes and checks are satisfied. Required human verification stays pending until the user confirms it or explicitly waives it.
- Continue to the next authorized phase after successful checks. Do not impose a pause after every phase when the user authorized continuous implementation.

## Handle mismatches proportionally

For a routine implementation detail, make the supported choice and update the outline if the difference matters. For stale documentation, correct the affected description from evidence.

If a mismatch requires a consequential unapproved behavior change, conflicts with user intent, or blocks correctness, explain the expected behavior, the observed facts, and the concrete decision needed. Ask for that decision and continue independent work if possible. Do not silently redesign the task or repeatedly ask about choices already authorized.

Do not commit, push, publish, or create a worktree merely because a phase ended. Do those actions only when authorized by the user or applicable task instructions.

## Optional delegation and handoff

Delegate only when available and authorized, and when an independent bounded task would help. Direct execution is the default fallback. Never require named external agent types or assume subagent creation is always permitted.

A useful handoff is short:

```text
Implement Phase 2 from <outline path>.
Relevant background: <design/research paths and applicable sections>.
Constraints: <confirmed decisions that govern this phase>.
Scope: Phase 2 only; run its checks and report evidence and deviations.
```

Let a delegate read the referenced material rather than copying whole documents into the prompt. Give concurrent workers separate ownership or have only the coordinator update the shared outline to avoid conflicting progress edits. Reconcile their results before treating a phase as complete.

Before switching sessions, update the outline's handoff with verified progress, open failures, necessary decisions, and the exact next action. Do not rely on the next session having the chat history.

Finish with what changed, what was verified, remaining limitations, and the outline path. Report partial completion as partial; never infer successful human validation from silence.
