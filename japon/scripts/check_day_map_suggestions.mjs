#!/usr/bin/env node
// Browser acceptance for tasks 689 (sugerencias en el mapita) + 698 (atenuadas).
// Serve the parent commit and the working tree on loopback, then pass their
// /japon/ URLs as argv 2 and 3.
import pw from '/usr/lib/node_modules/agent-browser/node_modules/playwright-core/index.js';
import { mkdirSync } from 'node:fs';

const { chromium } = pw;
const BEFORE = process.argv[2] || 'http://127.0.0.1:8612/japon/';
const AFTER = process.argv[3] || 'http://127.0.0.1:8611/japon/';
const OUT = process.argv[4] || '/tmp/task-698';
mkdirSync(OUT, { recursive: true });
let failed = 0, ran = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
  ran++;
  if (!ok) failed++;
};

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
page.on('pageerror', e => { console.log('pageerror', String(e)); failed++; });

async function open(url, shot) {
  const target = new URL(url);
  target.searchParams.set('tab', 'dias');
  target.searchParams.set('jornada', '2026-10-09');
  await page.goto(target.href, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1800);
  await page.locator('[data-day-map]').screenshot({ path: `${OUT}/${shot}` });
}

const snapshot = root => ({
  suggestions: root.querySelectorAll('.pp').length,
  dimmed: root.querySelectorAll('.pp.pp-sug').length,
  opacities: [...new Set([...root.querySelectorAll('.pp')].map(p => getComputedStyle(p).opacity))],
  emojis: [...root.querySelectorAll('.pp-emoji')].filter(e => getComputedStyle(e).display !== 'none').length,
  numbered: root.querySelectorAll('.rt-ord').length,
  numberedWithCategory: root.querySelectorAll('.rt-ord .rt-ord-cat').length,
  numberedOpacities: [...new Set([...root.querySelectorAll('.rt-ord')].map(p => getComputedStyle(p).opacity))],
  mapWidth: Math.round(root.getBoundingClientRect().width),
  categories: [...new Set([...root.querySelectorAll('.pp-emoji')].map(e => e.textContent))],
});

await open(BEFORE, 'antes-390.png');
const before = await page.locator('[data-day-map]').evaluate(snapshot);
check('antes: las sugerencias iban a plena opacidad y con emoji',
  before.suggestions > 0 && before.opacities.every(o => o === '1') && before.emojis === before.suggestions,
  JSON.stringify({ suggestions: before.suggestions, opacities: before.opacities, emojis: before.emojis }));

await open(AFTER, 'despues-390.png');
const state = await page.locator('[data-day-map]').evaluate(snapshot);
const listed = await page.locator('.dv-sug .sg-wrap [data-plan-key]').count();
check('el 9/10 dibuja las mismas sugerencias de la lista', state.suggestions === listed && listed === 43,
  `${state.suggestions} pines / ${listed} en la lista`);
check('toda sugerencia lleva la clase atenuada', state.dimmed === state.suggestions,
  `${state.dimmed}/${state.suggestions}`);
check('en reposo la sugerencia queda apagada (opacidad ≤ 0.4)',
  state.opacities.length === 1 && parseFloat(state.opacities[0]) <= 0.4, state.opacities.join(' '));
check('en reposo la sugerencia no muestra emoji', state.emojis === 0, `${state.emojis} visibles`);
check('hay comida, parques y templos (en el DOM, para el hover)',
  ['🍜', '🎢', '⛩️'].every(x => state.categories.includes(x)), state.categories.join(' '));
check('la parada numerada suma su categoría', state.numbered > 0 && state.numberedWithCategory === state.numbered,
  `${state.numberedWithCategory}/${state.numbered}`);
check('los pines numerados no se atenúan',
  state.numberedOpacities.length === 1 && state.numberedOpacities[0] === '1', state.numberedOpacities.join(' '));
check('la captura usa ancho de teléfono', state.mapWidth > 330 && state.mapWidth <= 390, `${state.mapWidth}px`);

// Un pin bien adentro del mapa para hover + click (el mismo para los dos gestos).
const target = await page.locator('[data-day-map]').evaluate(root => {
  const rr = root.getBoundingClientRect();
  const pin = [...root.querySelectorAll('.pp')].find(p => {
    const r = p.getBoundingClientRect();
    return r.left >= rr.left + 20 && r.right <= rr.right - 20 && r.top >= rr.top + 20 && r.bottom <= rr.bottom - 60;
  });
  if (!pin) return null;
  pin.setAttribute('data-check-target', '1');
  const r = pin.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
});
check('hay un pin de sugerencia hovereable dentro del encuadre', !!target);

if (target) {
  await page.mouse.move(target.x, target.y);
  await page.waitForTimeout(350);
  const hovered = await page.locator('[data-check-target]').evaluate(p => ({
    opacity: getComputedStyle(p).opacity,
    emoji: getComputedStyle(p.querySelector('.pp-emoji')).display,
    width: Math.round(p.getBoundingClientRect().width),
  }));
  check('hover: la sugerencia vuelve nítida con su emoji',
    hovered.opacity === '1' && hovered.emoji !== 'none' && hovered.width > 12, JSON.stringify(hovered));
  await page.locator('[data-day-map]').screenshot({ path: `${OUT}/hover-390.png` });

  // El click real sobre la sugerencia atenuada abre el popup y la sostiene nítida
  // (`.active` via popupopen) aunque el mouse se vaya — el camino del tap.
  await page.mouse.click(target.x, target.y);
  await page.waitForTimeout(300);
  await page.mouse.move(5, 5);
  await page.waitForTimeout(300);
  const opened = await page.locator('[data-check-target]').evaluate(p => ({
    active: p.classList.contains('active'),
    opacity: getComputedStyle(p).opacity,
  }));
  check('clickear una sugerencia abre su popup', await page.locator('[data-day-map] .leaflet-popup').count() === 1);
  check('con el popup abierto el pin queda nítido sin hover',
    opened.active && opened.opacity === '1', JSON.stringify(opened));
}

// Promoción en vivo (698 · AC2): con el plan editable y su API mockeada, arrastrar
// una sugerencia al itinerario tiene que volverla pin numerado nítido en el acto,
// sin recargar la página.
const edit = await browser.newPage({ viewport: { width: 900, height: 1100 } });
await edit.route('https://votos.mewis.online/**', route => {
  const cors = {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,PUT,OPTIONS',
    'access-control-allow-headers': 'content-type',
  };
  if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
  if (route.request().method() === 'GET') return route.fulfill({ json: { days: {} }, headers: cors });
  return route.fulfill({ json: { ok: true }, headers: cors });
});
const editUrl = new URL(AFTER);
editUrl.searchParams.set('tab', 'dias');
editUrl.searchParams.set('jornada', '2026-10-09');
editUrl.searchParams.set('plan', 'check-698');
await edit.goto(editUrl.href, { waitUntil: 'networkidle', timeout: 60000 });
await edit.waitForTimeout(1800);
await edit.evaluate(() => { window.__sinRecargar = true; });
const mapCounts = root => ({
  numbered: root.querySelectorAll('.rt-ord').length,
  suggestions: root.querySelectorAll('.pp.pp-sug').length,
});
const pre = await edit.locator('[data-day-map]').evaluate(mapCounts);
const row = edit.locator('.dv-inner .sg-wrap .rt-item.plan-move').first();
await row.scrollIntoViewIfNeeded();
const rowBox = await row.boundingBox();
await edit.mouse.move(rowBox.x + rowBox.width / 2, rowBox.y + rowBox.height / 2);
await edit.mouse.down();
await edit.mouse.move(rowBox.x + rowBox.width / 2 + 18, rowBox.y + rowBox.height / 2 + 18, { steps: 4 });
await edit.waitForTimeout(150);
const dropBox = await edit.locator('.dv-inner [data-plan-drop="2026-10-09"]').boundingBox();
await edit.mouse.move(dropBox.x + dropBox.width / 2, dropBox.y + dropBox.height / 2, { steps: 12 });
await edit.waitForTimeout(150);
await edit.mouse.up();
await edit.waitForTimeout(600);
const post = await edit.locator('[data-day-map]').evaluate(mapCounts);
const stayed = await edit.evaluate(() => window.__sinRecargar === true);
check('promover una sugerencia la vuelve pin numerado en el acto',
  post.numbered === pre.numbered + 1 && post.suggestions === pre.suggestions - 1,
  `numerados ${pre.numbered}→${post.numbered}, sugerencias ${pre.suggestions}→${post.suggestions}`);
check('la promoción no recargó la página', stayed);
await edit.locator('[data-day-map]').screenshot({ path: `${OUT}/promovida-390.png` });

await browser.close();
console.log(failed ? `\nFAIL ${failed}` : `\nOK ${ran}/${ran}`);
process.exit(failed ? 1 : 0);
