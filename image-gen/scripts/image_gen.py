#!/usr/bin/env python3
"""Submit model-agnostic image jobs to the Youtu gateway."""

from __future__ import annotations

import argparse
import asyncio
import json
import math
import mimetypes
import os
import sys
import time
import uuid
from http.client import RemoteDisconnected
from pathlib import Path, PureWindowsPath
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlparse
from urllib.request import HTTPRedirectHandler, Request, build_opener

DEFAULT_BASE_URL = "https://api.youtu.uk"
DEFAULT_MODEL = "gpt-image-2.5-flare"
DEFAULT_TIMEOUT = 600
DEFAULT_REQUEST_TIMEOUT = 60.0
DEFAULT_POLL_INTERVAL = 2.0
MAX_BATCH_JOBS = 500
MAX_LOCAL_INPUT_BYTES = 20 * 1024 * 1024
USER_AGENT = "image-gen/1.0"
TERMINAL = {"succeeded", "failed", "canceled"}
PENDING = {"queued", "submitting", "running", "uploading", "settling"}
MIME_EXTENSIONS = {"image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp"}
INPUT_MIME_TYPES = frozenset(MIME_EXTENSIONS)
PROMPT_FIELDS = ("use_case", "asset_type", "scene", "subject", "style", "composition", "lighting", "palette", "materials", "text", "constraints", "negative")
GEMINI_IMAGE_ALIASES = {
    "nano-banana-2-lite": "gemini-3.1-flash-lite-image",
    "nano-banana-lite": "gemini-3.1-flash-lite-image",
    "gemini-flash-lite-image-latest": "gemini-3.1-flash-lite-image",
    "nano-banana-2": "gemini-3.1-flash-image",
    "nano-banana-latest": "gemini-3.1-flash-image",
    "nano-banana-pro": "gemini-3-pro-image",
}
# OpenAI Images has no aspect_ratio/resolution; the gateway forwards the body as-is.
GPT_IMAGE_LONG_EDGE = {"1K": 1024, "2K": 2048, "4K": 3840}
# Canonical sizes shared with image-playground; other ratios are derived.
GPT_IMAGE_SIZES = {
    "1:1": ("1024x1024", "2048x2048", "2880x2880"),
    "3:2": ("1536x1024", "2400x1600", "3456x2304"),
    "2:3": ("1024x1536", "1600x2400", "2304x3456"),
    "4:3": ("1152x864", "2048x1536", "3264x2448"),
    "3:4": ("864x1152", "1536x2048", "2448x3264"),
    "5:4": ("1120x896", "2240x1792", "3200x2560"),
    "4:5": ("896x1120", "1792x2240", "2560x3200"),
    "16:9": ("1280x720", "2048x1152", "3840x2160"),
    "9:16": ("720x1280", "1152x2048", "2160x3840"),
    "21:9": ("1344x576", "2016x864", "3808x1632"),
    "3:1": ("1536x512", "2400x800", "3840x1280"),
    "1:3": ("512x1536", "800x2400", "1280x3840"),
}
GPT_IMAGE_MIN_PIXELS = 655_360
GPT_IMAGE_MAX_PIXELS = 8_294_400


def die(message: str, code: int = 1) -> None:
    print(f"Error: {message}", file=sys.stderr)
    raise SystemExit(code)


def warn(message: str) -> None:
    print(f"Warning: {message}", file=sys.stderr)


def base_url() -> str:
    value = os.getenv("YOUTU_BASE_URL", DEFAULT_BASE_URL).rstrip("/")
    if urlparse(value).scheme not in {"http", "https"}:
        die("YOUTU_BASE_URL must be an HTTP(S) URL.")
    return value


def require_key(dry_run: bool) -> str | None:
    key = os.getenv("YOUTU_API_KEY")
    if key:
        return key
    if dry_run:
        warn("YOUTU_API_KEY is not set; dry-run only.")
        return None
    die("YOUTU_API_KEY is not set. Export it before making live requests.")
    return None


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req: Request, fp: Any, code: int, msg: str, headers: Any, newurl: str) -> None:
        return None


def gateway_error(exc: HTTPError) -> str:
    try:
        data = json.loads(exc.read().decode("utf-8", "replace"))
        return json.dumps(data, ensure_ascii=True)
    except Exception:
        return exc.reason or str(exc)


def is_retryable(exc: Exception) -> bool:
    if isinstance(exc, HTTPError):
        return exc.code == 429 or 500 <= exc.code < 600
    return isinstance(exc, (URLError, TimeoutError, RemoteDisconnected))


def retry_after(exc: HTTPError) -> float | None:
    value = exc.headers.get("Retry-After") if exc.headers else None
    try:
        return max(0.0, float(value)) if value else None
    except ValueError:
        return None


def request_bytes(
    url: str,
    *,
    method: str = "GET",
    body: dict[str, Any] | None = None,
    raw_body: bytes | None = None,
    content_type: str | None = None,
    expected_status: int | None = None,
    key: str | None = None,
    retries: int = 3,
    redirects: int = 0,
    timeout: float = DEFAULT_REQUEST_TIMEOUT,
) -> bytes:
    if body is not None and raw_body is not None:
        raise ValueError("body and raw_body are mutually exclusive")
    for attempt in range(1, retries + 1):
        payload = raw_body if raw_body is not None else None if body is None else json.dumps(body).encode()
        headers = {"Accept": "application/json", "User-Agent": USER_AGENT}
        if payload is not None:
            headers["Content-Type"] = content_type or "application/json"
        if key:
            headers["Authorization"] = f"Bearer {key}"
        try:
            with build_opener(NoRedirect).open(Request(url, data=payload, headers=headers, method=method), timeout=timeout) as response:
                if expected_status is not None and response.status != expected_status:
                    raise RuntimeError(f"Expected HTTP {expected_status} from {url}, got {response.status}.")
                return response.read()
        except HTTPError as exc:
            if exc.code in {301, 302, 303, 307, 308}:
                location = exc.headers.get("Location")
                if not location:
                    raise RuntimeError(f"Redirect without Location from {url}") from exc
                if redirects >= 5:
                    raise RuntimeError("Too many redirects") from exc
                target = urljoin(url, location)
                parsed = urlparse(target)
                if parsed.scheme != "https":
                    raise RuntimeError(f"Refusing non-HTTPS redirect: {target}") from exc
                return request_bytes(
                    target,
                    method=method,
                    body=body,
                    raw_body=raw_body,
                    content_type=content_type,
                    expected_status=expected_status,
                    key=key if same_origin(target, base_url()) else None,
                    retries=retries,
                    redirects=redirects + 1,
                    timeout=timeout,
                )
            if not is_retryable(exc) or attempt == retries:
                raise RuntimeError(f"HTTP {exc.code}: {gateway_error(exc)}") from exc
            delay = retry_after(exc) or min(20.0, 2.0 ** (attempt - 1))
        except (URLError, TimeoutError, RemoteDisconnected) as exc:
            if attempt == retries:
                detail = getattr(exc, "reason", str(exc))
                raise RuntimeError(f"Network error: {detail}") from exc
            delay = min(20.0, 2.0 ** (attempt - 1))
        print(f"Request attempt {attempt}/{retries} failed; retrying in {delay:.1f}s", file=sys.stderr)
        time.sleep(delay)
    raise RuntimeError("unreachable")


def request_json(url: str, **kwargs: Any) -> Any:
    raw = request_bytes(url, **kwargs)
    try:
        return json.loads(raw.decode("utf-8"))
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"Gateway returned invalid JSON: {exc}") from exc


def same_origin(left: str, right: str) -> bool:
    a, b = urlparse(left), urlparse(right)
    return (a.scheme, a.netloc) == (b.scheme, b.netloc)


def read_text_option(value: str, label: str) -> str:
    if value.startswith("@"):
        path = Path(value[1:])
        if not path.is_file():
            die(f"{label} file not found: {path}")
        return path.read_text(encoding="utf-8")
    return value


def prompt_from(args: argparse.Namespace) -> str:
    if args.prompt and args.prompt_file:
        die("Use --prompt or --prompt-file, not both.")
    value = Path(args.prompt_file).read_text(encoding="utf-8") if args.prompt_file else args.prompt
    if not value or not value.strip():
        die("Missing prompt. Use --prompt or --prompt-file.")
    return value.strip()


def json_value(value: str, label: str) -> Any:
    try:
        return json.loads(read_text_option(value, label))
    except json.JSONDecodeError:
        return value


def set_path(target: dict[str, Any], path: str, value: Any) -> None:
    parts = path.split(".")
    if not all(parts):
        die(f"Invalid --param path: {path}")
    current = target
    for part in parts[:-1]:
        existing = current.get(part)
        if existing is not None and not isinstance(existing, dict):
            die(f"Conflicting --param path: {path}")
        current = current.setdefault(part, {})
    current[parts[-1]] = value


def parse_params(values: list[str] | None) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for raw in values or []:
        if "=" not in raw:
            die("--param must be KEY=VALUE")
        key, value = raw.split("=", 1)
        set_path(result, key, json_value(value, "--param"))
    return result


def merge(target: dict[str, Any], source: dict[str, Any]) -> dict[str, Any]:
    result = dict(target)
    for key, value in source.items():
        if isinstance(value, dict) and isinstance(result.get(key), dict):
            result[key] = merge(result[key], value)
        else:
            result[key] = value
    return result


def parse_body(value: str | None) -> dict[str, Any]:
    if not value:
        return {}
    decoded = json_value(value, "--body-json")
    if not isinstance(decoded, dict):
        die("--body-json must decode to a JSON object.")
    return decoded


def mime_for_url(url: str) -> str | None:
    suffix = Path(urlparse(url).path).suffix.lower()
    return {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp"}.get(suffix)


def mime_for_path(path: Path) -> str | None:
    return {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp"}.get(path.suffix.lower())


def validate_https_url(url: str) -> bool:
    parsed = urlparse(url)
    return parsed.scheme == "https" and bool(parsed.hostname) and not parsed.username and not parsed.password


def classify_input_location(value: str) -> str:
    if PureWindowsPath(value).is_absolute():
        return "path"
    scheme = urlparse(value).scheme
    if scheme == "https":
        return "url"
    if scheme:
        return "unsupported_uri"
    return "path"


def validate_input(item: Any, ordinal: int) -> dict[str, Any]:
    if not isinstance(item, dict):
        die("Each --input JSON value must be an object.")
    result = dict(item)
    if not isinstance(result.get("role"), str) or not result["role"]:
        die("Each input requires a string role.")
    has_url = isinstance(result.get("url"), str) and bool(result["url"])
    has_path = isinstance(result.get("path"), str) and bool(result["path"])
    if has_url == has_path:
        die("Each input requires exactly one string url or path.")
    if has_url:
        if not isinstance(result.get("mimeType"), str) or not result["mimeType"]:
            die("Each URL input requires string role, url, and mimeType.")
        if not validate_https_url(result["url"]):
            die("Input URLs must be gateway-downloadable HTTPS URLs; non-HTTPS URL schemes are unsupported.")
    else:
        path = Path(result["path"])
        if not path.is_file():
            die(f"Input file not found or not a file: {path}")
        inferred_mime = mime_for_path(path)
        if not inferred_mime:
            die(f"Cannot infer input MIME type from {path}; use a .png, .jpg, .jpeg, or .webp file.")
        supplied_mime = result.get("mimeType")
        if supplied_mime is not None and (not isinstance(supplied_mime, str) or not supplied_mime):
            die("Local input mimeType must be a non-empty string.")
        if supplied_mime is None:
            result["mimeType"] = inferred_mime
        elif supplied_mime not in INPUT_MIME_TYPES:
            die("Local inputs support only image/png, image/jpeg, and image/webp.")
        elif inferred_mime and supplied_mime != inferred_mime:
            die(f"Input mimeType {supplied_mime} does not match file extension for {path} ({inferred_mime}).")
    if result["role"] == "mask" and result["mimeType"] != "image/png":
        die("A mask input must use mimeType image/png.")
    result.setdefault("ordinal", ordinal)
    return result


def parse_inputs(values: list[Any] | None) -> list[dict[str, Any]]:
    result = []
    for ordinal, raw in enumerate(values or []):
        if isinstance(raw, dict):
            decoded = raw
        elif raw.startswith("@") or raw.lstrip().startswith("{"):
            decoded = json_value(raw, "--input")
        else:
            if "=" not in raw:
                die("--input must be ROLE=HTTPS_URL, ROLE=LOCAL_PATH, or a JSON object (or @JSON_FILE).")
            role, value = raw.split("=", 1)
            location = classify_input_location(value)
            if location == "unsupported_uri":
                die("Input URLs must use HTTPS; non-HTTPS URL schemes are not local files.")
            mime = mime_for_url(value)
            if not mime:
                die("Cannot infer input MIME type; use JSON with mimeType image/png, image/jpeg, or image/webp.")
            decoded = {"role": role, location: value, "mimeType": mime}
        result.append(validate_input(decoded, ordinal))
    allowed_roles = {"reference", "source", "mask", "style", "character"}
    if any(item["role"] not in allowed_roles for item in result):
        die("Input role must be reference, source, mask, style, or character.")
    return result


def augment(prompt: str, args: argparse.Namespace, fields: dict[str, Any] | None = None) -> str:
    if not args.augment:
        return prompt
    values = {name: getattr(args, name, None) for name in PROMPT_FIELDS}
    values.update(fields or {})
    labels = {"use_case": "Use case", "asset_type": "Asset type", "scene": "Scene", "subject": "Subject", "style": "Style", "composition": "Composition", "lighting": "Lighting", "palette": "Palette", "materials": "Materials", "text": "Text (verbatim)", "constraints": "Constraints", "negative": "Avoid"}
    lines = [f"Primary request: {prompt}"]
    for name in PROMPT_FIELDS:
        if values.get(name):
            text = f'"{values[name]}"' if name == "text" else str(values[name])
            lines.append(f"{labels[name]}: {text}")
    return "\n".join(lines)


def explicit_body(args: argparse.Namespace) -> dict[str, Any]:
    values = {key: getattr(args, key) for key in ("n", "size", "quality", "aspect_ratio", "resolution", "background", "output_format") if getattr(args, key, None) is not None}
    return values


def parse_ratio(value: Any) -> tuple[int, int]:
    try:
        w, h = (int(part) for part in str(value).split(":"))
    except ValueError:
        w = h = 0
    if w <= 0 or h <= 0:
        die(f"Invalid aspect ratio {value!r}; use W:H such as 16:9.")
    return w, h


def gpt_image_size(model: str, aspect_ratio: Any, resolution: Any) -> str:
    if str(aspect_ratio).lower() in {"adaptive", "auto"}:
        return "auto"
    key = str(resolution).upper() if resolution is not None else "1K"
    if key not in GPT_IMAGE_LONG_EDGE:
        die(f"{model} resolution must be one of {', '.join(GPT_IMAGE_LONG_EDGE)}; or pass --size WxH.")
    ratio = str(aspect_ratio) if aspect_ratio is not None else "1:1"
    if ratio in GPT_IMAGE_SIZES:
        return GPT_IMAGE_SIZES[ratio][list(GPT_IMAGE_LONG_EDGE).index(key)]
    w, h = parse_ratio(ratio)
    if max(w, h) > 3 * min(w, h):
        die(f"{model} supports aspect ratios up to 3:1; got {aspect_ratio}.")
    # Fit the long edge, clamped to the provider's pixel budget; edges are multiples of 16.
    area = w * h
    scale = min(GPT_IMAGE_LONG_EDGE[key] / max(w, h), math.sqrt(GPT_IMAGE_MAX_PIXELS / area))
    scale = max(scale, math.sqrt(GPT_IMAGE_MIN_PIXELS / area))
    width, height = (max(16, round(w * scale / 16) * 16), max(16, round(h * scale / 16) * 16))
    if width * height > GPT_IMAGE_MAX_PIXELS:
        width, height = (math.floor(w * scale / 16) * 16, math.floor(h * scale / 16) * 16)
    elif width * height < GPT_IMAGE_MIN_PIXELS:
        width, height = (math.ceil(w * scale / 16) * 16, math.ceil(h * scale / 16) * 16)
    return f"{width}x{height}"


def normalize_openai_size(model: str, body: dict[str, Any]) -> None:
    aspect_ratio = body.pop("aspect_ratio", None)
    resolution = body.pop("resolution", None)
    if (aspect_ratio is None and resolution is None) or body.get("size") is not None:
        return
    body["size"] = gpt_image_size(model, aspect_ratio, resolution)


def request_path_for(model: str, explicit: str | None) -> str:
    if explicit:
        if "://" in explicit or not explicit.startswith("/"):
            die("--request-path must be an absolute URL path, not a URL.")
        return explicit
    api_model = GEMINI_IMAGE_ALIASES.get(model, model)
    if api_model.startswith("gemini-") and "image" in api_model:
        return f"/gemini/v1beta/models/{api_model}:generateContent"
    return "/v1/images/generations"


def build_job(args: argparse.Namespace, *, prompt: str, overrides: dict[str, Any] | None = None) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    overrides = overrides or {}
    body = parse_body(args.body_json)
    body = merge(body, parse_params(args.param))
    body = merge(body, explicit_body(args))
    job_body = overrides.get("body")
    if job_body is not None:
        if not isinstance(job_body, dict): die("Batch job body must be an object.")
        body = merge(body, job_body)
    params = overrides.get("params")
    if params is not None:
        if not isinstance(params, dict): die("Batch job params must be an object.")
        body = merge(body, params)
    for key in ("n", "size", "quality", "aspect_ratio", "resolution", "background", "output_format"):
        if key in overrides and overrides[key] is not None:
            body[key] = overrides[key]
    model = str(overrides.get("model") or args.model)
    fields = dict(overrides.get("fields") or {})
    if not isinstance(fields, dict): die("Batch job fields must be an object.")
    fields.update({key: overrides[key] for key in PROMPT_FIELDS if key in overrides})
    final_prompt = augment(prompt, args, fields)
    override_path = overrides.get("request_path")
    request_path = request_path_for(model, str(override_path) if override_path is not None else args.request_path)
    if request_path.startswith("/gemini/"):
        body.pop("model", None)
        body.pop("prompt", None)
        body["contents"] = [{"parts": [{"text": final_prompt}], "role": "user"}]
    else:
        body["model"] = model
        body["prompt"] = final_prompt
        if model.startswith("gpt-image") and request_path.startswith("/v1/images/"):
            normalize_openai_size(model, body)
    if "inputs" in overrides and not isinstance(overrides["inputs"], list):
        die("Batch job inputs must be an array.")
    inputs = parse_inputs(overrides["inputs"]) if "inputs" in overrides else parse_inputs(args.input)
    payload: dict[str, Any] = {"request": {"path": request_path, "body": body}}
    if inputs: payload["inputs"] = inputs
    return payload, inputs


def print_preview(payload: dict[str, Any], outputs: Any) -> None:
    request_payload, uploads = prepare_inputs(payload)
    print(json.dumps({"endpoint": "/image-jobs", "uploads": uploads, "request": request_payload, "outputs": outputs}, indent=2, sort_keys=True))


def prepare_inputs(payload: dict[str, Any]) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    prepared = dict(payload)
    uploads = []
    prepared_inputs = []
    for item in payload.get("inputs", []):
        if "path" not in item:
            prepared_inputs.append(dict(item))
            continue
        suffix = MIME_EXTENSIONS[item["mimeType"]]
        placeholder = f"https://image-input.invalid/{item['ordinal']}{suffix}"
        uploads.append({"endpoint": "/image-inputs", "path": item["path"], "mimeType": item["mimeType"], "role": item["role"], "ordinal": item["ordinal"], "placeholderUrl": placeholder})
        prepared_inputs.append({key: value for key, value in item.items() if key != "path"} | {"url": placeholder})
    if prepared_inputs:
        prepared["inputs"] = prepared_inputs
    return prepared, uploads


def read_local_input(path: Path) -> bytes:
    size = path.stat().st_size
    if size > MAX_LOCAL_INPUT_BYTES:
        die(f"Local input exceeds the 20 MiB limit: {path} ({size} bytes).")
    with path.open("rb") as file:
        content = file.read(MAX_LOCAL_INPUT_BYTES + 1)
    if len(content) > MAX_LOCAL_INPUT_BYTES:
        die(f"Local input exceeds the 20 MiB limit: {path}.")
    return content


def upload_input(item: dict[str, Any], args: argparse.Namespace, key: str) -> dict[str, Any]:
    mime = item["mimeType"]
    content = read_local_input(Path(item["path"]))
    raw = request_bytes(
        base_url() + "/image-inputs",
        method="POST",
        raw_body=content,
        content_type=mime,
        expected_status=201,
        key=key,
        retries=args.max_attempts,
        timeout=args.request_timeout,
    )
    try:
        response = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise RuntimeError(f"Image input upload returned invalid JSON: {exc}") from exc
    if not isinstance(response, dict) or not isinstance(response.get("url"), str) or not validate_https_url(response["url"]):
        raise RuntimeError("Image input upload response did not include a valid HTTPS url.")
    response_mime = response.get("mimeType", mime)
    if response_mime != mime:
        raise RuntimeError(f"Image input upload returned mimeType {response_mime!r}; expected {mime!r}.")
    return {key: value for key, value in item.items() if key != "path"} | {"url": response["url"]}


def upload_inputs(payload: dict[str, Any], args: argparse.Namespace, key: str) -> dict[str, Any]:
    prepared = dict(payload)
    if "inputs" in payload:
        prepared["inputs"] = [upload_input(item, args, key) if "path" in item else dict(item) for item in payload["inputs"]]
    return prepared


def submit_and_wait(payload: dict[str, Any], args: argparse.Namespace, key: str) -> dict[str, Any]:
    token = str(uuid.uuid4())
    url = base_url() + "/image-jobs"
    # Keep the same idempotency key for all submission retries.
    for attempt in range(1, args.max_attempts + 1):
        try:
            raw = json.dumps(payload).encode()
            headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json", "Accept": "application/json", "Idempotency-Key": token, "User-Agent": USER_AGENT}
            with build_opener(NoRedirect).open(
                Request(url, data=raw, headers=headers, method="POST"),
                timeout=args.request_timeout,
            ) as response:
                job = json.loads(response.read().decode())
            if not isinstance(job, dict) or not isinstance(job.get("gatewayJobId"), str):
                if attempt == args.max_attempts:
                    raise RuntimeError("Gateway response did not include gatewayJobId.")
                time.sleep(min(20.0, 2.0 ** (attempt - 1)))
                continue
            break
        except (HTTPError, URLError, TimeoutError, RemoteDisconnected, json.JSONDecodeError) as exc:
            retryable = isinstance(exc, json.JSONDecodeError) or is_retryable(exc)
            if not retryable or attempt == args.max_attempts:
                if isinstance(exc, HTTPError):
                    detail = gateway_error(exc)
                else:
                    detail = str(getattr(exc, "reason", exc))
                raise RuntimeError(f"Submission failed: {detail}") from exc
            delay = retry_after(exc) if isinstance(exc, HTTPError) else None
            time.sleep(delay if delay is not None else min(20.0, 2.0 ** (attempt - 1)))
    else: raise RuntimeError("Submission failed")
    job_id = job.get("gatewayJobId")
    if not isinstance(job_id, str):
        raise RuntimeError("Gateway response did not include gatewayJobId.")
    deadline = time.monotonic() + args.timeout
    while True:
        status = str(job.get("status", ""))
        if status in TERMINAL:
            if status != "succeeded":
                detail = job.get("errorMessage") or job.get("error") or "no error message returned"
                code = job.get("errorCode")
                if code:
                    detail = f"{code}: {detail}"
                raise RuntimeError(f"Image job {job_id} {status}: {detail}")
            return job
        if status not in PENDING: warn(f"Unknown job status {status!r}; continuing to poll.")
        if time.monotonic() >= deadline: raise RuntimeError(f"Timed out waiting for image job {job_id}.")
        time.sleep(args.poll_interval)
        job = request_json(
            base_url() + f"/image-jobs/{job_id}",
            key=key,
            retries=args.max_attempts,
            timeout=args.request_timeout,
        )


def output_path(base: str, out_dir: str | None, ordinal: int, count: int, mime: str) -> Path:
    ext = MIME_EXTENSIONS.get(mime, mimetypes.guess_extension(mime or "") or ".bin")
    if out_dir:
        return Path(out_dir) / f"image-{ordinal}{ext}"
    path = Path(base)
    if not path.suffix: path = path.with_suffix(ext)
    elif path.suffix.lower() != ext: warn(f"Output extension {path.suffix} does not match {mime}.")
    return path if count == 1 else path.with_name(f"{path.stem}-{ordinal}{path.suffix}")


def atomic_write(path: Path, content: bytes, force: bool) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and not force: die(f"Output already exists: {path} (use --force to overwrite)")
    temp = path.with_name(f".{path.name}.{uuid.uuid4().hex}.tmp")
    try:
        temp.write_bytes(content)
        os.replace(temp, path)
    finally:
        if temp.exists(): temp.unlink()


def maybe_downscale(path: Path, data: bytes, args: argparse.Namespace) -> None:
    if args.downscale_max_dim is None: return
    try:
        from PIL import Image
        from io import BytesIO
    except ImportError:
        die("Downscaling requires Pillow. Install with `uv add pillow` or run with `uv run --with pillow`.")
    with Image.open(BytesIO(data)) as image:
        image.thumbnail((args.downscale_max_dim, args.downscale_max_dim), Image.Resampling.LANCZOS)
        target = path.with_name(f"{path.stem}{args.downscale_suffix}{path.suffix}")
        output = BytesIO(); image.save(output, format=image.format or "PNG")
        atomic_write(target, output.getvalue(), args.force)
        print(f"Wrote {target}")


def download_outputs(job: dict[str, Any], args: argparse.Namespace, key: str, *, out: str | None = None, out_dir: str | None = None) -> None:
    outputs = sorted(job.get("outputs") or [], key=lambda item: (item.get("ordinal", 0), item.get("id", "")))
    if not outputs: die("Succeeded job did not include outputs.")
    job_id = job["gatewayJobId"]
    planned = [output_path(out or args.out, out_dir if out_dir is not None else args.out_dir, i, len(outputs), item.get("mimeType", "")) for i, item in enumerate(outputs, 1)]
    for path in planned:
        if path.exists() and not args.force: die(f"Output already exists: {path} (use --force to overwrite)")
    for item, path in zip(outputs, planned):
        info = request_json(
            base_url() + f"/image-jobs/{job_id}/outputs/{item['id']}/download-url",
            method="POST",
            body={},
            key=key,
            retries=args.max_attempts,
            timeout=args.request_timeout,
        )
        url = info.get("url") or info.get("downloadUrl")
        if not isinstance(url, str): die("Download URL response did not include url.")
        url = urljoin(base_url() + "/", url)
        if urlparse(url).scheme != "https": die("Refusing non-HTTPS download URL.")
        data = request_bytes(
            url,
            key=key if same_origin(url, base_url()) else None,
            retries=args.max_attempts,
            timeout=args.request_timeout,
        )
        atomic_write(path, data, args.force); print(f"Wrote {path}")
        maybe_downscale(path, data, args)


def run_one(args: argparse.Namespace, overrides: dict[str, Any] | None = None) -> None:
    overrides = overrides or {}
    prompt = str(overrides.get("prompt") or prompt_from(args)).strip()
    payload, _ = build_job(args, prompt=prompt, overrides=overrides)
    preview_out = overrides.get("out") or args.out
    if args.dry_run: print_preview(payload, {"out": preview_out, "out_dir": args.out_dir}); return
    key = require_key(False); assert key
    payload = upload_inputs(payload, args, key)
    job = submit_and_wait(payload, args, key)
    download_outputs(job, args, key, out=preview_out, out_dir=args.out_dir)


def run_models(args: argparse.Namespace) -> None:
    key = require_key(False)
    data = request_json(
        base_url() + "/v1/models",
        key=key,
        retries=args.max_attempts,
        timeout=args.request_timeout,
    )
    models = data.get("data", []) if isinstance(data, dict) else data
    if not isinstance(models, list): die("Unexpected /v1/models response.")
    def image_model(model: Any) -> bool:
        if not isinstance(model, dict): return False
        metadata = model.get("metadata")
        if isinstance(metadata, dict):
            modalities = metadata.get("outputModalities") or metadata.get("output_modalities")
            if isinstance(modalities, list):
                return "image" in modalities
        if model.get("type") == "image-gen": return True
        api_types = model.get("api_types") or model.get("apiTypes") or []
        if isinstance(api_types, list) and "openai-images" in api_types:
            return True
        metadata_text = json.dumps(metadata, sort_keys=True).lower() if metadata is not None else ""
        return isinstance(api_types, list) and "google-genai" in api_types and "image" in metadata_text
    visible = models if args.all else [model for model in models if image_model(model)]
    if args.json: print(json.dumps(visible if not args.all else data, indent=2, sort_keys=True)); return
    for model in visible:
        if isinstance(model, dict): print(model.get("id", json.dumps(model, ensure_ascii=True)))


def read_batch(path: str) -> list[dict[str, Any]]:
    jobs = []
    for line_no, line in enumerate(Path(path).read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip() or line.lstrip().startswith("#"): continue
        try: raw = json.loads(line)
        except json.JSONDecodeError as exc: die(f"Invalid JSONL line {line_no}: {exc}")
        job = {"prompt": raw} if isinstance(raw, str) else raw
        if not isinstance(job, dict) or not isinstance(job.get("prompt"), str) or not job["prompt"].strip(): die(f"Batch line {line_no} requires a prompt string.")
        jobs.append(job)
    if not jobs: die("No batch jobs found.")
    if len(jobs) > MAX_BATCH_JOBS:
        die(f"Batch has {len(jobs)} jobs; maximum is {MAX_BATCH_JOBS}.")
    return jobs


def batch_output_base(job: dict[str, Any], index: int) -> str:
    requested = Path(str(job.get("out") or "image"))
    return str(requested.with_name(f"{index:03d}-{requested.name}"))


def batch_output_target(args: argparse.Namespace, job: dict[str, Any], index: int) -> tuple[str, str | None]:
    if args.out_dir:
        return "image", str(Path(args.out_dir) / f"job-{index:03d}")
    return batch_output_base(job, index), None


async def run_batch(args: argparse.Namespace) -> None:
    jobs = read_batch(args.batch_input)
    previews = []
    for index, job in enumerate(jobs, 1):
        payload, _ = build_job(args, prompt=job["prompt"], overrides=job)
        previews.append((index, job, payload))
    if args.dry_run:
        for index, job, payload in previews:
            out, out_dir = batch_output_target(args, job, index)
            print_preview(payload, {"job": index, "out": out, "out_dir": out_dir})
        return
    require_key(False)
    semaphore = asyncio.Semaphore(args.concurrency)
    async def worker(index: int, job: dict[str, Any], payload: dict[str, Any]) -> bool:
        async with semaphore:
            try:
                await asyncio.to_thread(run_one_payload, args, payload, job, index)
                return True
            except Exception as exc:
                print(f"Batch job {index} failed: {exc}", file=sys.stderr)
                if args.fail_fast: raise
                return False
            except SystemExit as exc:
                print(f"Batch job {index} failed with exit code {exc.code}", file=sys.stderr)
                if args.fail_fast:
                    raise RuntimeError(f"Batch job {index} failed") from exc
                return False
    tasks = [asyncio.create_task(worker(*item)) for item in previews]
    try:
        results = await asyncio.gather(*tasks)
    except Exception:
        for task in tasks:
            if not task.done(): task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
        raise
    if not all(results): raise SystemExit(1)


def run_one_payload(args: argparse.Namespace, payload: dict[str, Any], job: dict[str, Any], index: int) -> None:
    key = require_key(False); assert key
    payload = upload_inputs(payload, args, key)
    result = submit_and_wait(payload, args, key)
    # Output count is unknown until completion; names are allocated only now.
    out, batch_dir = batch_output_target(args, job, index)
    download_outputs(result, args, key, out=out, out_dir=batch_dir)


def add_common(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--model", default=DEFAULT_MODEL); parser.add_argument("--prompt"); parser.add_argument("--prompt-file")
    parser.add_argument("--n", type=int); parser.add_argument("--size"); parser.add_argument("--quality"); parser.add_argument("--aspect-ratio"); parser.add_argument("--resolution"); parser.add_argument("--background"); parser.add_argument("--output-format")
    parser.add_argument("--param", action="append", default=[]); parser.add_argument("--body-json"); parser.add_argument("--request-path")
    parser.add_argument("--input", action="append", default=[]); parser.add_argument("--out", default="output"); parser.add_argument("--out-dir"); parser.add_argument("--force", action="store_true"); parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--timeout", type=int, default=DEFAULT_TIMEOUT); parser.add_argument("--poll-interval", type=float, default=DEFAULT_POLL_INTERVAL); parser.add_argument("--request-timeout", type=float, default=DEFAULT_REQUEST_TIMEOUT); parser.add_argument("--max-attempts", type=int, default=3)
    parser.add_argument("--downscale-max-dim", type=int); parser.add_argument("--downscale-suffix", default="-web")
    parser.add_argument("--augment", dest="augment", action="store_true", default=True); parser.add_argument("--no-augment", dest="augment", action="store_false")
    for field in PROMPT_FIELDS: parser.add_argument("--" + field.replace("_", "-"))


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate or edit images through Youtu image jobs")
    commands = parser.add_subparsers(dest="command", required=True)
    models = commands.add_parser("models", help="List gateway models"); models.add_argument("--all", action="store_true"); models.add_argument("--json", action="store_true"); models.add_argument("--request-timeout", type=float, default=DEFAULT_REQUEST_TIMEOUT); models.add_argument("--max-attempts", type=int, default=3); models.set_defaults(func=run_models)
    for name in ("generate", "edit"):
        command = commands.add_parser(name, help=f"{name.title()} an image") ; add_common(command)
        if name == "edit": command.set_defaults(edit=True)
        command.set_defaults(func=run_one)
    batch = commands.add_parser("generate-batch", help="Generate JSONL jobs concurrently"); add_common(batch); batch.add_argument("--batch-input", "--input-file", dest="batch_input", required=True); batch.add_argument("--concurrency", type=int, default=3); batch.add_argument("--fail-fast", action="store_true"); batch.set_defaults(func=run_batch)
    args = parser.parse_args()
    if args.command == "edit" and not args.input: die("edit requires at least one --input HTTPS or local image.")
    if getattr(args, "timeout", 1) < 1 or getattr(args, "poll_interval", 1) <= 0 or getattr(args, "request_timeout", 1) <= 0 or getattr(args, "max_attempts", 1) < 1: die("timeout and max-attempts must be >= 1; poll-interval and request-timeout must be > 0.")
    if getattr(args, "downscale_max_dim", None) is not None and args.downscale_max_dim < 1: die("--downscale-max-dim must be >= 1.")
    if getattr(args, "concurrency", 1) < 1 or getattr(args, "concurrency", 1) > 25: die("--concurrency must be between 1 and 25.")
    result = args.func(args)
    if asyncio.iscoroutine(result): asyncio.run(result)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
