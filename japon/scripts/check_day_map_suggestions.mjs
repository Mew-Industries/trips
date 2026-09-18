#!/usr/bin/env node
// Browser acceptance for task 689. Serve the parent commit and the working tree on
// loopback, then pass their /japon/ URLs as argv 2 and 3.
import pw from '/usr/lib/node_modules/agent-browser/node_modules/playwright-core/index.js';
import { mkdirSync } from 'node:fs';

const { chromium } = pw;
const BEFORE = process.argv[2] || 'http://127.0.0.1:8612/japon/';
const AFTER = process.argv[3] || 'http://127.0.0.1:8611/japon/';
const OUT = process.argv[4] || '/tmp/task-689';
mkdirSync(OUT, { recursive: true });
let failed = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
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

await open(BEFORE, 'antes-390.png');
const before = await page.locator('[data-day-map]').evaluate(root => ({
  suggestions: root.querySelectorAll('.pp').length,
  numbered: root.querySelectorAll('.rt-ord').length,
}));

await open(AFTER, 'despues-390.png');
const state = await page.locator('[data-day-map]').evaluate(root => ({
  suggestions: root.querySelectorAll('.pp').length,
  emojis: [...root.querySelectorAll('.pp-emoji')].filter(e => getComputedStyle(e).display !== 'none').length,
  numbered: root.querySelectorAll('.rt-ord').length,
  numberedWithCategory: root.querySelectorAll('.rt-ord .rt-ord-cat').length,
  mapWidth: Math.round(root.getBoundingClientRect().width),
  categories: [...new Set([...root.querySelectorAll('.pp-emoji')].map(e => e.textContent))],
}));
const listed = await page.locator('.dv-sug .sg-wrap [data-plan-key]').count();
check('antes no había sugerencias en el mapa', before.suggestions === 0, JSON.stringify(before));
check('el 9/10 dibuja las mismas sugerencias de la lista', state.suggestions === listed && listed === 43,
  `${state.suggestions} pines / ${listed} en la lista`);
check('cada sugerencia visible lleva emoji', state.emojis === state.suggestions, `${state.emojis}/${state.suggestions}`);
check('hay comida, parques y templos', ['🍜', '🎢', '⛩️'].every(x => state.categories.includes(x)), state.categories.join(' '));
check('la parada numerada suma su categoría', state.numbered > 0 && state.numberedWithCategory === state.numbered,
  `${state.numberedWithCategory}/${state.numbered}`);
check('la captura usa ancho de teléfono', state.mapWidth > 330 && state.mapWidth <= 390, `${state.mapWidth}px`);

// El click real sobre una sugerencia tiene que atravesar el divIcon y abrir el popup.
await page.locator('[data-day-map]').evaluate(root => {
  const rr = root.getBoundingClientRect();
  const pin = [...root.querySelectorAll('.pp')].find(p => {
    const r = p.getBoundingClientRect();
    return r.left >= rr.left && r.right <= rr.right && r.top >= rr.top && r.bottom <= rr.bottom;
  });
  if (pin) pin.click();
});
await page.waitForTimeout(250);
check('clickear una sugerencia abre su popup', await page.locator('[data-day-map] .leaflet-popup').count() === 1);

await browser.close();
console.log(failed ? `\nFAIL ${failed}` : '\nOK 7/7');
process.exit(failed ? 1 : 0);
