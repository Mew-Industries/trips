#!/usr/bin/env node
/**
 * Invariantes de la vista de día (task 660).
 *
 *   node china/scripts/check_dia_view.js
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
 *  6. La navegación entre días (task 687): `neighborDay()` es la cuenta que comparten
 *     los botones de la barra y las flechas del teclado, no envuelve en los bordes, y
 *     las teclas viven en UN listener con sus guardas (foco de texto, drag, lightbox).
 *  7. Ningún título del plan fijo arranca con "<número>." (task 699): el número de
 *     parada del viaje (`node.n`) es del itinerario general, no de la vista de un día.
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
  const { dayMeta, dayRoute, confirmedDayLine, neighborDay, fixedPlanHtml } = await import(path.join(DIR, 'views.js'));
  const destinations = arrayLiteral('destinations');
  const it = buildItinerary(destinations);

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
      String(e.stderr || '').trim() || 'corré node china/scripts/build_dias.js');
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

  // 4 · el mapa individual recibe sugerencias y mantiene el recorrido confirmado aparte
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
  check('la línea confirmada conserva sólo anclas, terminales y hospedajes', leaked.length === 0,
    specs.reduce((n, x) => n + confirmedDayLine(x.spec).length, 0) + ' puntos confirmados');
  const d14 = specs.find(x => x.day.date === '2027-10-20');
  const d14line = confirmedDayLine(d14.spec);
  check('el 20/10 (Xi\u2019an) separa sus sugerencias de la línea confirmada',
    d14line.every(p => p.anchor || p.terminal || p.bed) && d14line.length < d14.spec.line.length,
    d14line.length + ' confirmados / ' + d14.spec.line.length + ' totales');
  const d4 = specs.find(x => x.day.date === '2027-10-11');
  const d4suggestions = d4.spec.route.filter(p => !p.anchor && !p.promoted && p.ll);
  check('el 11/10 (Beijing) entrega sus sugerencias geolocalizadas al mapa',
    d4suggestions.length > 0 && d4suggestions.every(p => p.key && p.cat && p.act),
    d4suggestions.length + ' sugerencias en el modelo aislado');
  check('renderDayMap dibuja las sugerencias debajo del itinerario y conserva popup y filtro',
    // Desde la task 697 el filtro no descarta al dibujar: crea todos los marcadores y
    // agrega al mapa sólo los de categorías activas, para que los chips refiltren en vivo.
    /\(spec\.route \|\| \[\]\)\.forEach/.test(html) && /if \(activeCats\.has\(p\.cat\)\) marker\.addTo\(_dayViewMap\)/.test(html) &&
      /zIndexOffset: -1000/.test(html) && /miniPopup\(p\.act && p\.act\.img/.test(html));
  // Desde la task 700 ordIcon lleva un 4º argumento (la clase de tachada): se ancla
  // el prefijo de la llamada, no la aridad.
  check('el pin numerado combina número y emoji de categoría a 30 px',
    /ordIcon\(p\.planNumber, cat\.color, cat\.icon/.test(html) &&
      /class="rt-ord-cat"/.test(html) && /iconSize: \[30, 30\]/.test(html));

  // 5 · una key promovida se suma y una key vieja/desaparecida se ignora.
  const firstSuggestion = d14.spec.route.find(p => !p.anchor);
  const promotedCtx = Object.assign({}, ctx, { plan: { promoted: () => [firstSuggestion.key, 'ya-no-existe:99'] } });
  const promotedSpec = dayRoute(d14.day, promotedCtx);
  const promotedLine = confirmedDayLine(promotedSpec);
  check('una sugerencia promovida entra al mapa y una key inexistente no rompe el día',
    promotedLine.some(p => p.key === firstSuggestion.key && p.promoted) &&
      !promotedLine.some(p => p.key === 'ya-no-existe:99'),
    firstSuggestion.key + ' promovida; key inexistente ignorada');

  // 6 · pasar de día (task 687): la cuenta, los bordes y las teclas
  const first = it.days[0], last = it.days[it.days.length - 1];
  check('neighborDay() avanza y retrocede un día del viaje',
    it.days.every((d, i) => {
      const nx = neighborDay(it.days, d.date, 1), pv = neighborDay(it.days, d.date, -1);
      return nx === (it.days[i + 1] || null) && pv === (i ? it.days[i - 1] : null);
    }), it.days.length + ' jornadas');
  check('en los bordes del viaje no envuelve',
    neighborDay(it.days, first.date, -1) === null && neighborDay(it.days, last.date, 1) === null,
    'primero ' + first.date + ' · último ' + last.date);
  check('ida y vuelta devuelven el mismo día',
    it.days.slice(1).every(d => neighborDay(it.days, neighborDay(it.days, d.date, -1).date, 1).date === d.date));
  check('una fecha que no es del viaje no navega a ningún lado',
    neighborDay(it.days, '1999-01-01', 1) === null && neighborDay(it.days, '1999-01-01', -1) === null);
  // Los botones de la barra y el teclado tienen que contar igual: si mañana alguien
  // vuelve a `it.days[i + 1]` en uno de los dos lados, esto lo delata.
  check('los botones de la barra usan la MISMA cuenta que las flechas',
    /const prev = neighborDay\(it\.days, day\.date, -1\), next = neighborDay\(it\.days, day\.date, 1\)/.test(views) &&
      /const to = neighborDay\(it\.days, date, step\)/.test(views));
  check('las teclas de la vista viven en un solo listener, no en uno suelto que compita',
    (views.match(/document\.addEventListener\('keydown'/g) || []).length === 1);
  check('las flechas navegan con goJornada(), la misma navegación que los botones',
    /goJornada\(to\.date\)/.test(views));
  // Sólo el bloque del teclado: si una guarda vive en otro lado del archivo, no cuenta.
  const kbFrom = views.indexOf('const typingIn =');
  const kb = views.slice(kbFrom, views.indexOf('// ---', views.indexOf("document.addEventListener('keydown'")));
  check('el bloque del teclado de la vista se encuentra en views.js', kbFrom > 0 && kb.length > 200,
    kb.length + ' caracteres');
  check('las flechas no se le roban al que está escribiendo',
    /tagName === 'INPUT'/.test(kb) && /tagName === 'TEXTAREA'/.test(kb) &&
      /tagName === 'SELECT'/.test(kb) && /isContentEditable/.test(kb));
  check('las flechas no se le roban al drag ni al lightbox',
    /plan-dragging/.test(kb) && /\.lightbox\.open/.test(kb));
  check('las flechas con modificador o ya atendidas siguen su camino',
    /e\.metaKey \|\| e\.ctrlKey \|\| e\.altKey \|\| e\.shiftKey/.test(kb) && /e\.defaultPrevented/.test(kb));
  check('Escape sigue cerrando la vista', /e\.key === 'Escape'/.test(kb) && /goJornada\(null\)/.test(kb));
  // El modo discreto es del mapa (index.html) y sigue siendo suyo: la vista no le toca
  // la `d` ni le mete otra guarda.
  check('la `d` del modo discreto sigue en su handler de index.html',
    /if \(e\.key !== 'd' && e\.key !== 'D'\) return;/.test(html) && !/'d'/.test(kb));

  // 7 · ningún título del plan fijo con número de parada adelante (task 699).
  // Se renderiza el plan fijo REAL de cada jornada (todos los kind: hospedaje,
  // check-in/out, transporte, vuelo, reserva) y se mira el título (`.pl-w`); el
  // numerador legítimo (1. 2. 3. de las reservas) vive en `.pl-t`, afuera del título.
  const renderCtx = {
    escHtml: s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
    DX: nombre => nombre,
    hoursParts: () => [],
    lodgingLinks: () => [],
    legType: () => 'tren',
    MODE_STYLE: {},
    activityId: (act, node) => node.id + ':' + node.activities.indexOf(act),
  };
  const numerados = it.days.flatMap(day => {
    const htmlDia = fixedPlanHtml(day, renderCtx);
    const titles = [...htmlDia.matchAll(/<div class="pl-w">([\s\S]*?)<\/div>/g)]
      .map(x => x[1].replace(/<[^>]*>/g, '').trim());
    return titles.filter(t => /^\d+\.\s/.test(t)).map(t => day.date + ' «' + t + '»');
  });
  check('ningún título de la vista de día empieza con un número de parada',
    numerados.length === 0, numerados.slice(0, 5).join(' · '));
  const kioto = it.days.find(d => d.date === '2027-10-19');
  const kiotoTitles = [...fixedPlanHtml(kioto, renderCtx).matchAll(/<div class="pl-w">([\s\S]*?)<\/div>/g)]
    .map(x => x[1].replace(/<[^>]*>/g, '').trim());
  check('el 19/10 (llegada a Xi\u2019an, parada 4) muestra su plan fijo sin "4." adelante',
    kiotoTitles.length > 0 && kiotoTitles.every(t => !/^4\./.test(t)),
    kiotoTitles.join(' · '));

  console.log(failed ? `\n✗ ${failed} check(s) fallaron` : '\n✓ todo ok');
  process.exit(failed ? 1 : 0);
})();
