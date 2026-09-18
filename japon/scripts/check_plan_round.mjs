#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import playwright from '/usr/lib/node_modules/agent-browser/node_modules/playwright-core/index.js';
const { chromium } = playwright;

const base = process.argv[2] || 'http://127.0.0.1:8611/japon/';
const shots = process.argv[3] || path.resolve('evidence/676');
fs.mkdirSync(shots, { recursive: true });
let failed = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

const browser = await chromium.launch({ headless: true });
for (const scheme of ['light', 'dark']) {
  const page = await browser.newPage({ viewport: { width: 900, height: 760 }, colorScheme: scheme });
  await page.route('https://votos.mewis.online/**', route => route.request().method() === 'GET'
    ? route.fulfill({ json: { days: {} } }) : route.fulfill({ json: { ok: true } }));
  await page.goto(base + '?tab=dias&jornada=2026-10-14&plan=test', { waitUntil: 'domcontentloaded' });
  await page.locator('.rt-item').first().waitFor();
  const style = await page.locator('.rt-item').first().evaluate(el => {
    const row = getComputedStyle(el), badge = getComputedStyle(el.querySelector('.sg-item'), '::before');
    return { align: row.alignItems, size: badge.fontSize, line: badge.lineHeight, top: badge.top, pos: badge.position };
  });
  check(`${scheme}: filas y badge alineados`, style.align === 'center' && style.size === '9px' && style.line === '9px' && style.pos === 'static', JSON.stringify(style));
  await page.screenshot({ path: path.join(shots, `alignment-after-${scheme}.png`), fullPage: false });
  await page.addStyleTag({ content: '.rt-item,.rt-item .sg-item{align-items:baseline!important}.rt-item .sg-item::before{font-size:8.5px!important;line-height:normal!important;position:relative!important;top:2px!important}' });
  await page.screenshot({ path: path.join(shots, `alignment-before-${scheme}.png`), fullPage: false });
  await page.close();
}

const page = await browser.newPage({ viewport: { width: 900, height: 1600 } });
await page.route('https://votos.mewis.online/**', route => route.request().method() === 'GET'
  ? route.fulfill({ json: { days: {} } }) : route.fulfill({ json: { ok: true } }));
await page.goto(base + '?tab=dias&jornada=2026-10-19&plan=test', { waitUntil: 'domcontentloaded' });
const source = page.locator('.day-view .rt-item.plan-move').first();
await source.evaluate(el => { window.__dragNode = el; });
check('drop vacío ausente antes del drag', await page.locator('.day-view [data-plan-drop]').count() === 0);
check('sin copy instructivo', (await page.locator('body').innerText()).includes('Arrastrá sugerencias acá') === false);
const affordance = await source.evaluate(el => ({ grip: !!el.querySelector('.pl-grip'), cursor: getComputedStyle(el).cursor }));
check('sugerencia tiene affordance', affordance.grip && affordance.cursor === 'grab', JSON.stringify(affordance));
await page.evaluate(() => {
  window.__listReplacements = 0; window.__pointerDown = false;
  document.addEventListener('pointerdown', () => { window.__pointerDown = true; }, true);
  document.addEventListener('pointerup', () => { window.__pointerDown = false; }, true);
  new MutationObserver(ms => {
    if (!window.__pointerDown) return;
    window.__listReplacements += ms.filter(m => m.type === 'childList' && m.target.closest && m.target.closest('.rt-list,.pl-promoted-list')).length;
  }).observe(document.body, { subtree: true, childList: true });
});
const a = await source.boundingBox();
await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
await page.mouse.down();
await page.mouse.move(a.x + a.width / 2 + 12, a.y + a.height / 2, { steps: 2 });
const drop = page.locator('.day-view [data-plan-drop]');
await drop.waitFor();
check('drop aparece durante el drag', await drop.count() === 1);
const b = await drop.boundingBox();
await page.mouse.move(b.x + b.width / 2, b.y + Math.min(28, b.height / 2), { steps: 12 });
await page.screenshot({ path: path.join(shots, 'drag-gap-open.png'), fullPage: false });
await page.mouse.up();
await page.waitForTimeout(50);
check('cero reemplazos de lista durante drag', await page.evaluate(() => window.__listReplacements) === 0, String(await page.evaluate(() => window.__listReplacements)));
check('drag conserva identidad del nodo', await page.evaluate(() => window.__dragNode === document.querySelector('.day-view .pl-promoted')));
check('sin controles ↑↓', await page.locator('[data-plan-up],[data-plan-down]').count() === 0);

await page.goto(base + '?tab=dias&jornada=2026-10-14&plan=test', { waitUntil: 'domcontentloaded' });
const geibikei = page.locator('.day-view .pl-reserva').filter({ hasText: 'Geibikei' });
const text = await geibikei.innerText();
check('Geibikei fijo con salida calculada', /Salir 08:45/.test(text), text.replace(/\n/g, ' · '));
check('Geibikei avisa temporada', /temporada 2025-26, pendiente de reconfirmar/.test(text));
const checkin = page.locator('.day-view .pl-check-in').first();
check('check-in muestra límite', /Límite de check-in:/.test(await checkin.innerText()));
const beforeUrl = page.url();
await geibikei.locator('[data-day-map-act]').click();
check('link de mapa queda en la vista de día', page.url() === beforeUrl && await page.locator('.day-view:not([hidden])').count() === 1);
await page.goto(base + '?tab=dias&jornada=2026-10-31&plan=test', { waitUntil: 'domcontentloaded' });
check('check-in calcula margen contra llegada', /margen planificado 1 h 20/.test(await page.locator('.day-view .pl-check-in').innerText()));

// El plan del deep-link resuelve después del primer draw: el mapa debe incorporar
// los promovidos sin reconstruir la vista completa.
const keysPage = await browser.newPage();
await keysPage.goto(base + '?tab=dias&jornada=2026-10-18', { waitUntil: 'domcontentloaded' });
const promotedKeys = await keysPage.locator('.day-view .rt-item[data-plan-key]').evaluateAll(rows => rows.slice(0, 4).map(r => r.dataset.planKey));
await keysPage.close();
const late = await browser.newPage({ viewport: { width: 900, height: 900 } });
await late.route('https://votos.mewis.online/**', async route => {
  if (route.request().method() !== 'GET') return route.fulfill({ json: { ok: true } });
  await new Promise(resolve => setTimeout(resolve, 350));
  return route.fulfill({ json: { days: { '2026-10-18': { promoted: promotedKeys } } } });
});
await late.goto(base + '?tab=dias&jornada=2026-10-18&plan=late', { waitUntil: 'domcontentloaded' });
const initialMarkers = await late.locator('.day-view .leaflet-marker-icon').count();
await late.waitForFunction(n => document.querySelectorAll('.day-view .leaflet-marker-icon').length >= n, initialMarkers + promotedKeys.length, { timeout: 5000 });
const lateMarkers = await late.locator('.day-view .leaflet-marker-icon').count();
check('mapa deep-link incorpora plan tardío', lateMarkers >= initialMarkers + promotedKeys.length, `${initialMarkers} → ${lateMarkers}`);
await late.close();
await browser.close();
process.exit(failed ? 1 : 0);
