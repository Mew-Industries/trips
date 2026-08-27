import pw from '/usr/lib/node_modules/agent-browser/node_modules/playwright-core/index.js';
import { mkdirSync } from 'node:fs';

const { chromium } = pw;
const base = process.argv[2] || 'http://127.0.0.1:8611/japon/';
const out = process.argv[3] || '/tmp/japon-activity-flat';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
let failed = 0;
for (const width of [1280, 390]) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  page.on('pageerror', error => { console.error(`FAIL ${width}px pageerror: ${error}`); failed++; });
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('.dest-card .qh-toggle', { state: 'attached' });
  const card = page.locator('.dest-card:has(.qh-toggle)').first();
  await card.locator('.itin-head').click();
  const result = await card.evaluate(el => {
    const rows = [...el.querySelectorAll('.activity-list .thing-row')];
    return {
      flatList: !!el.querySelector('.activity-list'),
      neighborhoodNav: el.querySelectorAll('.hood-group, .hood-head').length,
      total: rows.length,
      visible: rows.filter(row => !row.hidden).length,
      searchGone: !document.querySelector('.activity-search'),
    };
  });
  const chip = card.locator('.activity-chip').first();
  await chip.click();
  const filtered = await card.evaluate(el => {
    const visible = [...el.querySelectorAll('.activity-list .thing-row')].filter(row => getComputedStyle(row).display !== 'none');
    const active = el.querySelector('.activity-chip.on');
    return {
      active: active?.dataset.activityChip || '',
      visible: visible.length,
      allMatch: visible.length > 0 && visible.every(row => row.dataset.activityCat === active?.dataset.activityChip),
      searchGone: !document.querySelector('.activity-search'),
      categoriesInline: [...el.querySelectorAll('.activity-list .thing-row')].every(row => !!row.querySelector('.activity-category')),
    };
  });
  const ok = result.flatList && result.neighborhoodNav === 0 && result.total > 0 && result.searchGone &&
    filtered.active && filtered.allMatch && filtered.searchGone && filtered.categoriesInline;
  console.log(`${ok ? 'ok' : 'FAIL'} ${width}px · ${result.total} actividades planas · buscador=${!filtered.searchGone} · chip=${filtered.active} · visibles=${filtered.visible}`);
  if (!ok) failed++;
  await card.screenshot({ path: `${out}/activities-${width}.png` });
  await page.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
