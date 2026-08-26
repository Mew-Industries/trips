#!/usr/bin/env python3
"""Tiny shared checklist API for the Japan trip site."""

from __future__ import annotations

import argparse
import json
import os
import re
import tempfile
import threading
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


ACCESS_PATH = "/88c0c7054253ecf08eac9055cd1afc13ae1836ae"
ALLOWED_ORIGIN = "https://mew-industries.github.io"
ACTIVITY_ID = re.compile(r"^act-[a-z0-9-]{1,180}$")
DEFAULT_DATA = Path("/home/openclaw/.openclaw/workspace/data/japon-checks.json")
STATE_LOCK = threading.Lock()


def empty_state() -> dict:
    return {"done": [], "updatedAt": None}


def read_state(path: Path) -> dict:
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        done = raw.get("done", [])
        if not isinstance(done, list) or any(not isinstance(x, str) for x in done):
            raise ValueError("invalid done list")
        return {"done": sorted(set(done)), "updatedAt": raw.get("updatedAt")}
    except (FileNotFoundError, json.JSONDecodeError, OSError, ValueError):
        return empty_state()


def write_state(path: Path, state: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_name = tempfile.mkstemp(prefix=path.name + ".", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            json.dump(state, handle, ensure_ascii=False, indent=2, sort_keys=True)
            handle.write("\n")
            handle.flush()
            os.fsync(handle.fileno())
        os.chmod(tmp_name, 0o600)
        os.replace(tmp_name, path)
    finally:
        if os.path.exists(tmp_name):
            os.unlink(tmp_name)


def toggle(path: Path, activity_id: str, done: bool) -> dict:
    with STATE_LOCK:
        state = read_state(path)
        values = set(state["done"])
        if done:
            values.add(activity_id)
        else:
            values.discard(activity_id)
        state = {
            "done": sorted(values),
            "updatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        }
        write_state(path, state)
        return state


class ChecklistHandler(BaseHTTPRequestHandler):
    server_version = "JapanChecklist/1.0"

    def _headers(self, status: int = 200) -> None:
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", ALLOWED_ORIGIN)
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "content-type")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Vary", "Origin")
        self.end_headers()

    def _json(self, body: dict, status: int = 200) -> None:
        self._headers(status)
        self.wfile.write(json.dumps(body, ensure_ascii=False).encode("utf-8"))

    def _valid_path(self) -> bool:
        return self.path.split("?", 1)[0] == ACCESS_PATH

    def do_OPTIONS(self) -> None:  # noqa: N802
        if not self._valid_path():
            self._json({"error": "not found"}, 404)
            return
        self._headers(204)

    def do_GET(self) -> None:  # noqa: N802
        if not self._valid_path():
            self._json({"error": "not found"}, 404)
            return
        with STATE_LOCK:
            self._json(read_state(self.server.data_path))

    def do_POST(self) -> None:  # noqa: N802
        if not self._valid_path():
            self._json({"error": "not found"}, 404)
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length < 1 or length > 512:
                raise ValueError("invalid body size")
            body = json.loads(self.rfile.read(length))
            activity_id, done = body.get("id"), body.get("done")
            if not isinstance(activity_id, str) or not ACTIVITY_ID.fullmatch(activity_id):
                raise ValueError("invalid activity id")
            if not isinstance(done, bool):
                raise ValueError("invalid done value")
        except (ValueError, json.JSONDecodeError, AttributeError):
            self._json({"error": "invalid toggle"}, 400)
            return
        self._json(toggle(self.server.data_path, activity_id, done))

    def do_PUT(self) -> None:  # noqa: N802
        self._json({"error": "method not allowed"}, 405)

    def log_message(self, fmt: str, *args) -> None:
        print("%s - %s" % (self.address_string(), fmt % args), flush=True)


def make_server(host: str, port: int, data_path: Path) -> ThreadingHTTPServer:
    server = ThreadingHTTPServer((host, port), ChecklistHandler)
    server.data_path = data_path
    return server


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=9102)
    parser.add_argument("--data", type=Path, default=DEFAULT_DATA)
    args = parser.parse_args()
    make_server(args.host, args.port, args.data).serve_forever()


if __name__ == "__main__":
    main()
