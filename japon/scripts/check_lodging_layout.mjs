// Chequea que el bloque de reserva de TODOS los hospedajes ocupe el ancho de su
// tarjeta, en el acordeón del resumen y en la vista Hospedajes, a ancho desktop y
// mobile, y que cada hospedaje tenga al menos una foto que cargue de verdad.
// No es parte de ninguna suite: necesita Chromium y el sitio servido. Levantarlo con
//   python3 -m http.server 8611 --bind 127.0.0.1   (desde la raíz del repo)
// y después, una corrida por ancho:
//   node japon/scripts/check_lodging_layout.mjs 1280 [outdir] [baseUrl]
//   node japon/scripts/check_lodging_layout.mjs 390  [outdir] [baseUrl]
import pw from '/usr/lib/node_modules/agent-browser/node_modules/playwright-core/index.js';
import { mkdirSync } from 'node:fs';
const { chromium } = pw;
const BASE = process.argv[4] || 'http://127.0.0.1:8611/japon/';
const W = +(process.argv[2] || 1280);
const OUT = process.argv[3] || `/tmp/layout-${W}`;
mkdirSync(OUT, { recursive: true });

let bad = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) bad++;
};

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage({ viewport: { width: W, height: 1400 }, deviceScaleFactor: 1 });
page.on('pageerror', e => { console.log('  [pageerror]', String(e).slice(0, 200)); bad++; });

// ---- vista Hospedajes: es la que lista los 13 de una ------------------------
await page.goto(BASE + '?tab=hospedajes', { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(2500);
// Las fotos son lazy: hay que pasar por todas para que carguen antes de medirlas.
for (const el of await page.$$('[data-hosp]')) { await el.scrollIntoViewIfNeeded(); await page.waitForTimeout(120); }
await page.waitForTimeout(1500);
const rows = await page.$$eval('[data-hosp]', (cards) => cards.map((c) => {
  const main = c.querySelector('.lg-main');
  const resv = c.querySelector('.resv');
  const img = c.querySelector('.lg-img');
  return {
    id: c.dataset.hosp,
    mainW: main ? Math.round(main.getBoundingClientRect().width) : 0,
    resvW: resv ? Math.round(resv.getBoundingClientRect().width) : null,
    imgW: img ? Math.round(img.getBoundingClientRect().width) : null,
    imgOk: img ? (img.complete && img.naturalWidth > 0) : null,
    imgSrc: img ? img.getAttribute('src') : null,
  };
}));
check('hospedajes · hay tarjetas', rows.length >= 13, `${rows.length} tarjetas`);
for (const r of rows) {
  if (r.resvW !== null) {
    check(`${r.id} · reserva a ancho completo`, r.resvW === r.mainW, `resv ${r.resvW} / main ${r.mainW}`);
  }
  if (r.imgW !== null) {
    check(`${r.id} · foto a ancho completo y cargada`, r.imgW === r.mainW && r.imgOk,
      `img ${r.imgW} / main ${r.mainW} · ${r.imgSrc}`);
  }
}
await page.screenshot({ path: `${OUT}/hospedajes.png`, fullPage: true });

// ---- acordeón del resumen: se abren todas las paradas ------------------------
await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(2000);
const ids = await page.$$eval('.dest-card[data-id]', els => els.map(e => e.dataset.id));
for (const id of ids) {
  await page.click(`.dest-card[data-id="${id}"] .itin-head`);
  await page.waitForTimeout(120);
}
await page.waitForTimeout(2500);
const cards = await page.$$eval('.dest-card[data-id]', (els) => els.map((c) => {
  const lodging = c.querySelector('.lodging-card.dx');
  if (!lodging) return null;
  const resv = c.querySelector('.resv');
  const img = c.querySelector('.lodging-img');
  const body = c.querySelector('.lodging-card.dx .lodging-body');
  return {
    id: c.dataset.id,
    cardW: Math.round(lodging.getBoundingClientRect().width),
    bodyW: body ? Math.round(body.getBoundingClientRect().width) : null,
    resvW: resv ? Math.round(resv.getBoundingClientRect().width) : null,
    imgW: img ? Math.round(img.getBoundingClientRect().width) : null,
    imgOk: img ? (img.complete && img.naturalWidth > 0) : null,
    hasImg: !!img,
  };
}).filter(Boolean));
for (const c of cards) {
  if (c.resvW !== null) {
    check(`resumen · ${c.id} · reserva a ancho de tarjeta`, c.resvW === c.cardW, `resv ${c.resvW} / card ${c.cardW}`);
  }
  check(`resumen · ${c.id} · tiene foto y carga`, c.hasImg && c.imgOk);
  check(`resumen · ${c.id} · la foto va arriba, a lo ancho`, c.imgW === c.cardW - 2, `img ${c.imgW} / card ${c.cardW}`);
}

await browser.close();
console.log(bad ? `\n${bad} fallo(s)` : `\ntodo ok (${W}px)`);
process.exit(bad ? 1 : 0);
