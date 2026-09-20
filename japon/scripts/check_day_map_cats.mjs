#!/usr/bin/env node
// Browser acceptance de la task 697: los chips de categoría (.map-cats) viven también
// en el mapita de la vista de jornada y en el foco de día del mapa principal, con UN
// SOLO estado (`activeCats` / ?cat=). Filtran sugerencias y pines del día; el plan
// (promovidos/anclas, camas, terminales) se dibuja siempre en la jornada.
//
// Necesita Chromium y el sitio servido:
//   python3 -m http.server 8611 --bind 127.0.0.1   (desde la raíz del repo)
//   node japon/scripts/check_day_map_cats.mjs [baseUrl] [outdir]
import pw from '/usr/lib/node_modules/agent-browser/node_modules/playwright-core/index.js';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const { chromium } = pw;
const BASE = process.argv[2] || 'http://127.0.0.1:8611/japon/';
const OUT = process.argv[3] || '/tmp/task-697';
mkdirSync(OUT, { recursive: true });

// La lista de categorías sale del archivo, no de lo que dibujó la página: los chips
// tienen que seguir a CAT_ORDER solos cuando entre una categoría nueva.
const DIR = join(dirname(fileURLToPath(import.meta.url)), '..');
const sandbox = { window: {} };
vm.runInNewContext(readFileSync(join(DIR, 'data/categories.js'), 'utf8'), sandbox);
const TAX = sandbox.window.PLACE_TAXONOMY;
const N = TAX.order.length;

let failed = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
page.on('pageerror', e => { console.log('pageerror', String(e)); failed++; });

const JORNADA = '2026-10-14';
const dayMapState = () => page.locator('[data-day-map]').evaluate(root => ({
  chips: root.querySelectorAll('.map-cats .mc:not(.mc-all)').length,
  off: [...root.querySelectorAll('.map-cats .mc.off')].map(b => b.textContent.trim()),
  todoVisible: !!root.querySelector('.map-cats .mc-all:not([hidden])'),
  sug: root.querySelectorAll('.pp').length,
  food: [...root.querySelectorAll('.pp-emoji')].filter(e => e.textContent === '🍜').length,
  numbered: root.querySelectorAll('.rt-ord').length,
  beds: root.querySelectorAll('.lodging-marker').length,
}));
const open = async (params) => {
  await page.goto(BASE + params, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1500);
};

// 1) Jornada con todo prendido: barra completa, nada apagado, sugerencias y plan.
await open('?tab=dias&jornada=' + JORNADA);
const all = await dayMapState();
check('la jornada monta .map-cats con un chip por categoría (' + N + ')', all.chips === N, all.chips + ' chips');
check('con todo prendido: ningún chip apagado y sin botón Todo', all.off.length === 0 && !all.todoVisible, JSON.stringify(all.off));
check('hay sugerencias dibujadas y hay comida entre ellas', all.sug > 0 && all.food > 0, `${all.sug} sugerencias, ${all.food} 🍜`);
check('hay plan dibujado (paradas numeradas o camas)', all.numbered + all.beds > 0, `${all.numbered} números, ${all.beds} camas`);
await page.locator('[data-day-map]').screenshot({ path: `${OUT}/jornada-todas.png` });

// 2) Comida apagada por URL: los 🍜 desaparecen de las sugerencias; el plan queda.
const sinComida = TAX.order.filter(c => c !== 'comida').join(',');
await open('?tab=dias&jornada=' + JORNADA + '&cat=' + sinComida);
const off = await dayMapState();
check('sin comida no queda ningún 🍜 entre las sugerencias', off.food === 0, off.food + ' 🍜');
check('las anclas y camas del plan siguen dibujadas', off.numbered === all.numbered && off.beds === all.beds,
  `${off.numbered}/${all.numbered} números, ${off.beds}/${all.beds} camas`);
check('el chip de comida es el único apagado y aparece Todo', off.off.length === 1 && off.todoVisible, JSON.stringify(off.off));
await page.locator('[data-day-map]').screenshot({ path: `${OUT}/jornada-sin-comida.png` });

// 3) Tocar el chip apagado refiltra en vivo: vuelven los 🍜, sin recargar.
await page.locator('[data-day-map] .map-cats .mc', { hasText: TAX.meta.comida.label }).first().click();
await page.waitForTimeout(400);
const back = await dayMapState();
check('tocar el chip devuelve los 🍜 (mismos totales que con todo prendido)',
  back.food === all.food && back.sug === all.sug && back.off.length === 0, `${back.food} 🍜, ${back.sug} sugerencias`);

// 4) AC3 — ?cat=parque abre la jornada ya filtrada, con 🌳 como único chip prendido.
await open('?tab=dias&jornada=' + JORNADA + '&cat=parque');
const parque = await dayMapState();
const parqueOn = await page.locator('[data-day-map]').evaluate((root, label) =>
  [...root.querySelectorAll('.map-cats .mc:not(.mc-all)')].filter(b => !b.classList.contains('off')).map(b => b.textContent.trim())
    .join(',') === label, TAX.meta.parque.label);
check('?cat=parque: el único chip prendido es 🌳 y no hay 🍜', parqueOn && parque.off.length === N - 1 && parque.food === 0,
  `${parque.off.length} apagados, ${parque.food} 🍜`);
await page.locator('[data-day-map]').screenshot({ path: `${OUT}/jornada-cat-parque.png` });

// 5) AC2 — en el mapa principal, enfocar un día desde la lista deja los chips
// visibles y filtrando: aislar comida esconde los números de las otras categorías.
const desk = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1 });
desk.on('pageerror', e => { console.log('pageerror', String(e)); failed++; });
await desk.goto(BASE + '?tab=dias', { waitUntil: 'networkidle', timeout: 60000 });
await desk.waitForTimeout(1200);
await desk.locator('.dy-map[data-day="' + JORNADA + '"]').first().click();
await desk.waitForTimeout(1500);
const focus = await desk.evaluate(() => {
  const m = document.querySelector('#map');
  const bar = m.querySelector('.map-cats');
  return {
    dayFocus: m.classList.contains('day-focus'),
    barVisible: !!bar && getComputedStyle(bar.closest('.map-bars')).display !== 'none' && bar.getClientRects().length > 0,
    numbered: m.querySelectorAll('.rt-ord').length,
    foodNumbered: [...m.querySelectorAll('.rt-ord .rt-ord-cat')].filter(e => e.textContent === '🍜').length,
  };
});
check('el foco de día deja la barra de chips visible', focus.dayFocus && focus.barVisible, JSON.stringify(focus));
check('el día enfocado tiene recorrido numerado', focus.numbered > 0, focus.numbered + ' números');
await desk.locator('#map').screenshot({ path: `${OUT}/foco-todas.png` });
const comidaChip = desk.locator('#map .map-cats .mc', { hasText: TAX.meta.comida.label }).first();
await comidaChip.click();   // con todo prendido, un click aísla comida
await desk.waitForTimeout(400);
const isolated = await desk.evaluate(() => ({
  numbered: document.querySelectorAll('#map .rt-ord').length,
  offChips: document.querySelectorAll('#map .map-cats .mc.off').length,
}));
check('aislar comida en el foco esconde los números de otras categorías',
  isolated.numbered === focus.foodNumbered && isolated.offChips === N - 1,
  `${isolated.numbered} números vs ${focus.foodNumbered} de comida, ${isolated.offChips} chips apagados`);
await desk.locator('#map').screenshot({ path: `${OUT}/foco-solo-comida.png` });
await desk.locator('#map .map-cats .mc-all').click();
await desk.waitForTimeout(400);
const restored = await desk.evaluate(() => document.querySelectorAll('#map .rt-ord').length);
check('Todo restaura el recorrido completo del foco', restored === focus.numbered, restored + ' números');

await browser.close();
console.log(failed ? `\nFAIL ${failed}` : '\nOK todas');
process.exit(failed ? 1 : 0);
