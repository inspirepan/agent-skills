---
name: config-file
description: Full klaude-config.yaml structure, model selection syntax, API key resolution, and merging rules
---

# Configuration File Reference

Path: `~/.klaude/klaude-config.yaml`

Example reference (auto-generated on first run): `~/.klaude/klaude-config.example.yaml`

## Full Structure

```yaml
# Main model for the agent loop
main_model: opus                    # or "sonnet@openrouter" (provider-qualified)

# Fallback list for fast tasks (first available wins)
fast_model:
- gpt-5.4-nano
- gemini-flash-lite
- haiku

# Fallback list for context compaction
compact_model:
- gemini-flash
- sonnet:no-thinking

# Per-sub-agent model overrides
sub_agent_models:
  finder: gpt-5.4-mini             # or a list for fallback
  general-purpose: sonnet
  code-reviewer: opus
  memory: sonnet
  code-simplifier: sonnet

# UI theme
theme: dark

# Custom or override providers
provider_list:
- provider_name: my-provider
  protocol: openai                  # required for non-builtin providers
  api_key: ${MY_API_KEY}            # ${ENV_VAR} syntax
  base_url: https://api.example.com/v1
  model_list:
  - model_name: my-model
    model_id: actual-model-id       # real model identifier sent to the API
    max_tokens: 16000
    context_limit: 200000
    cost: { input: 1, output: 10, cache_read: 0.1 }
```

## Model Selection Syntax

| Form | Example | Behavior |
|------|---------|----------|
| Unqualified | `sonnet` | First provider with valid credentials |
| Provider-qualified | `sonnet@openrouter` | Specific provider only |
| With variant | `sonnet:no-thinking` | Model variant (defined in provider config) |

Use `klaude list` to see all configured models and their availability.

## API Key Resolution

Values using `${ENV_VAR}` syntax are resolved in order:
1. Real environment variable (`os.environ`)
2. Stored credential in `~/.klaude/klaude-auth.json` (set via `klaude auth login <provider>`)

Multi-fallback syntax: `${GOOGLE_API_KEY|GEMINI_API_KEY}` -- tries each variable in order.

## Supported Protocols

| Protocol | Description |
|----------|-------------|
| `anthropic` | Anthropic Messages API (also used by DeepSeek, Moonshot, MiniMax via base_url) |
| `responses` | OpenAI Responses API |
| `openai` | OpenAI Chat Completions API |
| `openrouter` | OpenRouter API |
| `google` | Google Gemini API |
| `google_vertex` | Google Vertex AI |
| `bedrock` | AWS Bedrock |
| `codex_oauth` | Codex OAuth (no API key, use `klaude auth login codex`) |
| `github_copilot_oauth` | GitHub Copilot OAuth (no API key, use `klaude auth login copilot`) |

## Merging Rules

User config merges with builtin config at startup:

- **`provider_list`**: matched by `provider_name`.
  - Same name: user fields override builtin fields; user models append or override by `model_name`.
  - New name: added as custom provider (requires `protocol` field).
- **`main_model`**, **`fast_model`**, **`compact_model`**, **`theme`**: user value wins if set.
- **`sub_agent_models`**: merged per key, user value wins.

Only user-specific overrides are written back when saving (builtin defaults are omitted).

## Model Config Fields

| Field | Type | Description |
|-------|------|-------------|
| `model_name` | string | Short alias used in config |
| `model_id` | string | Actual model identifier sent to API |
| `max_tokens` | int | Max output tokens |
| `context_limit` | int | Context window size |
| `disabled` | bool | Disable this model |
| `cost` | object | Pricing: `input`, `output`, `cache_read`, `cache_write` (per million tokens) |
| `thinking` | object | Thinking/reasoning config: `type` (adaptive/enabled), `reasoning_effort`, `budget_tokens` |
| `verbosity` | string | Response verbosity hint: `low`, `high` |
| `fast_mode` | bool | Enable fast/priority processing |

## Provider Config Fields

| Field | Type | Description |
|-------|------|-------------|
| `provider_name` | string | Unique provider identifier |
| `protocol` | string | API protocol (see Supported Protocols) |
| `api_key` | string | API key or `${ENV_VAR}` reference |
| `base_url` | string | Custom API endpoint URL |
| `disabled` | bool | Disable this provider |
| `is_azure` | bool | Azure OpenAI mode |
| `azure_api_version` | string | Azure API version |
| `google_application_credentials` | string | Google service account JSON path |
| `google_cloud_project` | string | GCP project ID |
| `google_cloud_location` | string | GCP region |
| `aws_access_key` | string | AWS access key |
| `aws_secret_key` | string | AWS secret key |
| `aws_region` | string | AWS region |
| `aws_profile` | string | AWS named profile |
