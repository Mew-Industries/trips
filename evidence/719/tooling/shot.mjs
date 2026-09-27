// Screenshot de una URL del site servido local. uso: node shot.mjs <url> <out.png> [ancho] [selector-scroll]
import { chromium } from '/usr/lib/node_modules/agent-browser/node_modules/playwright-core/index.mjs';
const [url, out, width, scrollSel] = process.argv.slice(2);
const browser = await chromium.launch({
  executablePath: '/home/openclaw/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome',
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: +(width || 1400), height: 1800 } });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(2500);
if (scrollSel) await page.locator(scrollSel).first().scrollIntoViewIfNeeded().catch(() => {});
await page.screenshot({ path: out, fullPage: false });
if (errors.length) { console.log('PAGEERRORS:', JSON.stringify(errors)); process.exit(1); }
console.log('ok', out);
await browser.close();
process.exit(0);
