#!/usr/bin/env node
// Genera `compartido/index.html` desde la app principal, pero reemplaza el dataset
// por una allowlist del tramo Kioto → Osaka → Tokio. El filtro ocurre al construir:
// el navegador nunca recibe destinos, reservas ni costos del resto del viaje.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
const OUT = path.join(ROOT, 'compartido', 'index.html');
const CATEGORIES_SRC = path.join(ROOT, 'data', 'categories.js');
const CATEGORIES_OUT = path.join(ROOT, 'compartido', 'data', 'categories.js');
const OLD_DATA = path.join(ROOT, 'compartido', 'data.js');
const SHARED_IDS = ['kioto', 'osaka', 'tokio-medio'];

function arrayBounds(src, marker) {
  const at = src.indexOf(marker);
  if (at < 0) throw new Error(`no se encontró "${marker}" en index.html`);
  const start = src.indexOf('[', at);
  let depth = 0;
  for (let i = start; i < src.length; i++) {
    const c = src[i];
    if (c === '"' || c === "'" || c === '`') {
      const quote = c;
      for (i++; i < src.length && src[i] !== quote; i++) {
        if (src[i] === '\\') i++;
      }
    } else if (c === '/' && src[i + 1] === '/') {
      i = src.indexOf('\n', i);
      if (i < 0) break;
    } else if (c === '/' && src[i + 1] === '*') {
      i = src.indexOf('*/', i) + 1;
    } else if (c === '[') {
      depth++;
    } else if (c === ']' && --depth === 0) {
      return { start, end: i + 1 };
    }
  }
  throw new Error(`el array de "${marker}" no cierra`);
}

function loadDestinations(src) {
  const { start, end } = arrayBounds(src, 'const destinations = [');
  // eslint-disable-next-line no-new-func
  return new Function(`return ${src.slice(start, end)}`)();
}

// La compartida se sirve un nivel más abajo (`japon/compartido/`), igual que su CSS y su
// favicon. Las fotos que están en el repo (`img/...`, las de los hoteles que no son
// hotlinkables) viven en los DATOS, no en el HTML, así que no las alcanza el rewrite de
// arriba: hay que correrles el path acá, o donde van las fotos del hotel salen cuatro 404.
// Las remotas (muscache, Wikimedia) son absolutas y no se tocan.
function rebaseLocalImages(value) {
  if (typeof value === 'string') return value.startsWith('img/') ? '../' + value : value;
  if (Array.isArray(value)) return value.map(rebaseLocalImages);
  if (value && typeof value === 'object') {
    for (const k of Object.keys(value)) value[k] = rebaseLocalImages(value[k]);
  }
  return value;
}

function buildData(all) {
  return SHARED_IDS.map((id, index) => {
    const source = all.find(node => node.id === id);
    if (!source) throw new Error(`el nodo "${id}" ya no está en destinations`);
    if (!source.sharedWith) throw new Error(`el nodo "${id}" perdió sharedWith`);
    const node = rebaseLocalImages(structuredClone(source));
    node.n = index + 1;
    if (node.lodging && node.lodging.booking) {
      // La ficha conserva estado y fechas para coordinar el rebooking, pero el link
      // público no necesita credenciales de reserva ni el teléfono del host. `total` ya
      // no existe en el modelo (el site no muestra plata) y se borra igual por las dudas.
      for (const field of ['ref', 'ref2', 'refLabel', 'ref2Label', 'phone', 'total']) {
        delete node.lodging.booking[field];
      }
    }

    if (id === 'kioto') {
      node.arrival = '19 oct · llegada a KIX y primera noche en Kioto';
      node.departure = '24 oct · sigue Osaka';
      node.intro = 'Cinco noches en la capital cultural: Arashiyama al amanecer, los templos del este, Fushimi Inari, Nishiki y Pontocho de noche. Paramos los cuatro en una machiya sobre el Kamogawa, en Shimogyō-ku, a un rato a pie de la Estación de Kioto.';
      node.leg = {
        mode: '✈️', time: 'a definir', detail: 'Llegada a Kansai (KIX) → Kioto.',
        fromName: 'Origen a definir', toName: 'Kioto',
        toTerminal: { name: 'Aeropuerto Internacional de Kansai (KIX)', coords: [34.4347, 135.244], mode: 'air' },
        arrival: '2026-10-19T00:00',
      };
    } else if (id === 'osaka') {
      node.arrival = '24 oct · se llega de Kioto en tren (~1 h)';
      node.departure = '27 oct · sigue Tokio en Shinkansen';
    } else {
      node.name = 'Tokio';
      node.short = 'Tokio';
      node.arrival = '27 oct · se llega de Osaka en Shinkansen (~2 h 30)';
      node.departure = '31 oct · los amigos se quedan una noche más y vuelan el 1/11';
      node.intro = 'Cuatro noches en Tokio. El alojamiento todavía no está reservado: se busca para cuatro personas. Los amigos se quedan hasta el 1 de noviembre.';
    }
    return node;
  });
}

function activityNames(nodes) {
  const names = new Set();
  const visit = value => {
    if (!value || typeof value !== 'object') return;
    if (typeof value.name === 'string') names.add(value.name);
    if (Array.isArray(value)) value.forEach(visit);
    else Object.values(value).forEach(visit);
  };
  nodes.forEach(node => (node.activities || []).forEach(visit));
  return names;
}

function buildCategories(nodes) {
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(CATEGORIES_SRC, 'utf8'), sandbox, { filename: CATEGORIES_SRC });
  const allowed = activityNames(nodes);
  const overrides = Object.fromEntries(Object.entries(sandbox.window.PLACE_CAT_OVERRIDES)
    .filter(([name]) => allowed.has(name)));
  return [
    '// Generado por scripts/build_compartido.js. Sólo contiene la taxonomía y lugares del viaje servido.',
    `window.PLACE_TAXONOMY = ${JSON.stringify(sandbox.window.PLACE_TAXONOMY, null, 2)};`,
    `window.PLACE_CAT_LEGACY = ${JSON.stringify(sandbox.window.PLACE_CAT_LEGACY, null, 2)};`,
    `window.PLACE_CAT_OVERRIDES = ${JSON.stringify(overrides, null, 2)};`,
    '',
  ].join('\n');
}

function replaceBetween(source, startMarker, endMarker, replacement) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  if (start < 0 || end < 0) throw new Error(`no se pudo recortar: ${startMarker}`);
  return source.slice(0, start) + replacement + '\n\n' + source.slice(end);
}

function render() {
  const source = fs.readFileSync(SRC, 'utf8');
  const bounds = arrayBounds(source, 'const destinations = [');
  const data = buildData(loadDestinations(source));
  let out = source.slice(0, bounds.start) + JSON.stringify(data, null, 2) + source.slice(bounds.end);

  out = out
    .replace('<title>Japón + Corea · oct-nov 2026</title>', '<title>Japón · 19-31 oct 2026</title>')
    .replace('<h1>Japón + Corea</h1>', '<h1>Japón</h1>')
    .replace('<span class="subtitle"><span class="dx">6 oct – 18 nov 2026</span><span class="dm">43 días</span></span>', '<span class="subtitle"><span class="dx">19–31 oct 2026</span><span class="dm">12 días</span></span>')
    .replace(/<div class="header-stats">[\s\S]*?<\/div>\s*<button type="button" class="discrete-btn"/, '<div class="header-stats"><span><strong>12</strong> noches</span><span><strong>3</strong> destinos</span><span class="dx"><strong>1/11</strong> vuelven los amigos</span></div>\n    <button type="button" class="discrete-btn"')
    .replace('src="data/categories.js"', 'src="data/categories.js"')
    .replace('<script src="data/reels.js"></script>', '<script>window.SOURCE_THINGS = [];</script>')
    .replace('href="views.css"', 'href="../views.css"')
    .replace("from './views.js'", "from '../views.js'")
    .replace(/href="favicon(-\d+)?\.(png|ico)"/g, 'href="../favicon$1.$2"')
    .replaceAll('tramo compartido', 'viaje juntos');

  // Estos catálogos son globales en la app principal. En la compartida no se ocultan:
  // directamente no se entregan, para que mapa y búsqueda sólo conozcan el tramo.
  out = replaceBetween(out, 'const orphanPlaces = [', "const map = L.map", 'const orphanPlaces = [];');
  out = replaceBetween(out, 'const airports = [', '// Aeropuertos en la MISMA capa',
    "const airports = [{ code: 'KIX', name: 'Kansai', coords: [34.4347, 135.244] }];");
  out = replaceBetween(out, "const _EZE =", '// Leyenda de modos de transporte', [
    "const _kixPts = [[34.4347, 135.244], chain[0].coords];",
    "const _arrivalStyle = { color: MODE_STYLE.air.color, weight: 2, opacity: 0.65, dashArray: '1, 7' };",
    "const _arrival = L.polyline(_kixPts, _arrivalStyle).addTo(flightLayer)",
    "  .bindPopup('<div class=\"popup-title\">✈ Llegada · KIX → Kioto</div>');",
    "registerLeg(chain[0].id, [{ pts: _kixPts, pl: _arrival, style: _arrivalStyle, layer: flightLayer }]);",
  ].join('\n'));

  // La app principal tiene comentarios técnicos con ejemplos de otros nodos. Aunque
  // no son datos ejecutables, tampoco tienen por qué viajar en el HTML compartido.
  const commentTerms = ['Fukuoka', 'Busan', 'Koyasan', 'Hakone', 'Kanazawa', 'Nikko',
    'Sendai', 'Shirakawa', 'Yoshiike', 'tokio-final'];
  out = out.split('\n').map(line => {
    if (!line.trimStart().startsWith('//')) return line;
    for (const term of commentTerms) line = line.replaceAll(term, 'otra parada');
    return line;
  }).join('\n');

  return out;
}

const FORBIDDEN = [
  'Japón + Corea', 'tramo compartido', 'Fukuoka', 'Busan', 'Gyeongju', 'Seúl',
  'Koyasan', 'Hakone', 'Sapporo', 'Kanazawa', 'Nikko', 'Ichinoseki', 'Sendai',
  'Shirakawa', 'Hōjō-in', 'Yoshiike', 'Hakata', 'Narita', 'Haneda', 'Ezeiza',
  '18 nov', '8-13 oct', '31 oct-3 nov', 'tokio-final', 'fukuoka', 'seul', 'hakone', 'koyasan',
];

function leaks(html) {
  return FORBIDDEN.filter(term => html.includes(term));
}

const output = render();
const sharedData = buildData(loadDestinations(fs.readFileSync(SRC, 'utf8')));
const categoriesOutput = buildCategories(sharedData);
const servedAssets = [
  ['compartido/index.html', output],
  ['compartido/data/categories.js', categoriesOutput],
  ['views.js', fs.readFileSync(path.join(ROOT, 'views.js'), 'utf8')],
  ['views.css', fs.readFileSync(path.join(ROOT, 'views.css'), 'utf8')],
];
if (process.argv.includes('--check')) {
  const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  const currentCategories = fs.existsSync(CATEGORIES_OUT) ? fs.readFileSync(CATEGORIES_OUT, 'utf8') : '';
  let ok = true;
  if (current !== output) {
    console.error('✗ compartido/index.html está desactualizado');
    ok = false;
  }
  if (currentCategories !== categoriesOutput) {
    console.error('✗ compartido/data/categories.js está desactualizado');
    ok = false;
  }
  for (const [name, content] of servedAssets) {
    const inspected = name === 'compartido/index.html' ? current
      : name === 'compartido/data/categories.js' ? currentCategories : content;
    const bad = leaks(inspected);
    if (!bad.length) continue;
    console.error(`✗ filtraciones en ${name}: ${bad.join(', ')}`);
    ok = false;
  }
  if (ok) console.log('✓ app compartida al día: 3 destinos · app completa · sin filtraciones');
  process.exit(ok ? 0 : 1);
}

const bad = leaks(output);
if (bad.length) {
  const detail = bad.map(term => {
    const at = output.indexOf(term);
    return `${term}: ${output.slice(Math.max(0, at - 70), at + term.length + 70).replace(/\s+/g, ' ')}`;
  }).join('\n');
  throw new Error(`la salida filtrada contiene:\n${detail}`);
}
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, output);
fs.mkdirSync(path.dirname(CATEGORIES_OUT), { recursive: true });
fs.writeFileSync(CATEGORIES_OUT, categoriesOutput);
if (fs.existsSync(OLD_DATA)) fs.unlinkSync(OLD_DATA);
console.log('✓ generado compartido/index.html · 3 destinos · sin filtraciones');
