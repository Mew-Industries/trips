#!/usr/bin/env node
/**
 * Verifica la categorización de TODOS los lugares del mapa (task 474).
 *
 *   node japon/scripts/check_categories.js
 *
 * Chequea que cada lugar (todas las activities[] + guardados sin destino +
 * day trips + lugares de reels) resuelva a exactamente una categoría de la
 * taxonomía de data/categories.js, imprime el desglose por fuente y avisa de
 * overrides que ya no matchean nada (nombres que cambiaron aguas arriba).
 * Sale 1 si algo queda sin categoría válida.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const DIR = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(DIR, 'index.html'), 'utf8');

// Recorta el literal `const <name> = [ ... ]` de index.html balanceando
// corchetes (salteando strings y comentarios), en vez de buscar un cierre con
// un formato concreto: así no se rompe si cambia la indentación del archivo.
function arrayLiteral(name) {
  const head = 'const ' + name + ' = [';
  const i = html.indexOf(head);
  if (i < 0) throw new Error('no se encontró el array ' + name + ' en index.html');
  const start = i + head.length - 1;   // el '[' de apertura
  let depth = 0, quote = null;
  for (let j = start; j < html.length; j++) {
    const c = html[j];
    if (quote) {
      if (c === '\\') j++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '/' && html[j + 1] === '/') { j = html.indexOf('\n', j); if (j < 0) break; continue; }
    if (c === '/' && html[j + 1] === '*') { const e = html.indexOf('*/', j); if (e < 0) break; j = e + 1; continue; }
    if (c === '[' || c === '{' || c === '(') depth++;
    else if (c === ']' || c === '}' || c === ')') {
      if (--depth === 0) return vm.runInNewContext(html.slice(start, j + 1));
    }
  }
  throw new Error('no se pudo cerrar el literal de ' + name + ' en index.html');
}

const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(DIR, 'data/categories.js'), 'utf8'), sandbox);
vm.runInNewContext(fs.readFileSync(path.join(DIR, 'data/reels.js'), 'utf8'), sandbox);
const { PLACE_TAXONOMY, PLACE_CAT_LEGACY, PLACE_CAT_OVERRIDES, SOURCE_THINGS, SOURCE_TIPS } = sandbox.window;

const catKey = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const byName = {};
Object.keys(PLACE_CAT_OVERRIDES).forEach(n => { byName[catKey(n)] = PLACE_CAT_OVERRIDES[n]; });
const usedOverride = new Set();

function catOf(name, legacy) {
  const k = catKey(name);
  const own = byName[k];
  if (own && PLACE_TAXONOMY.meta[own]) { usedOverride.add(k); return own; }
  if (PLACE_TAXONOMY.meta[legacy]) return legacy;
  const mapped = PLACE_CAT_LEGACY[legacy];
  return (mapped && PLACE_TAXONOMY.meta[mapped]) ? mapped : 'otro';
}

const destinations = arrayLiteral('destinations');
const orphanPlaces = arrayLiteral('orphanPlaces');

let activityTotal = 0;
let activityCovered = 0;
const activityUncovered = [];
const activityNonGeoloc = [];
destinations.forEach(d => (d.activities || []).forEach(a => {
  activityTotal++;
  const category = catOf(a.text, a.cat);
  if (a.coords && PLACE_TAXONOMY.meta[category]) activityCovered++;
  else if (a.nonGeoloc && PLACE_TAXONOMY.meta[category]) activityNonGeoloc.push({ destination: d.name, name: a.text });
  else activityUncovered.push({ destination: d.name, name: a.text, coords: !!a.coords, category });
}));

const places = [];
destinations.forEach(d => {
  (d.activities || []).forEach(a => places.push({
    src: a.coords ? 'actividad con pin' : 'actividad no geolocalizable', name: a.text, legacy: a.cat, pin: !!a.coords }));
  (d.daytrips || []).forEach(t => places.push({ src: 'day trip', name: t.name, legacy: t.cat, pin: !!t.coords }));
});
orphanPlaces.forEach(p => places.push({
  src: 'maps · guardado sin destino', name: p.name, legacy: p.cat, pin: p.lat != null }));
(SOURCE_THINGS || []).forEach(p => places.push({ src: 'fuente IG', name: p.name, legacy: p.cat, pin: p.lat != null }));

let bad = 0;
const bySrc = {}, byCat = {};
places.forEach(p => {
  const c = catOf(p.name, p.legacy);
  if (!PLACE_TAXONOMY.meta[c]) { console.error('SIN CATEGORÍA: [' + p.src + '] ' + p.name); bad++; return; }
  p.cat = c;
  bySrc[p.src] = bySrc[p.src] || {};
  bySrc[p.src][c] = (bySrc[p.src][c] || 0) + 1;
  byCat[c] = (byCat[c] || 0) + 1;
});

console.log('Lugares: ' + places.length + ' (' + places.filter(p => p.pin).length + ' con pin en el mapa)' +
  ' · categorías: ' + PLACE_TAXONOMY.order.join(', ') + '\n');
Object.keys(bySrc).sort().forEach(src => {
  const total = Object.values(bySrc[src]).reduce((a, b) => a + b, 0);
  console.log(src + ' (' + total + ')');
  PLACE_TAXONOMY.order.forEach(c => { if (bySrc[src][c]) console.log('    ' + c.padEnd(13) + bySrc[src][c]); });
});
console.log('\nTotal por categoría');
PLACE_TAXONOMY.order.forEach(c => console.log('  ' + c.padEnd(13) + (byCat[c] || 0)));

console.log('\nCobertura activities[]: ' + activityCovered + '/' + activityTotal + ' con coord+categoría · ' +
  activityNonGeoloc.length + ' no geolocalizable(s) declarado(s)');
activityUncovered.forEach(a => console.log('  SIN PIN [' + a.destination + '] ' + a.name));
activityNonGeoloc.forEach(a => console.log('  NO GEOLOCALIZABLE [' + a.destination + '] ' + a.name));

// Los tips (reels sin lugar, task 547) no son lugares: no cuentan como pines ni
// entran al desglose de arriba. Lo que sí se verifica es que sigan siendo tips
// sin coordenada — un tip con lat/lon es un lugar mal clasificado, y uno sin
// consejo no sirve para nada en la lista.
const tips = SOURCE_TIPS || [];
const badTips = tips.filter(t => t.cat !== 'tips' || t.lat != null || t.lon != null || !t.note);
console.log('\nTips (reels sin lugar concreto): ' + tips.length);
badTips.forEach(t => console.error('  TIP INVÁLIDO: ' + t.name +
  ' (cat=' + t.cat + ' lat=' + t.lat + ' note=' + (t.note ? 'sí' : 'NO') + ')'));

const stale = Object.keys(PLACE_CAT_OVERRIDES).filter(n => !usedOverride.has(catKey(n)));
if (stale.length) console.log('\nOverrides que no matchean ningún lugar (¿nombre cambiado?):\n  ' + stale.join('\n  '));

if (bad || activityUncovered.length || badTips.length) {
  if (bad) console.error('\n✗ ' + bad + ' lugar(es) sin categoría válida');
  if (activityUncovered.length) console.error('\n✗ ' + activityUncovered.length + ' actividad(es) sin coord+categoría');
  if (badTips.length) console.error('\n✗ ' + badTips.length + ' tip(s) mal formado(s)');
  process.exit(1);
}
console.log('\n✓ todos los lugares tienen exactamente una categoría de la taxonomía');
