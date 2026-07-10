#!/usr/bin/env python3
"""update_weather.py — keep per-stop temperatures in index.html fresh.

The trip is Sept-Oct 2026. No service forecasts that far out, so "real-time"
means, honestly, two regimes picked automatically per stop:

  - date within OPEN-METEO forecast range (<=16 days from today)
      → real forecast (api.open-meteo.com/v1/forecast)
  - date further out (the normal case until ~2 weeks before travel)
      → climatology: average of the same calendar window over the last
        N years from the historical archive (archive-api.open-meteo.com)

For each destination it computes a max/min RANGE across the stop's days and
writes it back into the `tempMax`/`tempMin` string fields of index.html,
plus stamps a `weatherUpdated` date. Pending stops ("fechas a confirmar")
fall back to their planned month midpoint so the curve still shows something
sensible.

No API key. Idempotent. Safe: validates JS still parses (node --check) before
declaring success; on any per-stop fetch error it leaves that stop untouched.

Usage:
  python3 scripts/update_weather.py            # update + report
  python3 scripts/update_weather.py --dry-run  # show what would change
"""
from __future__ import annotations
import json, re, sys, subprocess, urllib.request, urllib.parse
from datetime import date, datetime, timedelta
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
INDEX = REPO / "index.html"
TRIP_YEAR = 2026
CLIMO_YEARS = 6           # how many past years to average for normals
FORECAST_HORIZON_DAYS = 16

ES_MONTHS = {
    "ene": 1, "feb": 2, "mar": 3, "abr": 4, "may": 5, "jun": 6,
    "jul": 7, "ago": 8, "sep": 9, "sept": 9, "oct": 10, "nov": 11, "dic": 12,
}

# Planned-month fallback for pending ("fechas a confirmar") stops, by stop id.
# Keeps the climate curve sensible before exact dates are locked.
PENDING_FALLBACK = {
    "nikko": (9, 24), "kanazawa": (9, 26), "koyasan": (9, 28),
    "kioto": (10, 1), "osaka": (10, 5), "yufuin": (10, 8),
    "fukuoka": (10, 10), "busan": (10, 13), "seul": (10, 16),
}


def _get(url: str, timeout: int = 25) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": "japon-trip-weather/1.0"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode())


def parse_window(dates_str: str, stop_id: str) -> tuple[date, date] | None:
    """Parse '10-13 sept' / '30 sept-5 oct' into (start,end) dates in 2026.
    Pending → fallback midpoint (3-day window)."""
    s = dates_str.strip().lower()
    if "confirmar" in s or not s:
        fb = PENDING_FALLBACK.get(stop_id)
        if not fb:
            return None
        d0 = date(TRIP_YEAR, fb[0], fb[1])
        return d0, d0 + timedelta(days=2)

    # find "<d> <mon>" pairs; handle "30 sept-5 oct" and "10-13 sept"
    months = list(re.finditer(r"(\d{1,2})(?:\s*-\s*(\d{1,2}))?\s*(" +
                              "|".join(ES_MONTHS) + r")", s))
    if not months:
        return None
    # first token's start day + its month
    first = months[0]
    start_day = int(first.group(1))
    start_mon = ES_MONTHS[first.group(3)]
    # end: prefer last match's day+month; else the dash-range end on same month
    last = months[-1]
    if last.group(2):  # "10-13 sept"
        end_day = int(last.group(2)); end_mon = ES_MONTHS[last.group(3)]
    else:
        end_day = int(last.group(1)); end_mon = ES_MONTHS[last.group(3)]
    try:
        d0 = date(TRIP_YEAR, start_mon, start_day)
        d1 = date(TRIP_YEAR, end_mon, end_day)
    except ValueError:
        return None
    if d1 < d0:
        d1 = d0
    return d0, d1


def temps_for(lat: float, lng: float, d0: date, d1: date) -> tuple[int, int, int, int, str]:
    """Return (maxlo, maxhi, minlo, minhi, mode) °C across the window."""
    today = date.today()
    if (d0 - today).days <= FORECAST_HORIZON_DAYS and d1 >= today:
        # forecast regime
        url = ("https://api.open-meteo.com/v1/forecast?"
               f"latitude={lat}&longitude={lng}&timezone=Asia/Tokyo"
               "&daily=temperature_2m_max,temperature_2m_min"
               f"&start_date={d0.isoformat()}&end_date={d1.isoformat()}")
        j = _get(url)
        mx = [t for t in j["daily"]["temperature_2m_max"] if t is not None]
        mn = [t for t in j["daily"]["temperature_2m_min"] if t is not None]
        mode = "forecast"
    else:
        # climatology: same calendar window, last CLIMO_YEARS years
        mx, mn = [], []
        for yr in range(today.year - CLIMO_YEARS, today.year):
            s = d0.replace(year=yr); e = d1.replace(year=yr)
            url = ("https://archive-api.open-meteo.com/v1/archive?"
                   f"latitude={lat}&longitude={lng}&timezone=Asia/Tokyo"
                   "&daily=temperature_2m_max,temperature_2m_min"
                   f"&start_date={s.isoformat()}&end_date={e.isoformat()}")
            try:
                j = _get(url)
                mx += [t for t in j["daily"]["temperature_2m_max"] if t is not None]
                mn += [t for t in j["daily"]["temperature_2m_min"] if t is not None]
            except Exception:
                continue
        mode = "climatología"
    if not mx or not mn:
        raise RuntimeError("no data")
    return (round(min(mx)), round(max(mx)), round(min(mn)), round(max(mn)), mode)


def main() -> int:
    dry = "--dry-run" in sys.argv
    html = INDEX.read_text()
    stamp = date.today().isoformat()

    # iterate destination blocks: each starts at "id: '...', n: N,"
    block_re = re.compile(
        r"id:\s*'(?P<id>[^']+)',\s*n:\s*\d+,\s*(?:type:\s*'[^']*',\s*)?name:\s*'(?P<name>[^']+)'", )
    edits = []
    for m in block_re.finditer(html):
        sid = m.group("id"); name = m.group("name")
        # slice this block until the next "id: '...', n:" or end
        nxt = block_re.search(html, m.end())
        block = html[m.start(): nxt.start() if nxt else len(html)]
        cm = re.search(r"coords:\s*\[\s*([\d.\-]+)\s*,\s*([\d.\-]+)\s*\]", block)
        dm = re.search(r"dates:\s*'([^']*)'", block)
        if not cm or not dm:
            continue
        win = parse_window(dm.group(1), sid)
        if not win:
            continue
        lat, lng = float(cm.group(1)), float(cm.group(2))
        try:
            maxlo, maxhi, minlo, minhi, mode = temps_for(lat, lng, *win)
        except Exception as e:
            print(f"  skip {sid}: {e}")
            continue
        new_max = f"{maxlo}-{maxhi}" if maxlo != maxhi else f"{maxhi}"
        new_min = f"{minlo}-{minhi}" if minlo != minhi else f"{minhi}"
        edits.append((sid, name, new_max, new_min, mode, m.start(),
                      nxt.start() if nxt else len(html)))

    if not edits:
        print("no editable stops found"); return 1

    # apply edits back-to-front so offsets stay valid
    for sid, name, new_max, new_min, mode, b0, b1 in reversed(edits):
        block = html[b0:b1]
        block = re.sub(r"tempMax:\s*'[^']*'", f"tempMax: '{new_max}'", block, count=1)
        block = re.sub(r"tempMin:\s*'[^']*'", f"tempMin: '{new_min}'", block, count=1)
        # add/update weatherUpdated + weatherMode right after tempMin
        if "weatherUpdated:" in block:
            block = re.sub(r"weatherUpdated:\s*'[^']*'",
                           f"weatherUpdated: '{stamp}'", block, count=1)
            block = re.sub(r"weatherMode:\s*'[^']*'",
                           f"weatherMode: '{mode}'", block, count=1)
        else:
            block = re.sub(r"(tempMin:\s*'[^']*',)",
                           rf"\1 weatherUpdated: '{stamp}', weatherMode: '{mode}',",
                           block, count=1)
        html = html[:b0] + block + html[b1:]

    for sid, name, new_max, new_min, mode, *_ in edits:
        print(f"  {name}: {new_max}/{new_min} °C ({mode})")

    if dry:
        print("\n[dry-run] no file written"); return 0

    # validate JS before writing live
    tmp = INDEX.with_suffix(".html.tmp")
    tmp.write_text(html)
    js = [b for b in re.findall(r"<script(?:\s[^>]*)?>(.*?)</script>", html, re.S)
          if "const destinations" in b]
    if js:
        chk = REPO / ".wcheck.js"; chk.write_text(js[0])
        r = subprocess.run(["node", "--check", str(chk)], capture_output=True, text=True)
        chk.unlink(missing_ok=True)
        if r.returncode != 0:
            tmp.unlink(missing_ok=True)
            print("ABORT — JS invalid after edit:", r.stderr[:300]); return 2
    tmp.replace(INDEX)
    print(f"\nupdated {len(edits)} stops · stamp {stamp}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
