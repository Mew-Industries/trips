// Baja las fotos de un listing de Airbnb con un browser real y las guarda locales
// (el curl con UA cae en el domain_switch de es.airbnb.com y devuelve un form vacío;
// y el site NO hotlinkea al CDN de Airbnb — task 553 ronda 4).
//
//   node japon/scripts/fetch_airbnb_photos.mjs japon/img/lodging <slug> <roomId>
//
// Escribe <destino>/<slug>-1.jpg … y lista lo que bajó.
import pw from '/usr/lib/node_modules/agent-browser/node_modules/playwright-core/index.js';
import { mkdirSync, writeFileSync } from 'node:fs';

const { chromium } = pw;
const [OUT, SLUG, ...IDS] = process.argv.slice(2);
const MAX = 4;
mkdirSync(OUT, { recursive: true });

// Solo fotos del alojamiento: fuera los íconos de la plataforma y los avatares del host.
const isListingPhoto = (u) =>
  u.includes('muscache.com/im/pictures/') &&
  !/AirbnbPlatformAssets|airbnb-platform-assets|\/pictures\/user\//i.test(u);
const keyOf = (u) => u.split('?')[0];
const big = (u) => keyOf(u) + '?im_w=1200';

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const ctx = await browser.newContext({
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  locale: 'en-US',
  viewport: { width: 1400, height: 1000 },
});

for (const id of IDS) {
  const page = await ctx.newPage();
  const order = [];
  const push = (u) => { if (isListingPhoto(u) && !order.some(x => keyOf(x) === keyOf(u))) order.push(u); };
  page.on('response', r => push(r.url()));
  await page.goto(`https://www.airbnb.com/rooms/${id}?locale=en&currency=USD`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(6000);
  const og = await page.$eval('meta[property="og:image"]', e => e.content).catch(() => null);
  const inDom = await page.$$eval('img', els => els.map(e => e.currentSrc || e.src).filter(Boolean));
  const picked = [];
  for (const u of [og, ...inDom, ...order].filter(Boolean)) {
    if (!isListingPhoto(u)) continue;
    if (picked.some(x => keyOf(x) === keyOf(u))) continue;
    picked.push(u);
    if (picked.length >= MAX) break;
  }
  console.log(`== ${id} · ${(await page.title()).slice(0, 70)} · ${picked.length} fotos`);
  let i = 0;
  for (const u of picked) {
    i++;
    const resp = await ctx.request.get(big(u), { timeout: 60000 });
    if (!resp.ok()) { console.log(`   ✗ ${i} http ${resp.status()} ${u}`); continue; }
    const buf = await resp.body();
    const file = `${OUT}/${SLUG}-${i}.jpg`;
    writeFileSync(file, buf);
    console.log(`   ✓ ${file} ${(buf.length / 1024).toFixed(0)} KB ← ${keyOf(u)}`);
  }
  await page.close();
}
await browser.close();
