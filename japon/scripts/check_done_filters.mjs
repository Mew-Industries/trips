#!/usr/bin/env node
// Browser acceptance for task 700: tachar una actividad la saca de las sugerencias
// (de todos los días, sin recargar) y atenúa sus pines en el mapa principal y en el
// de la jornada; destachar la devuelve. Los endpoints de checklist y plan van
// mockeados: el check no escribe estado real.
// Uso: node scripts/check_done_filters.mjs [urlBase] [outDir]
import pw from '/usr/lib/node_modules/agent-browser/node_modules/playwright-core/index.js';
import { mkdirSync } from 'node:fs';

const { chromium } = pw;
const BASE = process.argv[2] || 'http://127.0.0.1:8611/japon/';
const OUT = process.argv[3] || '/tmp/task-700';
const DAY = '2026-10-09';
mkdirSync(OUT, { recursive: true });
let failed = 0, ran = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
  ran++;
  if (!ok) failed++;
};

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });

// El estado remoto mockeado vive acá: el GET del checklist devuelve `done`, los POST
// se anotan. El plan igual, con una promovida cuando la fase lo pide.
const state = { done: [], posts: [], plan: {} };
async function newPage(viewport) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  page.on('pageerror', e => { console.log('pageerror', String(e)); failed++; });
  await page.route('https://japon-checklist.mewis.online/**', route => {
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'content-type' };
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    if (route.request().method() === 'GET') return route.fulfill({ json: { done: state.done }, headers: cors });
    state.posts.push(JSON.parse(route.request().postData() || '{}'));
    return route.fulfill({ json: { ok: true }, headers: cors });
  });
  await page.route('https://votos.mewis.online/**', route => {
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,PUT,OPTIONS', 'access-control-allow-headers': 'content-type' };
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    if (route.request().method() === 'GET') return route.fulfill({ json: { days: state.plan }, headers: cors });
    return route.fulfill({ json: { ok: true }, headers: cors });
  });
  return page;
}
const jornadaUrl = (extra = {}) => {
  const u = new URL(BASE);
  u.searchParams.set('tab', 'dias');
  u.searchParams.set('jornada', DAY);
  Object.entries(extra).forEach(([k, v]) => u.searchParams.set(k, v));
  return u.href;
};
const sugKeys = page => page.evaluate(() =>
  [...document.querySelectorAll('.dv-sug .sg-wrap [data-plan-key]')].map(r => r.dataset.planKey));

// ---------------------------------------------------------------- AC1 · tachar filtra
const page = await newPage({ width: 900, height: 1100 });
await page.goto(jornadaUrl(), { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(1800);
await page.evaluate(() => { window.__sinRecargar = true; });

const before = await sugKeys(page);
check('el 9/10 arranca con sugerencias listadas', before.length > 0, `${before.length}`);
const KEY = before[0];

// El círculo vive en el catálogo de la ciudad: se abre y se tacha ahí, con mouse real.
await page.locator('.dv-sug .sg-all > summary').first().click();
await page.waitForTimeout(400);
const row = page.locator(`.dv-sug .sg-all [data-check="${KEY}"]`).first();
await row.scrollIntoViewIfNeeded();
await row.locator('.activity-check').click();
await page.waitForTimeout(600);

const after = await sugKeys(page);
check('AC1 · tachar la saca de las sugerencias del día en el acto',
  !after.includes(KEY) && after.length === before.length - 1, `${before.length} → ${after.length}`);
check('AC1 · el contador de la sección acompaña', await page.evaluate((n) =>
  document.querySelector('.dv-sug .sg-title span')?.textContent.trim() === String(n), after.length));
const pinDone = await page.evaluate((key) => {
  const pin = document.querySelector(`[data-day-map] .pp[data-id="${CSS.escape(key)}"]`);
  return pin && { done: pin.classList.contains('pp-done'), opacity: getComputedStyle(pin).opacity };
}, KEY);
check('AC3 · en el mapita de la jornada su pin queda atenuado',
  !!pinDone && pinDone.done && parseFloat(pinDone.opacity) <= 0.4, JSON.stringify(pinDone));
await page.locator('[data-day-map]').screenshot({ path: `${OUT}/ac1-jornada-tachada.png` });

// Y en los DEMÁS días: la lista de tarjetas renderiza el viaje entero.
await page.locator('.dv-close').click();
await page.waitForTimeout(800);
const inCards = await page.evaluate((key) =>
  document.querySelectorAll(`#view-dias .sg-wrap [data-plan-key="${CSS.escape(key)}"]`).length, KEY);
check('AC1 · tampoco se ofrece en ningún otro día', inCards === 0, `${inCards} apariciones`);

// Destachar desde el catálogo la devuelve, también sin recargar. El catálogo se
// llena lazy: se reabre el details de la ciudad y recién ahí está la fila hecha.
await page.goBack();
await page.waitForTimeout(800);
await page.locator('.dv-sug .sg-all > summary').first().click();
await page.waitForTimeout(400);
const doneRow = page.locator(`.dv-sug .activity-done-list [data-check="${KEY}"]`).first();
await page.locator('.dv-sug .activity-done > summary').first().click();
await doneRow.scrollIntoViewIfNeeded();
await doneRow.locator('.activity-check').click();
await page.waitForTimeout(600);
const restored = await sugKeys(page);
check('AC1 · destachar la devuelve a las sugerencias', restored.includes(KEY), `${restored.length}`);
check('AC3 · el pin de la jornada vuelve (sin atenuar de hecho)', await page.evaluate((key) => {
  const pin = document.querySelector(`[data-day-map] .pp[data-id="${CSS.escape(key)}"]`);
  return pin && !pin.classList.contains('pp-done');
}, KEY));
check('AC1 · todo pasó sin recargar la página', await page.evaluate(() => window.__sinRecargar === true));
check('AC1 · los cambios se sincronizaron al endpoint',
  state.posts.some(p => p.id === KEY && p.done === true) && state.posts.some(p => p.id === KEY && p.done === false),
  JSON.stringify(state.posts));
await page.close();

// ------------------------------------------------- AC2 · promovida y tachada se queda
state.plan = { [DAY]: { promoted: [KEY] } };
state.done = [];
const edit = await newPage({ width: 900, height: 1100 });
await edit.goto(jornadaUrl({ plan: 'check-700' }), { waitUntil: 'networkidle', timeout: 60000 });
await edit.waitForTimeout(1800);
await edit.evaluate(() => { window.__sinRecargar = true; });
const promoted = edit.locator(`.dv-fijo .pl-promoted[data-plan-key="${KEY}"]`);
check('AC2 · la promovida está en el itinerario', await promoted.count() === 1);
check('AC2 · promovida no se ofrece como sugerencia', !(await sugKeys(edit)).includes(KEY));
await promoted.scrollIntoViewIfNeeded();
await promoted.locator('.activity-check').click();
await edit.waitForTimeout(600);
check('AC2 · tachada sigue en el itinerario, tachada',
  await promoted.count() === 1 && await promoted.locator('.pl-mainrow.is-done').count() === 1);
const ordDone = await edit.evaluate(() => {
  const ord = document.querySelector('[data-day-map] .rt-ord.pp-done');
  return ord && { opacity: getComputedStyle(ord).opacity };
});
check('AC3 · su pin numerado del mapita descansa atenuado',
  !!ordDone && parseFloat(ordDone.opacity) <= 0.4, JSON.stringify(ordDone));
check('AC2 · sin recargar', await edit.evaluate(() => window.__sinRecargar === true));
await edit.locator('.dv-fijo').scrollIntoViewIfNeeded();
await edit.screenshot({ path: `${OUT}/ac2-promovida-tachada.png` });
await edit.close();

// ---------------------------------- AC3 · mapa principal: atenuado, popup, destachar
state.plan = {};
state.done = [KEY];   // llega del server (hydrate), como entre dispositivos
state.posts = [];
const main = await newPage({ width: 1200, height: 900 });
await main.goto(jornadaUrl(), { waitUntil: 'networkidle', timeout: 60000 });
await main.waitForTimeout(2200);
check('AC1 · lo tachado que trae el server tampoco se ofrece', !(await sugKeys(main)).includes(KEY));

// "Abrir en el mapa" desde el catálogo (fila ya hecha): cierra la jornada, vuela el
// mapa principal al pin y abre su popup — el camino real de un tap.
await main.locator('.dv-sug .sg-all > summary').first().click();
await main.locator('.dv-sug .activity-done > summary').first().click();
const mainRow = main.locator(`.dv-sug .activity-done-list [data-check="${KEY}"]`).first();
await mainRow.scrollIntoViewIfNeeded();
await mainRow.locator('[data-act]').click();
await main.waitForTimeout(1600);

const mainPin = await main.evaluate((key) => {
  const pin = document.querySelector(`#map .pp[data-id="${CSS.escape(key)}"]`);
  return pin && {
    done: pin.classList.contains('pp-done'),
    active: pin.classList.contains('active'),
    opacity: getComputedStyle(pin).opacity,
    popup: !!document.querySelector('#map .leaflet-popup .pop-check'),
    popupDone: !!document.querySelector('#map .leaflet-popup .pop-check.is-done'),
  };
}, KEY);
check('AC3 · en el mapa principal el pin tachado lleva pp-done', !!mainPin && mainPin.done, JSON.stringify(mainPin));
check('AC3 · su popup abre y trae el círculo, y el pin se sostiene nítido',
  !!mainPin && mainPin.popup && mainPin.active && mainPin.opacity === '1');
check('AC3 · el círculo del popup abre mostrando el estado (✓ hecha)', !!mainPin && mainPin.popupDone);
await main.screenshot({ path: `${OUT}/ac3-popup-mapa-principal.png` });

// Destachar DESDE el popup, con mouse real.
await main.locator('#map .leaflet-popup .pop-check .activity-check').click();
await main.waitForTimeout(600);
const undone = await main.evaluate((key) => {
  const pin = document.querySelector(`#map .pp[data-id="${CSS.escape(key)}"]`);
  return pin && { done: pin.classList.contains('pp-done'), isDone: !!document.querySelector('#map .leaflet-popup .pop-check.is-done') };
}, KEY);
check('AC3 · destachar desde el popup lo devuelve a pleno', !!undone && !undone.done && !undone.isDone, JSON.stringify(undone));
check('AC3 · el destachado se sincronizó', state.posts.some(p => p.id === KEY && p.done === false), JSON.stringify(state.posts));

// El reposo del pin tachado en el mapa principal, medido de verdad: se re-tacha desde
// el popup y se cierra (tecla Escape no hay: click lejos del pin).
await main.locator('#map .leaflet-popup .pop-check .activity-check').click();
await main.waitForTimeout(400);
await main.locator('#map .leaflet-popup-close-button').click();
await main.waitForTimeout(500);
await main.mouse.move(5, 5);
await main.waitForTimeout(400);
const resting = await main.evaluate((key) => {
  const pin = document.querySelector(`#map .pp[data-id="${CSS.escape(key)}"]`);
  return pin && { done: pin.classList.contains('pp-done'), opacity: getComputedStyle(pin).opacity, w: Math.round(pin.getBoundingClientRect().width) };
}, KEY);
check('AC3 · en reposo el pin tachado del mapa principal queda apagado (≤0.4, punto)',
  !!resting && resting.done && parseFloat(resting.opacity) <= 0.4 && resting.w <= 14, JSON.stringify(resting));
await main.screenshot({ path: `${OUT}/ac3-pin-apagado-portada.png` });
await main.close();

await browser.close();
console.log(failed ? `\nFAIL ${failed}` : `\nOK ${ran}/${ran}`);
process.exit(failed ? 1 : 0);
