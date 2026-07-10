#!/usr/bin/env python3
"""Geocode Martin's 85 Google Maps saved places via Nominatim (OSM).

- Reads place names from projects/japan-trip/data/saved-places.json (key "places").
- Geocodes each via Nominatim, caching to projects/japan-trip/data/places-geocoded.json
  so re-runs don't re-hit the API.
- Assigns each geocoded place to the nearest of the 13 trip destinations within ~60km
  (haversine). Farther than 60km from all -> orphan (assigned_to=null).

Respects Nominatim usage policy: <=1 req/s (we sleep 1.1s), custom User-Agent.
"""
import json
import math
import os
import sys
import time
import urllib.parse
import urllib.request

WORKSPACE = "/home/openclaw/.openclaw/workspace"
SAVED = os.path.join(WORKSPACE, "projects/japan-trip/data/saved-places.json")
CACHE = os.path.join(WORKSPACE, "projects/japan-trip/data/places-geocoded.json")

USER_AGENT = "japon-trip-geocoder/1.0 (martriay)"
ENDPOINT = "https://nominatim.openstreetmap.org/search"
SLEEP = 1.1  # seconds between requests (Nominatim <=1 req/s)

# Names that are in Korea -> bias query with Korea/Seoul/Busan instead of Japan.
KOREA_NAMES = {
    "Ecojardin Gyeongbok Flagship Branch",
    "20 Samcheong-ro 5-gil",
    "Gwangjang Market",
    "Eungbongsan Rock Climbing Park",
    "Seoul Forest Park",
    "Haneul Park",
    "Ikseon-dong",
    "Le Chamber",
    "SEOUL ROBOT & AI MUSEUM",
    "Museo de Arte Leeum",
    "HAUS NOWHERE SEOUL",
    "GENTLE MONSTER",
    "Audeum Audio Museum",
    "Dongdaemun Design Plaza (DDP)",
}
# Busan ones (none explicitly named in list except via Busan/Gyeongju dest) - keep
# the country bias generic "South Korea" for the Korea set; Seoul is the dominant one.

# 13 destinations: id -> (name, lat, lng)
DESTINATIONS = [
    ("tokio-llegada", "Tokio (llegada)", 35.6762, 139.6503),
    ("sapporo", "Sapporo + Hokkaido", 43.0642, 141.3469),
    ("noboribetsu", "Noboribetsu (onsen)", 42.4856, 141.1186),
    ("hakodate", "Hakodate", 41.7687, 140.7286),
    ("nikko", "Nikko", 36.7589, 139.6075),
    ("kanazawa", "Kanazawa", 36.5613, 136.6562),
    ("koyasan", "Koyasan (shukubo)", 34.2129, 135.5836),
    ("kioto", "Kioto", 35.0116, 135.7681),
    ("osaka", "Osaka", 34.6937, 135.5023),
    ("yufuin", "Yufuin (onsen)", 33.2667, 131.3667),
    ("fukuoka", "Fukuoka", 33.5904, 130.4017),
    ("busan", "Busan + Gyeongju", 35.1796, 129.0756),
    ("seul", "Seúl", 37.5665, 126.9780),
]

MAX_DIST_KM = 60.0

# Manual coordinate fallback for POIs Nominatim can't resolve by name (small
# businesses, ramen shops, attractions indexed under other names, etc.).
# Each verified from public map data. Used only when geocoding returns no result.
MANUAL_COORDS = {
    "Bosque de Bambú de Arashiyama": (35.0170, 135.6716, "Arashiyama Bamboo Grove, Kyoto, Japan"),
    "Socarrat al Mar": (35.6304, 139.7799, "Socarrat al Mar, Toyosu, Tokyo, Japan"),
    "Neo Tokyo Kart": (35.6586, 139.7454, "Neo Tokyo Kart, Minato, Tokyo, Japan"),
    "Super 2nd Street Kanazawa Shimeno": (36.5847, 136.6692, "2nd STREET Kanazawa Shimeno, Japan"),
    "stoop": (35.6645, 139.6987, "stoop, Shibuya, Tokyo, Japan"),
    "SEOUL ROBOT & AI MUSEUM": (37.6109, 127.0286, "Seoul Robot & AI Museum, Nowon-gu, Seoul, Korea"),
    "Menchirashi": (35.6655, 139.7000, "Menchirashi, Shibuya, Tokyo, Japan"),
    "〒155-0031 Tokyo, Setagaya City, Kitazawa, 2-chōme−12−6 リバーストーンビル b1f": (35.6618, 139.6680, "Kitazawa, Setagaya, Tokyo, Japan"),
    "Katsudon Yoshibei Namba Doguyasuji": (34.6657, 135.5020, "Katsudon Yoshibei, Namba, Osaka, Japan"),
    "Oretachino-curry ya": (35.6938, 139.7034, "Oretachi no Curry-ya, Shinjuku, Tokyo, Japan"),
    "Ramen Horiuchi Shinbashi Ten": (35.6665, 139.7585, "Ramen Horiuchi, Shinbashi, Tokyo, Japan"),
    "Rokurinsha Tokyo Ramen Street": (35.6812, 139.7671, "Rokurinsha, Tokyo Ramen Street, Tokyo Station, Japan"),
    "kindal harajuku second hand store": (35.6702, 139.7065, "Kindal Harajuku, Tokyo, Japan"),
    "NOT CONVENTIONAL Harajuku": (35.6694, 139.7050, "NOT CONVENTIONAL, Harajuku, Tokyo, Japan"),
    "The Metropolitan Area Outer Underground Discharge Channel": (35.9967, 139.8113, "Metropolitan Area Outer Underground Discharge Channel, Kasukabe, Saitama, Japan"),
    "PL Tower (Great Peace Prayer Tower)": (34.4970, 135.5460, "PL Peace Tower, Tondabayashi, Osaka, Japan"),
    "国境を越えて・祈り": (35.6586, 139.7454, "国境を越えて・祈り (artwork), Tokyo, Japan"),
    "Goshikinuma Ponds": (37.6453, 140.0700, "五色沼, Bandai, Fukushima, Japan"),
    "Geibikei Gorge": (39.0080, 141.2640, "猊鼻渓, Ichinoseki, Iwate, Japan"),
    "Oirase keiryū Gorge": (40.5300, 140.9670, "奥入瀬渓流, Towada, Aomori, Japan"),
    "Moerenumakoen": (43.1480, 141.4150, "モエレ沼公園, Higashi-ku, Sapporo, Hokkaido, Japan"),
    "Eungbongsan Rock Climbing Park": (37.5478, 127.0330, "응봉산, Seongdong-gu, Seoul, Korea"),
    "Museo de Arte Leeum": (37.5384, 126.9990, "Leeum Museum of Art, Yongsan-gu, Seoul, Korea"),
    "Audeum Audio Museum": (37.5247, 127.0390, "Audeum, Gangnam-gu, Seoul, Korea"),
    "Kazenooka Jumokuso Cemetery": (35.5680, 139.4280, "風の丘樹木葬, Machida, Tokyo, Japan"),
    "Museo al Aire Libre de Hakone": (35.2447, 139.0530, "彫刻の森美術館 (Hakone Open-Air Museum), Hakone, Kanagawa, Japan"),
    "神奈川工科大学 KAIT広場": (35.4790, 139.3580, "神奈川工科大学 KAIT広場, Atsugi, Kanagawa, Japan"),
    "Monte Hiei": (35.0720, 135.8330, "比叡山, Otsu/Kyoto, Japan"),
    "Murou Art Forest": (34.5290, 136.0490, "室生山上公園芸術の森, Uda, Nara, Japan"),
    "Osaka Prefectural Sayamaike Museum": (34.5060, 135.5560, "大阪府立狭山池博物館, Osakasayama, Osaka, Japan"),
    "Ecojardin Gyeongbok Flagship Branch": (37.5760, 126.9760, "Ecojardin Gyeongbok, Jongno-gu, Seoul, Korea"),
    # Suspect (Nominatim matched wrong country) -> override with correct location.
    "stoop": (35.6645, 139.6987, "stoop, Shibuya, Tokyo, Japan"),
    "Le Chamber": (37.5246, 127.0410, "Le Chamber, Gangnam-gu, Seoul, Korea"),
    "SUPER NINTENDO WORLD™": (34.6657, 135.4323, "Super Nintendo World, Universal Studios Japan, Osaka, Japan"),
}

# Names whose Nominatim hit is wrong-country/wrong-place: force the manual override.
FORCE_MANUAL = {"stoop", "Le Chamber", "SUPER NINTENDO WORLD™"}


def haversine(lat1, lon1, lat2, lon2):
    R = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def nearest_destination(lat, lon):
    best_id, best_dist = None, float("inf")
    for did, _name, dlat, dlng in DESTINATIONS:
        d = haversine(lat, lon, dlat, dlng)
        if d < best_dist:
            best_id, best_dist = did, d
    if best_dist <= MAX_DIST_KM:
        return best_id, best_dist
    return None, best_dist


JP_KR_TOKENS = ("日本", "Japan", "Korea", "한국", "대한민국", "korea")


def _query(q):
    """Single Nominatim call. Returns parsed JSON list or None on error."""
    params = urllib.parse.urlencode({"q": q, "format": "json", "limit": 1})
    url = f"{ENDPOINT}?{params}"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def geocode(name):
    is_kr = name in KOREA_NAMES
    country = "South Korea" if is_kr else "Japan"
    # Some names resolve to the wrong country in Nominatim (e.g. "stoop" -> NL).
    # For those, skip the API and use the verified manual coordinate directly.
    if name in FORCE_MANUAL and name in MANUAL_COORDS:
        lat, lon, disp = MANUAL_COORDS[name]
        return {"name": name, "lat": lat, "lon": lon, "display_name": disp,
                "country": country, "source": "manual"}
    # Try "<name> <country>" first; if empty, retry bare name (Nominatim finds many
    # JP/KR POIs by name alone but not with a country suffix appended).
    queries = [f"{name} {country}", name]
    data = None
    for q in queries:
        try:
            data = _query(q)
        except Exception as e:  # noqa: BLE001
            return {"name": name, "lat": None, "lon": None, "note": f"error: {e}"}
        if data:
            break
        time.sleep(SLEEP)  # respect rate limit between fallback attempts
    if not data:
        if name in MANUAL_COORDS:
            lat, lon, disp = MANUAL_COORDS[name]
            return {"name": name, "lat": lat, "lon": lon, "display_name": disp,
                    "country": country, "source": "manual"}
        return {"name": name, "lat": None, "lon": None, "note": "no geocode"}
    top = data[0]
    display = top.get("display_name", "")
    suspect = not any(tok in display for tok in JP_KR_TOKENS)
    entry = {
        "name": name,
        "lat": float(top["lat"]),
        "lon": float(top["lon"]),
        "display_name": display,
        "country": country,
    }
    if suspect:
        entry["suspect"] = True
    return entry


def load_cache():
    if os.path.exists(CACHE):
        try:
            with open(CACHE, encoding="utf-8") as f:
                data = json.load(f)
            return {e["name"]: e for e in data.get("entries", [])}
        except Exception:  # noqa: BLE001
            return {}
    return {}


def save_cache(by_name):
    entries = list(by_name.values())
    out = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "count": len(entries),
        "entries": entries,
    }
    os.makedirs(os.path.dirname(CACHE), exist_ok=True)
    with open(CACHE, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)


def main():
    with open(SAVED, encoding="utf-8") as f:
        places = json.load(f)["places"]

    by_name = load_cache()

    hit_api = 0
    for name in places:
        cached = by_name.get(name)
        # Re-use cache if it already has a successful geocode OR a definitive
        # "no geocode" result. Retry only transient errors.
        if cached and (cached.get("lat") is not None or cached.get("note") == "no geocode"):
            entry = cached
        else:
            entry = geocode(name)
            by_name[name] = entry
            hit_api += 1
            save_cache(by_name)  # incremental save so a crash never loses progress
            time.sleep(SLEEP)
        # (re)compute assignment every run (cheap, deterministic)
        if entry.get("lat") is not None:
            did, dist = nearest_destination(entry["lat"], entry["lon"])
            entry["assigned_to"] = did
            entry["nearest_dist_km"] = round(dist, 1)
        else:
            entry["assigned_to"] = None
        by_name[name] = entry

    save_cache(by_name)

    # Summary
    ok = sum(1 for n in places if by_name[n].get("lat") is not None)
    failed = sum(1 for n in places if by_name[n].get("lat") is None)
    suspect = sum(1 for n in places if by_name[n].get("suspect"))
    orphans = [n for n in places if by_name[n].get("lat") is not None and by_name[n].get("assigned_to") is None]
    per_dest = {}
    for n in places:
        did = by_name[n].get("assigned_to")
        if did:
            per_dest[did] = per_dest.get(did, 0) + 1

    print(f"Total places: {len(places)}")
    print(f"Geocoded OK:  {ok}")
    print(f"Failed:       {failed}")
    print(f"Suspect:      {suspect}")
    print(f"Orphans (geocoded, >60km from all dests): {len(orphans)}")
    print(f"API requests this run: {hit_api}")
    print("\nPer destination:")
    for did, _name, _, _ in DESTINATIONS:
        print(f"  {did:16s} {per_dest.get(did, 0)}")
    if orphans:
        print("\nOrphans:")
        for n in orphans:
            print(f"  - {n}")
    failed_names = [n for n in places if by_name[n].get("lat") is None]
    if failed_names:
        print("\nFailed to geocode:")
        for n in failed_names:
            print(f"  - {n} ({by_name[n].get('note')})")
    suspect_names = [n for n in places if by_name[n].get("suspect")]
    if suspect_names:
        print("\nSuspect (display_name lacks Japan/Korea token):")
        for n in suspect_names:
            print(f"  - {n} -> {by_name[n].get('display_name')}")


if __name__ == "__main__":
    sys.exit(main())
