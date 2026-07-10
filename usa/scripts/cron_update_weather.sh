#!/usr/bin/env bash
# Daily: refresh per-stop temps (climatology now, forecast once <=16d out),
# commit + push only if THIS trip's index.html changed. Idempotent + quiet on no-op.
# Monorepo-aware: derives the repo root and this trip's subfolder from its own
# location, so the same script works from any trips/<trip>/scripts/ folder.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"   # .../trips/<trip>/scripts
TRIP_DIR="$(dirname "$SCRIPT_DIR")"                          # .../trips/<trip>
TRIP="$(basename "$TRIP_DIR")"                               # <trip>
REPO="$(git -C "$TRIP_DIR" rev-parse --show-toplevel)"       # .../trips (git root)
INDEX_REL="$TRIP/index.html"
LOG="$REPO/.weather-cron.log"
cd "$REPO"

{
  echo "=== $(date -Is) [$TRIP] ==="
  # keep clone current (weather/other trips may have pushed)
  git pull -q --no-rebase origin main 2>&1 || echo "pull warn"
  python3 "$TRIP_DIR/scripts/update_weather.py" 2>&1

  if git diff --quiet -- "$INDEX_REL"; then
    echo "no temp change — nothing to push"
    exit 0
  fi
  git add "$INDEX_REL"
  git -c user.email=mew@martriay.com -c user.name=Mew \
      commit -q -m "weather: refresh $TRIP temps ($(date +%F))

Co-Authored-By: Martin <martriay@gmail.com>"
  # clean URL + global credential helper (see reference_github_pat)
  git push -q origin main
  echo "pushed temp refresh"
} >>"$LOG" 2>&1
