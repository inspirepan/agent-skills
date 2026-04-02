---
name: memory-files
description: CLAUDE.md, AGENTS.md, and auto memory file locations, discovery rules, and limits
---

# Memory Files Reference

Memory files provide persistent instructions loaded into every conversation.

## File Names

The following names are recognized (checked in order): `AGENTS.md`, `CLAUDE.md`, `AGENT.md`

## Discovery Locations

### User-level (global, all projects)

These directories are checked for memory files:
- `~/.claude/`
- `~/.codex/`
- `~/.klaude/`
- `~/.agents/`

Example: `~/.claude/CLAUDE.md` applies to all projects.

### Project-level (per repo)

These directories are checked, relative to both the working directory and git root (if different):
- `<dir>/`
- `<dir>/.claude/`
- `<dir>/.agents/`

Example: `<project>/.claude/AGENTS.md` applies only when working in that project.

### Auto memory (agent-managed)

Path: `~/.klaude/projects/<project_key>/memory/MEMORY.md`

The `project_key` is derived from the working directory's absolute path:
- Strip leading `/`
- Replace all `/` with `-`

Example: `/Users/alice/code/my-project` becomes `Users-alice-code-my-project`

Auto memory is managed by the agent's memory tool -- users typically don't edit it directly.

## Path Discovery (dynamic)

When the agent reads or edits a file, it walks every directory from the working directory down to the file's parent and checks each for `AGENTS.md`/`CLAUDE.md`/`AGENT.md`. Newly found files are loaded as context.

Example: reading `src/foo/bar.py` checks `src/AGENTS.md`, `src/foo/AGENTS.md`, etc.

This enables per-module instructions:

```
my-project/
  AGENTS.md                    # project-wide instructions
  src/
    AGENTS.md                  # src-specific instructions
    klaude_code/
      auth/
        AGENTS.md              # auth-module-specific instructions
```

## Limits

| Limit | Value |
|-------|-------|
| Max lines per `MEMORY.md` | 200 lines |
| Max bytes per memory file | 4096 bytes |

Files exceeding these limits are truncated with a note pointing to the full file path.

## Memory File Categories in System Prompt

| Source | Label |
|--------|-------|
| User-level (`~/.claude/`, etc.) | "user's private global instructions for all projects" |
| Project-level (work_dir, git root) | "project instructions, checked into the codebase" |
| Discovered near accessed path | "project instructions, discovered near last accessed path" |
| Auto memory (`MEMORY.md`) | "auto memory, persisted across sessions" |

## Best Practices

- Use `AGENTS.md` for project/module instructions that should be version-controlled.
- Use `~/.claude/CLAUDE.md` for personal preferences across all projects.
- Keep memory files concise -- they consume context window on every conversation.
- Use per-directory `AGENTS.md` for module-specific guidance (e.g., auth patterns, test conventions).
