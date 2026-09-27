// Consulta Google Maps directions en headless (hora local de Tokio) y vuelca las rutas.
// uso: node gmaps.mjs "<url>" <shot.png> [details]
import { chromium } from '/usr/lib/node_modules/agent-browser/node_modules/playwright-core/index.mjs';

const [url, shot, details] = process.argv.slice(2);
const browser = await chromium.launch({
  executablePath: '/home/openclaw/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome',
  args: ['--no-sandbox', '--lang=es'],
});
const page = await browser.newPage({
  viewport: { width: 1280, height: 1400 },
  locale: 'es-419',
  timezoneId: 'Asia/Tokyo',
});
try {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  for (const sel of ['button[aria-label*="Aceptar"]', 'button:has-text("Aceptar todo")', 'button:has-text("Accept all")', 'form[action*="consent"] button']) {
    const b = page.locator(sel).first();
    if (await b.count()) { await b.click().catch(() => {}); break; }
  }
  await page.waitForTimeout(9000);
  console.log(JSON.stringify(await page.locator('div[id^="section-directions-trip-"]').allInnerTexts(), null, 2));
  if (details) {
    await page.locator('div[id^="section-directions-trip-"] button:has-text("Detalles")').first().click().catch(() => {});
    await page.waitForTimeout(4000);
    console.log('--- DETALLES ---');
    console.log(await page.locator('div[role="main"]').last().innerText().catch(() => ''));
  }
  if (shot) await page.screenshot({ path: shot, fullPage: false });
} finally {
  await browser.close();
}
