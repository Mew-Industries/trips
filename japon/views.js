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

import { buildItinerary, fmtRange, fmtDate, fmtDateLong, fmtWeekday, nightsWord, dayOf, timeOf, cmp } from './itinerary.js';

const TABS = [
  { id: 'resumen', label: 'Resumen', icon: '🗺️' },
  { id: 'hospedajes', label: 'Hospedajes', icon: '🛏️' },
  { id: 'transportes', label: 'Transportes', icon: '🚄' },
  { id: 'dias', label: 'Días', icon: '📅' }
];

// id de tab -> función que devuelve el HTML de la vista. "resumen" no está acá:
// su pane es el <main class="dashboard"> que ya existe en index.html.
const RENDER = {};

// El carrusel de fotos, la línea de horarios y la de links son los mismos que arma el
// resumen (`carouselHtml` / `hoursParts` / `lodgingLinks` en index.html): las dos vistas
// muestran el mismo hospedaje, así que el criterio de qué se dice —y qué no se repite—
// vive en un solo lado.

// Los nodos compartidos se marcan igual en las cuatro vistas: badge violeta con quién, y
// —donde el borde izquierdo está libre— el acento en la tarjeta. El dato es del nodo
// (`sharedWith`), no de la vista: acá sólo se lo lee.
const sharedTag = node => (node && node.sharedWith)
  ? '<span class="shared-tag">+ ' + node.sharedWith + '</span>' : '';
const sharedCls = node => (node && node.sharedWith) ? ' shared' : '';

// ------------------------------------------------------------- 2 · hospedajes
// Las 15 paradas donde se duerme, en orden. La que todavía no tiene reserva
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

    // Una sola zona de imagen (Martín, 26/8 ronda 2): la foto de arriba ES el carrusel,
    // con el resto de las fotos del alojamiento adentro. Tocarla abre el mismo lightbox
    // del resumen.
    const shots = (L.imgs && L.imgs.length) ? L.imgs : (L.img ? [L.img] : []);
    const galKey = 'hosp:' + node.id;
    if (ctx.galleries) ctx.galleries[galKey] = shots;
    // Ficha, Maps y —cuando lleva a otro lado— la reserva: una sola línea de links. Las
    // fechas ya están en la columna de la izquierda, así que no vuelven acá.
    const links = ctx.lodgingLinks(L, '');
    // El bloque de la reserva se pliega, igual que en el resumen: la tarjeta se lee de un
    // vistazo y el número para el mostrador está a un toque.
    const resv = ctx.resvHtml(L);

    // `data-hosp` es el id del nodo, el mismo con el que el mapa indexa su pin de cama:
    // es lo que hace que tocar uno lleve al otro, en los dos sentidos.
    return '<div class="v-card' + sharedCls(node) + '" data-hosp="' + node.id + '"><div class="lg-row">' + when +
      '<div class="lg-main">' +
        ctx.carouselHtml(shots, galKey, 'lg-shots') +
        '<div class="lg-body">' +
          '<div class="lg-name"><span class="dx">' + esc(L.name) + '</span><span class="dm">Reservado</span>' + sharedTag(node) + '</div>' +
          (L.type || L.guests ? '<div class="lg-sub">' + esc([L.type, L.guests].filter(Boolean).join(' · ')) + '</div>' : '') +
          (L.area ? '<div class="lg-area">' + esc(L.area) + '</div>' : '') +
          // Lo que hay que hacerle a la reserva (rebookear, ajustar fechas, ampliar a 4):
          // va arriba de los horarios, que son los de la reserva vieja.
          (L.pending ? '<div class="lg-warn">⚠ ' + esc(L.pending) + '</div>' : '') +
          '<div class="lg-hours">' + ctx.hoursParts(L).join(' · ') + '</div>' +
          (links.length ? '<div class="lg-links">' + links.join('') + '</div>' : '') +
          (resv ? '<details class="lodging-more"><summary>Reserva</summary>' + resv + '</details>' : '') +
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

// El "cómo llegar" de un salto: el link cargado en los datos o, si no hay, unas
// directions de Maps entre las dos puntas. La vista Transportes y el plan fijo del
// día muestran el MISMO tramo, así que el link se arma en un solo lado.
const legDirUrl = t => t.leg.dirUrl || ('https://www.google.com/maps/dir/?api=1&origin=' +
  encodeURIComponent(t.from) + '&destination=' + encodeURIComponent(t.to) + '&travelmode=transit');

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

    const dirUrl = legDirUrl(t);

    // Un salto es compartido cuando lo son sus dos puntas: el que llega a
    // Kioto no lo es, aunque los amigos aterricen ese mismo día.
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

const EV_LABEL = { vuelo: '✈️ vuelo', transporte: '🚄 viaje', 'check-in': '🛏️ check-in', 'check-out': '🧳 check-out', reserva: '🎫 actividad' };

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
function catListHtml(items, ctx, nodeId) {
  if (ctx.activityGroupsHtml) {
    const node = ctx.nodeById && ctx.nodeById[nodeId];
    return ctx.activityGroupsHtml(items, node);
  }
  const esc = ctx.escHtml;

  // Las actividades que nombran el hospedaje pierden ese nombre en discreto,
  // igual que en la tarjeta de la parada.
  const label = act => ctx.DX(esc(act.text), esc(ctx.maskLodging(act.text)));
  // Sin círculo de checklist: una sugerencia todavía no es un plan, así que no hay nada
  // que tachar (Martín, 18/9). El check vive en los ítems del itinerario — ver
  // `promotedRowsHtml` y el `reserva` de `planItemHtml`.
  const itemHtml = ({ key, act }) => act.coords
    ? '<li><button type="button" class="sg-item" data-act="' + key + '">' + label(act) + '</button></li>'
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
    key: ctx.activityId ? ctx.activityId(act, node) : node.id + ':' + i,
    node, act, ll: act.coords, cat: ctx.catOfAct(act), group: act.group || null,
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

  // La capa editable sólo referencia keys que todavía existen. Si una actividad fue
  // eliminada/renombrada en itinerary.js, queda ignorada sin ensuciar el render.
  const wanted = ctx.plan ? ctx.plan.promoted(day.date) : [];
  const promoted = new Set(wanted);
  byNode.forEach(pts => pts.forEach(p => { if (!p.anchor && promoted.has(p.key)) p.promoted = true; }));
  loose.forEach(p => { if (promoted.has(p.key)) p.promoted = true; });

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

  // El array del diff también conserva el orden elegido. Sólo mueve promociones;
  // las anclas mantienen entre sí la secuencia cronológica que trae day.events.
  const rank = new Map(wanted.map((key, i) => [key, i]));
  const slots = route.map((p, i) => p.promoted ? i : -1).filter(i => i >= 0);
  const chosen = slots.map(i => route[i]).sort((a, b) => rank.get(a.key) - rank.get(b.key));
  slots.forEach((slot, i) => { route[slot] = chosen[i]; });
  const lineSlots = line.map((p, i) => p.promoted ? i : -1).filter(i => i >= 0);
  lineSlots.forEach((slot, i) => { line[slot] = chosen[i]; });

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
  const sig = ctx.plan ? ctx.plan.promoted(day.date).join('\u0000') : '';
  const old = _routes.get(day);
  if (!old || old.sig !== sig) _routes.set(day, { sig, spec: dayRoute(day, ctx) });
  return _routes.get(day).spec;
}

// El mapa de la jornada muestra el plan confirmado: hospedajes, terminales y actividades
// con hora/reserva (`anchor`). Las sugerencias siguen en la lista, pero no dibujan ni
// marcadores ni línea. Mantener este filtro acá también evita renderizar un mapa vacío.
export const confirmedDayLine = spec => (spec.line || []).filter(p => p.bed || p.terminal || p.anchor || p.promoted);
const plannedSpec = spec => Object.assign({}, spec, { line: confirmedDayLine(spec) });
const dayHasMap = spec => confirmedDayLine(spec).length > 0 || (spec.stops || []).length > 0;

// El recorrido del día en la sidebar: los mismos puntos, en el mismo orden y con el
// mismo número que la línea del mapa. El número no depende del foco —está siempre—
// porque es lo que permite mirar el mapa y volver a encontrar el punto en la lista.
// El color y el ícono siguen siendo los de la categoría (data/categories.js), que es
// lo que ataba la lista con los pines cuando la lista se agrupaba por categoría.
//
// `cap` recorta la lista sin esconderla: lo que pasa del tope sale con la clase
// `over` y el botón de abajo la abre AHÍ MISMO (task 660). Un rótulo hereda el
// estado del primer ítem que cuelga de él, si no queda un título suelto arriba de
// nada. Sin `cap` la lista sale entera, que es como salía antes.
function routeListHtml(spec, ctx, day, cap) {
  const esc = ctx.escHtml;
  const lim = cap || Infinity;
  let k = 0;                              // índice global: recorrido + sueltas
  const over = () => (k >= lim ? ' over' : '');
  const shortOf = id => (day.here.find(h => h.node.id === id) || { node: {} }).node.short || '';
  // Las actividades que nombran el hospedaje pierden ese nombre en discreto,
  // igual que en la tarjeta de la parada.
  const label = act => ctx.DX(esc(act.text), esc(ctx.maskLodging(act.text)));
  const icon = p => '<span class="rt-ic">' + (ctx.CAT_META[p.cat] || ctx.CAT_META.otro).icon + '</span>';
  const color = p => (ctx.CAT_META[p.cat] || ctx.CAT_META.otro).color;
  // El botón vuela al punto en el mapa; el ↗ abre Maps. Son dos gestos distintos y
  // hacen falta los dos: parado en la calle lo que se quiere es la app de mapas, no
  // el mapa del site. La url sale del dato o, si no hay, de Maps por nombre — igual
  // que el popup del pin.
  const category = p => (ctx.CAT_META[p.cat] || ctx.CAT_META.otro).label;
  const routeNumber = p => spec.route.indexOf(p) + 1;

  // Los `group` de los datos ("Asakusa + Sumida River + Skytree" = una salida) siguen
  // apareciendo, pero como lo que son ahora: un tramo del recorrido. Si la geografía
  // parte una salida en dos, el rótulo aparece dos veces — que es la verdad.
  const available = spec.route.filter(p => !p.anchor && !p.promoted);
  const items = available.map(p => {
    const row = '<li class="rt-item plan-move' + over() + '" data-plan-key="' + p.key + '" data-plan-date="' + day.date + '" data-plan-name="' + esc(p.act.text) + '" data-plan-cat="' + esc(category(p)) + '" data-plan-icon="' + esc((ctx.CAT_META[p.cat] || ctx.CAT_META.otro).icon) + '" data-plan-number="' + routeNumber(p) + '" style="--c:' + color(p) + '">' +
      '<span class="pl-grip" aria-hidden="true">⠿</span><span class="sg-item">' + icon(p) + '<span class="sg-name">' + label(p.act) + '</span><span class="sg-kind">' + esc(category(p)) + '</span></span></li>';
    k++;
    return row;
  }).join('');

  // Sin coordenadas no hay lugar en la línea, pero la idea sigue siendo parte del día.
  const rest = spec.loose.filter(p => !p.promoted).map(p => {
    const row = '<li class="rt-item plain plan-move' + over() + '" data-plan-key="' + p.key + '" data-plan-date="' + day.date + '" data-plan-name="' + esc(p.act.text) + '" data-plan-cat="' + esc(category(p)) + '" data-plan-icon="' + esc((ctx.CAT_META[p.cat] || ctx.CAT_META.otro).icon) + '" style="--c:' + color(p) + '"><span class="pl-grip" aria-hidden="true">⠿</span><span class="sg-item">' + icon(p) + '<span class="sg-name">' + label(p.act) + '</span><span class="sg-kind">' + esc(category(p)) + '</span></span></li>';
    k++;
    return row;
  }).join('');

  return (items ? '<ol class="rt-list">' + items + '</ol>' : '') +
    (rest ? '<ul class="rt-list rt-rest">' + rest + '</ul>' : '');
}

const offScreen = (el) => {
  const r = el.getBoundingClientRect();
  return r.bottom < 0 || r.top > (window.innerHeight || document.documentElement.clientHeight);
};

// ---------------------------------------------- el itinerario FIJO de un día
// Lo confirmado de la jornada, en el orden que ya calcula itinerary.js: traslados,
// check-in/check-out y lo que tiene hora comprada. Acá no se decide nada nuevo —
// se le pega a cada evento la logística que YA está en los datos (modo, duración,
// terminales, ventana de check-in, número de reserva, link a Maps) en vez de
// dejarla repartida entre la vista Transportes y la de Hospedajes (task 660).
//
// La hora vale lo que dice el dato y nada más: los 7 saltos con `segments` (los
// vuelos) tienen horario real; los 11 terrestres tienen `time` —que es DURACIÓN,
// no hora de reloj— y no tienen salida. Esos salen con "a definir" y no con un
// guión, porque "todavía no está decidido" y "falta el dato por error" se leen
// distinto y acá la diferencia importa. **No se estima ningún horario.**

const modeOf = (ctx, leg) => ctx.MODE_STYLE[ctx.legType(leg)] || {};
const extLink = (href, label, ctx) =>
  '<a class="pl-a" href="' + ctx.escHtml(href) + '" target="_blank" rel="noopener">' + ctx.escHtml(label) + ' ↗</a>';

function planItemHtml(e, ctx) {
  const esc = ctx.escHtml;
  const meta = [], body = [], links = [];
  let check = null;                   // clave de checklist, sólo para lo que es actividad
  // El nombre del hospedaje es dato sensible: en modo discreto queda la ciudad.
  let title = e.lodging
    ? '<button type="button" class="dy-hosp" data-hosp-day="' + e.node.id + '">' +
        ctx.DX(esc(e.lodging.name), esc(e.node.short)) + '</button>'
    : esc(e.text);
  if (e.node && e.node.n) title = '<span class="pl-stop">' + esc(e.node.n) + '.</span> ' + title;

  if (e.kind === 'transporte') {
    const leg = e.transfer.leg, m = modeOf(ctx, leg);
    // El modo ya se lee en su emoji (🚄 / ✈️ / 🚌): pintarlo además de su color metía
    // un color de texto por cada medio de transporte en una card que ya tenía diez
    // (ronda 4). El color del modo sigue donde sirve: la línea del mapa y la ficha.
    meta.push('<span class="pl-mode">' + esc(leg.mode || '') + ' ' + esc(m.label || '') + '</span>');
    if (leg.time) meta.push('<span class="pl-dur">' + esc(leg.time) + '</span>');
    // Las puntas FÍSICAS del salto: la estación por la que se sale y por la que se
    // entra. Es la logística que se lee parado en el andén, no el nombre de la ciudad.
    const a = leg.fromTerminal && leg.fromTerminal.name, b = leg.toTerminal && leg.toTerminal.name;
    if (a || b) body.push('<div class="pl-term">' + esc(a || e.transfer.from) +
      '<span class="tr-arrow">→</span>' + esc(b || e.transfer.to) + '</div>');
    if (leg.detail) body.push('<div class="pl-d">' + esc(leg.detail) + '</div>');
    links.push(extLink(legDirUrl(e.transfer), leg.dirLabel ? String(leg.dirLabel).replace(/\s*↗\s*$/, '') : 'cómo llegar', ctx));
  } else if (e.kind === 'vuelo') {
    // Un vuelo entra por segmento y cada punta ya trae su hora real: acá va lo que
    // el segmento sabe de sí mismo (horarios, avión, tracker) y la terminal de esa punta.
    const s = e.seg || {}, leg = e.transfer.leg;
    if (s.when) meta.push('<span class="pl-dur">' + esc(s.when) + '</span>');
    if (s.aircraft) meta.push('<span class="pl-ac">' + esc(s.aircraft) + '</span>');
    const term = /^Sale/.test(e.text) ? leg.fromTerminal : leg.toTerminal;
    if (term && term.name) body.push('<div class="pl-term">' + esc(term.name) + '</div>');
    if (s.tracker) links.push(extLink(s.tracker, 'seguir el vuelo', ctx));
  } else if (e.kind === 'check-in' || e.kind === 'check-out') {
    const L = e.lodging;
    // Cada evento muestra sólo SU punta de la estadía. `hoursParts()` sigue siendo la
    // fuente única del texto, pero un check-in no adelanta el horario de salida ni un
    // check-out repite el de llegada. Si falta justo esa punta queda explícito y ámbar,
    // aunque la otra sí esté cargada.
    const label = e.kind === 'check-in' ? 'Check-in' : 'Check-out';
    const win = ctx.hoursParts(L).find(p => p.indexOf(label) !== -1) ||
      '<span class="lg-hh">Horario a definir</span>';
    body.push('<div class="pl-win dx' + (/\d/.test(win) ? '' : ' tbd') + '">' + win + '</div>');
    if (e.kind === 'check-in') {
      const limit = L.checkInTo ? '<b>' + esc(L.checkInTo) + '</b>' : '<b>pendiente de confirmar</b>';
      // El margen es la distancia entre la llegada y el límite, y puede dar NEGATIVO:
      // llegar 20:10 a un hospedaje que cierra el mostrador 20:00 es exactamente el
      // caso que hay que ver. Con la resta cruda eso salía "-1 h -50"; el signo lo dice
      // la frase, y el número siempre se muestra en positivo.
      const hm = t => t < 60 ? t + ' min' : Math.floor(t / 60) + ' h ' + String(t % 60).padStart(2, '0');
      const margin = e.checkInMargin == null ? ''
        : e.checkInMargin >= 0 ? ' · margen planificado <b>' + hm(e.checkInMargin) + '</b>'
        : ' · llegás <b>' + hm(-e.checkInMargin) + '</b> tarde';
      body.push('<div class="pl-d pl-limit">Límite de check-in: ' + limit + margin + '</div>');
    }
    if (L.area) body.push('<div class="pl-d dx">' + esc(L.area) + '</div>');
    const ref = L.booking && L.booking.ref;
    if (ref) body.push('<div class="pl-ref dx">reserva <b>' + esc(ref) + '</b></div>');
    ctx.lodgingLinks(L, 'pl-a').forEach(a => links.push('<span class="dx">' + a + '</span>'));
  } else if (e.kind === 'reserva') {
    const a = e.act || {};
    // Una reserva ES una actividad del día (Geibikei, teamLab): lleva el mismo círculo
    // de checklist que una actividad promovida, con la misma clave.
    if (ctx.activityId && e.node) check = ctx.activityId(a, e.node);
    if (e.departAt) body.push('<div class="pl-depart">Salir <b>' + esc(e.departAt) + '</b> · ' + esc(a.outboundLabel || 'traslado previo') + '</div>');
    const note = [a.booked, a.bestTime, a.openHours, a.note].filter(Boolean).join(' · ');
    if (note) body.push('<div class="pl-d">' + esc(note) + '</div>');
    if (a.coords) links.push('<button type="button" class="pl-a pl-map-local" data-day-map-act="' + esc(e.node.id + ':' + e.node.activities.indexOf(a)) + '">ver en el mapa</button>');
  }

  const anchored = !!e.time && (e.kind === 'reserva' || e.kind === 'check-in');
  return '<li class="pl-it pl-' + e.kind + (anchored ? ' pl-anchor' : '') + '"' + (anchored ? ' data-plan-anchor="true"' : '') + '>' +
    '<span class="pl-t' + (e.time ? '' : ' tbd') + '">' + (e.time || 'a definir') + '</span>' +
    '<div class="pl-b">' +
      '<div class="pl-top"><span class="pl-k">' + EV_LABEL[e.kind] + '</span>' + meta.join('') + '</div>' +
      '<div class="pl-mainrow"' + (check ? ' data-check="' + esc(check) + '"' : '') + '><div class="pl-w">' + title + '</div></div>' +
      body.join('') +
      (links.length ? '<div class="pl-lk">' + links.join('') + '</div>' : '') +
    '</div>' +
  '</li>';
}

// El orden en que se LEE el día. `itinerary.js` ordena poniendo primero lo que tiene
// hora, y en una jornada de traslado eso deja el check-in de las 16:00 arriba de los
// dos buses que hay que tomar para llegar. Acá se reordena por lo único que se puede
// afirmar sin inventar un horario: **se hace el check-out antes de viajar y el
// check-in después de llegar**. Un tramo sin hora toma como piso la del check-out del
// día (o el arranque del día, si tampoco la tiene) — la hora que se MUESTRA no cambia:
// sigue diciendo "a definir".
const PHASE = { 'check-out': 0, transporte: 1, vuelo: 1, 'check-in': 2, reserva: 3 };
function readOrder(day) {
  const out = day.events.find(e => e.kind === 'check-out');
  const floor = (out && out.time) || '00:00';
  // Los vuelos ya vienen en su secuencia real (`ord`) y cada punta está en hora LOCAL:
  // ordenarlos por reloj miente (un tramo transpacífico sale a las 17:45 y aterriza a
  // las 14:40 del mismo día — ver `segEvents` en itinerary.js). Se les fija la clave en
  // no-decreciente para que la secuencia sobreviva a cualquier orden.
  let flight = null;
  const rows = day.events.map((e, i) => {
    let k = e.time || (e.kind === 'check-out' ? '00:00' : e.kind === 'check-in' ? '23:59' : floor);
    if (e.ord != null) { if (flight && k < flight) k = flight; flight = k; }
    return { e, i, k };
  });
  return rows
    .sort((a, b) => cmp(a.k, b.k) || PHASE[a.e.kind] - PHASE[b.e.kind] || a.i - b.i)
    .map(r => r.e);
}

const fixedPlanHtml = (day, ctx) => readOrder(day).map(e => planItemHtml(e, ctx)).join('');

function promotedRowsHtml(day, ctx, spec) {
  const esc = ctx.escHtml;
  const rank = new Map(ctx.plan.promoted(day.date).map((key, i) => [key, i]));
  const all = spec.route.concat(spec.loose).filter(p => p.promoted)
    .sort((a, b) => rank.get(a.key) - rank.get(b.key));
  return all.map(p => {
    const meta = ctx.CAT_META[p.cat] || ctx.CAT_META.otro;
    const number = spec.route.indexOf(p) + 1;
    return '<li class="pl-it pl-promoted plan-move" data-plan-key="' + p.key + '" data-plan-date="' + day.date + '" data-plan-name="' + esc(p.act.text) + '" data-plan-cat="' + esc(meta.label) + '" data-plan-icon="' + esc(meta.icon) + '" data-plan-number="' + (number > 0 ? number : '') + '">' +
      '<span class="pl-t">' + (number > 0 ? number + '.' : '•') + '</span><div class="pl-b"><div class="pl-top"><span class="pl-grip" aria-hidden="true">⠿</span><span class="pl-k">' + meta.icon + ' ' + esc(meta.label) + '</span></div>' +
      '<div class="pl-mainrow" data-check="' + esc(p.key) + '"><span class="pl-w">' + esc(p.act.text) + '</span><button type="button" class="pl-toggle remove" data-plan-remove="' + p.key + '" data-plan-date="' + day.date + '" aria-label="Quitar del itinerario">−</button></div></div></li>';
  }).join('');
}

function unifiedPlanHtml(day, ctx, spec) {
  const rows = fixedPlanHtml(day, ctx) + (ctx.plan && ctx.plan.canEdit() ? promotedRowsHtml(day, ctx, spec) : '');
  return rows ? '<ol class="pl-list pl-drop" data-plan-drop="' + day.date + '" aria-label="Itinerario ordenable">' + rows + '</ol>' : '';
}

// Dónde estás ese día y dónde dormís: las dos líneas de cabecera, compartidas por
// la tarjeta de la tab y la vista de día.
function whereHtml(day, ctx) {
  const esc = ctx.escHtml;
  return day.here.length
    ? day.here.map(h => '<button type="button" class="v-goto" data-goto="' + h.node.id + '">' + esc(h.node.short) +
        '</button><span class="dy-role' + (h.role === 'de paso' ? ' paso' : '') + '">' + h.role + '</span>' +
        sharedTag(h.node)).join('<span class="tr-arrow">→</span>')
    : (day.inFlight ? '✈️ En vuelo' : 'Fin del viaje');
}

function sleepHtml(day, ctx) {
  const esc = ctx.escHtml;
  return day.sleep && day.sleep.lodging
    ? '<button type="button" class="dy-sleep dy-hosp dx" data-hosp-day="' + day.sleep.id + '">Dormís en <b>' + esc(day.sleep.lodging.name) + '</b></button><div class="dy-sleep dm">Dormís en <b>' + esc(day.sleep.short) + '</b></div>'
    : day.sleep ? '<div class="dy-sleep">Dormís en <b>' + esc(day.sleep.short) + '</b> · sin reservar</div>'
    : day.inFlight ? '<div class="dy-sleep">Noche a bordo</div>' : '';
}

// El catálogo COMPLETO de la ciudad, plegado: el reparto por peso le da 2-3 cosas al
// día y una ciudad tiene cuarenta. El cuerpo se arma recién al abrirlo (ver mountViews).
function cityCatalogHtml(day, ctx) {
  const esc = ctx.escHtml, seen = new Set();
  return day.here.map(h => h.node)
    .filter(n => !seen.has(ctx.cityLabel(n)) && seen.add(ctx.cityLabel(n)))
    .filter(n => ctx.cityActivities(n).length).map(n =>
      '<details class="sg-all"><summary>todo lo de ' + esc(ctx.cityLabel(n)) +
        ' <b>' + ctx.cityActivities(n).length + '</b></summary>' +
        '<div class="sg-all-body" data-node="' + n.id + '"></div>' +
      '</details>').join('');
}

// Las sugerencias del día, COMO LISTA (Martín, 17/9: «hoy están colapsadas detrás de
// "todo lo de Kioto · 45" y eso las vuelve invisibles»). Lo que pasa del tope se abre
// acá mismo con el botón, sin mandar a otra pantalla; el catálogo entero de la ciudad
// sigue plegado abajo, que es otra cosa: no es lo que toca hoy.
function sugSectionHtml(day, ctx, cap) {
  const spec = routeOf(day, ctx);
  const total = spec.route.filter(p => !p.anchor && !p.promoted).length + spec.loose.filter(p => !p.promoted).length;
  const list = routeListHtml(spec, ctx, day, cap);
  const all = cityCatalogHtml(day, ctx);
  if (!list && !all) return '';
  const more = (cap && total > cap)
    ? '<button type="button" class="sg-more" data-shown="' + cap + '" data-total="' + total + '">ver las ' + total + '</button>' : '';
  return '<div class="dy-sug">' +
    '<div class="sg-title">Sugerencias' + (total ? ' <span>' + total + '</span>' : '') + '</div>' +
    (list ? '<div class="sg-wrap">' + list + '</div>' + more : '') + all +
  '</div>';
}

// ------------------------------------------------------ vista de día (task 660)
// La misma jornada a pantalla completa, con URL propia (`?jornada=<fecha>`), para
// abrirla parado en una estación o mandársela a alguien. Usa exactamente los mismos
// bloques que la tarjeta de la tab: si cambia uno, cambian los dos.

// Título y descripción de un día — los usa el `<title>`/Open Graph de la app y también
// el generador de las páginas estáticas de `dia/` (scripts/build_dias.js), así que es
// una función PURA: sin ctx, sin DOM.
export function dayMeta(day) {
  const cities = day.here.map(h => h.node.short);
  // Un día en el aire no toca ningún nodo, pero sí tiene una ruta: en el preview de
  // WhatsApp "Buenos Aires (EZE) → Tokio" dice bastante más que "noche a bordo". El
  // último día del viaje no tiene siquiera `inFlight` (el vuelo salió ayer): ahí la
  // ruta la da el propio aterrizaje.
  const land = !cities.length && !day.inFlight && day.events.find(e => e.transfer);
  const where = cities.length ? cities.join(' → ')
    : day.inFlight ? day.inFlight.from + ' → ' + day.inFlight.to
    : land ? 'Llegada a ' + land.transfer.to
    : 'Fin del viaje';
  const fijos = day.events.length;
  const sug = day.suggestions.reduce((a, s) => a + s.clusters.reduce((b, c) => b + c.items.length, 0), 0);
  const bits = [];
  if (fijos) bits.push(fijos === 1 ? '1 cosa fija' : fijos + ' cosas fijas');
  if (sug) bits.push(sug === 1 ? '1 sugerencia' : sug + ' sugerencias');
  // Sin el nombre del viaje: lo pone quien usa esto (el `<title>` de la app lo saca del
  // suyo, las páginas de `dia/` lo escriben). La app compartida se sirve del MISMO
  // views.js y no puede nombrar el viaje entero (ver scripts/build_compartido.js).
  return {
    date: day.date,
    city: where,
    title: 'Día ' + day.n + ' · ' + fmtDateLong(day.date) + ' · ' + where,
    desc: where + (bits.length ? ' — ' + bits.join(' · ') : ' — sin nada agendado') + '.'
  };
}

function dayViewHtml(day, it, ctx) {
  const esc = ctx.escHtml;
  const i = it.days.indexOf(day);
  const prev = it.days[i - 1], next = it.days[i + 1];
  // En los bordes del viaje el botón queda deshabilitado, no envuelve: el 6/10 no
  // tiene día anterior y el 18/11 no tiene siguiente.
  const nav = (d, cls, glyph, lbl) => '<button type="button" class="dv-nav ' + cls + '"' +
    (d ? ' data-jornada="' + d.date + '" title="' + esc(fmtDateLong(d.date)) + '"' : ' disabled') +
    ' aria-label="' + lbl + '">' + glyph + '</button>';
  const spec = routeOf(day, ctx);
  const plan = unifiedPlanHtml(day, ctx, spec);
  const hasMap = dayHasMap(spec);

  return '<div class="dv-bar">' +
      '<button type="button" class="dv-close" aria-label="Volver a Días">‹ Días</button>' +
      '<div class="dv-nav-group">' +
        nav(prev, 'prev', '‹', 'Día anterior') +
        '<span class="dv-count">' + day.n + ' / ' + it.days.length + '</span>' +
        nav(next, 'next', '›', 'Día siguiente') +
      '</div>' +
    '</div>' +
    '<div class="dv-body' + (day.inFlight ? ' dy-flight' : '') + '">' +
      '<div class="dv-head">' +
        '<div class="dv-num">DÍA ' + day.n + '</div>' +
        '<h2 class="dv-date">' + esc(fmtDateLong(day.date)) + '</h2>' +
        '<div class="dy-where">' + whereHtml(day, ctx) + '</div>' +
        sleepHtml(day, ctx) +
        '<div class="dv-acts">' +
          (dayHasMap(spec) ? '<button type="button" class="dy-map dv-map" data-day="' + day.date + '">ver en mapa</button>' : '') +
          '<button type="button" class="dv-share" data-share="' + day.date + '">compartir</button>' +
        '</div>' +
      '</div>' +
      (hasMap ? '<div class="sm-map dv-day-map" data-day-map aria-label="Mapa del recorrido del día"></div>' : '') +
      (plan ? '<section class="dv-sec dv-fijo"><div class="sg-title">Itinerario</div>' + plan + '</section>' : '') +
      '<section class="dv-sec dv-sug">' + (sugSectionHtml(day, ctx) || '<div class="dy-free">Sin sugerencias para este día.</div>') + '</section>' +
      (plan ? '' : '<div class="dy-free">Nada confirmado todavía para este día.</div>') +
    '</div>';
}

// Cuántas sugerencias muestra la TARJETA antes del "ver las N". Seis entran sin que la
// fila del día deje de leerse de un vistazo; la vista de día no tiene tope, que es
// justamente para lo que se abre.
const CARD_SUG_CAP = 6;

RENDER.dias = (it, ctx) => {
  const rows = it.days.map(day => {
    const spec = routeOf(day, ctx);
    const plan = unifiedPlanHtml(day, ctx, spec);
    const sug = sugSectionHtml(day, ctx, CARD_SUG_CAP);

    // El botón lleva el mapa a esa jornada (foco de día, task 508). No abre nada en el
    // sidebar: la lista ya está acá, lo que cambia es lo que se ve al lado.
    const mapBtn = dayHasMap(spec)
      ? '<button type="button" class="dy-map" data-day="' + day.date + '">ver en mapa</button>' : '';

    return '<div class="v-card dy-card' + (day.inFlight ? ' dy-flight' : '') + '" data-jornada-card="' + day.date + '"><div class="dy-row">' +
      '<div class="dy-when">' +
        '<button type="button" class="dy-day-link" data-jornada="' + day.date + '" aria-label="Abrir día ' + day.n + ', ' + fmtDateLong(day.date) + '">' +
          '<span class="dy-num">DÍA ' + day.n + '</span>' +
          '<span class="dy-date">' + fmtDate(day.date) + '</span>' +
          '<span class="dy-wd">' + fmtWeekday(day.date) + '</span>' +
        '</button>' +
        mapBtn +
      '</div>' +
      '<div class="dy-main">' +
        '<div class="dy-where">' + whereHtml(day, ctx) + '</div>' + sleepHtml(day, ctx) +
        (plan ? '<div class="dy-ev"><div class="sg-title">Itinerario</div>' + plan + '</div>' : '') +
        (sug || plan ? sug : '<div class="dy-free">Sin nada agendado.</div>') +
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
  const wired = {};

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
  // corresponde. `?jornada=` no entra acá: no es una tab, es la vista de día por
  // encima de todo — pero deja Días abajo, que es de donde sale y adonde vuelve.
  function current() {
    const s = new URLSearchParams(location.search);
    if (panes[s.get('tab')]) return s.get('tab');
    if (s.get('dia') && panes.dias) return 'dias';
    if (dayByDate[s.get('jornada')] && panes.dias) return 'dias';
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
      // Los listeners van UNA sola vez por pane: el pane sobrevive al re-render (sólo se
      // reemplaza su contenido), así que volver a colgarlos —cuando el plan llega tarde y
      // hay que repintar— duplicaría cada click.
      if (!wired[id]) {
        if (ctx.wire) ctx.wire(panes[id]);
        panes[id].addEventListener('click', (e) => {
          const s = e.target.closest('.sg-all > summary');
          if (s) fillCatalog(s.parentNode.querySelector('.sg-all-body'));
        });
        wired[id] = true;
      } else if (ctx.wireChecks) ctx.wireChecks(panes[id]);
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
      if (date) ctx.focusDay(plannedSpec(routeOf(dayByDate[date], ctx)));
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

  // --------------------------------------------------- vista de día (task 660)
  // La jornada a pantalla completa, con URL propia. Vive en una capa por ENCIMA de
  // todo (header, mapa, tabs) y no reemplaza nada: cerrarla devuelve el site tal
  // como estaba, con la tab Días abajo. El estado es `?jornada=<fecha>`, del mismo
  // modo que `?dia=`/`?tramo=`/`?hosp=`: link compartible y "atrás" la cierra.
  const dayView = document.createElement('section');
  dayView.className = 'day-view';
  dayView.id = 'day-view';
  dayView.hidden = true;
  dayView.setAttribute('aria-label', 'Vista del día');
  document.body.appendChild(dayView);

  // El `<title>` y los Open Graph del site, para poder devolverlos al cerrar.
  const metaTag = (prop) => {
    const attr = prop.indexOf('og:') === 0 ? 'property' : 'name';
    let el = document.head.querySelector('meta[' + attr + '="' + prop + '"]');
    if (!el) { el = document.createElement('meta'); el.setAttribute(attr, prop); document.head.appendChild(el); }
    return el;
  };
  const META_KEYS = ['og:title', 'og:description', 'og:url', 'twitter:title', 'twitter:description'];
  const BASE_TITLE = document.title;
  const BASE_META = {};
  META_KEYS.forEach(k => { BASE_META[k] = metaTag(k).getAttribute('content') || ''; });
  const canonicalEl = (() => {
    let el = document.head.querySelector('link[rel="canonical"]');
    if (!el) { el = document.createElement('link'); el.rel = 'canonical'; document.head.appendChild(el); }
    return el;
  })();
  const BASE_CANONICAL = canonicalEl.getAttribute('href') || location.href.split('?')[0].split('#')[0];

  const appUrl = date => {
    const u = new URL(location.href);
    u.hash = '';
    u.searchParams.set('tab', 'dias');
    u.searchParams.set('jornada', date);
    return u.href;
  };
  // El nombre del viaje sale del `<title>` que ya tiene la página, no de una constante:
  // la app compartida se sirve del MISMO views.js con otro título y no puede nombrar el
  // viaje entero (ver scripts/build_compartido.js).
  const TRIP = BASE_TITLE.split('·')[0].trim() || BASE_TITLE;

  function setMeta(day) {
    if (!day) {
      document.title = BASE_TITLE;
      META_KEYS.forEach(k => metaTag(k).setAttribute('content', BASE_META[k]));
      canonicalEl.setAttribute('href', BASE_CANONICAL);
      return;
    }
    const m = dayMeta(day);
    document.title = m.title + ' · ' + TRIP;
    metaTag('og:title').setAttribute('content', m.title);
    metaTag('twitter:title').setAttribute('content', m.title);
    metaTag('og:description').setAttribute('content', m.desc);
    metaTag('twitter:description').setAttribute('content', m.desc);
    metaTag('og:url').setAttribute('content', appUrl(day.date));
    canonicalEl.setAttribute('href', appUrl(day.date));
  }

  // Una fecha que no es del viaje se ignora, igual que un `?tab=` desconocido: mejor
  // la vista de siempre que una pantalla vacía.
  function currentJornada() {
    const d = new URLSearchParams(location.search).get('jornada');
    return dayByDate[d] ? d : null;
  }

  let shownJornada = null;

  function showJornada(date) {
    if (date === shownJornada) return;
    dayView.innerHTML = '';
    if (date) {
      // El cuerpo se re-arma en un hijo NUEVO en cada jornada porque `ctx.wire()` le
      // cuelga su listener al elemento que recibe: sobre el mismo nodo se irían
      // apilando uno por día visitado. El listener de esta capa, en cambio, va una
      // sola vez sobre `dayView`, que no se reemplaza nunca.
      const inner = document.createElement('div');
      inner.className = 'dv-inner';
      inner.innerHTML = dayViewHtml(dayByDate[date], it, ctx);
      dayView.appendChild(inner);
      dayView.hidden = false;
      dayView.scrollTop = 0;
      if (ctx.wire) ctx.wire(inner);
      if (ctx.renderDayMap) ctx.renderDayMap(inner.querySelector('[data-day-map]'), routeOf(dayByDate[date], ctx));
    } else {
      if (ctx.renderDayMap) ctx.renderDayMap(null, null);
      dayView.hidden = true;
    }
    document.body.classList.toggle('day-open', !!date);
    setMeta(date ? dayByDate[date] : null);
    shownJornada = date;
  }

  // Abrir o cerrar la vista de día. Cerrar deja la tab Días puesta: se vuelve a la
  // lista de donde salió el link, no al resumen.
  function goJornada(date) {
    const u = new URL(location.href);
    u.hash = '';
    if (date) { u.searchParams.set('tab', 'dias'); u.searchParams.set('jornada', date); }
    else u.searchParams.delete('jornada');
    if (u.href === location.href) return;
    history.pushState(null, '', u);
    apply();
  }

  // `#/dia/<fecha>` es la forma que se escribe a mano o que quedó en un link viejo:
  // se normaliza a la canónica (`?jornada=`) sin dejar entrada en el histórico, así
  // el resto del ruteo no tiene que conocer dos formatos.
  function absorbHash() {
    const m = /^#\/dia\/(\d{4}-\d{2}-\d{2})$/.exec(location.hash || '');
    if (!m || !dayByDate[m[1]]) return;
    const u = new URL(location.href);
    u.hash = '';
    u.searchParams.set('tab', 'dias');
    u.searchParams.set('jornada', m[1]);
    history.replaceState(null, '', u);
  }

  // "Ver las N" abre el resto de las sugerencias ACÁ MISMO — no manda a otra pantalla
  // ni pliega lo que ya se estaba leyendo.
  function toggleSug(btn) {
    const wrap = btn.previousElementSibling;
    if (!wrap || !wrap.classList.contains('sg-wrap')) return;
    const open = wrap.classList.toggle('open');
    btn.textContent = open ? 'ver menos' : 'ver las ' + btn.dataset.total;
  }

  dayView.addEventListener('click', (e) => {
    if (e.target.closest('a')) return;                   // Maps, la ficha del alojamiento: suyos
    const localMap = e.target.closest('[data-day-map-act]');
    if (localMap) { if (ctx.focusDayAct) ctx.focusDayAct(localMap.dataset.dayMapAct); return; }
    const sum = e.target.closest('.sg-all > summary');
    if (sum) { fillCatalog(sum.parentNode.querySelector('.sg-all-body')); return; }
    const more = e.target.closest('.sg-more');
    if (more) { toggleSug(more); return; }
    if (e.target.closest('.dv-close')) { goJornada(null); return; }
    const nav = e.target.closest('[data-jornada]');
    if (nav) { goJornada(nav.dataset.jornada); return; }
    const share = e.target.closest('.dv-share');
    if (share) { shareDay(share.dataset.share, share); return; }
    // Las salidas hacia el resto del site: el mapa, la ficha del hospedaje, el punto de
    // una actividad y la parada viven ABAJO de esta capa, así que abrirlos la cierran.
    // El foco en sí lo hace `ctx.wire()`, que ya corrió sobre el cuerpo de adentro:
    // acá sólo se cierra, o se harían dos veces las mismas cosas.
    const map = e.target.closest('.dy-map');
    if (map) { goDay(map.dataset.day); return; }
    const hosp = e.target.closest('[data-hosp-day]');
    if (hosp) { goHosp(hosp.dataset.hospDay); return; }
    if (e.target.closest('[data-act], [data-goto]')) goJornada(null);
  });

  // Compartir: `navigator.share` donde existe (el teléfono, que es donde se comparte)
  // y el portapapeles como plan B. Va la url ESTÁTICA, que es la que trae preview.
  // El aviso va en el propio botón: el toast del site vive dentro del mapa, que acá
  // está tapado por esta capa.
  // Lo que se comparte NO es la url de la app: el preview de WhatsApp/Telegram lo arma
  // un crawler que no ejecuta JavaScript, así que un `?jornada=` le muestra siempre la
  // tarjeta del site entero. `dia/<fecha>.html` es una página estática con los meta de
  // ESE día que redirige a la app (ver scripts/build_dias.js). Se comprueba que exista
  // en vez de darla por hecha: la app compartida se sirve un nivel más abajo y no las
  // tiene — ahí se manda el link de la app, que anda igual aunque no traiga preview.
  async function shareTarget(date) {
    try {
      const u = new URL('dia/' + date + '.html', location.href.split('?')[0].split('#')[0]).href;
      const r = await fetch(u, { method: 'HEAD' });
      if (r.ok) return u;
    } catch (err) { /* sin red o fuera de http: queda la url de la app */ }
    return appUrl(date);
  }

  async function shareDay(date, btn) {
    const day = dayByDate[date];
    if (!day) return;
    const m = dayMeta(day), url = await shareTarget(date);
    const say = (txt) => {
      if (!btn) return;
      btn.textContent = txt;
      clearTimeout(btn._t);
      btn._t = setTimeout(() => { btn.textContent = 'compartir'; }, 2200);
    };
    try {
      if (navigator.share) { await navigator.share({ title: m.title, text: m.desc, url }); return; }
      await navigator.clipboard.writeText(url);
      say('link copiado ✓');
    } catch (err) {
      if (err && err.name === 'AbortError') return;       // lo canceló el usuario
      say('no se pudo copiar');
    }
  }

  // Esc cierra la vista, como el lightbox de fotos.
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && currentJornada()) goJornada(null);
  });

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
    u.searchParams.delete('jornada');   // la ficha vive en otra tab: se sale de la vista de día
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
    u.searchParams.delete('jornada');   // la ficha vive en otra tab: se sale de la vista de día
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
    showJornada(currentJornada());
  }

  // -------------------------------------------------- edición del plan diario
  // El servidor guarda sólo keys de sugerencias. El cliente aplica el cambio primero
  // para que lista y mapa respondan al soltar; si la red falla, `client.save` revierte.
  async function changePlan(date, mutate) {
    if (!ctx.plan || !ctx.plan.canEdit() || !dayByDate[date]) return;
    const next = [...ctx.plan.promoted(date)];
    mutate(next);
    try { await ctx.plan.save(date, next); }
    catch (err) { window.alert(err.message || 'No se pudo guardar el plan.'); }
  }

  function planClick(e) {
    const b = e.target.closest('[data-plan-add],[data-plan-remove]');
    if (!b) return false;
    e.preventDefault(); e.stopPropagation();
    const date = b.dataset.planDate;
    if (b.dataset.planAdd) changePlan(date, a => { if (!a.includes(b.dataset.planAdd)) a.push(b.dataset.planAdd); });
    if (b.dataset.planRemove) changePlan(date, a => { const i = a.indexOf(b.dataset.planRemove); if (i >= 0) a.splice(i, 1); });
    return true;
  }
  document.addEventListener('click', planClick, true);

  const make = (tag, cls, text) => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text != null) el.textContent = text;
    return el;
  };
  function asPromoted(row) {
    if (row.classList.contains('pl-promoted')) return;
    row.className = 'pl-it pl-promoted plan-move';
    const number = row.dataset.planNumber;
    const time = make('span', 'pl-t', number ? number + '.' : '•');
    const body = make('div', 'pl-b');
    const top = make('div', 'pl-top');
    const grip = make('span', 'pl-grip', '⠿'); grip.setAttribute('aria-hidden', 'true');
    const kind = make('span', 'pl-k', (row.dataset.planIcon ? row.dataset.planIcon + ' ' : '') + (row.dataset.planCat || 'actividad'));
    top.append(grip, kind);
    const main = make('div', 'pl-mainrow');
    // Promover es lo que le da sentido al check: la actividad pasa a ser plan del día.
    // `wireChecks` le cuelga el círculo con el estado que ya tenga esa clave.
    main.dataset.check = row.dataset.planKey;
    const name = make('span', 'pl-w', row.dataset.planName || '');
    const remove = make('button', 'pl-toggle remove', '−');
    remove.type = 'button'; remove.dataset.planRemove = row.dataset.planKey;
    remove.dataset.planDate = row.dataset.planDate; remove.setAttribute('aria-label', 'Quitar del itinerario');
    main.append(name, remove); body.append(top, main); row.replaceChildren(time, body);
    if (ctx.wireChecks) ctx.wireChecks(row);
  }
  function asSuggestion(row) {
    if (row.classList.contains('rt-item')) return;
    row.className = 'rt-item plan-move';
    const grip = make('span', 'pl-grip', '⠿'); grip.setAttribute('aria-hidden', 'true');
    const item = make('span', 'sg-item');
    item.append(make('span', 'rt-ic', row.dataset.planIcon || ''), make('span', 'sg-name', row.dataset.planName || ''), make('span', 'sg-kind', row.dataset.planCat || ''));
    row.replaceChildren(grip, item);
  }
  function suggestionList(scope) {
    let list = scope.querySelector('.sg-wrap .rt-list');
    if (list) return list;
    const wrap = scope.querySelector('.sg-wrap');
    if (!wrap) return null;
    list = make('ol', 'rt-list'); wrap.appendChild(list); return list;
  }
  function promotedList(drop) {
    return drop;
  }
  function syncPlanDom(date) {
    if (!date) {
      document.querySelectorAll('[data-plan-drop]').forEach(d => syncPlanDom(d.dataset.planDrop));
      return;
    }
    const wanted = ctx.plan.promoted(date);
    document.querySelectorAll('[data-plan-drop="' + CSS.escape(date) + '"]').forEach(drop => {
      const scope = drop.closest('[data-jornada-card], .dv-inner') || drop.parentElement;
      const list = promotedList(drop);
      wanted.forEach(key => {
        const row = scope.querySelector('[data-plan-key="' + CSS.escape(key) + '"]');
        if (!row) return;
        // El drop local ya dejó el nodo en su posición definitiva. `save()` emite
        // enseguida: volver a appendearlo acá producía el salto/titileo y una mutación
        // adicional mientras el puntero todavía estaba bajando.
        if (row.parentNode === list && row.classList.contains('pl-promoted')) return;
        asPromoted(row); list.appendChild(row);
      });
      [...list.querySelectorAll(':scope > .pl-promoted')].forEach(row => {
        if (wanted.includes(row.dataset.planKey)) return;
        asSuggestion(row); const target = suggestionList(scope); if (target) target.appendChild(row);
      });
      if (!list.children.length) {
        const section = drop.parentElement;
        drop.remove();
        if (section && section.dataset.dragPlanShell === 'true') section.remove();
      }
    });
  }

  const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  function dragScope(row) { return row.closest('[data-jornada-card], .dv-inner') || row.parentElement; }
  function ensureDrop(row) {
    const scope = dragScope(row), date = row.dataset.planDate;
    let drop = scope.querySelector('[data-plan-drop="' + CSS.escape(date) + '"]');
    if (drop) return drop;
    drop = make('ol', 'pl-list pl-drop is-drag-reveal');
    drop.dataset.planDrop = date; drop.tabIndex = 0; drop.setAttribute('aria-label', 'Itinerario editable');
    const fixed = scope.querySelector('.dv-fijo, .dy-ev');
    if (fixed) fixed.appendChild(drop);
    else {
      const sug = scope.querySelector('.dv-sug, .dy-sug');
      const section = make(scope.classList.contains('dv-inner') ? 'section' : 'div', scope.classList.contains('dv-inner') ? 'dv-sec dv-fijo' : 'dy-ev');
      section.dataset.dragPlanShell = 'true';
      section.innerHTML = '<div class="sg-title">Itinerario</div>';
      section.appendChild(drop); (sug || scope.lastElementChild).before(section);
    }
    requestAnimationFrame(() => drop.classList.add('is-visible'));
    return drop;
  }
  function clearPreview(d) {
    d.row.classList.remove('is-dragging'); d.row.style.transform = ''; d.row.style.width = '';
    (d.list ? [...d.list.children] : []).forEach(el => { if (el !== d.row) el.style.transform = ''; });
    document.body.classList.remove('plan-dragging');
  }
  function previewGap(d, target, y) {
    const drop = target && target.closest('[data-plan-drop="' + CSS.escape(d.date) + '"]');
    if (!drop) { d.drop = null; d.index = null; return; }
    const list = promotedList(drop), rows = [...list.children].filter(el => el !== d.row);
    let index = rows.findIndex(el => y < el.getBoundingClientRect().top + el.offsetHeight / 2);
    if (index < 0) index = rows.length;
    // Las reservas y los check-ins con hora son anclas: el hueco puede abrirse a
    // cualquiera de sus lados, pero el drag nunca altera su orden relativo.
    d.drop = drop; d.list = list; d.index = index;
    if (reducedMotion()) return;
    const h = d.rect.height + 5;
    rows.forEach((el, i) => {
      let dy = i >= index ? h : 0;
      if (d.promoted && el.parentNode === d.originList) {
        const old = d.originRows.indexOf(el), from = d.originIndex;
        if (old > from) dy -= h;
      }
      el.style.transform = dy ? 'translateY(' + dy + 'px)' : '';
    });
  }

  let drag = null;
  document.addEventListener('pointerdown', e => {
    if (e.button != null && e.button !== 0) return;
    const row = e.target.closest('.plan-move');
    if (!row || e.target.closest('button,a') || (e.pointerType === 'touch' && !e.target.closest('.pl-grip'))) return;
    const rect = row.getBoundingClientRect(), originList = row.closest('[data-plan-drop]');
    drag = { id: e.pointerId, row, key: row.dataset.planKey, date: row.dataset.planDate,
      promoted: row.classList.contains('pl-promoted'), x: e.clientX, y: e.clientY,
      rect, originList, originRows: originList ? [...originList.children] : [],
      originIndex: originList ? [...originList.children].indexOf(row) : -1, moved: false };
    if (row.setPointerCapture) row.setPointerCapture(e.pointerId);
  });
  document.addEventListener('pointermove', e => {
    if (!drag || drag.id !== e.pointerId) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 9) {
      drag.moved = true; drag.row.classList.add('is-dragging'); drag.row.style.width = drag.rect.width + 'px';
      document.body.classList.add('plan-dragging'); ensureDrop(drag.row);
    }
    if (drag.moved) {
      e.preventDefault();
      drag.row.style.pointerEvents = 'none';
      const target = document.elementFromPoint(e.clientX, e.clientY);
      drag.row.style.pointerEvents = '';
      previewGap(drag, target, e.clientY);
      drag.row.style.transform = 'translate3d(' + (e.clientX - drag.x) + 'px,' + (e.clientY - drag.y) + 'px,0)';
      const scroller = drag.row.closest('.day-view') || drag.row.closest('.view-pane');
      if (scroller) {
        if (e.clientY < 90) scroller.scrollBy(0, -22);
        else if (e.clientY > window.innerHeight - 90) scroller.scrollBy(0, 22);
      }
    }
  }, { passive: false });
  document.addEventListener('pointerup', e => {
    if (!drag || drag.id !== e.pointerId) return;
    const d = drag; drag = null;
    if (!d.moved) return;
    d.row.style.pointerEvents = 'none';
    const target = document.elementFromPoint(e.clientX, e.clientY);
    d.row.style.pointerEvents = '';
    const zone = target && target.closest('[data-plan-drop="' + CSS.escape(d.date) + '"]');
    clearPreview(d);
    if (zone && d.drop === zone) {
      const list = promotedList(zone), rows = [...list.children].filter(el => el !== d.row);
      list.insertBefore(d.row, rows[d.index] || null); asPromoted(d.row);
      changePlan(d.date, a => { a.splice(0, a.length, ...[...list.children].filter(row => row.dataset.planKey).map(row => row.dataset.planKey)); });
    } else if (d.promoted) changePlan(d.date, a => { const i = a.indexOf(d.key); if (i >= 0) a.splice(i, 1); });
    else syncPlanDom(d.date);
  });
  document.addEventListener('pointercancel', e => {
    if (!drag || drag.id !== e.pointerId) return;
    const d = drag; drag = null; clearPreview(d); syncPlanDom(d.date);
  });

  function go(id) {
    const u = new URL(location.href);
    // El resumen no lleva parámetro… salvo que haya un `?dia=`/`?tramo=`/`?hosp=`, que
    // valen por su tab cuando no hay `tab=` explícito: ahí hay que escribirlo, o tocar
    // "Resumen" no te saca de la vista implicada (y quedás sin poder volver sin soltar
    // el foco).
    const implied = u.searchParams.get('dia') || u.searchParams.get('tramo') || u.searchParams.get('hosp');
    // Tocar una tab del riel es salir de la vista de día: el riel está abajo de ella.
    u.searchParams.delete('jornada');
    if (id === 'resumen' && !implied) u.searchParams.delete('tab');
    else u.searchParams.set('tab', id);
    if (u.href === location.href) return;
    history.pushState(null, '', u);
    apply();
  }

  // Entrar al foco (o salir, si se vuelve a tocar el día que ya está enfocado).
  // Entrar y salir NO cambian de vista: el tab se preserva explícitamente porque un
  // `?dia=` pelado ya vale por `tab=dias`, y borrarlo sin más te devolvía al resumen.
  function goDay(date) {
    const u = new URL(location.href);
    const wasJornada = !!currentJornada();
    u.searchParams.delete('jornada');   // el mapa está abajo de la vista de día
    const tab = date ? 'dias' : current();
    if (tab === 'resumen') u.searchParams.delete('tab'); else u.searchParams.set('tab', tab);
    // Desde la vista de día el botón SIEMPRE enfoca (no hace toggle): se viene de una
    // pantalla donde el mapa no se veía, así que "volver a tocar para soltar" no aplica.
    if (date && (wasJornada || date !== currentDay())) u.searchParams.set('dia', date);
    else u.searchParams.delete('dia');
    history.pushState(null, '', u);
    apply();
  }

  if (panes.dias) {
    let cardTouch = null;
    let swipedCard = null;
    let swipedUntil = 0;
    panes.dias.addEventListener('touchstart', (e) => {
      const card = e.target.closest('[data-jornada-card]');
      const t = e.touches[0];
      cardTouch = card && t ? { card, x: t.clientX, y: t.clientY, moved: false } : null;
    }, { passive: true });
    panes.dias.addEventListener('touchmove', (e) => {
      if (!cardTouch || !e.touches[0]) return;
      const t = e.touches[0];
      if (Math.hypot(t.clientX - cardTouch.x, t.clientY - cardTouch.y) > 10) cardTouch.moved = true;
    }, { passive: true });
    panes.dias.addEventListener('touchend', () => {
      if (cardTouch && cardTouch.moved) {
        swipedCard = cardTouch.card;
        swipedUntil = performance.now() + 500;
      }
      cardTouch = null;
    }, { passive: true });
    panes.dias.addEventListener('click', (e) => {
      const more = e.target.closest('.sg-more');
      if (more) { e.stopPropagation(); toggleSug(more); return; }
      const open = e.target.closest('[data-jornada]');
      if (open) { e.stopPropagation(); goJornada(open.dataset.jornada); return; }
      const hosp = e.target.closest('[data-hosp-day]');
      if (hosp) { e.stopPropagation(); goHosp(hosp.dataset.hospDay); return; }
      const b = e.target.closest('.dy-map');
      if (b) { e.stopPropagation(); goDay(b.dataset.day); return; }
      const card = e.target.closest('[data-jornada-card]');
      if (!card || e.target.closest('button, a, input, select, textarea, summary, details, [role="button"], [data-act], [data-goto], [data-hosp-day]')) return;
      if (card === swipedCard && performance.now() < swipedUntil) return;
      goJornada(card.dataset.jornadaCard);
    });
  }
  // El chip "✕ Día N" del mapa es la otra salida: pasa por la URL, no por el mapa
  // directo, para que la vista y el histórico queden en el mismo estado.
  if (ctx.onDayExit) ctx.onDayExit(() => goDay(null));

  window.addEventListener('popstate', apply);
  // `#/dia/<fecha>` escrito a mano (o pegado desde un link viejo) entra igual.
  window.addEventListener('hashchange', () => { absorbHash(); apply(); });
  absorbHash();
  apply();
  if (ctx.plan) {
    // La carga del plan y un guardado NO son el mismo evento, aunque los dos lleguen por
    // `onChange` (ronda 4, 18/9 — Martín: «la persistencia está bien entre páginas pero
    // cuando refresco ya no está»):
    //
    // - `save(date, …)` emite con la fecha concreta y ahí manda el camino QUIRÚRGICO
    //   (`syncPlanDom`): mueve el renglón y nada más. Es lo que sacó el titileo en la
    //   ronda 3 y no se toca.
    // - `load()` emite con `date === null` y llega DESPUÉS del primer pintado. En ese
    //   pintado `promoted()` era `[]`, así que un día sin nada fijo ni siquiera tiene su
    //   `[data-plan-drop]` — y `syncPlanDom(null)` sólo recorre las zonas que YA existen.
    //   No había dónde aplicar lo que acababa de traer el server: por eso navegar
    //   funcionaba (cada `apply()` re-renderiza) y refrescar no. La carga completa
    //   vuelve a pintar la vista, una sola vez, al arrancar y con el puntero lejos.
    ctx.plan.onChange(date => {
      if (date == null) { repaintPlanViews(); return; }
      syncPlanDom(date);
      if (shownDay && date === shownDay && ctx.focusDay) ctx.focusDay(plannedSpec(routeOf(dayByDate[shownDay], ctx)));
      if (shownJornada && date === shownJornada && ctx.renderDayMap) {
        ctx.renderDayMap(dayView.querySelector('[data-day-map]'), routeOf(dayByDate[shownJornada], ctx));
      }
    });
    ctx.plan.load().catch(err => window.alert(err.message || 'No se pudo cargar el plan.'));
  }

  // Volver a pintar lo que depende del plan. Sin plan cargado no hay nada que rehacer:
  // el pintado de arranque ya es correcto y repintar sería el titileo que se sacó.
  function repaintPlanViews() {
    if (!it.days.some(d => ctx.plan.promoted(d.date).length)) return;
    const scroll = panes.dias ? panes.dias.scrollTop : 0;
    done.dias = false;          // el pane se rearma con las promociones ya en la mano
    shownJornada = null;        // y la vista de día también, con su mapa
    apply();
    if (panes.dias) panes.dias.scrollTop = scroll;
  }
  return { go, goDay, goJornada, itinerary: it };
}
