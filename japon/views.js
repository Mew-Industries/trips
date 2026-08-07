// views.js — las cuatro vistas laterales del mismo itinerario (task 499).
//
// La vista "Resumen" es el dashboard que ya existía (mapa + itinerario colapsable):
// este módulo no lo toca, solo lo muestra y lo esconde. Las otras tres se arman acá
// a partir de lo que devuelve itinerary.js, que a su vez lee `destinations`. No hay
// un segundo registro del viaje en ningún lado.
//
// Todo lo nuevo vive en este archivo + views.css: revertir los commits de las vistas
// devuelve el site exactamente al estado anterior.

import { buildItinerary } from './itinerary.js';

const TABS = [
  { id: 'resumen', label: 'Resumen', icon: '🗺️' },
  { id: 'hospedajes', label: 'Hospedajes', icon: '🛏️' },
  { id: 'transportes', label: 'Transportes', icon: '🚄' },
  { id: 'dias', label: 'Días', icon: '📅' }
];

// id de tab -> función que devuelve el HTML de la vista. "resumen" no está acá:
// su pane es el <main class="dashboard"> que ya existe en index.html.
const RENDER = {};

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
