# Design and outline shapes

Keep documents concise and use the user's language and established format. Omit sections that do not help the task. The examples show structure, not mandatory wording.

## Design

```markdown
# <Change>

## Confirmed design

1. Goal and user-visible result.
2. Relevant constraints and decided behavior.
3. Key interface or ownership change, if needed.

## Pending / 待确认

- The unresolved choice, relevant options, and a labeled recommendation.
- Do not repeat pending proposals as settled behavior above.

## Out of scope / 本期不做

- Explicit exclusions relevant to the request.

## Context pointers

- Research, current source symbols, and confirmed decisions needed downstream.
```

## Implementation outline

```markdown
# <Implementation result>

## Goal and decision baseline

- Desired behavior and relevant constraints.
- Design/research paths and the decisions this outline implements.
- Blocking unresolved choices, if any.

## Progress

- [ ] Phase 1: <observable result>
- [ ] Phase 2: <observable result>

## Phase 1: <observable result>

### Scope and code shape

Describe the result, affected responsibilities, and important signatures
or contracts. Include one compact tree or example when useful.

### Verification

- [ ] <actual automated command or behavioral check>
- [ ] <manual check only if human judgment is needed>

### Results and deviations

Record actual results during implementation. Leave unchecked work explicit;
do not prefill success or fabricate approvals.

## Handoff

- Completed and verified:
- Outstanding or blocked:
- Next phase/action:
- Relevant code and document pointers:
```

Repeat the phase section only as needed. A successful command checks that command's item; a phase is complete only when its required outcomes and checks are satisfied. Record intentionally waived checks and who authorized the waiver instead of marking them as passed.
