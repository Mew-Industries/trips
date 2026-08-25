#!/usr/bin/env python3
"""Backend de votos de la app de swipe (japon/votar/) — task 548.

Sirve tres endpoints sobre https://votos.mewis.online:

    GET  /health                -> {"ok": true, ...}
    GET  /votes?u=<token>       -> los votos de ESE votante
    PUT  /votes                 -> {"token","place_id","vote"} idempotente
    GET  /aggregate             -> tally por place_id (público, sin token)

Por qué no es un Cloudflare Worker + KV, que era el plan original: el
`CF_API_TOKEN` de la casa sólo tiene permisos de zona (DNS) y de Cloudflare
Tunnel — `POST /accounts/*/workers/scripts` y `/storage/kv/namespaces`
devuelven `10000 Authentication error` (mismo muro contra el que chocó la
task 546). El túnel cloudflared que ya corre en el host sí es editable con ese
token, así que el endpoint es este proceso local publicado por el túnel. Misma
superficie HTTP que iba a tener el Worker: si algún día aparece un token con
permisos de Workers, se reimplementa detrás de la misma API y el cliente no se
entera.

Identidad: no hay login. Cada viajero tiene un token no adivinable que viaja en
la URL de su link personal (`/votar/?u=<token>`). El token identifica y
autoriza; sin token conocido no se puede leer ni escribir un voto.

Estado: SQLite en DATA_DIR (fuera del repo — el repo es GitHub Pages, todo lo
que vive ahí es público).
"""

import json
import os
import re
import sqlite3
import secrets
import threading
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HOST = os.environ.get("VOTOS_HOST", "127.0.0.1")
PORT = int(os.environ.get("VOTOS_PORT", "9202"))
DATA_DIR = os.environ.get(
    "VOTOS_DATA_DIR", "/home/openclaw/.openclaw/workspace/data/japon-votos"
)
DB_PATH = os.path.join(DATA_DIR, "votos.db")

# Los tres votos posibles y su peso en el score. `no` pesa 0 a propósito: el
# score mide interés acumulado, no consenso — un "paso" no descuenta el
# entusiasmo de otro. Quien quiera penalizar los "no" tiene el tally crudo.
VOTES = {"si": 1, "star": 2, "no": 0}
PLACE_RE = re.compile(r"^p-[a-z0-9\-]{1,140}$")
MAX_BODY = 4096

# Los cuatro viajeros. El token se genera solo la primera vez que arranca el
# servicio (y se guarda en la db + links.md); acá sólo vive el orden y el
# nombre para mostrar.
TRAVELLERS = [
    ("martin", "Martín"),
    ("cata", "Cata"),
    ("zava", "Zava"),
    ("ari", "Ari"),
]

_lock = threading.Lock()


def now_iso():
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def connect():
    con = sqlite3.connect(DB_PATH, timeout=10)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA journal_mode=WAL")
    con.execute("PRAGMA busy_timeout=5000")
    return con


def init_db():
    os.makedirs(DATA_DIR, exist_ok=True)
    con = connect()
    with con:
        con.execute(
            "CREATE TABLE IF NOT EXISTS users ("
            " id TEXT PRIMARY KEY, name TEXT NOT NULL,"
            " token TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL)"
        )
        con.execute(
            "CREATE TABLE IF NOT EXISTS votes ("
            " token TEXT NOT NULL, place_id TEXT NOT NULL, vote TEXT NOT NULL,"
            " updated_at TEXT NOT NULL, PRIMARY KEY (token, place_id))"
        )
        for uid, name in TRAVELLERS:
            con.execute(
                "INSERT OR IGNORE INTO users (id, name, token, created_at)"
                " VALUES (?,?,?,?)",
                (uid, name, secrets.token_hex(10), now_iso()),
            )
    # Los links personales en texto plano, para poder mandárselos a cada uno sin
    # tener que abrir la db. Sólo lectura del dueño: son credenciales.
    path = os.path.join(DATA_DIR, "links.md")
    rows = con.execute("SELECT id, name, token FROM users").fetchall()
    order = {uid: i for i, (uid, _) in enumerate(TRAVELLERS)}
    rows = sorted(rows, key=lambda r: order.get(r["id"], 99))
    lines = ["# Links personales de votación (japon/votar) — task 548", ""]
    lines += [
        "- {}: https://mew-industries.github.io/trips/japon/votar/?u={}".format(
            r["name"], r["token"]
        )
        for r in rows
    ]
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines) + "\n")
    os.replace(tmp, path)
    os.chmod(path, 0o600)
    con.close()


def user_for(token):
    if not token or not re.fullmatch(r"[a-f0-9]{20,64}", str(token)):
        return None
    con = connect()
    try:
        return con.execute(
            "SELECT id, name, token FROM users WHERE token = ?", (token,)
        ).fetchone()
    finally:
        con.close()


class Handler(BaseHTTPRequestHandler):
    server_version = "japon-votos/1.0"
    protocol_version = "HTTP/1.1"

    # ---------------------------------------------------------------- helpers

    def _cors(self):
        # El front es estático en GitHub Pages y el endpoint vive en otro
        # dominio: sin CORS no hay app. Nada de lo que se sirve es privado más
        # allá del token, que el que llama ya tiene que conocer.
        self.send_header("access-control-allow-origin", "*")
        self.send_header("access-control-allow-methods", "GET, PUT, OPTIONS")
        self.send_header("access-control-allow-headers", "content-type")
        self.send_header("cache-control", "no-store")

    def _json(self, obj, status=200):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self._cors()
        self.send_header("content-type", "application/json; charset=utf-8")
        self.send_header("content-length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):  # journal ya tiene timestamp propio
        print("%s %s" % (self.address_string(), fmt % args), flush=True)

    # ---------------------------------------------------------------- métodos

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.send_header("content-length", "0")
        self.end_headers()

    def do_GET(self):
        path, _, query = self.path.partition("?")
        params = {}
        for chunk in query.split("&"):
            if "=" in chunk:
                k, _, v = chunk.partition("=")
                params[k] = v
        if path == "/health":
            return self._json({"ok": True, "service": "japon-votos", "now": now_iso()})
        if path == "/votes":
            return self._get_votes(params.get("u", ""))
        if path == "/aggregate":
            return self._aggregate()
        return self._json({"error": "not found"}, 404)

    def do_PUT(self):
        if self.path.partition("?")[0] != "/votes":
            return self._json({"error": "not found"}, 404)
        try:
            length = int(self.headers.get("content-length") or 0)
        except ValueError:
            return self._json({"error": "bad length"}, 400)
        if length <= 0 or length > MAX_BODY:
            return self._json({"error": "bad length"}, 400)
        try:
            body = json.loads(self.rfile.read(length).decode("utf-8"))
        except Exception:
            return self._json({"error": "invalid json"}, 400)
        return self._put_vote(body if isinstance(body, dict) else {})

    # ------------------------------------------------------------ handlers

    def _get_votes(self, token):
        user = user_for(token)
        if not user:
            return self._json({"error": "unknown token"}, 403)
        con = connect()
        try:
            # Ordenado por cuándo se votó: `history` es la pila de deshacer del
            # cliente, y sin ella el "deshacer" se perdería en cada recarga.
            rows = con.execute(
                "SELECT place_id, vote, updated_at FROM votes WHERE token = ?"
                " ORDER BY updated_at ASC, place_id ASC",
                (user["token"],),
            ).fetchall()
        finally:
            con.close()
        votes = {r["place_id"]: r["vote"] for r in rows}
        return self._json(
            {
                "user": {"id": user["id"], "name": user["name"]},
                "votes": votes,
                "history": [r["place_id"] for r in rows],
                "count": len(votes),
                "updatedAt": max([r["updated_at"] for r in rows], default=None),
            }
        )

    def _put_vote(self, body):
        user = user_for(body.get("token"))
        if not user:
            return self._json({"error": "unknown token"}, 403)
        place_id = str(body.get("place_id") or "")
        if not PLACE_RE.match(place_id):
            return self._json({"error": "invalid place_id"}, 400)
        vote = body.get("vote")
        # `vote: null` es el deshacer: borra la fila y el lugar vuelve al mazo.
        if vote in (None, "", "undo"):
            with _lock:
                con = connect()
                with con:
                    con.execute(
                        "DELETE FROM votes WHERE token = ? AND place_id = ?",
                        (user["token"], place_id),
                    )
                con.close()
            return self._json({"ok": True, "place_id": place_id, "vote": None})
        if vote not in VOTES:
            return self._json({"error": "invalid vote"}, 400)
        ts = now_iso()
        with _lock:
            con = connect()
            with con:
                con.execute(
                    "INSERT INTO votes (token, place_id, vote, updated_at)"
                    " VALUES (?,?,?,?) ON CONFLICT(token, place_id)"
                    " DO UPDATE SET vote = excluded.vote, updated_at = excluded.updated_at",
                    (user["token"], place_id, vote, ts),
                )
            con.close()
        return self._json({"ok": True, "place_id": place_id, "vote": vote, "updatedAt": ts})

    def _aggregate(self):
        """Tally crudo por lugar. Es la interfaz que va a consumir la app
        principal para su flag `destacado`: acá sólo se expone el conteo y el
        score; el umbral (cuántos votantes, qué score) se decide del otro lado."""
        con = connect()
        try:
            rows = con.execute("SELECT token, place_id, vote FROM votes").fetchall()
            users = con.execute("SELECT id, name, token FROM users").fetchall()
            last = con.execute("SELECT MAX(updated_at) AS m FROM votes").fetchone()["m"]
        finally:
            con.close()
        by_token = {u["token"]: u["id"] for u in users}
        places = {}
        voters = set()
        for r in rows:
            uid = by_token.get(r["token"])
            if uid is None:
                continue
            voters.add(uid)
            p = places.setdefault(
                r["place_id"], {"si": 0, "no": 0, "star": 0, "score": 0, "voters": 0}
            )
            p[r["vote"]] += 1
            p["score"] += VOTES[r["vote"]]
            p["voters"] += 1
        return self._json(
            {
                "places": places,
                "voters": sorted(voters),
                "voterCount": len(voters),
                "totalVotes": len(rows),
                "weights": VOTES,
                "updatedAt": last,
            }
        )


def main():
    init_db()
    srv = ThreadingHTTPServer((HOST, PORT), Handler)
    print("japon-votos escuchando en http://%s:%d (db: %s)" % (HOST, PORT, DB_PATH), flush=True)
    srv.serve_forever()


if __name__ == "__main__":
    main()
