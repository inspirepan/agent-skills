---
name: klaude-config
description: Reference for klaude-code configuration, skill installation, memory file locations, and the background-agent CLI. Use when the user asks about configuring models, installing skills, setting up providers, where config/skill/memory files live, or how klaude sessions talk to each other (run, ps, send, wait, attach, orchestrating background agents).
metadata:
  short-description: Config, skill, and CLI reference
---

# klaude-config

Quick reference for klaude-code's configuration system, skill management, memory files, and the background-agent command surface.

## Configuration

Config file: `~/.klaude/klaude-config.yaml`

```yaml
main_model: [gpt-5.5, gpt-5.4, opus] # fallback list; provider order is expanded first
fast_model: [gpt-5.4-nano, haiku]    # fallback list, first available wins
compact_model: [gemini-flash, sonnet:no-thinking]
sub_agent_models:
  finder: gpt-5.4-mini
  code-reviewer: opus
  code-maintenance-reviewer: sonnet
theme: dark
provider_list:
- provider_name: my-provider
  protocol: openai                  # required for non-builtin
  api_key: ${MY_API_KEY}            # ${ENV_VAR} resolved at runtime
  base_url: https://api.example.com/v1
  model_list:
  - model_name: my-model
    model_id: actual-model-id
    context_limit: 200000
```

Key points:
- `model@provider` pins to a specific provider; unqualified picks first with valid credentials.
- `main_model`, `fast_model`, `compact_model`, and sub-agent model values can be a string or a fallback list.
- For an unqualified entry like `gpt-5.4`, klaude tries matching providers in `provider_list` order before moving to the next model in the list.
- `/model` updates `main_model` while preserving fallback order: the selected model is moved or inserted to the front of the list.
- `${ENV_VAR}` resolves from env, then `~/.klaude/klaude-auth.json`. Multi-fallback: `${A|B}`.
- User config merges with builtin config (user wins per field). Only overrides are saved.
- `klaude agents` shows all models and availability.

Full reference: [references/config-file.md](references/config-file.md)

## Builtin Providers

| Provider | Credentials | Auth method |
|----------|-------------|-------------|
| anthropic | `ANTHROPIC_API_KEY` | env var |
| openai | `OPENAI_API_KEY` | env var |
| google | `GOOGLE_API_KEY` or `GEMINI_API_KEY` | env var |
| openrouter | `OPENROUTER_API_KEY` | env var |
| deepseek | `DEEPSEEK_API_KEY` | env var |
| moonshot | `MOONSHOT_API_KEY` | env var |
| minimax | `MINIMAX_API_KEY` | env var |
| cerebras | `CEREBRAS_API_KEY` | env var |
| ark-coding-plan | `ARK_API_KEY` | env var |
| google-vertex | `GOOGLE_APPLICATION_CREDENTIALS` + project + location | env var |
| bedrock | AWS credentials + region | env var |
| codex | `klaude auth login codex` | OAuth |

Full provider details and models: [references/builtin-providers.md](references/builtin-providers.md)

## Skill System

Skills are `SKILL.md` files loaded into the system prompt on demand.

**Directories** (lowest to highest priority):
1. System: `~/.klaude/skills/.system/` (built-in)
2. User: `~/.claude/skills/`, `~/.klaude/skills/`, `~/.agents/skills/`, `~/.config/agents/skills/`
3. Project: `./.claude/skills/`, `./.agents/skills/`

**Install**: place `my-skill/SKILL.md` in any skill directory. `description` field is required.

**Dynamic discovery**: skills in `.claude/skills/` or `.agents/skills/` along file access paths are found automatically.

Full reference: [references/skill-system.md](references/skill-system.md)

## Background Agents & Cross-Session Communication

klaude is an agent multiplexer: one local server owns all execution; the TUI and every CLI command are clients of it. Agents keep running after the CLI returns, and sessions never expire — `send` works days later and across server restarts.

| Command | Purpose |
|---------|---------|
| `klaude run` | Spawn a background agent, print its id, return at once |
| `klaude ps` | List sessions and runtime states |
| `klaude brief TARGET` | Compact bounded status of one session |
| `klaude wait` | Block until agents finish (barrier); print results |
| `klaude output` | Print a session's output (last reply / turns / transcript) |
| `klaude send TARGET` | Follow-up message: queued while running, `--steer` to interrupt |
| `klaude respond TARGET` | Answer a pending approval/question (`waiting_input`) |
| `klaude kill` | Interrupt a running agent; session stays resumable |
| `klaude attach TARGET` | Open the TUI on a session: replay, then follow live |

Key points:
- TARGET = session id (unique prefix) or `run --name`; `--group` addresses a whole fan-out; `--json` everywhere for machines.
- Typical loop: `id=$(klaude run "...")` → `klaude wait "$id"` → `klaude send "$id" --wait "next round..."` — the session keeps full context between rounds.
- Fan-out: spawn with `run --group NAME`, barrier with `wait --group NAME`, then `output --group NAME | klaude run --wait "synthesize"`.
- `send` does not answer pending interactions; use `respond` (check the request with `brief` first).
- Agent-to-agent sends carry sender identity: `send --from NAME`, or automatic via `KLAUDE_SESSION_ID` when sent from inside a klaude agent — the target sees the text wrapped in `<agent-message from="...">` instead of as plain operator input.
- `klaude agents --prime` prints the full orchestration playbook plus the live agent/model inventory.

Full reference: [references/background-agents.md](references/background-agents.md)

## Memory Files

Persistent instructions loaded into every conversation.

**User-level**: `~/.claude/`, `~/.codex/`, `~/.klaude/`, `~/.agents/` (CLAUDE.md, AGENTS.md, AGENT.md)

**Project-level**: `<work_dir>/`, `<work_dir>/.claude/`, `<work_dir>/.agents/` (+ git root)

**Auto memory**: `~/.klaude/projects/<project_key>/memory/MEMORY.md`

**Path discovery**: reading a file checks every directory along the path for memory files.

**Limits**: 200 lines for MEMORY.md, 4096 bytes per file.

Full reference: [references/memory-files.md](references/memory-files.md)

## Reference Map

- **[config-file.md](references/config-file.md)**: YAML structure, model selection syntax, API key resolution, merging rules, all config fields.
- **[builtin-providers.md](references/builtin-providers.md)**: all providers with env vars, protocols, models, default assignments.
- **[skill-system.md](references/skill-system.md)**: skill directories, priority, SKILL.md format, dynamic discovery, override behavior.
- **[background-agents.md](references/background-agents.md)**: run/ps/brief/wait/output/send/respond/kill/attach, TARGET addressing, states, approval policy, orchestration patterns.
- **[memory-files.md](references/memory-files.md)**: memory file locations, discovery rules, categories, limits.
