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

// Los nodos compartidos se marcan igual en las cuatro vistas: badge violeta con quién, y
// —donde el borde izquierdo está libre— el acento en la tarjeta. El dato es del nodo
// (`sharedWith`), no de la vista: acá sólo se lo lee.
const sharedTag = node => (node && node.sharedWith)
  ? '<span class="shared-tag">+ ' + node.sharedWith + '</span>' : '';
const sharedCls = node => (node && node.sharedWith) ? ' shared' : '';

// ------------------------------------------------------------- 2 · hospedajes
// Las 13 paradas donde se duerme, en orden. La que todavía no tiene reserva
// aparece igual: el hueco es parte de la información.

RENDER.hospedajes = (it, ctx) => {
  const esc = ctx.escHtml;
  const rows = it.lodgings.map(({ node, lodging: L, start, end, nights, pending }) => {
    // Una parada en reubicación no tiene fechas que mostrar: tiene un estado.
    const when = pending
      ? '<div class="lg-when">' +
          // La fecha candidata va en `.lg-dates`, que es lo que se cae en modo discreto;
          // el estado ("a reubicar") queda, porque no dice cuándo ni dónde.
          '<div class="lg-dates">' + esc(node.dates || '') + '</div>' +
          '<div class="lg-nights tbd">a reubicar</div>' +
          '<button type="button" class="lg-city v-goto" data-goto="' + node.id + '">' + esc(node.short) + '</button>' +
        '</div>'
      : '<div class="lg-when">' +
          '<div class="lg-dates">' + fmtRange(start, end) + '</div>' +
          '<div class="lg-nights">' + nightsWord(nights) + '</div>' +
          '<button type="button" class="lg-city v-goto" data-goto="' + node.id + '">' + esc(node.short) + '</button>' +
        '</div>';

    if (!L) {
      // `lodgingTbd` es lo que se sabe del hospedaje que falta (para cuántos, con quién).
      return '<div class="v-card lg-pending' + sharedCls(node) + '" data-hosp="' + node.id + '"><div class="lg-row">' + when +
        '<div class="lg-main"><div class="lg-body">' +
          '<div class="lg-name">Sin reservar' + sharedTag(node) + '</div>' +
          '<div class="lg-sub">' + esc(node.name) + ' · ' + nightsWord(nights) + '</div>' +
          (node.lodgingTbd ? '<div class="lg-warn">' + esc(node.lodgingTbd) + '</div>' : '') +
        '</div></div></div></div>';
    }

    const shots = (L.imgs && L.imgs.length) ? L.imgs : (L.img ? [L.img] : []);
    const links = [];
    if (L.url) links.push('<a href="' + L.url + '" target="_blank" rel="noopener">' + ctx.HOTEL_LINK_LABEL + ' ↗</a>');
    if (L.mapsUrl) links.push('<a href="' + L.mapsUrl + '" target="_blank" rel="noopener">Google Maps ↗</a>');
    const total = L.booking && L.booking.total;

    // `data-hosp` es el id del nodo, el mismo con el que el mapa indexa su pin de cama:
    // es lo que hace que tocar uno lleve al otro, en los dos sentidos.
    return '<div class="v-card' + sharedCls(node) + '" data-hosp="' + node.id + '"><div class="lg-row">' + when +
      '<div class="lg-main">' +
        (shots.length ? '<img class="lg-img" src="' + shots[0] + '" loading="lazy" alt="">' : '') +
        '<div class="lg-body">' +
          '<div class="lg-name"><span class="dx">' + esc(L.name) + '</span><span class="dm">Reservado</span>' + sharedTag(node) + '</div>' +
          (L.type || L.guests ? '<div class="lg-sub">' + esc([L.type, L.guests].filter(Boolean).join(' · ')) + '</div>' : '') +
          (L.area ? '<div class="lg-area">' + esc(L.area) + '</div>' : '') +
          // Lo que hay que hacerle a la reserva (rebookear, ajustar fechas, ampliar a 4):
          // va arriba de los horarios, que son los de la reserva vieja.
          (L.pending ? '<div class="lg-warn">⚠ ' + esc(L.pending) + '</div>' : '') +
          hoursHtml(L) +
          (links.length ? '<div class="lg-links">' + links.join('') + '</div>' : '') +
          // El costo vive en el bloque de reserva; sin reserva cargada va acá.
          (total && !L.booking ? '<div class="lg-cost dx">' + esc(total) + '</div>' : '') +
          ctx.resvHtml(L) +
        '</div>' +
      '</div>' +
    '</div></div>';
  });

  // El contador cuenta la CADENA: la parada en reubicación no es una noche del viaje.
  const firmes = it.lodgings.filter(l => !l.pending);
  const conRes = firmes.filter(l => l.lodging).length;
  return '<div class="v-title">Hospedajes <span>' + conRes + ' de ' + firmes.length + ' reservados · ' +
    firmes.reduce((a, l) => a + l.nights, 0) + ' noches</span></div>' + rows.join('');
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
      : '<a class="tr-seg"' + (s.tracker ? ' href="' + s.tracker + '" target="_blank" rel="noopener"' : '') + '>' +
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

    // Un salto es compartido cuando lo son sus dos puntas: el que llega a
    // Kioto no lo es, aunque Zava y Ari aterricen ese mismo día.
    const shared = t.node.sharedWith && t.prev && t.prev.sharedWith ? t.node : null;

    // `data-leg` es el id del tramo, el mismo con el que el mapa indexa su línea: es
    // lo que hace que tocar una lleve a la otra, en los dos sentidos.

    return '<div class="v-card" data-leg="' + t.id + '"><div class="tr-row tr-' + kind + '">' +
      '<div class="tr-when">' +
        '<div class="tr-date">' + fmtDate(t.date) + '</div>' +
        '<div class="tr-wd">' + fmtWeekday(t.date) + '</div>' +
        '<div class="tr-mode" style="color:' + (style.color || '#8d8878') + '">' + (leg.mode || '') + ' ' + (style.label || '') + '</div>' +
      '</div>' +
      '<div class="tr-main">' +
        '<div class="tr-route"><button type="button" class="v-goto" data-goto="' + t.node.id + '">' +
          esc(t.from) + '<span class="tr-arrow">→</span>' + esc(t.to) + '</button>' + sharedTag(shared) + '</div>' +
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
// Los `items` salen del pool de la CIUDAD (`[{ act, key }]`, ver `cityActivities` en
// index.html): la clave es la de la parada dueña de la actividad, no la del nodo que
// está mostrando la lista.
function catListHtml(items, ctx) {
  const esc = ctx.escHtml;

  // Las actividades que nombran el hospedaje pierden ese nombre en discreto,
  // igual que en la tarjeta de la parada.
  const label = act => ctx.DX(esc(act.text), esc(ctx.maskLodging(act.text)));
  const itemHtml = ({ key, act }) => act.coords
    ? '<li data-check="' + key + '"><button type="button" class="sg-item" data-act="' + key + '">' + label(act) + '</button></li>'
    : '<li class="sg-item plain" data-check="' + key + '">' + label(act) + '</li>';

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
// sobre los pasos, y mezclar ciudades por cercanía sería un recorrido imposible.
// Dentro de cada nodo manda `orderRoute`. Lo que no tiene coords no entra en la línea
// (no se le inventan) pero sigue estando en la lista, abajo.
//
// El día cierra sobre sus puntas reales: sale de la cama de anoche y vuelve a la de esta
// noche, y cuando hay traslado la punta es la terminal del salto (`leg.fromTerminal` /
// `toTerminal` en los datos) — el aeropuerto o la estación por donde se entra y se sale
// de la ciudad, no el hotel de la ciudad siguiente a 500 km.
//
// `keepOrder` deja las paradas en el orden del array en vez de ordenarlas: es la línea
// "de listado" contra la que mide `scripts/check_routes.js` —mismas camas y mismas
// terminales, sólo cambia el orden de adentro—. La app nunca lo pasa.
export function dayRoute(day, ctx, keepOrder) {
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

  // Los tramos que se toman ESE día, por id: un vuelo con escalas emite un evento por
  // segmento, pero el salto —y sus terminales— es uno.
  const legsToday = new Map();
  for (const e of day.events) if (e.transfer && !legsToday.has(e.transfer.id)) legsToday.set(e.transfer.id, e.transfer);
  const transferOf = (node, kind) => [...legsToday.values()].find(t => t.kind === kind && t.node.id === node.id) || null;

  // La cadena del día: los puntos de cada nodo, y entre ellos las terminales del salto
  // que los separa. El nodo al que se llega aporta su terminal de origen (la de la
  // ciudad que se deja) y la de llegada; el que se va esta noche, la de salida. Sólo
  // las de HOY: en un vuelo que aterriza al otro día, la punta de llegada es del día
  // siguiente, y ahí es su única punta.
  const chain = [], done = new Set();
  const terminals = (t) => {
    if (!t || done.has(t.id)) return;
    done.add(t.id);
    if (t.date === day.date && t.leg.fromTerminal && t.leg.fromTerminal.coords) chain.push({ terminal: t.leg.fromTerminal });
    if (t.endDate === day.date && t.leg.toTerminal && t.leg.toTerminal.coords) chain.push({ terminal: t.leg.toTerminal });
  };
  // Los nodos van en el orden del ITINERARIO, no por cercanía: en un día de traslado no
  // se vuelve sobre los pasos. Cada uno tira hacia el siguiente — la punta de un tramo
  // es por dónde sigue el día.
  for (const h of day.here) {
    terminals(transferOf(h.node, 'in'));
    const pts = byNode.get(h.node.id);
    if (pts && pts.length) chain.push({ blocks: blocksOf(pts) });
    terminals(transferOf(h.node, 'out'));
  }
  // Un día enteramente en tránsito no toca ningún nodo (el aterrizaje del vuelo de
  // vuelta): su única punta es la terminal donde ese salto baja.
  for (const t of legsToday.values()) terminals(t);

  // Ordenar cada tanda de puntos ya sabiendo sus dos puntas: de dónde se viene (la
  // cama, o la terminal en la que se bajó) y hacia dónde sigue (la próxima terminal, o
  // la cama de esta noche). El `line` es el trazo completo —camas, terminales y
  // paradas, en orden—; `route` son sólo las paradas, que son las que se numeran.
  const route = [], line = [];
  const llAt = k => {
    const c = chain[k];
    return c ? (c.terminal ? c.terminal.coords : mid(c.blocks)) : (bed ? bed.lodging.coords : null);
  };
  if (wake) line.push({ bed: wake.id });
  let prev = wake ? wake.lodging.coords : null;
  chain.forEach((c, k) => {
    if (c.terminal) { line.push(c); prev = c.terminal.coords; return; }
    const ordered = keepOrder ? c.blocks.flatMap(b => b.blocks || [b]) : orderBlocks(c.blocks, prev, llAt(k + 1));
    route.push(...ordered);
    line.push(...ordered);
    if (ordered.length) prev = ordered[ordered.length - 1].ll;
  });
  if (bed) line.push({ bed: bed.id });

  return {
    date: day.date,
    // El chip del mapa es HTML, no texto: la fecha concreta cae en modo discreto,
    // igual que la de la tarjeta del día.
    label: 'Día ' + day.n + ctx.DX(' · ' + fmtDate(day.date)),
    // El mapa sólo lee `key` y `cat` de cada punto. Es UN array y no dos: la lista y
    // la línea no pueden contar recorridos distintos porque son el mismo objeto.
    route,
    // El trazo entero, con las puntas que la lista no numera: `{ bed }` (un hospedaje —
    // la cama de anoche y la de esta noche; cuando son la misma, la línea cierra el
    // círculo, que es lo que efectivamente pasa: salís del hotel y volvés a dormir ahí)
    // y `{ terminal }` (el aeropuerto / la estación / el puerto por donde se entra o se
    // sale ese día). El mapa lo dibuja en este orden y nada más — sigue sin saber de
    // itinerario.
    line,
    loose,
    stops: day.here.map(h => h.node.id),
    // Los saltos que se hacen ese día (por id de tramo): el foco esconde el transporte
    // del resto del viaje, pero el de la jornada es parte de la jornada.
    legs: [...legsToday.keys()],
  };
}

// Armar el recorrido cuesta poco pero se pide varias veces por día (el botón, el foco,
// la lista): una vez por jornada alcanza.
const _routes = new WeakMap();
function routeOf(day, ctx) {
  if (!_routes.has(day)) _routes.set(day, dayRoute(day, ctx));
  return _routes.get(day);
}

// Un día sin ningún punto no tiene nada que mostrar en el mapa: sin botón. Alcanza con
// una punta —la terminal del vuelo que sale, aunque no haya nada más ese día.
const dayHasMap = spec => !!(spec.line.length || spec.stops.length);

// El recorrido del día en la sidebar: los mismos puntos, en el mismo orden y con el
// mismo número que la línea del mapa. El número no depende del foco —está siempre—
// porque es lo que permite mirar el mapa y volver a encontrar el punto en la lista.
// El color y el ícono siguen siendo los de la categoría (data/categories.js), que es
// lo que ataba la lista con los pines cuando la lista se agrupaba por categoría.
function routeListHtml(spec, ctx, day) {
  const esc = ctx.escHtml;
  const shortOf = id => (day.here.find(h => h.node.id === id) || { node: {} }).node.short || '';
  // Las actividades que nombran el hospedaje pierden ese nombre en discreto,
  // igual que en la tarjeta de la parada.
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
    return head + '<li class="rt-item' + (p.group ? ' in-grp' : '') + '" data-check="' + p.key + '" style="--c:' + color(p) + '">' +
      '<button type="button" class="sg-item" data-act="' + p.key + '" data-ord="' + (i + 1) + '">' +
        (p.time ? '<span class="rt-t dx">' + p.time + '</span>' : '') + icon(p) + label(p.act) +
      '</button></li>';
  }).join('');

  // Sin coordenadas no hay lugar en la línea, pero la idea sigue siendo parte del día.
  const rest = spec.loose.map(p =>
    '<li class="rt-item plain" data-check="' + p.key + '" style="--c:' + color(p) + '">' + icon(p) + label(p.act) + '</li>').join('');

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
          '</button><span class="dy-role' + (h.role === 'de paso' ? ' paso' : '') + '">' + h.role + '</span>' +
          sharedTag(h.node)).join('<span class="tr-arrow">→</span>')
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

    // El reparto del día muestra dos o tres cosas de una ciudad que tiene cuarenta:
    // acá abajo está el catálogo entero de la ciudad —el de TODAS sus visitas, que
    // Tokio son tres paradas y una sola lista—, para que nada quede invisible. El
    // cuerpo se arma recién al abrirlo (ver mountViews).
    const seenCity = new Set();
    const all = day.here.map(h => h.node)
      .filter(n => !seenCity.has(ctx.cityLabel(n)) && seenCity.add(ctx.cityLabel(n)))
      .filter(n => ctx.cityActivities(n).length).map(n =>
        '<details class="sg-all"><summary>todo lo de ' + esc(ctx.cityLabel(n)) +
          ' <b>' + ctx.cityActivities(n).length + '</b></summary>' +
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
  const legById = {};
  it.transfers.forEach(t => { legById[t.id] = t; });
  const hospIds = new Set(it.lodgings.map(l => l.node.id));
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

  // El catálogo completo de una ciudad se repite en cada uno de sus días (Tokio son 216
  // actividades × 16 días): armarlo al montar la vista serían miles de botones que casi
  // nadie abre. Se llena la primera vez que se despliega y queda.
  function fillCatalog(box) {
    if (!box || box.firstChild) return;
    const node = byId[box.dataset.node];
    if (!node) return;
    box.innerHTML = catListHtml(ctx.cityActivities(node), ctx);
    if (ctx.wire) ctx.wire(box);
  }

  // `?tab=` manda; un `?dia=` sin tab explícito abre Días, que es de donde sale el
  // foco, un `?tramo=` abre Transportes y un `?hosp=` abre Hospedajes, que es donde
  // vive cada ficha: el link compartido tiene que aterrizar en la lista que le
  // corresponde.
  function current() {
    const s = new URLSearchParams(location.search);
    if (panes[s.get('tab')]) return s.get('tab');
    if (s.get('dia') && panes.dias) return 'dias';
    if (legById[s.get('tramo')] && panes.transportes) return 'transportes';
    if (hospIds.has(s.get('hosp')) && panes.hospedajes) return 'hospedajes';
    return 'resumen';
  }

  // Un día sin un solo punto (jornada en vuelo) no se puede enfocar: el link deja el
  // mapa vacío con un chip que no explica nada. Se ignora el parámetro.
  function currentDay() {
    const d = new URLSearchParams(location.search).get('dia');
    return dayByDate[d] && dayHasMap(routeOf(dayByDate[d], ctx)) ? d : null;
  }

  // El tramo seleccionado. Un `?tramo=` que no existe se ignora (igual que un `?tab=`
  // desconocido): mejor la vista completa que una selección fantasma.
  function currentLeg() {
    const id = new URLSearchParams(location.search).get('tramo');
    return legById[id] ? id : null;
  }

  // El hospedaje seleccionado, con el mismo criterio: `?hosp=` es el id del nodo donde
  // se duerme, y uno que no está en la lista se ignora.
  function currentHosp() {
    const id = new URLSearchParams(location.search).get('hosp');
    return hospIds.has(id) ? id : null;
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
      // Las fichas recién existen ahora: si ya había un tramo o un hospedaje
      // seleccionado (deep-link que aterrizó en otra tab), hay que volver a marcarlo
      // sobre el HTML nuevo.
      if (id === 'transportes') shownLeg = null;
      if (id === 'hospedajes') shownHosp = null;
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

  // ------------------------------------------------------- tramos (task 510)
  // La línea del mapa y la ficha de la vista Transportes son dos caras del mismo
  // tramo: tocar cualquiera de las dos selecciona el tramo, y el tramo vive en la URL
  // (`?tramo=<id>`) como la tab y el foco de día. Así el link es compartible y "atrás"
  // deselecciona sin sacarte de la vista.
  let shownLeg = null;
  // El encuadre del mapa lo pide quien no tiene el tramo delante (deep-link, ficha del
  // sidebar); el click en la propia línea no, que ya estás mirándola.
  let legNoFit = false;

  function showLeg(id) {
    const pane = panes.transportes;
    let card = null;
    if (pane) {
      pane.querySelectorAll('[data-leg]').forEach(el => {
        const on = el.dataset.leg === id;
        el.classList.toggle('on', on);
        if (on) card = el;
      });
    }
    if (id !== shownLeg && card) {
      // Que la ficha se vea ENTERA: alcanza con que asome un borde para que la mitad
      // de la ficha —las restricciones, el check-in— quede abajo del pliegue. Si ya
      // entra completa no se toca nada, que moverla sería ruido; el flash marca cuál
      // es. Una ficha más alta que la pantalla se ancla arriba: el principio primero.
      const r = card.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      if (!pane.hidden && (r.top < 0 || r.bottom > vh)) {
        card.scrollIntoView({ block: r.height <= vh - 24 ? 'center' : 'start', behavior: 'smooth' });
      }
      if (ctx.flash) ctx.flash(card);
    }
    if (ctx.selectLeg) ctx.selectLeg(id, !legNoFit && !!id);
    shownLeg = id;
  }

  // Seleccionar un tramo (o soltarlo). `toggle` es para el click en la ficha —volver a
  // tocarla la suelta—; desde el mapa no, que tocar dos veces la misma línea tiene que
  // dar lo mismo. La tab se fija explícitamente: es donde vive la ficha.
  function goLeg(id, opts) {
    const o = opts || {};
    const u = new URL(location.href);
    const keep = id && !(o.toggle && id === currentLeg());
    if (keep) { u.searchParams.set('tab', 'transportes'); u.searchParams.set('tramo', id); }
    else u.searchParams.delete('tramo');
    // Volver a tocar la MISMA línea no agrega una entrada al histórico, pero sí vuelve
    // a marcar la ficha: es el gesto de "esta, ¿dónde estaba?".
    if (u.href === location.href) { shownLeg = null; legNoFit = !!o.fromMap; showLeg(currentLeg()); legNoFit = false; return; }
    history.pushState(null, '', u);
    legNoFit = !!o.fromMap;
    apply();
    legNoFit = false;
  }

  // --------------------------------------------------- hospedajes (task 544)
  // Misma historia que los tramos, con la cama: el pin del mapa y la ficha de la vista
  // Hospedajes son dos caras del mismo alojamiento. Tocar el pin abre su ficha (que es
  // lo que pidió Martín) y tocar la ficha marca el pin; el estado vive en `?hosp=<id>`,
  // así el link es compartible y "atrás" deselecciona sin sacarte de la vista.
  let shownHosp = null;
  // El encuadre lo pide quien no tiene la cama delante (deep-link, click en la ficha);
  // el click en el propio pin no, que ya lo estás mirando.
  let hospNoFit = false;

  function showHosp(id) {
    const pane = panes.hospedajes;
    let card = null;
    if (pane) {
      pane.querySelectorAll('[data-hosp]').forEach(el => {
        const on = el.dataset.hosp === id;
        el.classList.toggle('on', on);
        if (on) card = el;
      });
    }
    if (id !== shownHosp && card) {
      // Que la ficha se vea ENTERA (mismo criterio que la del tramo): si ya entra
      // completa no se toca el scroll, y una más alta que la pantalla se ancla arriba.
      const r = card.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      if (!pane.hidden && (r.top < 0 || r.bottom > vh)) {
        card.scrollIntoView({ block: r.height <= vh - 24 ? 'center' : 'start', behavior: 'smooth' });
      }
      if (ctx.flash) ctx.flash(card);
    }
    if (ctx.selectLodging) ctx.selectLodging(id, !hospNoFit && !!id);
    shownHosp = id;
  }

  // Seleccionar un hospedaje (o soltarlo). `toggle` es para el click en la ficha —volver
  // a tocarla la suelta—; desde el mapa no, que tocar dos veces el mismo pin tiene que
  // dar lo mismo. La tab se fija explícitamente: es donde vive la ficha.
  function goHosp(id, opts) {
    const o = opts || {};
    const u = new URL(location.href);
    const keep = id && !(o.toggle && id === currentHosp());
    if (keep) { u.searchParams.set('tab', 'hospedajes'); u.searchParams.set('hosp', id); }
    else u.searchParams.delete('hosp');
    // Volver a tocar el MISMO pin no agrega una entrada al histórico, pero sí vuelve a
    // marcar la ficha: es el gesto de "esta, ¿dónde estaba?".
    if (u.href === location.href) { shownHosp = null; hospNoFit = !!o.fromMap; showHosp(currentHosp()); hospNoFit = false; return; }
    history.pushState(null, '', u);
    hospNoFit = !!o.fromMap;
    apply();
    hospNoFit = false;
  }

  if (panes.hospedajes) {
    panes.hospedajes.addEventListener('click', (e) => {
      // Los links y botones de la ficha (ver en Airbnb, Maps, ir a la parada) son suyos.
      if (e.target.closest('a, button')) return;
      const card = e.target.closest('[data-hosp]');
      if (card) goHosp(card.dataset.hosp, { toggle: true });
    });
  }
  // Tocar la cama en el mapa entra por acá: mismo estado, mismo histórico.
  if (ctx.onLodgingClick) ctx.onLodgingClick((id) => goHosp(id, { fromMap: true }));

  if (panes.transportes) {
    panes.transportes.addEventListener('click', (e) => {
      // Los links y botones de la ficha (cómo llegar, tracker, ir al punto) son suyos.
      if (e.target.closest('a, button')) return;
      const card = e.target.closest('[data-leg]');
      if (card) goLeg(card.dataset.leg, { toggle: true });
    });
  }
  // Tocar la línea en el mapa entra por acá: mismo estado, mismo histórico.
  if (ctx.onLegClick) ctx.onLegClick((id) => goLeg(id, { fromMap: true }));

  function apply() {
    show(current());
    showDay(currentDay());
    showLeg(currentLeg());
    showHosp(currentHosp());
  }

  function go(id) {
    const u = new URL(location.href);
    // El resumen no lleva parámetro… salvo que haya un `?dia=`/`?tramo=`/`?hosp=`, que
    // valen por su tab cuando no hay `tab=` explícito: ahí hay que escribirlo, o tocar
    // "Resumen" no te saca de la vista implicada (y quedás sin poder volver sin soltar
    // el foco).
    const implied = u.searchParams.get('dia') || u.searchParams.get('tramo') || u.searchParams.get('hosp');
    if (id === 'resumen' && !implied) u.searchParams.delete('tab');
    else u.searchParams.set('tab', id);
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
