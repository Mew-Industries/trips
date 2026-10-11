#!/usr/bin/env python3
"""Append a travel memory: done_log.py add YYYY-MM-DD 'text' [--activity-id ID]."""
import argparse
import datetime
import json
from pathlib import Path
import tempfile
import subprocess

LOG = Path(__file__).resolve().parents[1] / 'data/done-log.json'

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    add = sub.add_parser('add')
    add.add_argument('date', type=lambda value: datetime.date.fromisoformat(value).isoformat())
    add.add_argument('text')
    add.add_argument('--activity-id')
    add.add_argument('--match-name')
    args = parser.parse_args()
    if not args.text.strip():
        parser.error('El texto no puede estar vacío')
    data = json.loads(LOG.read_text())
    day = next((day for day in data if day['date'] == args.date), None)
    if day is None:
        day = {'date': args.date, 'items': []}
        data.append(day)
    item = {'text': args.text.strip()}
    if args.activity_id:
        item['activity_id'] = args.activity_id
    if args.match_name:
        item['match_name'] = args.match_name
    result = subprocess.run(['node', str(LOG.parent.parent / 'scripts/resolve_done_item.mjs'), json.dumps(item)], check=True, capture_output=True, text=True)
    pin = json.loads(result.stdout)
    print('Pin: ' + pin['name'] if pin else 'Aviso: sin pin; entrada libre')
    day['items'].append(item)
    data.sort(key=lambda day: day['date'])
    with tempfile.NamedTemporaryFile(mode='w', dir=LOG.parent, delete=False) as out:
        json.dump(data, out, ensure_ascii=False, indent=2)
        out.write('\n')
        tmp = Path(out.name)
    tmp.chmod(0o644)
    tmp.replace(LOG)
    print(f"{args.date}: {len(day['items'])} hechas")

if __name__ == '__main__':
    main()
