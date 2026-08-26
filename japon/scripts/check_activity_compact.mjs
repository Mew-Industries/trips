import pw from '/usr/lib/node_modules/agent-browser/node_modules/playwright-core/index.js';
import { mkdirSync } from 'node:fs';

const { chromium } = pw;
const base = process.argv[2] || 'http://127.0.0.1:8611/japon/';
const out = process.argv[3] || '/tmp/japon-activity-compact';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
let failed = 0;

for (const [label, width] of [['desktop', 1280], ['mobile', 390]]) {
  const page = await browser.newPage({ viewport: { width, height: 800 } });
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60000 });
  const card = page.locator('.dest-card', { hasText: 'Shinjuku' }).first();
  await card.locator('.itin-head').click();
  if (!(await card.locator('.qh-body').isVisible())) await card.locator('.qh-toggle').click();
  const result = await card.evaluate(el => {
    const rows = [...el.querySelectorAll('.activity-list > .thing-row')];
    const heights = rows.slice(0, 20).map(row => row.getBoundingClientRect().height);
    const orphanIconLines = rows.filter(row => [...row.children].some(child => {
      const text = child.textContent.trim();
      return ['📍', '🎬', '↗ Maps'].includes(text);
    })).length;
    const first = rows[0];
    const title = first?.querySelector('.activity-title');
    const note = first?.querySelector('.activity-note');
    const check = first?.querySelector('.activity-check');
    return {
      total: rows.length,
      averageHeight: heights.reduce((sum, n) => sum + n, 0) / heights.length,
      fitIn800: Math.floor(800 / (heights.reduce((sum, n) => sum + n, 0) / heights.length)),
      orphanIconLines,
      titleColor: title && getComputedStyle(title).color,
      noteLines: note && Math.round(note.getBoundingClientRect().height / parseFloat(getComputedStyle(note).lineHeight)),
      checkWidth: check && check.getBoundingClientRect().width,
      flat: !el.querySelector('.hood-group, .hood-head'),
      chips: el.querySelectorAll('.activity-chip').length,
    };
  });
  const ok = result.total > 0 && result.averageHeight <= 33 && result.fitIn800 >= 24 &&
    result.orphanIconLines === 0 && result.noteLines <= 1 && result.checkWidth <= 28 &&
    result.flat && result.chips > 0 && errors.length === 0;
  console.log(`${ok ? 'ok' : 'FAIL'} ${label} · ${result.fitIn800} actividades/800px · ${result.averageHeight.toFixed(1)}px/fila · checkbox ${result.checkWidth}px · icon-only ${result.orphanIconLines} · ${result.chips} filtros`);
  if (!ok) failed++;
  await card.screenshot({ path: `${out}/shinjuku-${label}.png` });
  await page.close();
}

await browser.close();
process.exit(failed ? 1 : 0);
