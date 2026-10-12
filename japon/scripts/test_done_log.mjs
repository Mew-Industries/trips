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
assert.equal(doneItemsForDay(log, '2026-10-11').length, 4);
assert.throws(() => parseDoneLog([{date:'bad', items:[]}]));
const day = {date:'2026-10-11', here:[{node:{coords:[35.6,139.7]}}]};
assert.equal(tripDayStatus(day, new Date('2026-10-10T15:00:00Z')).current, true);
assert.equal(tripDayStatus({...day,date:'2026-10-10'}, new Date('2026-10-10T15:00:00Z')).past, true);
assert.equal(tripDayStatus({...day,here:[{node:{coords:[37.5,127]}}]}, new Date('2026-10-10T15:00:00Z')).current, true);
console.log('done-log: 11 assertions OK');

const real = await import('./resolve_done_item.mjs');
for (const day of log.filter(d => d.date < '2026-10-11')) for (const item of day.items) { const hit = real.matchDoneItem(item, real.destinations, real.places, real.reels); assert.ok(hit?.act.coords, item.text); }
assert.equal(real.matchDoneItem({text:"libre"},real.destinations,real.places),null);
console.log("six seed pins + free entry OK");

const parkItem = doneItemsForDay(log, '2026-10-10')[2];
assert.equal(parkItem.text, 'bar del Park Hyatt');
const park = real.matchDoneItem(parkItem, real.destinations, real.places, real.reels).act;
assert.equal(park.text, 'Park Hyatt Tokyo');
assert.deepEqual(park.coords, [35.6862131,139.6904828]);
assert.equal(park.cat, 'bar-noche');
assert.equal(park.sources[0].url, 'https://maps.app.goo.gl/RZZtM8QSkziP5YW78');
assert.ok(!log.flatMap(d => d.items).some(i => real.matchDoneItem(i, real.destinations, real.places, real.reels)?.act.text === 'New York Bar'));
console.log('Park Hyatt pin, category, Maps link + New York Bar not done OK');

const reel = {name:'Betty Smith Ebisu Factory',lat:35.651115,lon:139.707346};
assert.equal(matchDoneItem({text:'Bétty Smith (Ebisu Factory)'}, [], [], [reel]).act.text, reel.name);
assert.equal(matchDoneItem({text:'Ebisu Factory'}, [], [], [{...reel,name:'Betty Smith (Ebisu Factory)'}]).act.coords[0], reel.lat);
const dup = {text:'Duplicate',coords:[1,2]};
assert.equal(matchDoneItem({text:'Duplicate'}, [{activities:[dup]}], [{name:'Duplicate',lat:3,lon:4}], [{name:'Duplicate',lat:5,lon:6}]).act,dup);
assert.deepEqual(matchDoneItem({text:'Duplicate'}, [], [{name:'Duplicate',lat:3,lon:4}], [{name:'Duplicate',lat:5,lon:6}]).act.coords,[3,4]);
assert.equal(matchDoneItem({text:'nothing here'}, [], [], [reel]),null);
const hits11 = doneItemsForDay(log,'2026-10-11').map(i => real.matchDoneItem(i,real.destinations,real.places,real.reels));
assert.equal(hits11[0].act.text,'Shibuya Scramble');
assert.equal(hits11[1].act.text,reel.name);
assert.deepEqual(hits11.slice(2),[null,null]);
console.log('reels normalized/parentheses, source priority, October 11 exact pins and negatives OK');

assert.equal(matchDoneItem({text:'Alias'}, [{activities:[{text:'Itinerary (Alias)'}]}], [{name:'Alias',lat:1,lon:2}], [{name:'Alias',lat:3,lon:4}]).act.text,'Itinerary (Alias)');
assert.deepEqual(matchDoneItem({text:'Duplicate'}, [], [], [{name:'Duplicate',lat:5,lon:6}]).act.coords,[5,6]);
console.log('itinerary alias beats lower-source exact name; reel fallback OK');
