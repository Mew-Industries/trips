// itinerary.js — capa DERIVADA del itinerario.
//
// No tiene datos propios: recibe el array `destinations` de index.html (la única
// fuente de verdad del viaje) y devuelve los tres cortes que necesitan las vistas
// laterales — hospedajes, transportes y días. Si cambia un nodo en index.html,
// cambian los tres sin tocar nada acá.
//
// Campos del modelo que usa (todos opcionales salvo `start`/`end`; lo que falta se
// muestra como "a definir", nunca se inventa):
//
//   nodo.start / nodo.end        'YYYY-MM-DD'. `start` = día de llegada, `end` = día
//                                de salida. Un nodo `fullday` tiene start === end.
//                                Las noches de un `destino` son [start, end).
//   nodo.leg.departure/arrival   'YYYY-MM-DDTHH:MM' u omitido. Horario REAL de salida
//                                y llegada del tramo (no duración: eso es `leg.time`).
//                                Hora local de cada punta, que es la que se lee en el
//                                cartel de la estación.
//   nodo.leg.fromName/toName     Overridean las puntas del tramo cuando no son nodos
//                                del viaje (ej. 'Buenos Aires (EZE)').
//   nodo.leg.fromTerminal        { name, coords, mode, icon? } — la punta FÍSICA del
//   nodo.leg.toTerminal          salto: el aeropuerto, la estación o el puerto por donde
//                                se sale y se entra. Es lo que cierra el recorrido de un
//                                día de traslado (ver dayRoute() en views.js): el día no
//                                termina en el hotel de la ciudad siguiente, termina en
//                                la terminal. `mode` es el de MODE_STYLE ('air'/'train'/
//                                'bus'/'ferry') y da el ícono; `icon` lo overridea cuando
//                                el modo no lo cuenta (el funicular de Koyasan).
//   nodo.leg.why                 [string] — por qué el horario es el que es. Es lo que
//                                convierte la vista de transportes en algo accionable.
//   nodo.leg.deadline            { by, what, departBy? } — hora límite dura de llegada
//                                (ISO), qué la impone, y a más tardar cuándo hay que salir.
//   nodo.leg.segments[].departure/arrival   lo mismo por tramo (vuelos con escala).
//   nodo.lodging.checkInFrom/checkInTo      'HH:MM' — ventana de check-in.
//   nodo.lodging.checkOutFrom/checkOutBy    'HH:MM' — ventana de check-out.
//   actividad.at / actividad.until          'YYYY-MM-DDTHH:MM' — actividad con hora fija
//                                           (entrada comprada, tour con reserva).
//   actividad.openHours          string libre — horario de apertura.
//   actividad.bestTime           string libre — cuándo conviene ir.

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const WEEKDAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

const _n = s => parseInt(s, 10);
export const dayOf = dt => String(dt || '').slice(0, 10);
export const timeOf = dt => (String(dt || '').length > 10 ? String(dt).slice(11, 16) : null);

// Aritmética de fechas en UTC puro: sin husos, sin DST, sin sorpresas de medianoche.
const toUTC = d => Date.UTC(_n(d.slice(0, 4)), _n(d.slice(5, 7)) - 1, _n(d.slice(8, 10)));
const fromUTC = ms => new Date(ms).toISOString().slice(0, 10);
export const addDays = (d, k) => fromUTC(toUTC(d) + k * 86400000);
export const diffDays = (a, b) => Math.round((toUTC(b) - toUTC(a)) / 86400000);
export const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

export function datesBetween(a, b) {
  const out = [];
  for (let d = a; d <= b; d = addDays(d, 1)) out.push(d);
  return out;
}

export const fmtDate = d => _n(d.slice(8, 10)) + ' ' + MONTHS[_n(d.slice(5, 7)) - 1];
export const fmtWeekday = d => WEEKDAYS[new Date(toUTC(d)).getUTCDay()];
export const fmtDateLong = d => fmtWeekday(d) + ' ' + fmtDate(d);

// Rango legible de un nodo: "8 → 13 oct" / "13 oct".
export function fmtRange(a, b) {
  if (!a) return '';
  if (!b || a === b) return fmtDate(a);
  const sameMonth = a.slice(5, 7) === b.slice(5, 7);
  return (sameMonth ? _n(a.slice(8, 10)) : fmtDate(a)) + ' → ' + fmtDate(b);
}

export const nightsWord = n => n + (n === 1 ? ' noche' : ' noches');

// ---------------------------------------------------------------- hospedajes

// Los 13 nodos donde se duerme, en orden. Los que todavía no tienen `lodging`
// aparecen igual, marcados como pendientes: un hueco en la lista es información.
export function lodgingsOf(dests) {
  return dests.filter(d => d.type === 'destino').map(d => ({
    node: d,
    lodging: d.lodging || null,
    start: d.start, end: d.end,
    nights: d.nights || (d.start && d.end ? diffDays(d.start, d.end) : 0)
  }));
}

// ---------------------------------------------------------------- transportes

function legEnds(dests, i, kind) {
  const d = dests[i];
  const leg = kind === 'out' ? d.departureLeg : d.leg;
  const prev = dests[i - 1];
  return {
    from: (leg && leg.fromName) || (kind === 'out' ? d.name : (prev ? prev.name : '')),
    to: (leg && leg.toName) || (kind === 'out' ? '' : d.name)
  };
}

// Un salto por cada `leg` (llegada al nodo) más el `departureLeg` final. El orden es
// el del itinerario, que es también el cronológico.
export function transfersOf(dests) {
  const out = [];
  dests.forEach((d, i) => {
    const add = (leg, kind) => {
      if (!leg) return;
      const ends = legEnds(dests, i, kind);
      const date = dayOf(leg.departure) || (kind === 'out' ? d.end : d.start);
      out.push({
        id: d.id + (kind === 'out' ? ':out' : ''),
        node: d, kind, leg, date,
        from: ends.from, to: ends.to,
        departure: leg.departure || null,
        arrival: leg.arrival || null,
        endDate: dayOf(leg.arrival) || date
      });
    };
    add(d.leg, 'in');
    add(d.departureLeg, 'out');
  });
  return out.sort((a, b) => cmp(a.date, b.date));
}

// ---------------------------------------------------------------------- días

// Clusters de actividades de un nodo: las que comparten `group` van juntas (el
// `group` ya es, en los datos, "esto se hace en la misma salida"); las sueltas van
// de a una. Es el orden en que están cargadas, que es el orden curado.
//
// Cada ítem es `{ i, act }`: `i` es el índice de la actividad DENTRO de
// `node.activities`, que es la clave con la que el mapa registra su pin
// (`actMarkers['<nodo>:<i>']`). Sin eso la lista no puede linkear al punto.
export function clustersOf(node) {
  const out = [], byGroup = new Map();
  (node.activities || []).forEach((act, i) => {
    if (act.at) return;   // ya tiene día y hora: es un evento del día, no una sugerencia
    if (act.group) {
      if (!byGroup.has(act.group)) { const c = { label: act.group, items: [] }; byGroup.set(act.group, c); out.push(c); }
      byGroup.get(act.group).items.push({ i, act });
    } else {
      out.push({ label: null, items: [{ i, act }] });
    }
  });
  return out;
}

// Días de un nodo que reciben sugerencias: los días COMPLETOS (ni llegada ni salida).
// Cuando no hay ninguno —nodo de paso, o parada de una sola noche— se usan todos sus
// días, porque ahí las medias jornadas son todo lo que hay.
export function suggestionDays(node) {
  const all = datesBetween(node.start, node.end);
  return all.length > 2 ? all.slice(1, -1) : all;
}

// Reparto por PESO, no por cantidad de clusters: un cluster de 3 lugares ocupa el día
// más que uno suelto. Sin esto el primer día se comía todos los grupos grandes.
function spreadClusters(node) {
  const days = suggestionDays(node), cl = clustersOf(node), out = {};
  days.forEach(d => { out[d] = []; });
  if (!days.length || !cl.length) return out;
  const total = cl.reduce((a, c) => a + c.items.length, 0);
  const target = total / days.length;
  let k = 0, acc = 0;
  for (const c of cl) {
    out[days[k]].push(c);
    acc += c.items.length;
    if (acc >= target * (k + 1) && k < days.length - 1) k++;
  }
  return out;
}

function ev(time, kind, text, extra) {
  return Object.assign({ time: time || null, kind, text }, extra || {});
}

// Un día por fecha, del primer despegue al último aterrizaje. Cada día sabe qué
// nodos lo tocan, dónde se duerme esa noche, qué hay con hora y qué se sugiere.
export function daysOf(dests, transfers) {
  const nodes = dests.filter(d => d.start && d.end);
  let first = nodes[0].start, last = nodes[nodes.length - 1].end;
  for (const t of transfers) {
    if (t.date < first) first = t.date;
    if (t.endDate > last) last = t.endDate;
  }
  const spread = {};
  nodes.forEach(n => { spread[n.id] = spreadClusters(n); });

  // Eventos de vuelo, en el orden REAL del viaje. Cada punta va en su hora local, así
  // que ordenarlos por reloj miente: el UA6 sale de Narita 17:45 y aterriza en Houston
  // a las 14:40 del mismo día. `ord` es la secuencia, y manda sobre la hora.
  const segEvents = [];
  transfers.forEach(t => (t.leg.segments || []).forEach(s => {
    if (!s.route) return;
    const [a, b] = s.route.split('→').map(x => x.trim());
    if (s.departure) segEvents.push(ev(timeOf(s.departure), 'vuelo', 'Sale ' + a + (s.no ? ' · ' + s.no : ''), { date: dayOf(s.departure), transfer: t, seg: s, ord: segEvents.length }));
    if (s.arrival) segEvents.push(ev(timeOf(s.arrival), 'vuelo', 'Llega ' + b + (s.no ? ' · ' + s.no : ''), { date: dayOf(s.arrival), transfer: t, seg: s, ord: segEvents.length }));
  }));

  const days = datesBetween(first, last).map((date, i) => {
    const here = nodes.filter(n => n.start <= date && date <= n.end).map(n => ({
      node: n,
      role: n.type === 'fullday' || n.start === n.end ? 'de paso'
        : date === n.start ? 'llegada' : date === n.end ? 'salida' : 'estadía'
    }));
    const sleep = nodes.find(n => n.type === 'destino' && n.start <= date && date < n.end) || null;
    const inFlight = !sleep && transfers.find(t => t.date <= date && date < t.endDate) || null;

    const events = segEvents.filter(e => e.date === date);
    for (const t of transfers) {
      if (t.date === date && !(t.leg.segments || []).some(s => s.route)) {
        events.push(ev(timeOf(t.departure), 'transporte', t.from + ' → ' + t.to, { transfer: t }));
      }
    }
    for (const h of here) {
      const L = h.node.lodging;
      if (!L) continue;
      if (date === h.node.start) events.push(ev(L.checkInFrom || null, 'check-in', L.name, { lodging: L, node: h.node }));
      if (date === h.node.end) events.push(ev(L.checkOutFrom || L.checkOutBy || null, 'check-out', L.name, { lodging: L, node: h.node }));
      for (const a of h.node.activities || []) {
        if (dayOf(a.at) === date) events.push(ev(timeOf(a.at), 'reserva', a.text, { act: a, node: h.node }));
      }
    }
    events.sort((a, b) =>
      (a.ord != null && b.ord != null) ? a.ord - b.ord
      : (a.time ? 0 : 1) - (b.time ? 0 : 1) || cmp(a.time || '', b.time || ''));

    const suggestions = here
      .map(h => ({ node: h.node, clusters: (spread[h.node.id] || {})[date] || [] }))
      .filter(s => s.clusters.length);

    return { date, n: i + 1, here, sleep, inFlight, events, suggestions };
  });

  // De dónde ARRANCA el día: la cama de anoche. `sleep` es dónde termina. En un día
  // normal son la misma y el recorrido sale y vuelve ahí; en uno de traslado son dos
  // puntas distintas, y esa es justamente la forma del día.
  days.forEach((d, i) => { d.wake = i ? days[i - 1].sleep : null; });
  return days;
}

export function buildItinerary(dests) {
  const transfers = transfersOf(dests);
  const days = daysOf(dests, transfers);
  return {
    transfers,
    days,
    lodgings: lodgingsOf(dests),
    start: days[0].date,
    end: days[days.length - 1].date
  };
}
