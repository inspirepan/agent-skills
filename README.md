# Agent Skills

Locally authored skills and maintained adaptations for klaude, Codex, Claude Code, and other agents supported by [Vercel Skills](https://github.com/vercel-labs/skills).

## Scope

- `commit`, `image-gen`, `klaude-config`, `klaude-session-logs`, `render-mermaid`.
- HumanLayer adaptations: `show-me`, `research-codebase`, `design-outline`, `implement-outline`.
- Third-party skills without a maintained local adaptation are installed directly from upstream. Personal dotfiles track sources and enable lists; do not vendor copies here.

## Install

```bash
npx skills add inspirepan/agent-skills --list
npx skills add inspirepan/agent-skills --global --agent codex claude-code --skill commit klaude-config research-codebase design-outline implement-outline show-me
```

Update installed skills from upstream with `npx skills update -g -y`.

Each top-level directory is an independent skill with `SKILL.md` (`name` and `description` frontmatter). Keep references and scripts inside that directory. Vercel installs canonical global content under `~/.agents/skills/`; klaude reads that directory without a separate installer or bundled copy.

Check existing same-name skills before installing: the CLI can replace targets. Personal dotfiles apply their own non-overwrite preflight and maintain the enable list without pinning commits; this repository contains no device-specific installation state.

For local discovery before publishing:

```bash
npx skills add . --list
```

Source attribution and licenses: [SOURCES.md](SOURCES.md).
