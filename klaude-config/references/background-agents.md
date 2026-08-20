---
name: background-agents
description: CLI commands for background agents and cross-session communication - run, ps, brief, wait, output, send, respond, kill, attach
---

# Background Agents & Cross-Session Communication

klaude is an agent multiplexer: a single local server owns all execution, and every CLI command (and the TUI) is a client of it. Agents keep running after the spawning command exits. Sessions never expire — you can `send` to one minutes or days later, and across server restarts.

This is how klaude sessions talk to each other: one agent spawns others with `run`, checks them with `ps`/`brief`, blocks on them with `wait`, reads them with `output`, and iterates with `send`.

## TARGET Addressing

Most commands take a TARGET:

- **Session id** — a unique prefix is enough (`a3f2` matches `a3f2c1...`)
- **Name** — set at spawn time with `klaude run --name fix-tests`
- **Multiple targets** — space- or comma-separated: `klaude ps a3f2,9b01,fix-tests`
- **Group** — `--group NAME` on `ps`/`wait`/`output`/`kill` selects every session spawned with `run --group NAME`

Pass `--json` to any background-agent command for machine-readable output.

## Command Reference

| Command | Purpose |
|---------|---------|
| `run` | Spawn a background agent, print its id, return at once |
| `ps` | List sessions and their runtime states |
| `brief` | Compact, bounded status of one session (fits in an agent's context) |
| `wait` | Block until agents finish; print their results (barrier) |
| `output` | Print a session's output (last reply / turns / transcript) |
| `send` | Send a follow-up message (queued by default) |
| `respond` | Answer a pending approval/question |
| `kill` | Interrupt a running agent (session stays resumable) |
| `attach` | Open the TUI on a session: replay, then follow live |
| `agents` | Show agent types and models; `--prime` prints the AI-agent playbook |

### run — spawn

```sh
klaude run "fix the failing tests under tests/server/"
klaude run -C ~/code/proj -m sonnet --name fix-tests "..."
git diff | klaude run --agent code-reviewer "review this diff"
klaude run --wait "one-shot question, print answer when done"
```

Key flags:
- `-C/--dir` working directory (default: cwd); `-m/--model` model alias
- `--agent` agent type (default `main`; others like `finder`, `code-reviewer` run with their own prompt, tools, and bound model — see `klaude agents`)
- `--name` addressable name; `--group` tag for fan-out recovery via `ps --group`
- `--approval hold|auto|deny` what to do on permission requests with no human attached: `hold` parks the request as `waiting_input` (default); `auto` approves permissions (questions still park); `deny` rejects
- `--wait` block until finished; `--timeout SECS` exit 124 on timeout
- PROMPT comes from the argument, piped stdin, or both (stdin appended)

### ps — list

```sh
klaude ps                       # active first, then idle, then history
klaude ps a3f2,fix-tests --json # exactly the agents you spawned
klaude ps --group review        # everything from one fan-out
```

States: `queued` / `running` / `waiting_input` (pending approval or question) / `idle` (TUI attached at prompt) / `completed` / `failed`. Filters: `--dir`, `--state` (repeatable), `-n/--limit`, `--all` (archived), `--tree` (nest sub-agent sessions under parents), `--watch` (live table).

### brief — bounded status

```sh
klaude brief fix-tests
```

Prints state, title, model, dir, todos, current/last tool call, pending request, last assistant message (truncated), token usage, changed files. Never dumps the transcript. `--max-chars` (default 2000), `--full-last`.

### wait — barrier

```sh
klaude wait a3f2,9b01                     # barrier over two agents
klaude wait --group review --timeout 900  # barrier over a fan-out
klaude wait --group review --any          # first finisher wins
```

Blocks until targets leave queued/running, then prints each final output (or the pending question if parked at `waiting_input`). Exit codes: `0` all completed · `2` some waiting_input · `3` some failed · `124` timeout. `--quiet` for exit code only.

### output — read

```sh
klaude output fix-tests             # last assistant message
klaude output fix-tests --turns 3   # last 3 user+assistant turns
klaude output fix-tests --transcript
klaude output fix-tests --follow    # stream live until turn ends
```

With multiple targets or `--group`, each output prints under a `== <id> <name>` header — pipe into a synthesis agent:

```sh
klaude output --group review | klaude run --wait "dedupe and rank these findings"
```

When a session is `waiting_input`, its pending request (type, prompt, options) is appended.

### send — follow-up

```sh
klaude send fix-tests "now also update the changelog"
klaude send fix-tests --steer "stop, wrong branch — switch to main first"
klaude send fix-tests --wait "one of them fails, log: ..."
klaude send fix-tests --from reviewer "the auth change looks wrong, see line 42"
```

- **Idle session**: starts a new turn immediately, keeping full conversation context.
- **Running session**: queued by default; delivered when the current turn finishes.
- `--steer`: interrupt the running turn and inject now (course-correction).
- `--wait` / `--timeout`: block until the resulting turn finishes.

`send` does NOT answer a pending interaction — a session parked at `waiting_input` needs `respond`.

**Sender identity**: by default the target sees a sent message exactly like operator input. With `--from NAME` — or automatically when `klaude send` runs inside a klaude agent's Bash tool (the tool exports `KLAUDE_SESSION_ID`, and the server resolves it to the session's name or short id) — the target receives the text wrapped in a tag:

```
<agent-message from="reviewer" session="a3f2c1d8">
the auth change looks wrong, see line 42
</agent-message>
```

The wrapper is plain text in the message, so it is visible to the target's model, in `klaude output`, and in an attached TUI alike — the receiving agent can tell a peer agent's message apart from its human operator's, and a human attaching later sees who said what. Attribution is advisory, not a security boundary. Explicit `--from` overrides the auto-detected label.

### respond — answer a pending request

```sh
klaude brief fix-tests            # see the request and its options first
klaude respond fix-tests --approve
klaude respond fix-tests --option 2
klaude respond fix-tests --text "use the staging database"
```

`--approve`/`--deny` for permission requests (`--deny` also cancels other request kinds); `--option N` for choices; `--text` for free-text.

### kill — interrupt

```sh
klaude kill fix-tests
klaude kill --group review
klaude kill --all
```

Same as pressing Esc in the TUI. The session is kept and stays resumable via `send` or `attach`.

### attach — human takeover

```sh
klaude attach fix-tests
klaude attach fix-tests --peek   # read-only follow
```

Replays the conversation, then follows live. Multiple clients may attach and type; the server serializes execution. Detaching (exit, Ctrl+D) never stops the agent.

## Orchestration Patterns

Orchestration is plain bash — `run` returns immediately, multi-target `wait` is a barrier, `--group` names a fan-out.

**Spawn and iterate over rounds** (same agent keeps context):

```sh
id=$(klaude run "read the codebase, summarize the auth flow")
klaude wait "$id"
klaude send "$id" --wait "now write tests for the edge cases you found"
klaude send "$id" --wait "one of them fails, here is the log: ..."
```

**Fan-out / barrier / synthesis**:

```sh
klaude run --group review --agent code-reviewer "review server/"
klaude run --group review --agent code-reviewer "review tui/"
klaude wait --group review --timeout 900
klaude output --group review | klaude run --wait "merge and rank the findings"
```

For the full playbook (parallel fan-out, barriers, loops, synthesis pipelines) and the live model/agent inventory, run:

```sh
klaude agents --prime
```
