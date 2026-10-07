from __future__ import annotations

import argparse
import asyncio
import contextlib
import importlib.util
import io
import json
import os
import tempfile
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from unittest import mock


SCRIPT = Path(__file__).parents[1] / "scripts" / "image_gen.py"
SPEC = importlib.util.spec_from_file_location("image_gen", SCRIPT)
assert SPEC and SPEC.loader
image_gen = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(image_gen)


def common_args(**overrides: object) -> argparse.Namespace:
    values: dict[str, object] = {
        "model": "gpt-image-2",
        "prompt": "Test prompt",
        "prompt_file": None,
        "n": None,
        "size": None,
        "quality": None,
        "aspect_ratio": None,
        "resolution": None,
        "background": None,
        "output_format": None,
        "param": [],
        "body_json": None,
        "request_path": None,
        "input": [],
        "out": "output",
        "out_dir": None,
        "force": False,
        "dry_run": False,
        "timeout": 60,
        "poll_interval": 0.01,
        "request_timeout": 2.0,
        "max_attempts": 1,
        "downscale_max_dim": None,
        "downscale_suffix": "-web",
        "augment": False,
        "concurrency": 2,
        "fail_fast": True,
    }
    values.update(overrides)
    return argparse.Namespace(**values)


class InputParsingTests(unittest.TestCase):
    def test_local_shorthand_and_json_path(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            jpg = Path(directory) / "photo.jpg"
            png = Path(directory) / "mask.png"
            jpg.touch()
            png.touch()

            inputs = image_gen.parse_inputs(
                [
                    f"source={jpg}",
                    {"role": "mask", "path": str(png), "mimeType": "image/png"},
                ]
            )

        self.assertEqual(inputs[0]["path"], str(jpg))
        self.assertEqual(inputs[0]["mimeType"], "image/jpeg")
        self.assertEqual(inputs[1]["path"], str(png))

    def test_remote_url_remains_compatible(self) -> None:
        shorthand, structured = image_gen.parse_inputs(
            [
                "reference=https://cdn.example.com/look.webp",
                {"role": "source", "url": "https://cdn.example.com/photo.jpg", "mimeType": "image/jpeg"},
            ]
        )

        self.assertEqual(shorthand["url"], "https://cdn.example.com/look.webp")
        self.assertNotIn("path", shorthand)
        self.assertEqual(structured["url"], "https://cdn.example.com/photo.jpg")

    def test_non_https_scheme_is_not_treated_as_file(self) -> None:
        with self.assertRaises(SystemExit), contextlib.redirect_stderr(io.StringIO()):
            image_gen.parse_inputs(["source=file:///tmp/photo.jpg"])

    def test_windows_absolute_paths_are_classified_as_paths(self) -> None:
        for value in (r"C:\images\photo.jpg", "C:/images/photo.jpg"):
            with self.subTest(value=value):
                self.assertEqual(image_gen.classify_input_location(value), "path")

    def test_explicit_uri_schemes_are_not_classified_as_paths(self) -> None:
        for value in ("file:///tmp/photo.jpg", "http://example.com/photo.jpg", "ftp://example.com/photo.jpg"):
            with self.subTest(value=value):
                self.assertEqual(image_gen.classify_input_location(value), "unsupported_uri")

    def test_local_unsupported_extension_is_rejected_with_explicit_mime(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "photo.gif"
            source.touch()
            with self.assertRaises(SystemExit), contextlib.redirect_stderr(io.StringIO()):
                image_gen.parse_inputs([{"role": "source", "path": str(source), "mimeType": "image/jpeg"}])


class OpenAISizeTests(unittest.TestCase):
    def test_gpt_image_maps_aspect_ratio_and_resolution_to_size(self) -> None:
        payload, _ = image_gen.build_job(common_args(aspect_ratio="16:9", resolution="2K"), prompt="Test")
        body = payload["request"]["body"]
        self.assertEqual(body["size"], "2048x1152")
        self.assertNotIn("aspect_ratio", body)
        self.assertNotIn("resolution", body)

    def test_gpt_image_table_and_adaptive(self) -> None:
        self.assertEqual(image_gen.gpt_image_size("gpt-image-2.5-flare", "21:9", "1K"), "1344x576")
        self.assertEqual(image_gen.gpt_image_size("gpt-image-2.5-sunburst", "adaptive", "2K"), "auto")

    def test_explicit_size_wins_over_aspect_ratio(self) -> None:
        payload, _ = image_gen.build_job(common_args(size="1536x1024", aspect_ratio="9:16"), prompt="Test")
        body = payload["request"]["body"]
        self.assertEqual(body["size"], "1536x1024")
        self.assertNotIn("aspect_ratio", body)

    def test_non_gpt_image_keeps_aspect_ratio(self) -> None:
        args = common_args(model="doubao-seedream-5-0-pro-260628", aspect_ratio="21:9")
        payload, _ = image_gen.build_job(args, prompt="Test")
        self.assertEqual(payload["request"]["body"]["aspect_ratio"], "21:9")


class GeminiRoutingTests(unittest.TestCase):
    def test_aliases_and_canonical_ids_use_generate_content(self) -> None:
        aliases = {
            "nano-banana-2.1": "gemini-nano-banana-2.1",
            "nano-banana-2": "gemini-3.1-flash-image",
            "nano-banana-latest": "gemini-3.1-flash-image",
            "nano-banana-2-lite": "gemini-3.1-flash-lite-image",
            "nano-banana-lite": "gemini-3.1-flash-lite-image",
            "gemini-flash-lite-image-latest": "gemini-3.1-flash-lite-image",
            "nano-banana-pro": "gemini-3-pro-image",
        }
        for alias, canonical in aliases.items():
            for model in (alias, canonical):
                with self.subTest(model=model):
                    payload, _ = image_gen.build_job(common_args(model=model), prompt="Final prompt")
                    request = payload["request"]
                    self.assertEqual(request["path"], f"/gemini/v1beta/models/{canonical}:generateContent")
                    self.assertEqual(request["body"], {"contents": [{"parts": [{"text": "Final prompt"}], "role": "user"}]})

    def test_nano_banana_21_preserves_nested_parameters_and_search(self) -> None:
        tools = [{"googleSearch": {"searchTypes": {"webSearch": {}, "imageSearch": {}}}}]
        for size in ("1K", "2K", "4K"):
            for thinking in ("minimal", "medium", "high"):
                with self.subTest(size=size, thinking=thinking):
                    args = common_args(
                        model="nano-banana-2.1",
                        body_json=json.dumps({
                            "model": "stale-model", "prompt": "Stale prompt",
                            "contents": [{"parts": [{"text": "Stale contents"}]}],
                            "generationConfig": {"imageConfig": {"aspectRatio": "16:9", "imageSize": "1K"}},
                        }),
                        param=[
                            f"generationConfig.imageConfig.imageSize={size}",
                            f"generationConfig.thinkingConfig.thinkingLevel={thinking}",
                            'generationConfig.responseModalities=["IMAGE"]',
                            f"tools={json.dumps(tools)}",
                        ],
                    )
                    payload, _ = image_gen.build_job(args, prompt="Final prompt")
                    self.assertEqual(payload["request"]["body"], {
                        "contents": [{"parts": [{"text": "Final prompt"}], "role": "user"}],
                        "generationConfig": {
                            "imageConfig": {"aspectRatio": "16:9", "imageSize": size},
                            "thinkingConfig": {"thinkingLevel": thinking},
                            "responseModalities": ["IMAGE"],
                        },
                        "tools": tools,
                    })

    def test_batch_override_routes_nano_banana_21_with_fourteen_inputs(self) -> None:
        inputs = [
            {"role": "reference" if index < 10 else "character",
             "url": f"https://cdn.example.com/{index}.png", "mimeType": "image/png"}
            for index in range(14)
        ]
        payload, parsed_inputs = image_gen.build_job(common_args(), prompt="Combine all inputs", overrides={
            "model": "nano-banana-2.1",
            "inputs": inputs,
            "params": {"generationConfig": {"imageConfig": {"imageSize": "4K"}}},
        })
        self.assertEqual(payload["request"]["path"], "/gemini/v1beta/models/gemini-nano-banana-2.1:generateContent")
        self.assertEqual(payload["request"]["body"]["generationConfig"], {"imageConfig": {"imageSize": "4K"}})
        self.assertEqual(payload["inputs"], parsed_inputs)
        self.assertEqual(parsed_inputs, [item | {"ordinal": index} for index, item in enumerate(inputs)])

    def test_explicit_request_path_still_wins(self) -> None:
        path = "/gemini/v1beta/models/custom-image:generateContent"
        payload, _ = image_gen.build_job(common_args(model="nano-banana-2.1", request_path=path), prompt="Test")
        self.assertEqual(payload["request"]["path"], path)
        self.assertNotIn("model", payload["request"]["body"])

    def test_legacy_nano_banana_keeps_512_parameter(self) -> None:
        for model in ("nano-banana-2", "nano-banana-latest"):
            with self.subTest(model=model):
                args = common_args(model=model, param=['generationConfig.imageConfig.imageSize="512"'])
                payload, _ = image_gen.build_job(args, prompt="Test")
                self.assertEqual(payload["request"]["path"], "/gemini/v1beta/models/gemini-3.1-flash-image:generateContent")
                self.assertEqual(payload["request"]["body"]["generationConfig"], {"imageConfig": {"imageSize": "512"}})

    def test_gpt_default_and_unknown_models_keep_openai_path(self) -> None:
        parser = argparse.ArgumentParser()
        image_gen.add_common(parser)
        args = parser.parse_args([])
        self.assertEqual(args.model, "gpt-image-2.5-flare")
        for model in (args.model, "gemini-3.8-flash", "unknown-image-model"):
            with self.subTest(model=model):
                payload, _ = image_gen.build_job(common_args(model=model), prompt="Test")
                self.assertEqual(payload["request"]["path"], "/v1/images/generations")
                self.assertEqual(payload["request"]["body"], {"model": model, "prompt": "Test"})


class DryRunTests(unittest.TestCase):
    def test_dry_run_shows_upload_plan_without_reading_bytes(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "photo.jpg"
            source.touch()
            args = common_args(input=[f"source={source}"], dry_run=True)
            output = io.StringIO()

            with (
                mock.patch.object(Path, "read_bytes", side_effect=AssertionError("read_bytes called")),
                mock.patch.object(image_gen, "request_bytes", side_effect=AssertionError("request called")),
                contextlib.redirect_stdout(output),
            ):
                image_gen.run_one(args)

        preview = json.loads(output.getvalue())
        self.assertEqual(preview["uploads"][0]["path"], str(source))
        request_input = preview["request"]["inputs"][0]
        self.assertEqual(request_input["url"], "https://image-input.invalid/0.jpg")
        self.assertNotIn("path", request_input)


class UploadTests(unittest.TestCase):
    def test_oversized_local_input_does_not_make_request(self) -> None:
        item = {"role": "source", "path": "large.jpg", "mimeType": "image/jpeg", "ordinal": 0}
        stat_result = mock.Mock(st_size=image_gen.MAX_LOCAL_INPUT_BYTES + 1)
        error = io.StringIO()

        with (
            mock.patch.object(Path, "stat", return_value=stat_result),
            mock.patch.object(Path, "open", side_effect=AssertionError("open called")),
            mock.patch.object(image_gen, "request_bytes", side_effect=AssertionError("request called")) as request,
            self.assertRaises(SystemExit),
            contextlib.redirect_stderr(error),
        ):
            image_gen.upload_input(item, common_args(), "secret-key")

        request.assert_not_called()
        self.assertIn("20 MiB", error.getvalue())

    def test_local_input_read_is_bounded(self) -> None:
        path = Path("photo.jpg")
        stat_result = mock.Mock(st_size=10)
        file = mock.MagicMock()
        file.__enter__.return_value = file
        file.read.return_value = b"contents"

        with mock.patch.object(Path, "stat", return_value=stat_result), mock.patch.object(Path, "open", return_value=file):
            content = image_gen.read_local_input(path)

        self.assertEqual(content, b"contents")
        file.read.assert_called_once_with(image_gen.MAX_LOCAL_INPUT_BYTES + 1)

    def test_local_input_growth_is_rejected_before_request(self) -> None:
        item = {"role": "source", "path": "growing.jpg", "mimeType": "image/jpeg", "ordinal": 0}
        stat_result = mock.Mock(st_size=10)
        file = mock.MagicMock()
        file.__enter__.return_value = file
        file.read.return_value = b"x" * (image_gen.MAX_LOCAL_INPUT_BYTES + 1)
        error = io.StringIO()

        with (
            mock.patch.object(Path, "stat", return_value=stat_result),
            mock.patch.object(Path, "open", return_value=file),
            mock.patch.object(image_gen, "request_bytes", side_effect=AssertionError("request called")) as request,
            self.assertRaises(SystemExit),
            contextlib.redirect_stderr(error),
        ):
            image_gen.upload_input(item, common_args(), "secret-key")

        request.assert_not_called()
        self.assertIn("20 MiB", error.getvalue())

    def test_upload_sends_raw_body_content_type_and_replaces_path(self) -> None:
        received: dict[str, object] = {}

        class Handler(BaseHTTPRequestHandler):
            def do_POST(self) -> None:
                length = int(self.headers["Content-Length"])
                received.update(
                    path=self.path,
                    body=self.rfile.read(length),
                    content_type=self.headers["Content-Type"],
                    authorization=self.headers["Authorization"],
                )
                response = json.dumps({"url": "https://cdn.example.com/uploaded.jpg", "expiresAt": "2099-01-01T00:00:00Z"}).encode()
                self.send_response(201)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(response)))
                self.end_headers()
                self.wfile.write(response)

            def log_message(self, format: str, *args: object) -> None:
                pass

        server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        thread = threading.Thread(target=server.serve_forever)
        thread.start()
        try:
            with tempfile.TemporaryDirectory() as directory:
                source = Path(directory) / "photo.jpg"
                source.write_bytes(b"jpeg contents")
                payload = {"request": {}, "inputs": image_gen.parse_inputs([f"source={source}"])}
                with mock.patch.dict(os.environ, {"YOUTU_BASE_URL": f"http://127.0.0.1:{server.server_port}"}):
                    prepared = image_gen.upload_inputs(payload, common_args(), "secret-key")
        finally:
            server.shutdown()
            thread.join()
            server.server_close()

        self.assertEqual(received["path"], "/image-inputs")
        self.assertEqual(received["body"], b"jpeg contents")
        self.assertEqual(received["content_type"], "image/jpeg")
        self.assertEqual(received["authorization"], "Bearer secret-key")
        self.assertEqual(prepared["inputs"][0]["url"], "https://cdn.example.com/uploaded.jpg")
        self.assertNotIn("path", prepared["inputs"][0])

    def test_upload_rejects_mismatched_response_mime(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "photo.jpg"
            source.touch()
            item = image_gen.parse_inputs([f"source={source}"])[0]
            response = json.dumps({"url": "https://cdn.example.com/uploaded.jpg", "mimeType": "image/png"}).encode()

            with mock.patch.object(image_gen, "request_bytes", return_value=response), self.assertRaisesRegex(RuntimeError, "expected 'image/jpeg'"):
                image_gen.upload_input(item, common_args(), "secret-key")


class BatchTests(unittest.TestCase):
    def test_local_upload_runs_inside_worker(self) -> None:
        main_thread = threading.get_ident()
        upload_threads: list[int] = []

        def upload_inputs(payload: dict[str, object], args: argparse.Namespace, key: str) -> dict[str, object]:
            upload_threads.append(threading.get_ident())
            prepared, _ = image_gen.prepare_inputs(payload)
            return prepared

        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "photo.webp"
            source.touch()
            batch = Path(directory) / "jobs.jsonl"
            batch.write_text(json.dumps({"prompt": "Edit it", "inputs": [{"role": "source", "path": str(source)}]}) + "\n")
            args = common_args(batch_input=str(batch))

            with (
                mock.patch.object(image_gen, "require_key", return_value="secret-key"),
                mock.patch.object(image_gen, "upload_inputs", side_effect=upload_inputs),
                mock.patch.object(image_gen, "submit_and_wait", return_value={"gatewayJobId": "job", "status": "succeeded"}),
                mock.patch.object(image_gen, "download_outputs"),
            ):
                asyncio.run(image_gen.run_batch(args))

        self.assertEqual(len(upload_threads), 1)
        self.assertNotEqual(upload_threads[0], main_thread)


if __name__ == "__main__":
    unittest.main()