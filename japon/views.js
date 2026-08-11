// views.js — las cuatro vistas laterales del mismo itinerario (task 499).
//
// Las tabs mandan sobre el sidebar y nada más: el mapa vive fuera de este módulo,
// se dibuja una sola vez y no se esconde nunca. La vista "Resumen" es el itinerario
// colapsable que ya existía —este módulo solo lo muestra y lo esconde—; las otras
// tres se arman acá a partir de lo que devuelve itinerary.js, que a su vez lee
// `destinations`. No hay un segundo registro del viaje en ningún lado.
//
// Todo lo nuevo vive en este archivo + views.css: revertir los commits de las vistas
// devuelve el site exactamente al estado anterior.

import { buildItinerary, fmtRange, fmtDate, fmtWeekday, nightsWord, dayOf, timeOf } from './itinerary.js';

const TABS = [
  { id: 'resumen', label: 'Resumen', icon: '🗺️' },
  { id: 'hospedajes', label: 'Hospedajes', icon: '🛏️' },
  { id: 'transportes', label: 'Transportes', icon: '🚄' },
  { id: 'dias', label: 'Días', icon: '📅' }
];

// id de tab -> función que devuelve el HTML de la vista. "resumen" no está acá:
// su pane es el <main class="dashboard"> que ya existe en index.html.
const RENDER = {};

// Ventana de horario como chip. Sin dato no se inventa: la tarjeta dice, una sola
// vez, que las horas todavía no están (típico de los Airbnb, que no las declaran).
function hourChip(label, from, to, cls) {
  const v = from && to ? from + '–' + to : from ? 'desde ' + from : 'hasta ' + to;
  return '<span class="lg-h ' + cls + '">' + label + ' ' + v + '</span>';
}
function hoursHtml(L) {
  const chips = [];
  if (L.checkInFrom || L.checkInTo) chips.push(hourChip('Check-in', L.checkInFrom, L.checkInTo, ''));
  if (L.checkOutFrom || L.checkOutBy) chips.push(hourChip('Check-out', L.checkOutFrom, L.checkOutBy, 'out'));
  if (!chips.length) chips.push('<span class="lg-h tbd">Horarios a definir</span>');
  // El bloque "Tu reserva" ya trae las horas cuando las hay: no repetirlas arriba.
  const b = L.booking;
  if (b && /\d:\d\d/.test((b.checkIn || '') + (b.checkOut || ''))) return '';
  return '<div class="lg-hours">' + chips.join('') + '</div>';
}

// ------------------------------------------------------------- 2 · hospedajes
// Las 13 paradas donde se duerme, en orden. La que todavía no tiene reserva
// aparece igual: el hueco es parte de la información.

RENDER.hospedajes = (it, ctx) => {
  const esc = ctx.escHtml;
  const rows = it.lodgings.map(({ node, lodging: L, start, end, nights }) => {
    const when =
      '<div class="lg-when">' +
        '<div class="lg-dates">' + fmtRange(start, end) + '</div>' +
        '<div class="lg-nights">' + nightsWord(nights) + '</div>' +
        '<button type="button" class="lg-city v-goto" data-goto="' + node.id + '">' + esc(node.short) + '</button>' +
      '</div>';

    if (!L) {
      return '<div class="v-card lg-pending"><div class="lg-row">' + when +
        '<div class="lg-main"><div class="lg-body">' +
          '<div class="lg-name">Sin reservar</div>' +
          '<div class="lg-sub">' + esc(node.name) + ' · ' + nightsWord(nights) + '</div>' +
        '</div></div></div></div>';
    }

    const shots = (L.imgs && L.imgs.length) ? L.imgs : (L.img ? [L.img] : []);
    const links = [];
    if (L.url) links.push('<a href="' + L.url + '" target="_blank" rel="noopener">' + ctx.HOTEL_LINK_LABEL + ' ↗</a>');
    if (L.mapsUrl) links.push('<a href="' + L.mapsUrl + '" target="_blank" rel="noopener">Google Maps ↗</a>');
    const total = L.booking && L.booking.total;

    return '<div class="v-card"><div class="lg-row">' + when +
      '<div class="lg-main">' +
        (shots.length ? '<img class="lg-img" src="' + shots[0] + '" loading="lazy" alt="">' : '') +
        '<div class="lg-body">' +
          '<div class="lg-name"><span class="dx">' + esc(L.name) + '</span><span class="dm">Reservado</span></div>' +
          (L.type || L.guests ? '<div class="lg-sub">' + esc([L.type, L.guests].filter(Boolean).join(' · ')) + '</div>' : '') +
          (L.area ? '<div class="lg-area">' + esc(L.area) + '</div>' : '') +
          hoursHtml(L) +
          (links.length ? '<div class="lg-links">' + links.join('') + '</div>' : '') +
          // El costo vive en el bloque de reserva; sin reserva cargada va acá.
          (total && !L.booking ? '<div class="lg-cost dx">' + esc(total) + '</div>' : '') +
          ctx.resvHtml(L) +
        '</div>' +
      '</div>' +
    '</div></div>';
  });

  const conRes = it.lodgings.filter(l => l.lodging).length;
  return '<div class="v-title">Hospedajes <span>' + conRes + ' de ' + it.lodgings.length + ' reservados · ' +
    it.lodgings.reduce((a, l) => a + l.nights, 0) + ' noches</span></div>' + rows.join('');
};

// ------------------------------------------------------------ 3 · transportes
// Cada salto entre paradas: cuándo sale, cuándo llega y —sobre todo— qué es lo que
// fija ese horario. Donde todavía no está decidido lo dice; no lo estima.

// Chip de hora. `ref` es el día del salto: si la hora cae en otro día se aclara cuál.
function timeChip(label, dt, ref, cls) {
  if (!dt) return '<span class="tr-t tbd">' + label + ' a definir</span>';
  const d = dayOf(dt);
  return '<span class="tr-t ' + (cls || '') + '">' + label + ' <b>' + timeOf(dt) + '</b>' +
    (d !== ref ? ' · ' + fmtDate(d) : '') + '</span>';
}

RENDER.transportes = (it, ctx) => {
  const esc = ctx.escHtml;
  const rows = it.transfers.map(t => {
    const leg = t.leg;
    const kind = ctx.legType(leg);
    const style = ctx.MODE_STYLE[kind] || {};
    const segs = leg.segments || [];

    const segsHtml = segs.length ? '<div class="tr-segs">' + segs.map(s => s.layover
      ? '<div class="tr-lay">' + esc(s.layover) + '</div>'
      : '<a class="tr-seg" href="' + (s.tracker || '#') + '" target="_blank" rel="noopener">' +
          '<span><span class="s-route">' + esc(s.route) + '</span>' + (s.no ? '<span class="s-no">' + esc(s.no) + '</span>' : '') + '</span>' +
          '<span class="s-time">' + esc(s.when || '') + (s.aircraft ? '<span class="s-ac">' + esc(s.aircraft) + '</span>' : '') + '</span>' +
        '</a>').join('') + '</div>' : '';

    const dl = leg.deadline;
    const dlHtml = dl ? '<div class="tr-dl">Hay que estar <b>' + timeOf(dl.by) + '</b> — ' + esc(dl.what) +
      (dl.departBy ? '<br>→ salir a más tardar <b>' + timeOf(dl.departBy) + '</b>' : '') + '</div>' : '';

    // Qué te espera del otro lado: la ventana de check-in del hospedaje al que llegás.
    const L = t.kind === 'in' ? t.node.lodging : null;
    const lodgeHtml = L && (L.checkInFrom || L.checkInTo)
      ? '<div class="tr-lodge dx">Check-in en <b>' + esc(L.name) + '</b> ' +
          (L.checkInFrom && L.checkInTo ? L.checkInFrom + '–' + L.checkInTo : 'desde ' + L.checkInFrom) + '</div>'
      : '';

    // Las restricciones se leen igual en discreto, pero sin las horas concretas ni el
    // nombre del hospedaje: `maskFree` es el mismo borrador que usan los intros.
    const whyHtml = (leg.why || []).length
      ? '<ul class="tr-why">' + leg.why.map(w => '<li>' + ctx.DX(esc(w), esc(ctx.maskFree(w))) + '</li>').join('') + '</ul>' : '';

    const dirUrl = leg.dirUrl || ('https://www.google.com/maps/dir/?api=1&origin=' +
      encodeURIComponent(t.from) + '&destination=' + encodeURIComponent(t.to) + '&travelmode=transit');

    return '<div class="v-card"><div class="tr-row tr-' + kind + '">' +
      '<div class="tr-when">' +
        '<div class="tr-date">' + fmtDate(t.date) + '</div>' +
        '<div class="tr-wd">' + fmtWeekday(t.date) + '</div>' +
        '<div class="tr-mode" style="color:' + (style.color || '#8d8878') + '">' + (leg.mode || '') + ' ' + (style.label || '') + '</div>' +
      '</div>' +
      '<div class="tr-main">' +
        '<div class="tr-route"><button type="button" class="v-goto" data-goto="' + t.node.id + '">' +
          esc(t.from) + '<span class="tr-arrow">→</span>' + esc(t.to) + '</button></div>' +
        (leg.detail ? '<div class="tr-detail">' + esc(leg.detail) + '</div>' : '') +
        '<div class="tr-times">' +
          timeChip('Sale', t.departure, t.date, 'go') +
          timeChip('Llega', t.arrival, t.date) +
          (leg.time ? '<span class="tr-t dur">' + esc(leg.time) + '</span>' : '') +
        '</div>' +
        dlHtml + lodgeHtml + whyHtml + segsHtml +
        '<a class="tr-dir" href="' + dirUrl + '" target="_blank" rel="noopener">' + esc(leg.dirLabel || 'cómo llegar ↗') + '</a>' +
      '</div>' +
    '</div></div>';
  });

  const conHora = it.transfers.filter(t => t.departure).length;
  return '<div class="v-title">Transportes <span>' + it.transfers.length + ' saltos · ' +
    conHora + ' con horario, ' + (it.transfers.length - conHora) + ' a definir</span></div>' + rows.join('');
};

// -------------------------------------------------------------------- 4 · días
// Una fila por jornada, del primer despegue al último aterrizaje. Dónde estás, qué
// hay reservado con hora, y las sugerencias que salen de las `activities` del nodo
// —no de una lista nueva—. Ver itinerary.js para cómo se reparten.

const EV_LABEL = { vuelo: 'vuelo', transporte: 'viaje', 'check-in': 'check-in', 'check-out': 'check-out', reserva: 'reservado' };

// Dentro de una categoría: un bloque por salida (en el orden en que aparece la
// primera de sus actividades) y las sueltas juntas, en su lugar. El `group` —"esto se
// hace en la misma salida"— sobrevive como subtítulo: repetirlo en cada ítem decía
// tres veces lo mismo.
function runsOf(list) {
  const runs = [], byGroup = new Map();
  for (const it of list) {
    const g = it.act.group || null;
    if (g) {
      if (!byGroup.has(g)) { const r = { label: g, items: [] }; byGroup.set(g, r); runs.push(r); }
      byGroup.get(g).items.push(it);
    } else {
      const last = runs[runs.length - 1];
      if (last && !last.label) last.items.push(it);
      else runs.push({ label: null, items: [it] });
    }
  }
  return runs;
}

// El orden de un CATÁLOGO de actividades: por categoría (CAT_ORDER) y, adentro, por
// salida. Es el orden del "todo lo de <ciudad>", que es una lista para elegir. El
// recorrido de una jornada NO se ordena así —ahí manda la geografía, ver dayRoute()—.
function catGroups(items, ctx) {
  const byCat = new Map();
  for (const it of items) {
    const c = ctx.catOfAct(it.act);
    if (!byCat.has(c)) byCat.set(c, []);
    byCat.get(c).push(it);
  }
  return ctx.CAT_ORDER.filter(c => byCat.has(c)).map(c => ({ cat: c, runs: runsOf(byCat.get(c)) }));
}

// Una lista de actividades agrupada por la MISMA taxonomía que colorea los pines del
// mapa (data/categories.js), para que la lista y el mapa se lean como una sola cosa.
// Cada ítem con `coords` es un botón que vuela a su punto; el que no las tiene va como
// texto (no se le inventan coordenadas).
function catListHtml(items, ctx, nodeId) {
  const esc = ctx.escHtml;

  // Hay actividades que nombran el hospedaje ("Onsen al atardecer en Yoshiike
  // Ryokan"): en discreto el nombre se cae, igual que en la tarjeta de la parada.
  const label = act => ctx.DX(esc(act.text), esc(ctx.maskLodging(act.text)));
  const itemHtml = ({ i, act }) => act.coords
    ? '<li><button type="button" class="sg-item" data-act="' + nodeId + ':' + i + '">' + label(act) + '</button></li>'
    : '<li class="sg-item plain">' + label(act) + '</li>';

  return catGroups(items, ctx).map(g => {
    const meta = ctx.CAT_META[g.cat] || ctx.CAT_META.otro;
    return '<div class="sg-cat" style="--c:' + meta.color + '">' +
      '<div class="sg-head">' + meta.icon + ' ' + esc(meta.label) + '</div>' +
      g.runs.map(r =>
        (r.label ? '<div class="sg-grp">' + esc(r.label) + '</div>' : '') +
        '<ul class="sg-list' + (r.label ? ' in-grp' : '') + '">' + r.items.map(itemHtml).join('') + '</ul>'
      ).join('') +
    '</div>';
  }).join('');
}

// ---------------------------------------------------- el recorrido de la jornada
// El orden de la lista de actividades es el orden en que están cargadas, que es el
// orden en que se le ocurrieron a alguien — no el orden en que se caminan. Seguirlo
// da un día que cruza la ciudad de punta a punta tres veces. Acá se ordena por
// geografía: se sale de la cama de anoche, se encadena por cercanía y se termina en
// la cama de esta noche.

// Distancia entre dos puntos, en grados corregidos por latitud. No son kilómetros y
// no hace falta que lo sean: sólo se comparan distancias entre sí, todas dentro de la
// misma ciudad. (Equirectangular; a esta escala el error contra Haversine es ínfimo.)
function dist(a, b) {
  const x = (b[1] - a[1]) * Math.cos((a[0] + b[0]) / 2 * Math.PI / 180);
  const y = b[0] - a[0];
  return Math.sqrt(x * x + y * y);
}

// Cuántas paradas sueltas entran antes de una hora comprada. El día arranca a las 9 y
// una parada lleva hora y media: es un supuesto, y es explícito porque es el único que
// hay —los lugares no traen duración—. Sin él, una entrada a las 9:00 se acomoda a la
// tarde porque caminando conviene, y a las 9 hay que estar adentro; con él, una cena
// reservada a las 20:00 sigue teniendo el día entero por delante.
const DAY_START = 9 * 60, STOP_MIN = 90;
function capBefore(at) {
  const t = timeOf(at);
  if (!t) return Infinity;
  return Math.max(0, Math.floor((Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5)) - DAY_START) / STOP_MIN));
}

// Ordena los puntos de un tramo como un recorrido: inserción más barata (entra el
// punto que menos camino agrega) y después mejoras locales —dar vuelta un tramo
// (2-opt) o mudar un punto (relocate)— hasta que nada mejore.
//
// `startLL` y `endLL` son las puntas fijas (de dónde salís, dónde terminás); pueden
// faltar. Los puntos con `anchor` tienen hora comprada: el reloj manda sobre la
// geografía, así que conservan su orden entre sí y no se les puede meter adelante más
// paradas de las que entran en el día antes de esa hora (`cap`).
//
// Son ≤10 puntos por día: esto corre en microsegundos y llega al óptimo o al lado.
// Tampoco es ruteo por calles (eso pedía un servicio externo): es el orden de visita.
function orderRoute(pts, startLL, endLL) {
  let tour = pts.filter(p => p.anchor);        // ya vienen en orden de reloj
  const free = pts.filter(p => !p.anchor);

  const len = t => {
    let s = 0, prev = startLL;
    for (const p of t) { if (prev) s += dist(prev, p.ll); prev = p.ll; }
    return s + (prev && endLL ? dist(prev, endLL) : 0);
  };
  const legal = t => {
    let n = 0;
    for (const p of t) {
      if (p.anchor) { if (n > p.cap) return false; }
      else n += p.blocks ? p.blocks.length : 1;   // una salida entera ocupa lo que dura
    }
    return true;
  };

  while (free.length) {
    let best = null;
    free.forEach((p, pi) => {
      for (let i = 0; i <= tour.length; i++) {
        const cand = tour.slice(0, i).concat([p], tour.slice(i));
        if (!legal(cand)) continue;
        const prev = i ? tour[i - 1].ll : startLL;
        const next = i < tour.length ? tour[i].ll : endLL;
        const cost = (prev ? dist(prev, p.ll) : 0) + (next ? dist(p.ll, next) : 0) -
                     (prev && next ? dist(prev, next) : 0);
        if (!best || cost < best.cost) best = { cost, pi, cand };
      }
    });
    // Al final del recorrido no hay ancla que se pueda pisar: siempre hay lugar.
    tour = best.cand;
    free.splice(best.pi, 1);
  }

  let best = len(tour);
  for (let pass = 0; pass < 40; pass++) {
    let moved = false;
    const better = cand => {
      if (!legal(cand)) return false;
      const l = len(cand);
      if (l >= best - 1e-12) return false;
      tour = cand; best = l; moved = true;
      return true;
    };
    for (let i = 0; i < tour.length && !moved; i++) {
      // dar vuelta el tramo i..j — sólo si adentro no hay dos anclas que se crucen
      for (let j = i + 1; j < tour.length; j++) {
        if (tour.slice(i, j + 1).filter(p => p.anchor).length > 1) continue;
        if (better(tour.slice(0, i).concat(tour.slice(i, j + 1).reverse(), tour.slice(j + 1)))) break;
      }
      // mudar un punto libre a cualquier otro lugar (nunca reordena anclas)
      if (moved || tour[i].anchor) continue;
      const rest = tour.slice(0, i).concat(tour.slice(i + 1));
      for (let j = 0; j <= rest.length; j++) {
        if (j !== i && better(rest.slice(0, j).concat([tour[i]], rest.slice(j)))) break;
      }
    }
    if (!moved) break;
  }
  return tour;
}

const bedOf = node => (node && node.lodging && node.lodging.coords) ? node : null;
const mid = ps => ps.reduce((a, p) => [a[0] + p.ll[0] / ps.length, a[1] + p.ll[1] / ps.length], [0, 0]);

// Las actividades que comparten `group` son, en los datos, "esto se hace en la misma
// salida". Eso pesa más que la geografía: una salida se camina entera y después se
// pasa a la siguiente. Sin esto el orden por cercanía las intercala y el día queda
// con "Bukchon + Insadong" dos veces, partido por la mitad.
function blocksOf(pts) {
  const out = [], byGroup = new Map();
  for (const p of pts) {
    if (!p.group || p.anchor) { out.push(p); continue; }
    if (!byGroup.has(p.group)) { const b = { blocks: [] }; byGroup.set(p.group, b); out.push(b); }
    byGroup.get(p.group).blocks.push(p);
  }
  return out.map(b => {
    if (!b.blocks) return b;
    if (b.blocks.length === 1) return b.blocks[0];
    b.ll = mid(b.blocks);
    return b;
  });
}

// Ordena bloques y los desarma en la lista de puntos: primero se decide por dónde va
// cada salida (pesa por su centro), y recién ahí el orden de adentro, ya sabiendo de
// dónde se viene y hacia dónde sigue el día.
function orderBlocks(blocks, startLL, endLL) {
  const seq = orderRoute(blocks, startLL, endLL);
  const out = [];
  seq.forEach((b, k) => {
    if (!b.blocks) { out.push(b); return; }
    const from = out.length ? out[out.length - 1].ll : startLL;
    const to = k + 1 < seq.length ? seq[k + 1].ll : endLL;
    out.push(...orderBlocks(b.blocks, from, to));
  });
  return out;
}

// El recorrido de una jornada, en el orden en que se camina. Los puntos se parten por
// nodo y los nodos van en el orden del itinerario: en un día de traslado no se vuelve
// sobre los pasos, y mezclar Tokio con Nikko por cercanía sería un recorrido imposible.
// Dentro de cada nodo manda `orderRoute`. Lo que no tiene coords no entra en la línea
// (no se le inventan) pero sigue estando en la lista, abajo.
export function dayRoute(day, ctx) {
  const wake = bedOf(day.wake), bed = bedOf(day.sleep);
  const byNode = new Map();
  const bucket = node => {
    if (!byNode.has(node.id)) byNode.set(node.id, []);
    return byNode.get(node.id);
  };
  const entry = (node, i, act, extra) => Object.assign({
    key: node.id + ':' + i, act, ll: act.coords, cat: ctx.catOfAct(act), group: act.group || null,
  }, extra);

  // Lo que tiene hora comprada entra como ancla, en el orden en que el día lo lista
  // (los eventos ya vienen cronológicos).
  for (const e of day.events) {
    if (!e.act || !e.act.coords || !e.node) continue;
    const i = (e.node.activities || []).indexOf(e.act);
    if (i >= 0) bucket(e.node).push(entry(e.node, i, e.act, {
      anchor: true, time: e.time || null, cap: capBefore(e.act.at),
    }));
  }
  // Y las sugerencias del día, que son las que se pueden mover.
  const loose = [];
  for (const s of day.suggestions)
    for (const it of s.clusters.flatMap(c => c.items))
      (it.act.coords ? bucket(s.node) : loose).push(entry(s.node, it.i, it.act));

  // Los nodos van en el orden del ITINERARIO, no por cercanía: en un día de traslado no
  // se vuelve sobre los pasos. Cada uno tira hacia el siguiente — la punta de un tramo
  // es por dónde sigue el día.
  const legs = day.here.map(h => byNode.get(h.node.id)).filter(l => l && l.length).map(blocksOf);
  const route = [];
  legs.forEach((blocks, k) => {
    const from = route.length ? route[route.length - 1].ll : (wake ? wake.lodging.coords : null);
    const to = k + 1 < legs.length ? mid(legs[k + 1]) : (bed ? bed.lodging.coords : null);
    route.push(...orderBlocks(blocks, from, to));
  });

  return {
    date: day.date,
    // El chip del mapa es HTML, no texto: la fecha concreta cae en modo discreto,
    // igual que la de la tarjeta del día.
    label: 'Día ' + day.n + ctx.DX(' · ' + fmtDate(day.date)),
    // El mapa sólo lee `key` y `cat` de cada punto. Es UN array y no dos: la lista y
    // la línea no pueden contar recorridos distintos porque son el mismo objeto.
    route,
    loose,
    stops: day.here.map(h => h.node.id),
    // Las dos puntas del día. Cuando son la misma cama el recorrido cierra el círculo,
    // que es lo que efectivamente pasa: salís del hotel y volvés a dormir ahí.
    wake: wake ? wake.id : null,
    lodging: bed ? bed.id : null,
  };
}

// Armar el recorrido cuesta poco pero se pide varias veces por día (el botón, el foco,
// la lista): una vez por jornada alcanza.
const _routes = new WeakMap();
function routeOf(day, ctx) {
  if (!_routes.has(day)) _routes.set(day, dayRoute(day, ctx));
  return _routes.get(day);
}

// Un día sin ningún punto no tiene nada que mostrar en el mapa: sin botón.
const dayHasMap = spec => !!(spec.route.length || spec.lodging || spec.stops.length);

// El recorrido del día en la sidebar: los mismos puntos, en el mismo orden y con el
// mismo número que la línea del mapa. El número no depende del foco —está siempre—
// porque es lo que permite mirar el mapa y volver a encontrar el punto en la lista.
// El color y el ícono siguen siendo los de la categoría (data/categories.js), que es
// lo que ataba la lista con los pines cuando la lista se agrupaba por categoría.
function routeListHtml(spec, ctx, day) {
  const esc = ctx.escHtml;
  const shortOf = id => (day.here.find(h => h.node.id === id) || { node: {} }).node.short || '';
  // Hay actividades que nombran el hospedaje ("Onsen al atardecer en Yoshiike
  // Ryokan"): en discreto el nombre se cae, igual que en la tarjeta de la parada.
  const label = act => ctx.DX(esc(act.text), esc(ctx.maskLodging(act.text)));
  const icon = p => '<span class="rt-ic">' + (ctx.CAT_META[p.cat] || ctx.CAT_META.otro).icon + '</span>';
  const color = p => (ctx.CAT_META[p.cat] || ctx.CAT_META.otro).color;

  // Los `group` de los datos ("Asakusa + Sumida River + Skytree" = una salida) siguen
  // apareciendo, pero como lo que son ahora: un tramo del recorrido. Si la geografía
  // parte una salida en dos, el rótulo aparece dos veces — que es la verdad.
  let node = null, grp = null;
  const multi = new Set(spec.route.map(p => p.key.split(':')[0])).size > 1;
  const items = spec.route.map((p, i) => {
    let head = '';
    const nid = p.key.split(':')[0];
    if (multi && nid !== node) head += '<li class="rt-node">' + esc(shortOf(nid)) + '</li>';
    if (p.group !== grp && p.group) head += '<li class="rt-grp">' + esc(p.group) + '</li>';
    node = nid; grp = p.group;
    // Los de una salida van indentados: si no, el primer ítem suelto que viene después
    // se lee como si todavía perteneciera al rótulo de arriba.
    return head + '<li class="rt-item' + (p.group ? ' in-grp' : '') + '" style="--c:' + color(p) + '">' +
      '<button type="button" class="sg-item" data-act="' + p.key + '" data-ord="' + (i + 1) + '">' +
        (p.time ? '<span class="rt-t dx">' + p.time + '</span>' : '') + icon(p) + label(p.act) +
      '</button></li>';
  }).join('');

  // Sin coordenadas no hay lugar en la línea, pero la idea sigue siendo parte del día.
  const rest = spec.loose.map(p =>
    '<li class="rt-item plain" style="--c:' + color(p) + '">' + icon(p) + label(p.act) + '</li>').join('');

  return (items ? '<ol class="rt-list">' + items + '</ol>' : '') +
    (rest ? '<ul class="rt-list rt-rest">' + rest + '</ul>' : '');
}

const offScreen = (el) => {
  const r = el.getBoundingClientRect();
  return r.bottom < 0 || r.top > (window.innerHeight || document.documentElement.clientHeight);
};

RENDER.dias = (it, ctx) => {
  const esc = ctx.escHtml;
  const rows = it.days.map(day => {
    const where = day.here.length
      ? day.here.map(h => '<button type="button" class="v-goto" data-goto="' + h.node.id + '">' + esc(h.node.short) +
          '</button><span class="dy-role' + (h.role === 'de paso' ? ' paso' : '') + '">' + h.role + '</span>').join('<span class="tr-arrow">→</span>')
      : (day.inFlight ? '✈️ En vuelo' : 'Fin del viaje');

    const sleep = day.sleep && day.sleep.lodging
      ? '<div class="dy-sleep dx">Dormís en <b>' + esc(day.sleep.lodging.name) + '</b></div><div class="dy-sleep dm">Dormís en <b>' + esc(day.sleep.short) + '</b></div>'
      : day.sleep ? '<div class="dy-sleep">Dormís en <b>' + esc(day.sleep.short) + '</b> · sin reservar</div>'
      : day.inFlight ? '<div class="dy-sleep">Noche a bordo</div>' : '';

    const events = day.events.map(e => {
      const note = e.act ? [e.act.booked, e.act.bestTime, e.act.openHours].filter(Boolean).join(' · ') : '';
      // El nombre del hospedaje es dato sensible: en modo discreto queda la ciudad.
      const what = e.lodging ? ctx.DX(esc(e.lodging.name), esc(e.node.short)) : esc(e.text);
      return '<div class="dy-e ' + (e.kind === 'reserva' ? 'resv' : '') + '">' +
        '<span class="dy-time' + (e.time ? '' : ' none') + '">' + (e.time || '—') + '</span>' +
        '<span class="dy-etext"><span class="ek">' + EV_LABEL[e.kind] + '</span>' + what +
          (note ? '<div class="dy-note dx">' + esc(note) + '</div>' : '') +
        '</span></div>';
    }).join('');

    const spec = routeOf(day, ctx);
    const sug = routeListHtml(spec, ctx, day);

    // El reparto del día muestra dos o tres cosas de un nodo que tiene treinta: acá
    // abajo está el catálogo entero del nodo, para que nada del itinerario quede
    // invisible. El cuerpo se arma recién al abrirlo (ver mountViews).
    const all = day.here.map(h => h.node).filter(n => (n.activities || []).length).map(n =>
      '<details class="sg-all"><summary>todo lo de ' + esc(n.short) +
        ' <b>' + n.activities.length + '</b></summary>' +
        '<div class="sg-all-body" data-node="' + n.id + '"></div>' +
      '</details>').join('');

    // El botón lleva el mapa a esa jornada (foco de día, task 508). No abre nada en el
    // sidebar: la lista ya está acá, lo que cambia es lo que se ve al lado.
    const mapBtn = dayHasMap(spec)
      ? '<button type="button" class="dy-map" data-day="' + day.date + '">ver en mapa</button>' : '';

    return '<div class="v-card' + (day.inFlight ? ' dy-flight' : '') + '"><div class="dy-row">' +
      '<div class="dy-when">' +
        '<div class="dy-num">DÍA ' + day.n + '</div>' +
        '<div class="dy-date">' + fmtDate(day.date) + '</div>' +
        '<div class="dy-wd">' + fmtWeekday(day.date) + '</div>' +
        mapBtn +
      '</div>' +
      '<div class="dy-main">' +
        '<div class="dy-where">' + where + '</div>' + sleep +
        (events ? '<div class="dy-ev">' + events + '</div>' : '') +
        (sug || all ? '<div class="dy-sug">' + sug + all + '</div>'
          : (events ? '' : '<div class="dy-free">Sin nada agendado.</div>')) +
      '</div>' +
    '</div></div>';
  });

  // El rango de fechas cae en discreto, igual que el del header (que ahí dice "43 días").
  return '<div class="v-title">Días <span>' + it.days.length + ' jornadas' +
    ctx.DX(' · ' + fmtDate(it.start) + ' → ' + fmtDate(it.end)) + '</span></div>' + rows.join('');
};

export function mountViews(destinations, ctx) {
  const rail = document.getElementById('tab-rail');
  const host = document.getElementById('views');
  if (!rail || !host) return;

  const it = buildItinerary(destinations);
  const byId = {};
  destinations.forEach(d => { byId[d.id] = d; });
  const dayByDate = {};
  it.days.forEach(d => { dayByDate[d.date] = d; });
  const tabs = TABS.filter(t => t.id === 'resumen' || RENDER[t.id]);
  const panes = { resumen: document.getElementById('view-resumen') };
  const btns = {};
  const done = {};

  for (const t of tabs) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tab-btn';
    b.dataset.tab = t.id;
    b.innerHTML = '<span class="tab-ic">' + t.icon + '</span>' + t.label;
    b.addEventListener('click', () => go(t.id));
    rail.appendChild(b);
    btns[t.id] = b;
    if (t.id !== 'resumen') {
      const p = document.createElement('section');
      p.className = 'view-pane';
      p.id = 'view-' + t.id;
      p.hidden = true;
      host.appendChild(p);
      panes[t.id] = p;
    }
  }
  // Con una sola vista el riel no aporta nada: no se muestra.
  rail.hidden = tabs.length < 2;

  // El catálogo completo de un nodo se repite en cada uno de sus días (Tokio son 32
  // actividades × 6 días): armarlo al montar la vista serían ~800 botones que casi
  // nadie abre. Se llena la primera vez que se despliega y queda.
  function fillCatalog(box) {
    if (!box || box.firstChild) return;
    const node = byId[box.dataset.node];
    if (!node) return;
    box.innerHTML = catListHtml((node.activities || []).map((act, i) => ({ i, act })), ctx, node.id);
  }

  // `?tab=` manda; un `?dia=` sin tab explícito abre Días, que es de donde sale el
  // foco: el link compartido tiene que aterrizar en la lista de esa jornada.
  function current() {
    const s = new URLSearchParams(location.search);
    if (panes[s.get('tab')]) return s.get('tab');
    if (s.get('dia') && panes.dias) return 'dias';
    return 'resumen';
  }

  // Un día sin un solo punto (jornada en vuelo) no se puede enfocar: el link deja el
  // mapa vacío con un chip que no explica nada. Se ignora el parámetro.
  function currentDay() {
    const d = new URLSearchParams(location.search).get('dia');
    return dayByDate[d] && dayHasMap(routeOf(dayByDate[d], ctx)) ? d : null;
  }

  let shownTab = null;

  function show(id) {
    for (const t of tabs) {
      panes[t.id].hidden = t.id !== id;
      btns[t.id].classList.toggle('on', t.id === id);
    }
    if (id !== 'resumen' && !done[id]) {
      panes[id].innerHTML = '<div class="view-inner">' + RENDER[id](it, ctx) + '</div>';
      if (ctx.wire) ctx.wire(panes[id]);
      panes[id].addEventListener('click', (e) => {
        const s = e.target.closest('.sg-all > summary');
        if (s) fillCatalog(s.parentNode.querySelector('.sg-all-body'));
      });
      done[id] = true;
    }
    // El mapa vive fuera de las tabs y no se esconde nunca: cambiar de tab no lo
    // redimensiona, así que ya no hay que invalidarle el tamaño al volver.
    // Enfocar un día no cambia de tab: ahí el scroll de la lista no se toca.
    if (shownTab !== id) panes[id].scrollTop = 0;
    shownTab = id;
    // El riel es una barra que puede scrollear: que el tab activo se vea.
    btns[id].scrollIntoView({ block: 'nearest', inline: 'center' });
  }

  // ------------------------------------------------------ foco de día (task 508)
  // El foco vive en la URL (?dia=2026-10-14), igual que la tab: el link es
  // compartible y "atrás" sale del foco sin sacarte de la vista.
  let shownDay = null;

  function showDay(date) {
    if (ctx.focusDay) {
      if (date) ctx.focusDay(routeOf(dayByDate[date], ctx));
      else if (shownDay) ctx.exitDayFocus();
    }
    const pane = panes.dias;
    if (pane) {
      let btn = null;
      pane.querySelectorAll('.dy-map').forEach(b => {
        const on = b.dataset.day === date;
        b.classList.toggle('on', on);
        if (on) btn = b;
      });
      // Los números del recorrido ya están puestos al renderizar y no dependen del
      // foco: son el orden real de la jornada, no un adorno del modo mapa.
      // Sólo si el día quedó fuera de pantalla (deep-link, back): cuando el foco sale
      // de tocar el botón, ese día ya se está mirando y mover la lista es ruido — y en
      // mobile encima taparía el mapa, que es lo que acaba de cambiar.
      if (btn && date !== shownDay && !pane.hidden && offScreen(btn)) btn.scrollIntoView({ block: 'center' });
    }
    shownDay = date;
  }

  function apply() {
    show(current());
    showDay(currentDay());
  }

  function go(id) {
    const u = new URL(location.href);
    if (id === 'resumen') u.searchParams.delete('tab'); else u.searchParams.set('tab', id);
    history.pushState(null, '', u);
    apply();
  }

  // Entrar al foco (o salir, si se vuelve a tocar el día que ya está enfocado).
  // Entrar y salir NO cambian de vista: el tab se preserva explícitamente porque un
  // `?dia=` pelado ya vale por `tab=dias`, y borrarlo sin más te devolvía al resumen.
  function goDay(date) {
    const u = new URL(location.href);
    const tab = date ? 'dias' : current();
    if (tab === 'resumen') u.searchParams.delete('tab'); else u.searchParams.set('tab', tab);
    if (date && date !== currentDay()) u.searchParams.set('dia', date);
    else u.searchParams.delete('dia');
    history.pushState(null, '', u);
    apply();
  }

  if (panes.dias) {
    panes.dias.addEventListener('click', (e) => {
      const b = e.target.closest('.dy-map');
      if (b) { e.stopPropagation(); goDay(b.dataset.day); }
    });
  }
  // El chip "✕ Día N" del mapa es la otra salida: pasa por la URL, no por el mapa
  // directo, para que la vista y el histórico queden en el mismo estado.
  if (ctx.onDayExit) ctx.onDayExit(() => goDay(null));

  window.addEventListener('popstate', apply);
  apply();
  return { go, goDay, itinerary: it };
}
