// Verificación del rollback a CARTO (task 564), browser de verdad contra el sitio servido.
// Chequea, en las DOS apps (principal y compartida) × sus tres mapas: que los tiles salgan
// de cartocdn, que no quede ningún pedido a Esri, que la atribución diga CARTO y que el
// zoom profundo pida el nivel real (17, 18…) — que es lo que Esri no podía dar.
// Además confirma que el mini-mapa del votar SIGUE en Esri (no se rollbackea).
import pw from '/usr/lib/node_modules/agent-browser/node_modules/playwright-core/index.js';
import { mkdirSync } from 'node:fs';
const { chromium } = pw;
const BASE = (process.argv[3] || 'http://127.0.0.1:8564/japon/').replace(/\/?$/, '/');
const OUT = process.argv[2] || '/tmp/shots-564';
mkdirSync(OUT, { recursive: true });

let failures = 0;
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const fail = (m) => { failures++; console.error('  ✗ ' + m); };
const ok = (m) => console.log('  ✓ ' + m);

const APPS = [
  { name: 'principal', url: BASE, hosp: 'kioto' },
  { name: 'compartido', url: BASE + 'compartido/', hosp: 'kioto' },
];

for (const app of APPS) {
  console.log(`\n── ${app.name} · ${app.url}`);
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  const tiles = [];
  page.on('response', (r) => {
    const u = r.url();
    if (/cartocdn|arcgisonline/.test(u)) tiles.push({ url: u, status: r.status() });
  });

  await page.goto(app.url, { waitUntil: 'networkidle' });
  await page.waitForSelector('.leaflet-tile-loaded', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/${app.name}-mapa.png` });

  const loaded = await page.locator('.leaflet-tile-loaded').count();
  loaded ? ok(`el mapa dibujó ${loaded} tiles`) : fail('el mapa no dibujó ningún tile');
  errors.length ? fail(`${errors.length} error(es) JS: ${errors[0].slice(0, 120)}`) : ok('sin errores JS');

  const carto = tiles.filter(t => /cartocdn/.test(t.url));
  const esri = tiles.filter(t => /arcgisonline/.test(t.url));
  carto.length ? ok(`${carto.length} tiles de CARTO`) : fail('no se pidió ningún tile a CARTO');
  esri.length ? fail(`${esri.length} tiles siguen saliendo de Esri (ej. ${esri[0].url})`) : ok('ningún tile pedido a Esri');
  const bad = tiles.filter(t => t.status >= 400);
  bad.length ? fail(`${bad.length} tiles con error HTTP (ej. ${bad[0].status} ${bad[0].url})`) : ok('todos los tiles respondieron 200');

  const attr = (await page.textContent('.leaflet-control-attribution').catch(() => '')) || '';
  /CARTO/i.test(attr) ? ok('la atribución nombra a CARTO') : fail(`la atribución no nombra a CARTO: "${attr.trim()}"`);
  /Esri/.test(attr) && fail('la atribución todavía dice Esri');

  // Zoom profundo: con CARTO los niveles pedidos son los reales (>16), no el 16 estirado.
  await page.goto(`${app.url}?hosp=${app.hosp}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.leaflet-tile-loaded', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(2500);
  tiles.length = 0;
  const box = await page.locator('#map').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, -400); await page.waitForTimeout(500); }
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/${app.name}-zoom-alto.png` });
  tiles.length ? ok(`el zoom pidió ${tiles.length} tiles nuevos`) : fail('el zoom no pidió ningún tile: no probó nada');
  const levels = [...new Set(tiles.filter(t => /cartocdn/.test(t.url))
    .map(t => Number(t.url.split('/light_all/')[1].split('/')[0])))].sort((a, b) => a - b);
  levels.some(z => z > 16) ? ok(`en zoom alto se pidieron niveles nativos > 16 (${levels.join(', ')}) — nítido, sin estirar`)
                           : fail(`no se pidió ningún nivel > 16: ${levels.join(', ') || 'ninguno'}`);

  for (const [param, what] of [['stop', 'la ficha de parada'], ['leg', 'la ficha del tramo']]) {
    tiles.length = 0;
    await page.goto(`${app.url}?${param}=${app.hosp}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3500);
    const mini = await page.locator('#sm-map .leaflet-tile-loaded').count();
    if (!mini) { fail(`no se pudo abrir el mini-mapa de ${what} (?${param}=${app.hosp})`); continue; }
    ok(`el mini-mapa de ${what} dibujó ${mini} tiles`);
    await page.screenshot({ path: `${OUT}/${app.name}-minimapa-${param}.png` });
    tiles.some(t => /cartocdn/.test(t.url)) ? ok(`el mini-mapa de ${what} va con CARTO`)
                                            : fail(`el mini-mapa de ${what} no pidió tiles a CARTO`);
    tiles.some(t => /arcgisonline/.test(t.url)) && fail(`el mini-mapa de ${what} sigue pidiéndole tiles a Esri`);
  }
  await page.close();
}

// El votar NO se rollbackea: tiene que seguir en Esri. Sus cards (y con ellas los
// mini-mapas) sólo existen con un link personal (?u=<token>), así que acá se chequea el
// fuente servido y no el render — la prueba en browser de esos mapas es la de la 559.
console.log('\n── votar (no se toca) · ' + BASE + 'votar/app.js');
{
  const src = await (await fetch(BASE + 'votar/app.js')).text();
  /arcgisonline/.test(src) ? ok('votar/app.js sigue apuntando a Esri')
                           : fail('votar/app.js ya no apunta a Esri: ¿se rollbackeó de más?');
  /cartocdn/.test(src) && fail('votar/app.js volvió a CARTO y no debía');
}

await browser.close();
console.log(failures ? `\n${failures} chequeo(s) fallaron · capturas en ${OUT}` : `\ntodo ok · capturas en ${OUT}`);
process.exit(failures ? 1 : 0);
