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
  await page.goto(base + '?q=ramen', { waitUntil: 'domcontentloaded', timeout: 60000 });
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
      query: new URLSearchParams(location.search).get('q'),
    };
  });
  const chip = card.locator('.activity-chip').first();
  await chip.click();
  const filtered = await card.evaluate(el => {
    const visible = [...el.querySelectorAll('.activity-list .thing-row')].filter(row => !row.hidden);
    const active = el.querySelector('.activity-chip.on');
    return { active: active?.dataset.activityChip || '', allMatch: visible.every(row => row.dataset.activityCat === active?.dataset.activityChip) };
  });
  const ok = result.flatList && result.neighborhoodNav === 0 && result.total > 0 && result.query === 'ramen' && filtered.active && filtered.allMatch;
  console.log(`${ok ? 'ok' : 'FAIL'} ${width}px · ${result.total} actividades planas · q=${result.query} · chip=${filtered.active}`);
  if (!ok) failed++;
  await card.screenshot({ path: `${out}/activities-${width}.png` });
  await page.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
