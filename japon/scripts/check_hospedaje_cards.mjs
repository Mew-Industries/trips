// Chequea que las tarjetas de hospedaje sigan compactas y sin las redundancias que
// Martín marcó el 26/8 (task 557), en las dos superficies —el acordeón del resumen y la
// vista Hospedajes—, a ancho desktop y mobile, y en la app principal y en la compartida.
// Además: ningún texto visible nombra a los amigos del tramo compartido.
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
      resvHead: (c.querySelector('.resv-head') || {}).innerText || '',
      resvKeys: [...c.querySelectorAll('.resv-k')].map(e => e.innerText),
      hasLodging: !!c.querySelector('.lg-img, .lg-links'),
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
      links: [...c.querySelectorAll('.lodging-meta a')].length,
      italic: !!c.querySelector('[style*="italic"]'),
    })));
    check(`${tag} · resumen · hay tarjetas`, metas.length >= 2, `${metas.length} tarjetas`);
    for (const [i, m] of metas.entries()) {
      // Fechas, noches y links en UNA línea; el "Abrir" de la reserva es un link más.
      check(`${tag} · resumen · tarjeta ${i + 1} · fechas + noches + links en una línea`,
        /→/.test(m.meta) && /noche/.test(m.meta) && m.links >= 1, m.meta.replace(/\n/g, ' '));
      check(`${tag} · resumen · tarjeta ${i + 1} · sin la línea en itálica`, !m.italic);
    }
    // El detalle plegado también se audita: se abre todo antes de leer el texto.
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
