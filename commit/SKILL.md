---
name: commit
description: Use this skill when the user asks to commit, save, or persist their code changes to version control and describe current changes.
metadata:
  short-description: Commit current changes
---

1. Inspect the current state before making decisions:
   - Run `jj status`.
   - Run `jj log -n 5`.
   - Run `jj diff --git`.
2. If there are no file changes, report that there is nothing to commit.
3. Choose the commit boundary in this order:
   - If the current conversation clearly completed one requirement, treat that requirement as the commit boundary.
   - Otherwise, if this is a fresh conversation or the conversation boundary is unclear, infer one cohesive feature from the diff and use that as the commit boundary.
   - Prefer non-interactive, path-based splitting with `jj split <filesets...>`.
   - If a file contains changes for multiple boundaries, use `jj-hunk` to select stable hunk IDs non-interactively. Do not edit and later restore the working-copy file just to split it.
   - Do not guess when two boundaries overlap inside one indivisible hunk. Ask one short question instead of silently assigning it.
4. Draft a Conventional Commit message for the selected boundary:
   - Subject: `<type>(<scope>): <summary>`
   - Blank line
   - Bulleted details for important file-level edits
   - For prompt engineering files (SKILL.md, AGENTS.md, CLAUDE.md, Skillfile, system-prompt-*.md, etc.), use a type that reflects the actual impact (`feat`, `refactor`, `fix`, etc.) instead of `docs`. These files define agent behavior and are functional changes, not documentation.
5. If the working copy contains only that one cohesive change, commit it directly:

```bash
jj describe -m "type(scope): short summary

- key change 1
- key change 2" && jj new
```

6. If the working copy contains the selected change plus other edits, split it non-interactively so the history stays linear:
   - If every changed file belongs wholly to one boundary, select only the filesets for the finished requirement or inferred feature and run:

```bash
jj split <fileset1> <fileset2> ... -m "type(scope): short summary

- key change 1
- key change 2"
```

   - Default `jj split` behavior is required here: the selected changes stay in the older commit, and the remaining changes stay in the current working-copy child. This should produce a linear stack where `@-` is the commit you just described and `@` is the leftover work.
   - If the remaining `@` commit keeps an old description that no longer matches the leftover changes, clear it with `jj describe -r @ -m ""`.
7. If any file contains mixed changes, use the `jj-hunk` diff-editor hook:
   - Check for `jj-hunk`; install it once with `cargo install jj-hunk` if missing. Verify with `jj-hunk --help`. If Cargo is unavailable, report the dependency blocker rather than falling back to edit-and-restore patch surgery.
   - Run `jj-hunk list --format json`, optionally with `--include '<path>'`, immediately before splitting. Read each hunk's `added`, `removed`, and context, then select stable `hunk-<sha256>` IDs. Prefer IDs over numeric indices because IDs remain unambiguous while constructing the selection.
   - Write a selection spec under `${TMPDIR:-/tmp}`. Mark whole files with `{"action": "keep"}`, select mixed-file hunks with `{"ids": [...]}`, and use `"default": "reset"` so all unlisted changes remain in the child commit:

```json
{
  "files": {
    "src/whole_file.py": {"action": "keep"},
    "src/mixed_file.py": {
      "ids": ["hunk-0123456789abcdef..."]
    }
  },
  "default": "reset"
}
```

   - Invoke jj's diff-editor protocol directly. This avoids relying on the `jj-hunk split` convenience wrapper, which may omit the `select` subcommand with some jj/jj-hunk version combinations:

```bash
spec="${TMPDIR:-/tmp}/jj-hunk-selection.json"
JJ_HUNK_SELECTION="$spec" jj \
  --config 'merge-tools.jj-hunk.program="jj-hunk"' \
  --config 'merge-tools.jj-hunk.edit-args=["select", "$left", "$right"]' \
  split -i --tool=jj-hunk -m "type(scope): short summary

- key change 1
- key change 2"
```

   - This hook edits jj's temporary left/right snapshots, not the working-copy file. If the command fails, run `jj status` before retrying; do not assume it mutated the revision.
8. When the conversation already narrowed the scope, prefer committing only the files changed for this conversation's requirement and leave unrelated pre-existing work in `@`.
9. When this is a new conversation, proactively group the diff by feature and peel off the most cohesive feature first. Create one clean commit per invocation unless the user explicitly asks for multiple commits.
10. Verify the result after any commit or split:
   - Run `jj log -n 5` and confirm the history is linear.
   - The older change should be the described commit for the finished requirement or selected feature.
   - The current `@` change should contain only the remaining, still-undescribed edits.
   - Run `jj diff --git` again to confirm the leftover diff matches that expectation.
   - For hunk-based splits, also run `jj diff -r @- --git <mixed-files...>` to verify that only the selected hunks entered the older commit.
11. In the final response, state:
   - The commit message used.
   - Whether you used `jj describe && jj new`, path-based `jj split`, or the `jj-hunk` diff-editor hook.
   - Which files or filesets were committed.
   - What remains in the current working copy, if anything.
