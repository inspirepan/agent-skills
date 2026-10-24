---
name: show-me
description: Explain code, architecture, algorithms, or proposed changes using a focused visual such as a call tree, type sketch, structural diff, or Mermaid diagram. Use when the user asks to see how something works or a visual would make an explanation substantially clearer.
license: Apache-2.0
---

# Show me

Choose the smallest view that answers the user's question. Lead with the takeaway, put the visual beside its explanation, and omit unrelated structure. A single view is often enough.

## Choose a view

| Question | Useful view |
| --- | --- |
| What happens, in what order? | Call tree or sequence diagram |
| Who owns what? | Shallow file tree or component tree |
| What data crosses this boundary? | Type signature, JSON example, or endpoint shape |
| How does the algorithm work? | Pseudocode or state diagram |
| What changes? | Focused structural diff |
| How do the alternatives compare? | Small table or side-by-side sketches |

For current implementation, inspect the relevant code and cite real paths or symbols. Label proposed structures, simplified sketches, and assumptions. Never present an invented call graph as observed behavior.

## Keep the view focused

- Include only the calls, fields, files, states, and boundaries needed for the point.
- In a tree, annotate responsibility rather than repeating filenames in prose.
- In a component tree, show state ownership and hooks only when they explain behavior.
- Use Mermaid for relationships or ordering that a text tree cannot express clearly. Prefer simple labels and avoid decorative styling.
- Use a full target block when most of the structure is new or the user needs a copyable result.
- Use a diff when unchanged context is necessary to understand a change. Explain that structural diffs are sketches, not executable patches.

For example, a retry design can be shown as a structural sketch:

```diff
 handleFailure
-  markFailed
+  classifyFailure
+  if retryable && attempts < limit
+    scheduleRetry
+  else
+    markFailed
```

A current call flow can be shown with one responsibility per branch:

```text
submitRequest
  validateInput        # rejects malformed requests
  saveJob              # persists work before dispatch
  notifyWorker         # makes the job available to a worker
```

## Deliver in the available medium

Prefer fenced text, code, tables, and Mermaid directly in the response. Link to real files using the host's supported file-link format.

If an interactive or spatial explanation materially helps, use the available visualization tools or a standalone HTML file in the session scratch directory. Use the user's requested destination for saved deliverables. Do not require any application-specific renderer, custom artifact fence, cloud service, or additional skill.

Do not edit product code to produce an explanation. Save a durable visualization only when requested or clearly useful to the task. Keep simple factual answers simple.
