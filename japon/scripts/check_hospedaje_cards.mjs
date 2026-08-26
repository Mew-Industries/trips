// Chequea que las tarjetas de hospedaje sigan compactas y sin las redundancias que
// Martín marcó el 26/8 (task 557), en las dos superficies —el acordeón del resumen y la
// vista Hospedajes—, a ancho desktop y mobile, y en la app principal y en la compartida.
// Además: ningún texto visible nombra a los amigos del tramo compartido.
//
// Ronda 2 (misma fecha, «sigue tomando bastante real estate, y hay dos partes con
// imágenes»): UNA sola zona de imagen por tarjeta —el carrusel— y el bloque de la reserva
// plegado por default. Las dos cosas se chequean acá abajo, más un techo de altura por
// tarjeta: el Sendai que Martín mandó en esa ronda medía 483 px y ninguna pasa de 430.
// No es parte de ninguna suite: necesita Chromium y el sitio servido. Levantarlo con
//   python3 -m http.server 8611 --bind 127.0.0.1   (desde la raíz del repo)
// y después:
//   node japon/scripts/check_hospedaje_cards.mjs [baseUrl]
import pw from '/usr/lib/node_modules/agent-browser/node_modules/playwright-core/index.js';
const { chromium } = pw;
const ROOT = process.argv[2] || 'http://127.0.0.1:8611/japon/';

let bad = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) bad++;
};

// Los nombres propios de los amigos salieron del site el 26/8: el tramo compartido se
// describe como "con amigos". `\b` para no pisar "Fushimi Inari" ni "Akari". Se devuelve
// una regex NUEVA en cada llamada: una `/g` compartida arrastra `lastIndex` entre tests
// y el segundo chequeo daría verde por corrimiento, no por estar limpio.
const nombres = txt => txt.match(/\bZava\b|\bAri\b/g) || [];

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });

for (const [app, base] of [['principal', ROOT], ['compartido', ROOT + 'compartido/']]) {
  for (const W of [1280, 390]) {
    const tag = `${app} ${W}px`;
    const page = await browser.newPage({ viewport: { width: W, height: 1000 } });
    const errs = [];
    page.on('pageerror', e => errs.push(String(e).slice(0, 200)));

    // ---- vista Hospedajes -----------------------------------------------------
    await page.goto(base + '?tab=hospedajes', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(2500);
    const cards = await page.$$eval('[data-hosp]', els => els.map(c => ({
      id: c.dataset.hosp,
      name: (c.querySelector('.lg-name .dx') || c.querySelector('.lg-name') || {}).innerText || '',
      sub: (c.querySelector('.lg-sub') || {}).innerText || '',
      links: [...c.querySelectorAll('.lg-links a')].map(a => a.innerText),
      dates: (c.querySelector('.lg-dates') || {}).innerText || '',
      nights: (c.querySelector('.lg-nights') || {}).innerText || '',
      hours: (c.querySelector('.lg-hours') || {}).innerText || '',
      // `textContent` y no `innerText`: adentro de un <details> cerrado nada se renderiza
      // y `innerText` devolvería '' — el chequeo daría verde por invisible, no por limpio.
      resvHead: (c.querySelector('.resv-head') || {}).textContent || '',
      resvKeys: [...c.querySelectorAll('.resv-k')].map(e => e.getAttribute('data-k') || e.textContent),
      // Ronda 2: una sola banda de fotos y la reserva plegada.
      zonas: c.querySelectorAll('.lgc').length + c.querySelectorAll('.lg-img, .gallery-thumb').length,
      chips: c.querySelectorAll('.lg-h').length,
      // Plegada = adentro de un <details> cerrado. `getClientRects()` no sirve: Chromium
      // le deja caja al contenido de un <details> cerrado (lo esconde con content-visibility).
      resvSuelta: [...c.querySelectorAll('.resv')].some(r => !r.closest('details.lodging-more:not([open])')),
      alto: Math.round(c.getBoundingClientRect().height),
      hasLodging: !!c.querySelector('.lgc, .lg-links'),
    })));
    const minCards = app === 'compartido' ? 3 : 13;
    check(`${tag} · hay tarjetas`, cards.length >= minCards, `${cards.length} tarjetas`);
    for (const c of cards.filter(c => c.hasLodging)) {
      // (1) el tipo de unidad no se dice dos veces: ninguna palabra larga del subtítulo
      // repite una del nombre ("studio en Shinjuku" + "studio (unidad entera)").
      const words = s => new Set(s.toLowerCase().match(/[a-záéíóúñü]{5,}/g) || []);
      const dup = [...words(c.sub)].filter(w => words(c.name).has(w));
      check(`${tag} · ${c.id} · el tipo no se repite en título y subtítulo`, dup.length === 0, dup.join(','));
      // (2) fechas y noches en la columna del cuándo, una sola vez
      check(`${tag} · ${c.id} · fechas + noches`, !!c.dates && /noche|reubicar/.test(c.nights), `${c.dates} / ${c.nights}`);
      // (3) el bloque de reserva no repite ni el título ni las fechas
      check(`${tag} · ${c.id} · la reserva no repite fechas ni lleva título`,
        !/mi reserva en/i.test(c.resvHead) && !c.resvKeys.some(k => /^Check-(in|out)/.test(k)),
        c.resvKeys.join(',') || '(sin filas)');
      // (4) links: ficha y/o Maps siguen ahí
      check(`${tag} · ${c.id} · links en la tarjeta`, c.links.length >= 1, c.links.join(' · '));
      // (5) ronda 2: una sola zona de imagen, sin la tira de thumbnails de al lado
      check(`${tag} · ${c.id} · una sola zona de imagen`, c.zonas === 1, `${c.zonas} zonas`);
      // (6) ronda 2: la reserva está plegada y los horarios son una línea, no chips
      check(`${tag} · ${c.id} · la reserva viene plegada`, !c.resvSuelta);
      check(`${tag} · ${c.id} · horarios en una línea de texto`,
        c.chips === 0 && /Check-in|Check-out|Horarios/.test(c.hours), c.hours.replace(/\n/g, ' '));
      // (7) ronda 2: techo de altura — el Sendai que Martín marcó medía 394 px acá
      check(`${tag} · ${c.id} · la tarjeta no pasa de 430 px`, c.alto <= 430, `${c.alto} px`);
    }
    const tHosp = await page.evaluate(() => document.body.innerText);
    check(`${tag} · hospedajes sin nombres propios`, nombres(tHosp).length === 0, nombres(tHosp).join(','));

    // ---- acordeón del resumen: se abren todas las paradas ----------------------
    await page.goto(base, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(2000);
    const ids = await page.$$eval('.dest-card[data-id]', els => els.map(e => e.dataset.id));
    for (const id of ids) { await page.click(`.dest-card[data-id="${id}"] .itin-head`); await page.waitForTimeout(80); }
    await page.waitForTimeout(2000);
    const metas = await page.$$eval('.lodging-card.dx', els => els.map(c => ({
      meta: (c.querySelector('.lodging-meta') || {}).innerText || '',
      links: [...c.querySelectorAll('.lodging-links a')].length,
      italic: !!c.querySelector('[style*="italic"]'),
      zonas: c.querySelectorAll('.lgc').length + c.querySelectorAll('.lodging-img, .gallery-thumb').length,
      resvSuelta: [...c.querySelectorAll('.resv')].some(r => !r.closest('details.lodging-more:not([open])')),
      alto: Math.round(c.getBoundingClientRect().height),
    })));
    check(`${tag} · resumen · hay tarjetas`, metas.length >= 2, `${metas.length} tarjetas`);
    for (const [i, m] of metas.entries()) {
      // Fechas, noches y horas de entrada/salida en UNA línea; los links, en la de abajo.
      check(`${tag} · resumen · tarjeta ${i + 1} · fechas + noches + horarios en una línea`,
        /→/.test(m.meta) && /noche/.test(m.meta) && /Check-in|Check-out|Horarios/.test(m.meta),
        m.meta.replace(/\n/g, ' '));
      check(`${tag} · resumen · tarjeta ${i + 1} · links en la tarjeta`, m.links >= 1, `${m.links} links`);
      check(`${tag} · resumen · tarjeta ${i + 1} · sin la línea en itálica`, !m.italic);
      // Ronda 2: una sola banda de fotos, reserva plegada y techo de altura (el Sendai
      // que Martín marcó medía 483 px de bloque; la tarjeta sola no pasa de 430).
      check(`${tag} · resumen · tarjeta ${i + 1} · una sola zona de imagen`, m.zonas === 1, `${m.zonas} zonas`);
      check(`${tag} · resumen · tarjeta ${i + 1} · la reserva viene plegada`, !m.resvSuelta);
      check(`${tag} · resumen · tarjeta ${i + 1} · no pasa de 430 px`, m.alto <= 430, `${m.alto} px`);
    }
    // El carrusel: el toggle de fotos es UNO por tarjeta y de verdad pasa a la siguiente.
    const carrusel = await page.$('.lodging-card.dx .lgc:not(.single)');
    if (carrusel) {
      const antes = await carrusel.evaluate(el => el.querySelector('.lgc-track').scrollLeft);
      await carrusel.evaluate(el => el.querySelector('.lgc-nav.next').click());
      await page.waitForTimeout(700);
      const despues = await carrusel.evaluate(el => ({
        x: el.querySelector('.lgc-track').scrollLeft,
        dot: [...el.querySelectorAll('.lgc-dots i')].findIndex(d => d.classList.contains('on')),
        start: el.classList.contains('at-start'),
      }));
      check(`${tag} · resumen · la flecha pasa a la foto siguiente`, despues.x > antes, `${antes} → ${despues.x}`);
      check(`${tag} · resumen · el punto sigue a la foto`, despues.dot === 1, `punto ${despues.dot}`);
      check(`${tag} · resumen · la flecha de volver se prende`, !despues.start);
      // En el celular el que pasa las fotos es el dedo: el scroll-snap nativo. Y el click
      // con el que termina un swipe no tiene que abrir el lightbox.
      const snap = await carrusel.evaluate(el => {
        const st = getComputedStyle(el.querySelector('.lgc-track'));
        return st.overflowX + ' / ' + st.scrollSnapType;
      });
      check(`${tag} · resumen · se pasa con el dedo (scroll-snap)`, /^auto \/ x mandatory$/.test(snap), snap);
      await carrusel.evaluate(el => {
        const t = el.querySelector('.lgc-track');
        t.scrollTo({ left: 0 });
        setTimeout(() => el.querySelector('.lgc-track img').click(), 30);
      });
      await page.waitForTimeout(400);
      check(`${tag} · resumen · el click que cierra un swipe no abre el lightbox`,
        !await page.evaluate(() => document.querySelector('.lightbox').classList.contains('open')));
      // Y pasado el swipe, tocar la foto sí abre el lightbox donde corresponde.
      await page.waitForTimeout(500);
      await carrusel.evaluate(el => el.querySelector('.lgc-track img').click());
      await page.waitForTimeout(400);
      const lb = await page.evaluate(() => document.querySelector('.lightbox').classList.contains('open'));
      check(`${tag} · resumen · pasado el swipe, la foto abre el lightbox`, lb);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
    } else {
      check(`${tag} · resumen · hay un carrusel con varias fotos`, false);
    }
    // El detalle plegado también se audita —ahí adentro está la reserva—: se abre todo
    // antes de leer el texto.
    await page.$$eval('.lodging-more', els => els.forEach(e => { e.open = true; }));
    await page.waitForTimeout(300);
    const tRes = await page.evaluate(() => document.body.innerText);
    check(`${tag} · resumen sin nombres propios (con Detalle abierto)`, nombres(tRes).length === 0, nombres(tRes).join(','));
    check(`${tag} · sin el disclaimer de la dirección`, !/dirección exacta solo aparece/i.test(tRes));

    // ---- modo discreto: sigue sin filtrar nombre ni dirección ------------------
    await page.click('.discrete-btn');
    await page.waitForTimeout(600);
    const tDx = await page.evaluate(() => document.body.innerText);
    check(`${tag} · discreto no filtra el hospedaje`, !/Kyotofish|Yoshiike|Shinoka/.test(tDx));

    check(`${tag} · sin errores JS`, errs.length === 0, errs.join(' | '));
    await page.close();
  }
}

await browser.close();
console.log(bad ? `\n${bad} fallo(s)` : '\ntodo ok');
process.exit(bad ? 1 : 0);
