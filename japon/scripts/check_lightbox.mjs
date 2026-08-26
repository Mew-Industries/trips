// Verificación en navegador del lightbox de fotos (task 553 ronda 4):
// abre desde el acordeón, desde la ficha de parada y desde la vista Hospedajes;
// las flechas recorren; el "atrás" del celular lo cierra sin sacarte del sitio;
// con una sola foto no muestra flechas.
//
// No es parte de ninguna suite: necesita Chromium y el sitio servido. Levantarlo con
//   python3 -m http.server 8611 --bind 127.0.0.1   (desde la raíz del repo)
// y después:
//   node japon/scripts/check_lightbox.mjs [outdir] [baseUrl]
//
// Sale 1 si algún chequeo falla y deja las capturas en <outdir>.
import pw from '/usr/lib/node_modules/agent-browser/node_modules/playwright-core/index.js';
import { mkdirSync } from 'node:fs';
const { chromium } = pw;
const BASE = process.argv[3] || 'http://127.0.0.1:8611/japon/';
const OUT = process.argv[2] || '/tmp/shots-lb';
mkdirSync(OUT, { recursive: true });

let bad = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) bad++;
};
const lbState = (page) => page.evaluate(() => {
  const lb = document.querySelector('.lightbox');
  const prev = lb.querySelector('.lb-prev');
  return {
    open: lb.classList.contains('open'),
    single: lb.classList.contains('single'),
    src: lb.querySelector('.lb-img').getAttribute('src') || '',
    arrows: getComputedStyle(prev).display !== 'none',
    url: location.href,
  };
});

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
page.on('pageerror', e => { console.log('  [pageerror]', String(e).slice(0, 300)); bad++; });

// ---------------------------------------------------- 1 · acordeón del resumen
await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(1500);
const urlAntes = page.url();
await page.click('.dest-card[data-id="sendai"] .itin-head');
await page.waitForTimeout(900);
await page.click('.dest-card[data-id="sendai"] .lodging-img');
await page.waitForTimeout(500);
let s = await lbState(page);
check('resumen · la foto del hospedaje abre el lightbox', s.open && s.src.includes('sendai-kokusai-exterior'), s.src);
check('resumen · 4 fotos → hay flechas', s.arrows && !s.single);
await page.click('.lb-next');
await page.waitForTimeout(300);
const s2 = await lbState(page);
check('resumen · la flecha avanza a la foto siguiente', s2.src !== s.src, s2.src);
await page.screenshot({ path: `${OUT}/lightbox-resumen.png` });
await page.goBack();
await page.waitForTimeout(500);
s = await lbState(page);
check('resumen · el atrás cierra el lightbox', !s.open);
check('resumen · el atrás no saca del sitio', s.url === urlAntes, s.url);

// miniatura de la tira → abre en ESA foto
await page.click('.dest-card[data-id="sendai"] .lodging-gallery .gallery-thumb');
await page.waitForTimeout(400);
s = await lbState(page);
check('resumen · la miniatura abre en su propia foto', s.open && s.src.includes('sendai-kokusai-twin'), s.src);
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
check('resumen · Escape cierra el lightbox', !(await lbState(page)).open);
await page.click('.dest-card[data-id="sendai"] .itin-head');
await page.waitForTimeout(400);

// ------------------------------------------------- 2 · ficha de parada (modal)
await page.goto(BASE + '?stop=kioto', { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(2500);
check('ficha · el modal de Kioto abre por deep-link', await page.isVisible('#stop-modal .sm-dialog'));
await page.click('#stop-modal .lodging-img');
await page.waitForTimeout(500);
s = await lbState(page);
check('ficha · la foto del hospedaje abre el lightbox', s.open && s.src.includes('kioto-machiya-4'), s.src);
const zIndexOk = await page.evaluate(() => {
  const z = (sel) => +getComputedStyle(document.querySelector(sel)).zIndex;
  return z('.lightbox') > z('.stop-modal');
});
check('ficha · el lightbox queda por encima del modal', zIndexOk);
await page.screenshot({ path: `${OUT}/lightbox-ficha.png` });
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
s = await lbState(page);
check('ficha · Escape cierra la foto y deja el modal abierto',
  !s.open && await page.isVisible('#stop-modal .sm-dialog'));

// ------------------------------------------------------- 3 · vista Hospedajes
await page.goto(BASE + '?tab=hospedajes', { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(2000);
await page.click('[data-hosp="kioto"] .lg-img');
await page.waitForTimeout(500);
s = await lbState(page);
check('hospedajes · la foto abre el lightbox', s.open && s.src.includes('kioto-machiya-4'), s.src);
await page.screenshot({ path: `${OUT}/lightbox-hospedajes.png` });
await page.goBack();
await page.waitForTimeout(500);
s = await lbState(page);
check('hospedajes · el atrás cierra el lightbox', !s.open);
check('hospedajes · sigue en la vista Hospedajes', s.url.includes('tab=hospedajes'), s.url);

// --------------------------------------------------- 4 · una sola foto y bordes
// Con `single` (lo que pone el lightbox cuando la galería tiene una sola foto) las
// flechas desaparecen y la foto queda a pantalla completa sola.
const singleOk = await page.evaluate(() => {
  const lb = document.querySelector('.lightbox');
  lb.classList.add('open', 'single');
  const hidden = getComputedStyle(lb.querySelector('.lb-prev')).display === 'none' &&
                 getComputedStyle(lb.querySelector('.lb-next')).display === 'none';
  // 92vw / 86vh: el computed style ya viene resuelto a px, así que se compara contra eso.
  const st = getComputedStyle(lb.querySelector('.lb-img'));
  const full = Math.round(parseFloat(st.maxWidth)) === Math.round(innerWidth * 0.92) &&
               Math.round(parseFloat(st.maxHeight)) === Math.round(innerHeight * 0.86);
  lb.classList.remove('open', 'single');
  return hidden && full;
});
check('una sola foto · sin flechas y a pantalla completa', singleOk);

// Una galería que no está registrada no debe abrir un lightbox vacío.
await page.evaluate(() => {
  const el = document.querySelector('[data-hosp="kioto"] .lg-img');
  el.setAttribute('data-gal', '__no-existe__');
});
await page.click('[data-hosp="kioto"] .lg-img');
await page.waitForTimeout(300);
s = await lbState(page);
check('galería inexistente · no abre un lightbox vacío', !s.open);

await browser.close();
console.log(bad ? `\n${bad} fallo(s)` : '\ntodo ok');
process.exit(bad ? 1 : 0);
