// Verificación en navegador del fondo del mapa (task 562): que los tiles sean los de
// Esri y no los de CARTO —que desde agosto 2026 vienen con "API KEY REQUIRED" estampado
// encima—, que la capa de nombres esté puesta (sin ella el mapa queda mudo) y que ningún
// tile pedido devuelva el gris de "Map data not yet available" (el caché de Esri termina
// en el zoom 16: de ahí para arriba se estira el 16, no se pide uno que no existe).
//
// Corre contra las DOS apps: la principal y la compartida, que es generada. El fondo del
// mapa se define en un helper que `build_compartido.js` casi se come —el recorte que le
// saca el catálogo a la compartida cae justo al lado— y sin este chequeo el bug era
// invisible: `/japon/` andaba y `/japon/compartido/` se quedaba sin mapa.
//
// No es parte de ninguna suite: necesita Chromium y el sitio servido. Levantarlo con
//   python3 -m http.server 8562 --bind 127.0.0.1   (desde la raíz del repo)
// y después:
//   node japon/scripts/check_map_tiles.mjs [outdir] [baseUrl]
//
// Sale 1 si algún chequeo falla y deja las capturas en <outdir>.
import pw from '/usr/lib/node_modules/agent-browser/node_modules/playwright-core/index.js';
import { mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
const { chromium } = pw;
const BASE = (process.argv[3] || 'http://127.0.0.1:8562/japon/').replace(/\/?$/, '/');
const OUT = process.argv[2] || '/tmp/shots-map';
mkdirSync(OUT, { recursive: true });

// Firma del tile de "Map data not yet available": Esri devuelve SIEMPRE el mismo archivo
// para cualquier z/x/y sin caché, así que se compara por hash y no por tamaño. Por tamaño
// daba falsos positivos: un tile de nombres sobre una manzana sin rótulos pesa 900 bytes
// y es correcto — está vacío porque ahí no hay nada que escribir, no porque falte el mapa.
const EMPTY_TILE = createHash('sha256').update(Buffer.from(
  await (await fetch('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/' +
    'World_Light_Gray_Base/MapServer/tile/22/1000/1000')).arrayBuffer()
)).digest('hex');

let failures = 0;
const browser = await chromium.launch({ args: ['--no-sandbox'] });

// Las dos apps con mapa. `hosp` es un hospedaje que existe en ese dataset: el deep-link
// vuela a su pin (zoom ~13) y es desde ahí que se prueba el zoom profundo.
const APPS = [
  { name: 'principal', url: BASE, hosp: 'kioto' },
  { name: 'compartido', url: BASE + 'compartido/', hosp: 'kioto' },
];

for (const app of APPS) {
  console.log(`\n── ${app.name} · ${app.url}`);
  const fail = (m) => { failures++; console.error('  ✗ ' + m); };
  const ok = (m) => console.log('  ✓ ' + m);

  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  const tiles = [];
  page.on('response', async (r) => {
    const u = r.url();
    if (!/tile|cartocdn/.test(u)) return;
    let hash = '';
    try { hash = createHash('sha256').update(await r.body()).digest('hex'); }
    catch (e) { /* abortado por el mapa al alejar */ }
    tiles.push({ url: u, status: r.status(), hash });
  });

  await page.goto(app.url, { waitUntil: 'networkidle' });
  await page.waitForSelector('.leaflet-tile-loaded', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/${app.name}-mapa.png` });

  const loaded = await page.locator('.leaflet-tile-loaded').count();
  loaded ? ok(`el mapa dibujó ${loaded} tiles`) : fail('el mapa no dibujó ningún tile');
  errors.length ? fail(`la página tiró ${errors.length} error(es) JS: ${errors[0].slice(0, 120)}`)
                : ok('sin errores JS');

  const carto = tiles.filter(t => /cartocdn/.test(t.url));
  carto.length ? fail(`${carto.length} tiles siguen saliendo de CARTO (ej. ${carto[0].url})`)
               : ok('ningún tile pedido a CARTO');

  const base = tiles.filter(t => /World_Light_Gray_Base/.test(t.url));
  const refs = tiles.filter(t => /World_Light_Gray_Reference/.test(t.url));
  base.length ? ok(`${base.length} tiles de fondo de Esri`) : fail('no se pidió ningún tile de fondo de Esri');
  refs.length ? ok(`${refs.length} tiles de nombres de Esri (el mapa no queda mudo)`)
              : fail('falta la capa World_Light_Gray_Reference: el mapa se queda sin nombres');

  const bad = tiles.filter(t => t.status >= 400);
  bad.length ? fail(`${bad.length} tiles con error HTTP (ej. ${bad[0].status} ${bad[0].url})`)
             : ok('todos los tiles respondieron 200');

  const attr = (await page.textContent('.leaflet-control-attribution').catch(() => '')) || '';
  /Esri/.test(attr) ? ok('la atribución nombra a Esri') : fail(`la atribución no nombra a Esri: "${attr.trim()}"`);
  /CARTO/i.test(attr) && fail('la atribución todavía dice CARTO');

  // Zoom a fondo sobre una ciudad: es el caso que rompe si falta `maxNativeZoom`.
  // El mapa vive dentro de un `<script type="module">` y no está en `window`, así que se
  // maneja como lo manejaría alguien: un deep-link que vuela a un pin y después rueda de
  // mouse encima del mapa.
  await page.goto(`${app.url}?hosp=${app.hosp}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.leaflet-tile-loaded', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(2500);
  tiles.length = 0;
  const box = await page.locator('#map').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, -400); await page.waitForTimeout(500); }
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/${app.name}-zoom-alto.png` });
  tiles.length ? ok(`el zoom pidió ${tiles.length} tiles nuevos`)
               : fail('el zoom no pidió ningún tile: el chequeo no probó nada');

  const empties = tiles.filter(t => t.hash === EMPTY_TILE);
  empties.length ? fail(`${empties.length} tiles de "Map data not yet available" en zoom alto — falta maxNativeZoom`)
                 : ok('el zoom alto no trajo ningún tile de "Map data not yet available"');

  // Lo que evita esos tiles es pedir siempre el nivel 16 aunque el mapa esté más cerca.
  const levels = [...new Set(tiles.filter(t => /Gray_Base/.test(t.url))
    .map(t => Number(t.url.split('/tile/')[1].split('/')[0])))];
  levels.every(z => z <= 16) ? ok(`en zoom alto sólo se pidieron niveles ≤ 16 (${levels.join(', ') || 'ninguno'})`)
                             : fail(`se pidieron niveles por encima del 16: ${levels.join(', ')}`);

  // Los otros dos `L.map` de la app usan el mismo helper: el mini-mapa de la ficha de
  // parada (`buildStopMiniMap`) y el del tramo de transporte (`buildLegMiniMap`). Los dos
  // tienen deep-link propio, así que se abren por URL en vez de a fuerza de clicks.
  for (const [param, what] of [['stop', 'la ficha de parada'], ['leg', 'la ficha del tramo']]) {
    tiles.length = 0;
    await page.goto(`${app.url}?${param}=${app.hosp}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3500);
    const mini = await page.locator('#sm-map .leaflet-tile-loaded').count();
    if (!mini) { fail(`no se pudo abrir el mini-mapa de ${what} (?${param}=${app.hosp})`); continue; }
    ok(`el mini-mapa de ${what} dibujó ${mini} tiles`);
    await page.screenshot({ path: `${OUT}/${app.name}-minimapa-${param}.png` });
    tiles.some(t => /cartocdn/.test(t.url)) ? fail(`el mini-mapa de ${what} sigue pidiéndole tiles a CARTO`)
                                            : ok(`el mini-mapa de ${what} tampoco toca CARTO`);
    tiles.some(t => /World_Light_Gray_Reference/.test(t.url))
      ? ok(`el mini-mapa de ${what} conserva los nombres`)
      : fail(`el mini-mapa de ${what} quedó sin la capa de nombres`);
  }

  await page.close();
}

await browser.close();
console.log(failures ? `\n${failures} chequeo(s) fallaron · capturas en ${OUT}`
                     : `\ntodo ok · capturas en ${OUT}`);
process.exit(failures ? 1 : 0);
