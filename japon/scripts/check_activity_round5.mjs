import pw from '/usr/lib/node_modules/agent-browser/node_modules/playwright-core/index.js';
import { mkdirSync } from 'node:fs';

const { chromium } = pw;
const base = process.argv[2] || 'http://127.0.0.1:8611/japon/';
const out = process.argv[3] || '/tmp/japon-activity-round6';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
let failed = 0;

for (const [label, width] of [['desktop', 1280], ['mobile', 390]]) {
  const page = await browser.newPage({ viewport: { width, height: 800 } });
  await page.addInitScript(() => localStorage.clear());
  await page.route('https://japon-checklist.mewis.online/**', route => {
    if (route.request().method() === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', body: '{"done":[]}' });
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
  });
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60000 });
  const card = page.locator('.dest-card', { hasText: 'Shinjuku' }).first();
  await card.locator('.itin-head').click();
  if (!(await card.locator('.qh-body').isVisible())) await card.locator('.qh-toggle').click();
  const catalog = card.locator('.activity-catalog');

  const before = await catalog.evaluate(el => ({
    groups: el.querySelectorAll('.activity-category-group, .activity-category-head').length,
    rows: el.querySelectorAll('.activity-live .thing-row').length,
    done: el.querySelectorAll('.activity-done-list .thing-row').length,
    viewportHeight: el.querySelector('.activity-scroll').getBoundingClientRect().height,
    rowHeight: el.querySelector('.activity-live .thing-row').getBoundingClientRect().height,
    scrollable: el.querySelector('.activity-scroll').scrollHeight > el.querySelector('.activity-scroll').clientHeight,
    filtersOutsideScroll: el.querySelector('.activity-filters').parentElement === el,
  }));

  const firstRow = catalog.locator('.activity-live .thing-row').first();
  const key = await firstRow.getAttribute('data-check');
  await firstRow.locator('.activity-check').click();
  const afterCheck = await catalog.evaluate((el, id) => ({
    live: el.querySelectorAll(`.activity-live [data-check="${CSS.escape(id)}"]`).length,
    done: el.querySelectorAll(`.activity-done-list [data-check="${CSS.escape(id)}"]`).length,
    count: el.querySelector('.activity-done-summary')?.textContent.trim(),
  }), key);
  await catalog.locator('.activity-done-summary').click();
  await catalog.locator(`.activity-done-list [data-check="${key}"] .activity-check`).click();
  const returned = await catalog.locator(`.activity-live [data-check="${key}"]`).count();

  const chip = catalog.locator('.activity-chip').first();
  await chip.click();
  const filtered = await catalog.evaluate(el => ({
    headers: el.querySelectorAll('.activity-category-head').length,
    matches: [...el.querySelectorAll('.activity-live .thing-row')].filter(x => getComputedStyle(x).display !== 'none')
      .every(x => x.dataset.activityCat === el.querySelector('.activity-chip.on')?.dataset.activityChip),
  }));

  const scrollMoved = await catalog.locator('.activity-scroll').evaluate(el => { el.scrollTop = 300; return el.scrollTop > 0; });
  const ok = before.groups === 0 && before.rows > 0 && before.done === 0 && before.scrollable && before.filtersOutsideScroll &&
    before.viewportHeight >= before.rowHeight * 9 && before.viewportHeight <= before.rowHeight * 11.5 &&
    afterCheck.live === 0 && afterCheck.done === 1 && /1 hecha/.test(afterCheck.count) && returned === 1 &&
    filtered.headers === 0 && filtered.matches && scrollMoved && errors.length === 0;
  console.log(`${ok ? 'ok' : 'FAIL'} ${label} · grupos=${before.groups} · viewport=${before.viewportHeight.toFixed(1)}px/${before.rowHeight.toFixed(1)}px · scroll=${before.scrollable && scrollMoved} · pills afuera=${before.filtersOutsideScroll} · done=${afterCheck.count} · volvió=${returned} · filtro=${filtered.matches}`);
  if (!ok) failed++;
  await card.screenshot({ path: `${out}/round6-${label}.png` });
  await page.close();
}

await browser.close();
process.exit(failed ? 1 : 0);
