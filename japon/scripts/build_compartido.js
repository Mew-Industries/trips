#!/usr/bin/env node
// build_compartido.js — genera `compartido/data.js`, el dato de la vista filtrada que
// se comparte con Zava y Ari (task 545, ronda 2).
//
// POR QUÉ UN GENERADOR Y NO UN `?view=compartido`
// El itinerario entero vive en el array `destinations` de index.html, así que cualquier
// filtro en runtime deja las 15 paradas —fechas, hospedajes, reservas— en el HTML que
// recibe quien abre el link. Esconderlas por CSS o por JS no las saca del documento.
// Por eso la vista compartida es OTRA página (`compartido/index.html`) con SU dato, y
// este script es el que lo extrae de la fuente de verdad para que no haya un segundo
// registro del viaje que se desincronice.
//
// CÓMO FILTRA: por ALLOWLIST, nunca por denylist. De cada nodo compartido se copian
// sólo los campos de la lista de abajo, y la prosa que menciona el resto del viaje
// (de dónde se llega, a dónde se sigue) se REESCRIBE acá, en `OVERRIDES`, contada
// desde el lado de ellos. Un campo nuevo en `destinations` no aparece solo en la vista
// compartida: hay que agregarlo a mano, que es exactamente lo que se quiere.
//
// Uso:
//   node japon/scripts/build_compartido.js            escribe compartido/data.js
//   node japon/scripts/build_compartido.js --check    falla si está desactualizado o
//                                                     si se filtró algo del resto del viaje

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
const OUT = path.join(ROOT, 'compartido', 'data.js');

const SHARED_IDS = ['kioto', 'osaka', 'tokio-medio'];

// La prosa de la vista compartida. El intro/llegada/salida de `destinations` está
// escrito para Martín y Cata y nombra el resto del viaje; acá se cuenta el mismo tramo
// desde donde lo van a leer ellos. `pending` es el estado de la reserva en una línea:
// lo que les importa es si la cama está o no está.
const OVERRIDES = {
  kioto: {
    arrival: '19 oct · llegada a KIX y primera noche en Kioto',
    departure: '24 oct · sigue Osaka',
    intro: 'Cinco noches en la capital cultural: Arashiyama al amanecer, los templos del este, Fushimi Inari, Nishiki y Pontocho de noche. El departamento es compartido, en Shimogyō-ku, a pasos de Karasuma/Shijō y cerca de la Estación de Kioto (de donde salen los day trips).',
    lodgingPending: 'Reserva a ajustar a estas fechas y para los cuatro · pendiente',
  },
  osaka: {
    arrival: '24 oct · se llega de Kioto en tren (~1 h)',
    departure: '27 oct · sigue Tokio en Shinkansen',
    intro: 'La energía contraria de Kioto: Dotonbori, Kuromon, Shinsekai y el Umeda Sky al atardecer. Tres noches en un departamento compartido entre Dotonbori y Nihonbashi, caminable a Namba.',
    lodgingPending: 'Reserva a rebookear a estas fechas y para los cuatro · pendiente',
  },
  'tokio-medio': {
    arrival: '27 oct · se llega de Osaka en Shinkansen (~2 h 30)',
    departure: '31 oct · Martín y Cata siguen viaje; Zava y Ari se quedan una noche más y vuelan el 1/11',
    intro: 'Cuatro noches en Tokio para cerrar el tramo, los cuatro. El alojamiento todavía no está reservado: se busca para cuatro personas. El 31 Martín y Cata siguen viaje y ustedes se quedan una noche más.',
  },
};

const HEAD = {
  title: 'Japón — tramo compartido',
  subtitle: 'Kioto · Osaka · Tokio — 19 al 31 de octubre de 2026',
  note: 'Con Zava y Ari. Ellos llegan a KIX el 19 y vuelan de vuelta desde Tokio el 1 de noviembre.',
};

// ------------------------------------------------------------------ extracción

// El array `destinations` es un literal con comentarios y comillas simples. Para
// sacarlo hay que balancear corchetes SIN contar los que caen dentro de un string o de
// un comentario ('/[' de una URL, un `//` adentro de un href).
function sliceArray(src, marker) {
  const at = src.indexOf(marker);
  if (at < 0) throw new Error('no se encontró "' + marker + '" en index.html');
  const start = src.indexOf('[', at);
  let depth = 0, i = start;
  while (i < src.length) {
    const c = src[i];
    if (c === '"' || c === "'" || c === '`') {
      const q = c;
      i++;
      while (i < src.length && src[i] !== q) i += src[i] === '\\' ? 2 : 1;
    } else if (c === '/' && src[i + 1] === '/') {
      i = src.indexOf('\n', i);
      if (i < 0) break;
    } else if (c === '/' && src[i + 1] === '*') {
      i = src.indexOf('*/', i) + 1;
    } else if (c === '[') depth++;
    else if (c === ']') {
      depth--;
      if (depth === 0) return src.slice(start, i + 1);
    }
    i++;
  }
  throw new Error('el array de "' + marker + '" no cierra');
}

function loadDestinations() {
  const src = fs.readFileSync(SRC, 'utf8');
  // eslint-disable-next-line no-new-func
  return new Function('return ' + sliceArray(src, 'const destinations = ['))();
}

// La categoría se resuelve ACÁ, con la misma taxonomía del site (data/categories.js),
// y se escribe ya resuelta en el dato. Así la página compartida no tiene que cargar
// categories.js, que trae los nombres de lugares de todo el viaje en sus overrides.
function catResolver() {
  const win = {};
  // eslint-disable-next-line no-new-func
  new Function('window', fs.readFileSync(path.join(ROOT, 'data', 'categories.js'), 'utf8'))(win);
  const META = win.PLACE_TAXONOMY.meta;
  const key = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const byName = {};
  Object.keys(win.PLACE_CAT_OVERRIDES).forEach(n => { byName[key(n)] = win.PLACE_CAT_OVERRIDES[n]; });
  return (name, legacy) => {
    const own = byName[key(name)];
    if (own && META[own]) return own;
    if (META[legacy]) return legacy;
    const mapped = win.PLACE_CAT_LEGACY[legacy];
    return (mapped && META[mapped]) ? mapped : 'otro';
  };
}

// ------------------------------------------------------------------- allowlist

const pick = (o, keys) => {
  const out = {};
  for (const k of keys) if (o[k] !== undefined && o[k] !== null) out[k] = o[k];
  return out;
};

function lodgingOf(node, ov) {
  if (!node.lodging) return null;
  // Del hospedaje va lo que sirve para dormir ahí: qué es, dónde queda, cómo se llega
  // y cómo entrar. NADA de la reserva (código, importe, teléfono del host, cancelación):
  // eso es de quien la pagó y no cambia nada del lado de ellos.
  const L = pick(node.lodging, [
    'name', 'type', 'area', 'coords', 'url', 'mapsUrl',
    'checkIn', 'checkOut', 'nights', 'checkInFrom', 'checkInTo', 'checkOutFrom', 'checkOutBy',
  ]);
  L.guests = '4 personas (los cuatro)';
  if (ov.lodgingPending) L.pending = ov.lodgingPending;
  return L;
}

function build() {
  const catOf = catResolver();
  const all = loadDestinations();
  const nodes = SHARED_IDS.map((id, i) => {
    const d = all.find(n => n.id === id);
    if (!d) throw new Error('el nodo "' + id + '" ya no está en destinations');
    if (!d.sharedWith) throw new Error('el nodo "' + id + '" perdió su `sharedWith`');
    const ov = OVERRIDES[id] || {};
    return {
      // La numeración es la del TRAMO (1..3), no la del viaje: en esta vista el resto
      // del itinerario no existe y un "8. Kioto" sólo abriría la pregunta.
      i: i + 1,
      id: d.id,
      name: d.short === 'Tokio medio' ? 'Tokio' : d.name,
      short: d.short === 'Tokio medio' ? 'Tokio' : d.short,
      dates: d.dates,
      nights: d.nights,
      start: d.start,
      end: d.end,
      coords: d.coords,
      imgs: (d.imgs && d.imgs.length) ? d.imgs : (d.img ? [d.img] : []),
      intro: ov.intro || d.intro,
      arrival: ov.arrival || d.arrival,
      departure: ov.departure || d.departure,
      lodging: lodgingOf(d, ov),
      lodgingTbd: d.lodging ? null : 'Todavía sin reservar · se busca para cuatro',
      activities: (d.activities || []).map(a => {
        const o = pick(a, ['text', 'coords', 'url', 'group']);
        o.cat = catOf(a.text, a.cat);
        return o;
      }),
      daytrips: (d.daytrips || []).map(t => {
        const o = pick(t, ['name', 'time', 'desc', 'coords', 'url', 'img']);
        o.cat = catOf(t.name, t.cat);
        return o;
      }),
    };
  });

  // Los saltos DE ADENTRO del tramo: el que llega a Kioto viene de una parada que no es
  // de ellos, así que no está. Kioto abre con el vuelo a KIX, que es su llegada.
  const legs = SHARED_IDS.slice(1).map(id => {
    const d = all.find(n => n.id === id);
    const from = all[all.findIndex(n => n.id === id) - 1];
    return {
      fromId: from.id, toId: d.id, date: d.start,
      mode: d.leg.mode, time: d.leg.time, detail: d.leg.detail,
    };
  });

  return { ...HEAD, nodes, legs };
}

// ----------------------------------------------------------------------- salida

function render(data) {
  return '// GENERADO por scripts/build_compartido.js — no editar a mano.\n' +
    '// La fuente es el array `destinations` de ../index.html; la prosa propia de esta\n' +
    '// vista vive en OVERRIDES, dentro del generador. Para regenerar:\n' +
    '//   node japon/scripts/build_compartido.js\n' +
    'window.SEGMENT = ' + JSON.stringify(data, null, 2) + ';\n';
}

// Lo que NO puede aparecer en la vista compartida: el resto del viaje. Es una red de
// seguridad sobre la allowlist —si alguien agrega un campo y se lleva prosa puesta, esto
// lo caza— y la prueba de que el filtro es del documento y no del CSS.
const FORBIDDEN = [
  'Fukuoka', 'Busan', 'Gyeongju', 'Seúl', 'Seul', 'Koyasan', 'Hakone', 'Sapporo',
  'Kanazawa', 'Nikko', 'Nikkō', 'Ichinoseki', 'Hiraizumi', 'Sendai', 'Shirakawa',
  'Hōjō', 'Hojo', 'Yoshiike', 'Kokusai', 'Hakata', 'Narita', 'Haneda', 'Ezeiza', 'EZE',
  'HMC28MCWF3', 'US$', 'Booking', 'Rakuten', '予約', '18 nov', '6 oct', 'Corea',
];

function checkLeaks() {
  const dir = path.join(ROOT, 'compartido');
  const bad = [];
  for (const f of fs.readdirSync(dir)) {
    const txt = fs.readFileSync(path.join(dir, f), 'utf8');
    for (const w of FORBIDDEN) {
      if (txt.includes(w)) bad.push(f + ': "' + w + '"');
    }
  }
  return bad;
}

const data = build();
const out = render(data);

if (process.argv.includes('--check')) {
  let ok = true;
  const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (cur !== out) {
    console.error('✗ compartido/data.js está desactualizado — corré: node japon/scripts/build_compartido.js');
    ok = false;
  }
  const leaks = checkLeaks();
  if (leaks.length) {
    console.error('✗ la vista compartida menciona el resto del viaje:\n  ' + leaks.join('\n  '));
    ok = false;
  }
  if (ok) {
    const acts = data.nodes.reduce((a, n) => a + n.activities.length, 0);
    console.log('✓ compartido/ al día: ' + data.nodes.length + ' paradas · ' +
      data.legs.length + ' saltos · ' + acts + ' actividades · sin filtraciones');
  }
  process.exit(ok ? 0 : 1);
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, out);
console.log('escrito ' + path.relative(process.cwd(), OUT) + ' — ' + data.nodes.length + ' paradas');
