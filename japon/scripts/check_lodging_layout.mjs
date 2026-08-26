// Chequea que el bloque de reserva de TODOS los hospedajes ocupe el ancho de su
// tarjeta, en el acordeón del resumen y en la vista Hospedajes, a ancho desktop y
// mobile, y que cada hospedaje tenga al menos una foto que cargue de verdad.
// Desde la ronda 2 del 26/8 la foto es un carrusel (`.lgc`) y la reserva vive plegada
// adentro de un <details>: se abren todos antes de medir, y el ancho de referencia de la
// reserva es el de la ficha (`.lodging-body` / `.lg-body`), que es donde está metida.
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
// La reserva está plegada: sin abrirla no tiene medidas que comparar.
await page.$$eval('details.lodging-more', els => els.forEach(e => { e.open = true; }));
await page.waitForTimeout(1500);
const rows = await page.$$eval('[data-hosp]', (cards) => cards.map((c) => {
  const main = c.querySelector('.lg-main');
  const body = c.querySelector('.lg-body');
  const resv = c.querySelector('.resv');
  const box = c.querySelector('.lgc');
  const imgs = [...c.querySelectorAll('.lgc-track img')];
  return {
    id: c.dataset.hosp,
    mainW: main ? Math.round(main.getBoundingClientRect().width) : 0,
    bodyW: body ? Math.round(body.getBoundingClientRect().width) : 0,
    resvW: resv ? Math.round(resv.getBoundingClientRect().width) : null,
    zonas: c.querySelectorAll('.lgc').length + c.querySelectorAll('.lg-img, .gallery-thumb').length,
    imgW: box ? Math.round(box.getBoundingClientRect().width) : null,
    imgOk: imgs.length ? imgs.every(i => i.complete && i.naturalWidth > 0) : null,
    imgSrc: imgs.map(i => i.getAttribute('src')).join(' '),
  };
}));
check('hospedajes · hay tarjetas', rows.length >= 13, `${rows.length} tarjetas`);
for (const r of rows) {
  if (r.resvW !== null) {
    check(`${r.id} · reserva a ancho de la ficha`, r.resvW === r.bodyW, `resv ${r.resvW} / ficha ${r.bodyW}`);
  }
  if (r.imgW !== null) {
    check(`${r.id} · una sola zona de imagen, a ancho completo y cargada`,
      r.zonas === 1 && r.imgW === r.mainW && r.imgOk,
      `${r.zonas} zonas · carrusel ${r.imgW} / main ${r.mainW} · ${r.imgSrc}`);
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
await page.$$eval('details.lodging-more', els => els.forEach(e => { e.open = true; }));
await page.waitForTimeout(2500);
const cards = await page.$$eval('.dest-card[data-id]', (els) => els.map((c) => {
  const lodging = c.querySelector('.lodging-card.dx');
  if (!lodging) return null;
  const resv = lodging.querySelector('.resv');
  const box = lodging.querySelector('.lgc');
  const imgs = [...lodging.querySelectorAll('.lgc-track img')];
  const body = lodging.querySelector('.lodging-body');
  // El ancho de referencia de la reserva es el contenido de la ficha: adentro del
  // <details> el bloque arranca donde termina el padding, no en el borde de la tarjeta.
  const inner = body ? body.clientWidth - parseFloat(getComputedStyle(body).paddingLeft)
    - parseFloat(getComputedStyle(body).paddingRight) : null;
  return {
    id: c.dataset.id,
    cardW: Math.round(lodging.getBoundingClientRect().width),
    innerW: inner === null ? null : Math.round(inner),
    resvW: resv ? Math.round(resv.getBoundingClientRect().width) : null,
    zonas: lodging.querySelectorAll('.lgc').length + lodging.querySelectorAll('.lodging-img, .gallery-thumb').length,
    imgW: box ? Math.round(box.getBoundingClientRect().width) : null,
    imgOk: imgs.length ? imgs.every(i => i.complete && i.naturalWidth > 0) : null,
    hasImg: !!box,
  };
}).filter(Boolean));
for (const c of cards) {
  if (c.resvW !== null) {
    check(`resumen · ${c.id} · reserva a ancho de la ficha`, c.resvW === c.innerW, `resv ${c.resvW} / ficha ${c.innerW}`);
  }
  check(`resumen · ${c.id} · tiene fotos y cargan todas`, c.hasImg && c.imgOk);
  check(`resumen · ${c.id} · una sola zona de imagen, arriba y a lo ancho`,
    c.zonas === 1 && c.imgW === c.cardW - 2, `${c.zonas} zonas · carrusel ${c.imgW} / card ${c.cardW}`);
}

await browser.close();
console.log(bad ? `\n${bad} fallo(s)` : `\ntodo ok (${W}px)`);
process.exit(bad ? 1 : 0);
