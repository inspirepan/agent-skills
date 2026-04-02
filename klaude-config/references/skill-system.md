---
name: skill-system
description: Skill directories, priority, installation, SKILL.md format, and dynamic discovery
---

# Skill System Reference

Skills are `SKILL.md` files with YAML frontmatter that provide domain-specific instructions loaded into the system prompt on demand.

## Skill Directories

Listed from lowest to highest priority. Higher priority overrides lower when names collide.

### System skills (built-in)
- `~/.klaude/skills/.system/`
- Auto-installed from package assets on startup. Lowest priority.

### User skills
Checked in order (later directories override earlier ones with same skill name):
1. `~/.claude/skills/`
2. `~/.klaude/skills/`
3. `~/.agents/skills/`
4. `~/.config/agents/skills/`

### Project skills (highest priority)
Relative to working directory (and git root if different):
1. `./.claude/skills/`
2. `./.agents/skills/`

## Installing a Skill

Place a directory containing `SKILL.md` into any user or project skill directory:

```
~/.agents/skills/my-skill/SKILL.md        # user-level
./.claude/skills/my-skill/SKILL.md        # project-level
```

The directory name should match the `name` field in frontmatter.

## SKILL.md Format

```yaml
---
name: my-skill                    # must match directory name
description: >-                   # required; determines when agent loads the skill
  Use when the user asks to do X.
  Triggers: "keyword1", "keyword2".
license: MIT                      # optional
metadata:
  short-description: Brief label  # optional; shown in completions
allowed-tools:                    # optional; restrict available tools
  - Bash
  - Read
---

# Skill Title

Instructions in Markdown. This content is loaded into the system prompt
when the agent decides the skill is relevant.

## References

Link to files in references/ directory for detailed docs:
- [detailed-guide.md](references/detailed-guide.md)
```

### Frontmatter Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | no | Skill identifier. Defaults to directory name if omitted. |
| `description` | **yes** | Determines relevance. Include trigger words/phrases. |
| `license` | no | License identifier. |
| `metadata` | no | Key-value pairs. `short-description` used for completions. |
| `allowed-tools` | no | Restrict which tools the skill can use. |

## Dynamic Discovery

When the agent accesses files in nested project directories, it walks up from the file's directory toward the working directory and checks each ancestor for `.claude/skills/` and `.agents/skills/`. Newly found skills are loaded dynamically.

This means project subdirectories can define their own skills:

```
my-project/
  .claude/skills/top-skill/SKILL.md      # discovered at startup
  packages/api/
    .claude/skills/api-skill/SKILL.md    # discovered when agent reads files under packages/api/
```

When multiple nested directories define the same skill name, the deeper definition wins.

## Override Behavior

If two skills share the same `name`, the higher-priority level wins:
- Project skills override user skills
- User skills override system skills
- Within the same level, later directories override earlier ones

A warning is logged when duplicates are detected.

## References Directory Convention

Use a `references/` subdirectory for detailed documentation that the SKILL.md links to:

```
my-skill/
  SKILL.md              # concise entry point
  references/
    detailed-guide.md   # loaded on demand via Read tool
    api-reference.md
  scripts/
    helper.py           # bundled scripts
```

The agent reads reference files on demand -- they are not loaded into the system prompt automatically.
