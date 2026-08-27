import pw from '/usr/lib/node_modules/agent-browser/node_modules/playwright-core/index.js';
import { mkdirSync } from 'node:fs';

const { chromium } = pw;
const base = process.argv[2] || 'http://127.0.0.1:8611/japon/';
const out = process.argv[3] || '/tmp/japon-activity-round5';
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
    groups: el.querySelectorAll('.activity-category-group').length,
    stickyFilters: ['sticky', '-webkit-sticky'].includes(getComputedStyle(el.querySelector('.activity-filters')).position),
    rows: el.querySelectorAll('.activity-live .thing-row').length,
    done: el.querySelectorAll('.activity-done-list .thing-row').length,
  }));
  const firstGroup = catalog.locator('.activity-category-group').first();
  await firstGroup.locator('summary').click();
  const collapsed = !(await firstGroup.getAttribute('open'));
  await firstGroup.locator('summary').click();

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
    headers: [...el.querySelectorAll('.activity-category-head')].filter(x => getComputedStyle(x).display !== 'none').length,
    matches: [...el.querySelectorAll('.activity-live .thing-row')].filter(x => getComputedStyle(x).display !== 'none')
      .every(x => x.dataset.activityCat === el.querySelector('.activity-chip.on')?.dataset.activityChip),
  }));

  await chip.click();
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight);
    const pane = document.querySelector('.details-section');
    if (pane) pane.scrollTop = pane.scrollHeight;
    window.dispatchEvent(new Event('scroll'));
  });
  if (width < 900) await page.mouse.wheel(0, -10);
  await page.waitForTimeout(100);
  await page.evaluate(() => window.dispatchEvent(new Event('scroll')));
  const topState = await page.locator('.activity-to-top').evaluate(el => ({
    visible: getComputedStyle(el).opacity === '1', y: window.scrollY,
    body: document.body.scrollHeight, root: document.documentElement.scrollHeight,
    pane: document.querySelector('.details-section')?.scrollTop || 0,
  }));
  const topVisible = topState.visible;
  const ok = before.groups > 1 && before.stickyFilters && before.rows > 0 && before.done === 0 && collapsed &&
    afterCheck.live === 0 && afterCheck.done === 1 && /1 hecha/.test(afterCheck.count) && returned === 1 &&
    filtered.headers === 0 && filtered.matches && topVisible && errors.length === 0;
  console.log(`${ok ? 'ok' : 'FAIL'} ${label} · grupos=${before.groups} · sticky=${before.stickyFilters} · done=${afterCheck.count} · volvió=${returned} · headers filtrando=${filtered.headers} · subir=${topVisible} y=${topState.y} body=${topState.body} root=${topState.root} pane=${topState.pane}`);
  if (!ok) failed++;
  await card.screenshot({ path: `${out}/round5-${label}.png` });
  await page.close();
}

await browser.close();
process.exit(failed ? 1 : 0);
