#!/usr/bin/env python3
"""Genera japon/votar/frames.js + japon/votar/img/*.webp — task 548.

De cada reel de la colección quedan frames sueltos en
`projects/japan-trip/data/ig/frames/<code>/fNN.jpg` (el pipeline los borra
después de transcribir, así que la cobertura es parcial y varía). Este script
elige UN frame representativo por reel —el del medio del video, que suele ser
el plano del lugar y no el título ni el cierre—, lo comprime a webp y escribe
el índice `place_id -> img/<code>.webp` que consume la app de swipe.

Los lugares sin frame no rompen nada: la app les dibuja una card tipográfica
con el color de su categoría.

Uso: python3 japon/votar/scripts/build_frames.py [--max-kb 60]
"""

import argparse
import json
import os
import re
import sys
import unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
VOTAR = os.path.dirname(HERE)
JAPON = os.path.dirname(VOTAR)
FRAMES_SRC = os.path.expanduser(
    "~/.openclaw/workspace/projects/japan-trip/data/ig/frames"
)
OUT_IMG = os.path.join(VOTAR, "img")
OUT_JS = os.path.join(VOTAR, "frames.js")

REEL_CODE = re.compile(r"/(?:p|reel)/([A-Za-z0-9_-]+)")


def cat_key(s):
    """Mismo `catKey` que index.html y que app.js: sin acentos, minúsculas y
    todo lo que no sea letra o número unicode colapsado a espacio. La clase
    tiene que ser unicode (y no `[^0-9a-z]`) porque hay nombres con kana y
    kanji: si acá se comieran los caracteres japoneses y en el browser no,
    los place_id de este índice no matchearían los de la app."""
    s = unicodedata.normalize("NFD", str(s or ""))
    s = "".join(c for c in s if unicodedata.category(c) != "Mn").lower()
    # `isalnum()` es el equivalente de `\p{L}\p{N}` sin traerse el `_` que sí
    # entra en `\w`.
    s = "".join(c if c.isalnum() else " " for c in s)
    return re.sub(r"\s+", " ", s).strip()


def hash32(s):
    """FNV-1a de 32 bits sobre unidades UTF-16, en base36. Tiene que dar
    exactamente lo mismo que el `hash32` de app.js (que itera `charCodeAt`, o
    sea UTF-16), porque los dos generan el mismo place_id."""
    h = 2166136261
    units = str(s or "").encode("utf-16-le")
    for i in range(0, len(units), 2):
        h = ((h ^ (units[i] | (units[i + 1] << 8))) * 16777619) & 0xFFFFFFFF
    if h == 0:
        return "0"
    digits = "0123456789abcdefghijklmnopqrstuvwxyz"
    out = ""
    while h:
        out = digits[h % 36] + out
        h //= 36
    return out


def place_id(name):
    """`p-<thingKey>` — thingKey es catKey del nombre sin el paréntesis final,
    igual que en la app principal, así el join entre las dos apps es directo.

    El id sale ASCII sí o sí: el backend valida `^p-[a-z0-9-]+$` y un nombre en
    kana produciría un id que se come un 400. Mismo criterio (y mismo hash de
    fallback) que `placeId()` en app.js — si uno cambia, cambian los dos o el
    índice de frames deja de matchear con las cards."""
    key = cat_key(str(name or "").split("(")[0]).replace(" ", "-")
    ascii_key = re.sub(r"-+", "-", re.sub(r"[^a-z0-9-]+", "", key)).strip("-")
    if ascii_key:
        return "p-" + ascii_key[:140]
    return "p-x" + hash32(name)


def load_things():
    src = open(os.path.join(JAPON, "data", "reels.js"), encoding="utf-8").read()
    m = re.search(r"window\.SOURCE_THINGS\s*=\s*(\[.*?\n\];)", src, re.S)
    if not m:
        sys.exit("no encontré window.SOURCE_THINGS en data/reels.js")
    return json.loads(m.group(1)[:-1])


def pick_frame(code):
    """El frame del medio de los que sobrevivieron para ese reel."""
    d = os.path.join(FRAMES_SRC, code)
    if not os.path.isdir(d):
        return None
    files = sorted(f for f in os.listdir(d) if f.lower().endswith((".jpg", ".jpeg", ".png")))
    return os.path.join(d, files[len(files) // 2]) if files else None


def encode(src, dst, max_kb):
    """Portrait 480x854 → webp de card. Baja la calidad hasta entrar en el
    presupuesto; si ni a q=40 entra, se queda con lo mejor que consiguió."""
    from PIL import Image

    im = Image.open(src).convert("RGB")
    im.thumbnail((540, 960), Image.LANCZOS)
    for q in (72, 62, 52, 42):
        im.save(dst, "WEBP", quality=q, method=6)
        if os.path.getsize(dst) <= max_kb * 1024:
            return q, os.path.getsize(dst)
    return q, os.path.getsize(dst)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--max-kb", type=int, default=60)
    args = ap.parse_args()

    things = load_things()
    os.makedirs(OUT_IMG, exist_ok=True)

    index, encoded, total = {}, {}, 0
    for t in things:
        pid = place_id(t.get("name"))
        if pid in index:
            continue
        for s in t.get("sources") or []:
            m = REEL_CODE.search(s.get("url") or "")
            if not m:
                continue
            code = m.group(1)
            if code not in encoded:
                frame = pick_frame(code)
                if not frame:
                    encoded[code] = None
                    continue
                dst = os.path.join(OUT_IMG, code + ".webp")
                q, size = encode(frame, dst, args.max_kb)
                # La ruta va relativa a japon/votar/index.html, que es quien la
                # mete en el `src`: sin el `img/` la card pide el webp al lado
                # del index y se lleva un 404.
                encoded[code] = "img/" + code + ".webp"
                total += size
                print("  %-14s q=%d %5.1f KB  <- %s" % (code, q, size / 1024, os.path.basename(frame)))
            if encoded[code]:
                index[pid] = encoded[code]
                break

    # Sacar los webp de reels que ya no mapean a ningún lugar vivo.
    keep = set(os.path.basename(v) for v in index.values())
    for f in os.listdir(OUT_IMG):
        if f.endswith(".webp") and f not in keep:
            os.remove(os.path.join(OUT_IMG, f))
            print("  (borrado sobrante) %s" % f)

    with open(OUT_JS, "w", encoding="utf-8") as fh:
        fh.write(
            "// Generado por japon/votar/scripts/build_frames.py — NO editar a mano.\n"
            "// %d lugares con frame de reel sobre %d. El resto va con card tipográfica.\n"
            "window.VOTAR_FRAMES = %s;\n"
            % (len(index), len(things), json.dumps(index, indent=1, sort_keys=True, ensure_ascii=False))
        )

    print(
        "\n%d/%d lugares con imagen · %d webp · %.1f KB en total"
        % (len(index), len(things), len(keep), total / 1024)
    )


if __name__ == "__main__":
    main()
