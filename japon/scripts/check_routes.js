#!/usr/bin/env node
/**
 * Mide el recorrido de cada jornada (task 508 ronda 2).
 *
 *   node japon/scripts/check_routes.js
 *
 * Compara los kilómetros que se caminan siguiendo el ORDEN DE LISTADO de las
 * actividades (como estaba antes: el orden en que se cargaron) contra el orden
 * que devuelve dayRoute() en views.js, que ordena por geografía. Sale 1 si algún
 * día quedó peor que el orden de listado — que es la única forma de que ordenar
 * por cercanía haya salido mal.
 *
 * No valida "la ruta correcta" (no existe una): valida que el orden nuevo nunca
 * sea peor que el viejo, que es lo que se prometió al cambiarlo.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const DIR = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(DIR, 'index.html'), 'utf8');

// Mismo recorte que check_categories.js: balancea corchetes salteando strings y
// comentarios, así no depende del formato del archivo.
function arrayLiteral(name) {
  const head = 'const ' + name + ' = [';
  const i = html.indexOf(head);
  if (i < 0) throw new Error('no se encontró el array ' + name + ' en index.html');
  const start = i + head.length - 1;
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
const { PLACE_TAXONOMY, PLACE_CAT_LEGACY, PLACE_CAT_OVERRIDES } = sandbox.window;

const catKey = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const byName = {};
Object.keys(PLACE_CAT_OVERRIDES).forEach(n => { byName[catKey(n)] = PLACE_CAT_OVERRIDES[n]; });
function catOf(name, legacy) {
  const own = byName[catKey(name)];
  if (own && PLACE_TAXONOMY.meta[own]) return own;
  if (PLACE_TAXONOMY.meta[legacy]) return legacy;
  const m = PLACE_CAT_LEGACY[legacy];
  return (m && PLACE_TAXONOMY.meta[m]) ? m : 'otro';
}

// Kilómetros de verdad, no la métrica interna: acá el número se lee.
const KM = 111.32;
function dist(a, b) {
  const x = (b[1] - a[1]) * Math.cos((a[0] + b[0]) / 2 * Math.PI / 180);
  const y = b[0] - a[0];
  return Math.sqrt(x * x + y * y) * KM;
}
const pathLen = lls => lls.reduce((s, ll, i) => i ? s + dist(lls[i - 1], ll) : 0, 0);

(async () => {
  const { buildItinerary } = await import(path.join(DIR, 'itinerary.js'));
  const { dayRoute } = await import(path.join(DIR, 'views.js'));

  const ctx = {
    catOfAct: a => catOf(a.text, a.cat),
    CAT_ORDER: PLACE_TAXONOMY.order,
    CAT_META: PLACE_TAXONOMY.meta,
    DX: a => a || '',
  };

  const it = buildItinerary(arrayLiteral('destinations'));
  const bad = [];
  let totOld = 0, totNew = 0;

  console.log('jornada     pts   listado    geografía');
  for (const day of it.days) {
    const spec = dayRoute(day, ctx);
    if (spec.route.length < 2) continue;
    const wake = day.wake && day.wake.lodging && day.wake.lodging.coords;
    const bed = day.sleep && day.sleep.lodging && day.sleep.lodging.coords;
    const ends = p => [].concat(wake ? [wake] : [], p, bed ? [bed] : []);

    // El orden de antes: lo que tiene hora, y después las sugerencias como venían.
    const listed = [];
    for (const e of day.events) if (e.act && e.act.coords) listed.push(e.act.coords);
    for (const s of day.suggestions)
      for (const i of s.clusters.flatMap(c => c.items)) if (i.act.coords) listed.push(i.act.coords);

    const a = pathLen(ends(listed));
    const b = pathLen(ends(spec.route.map(p => p.ll)));
    totOld += a; totNew += b;
    if (b > a + 1e-6) bad.push(day.date);
    console.log(day.date + '  ' + String(spec.route.length).padStart(3) +
      String(a.toFixed(1) + ' km').padStart(11) + String(b.toFixed(1) + ' km').padStart(12) +
      (b > a + 1e-6 ? '   ✗ PEOR' : b < a - 1e-6 ? '   −' + (100 * (a - b) / a).toFixed(0) + '%' : '   ='));
  }

  console.log('\ntotal: ' + totOld.toFixed(0) + ' km de listado → ' + totNew.toFixed(0) +
    ' km de recorrido (−' + (100 * (totOld - totNew) / totOld).toFixed(0) + '%)');
  if (bad.length) {
    console.error('\n✗ ' + bad.length + ' jornada(s) quedaron peor que el orden de listado: ' + bad.join(', '));
    process.exit(1);
  }
  console.log('✓ ninguna jornada quedó peor que el orden de listado');
})();
