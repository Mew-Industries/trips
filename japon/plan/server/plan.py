#!/usr/bin/env python3
"""Capa de diff del plan diario, importada por el backend de votos."""

import json
import re

DATE_RE = re.compile(r"^2026-(?:10|11)-\d{2}$")
KEY_RE = re.compile(r"^[^\x00-\x1f]{1,220}$")


def init_plan_db(con):
    con.execute(
        "CREATE TABLE IF NOT EXISTS plans ("
        " token TEXT NOT NULL, date TEXT NOT NULL, promoted TEXT NOT NULL,"
        " updated_at TEXT NOT NULL, PRIMARY KEY (token, date))"
    )


def clean_promoted(value):
    if not isinstance(value, list) or len(value) > 200:
        raise ValueError("invalid promoted")
    out = []
    for key in value:
        if not isinstance(key, str) or not KEY_RE.fullmatch(key):
            raise ValueError("invalid key")
        if key not in out:
            out.append(key)
    return out


def read_plan(con, token):
    rows = con.execute(
        "SELECT date, promoted, updated_at FROM plans WHERE token = ? ORDER BY date", (token,)
    ).fetchall()
    days = {}
    for row in rows:
        try:
            promoted = clean_promoted(json.loads(row["promoted"]))
        except (ValueError, TypeError, json.JSONDecodeError):
            promoted = []
        days[row["date"]] = {"promoted": promoted, "updatedAt": row["updated_at"]}
    return days


def write_plan(con, token, date, promoted, updated_at):
    if not DATE_RE.fullmatch(str(date or "")):
        raise ValueError("invalid date")
    clean = clean_promoted(promoted)
    con.execute(
        "INSERT INTO plans(token,date,promoted,updated_at) VALUES(?,?,?,?) "
        "ON CONFLICT(token,date) DO UPDATE SET promoted=excluded.promoted, updated_at=excluded.updated_at",
        (token, date, json.dumps(clean, ensure_ascii=False), updated_at),
    )
    return clean
