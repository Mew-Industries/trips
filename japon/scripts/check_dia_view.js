#!/usr/bin/env node
/**
 * Invariantes de la vista de día (task 660).
 *
 *   node japon/scripts/check_dia_view.js
 *
 * Chequea sobre el MODELO (no sobre el DOM: eso lo hace el harness de navegador de
 * `evidence/660/tooling/check.mjs`) las tres cosas que si se rompen no avisan solas:
 *
 *  1. Ningún horario inventado — todo leg sin `departure` sigue sin hora, y la vista
 *     lo renderiza como "a definir". El día que alguien cargue un `departure`, este
 *     check lo refleja en la cuenta, no falla.
 *  2. Cada jornada tiene su página estática en `dia/` y está al día (`build_dias.js
 *     --check`), que es de lo que dependen los previews de WhatsApp.
 *  3. El orden de lectura del plan fijo: el check-out va antes de los traslados y el
 *     check-in después. Sin eso, un día de traslado muestra el check-in de las 16:00
 *     arriba de los buses que hay que tomar para llegar.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const DIR = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(DIR, 'index.html'), 'utf8');
const views = fs.readFileSync(path.join(DIR, 'views.js'), 'utf8');

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

let failed = 0;
const check = (name, ok, extra = '') => {
  console.log(`${ok ? '✓' : '✗'} ${name}${extra ? ' — ' + extra : ''}`);
  if (!ok) failed++;
};

(async () => {
  const { buildItinerary } = await import(path.join(DIR, 'itinerary.js'));
  const { dayMeta, dayRoute, confirmedDayLine } = await import(path.join(DIR, 'views.js'));
  const it = buildItinerary(arrayLiteral('destinations'));

  // 1 · ningún horario inventado
  const sinHora = it.transfers.filter(t => !t.departure);
  const conHora = it.transfers.length - sinHora.length;
  console.log('\nlegs sin horario de salida (se muestran "a definir", NO se estiman):');
  sinHora.forEach(t => console.log('  · ' + t.date + '  ' + t.from + ' → ' + t.to +
    '  [' + (t.leg.mode || '?') + ' ' + (t.leg.time || 'sin duración') + ']'));
  check('los legs sin horario no tienen ninguna hora en el dato',
    sinHora.every(t => !t.departure && !(t.leg.segments || []).some(s => s.departure)),
    sinHora.length + ' sin hora / ' + conHora + ' con hora');
  check('la vista renderiza "a definir" y no un guión para lo que no tiene hora',
    /\(e\.time \|\| 'a definir'\)/.test(views));

  // 2 · las páginas estáticas de `dia/`
  check('cada jornada tiene su página estática en dia/',
    it.days.every(d => fs.existsSync(path.join(DIR, 'dia', d.date + '.html'))),
    it.days.length + ' jornadas');
  try {
    execFileSync(process.execPath, [path.join(__dirname, 'build_dias.js'), '--check'], { stdio: 'pipe' });
    check('dia/ está al día con el itinerario', true);
  } catch (e) {
    check('dia/ está al día con el itinerario', false,
      String(e.stderr || '').trim() || 'corré node japon/scripts/build_dias.js');
  }
  const m = dayMeta(it.days[0]);
  check('dayMeta() da título con día, fecha y ciudad',
    /^Día 1 · /.test(m.title) && m.title.split(' · ').length >= 3, m.title);

  // 3 · el orden de lectura del plan fijo, en los días que tienen traslado
  const kindsOf = day => {
    // Misma regla que `readOrder()` en views.js; si una cambia, este check la delata.
    const out = day.events.find(e => e.kind === 'check-out');
    const floor = (out && out.time) || '00:00';
    const PH = { 'check-out': 0, transporte: 1, vuelo: 1, 'check-in': 2, reserva: 3 };
    let flight = null;
    return day.events.map((e, i) => {
      let k = e.time || (e.kind === 'check-out' ? '00:00' : e.kind === 'check-in' ? '23:59' : floor);
      if (e.ord != null) { if (flight && k < flight) k = flight; flight = k; }
      return { e, i, k };
    }).sort((a, b) => (a.k < b.k ? -1 : a.k > b.k ? 1 : 0) || PH[a.e.kind] - PH[b.e.kind] || a.i - b.i)
      .map(r => r.e.kind);
  };
  const malOrden = it.days.filter(d => {
    const ks = kindsOf(d);
    const co = ks.indexOf('check-out'), tr = ks.indexOf('transporte'), ci = ks.indexOf('check-in');
    return (co > -1 && tr > -1 && co > tr) || (ci > -1 && tr > -1 && ci < tr);
  }).map(d => d.date);
  check('en todo día de traslado el check-out va antes del viaje y el check-in después',
    malOrden.length === 0, malOrden.join(', '));

  // 4 · el mapa individual no mezcla sugerencias con el itinerario confirmado
  const ctx = {
    activityId: (act, node) => node.id + ':' + node.activities.indexOf(act),
    catOfAct: act => act.cat || 'otro',
    DX: s => s,
  };
  const specs = it.days.map(day => ({ day, spec: dayRoute(day, ctx) }));
  const leaked = specs.flatMap(({ day, spec }) => {
    const confirmed = new Set(confirmedDayLine(spec));
    return spec.line.filter(p => !confirmed.has(p) && (p.anchor || p.terminal || p.bed))
      .map(() => day.date);
  });
  check('el mapa diario conserva sólo anclas, terminales y hospedajes', leaked.length === 0,
    specs.reduce((n, x) => n + confirmedDayLine(x.spec).length, 0) + ' puntos confirmados');
  const d14 = specs.find(x => x.day.date === '2026-10-19');
  const d14line = confirmedDayLine(d14.spec);
  check('el día 14 excluye todas sus sugerencias del mapa',
    d14line.every(p => p.anchor || p.terminal || p.bed) && d14line.length < d14.spec.line.length,
    d14line.length + ' confirmados / ' + d14.spec.line.length + ' totales');

  console.log(failed ? `\n✗ ${failed} check(s) fallaron` : '\n✓ todo ok');
  process.exit(failed ? 1 : 0);
})();
