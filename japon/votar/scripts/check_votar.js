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
 * TOKEN y TOKEN2 tienen que ser los DOS VOTANTES DE PRUEBA, nunca los de un
 * viajero: la suite arranca borrando los votos del token que le pasan, y con el
 * de una persona eso es borrarle lo que votó. Los de prueba salen de
 * `~/.openclaw/workspace/data/japon-votos/test-tokens.env`, y acá abajo hay un
 * portero que corta si el token resulta ser de alguien.
 *
 * Uso:  set -a; . ~/.openclaw/workspace/data/japon-votos/test-tokens.env; set +a
 *       BASE=http://127.0.0.1:8770 node check_votar.js
 */
const path = require('path');
const { chromium } = require(process.env.PW ||
  '/usr/lib/node_modules/agent-browser/node_modules/playwright-core');

const BASE = process.env.BASE || 'http://127.0.0.1:8770';
const API = process.env.API || 'https://votos.mewis.online';
const TOKEN = process.env.TOKEN;
const TOKEN2 = process.env.TOKEN2;
const SHOTS = process.env.SHOTS || path.join(__dirname, '..', '..', '..', '..', 'shots');

// Las categorías que Martín pidió no votar: comer y tomar se deciden en el
// momento (ronda 2), y las tiendas sueltas más el cajón de `otro` no son un
// plan que se priorice entre cuatro (ronda 4).
const EXCLUIDAS = ['comida', 'bar-noche', 'compras', 'otro'];

let failed = 0;
const ok = (name, cond, extra) => {
  console.log(`${cond ? '✓' : '✗'} ${name}${extra ? '  — ' + extra : ''}`);
  if (!cond) failed++;
};

const api = async (p, init) => (await fetch(API + p, init)).json();

// Antes de borrar un solo voto: el token tiene que ser de un votante de
// prueba. Si es de una persona, la suite no corre — prefiero un test que no
// arranca a un test que le vacía el mazo a alguien.
const assertTestToken = async (tok, label) => {
  const r = await api(`/votes?u=${tok}`);
  if (!r || !r.user || !String(r.user.id).startsWith('test-')) {
    console.error(`✗ ${label} no es un token de prueba (user=${r && r.user && r.user.id}).` +
      ' Usá los de data/japon-votos/test-tokens.env — esta suite borra votos.');
    process.exit(2);
  }
};

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
  await assertTestToken(TOKEN, 'TOKEN');
  await assertTestToken(TOKEN2, 'TOKEN2');
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

  // ----------------------------- reel embebido, mini-mapa y filtro de rubros
  await clearVotes(TOKEN2);
  {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2,
    });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await page.goto(`${BASE}/japon/votar/?u=${TOKEN2}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.card.top');

    // El filtro se mira sobre el mazo que armó la app, no sobre una copia del
    // criterio: `VOTAR_PLACES` es lo que efectivamente se va a swipear. La
    // lista está escrita acá a mano a propósito: es la decisión de producto
    // (qué no se vota), no un espejo de la constante de `app.js` — si alguien
    // toca `SKIP_CATS` sin que nadie lo haya pedido, este chequeo se cae.
    const cats = await page.evaluate(() => [...new Set(window.VOTAR_PLACES.map(p => p.cat))].sort());
    const n = await page.evaluate(() => window.VOTAR_PLACES.length);
    ok('el mazo deja afuera comida, bar-noche, compras y otro',
      !EXCLUIDAS.some((c) => cats.includes(c)), `${n} lugares · ${cats.join(', ')}`);
    // Excluir es más robusto que incluir, pero sólo si de verdad no se llevó
    // puesta ninguna otra: la taxonomía crece (`taller` es de ayer).
    const missing = await page.evaluate((skip) => {
      const inDeck = new Set(window.VOTAR_PLACES.map(p => p.cat));
      return window.PLACE_TAXONOMY.order.filter((c) => !skip.includes(c) && !inDeck.has(c));
    }, EXCLUIDAS);
    ok('y no deja afuera ninguna otra categoría de la taxonomía',
      missing.length === 0, missing.length ? `faltan ${missing.join(', ')}` : cats.join(', '));

    // El chequeo que nace del reporte de Zava (task 559): un reel puede ser la
    // fuente de varias actividades, pero lo que la card EMBEBE tiene que hablar
    // de ella. Se mira sobre el mazo entero y sobre el registro publicado, que
    // es el mismo par de datos que ve el que vota.
    const ajenas = await page.evaluate(() => {
      const byCode = {};
      (window.SOURCE_REELS || []).forEach((r) => { byCode[r.code] = r; });
      return window.VOTAR_PLACES
        .filter((p) => p.ig && !((byCode[p.ig] || { covers: [] }).covers.indexOf(p.id) >= 0))
        .map((p) => `${p.name} → ${p.ig}`);
    });
    const conReel = await page.evaluate(() => window.VOTAR_PLACES.filter((p) => p.ig).length);
    ok('ninguna card del mazo embebe un reel que no la nombra', ajenas.length === 0,
      ajenas.length ? ajenas.slice(0, 5).join(' · ') : `${conReel}/${n} cards con reel de fondo`);

    // Desde la 559 no todas las cards embeben: la que sólo tiene de fuente un
    // roundup de veinte lugares va con mini-mapa a propósito, porque esa imagen
    // no es suya. Para probar el embed hay que llegar a una que sí tenga reel
    // propio, y cuántas hay antes depende del barajado del token.
    const topHasReel = () => page.evaluate(() => {
      const el = document.querySelector('.card.top');
      const p = el && window.VOTAR_PLACES.find((q) => q.id === el.dataset.place);
      return !!(p && p.ig);
    });
    let saltadas = 0;
    while (!(await topHasReel()) && saltadas < 40) { await touchSwipe(page, cdp, 200, 0); saltadas++; }
    ok('se llega a una card con reel propio', await topHasReel(),
      `${saltadas} card(s) sin reel antes`);

    await page.waitForSelector('.card.top.ig-on', { timeout: 30000 })
      .then(() => ok('la card de arriba embebe el reel de verdad', true))
      .catch(() => ok('la card de arriba embebe el reel de verdad', false, 'no cargó el iframe'));
    const src = await page.locator('.card.top .media-ig').getAttribute('src');
    const code = await page.evaluate(() => window.VOTAR_PLACES.length && document.querySelector('.card.top').dataset.place);
    ok('el iframe apunta al embed del reel de ese lugar',
      /^https:\/\/www\.instagram\.com\/p\/[A-Za-z0-9_-]+\/embed\/$/.test(src || ''), `${code} → ${src}`);
    const shown = await page.evaluate(() => {
      const id = document.querySelector('.card.top').dataset.place;
      const p = window.VOTAR_PLACES.find((q) => q.id === id);
      const r = (window.SOURCE_REELS || []).find((x) => x.code === p.ig) || { covers: [] };
      return { id: id, ig: p.ig, cubre: r.covers.indexOf(id) >= 0, muestra: !!r.showsEach };
    });
    ok('y ese reel habla de ese lugar y lo muestra', shown.cubre && shown.muestra,
      `${shown.id} → ${shown.ig} (cubre=${shown.cubre} muestra=${shown.muestra})`);
    ok('sólo se embebe la card de arriba (las de atrás no cargan Instagram)',
      (await page.locator('.card .media-ig').count()) === 1);
    ok('el encabezado del embed queda fuera del recorte',
      await page.locator('.card.top .media-ig').evaluate(
        (f) => f.getBoundingClientRect().top < f.closest('.card').getBoundingClientRect().top - 20));
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(SHOTS, 'votar-reel.png') });

    // El criterio duro de la ronda 2: con el iframe montado, el dedo sobre el
    // reel sigue siendo del mazo. El punto del gesto cae sobre el escudo.
    const n1 = await topName(page);
    await touchSwipe(page, cdp, 200, 0);
    ok('con el reel embebido el swipe táctil sigue votando', (await topName(page)) !== n1,
      `${n1} → ${await topName(page)}`);
    await page.waitForTimeout(900);
    const afterSwipe = await api(`/votes?u=${TOKEN2}`);
    ok('y ese swipe llegó al servidor',
      Object.keys(afterSwipe.votes).length === saltadas + 1,
      `${Object.keys(afterSwipe.votes).length} voto(s) · ${saltadas} de llegar a la card con reel`);

    // Toque quieto: el reel pasa a ser del dedo, y el botón lo devuelve.
    await page.waitForSelector('.card.top.ig-on', { timeout: 30000 }).catch(() => {});
    const box = await page.locator('.card.top').boundingBox();
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height * 0.35);
    await page.waitForTimeout(300);
    ok('un toque quieto sobre el reel lo activa',
      await page.locator('.card.top').evaluate(e => e.classList.contains('playing')) &&
      await page.locator('.card.top .media-back').isVisible());
    await page.screenshot({ path: path.join(SHOTS, 'votar-reel-activo.png') });
    await page.locator('.card.top .media-back').click();
    await page.waitForTimeout(250);
    ok('el botón "deslizar" devuelve la card al mazo',
      !(await page.locator('.card.top').evaluate(e => e.classList.contains('playing'))) &&
      await page.locator('.card.top .media-shield').isVisible());

    const n2 = await topName(page);
    await touchSwipe(page, cdp, -200, 0);
    ok('y después de volver del reel el gesto sigue andando', (await topName(page)) !== n2,
      `${n2} → ${await topName(page)}`);
    await ctx.close();
  }

  // ------------------------------------- sin Instagram la card cae al mapa
  {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2,
    });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    // Un iframe abortado no dispara ni `load` ni `error`: es exactamente el
    // caso que tiene que destapar el timeout y dejar el mini-mapa a la vista.
    await page.route('**instagram.com**', (r) => r.abort());
    await page.goto(`${BASE}/japon/votar/?u=${TOKEN2}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.card.top');
    await page.waitForSelector('.card.top.map-on', { timeout: 30000 })
      .then(() => ok('si el embed no llega, la card muestra el mini-mapa del lugar', true))
      .catch(() => ok('si el embed no llega, la card muestra el mini-mapa del lugar', false, 'no apareció .map-on'));
    ok('el mapa es un Leaflet de verdad con sus tiles',
      (await page.locator('.card.top .media-map.leaflet-container').count()) === 1 &&
      (await page.locator('.card.top .media-map img.leaflet-tile').count()) > 0,
      `${await page.locator('.card.top .media-map img.leaflet-tile').count()} tiles`);
    ok('el mapa no se puede comer el gesto',
      (await page.locator('.card.top .media-map').evaluate(e => getComputedStyle(e).pointerEvents)) === 'none');
    ok('la card nunca queda en blanco: el nombre se sigue leyendo',
      (await page.locator('.card.top .card-name').innerText()).length > 0,
      await topName(page));
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(SHOTS, 'votar-mapa.png') });
    const nm = await topName(page);
    await touchSwipe(page, cdp, 200, 0);
    ok('y con el mapa de fondo el swipe táctil vota igual', (await topName(page)) !== nm,
      `${nm} → ${await topName(page)}`);
    await ctx.close();
  }
  await clearVotes(TOKEN2);

  // ------------------------------------- descripciones largas (ronda 3)
  {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2,
    });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    // Sin Instagram a propósito: lo que se mide acá es el texto, y un embed
    // que tarda distinto en cada corrida mueve las alturas.
    await page.route('**instagram.com**', (r) => r.abort());
    await page.goto(`${BASE}/japon/votar/?u=${TOKEN2}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.card.top');

    const gaps = await page.evaluate(() => {
      const d = window.VOTAR_DESCS || {};
      return window.VOTAR_PLACES.filter((p) => !d[p.id]).map((p) => p.id);
    });
    // El archivo tiene más textos que el mazo: los de las categorías que la
    // ronda 4 sacó siguen ahí. Lo que se cuenta acá es la cobertura del mazo.
    const nDeck = await page.evaluate(() => window.VOTAR_PLACES.length);
    const nDesc = await page.evaluate(() => Object.keys(window.VOTAR_DESCS || {}).length);
    ok('todos los lugares del mazo tienen descripción curada', gaps.length === 0,
      gaps.length ? `faltan ${gaps.length}: ${gaps.slice(0, 5).join(', ')}`
        : `${nDeck}/${nDeck} del mazo · ${nDesc} textos en el archivo`);

    const shape = await page.evaluate(() => {
      const t = Object.values(window.VOTAR_DESCS || {});
      const len = t.map((s) => s.length).sort((a, b) => a - b);
      return {
        min: len[0], med: len[len.length >> 1], max: len[len.length - 1],
        cortas: t.filter((s) => (s.match(/[.!?]/g) || []).length < 2).length,
      };
    });
    ok('y ninguna quedó en una sola oración suelta', shape.cortas === 0 && shape.min > 100,
      `min ${shape.min} · mediana ${shape.med} · max ${shape.max}`);

    const curada = await page.evaluate(() => {
      const card = document.querySelector('.card.top');
      return card.querySelector('.card-note').textContent === window.VOTAR_DESCS[card.dataset.place];
    });
    ok('la card muestra la descripción curada, no la note de reels.js', curada, await topName(page));

    // Los textos más cortos entran en las tres líneas y no tienen nada que
    // abrir: se avanza hasta el primero que sí se recorta, que es el caso.
    const clamped = () => page.locator('.card.top .card-note')
      .evaluate((n) => n.scrollHeight > n.clientHeight + 2);
    let hops = 0;
    while (hops < 8 && !(await clamped())) {
      await page.locator('#b-no').click(); await page.waitForTimeout(450); hops++;
    }
    ok('el "más" aparece exactamente cuando el texto no entra recortado',
      (await clamped()) === (await page.locator('.card.top .note-more').isVisible()),
      `${hops} card(s) hasta una recortada`);

    const votesBefore = await page.locator('#pg-count').innerText();
    const closedH = await page.locator('.card.top .card-note').evaluate((n) => n.clientHeight);
    await page.locator('.card.top .note-more').click();
    await page.waitForTimeout(250);
    const openH = await page.locator('.card.top .card-note').evaluate((n) => n.clientHeight);
    ok('el "más" abre el texto entero', openH > closedH && !(await clamped()),
      `${closedH}px → ${openH}px`);
    ok('y tocar "más" no vota', (await page.locator('#pg-count').innerText()) === votesBefore,
      votesBefore);
    ok('el botón pasa a decir "menos"',
      (await page.locator('.card.top .note-more').innerText()).trim() === 'menos');

    // El criterio duro de la ronda 3: el texto largo no puede romper la card.
    ok('con la descripción abierta el cuerpo sigue adentro de la card',
      await page.locator('.card.top').evaluate((c) => {
        const b = c.querySelector('.card-body').getBoundingClientRect();
        const r = c.getBoundingClientRect();
        return b.top >= r.top - 1 && b.bottom <= r.bottom + 1 && b.height < r.height;
      }));
    ok('y el mazo no empuja la botonera',
      await page.evaluate(() => {
        const d = document.getElementById('deck').getBoundingClientRect();
        const a = document.getElementById('acts').getBoundingClientRect();
        return d.bottom <= a.top + 1;
      }));
    await page.screenshot({ path: path.join(SHOTS, 'votar-desc-abierta.png') });

    const nd = await topName(page);
    await touchSwipe(page, cdp, 200, 0);
    ok('con la descripción abierta el swipe táctil sigue votando', (await topName(page)) !== nd,
      `${nd} → ${await topName(page)}`);
    ok('y la card siguiente vuelve a arrancar recortada',
      await page.locator('.card.top .card-note').evaluate((n) => !n.classList.contains('open')));
    await ctx.close();
  }
  await clearVotes(TOKEN2);

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

    ok('la card trae nombre + categoría + barrio + descripción',
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
    // La foto de desktop tiene que mostrar la card como se ve de verdad, con
    // el reel puesto: si se saca antes, retrata el estado de carga.
    await page.waitForSelector('.card.top.ig-on', { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1200);
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
    // El mazo lo define la app (ciudad + categorias excluidas), asi que la
    // lista sale de ahi y no de SOURCE_THINGS: si el test votara los lugares
    // que la app ya no muestra, el mazo no cerraria nunca.
    const kioto = await page.evaluate(() =>
      window.VOTAR_PLACES.filter(p => p.city === 'Kioto').map(p => ({ id: p.id, name: p.name })));
    let idDrift = 0;
    for (const { id, name } of kioto) {
      // R\u00e9plica del `placeId()` de app.js, fold ASCII incluido. Si los dos se
      // desalinean, el test vota ids que la app no reconoce y el mazo nunca
      // cierra \u2014 que es exactamente lo que este bloque tiene que detectar.
      const mine = 'p-' + name.split('(')[0].normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]+/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
      if (mine !== id) idDrift++;
      await api('/votes', {
        method: 'PUT', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: TOKEN, place_id: id, vote: 'si' }),
      });
    }
    ok('el place_id de la app sigue siendo el nombre normalizado', idDrift === 0,
      `${kioto.length} lugares de Kioto, ${idDrift} distintos`);
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
    // El tally público de antes, para comprobar después que la prueba no lo movió.
    const publicBefore = await api('/aggregate');
    await page.goto(`${BASE}/japon/votar/?u=${TOKEN2}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.card.top');
    for (let i = 0; i < 3; i++) { await page.locator('#b-si').click(); await page.waitForTimeout(400); }
    await page.waitForTimeout(900);
    // `includeTest=1` es la única forma de sumar dos votantes sin usar la
    // cuenta de una persona: mismo tally, con los de prueba adentro.
    const agg = await api('/aggregate?includeTest=1');
    ok('/aggregate suma votos de dos tokens distintos',
      agg.voterCount >= 2 && agg.totalVotes >= 5,
      `${agg.voterCount} votantes · ${agg.totalVotes} votos · ${Object.keys(agg.places).length} lugares`);
    const publicAfter = await api('/aggregate');
    ok('y el tally que consume la app principal no se movió con los de prueba',
      publicAfter.totalVotes === publicBefore.totalVotes &&
      publicAfter.voterCount === publicBefore.voterCount,
      `${publicBefore.voterCount}/${publicBefore.totalVotes} → ${publicAfter.voterCount}/${publicAfter.totalVotes}`);
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
