// views.js — las cuatro vistas laterales del mismo itinerario (task 499).
//
// La vista "Resumen" es el dashboard que ya existía (mapa + itinerario colapsable):
// este módulo no lo toca, solo lo muestra y lo esconde. Las otras tres se arman acá
// a partir de lo que devuelve itinerary.js, que a su vez lee `destinations`. No hay
// un segundo registro del viaje en ningún lado.
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

    const whyHtml = (leg.why || []).length
      ? '<ul class="tr-why">' + leg.why.map(w => '<li>' + esc(w) + '</li>').join('') + '</ul>' : '';

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

export function mountViews(destinations, ctx) {
  const rail = document.getElementById('tab-rail');
  const host = document.getElementById('views');
  if (!rail || !host) return;

  const it = buildItinerary(destinations);
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

  function current() {
    const t = new URLSearchParams(location.search).get('tab');
    return panes[t] ? t : 'resumen';
  }

  function show(id) {
    for (const t of tabs) {
      panes[t.id].hidden = t.id !== id;
      btns[t.id].classList.toggle('on', t.id === id);
    }
    if (id !== 'resumen' && !done[id]) {
      panes[id].innerHTML = '<div class="view-inner">' + RENDER[id](it, ctx) + '</div>';
      if (ctx.wire) ctx.wire(panes[id]);
      done[id] = true;
    }
    // El mapa se dibuja mal si se lo redimensiona escondido: hay que avisarle al volver.
    if (id === 'resumen' && ctx.onResumen) ctx.onResumen();
    panes[id].scrollTop = 0;
  }

  function go(id) {
    const u = new URL(location.href);
    if (id === 'resumen') u.searchParams.delete('tab'); else u.searchParams.set('tab', id);
    history.pushState(null, '', u);
    show(id);
  }

  window.addEventListener('popstate', () => show(current()));
  show(current());
  return { go, itinerary: it };
}
