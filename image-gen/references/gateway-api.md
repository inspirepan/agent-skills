# Gateway Image Jobs

The stable integration is asynchronous and model-agnostic.

- `POST /image-jobs` uses `Authorization: Bearer $YOUTU_API_KEY`, JSON content,
  and an `Idempotency-Key`. Its body is
  `{ "inputs": [...], "request": { "path": "/v1/images/generations", "body": { ... } } }`.
- `GET /image-jobs/{id}` reports `queued`, `submitting`, `running`,
  `uploading`, or `settling` before terminal `succeeded`, `failed`, or
  `canceled`.
- A succeeded job has zero or more `outputs`; each has `id`, `mimeType`, and
  `ordinal`. Do not assume `n` determines the count: Midjourney commonly
  returns four.
- Get each file with `POST /image-jobs/{job}/outputs/{output}/download-url`
  and `{}`. The returned URL can be a gateway-relative URL requiring the key,
  or an external HTTPS URL that must not receive the key.

## Inputs

Each input is `{ "role", "url", "mimeType", "ordinal?" }`. Valid roles are
`reference`, `source`, `mask`, `style`, and `character`. URLs must be HTTPS and
downloadable by the gateway. A `mask` is PNG.

For a local PNG, JPEG, or WebP input up to 20 MiB, first send its raw bytes to
`POST /image-inputs`. Use `Authorization: Bearer $YOUTU_API_KEY` and set
`Content-Type` to the image MIME type. A successful upload returns HTTP 201 and
`{ "url", "mimeType", "expiresAt" }`. The CLI verifies that `url` is HTTPS and
that a returned `mimeType` matches the request; a missing `mimeType` means the
request MIME type. It then puts the returned URL in the normal `/image-jobs`
input object. Uploads use the same request timeout and retry count as other
gateway requests.

## Models and parameters

`GET /v1/models` is OpenAI-list shaped. Image models normally have
`type: "image-gen"` or image provider API metadata such as `openai-images` or
`google-genai`. Because the gateway also uses `type: "image-gen"` for video
jobs, prefer `metadata.outputModalities` when distinguishing images from video.
Metadata can change, so use `models --all` for diagnosis.

Provider request bodies are not uniform. Put provider-specific settings in
`--param`, for example a nested Google `generationConfig` value. Do not infer a
provider's supported settings from another provider. OpenAI-style image models
use `/v1/images/generations`; Gemini image models use
`/gemini/v1beta/models/{model}:generateContent` with `contents` and
`generationConfig`. The request path selects the gateway protocol.