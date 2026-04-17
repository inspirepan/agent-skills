---
name: builtin-providers
description: All builtin providers with their env vars, protocols, and available models
---

# Builtin Providers

These providers work out-of-the-box when their credentials are configured.

## Provider List

### anthropic
- **Env var**: `ANTHROPIC_API_KEY`
- **Protocol**: `anthropic`
- **Models**: `sonnet`, `sonnet:no-thinking`, `opus`, `opus:fast`, `haiku`

### openai
- **Env var**: `OPENAI_API_KEY`
- **Protocol**: `responses`
- **Models**: `gpt-5.4-nano`, `gpt-5.4-mini`, `gpt-5.4-mini:fast`, `gpt-5.4`, `gpt-5.4:xhigh`, `gpt-5.4:fast`, `gpt-5.4:xhigh:fast`, `gpt-5.3-codex`, `gpt-5.3-codex:xhigh`

### google
- **Env var**: `GOOGLE_API_KEY` or `GEMINI_API_KEY`
- **Protocol**: `google`
- **Models**: `gemini-pro`, `gemini-flash`, `gemini-flash:minimal`, `gemini-flash-lite`

### google-vertex
- **Env vars**: `GOOGLE_APPLICATION_CREDENTIALS` + `GOOGLE_CLOUD_PROJECT` + `GOOGLE_CLOUD_LOCATION`
- **Protocol**: `google_vertex`
- **Models**: `gemini-pro`, `gemini-flash`, `gemini-flash:minimal`, `gemini-flash-lite`

### bedrock
- **Env vars**: `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` + `AWS_REGION`
- **Protocol**: `bedrock`
- **Models**: `sonnet`

### deepseek
- **Env var**: `DEEPSEEK_API_KEY`
- **Protocol**: `anthropic` (via base_url)
- **Models**: `deepseek` (deepseek-reasoner)

### moonshot
- **Env var**: `MOONSHOT_API_KEY`
- **Protocol**: `anthropic` (via base_url)
- **Models**: `kimi` (kimi-k2.5)

### minimax
- **Env var**: `MINIMAX_API_KEY`
- **Protocol**: `anthropic` (via base_url)
- **Models**: `m2.7`, `m2.7:highspeed`

### cerebras
- **Env var**: `CEREBRAS_API_KEY`
- **Protocol**: `openai` (via base_url)
- **Models**: `glm` (zai-glm-4.7)

### openrouter
- **Env var**: `OPENROUTER_API_KEY`
- **Protocol**: `openrouter`
- **Models**: `gpt-5.3-codex`, `gpt-5.3-codex:xhigh`, `gpt-5.4-nano`, `gpt-5.4-mini`, `gpt-5.4`, `gpt-5.4:xhigh`, `kimi`, `haiku`, `sonnet`, `sonnet:no-thinking`, `opus`, `gemini-pro`, `gemini-flash`, `gemini-flash:minimal`, `gemini-flash-lite`, `grok`, `m2.7`, `glm`

### codex
- **Auth**: OAuth (`klaude auth login codex`)
- **Protocol**: `codex_oauth`
- **Models**: `gpt-5.3-codex`, `gpt-5.3-codex:xhigh`, `gpt-5.4-nano`, `gpt-5.4-mini`, `gpt-5.4`, `gpt-5.4:xhigh`

### github-copilot
- **Auth**: OAuth (`klaude auth login copilot`)
- **Protocol**: `github_copilot_oauth`
- **Models**: `gpt-5.3-codex`, `gpt-5.3-codex:xhigh`, `gpt-5.4-nano`, `gpt-5.4-mini`, `gpt-5.4`, `gpt-5.4:xhigh`, `sonnet`, `haiku`, `opus`

### ark-coding-plan
- **Env var**: `ARK_API_KEY`
- **Protocol**: `anthropic` (via base_url)
- **Models**: `seed-code` (doubao-seed-2.0-code)

## Default Model Assignments

```yaml
# Sub-agent defaults
sub_agent_models:
  finder: [gpt-5.4-mini, gemini-flash:minimal, haiku]
  code-reviewer: [gpt-5.4, opus]

# Compaction and fast tasks
compact_model: [gemini-flash, sonnet:no-thinking, gpt-5.4-mini]
fast_model: [gpt-5.4-nano, gemini-flash-lite, gpt-5.4-mini, gemini-flash:minimal, haiku]
```

## Credential Setup Methods

### Environment variables
```bash
export ANTHROPIC_API_KEY=sk-ant-...
export OPENAI_API_KEY=sk-...
```

### Auth login (stored in ~/.klaude/klaude-auth.json)
```bash
klaude auth login anthropic
klaude auth login openai
klaude auth login codex
klaude auth login copilot
```

### Config file (${ENV_VAR} syntax)
```yaml
provider_list:
- provider_name: anthropic
  api_key: ${ANTHROPIC_API_KEY}
```
