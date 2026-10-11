import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src = readFileSync(new URL('../done-log.js', import.meta.url), 'utf8');
const {parseDoneLog, matchDoneItem, doneItemsForDay, tripDayStatus} = await import('data:text/javascript;base64,' + Buffer.from(src).toString('base64'));
const destinations = [{activities:[{text:'TéamLab — Planets', syncId:'stable-id'}, {text:'Canal (G-Cans)'}]}];
assert.equal(matchDoneItem({text:'teamlab planets'}, destinations).act.syncId, 'stable-id');
assert.equal(matchDoneItem({text:'G-Cans'}, destinations).act.text, 'Canal (G-Cans)');
assert.equal(matchDoneItem({text:'una cena libre'}, destinations), null);
assert.equal(matchDoneItem({text:'otro nombre', activity_id:'stable-id'}, destinations).act.syncId, 'stable-id');
const log = parseDoneLog(JSON.parse(readFileSync(new URL('../data/done-log.json', import.meta.url))));
assert.equal(doneItemsForDay(log, '2026-10-09').length, 3);
assert.equal(doneItemsForDay(log, '2026-10-10').length, 3);
assert.deepEqual(doneItemsForDay(log, '2026-10-11'), []);
assert.throws(() => parseDoneLog([{date:'bad', items:[]}]));
const day = {date:'2026-10-11', here:[{node:{coords:[35.6,139.7]}}]};
assert.equal(tripDayStatus(day, new Date('2026-10-10T15:00:00Z')).current, true);
assert.equal(tripDayStatus({...day,date:'2026-10-10'}, new Date('2026-10-10T15:00:00Z')).past, true);
assert.equal(tripDayStatus({...day,here:[{node:{coords:[37.5,127]}}]}, new Date('2026-10-10T15:00:00Z')).current, true);
console.log('done-log: 11 assertions OK');

const real = await import('./resolve_done_item.mjs');
for (const day of log) for (const item of day.items) { const hit = real.matchDoneItem(item, real.destinations, real.places); assert.ok(hit?.act.coords, item.text); }
assert.equal(real.matchDoneItem({text:"libre"},real.destinations,real.places),null);
console.log("six seed pins + free entry OK");
