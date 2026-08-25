#!/usr/bin/env node
/* check_votar.js — chequeos de la app de votación (task 548).
 *
 * Levanta la app contra el backend real y verifica lo que no se puede mirar de
 * un vistazo: que el gesto registre el voto en el servidor, que los tres votos
 * y el deshacer funcionen, que recargar retome donde iba y que sin token no se
 * pueda votar. El swipe se prueba dos veces: con mouse (desktop) y con eventos
 * de touch reales vía CDP (mobile), porque son dos caminos distintos de
 * PointerEvent y romper uno sin romper el otro es fácil.
 *
 * Uso:  BASE=http://127.0.0.1:8770 TOKEN=<hex> TOKEN2=<hex> node check_votar.js
 */
const path = require('path');
const { chromium } = require(process.env.PW ||
  '/usr/lib/node_modules/agent-browser/node_modules/playwright-core');

const BASE = process.env.BASE || 'http://127.0.0.1:8770';
const API = process.env.API || 'https://votos.mewis.online';
const TOKEN = process.env.TOKEN;
const TOKEN2 = process.env.TOKEN2;
const SHOTS = process.env.SHOTS || path.join(__dirname, '..', '..', '..', '..', 'shots');

let failed = 0;
const ok = (name, cond, extra) => {
  console.log(`${cond ? '✓' : '✗'} ${name}${extra ? '  — ' + extra : ''}`);
  if (!cond) failed++;
};

const api = async (p, init) => (await fetch(API + p, init)).json();
const clearVotes = async (tok) => {
  const { votes } = await api(`/votes?u=${tok}`);
  for (const id of Object.keys(votes || {})) {
    await api('/votes', {
      method: 'PUT', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: tok, place_id: id, vote: null }),
    });
  }
};

// Un arrastre de verdad: pointerdown, varios move y un up. Un solo move grande
// no alcanza — la card lee el delta en cada move para mover los sellos.
async function mouseSwipe(page, dx, dy) {
  const box = await page.locator('.card.top').boundingBox();
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(cx + (dx * i) / 8, cy + (dy * i) / 8);
  await page.mouse.up();
  await page.waitForTimeout(500);
}

async function touchSwipe(page, cdp, dx, dy) {
  const box = await page.locator('.card.top').boundingBox();
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  const pt = (x, y) => [{ x, y, radiusX: 6, radiusY: 6, force: 1, id: 1 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt(cx, cy) });
  for (let i = 1; i <= 8; i++) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove', touchPoints: pt(cx + (dx * i) / 8, cy + (dy * i) / 8),
    });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(500);
}

const topName = (page) => page.locator('.card.top .card-name').first().innerText();

// Antes de sacar una foto hay que esperar a que los webp de las cards estén
// decodificados, si no el screenshot sale con el ícono de imagen rota.
const settle = (page) => page.waitForFunction(
  () => Array.from(document.querySelectorAll('.card-img')).every(i => i.complete && i.naturalWidth > 0),
  null, { timeout: 5000 }).catch(() => {});

(async () => {
  if (!TOKEN || !TOKEN2) { console.error('faltan TOKEN y TOKEN2'); process.exit(2); }
  const browser = await chromium.launch();

  // ------------------------------------------------------- sin token: gate
  {
    const page = await browser.newPage();
    await page.goto(`${BASE}/japon/votar/`, { waitUntil: 'domcontentloaded' });
    ok('sin token muestra el gate y no monta el mazo',
      await page.locator('#gate').isVisible() && !(await page.locator('#app').isVisible()),
      await page.locator('#gate-msg').innerText());

    await page.goto(`${BASE}/japon/votar/?u=aaaaaaaaaaaaaaaaaaaa`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    ok('token desconocido tampoco entra', await page.locator('#gate').isVisible(),
      await page.locator('#gate-msg').innerText());
    await page.close();
  }

  // --------------------------------------------------- mobile: los 3 gestos
  await clearVotes(TOKEN);
  {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
      deviceScaleFactor: 2,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await page.goto(`${BASE}/japon/votar/?u=${TOKEN}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.card.top');

    ok('la card trae nombre + categoría + barrio + note',
      (await page.locator('.card.top .card-name').count()) === 1 &&
      (await page.locator('.card.top .tag').count()) === 2 &&
      (await page.locator('.card.top .card-note').count()) === 1,
      await topName(page));

    const total = (await page.locator('#pg-count').innerText()).split('/')[1];
    ok('el contador arranca en 0 sobre el total de lugares',
      (await page.locator('#pg-count').innerText()) === `0/${total}`, `${total} lugares`);

    await settle(page);
    await page.screenshot({ path: path.join(SHOTS, 'votar-mobile-deck.png') });

    const n1 = await topName(page);
    await touchSwipe(page, cdp, 200, 0);
    const n2 = await topName(page);
    ok('swipe táctil a la derecha = sí y avanza el mazo', n1 !== n2, `${n1} → ${n2}`);

    await touchSwipe(page, cdp, -200, 0);
    const n3 = await topName(page);
    ok('swipe táctil a la izquierda = paso', n2 !== n3, `${n2} → ${n3}`);

    await touchSwipe(page, cdp, 0, -220);
    const n4 = await topName(page);
    ok('swipe táctil hacia arriba = estrella', n3 !== n4, `${n3} → ${n4}`);

    await page.waitForTimeout(900);
    const server = await api(`/votes?u=${TOKEN}`);
    const vs = Object.values(server.votes);
    ok('los tres votos llegaron al servidor con el valor correcto',
      vs.length === 3 && vs.includes('si') && vs.includes('no') && vs.includes('star'),
      JSON.stringify(server.votes));

    ok('el contador refleja los 3 votos',
      (await page.locator('#pg-count').innerText()) === `3/${total}`);

    // deshacer
    await page.locator('#b-undo').click();
    await page.waitForTimeout(900);
    const afterUndo = await api(`/votes?u=${TOKEN}`);
    ok('deshacer borra el último voto en el servidor',
      Object.keys(afterUndo.votes).length === 2, JSON.stringify(afterUndo.votes));
    ok('deshacer devuelve la card al frente del mazo',
      (await topName(page)) === n3, `top = ${await topName(page)}`);

    // botones (el otro camino, sin gesto)
    await page.locator('#b-si').click();
    await page.waitForTimeout(700);
    ok('los botones votan igual que el gesto',
      (await page.locator('#pg-count').innerText()) === `3/${total}`);

    // retomar donde quedó
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.card.top');
    ok('recargar retoma donde quedó',
      (await page.locator('#pg-count').innerText()) === `3/${total}` &&
      (await topName(page)) === n4, `${await page.locator('#pg-count').innerText()} · ${await topName(page)}`);

    // filtro por ciudad en la URL
    await page.locator('.city[data-city="Tokio"]').click();
    await page.waitForTimeout(300);
    ok('el filtro de ciudad queda en la URL', page.url().includes('city=Tokio'), page.url().split('?')[1]);
    const tokioTotal = (await page.locator('#pg-count').innerText()).split('/')[1];
    ok('el filtro achica el mazo', Number(tokioTotal) < Number(total), `${tokioTotal} de ${total}`);
    await settle(page);
    await page.screenshot({ path: path.join(SHOTS, 'votar-mobile-tokio.png') });
    await ctx.close();
  }

  // ------------------------------------------- desktop: drag con mouse
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/japon/votar/?u=${TOKEN}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.card.top');
    const before = await topName(page);
    await mouseSwipe(page, 220, 0);
    ok('drag con mouse en desktop vota', (await topName(page)) !== before,
      `${before} → ${await topName(page)}`);

    const afterDrag = await topName(page);
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(600);
    ok('el teclado también vota (←)', (await topName(page)) !== afterDrag);
    await page.keyboard.press('z');
    await page.waitForTimeout(600);
    ok('Z deshace', (await topName(page)) === afterDrag);
    await settle(page);
    await page.screenshot({ path: path.join(SHOTS, 'votar-desktop.png') });

    // Foto a mitad del arrastre: es la única forma de ver que el sello del
    // gesto aparece antes de soltar (que es lo que hace legible el swipe).
    const box = await page.locator('.card.top').boundingBox();
    const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    for (let i = 1; i <= 6; i++) await page.mouse.move(cx + (70 * i) / 6, cy);
    ok('el sello "Sí" se pinta durante el arrastre',
      Number(await page.locator('.card.top .stamp-si').evaluate(e => getComputedStyle(e).opacity)) > 0.5);
    await page.screenshot({ path: path.join(SHOTS, 'votar-drag-stamp.png') });
    await page.mouse.up();
    await page.waitForTimeout(400);
    await ctx.close();
  }

  // ---------------------------------------- fin del mazo (una ciudad entera)
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    // Votar Kioto entero por API y comprobar que la app cierra el mazo.
    await page.goto(`${BASE}/japon/votar/?u=${TOKEN}&city=Kioto`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.card.top');
    const kioto = await page.evaluate(() =>
      (window.SOURCE_THINGS || []).filter(t => /k(io|yo)to/i.test(t.area || '')).map(t => t.name));
    for (const name of kioto) {
      const id = 'p-' + name.split('(')[0].normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, '-');
      await api('/votes', {
        method: 'PUT', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: TOKEN, place_id: id, vote: 'si' }),
      });
    }
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#done:not([hidden])', { timeout: 8000 }).catch(() => {});
    ok('con la ciudad entera votada aparece el cierre con el resumen',
      await page.locator('#done').isVisible() &&
      (await page.locator('.dt-si .dt-n').innerText()) === String(kioto.length),
      `${await page.locator('#done-lead').innerText()} · sí=${await page.locator('.dt-si .dt-n').innerText()}`);
    ok('en el cierre los botones de voto quedan deshabilitados',
      await page.locator('#b-si').isDisabled() && await page.locator('#b-no').isDisabled());
    await page.screenshot({ path: path.join(SHOTS, 'votar-fin.png') });

    await page.locator('#done-again').click();
    await page.waitForTimeout(800);
    ok('desde el cierre se puede deshacer el último y sigue el mazo',
      await page.locator('.card.top').isVisible() && await page.locator('#done').isHidden());
    await ctx.close();
  }

  // ----------------------------------------- aggregate con dos votantes
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/japon/votar/?u=${TOKEN2}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.card.top');
    for (let i = 0; i < 3; i++) { await page.locator('#b-si').click(); await page.waitForTimeout(400); }
    await page.waitForTimeout(900);
    const agg = await api('/aggregate');
    ok('/aggregate suma votos de dos tokens distintos',
      agg.voterCount >= 2 && agg.totalVotes >= 5,
      `${agg.voterCount} votantes · ${agg.totalVotes} votos · ${Object.keys(agg.places).length} lugares`);
    const scored = Object.values(agg.places).filter(p => p.score > 0);
    ok('el tally trae si/no/star y score por lugar',
      scored.length > 0 && 'si' in scored[0] && 'no' in scored[0] && 'star' in scored[0],
      JSON.stringify(Object.entries(agg.places)[0]));
    await ctx.close();
  }

  await browser.close();
  console.log(failed ? `\n${failed} chequeo(s) fallaron` : '\ntodo verde');
  process.exit(failed ? 1 : 0);
})();
