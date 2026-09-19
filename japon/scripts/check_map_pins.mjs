// Verificación en navegador de los pines de lugar del mapa (tasks 688/691/692): cada
// pin muestra el emoji de su categoría —el mismo de `data/categories.js` que usa la
// lista— dentro del disco con el aro del color cuando tiene aire alrededor. La decisión
// es POR PIN y por solape en pantalla (`syncPinEmojis`): con otro pin visible a menos de
// PIN_EMOJI_CLEARANCE_PX (24), los dos quedan en punto (`.pp-dot`); un par en las MISMAS
// coords (daytrip + guardado duplicados) cuenta como un solo lugar. Y lo que ya tenía
// identidad propia —paradas numeradas, cama, aeropuerto— no se toca.
//
// No es parte de ninguna suite: necesita Chromium y el sitio servido. Levantarlo con
//   python3 -m http.server 8611 --bind 127.0.0.1   (desde la raíz del repo)
// y después:
//   node japon/scripts/check_map_pins.mjs [outdir] [baseUrl]
//
// Sale 1 si algún chequeo falla y deja las capturas en <outdir>.
import pw from '/usr/lib/node_modules/agent-browser/node_modules/playwright-core/index.js';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
const { chromium } = pw;
const BASE = process.argv[3] || 'http://127.0.0.1:8611/japon/';
const OUT = process.argv[2] || '/tmp/shots-map-pins';
mkdirSync(OUT, { recursive: true });

// La taxonomía de referencia sale del archivo, no de lo que dibujó la página: si el
// mapa se quedara con un emoji viejo, acá se ve.
const DIR = join(dirname(fileURLToPath(import.meta.url)), '..');
const sandbox = { window: {} };
vm.runInNewContext(readFileSync(join(DIR, 'data/categories.js'), 'utf8'), sandbox);
const TAX = sandbox.window.PLACE_TAXONOMY;
const hexToRgb = h => 'rgb(' + [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)).join(', ') + ')';

let bad = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) bad++;
};

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1 });
page.on('pageerror', e => { console.log('  [pageerror]', String(e).slice(0, 300)); bad++; });

// La app es un módulo ES: no hay `map` global que manotear desde afuera. El zoom se lee
// de la URL del tile que está pintado y se cambia con los controles, como un usuario.
// Durante la animación conviven tiles del zoom viejo y del nuevo: el nivel que vale es
// el de la mayoría, no el del primero que aparezca en el DOM.
const zoom = () => page.evaluate(() => {
  const por = {};
  document.querySelectorAll('#map .leaflet-tile').forEach(t => {
    const m = t.src.match(/light_all\/(\d+)\//);
    if (m) por[m[1]] = (por[m[1]] || 0) + 1;
  });
  const top = Object.entries(por).sort((a, b) => b[1] - a[1])[0];
  return top ? Number(top[0]) : null;
});
const zoomOutTo = async (z) => {
  for (let i = 0; i < 12 && (await zoom()) > z; i++) {
    await page.click('#map .leaflet-control-zoom-out');
    await page.waitForTimeout(900);
  }
  await page.waitForTimeout(700);
  return zoom();
};
const zoomInTo = async (z) => {
  for (let i = 0; i < 12 && (await zoom()) < z; i++) {
    await page.click('#map .leaflet-control-zoom-in');
    await page.waitForTimeout(900);
  }
  await page.waitForTimeout(700);
  return zoom();
};
// Lo que se mira de cada pin: qué emoji dibuja, de qué color es el aro y si el emoji
// está realmente visible (no basta con que esté en el HTML). Además, las dos garantías
// del criterio por solape, medidas sobre los pines DENTRO del viewport:
//   solapes  — pares de emojis visibles a menos de 24px entre centros (>=1px: un par en
//              las mismas coords es el mismo lugar apilado, no un solape). Debe ser 0.
//   dotsSolos — puntos que no tienen NINGÚN vecino a <24px (contando también los pines
//              de justo afuera de la pantalla): no tendrían por qué ser punto. Debe ser 0.
const pinState = (sel = '#map') => page.evaluate((sel) => {
  const root = document.querySelector(sel);
  const box = root.getBoundingClientRect();
  const pins = [...root.querySelectorAll('.pp')];
  const geo = pins.map(p => {
    const r = p.getBoundingClientRect();
    const e = p.querySelector('.pp-emoji');
    return {
      x: r.left + r.width / 2 - box.left, y: r.top + r.height / 2 - box.top,
      emoji: !!e && getComputedStyle(e).display !== 'none',
      dot: p.classList.contains('pp-dot'),
      w: Math.round(r.width),
    };
  });
  const onScreen = geo.filter(g => g.x >= 0 && g.x <= box.width && g.y >= 0 && g.y <= box.height);
  const em = onScreen.filter(g => g.emoji);
  let solapes = 0;
  for (let i = 0; i < em.length; i++) for (let j = i + 1; j < em.length; j++) {
    const d = Math.hypot(em[i].x - em[j].x, em[i].y - em[j].y);
    if (d >= 1 && d < 24) solapes++;
  }
  let dotsSolos = 0;
  onScreen.filter(g => g.dot).forEach(g => {
    if (!geo.some(o => { const d = Math.hypot(o.x - g.x, o.y - g.y); return d >= 1 && d < 24; })) dotsSolos++;
  });
  return {
    total: pins.length,
    onScreen: onScreen.length,
    // Sin `.pp-emoji` (el pin viejo, sólo punto) cuenta como emoji ausente, no como error.
    emojiVisible: pins.filter(p => {
      const e = p.querySelector('.pp-emoji');
      return e && getComputedStyle(e).display !== 'none';
    }).length,
    emojiOnScreen: em.length,
    dotsOnScreen: onScreen.filter(g => g.dot).length,
    solapes, dotsSolos,
    size: pins.length ? Math.round(pins[0].getBoundingClientRect().width) : null,
    dotSize: onScreen.find(g => g.dot) ? onScreen.find(g => g.dot).w : null,
    emojiSize: em.length ? em[0].w : null,
    pares: pins.map(p => p.style.getPropertyValue('--c').trim() + '|' +
      (p.querySelector('.pp-emoji') ? p.querySelector('.pp-emoji').textContent : '')),
    aro: pins.length ? getComputedStyle(pins[0]).borderTopColor : null,
    aroDe: pins.length ? pins[0].style.getPropertyValue('--c').trim() : null,
    // El aro del disco se mide sobre un pin que esté mostrando el emoji: el primero
    // del DOM puede ser un punto, y el punto lleva el borde blanco, no el del color.
    aroEmoji: (() => {
      const p = pins.find(p => { const e = p.querySelector('.pp-emoji'); return e && getComputedStyle(e).display !== 'none'; });
      return p ? getComputedStyle(p).borderTopColor : null;
    })(),
    aroEmojiDe: (() => {
      const p = pins.find(p => { const e = p.querySelector('.pp-emoji'); return e && getComputedStyle(e).display !== 'none'; });
      return p ? p.style.getPropertyValue('--c').trim() : null;
    })(),
  };
}, sel);

await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(1800);

// ----------------------------------------------- 1 · taxonomía dentro de cada pin
// Ir a Tokio por la UI: el click en una fila de la lista vuela al lugar con zoom 14.
await page.evaluate(() => {
  const row = [...document.querySelectorAll('.act-row')].find(r => /shinjuku|shibuya|asakusa/i.test(r.textContent));
  if (row) row.click();
});
await page.waitForTimeout(3500);
await page.keyboard.press('Escape');
const zTokio = await zoom();
check('el click desde la lista deja el mapa en zoom de barrio', zTokio >= 13, 'zoom ' + zTokio);

const cerca = await pinState();
const pares = new Map();
cerca.pares.forEach(p => pares.set(p, (pares.get(p) || 0) + 1));
const esperados = new Map(TAX.order.map(c => [TAX.meta[c].color.toLowerCase() + '|' + TAX.meta[c].icon, c]));
const huerfanos = [...pares.keys()].filter(p => !esperados.has(p.toLowerCase()));
check('todo pin dibuja el emoji+color de una categoría de la taxonomía',
  cerca.total > 0 && huerfanos.length === 0,
  cerca.total + ' pines · ' + pares.size + ' pares distintos' + (huerfanos.length ? ' · sueltos: ' + huerfanos.join(' ') : ''));
const comida = TAX.meta['comida'], templo = TAX.meta['templo-museo'];
check('un lugar de comida se ve 🍜', pares.has(comida.color + '|' + comida.icon),
  (pares.get(comida.color + '|' + comida.icon) || 0) + ' pines ' + comida.icon);
check('uno de templos y museos se ve ⛩️', pares.has(templo.color + '|' + templo.icon),
  (pares.get(templo.color + '|' + templo.icon) || 0) + ' pines ' + templo.icon);
// AC2 (692): a zoom de barrio el emoji se decide pin por pin. Una buena parte lo
// muestra (los que tienen aire), los clusters quedan en punto, y NUNCA hay un emoji
// pisando a otro. El 35% es el piso honesto medido: a z14 el viewport de desktop
// abarca ~11km de Tokio central (Shibuya + Shinjuku + Ginza juntos) y esos clusters
// se quedan en punto justamente por el criterio.
check('a zoom de barrio buena parte de los pines muestra emoji',
  cerca.emojiOnScreen >= cerca.onScreen * 0.35,
  cerca.emojiOnScreen + '/' + cerca.onScreen + ' en pantalla con emoji');
check('los clusters quedan en punto', cerca.dotsOnScreen > 0, cerca.dotsOnScreen + ' puntos');
check('ningún emoji pisa a otro (centros a ≥24px)', cerca.solapes === 0, cerca.solapes + ' solapes');
check('ningún punto está solo (todo punto tiene un vecino a <24px)', cerca.dotsSolos === 0,
  cerca.dotsSolos + ' puntos sin vecino');
await page.screenshot({ path: `${OUT}/ac2-emoji-barrio.png` });

// El pin sigue siendo clickeable (la caja del ícono es transparente al mouse; el click
// tiene que llegar igual al marker y abrir su popup).
await page.evaluate(() => { document.querySelectorAll('.leaflet-popup-close-button').forEach(b => b.click()); });
await page.waitForTimeout(400);
const box = await page.evaluate(() => {
  const p = [...document.querySelectorAll('#map .pp')].find(e => {
    const r = e.getBoundingClientRect();
    return r.top > 120 && r.bottom < 800 && r.left > 60 && r.right < 780;
  });
  if (!p) return null;
  const r = p.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
});
if (box) await page.mouse.click(box.x, box.y);
await page.waitForTimeout(700);
check('el click sobre el pin abre su popup', !!box && await page.evaluate(() => !!document.querySelector('#map .leaflet-popup')));

// ------------------- 2 · zoom de ciudad: aislados con emoji, clusters en punto (AC1)
// El criterio viejo (conteo global) apagaba TODO por encima de 40 visibles: con los
// ~200 pines de Tokio el emoji recién entraba a zoom de manzana. Ahora a cualquier
// zoom los aislados (Odaiba, Kasukabe, Maihama) tienen emoji y los clusters de
// Shibuya/Shinjuku/Ginza quedan en punto de 12px, sin que un emoji pise a otro.
await page.evaluate(() => { document.querySelectorAll('.leaflet-popup-close-button').forEach(b => b.click()); });
for (const z of [13, 12, 11]) {
  const got = await zoomOutTo(z);
  const s = await pinState();
  check('a zoom ' + z + ' los pines aislados conservan el emoji',
    got === z && s.emojiOnScreen > 0,
    s.emojiOnScreen + '/' + s.onScreen + ' en pantalla con emoji');
  check('y los clusters quedan en punto de 12px', s.dotsOnScreen > 0 && s.dotSize === 12,
    s.dotsOnScreen + ' puntos de ' + s.dotSize + 'px');
  check('sin solapes ni puntos sin motivo a zoom ' + z, s.solapes === 0 && s.dotsSolos === 0,
    s.solapes + ' solapes · ' + s.dotsSolos + ' puntos sin vecino');
  await page.screenshot({ path: `${OUT}/ac1-tokio-z${z}.png` });
}

// --------------------------------------- 3 · el hover desde la lista resalta su pin
// El enganche es `.pp[data-id]`: la fila del day trip en la lista prende `.active` sobre
// el pin del mapa. Se hace con el mouse de verdad, no despachando el evento a mano.
// La fila vive adentro de la tarjeta del destino: se abre como la abre cualquiera,
// clickeando el encabezado.
const fila = await page.evaluate(() => {
  const ids = new Set([...document.querySelectorAll('#map .pp[data-id]')].map(p => p.dataset.id));
  const row = [...document.querySelectorAll('.dt-row[data-dt-id]')].find(r => ids.has(r.dataset.dtId));
  if (!row) return null;
  row.closest('.dest-card').querySelector('.itin-head').click();
  return row.dataset.dtId;
});
check('hay una fila de day trip con su pin en el mapa', !!fila, fila || '(ninguna)');
await page.waitForTimeout(1500);
// El click en la fila lleva el mapa al day trip; desde ahí se acerca hasta el zoom del
// emoji, así que lo que se fotografía es el pin nuevo resaltado.
await page.click(`.dt-row[data-dt-id="${fila}"]`);
await page.waitForTimeout(1800);
await page.evaluate(() => { document.querySelectorAll('.leaflet-popup-close-button').forEach(b => b.click()); });
await zoomInTo(13);
await page.evaluate((id) => document.querySelector('.dt-row[data-dt-id="' + id + '"]').scrollIntoView({ block: 'center' }), fila);
await page.waitForTimeout(400);
const estadoPin = (id) => page.evaluate((id) => {
  const p = document.querySelector('#map .pp[data-id="' + id + '"]');
  return { activo: p.classList.contains('active'), transform: getComputedStyle(p).transform };
}, fila);
const reposo = await estadoPin();
await page.hover(`.dt-row[data-dt-id="${fila}"]`);
await page.waitForTimeout(500);
const conHover = await estadoPin();
check('el hover desde la lista resalta su pin', conHover.activo && !reposo.activo,
  fila + ' · .active ' + reposo.activo + ' → ' + conHover.activo);
check('y el resaltado sigue agrandando el pin', conHover.transform !== reposo.transform,
  reposo.transform + ' → ' + conHover.transform);
await page.screenshot({ path: `${OUT}/ac4-hover.png` });
await page.mouse.move(700, 450);
await page.waitForTimeout(400);
check('al salir de la fila el pin vuelve a su tamaño', !(await estadoPin()).activo);

// ------------------------- 4 · filtro con poca densidad, sin tocar el zoom (AC1, AC3)
await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(1200);
await page.evaluate(() => {
  const row = [...document.querySelectorAll('.act-row')].find(r => /shinjuku|shibuya|asakusa/i.test(r.textContent));
  if (row) row.click();
});
await page.waitForTimeout(2200);
await page.keyboard.press('Escape');
await zoomOutTo(12);
const contar = () => page.evaluate(() => {
  const by = {};
  document.querySelectorAll('#map .pp').forEach(p => {
    const c = p.style.getPropertyValue('--c').trim();
    by[c] = (by[c] || 0) + 1;
  });
  return by;
});
const clickCat = async (label) => {
  await page.evaluate((label) => {
    [...document.querySelectorAll('.map-cats .mc')].find(b => b.textContent.trim() === label).click();
  }, label);
  await page.waitForTimeout(700);
};
const antes = await contar();
const colorComida = TAX.meta['comida'].color;
// Con todo prendido, el primer click sobre un chip aísla esa categoría.
await clickCat('Comida');
const soloComida = await contar();
check('“Comida” deja en el mapa exactamente los pines 🍜',
  soloComida[colorComida] === antes[colorComida] && Object.keys(soloComida).length === 1,
  soloComida[colorComida] + '/' + antes[colorComida] + ' pines · ' + Object.keys(soloComida).length + ' color(es) en el mapa');
check('la URL guarda el filtro', await page.evaluate(() => new URLSearchParams(location.search).get('cat') === 'comida'),
  await page.evaluate(() => new URLSearchParams(location.search).get('cat') || '(sin cat)'));
await page.screenshot({ path: `${OUT}/ac3-solo-comida.png` });
// El segundo click la apaga: el mapa queda sin ningún pin de lugar.
await clickCat('Comida');
const sinNada = await contar();
check('apagarla saca esos mismos pines', Object.keys(sinNada).length === 0, JSON.stringify(sinNada));
await clickCat('Todo');
const vuelta = await contar();
check('“Todo” devuelve el mapa como estaba',
  JSON.stringify(vuelta) === JSON.stringify(antes), Object.values(vuelta).reduce((a, b) => a + b, 0) + ' pines');

// En la misma escala de ciudad, aislar una categoría con pocos lugares y aire entre
// ellos prende el emoji en TODOS sin tocar el zoom: el handler de filtro recalcula por
// sí solo (AC3). "Arte" deja ~7 lugares repartidos por Tokio; "Bar/noche" no sirve de
// fixture: sus 28 lugares se apiñan en Shinjuku y a este zoom se tapan entre ellos.
const zoomAntesFiltro = await zoom();
await clickCat('Arte');
const pocos = await pinState();
check('un filtro con pocos lugares prende el emoji en todos a zoom de ciudad sin tocar el zoom',
  zoomAntesFiltro === await zoom() && pocos.onScreen > 0 && pocos.emojiOnScreen === pocos.onScreen,
  pocos.emojiOnScreen + '/' + pocos.onScreen + ' con emoji · zoom ' + await zoom());
check('y sin ningún emoji pisando a otro', pocos.solapes === 0, pocos.solapes + ' solapes');
check('el emoji filtrado conserva el aro de su categoría', pocos.aroEmoji === hexToRgb(pocos.aroEmojiDe),
  pocos.aroEmojiDe + ' → ' + pocos.aroEmoji);
await page.screenshot({ path: `${OUT}/ac3-filtro-ciudad.png` });

// Mover el mapa a una zona vacía conserva el zoom y deja la pantalla sin pines. Volver
// exactamente con el gesto inverso los trae de nuevo, ya reclasificados: la única señal
// que cambió entre ambos estados fue `moveend` (AC4).
const mapBox = await page.locator('#map').boundingBox();
const drag = async (fromX, toX) => {
  await page.mouse.move(fromX, mapBox.y + mapBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(toX, mapBox.y + mapBox.height / 2, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(900);
};
const zoomAntesMove = await zoom();
await drag(mapBox.x + mapBox.width * .8, mapBox.x + mapBox.width * .2);
await drag(mapBox.x + mapBox.width * .8, mapBox.x + mapBox.width * .2);
const trasMover = await pinState();
check('mover el mapa al mar deja la pantalla sin pines, sin cambiar el zoom',
  zoomAntesMove === await zoom() && trasMover.onScreen === 0,
  pocos.onScreen + ' → ' + trasMover.onScreen + ' en pantalla · zoom ' + await zoom());
await drag(mapBox.x + mapBox.width * .2, mapBox.x + mapBox.width * .8);
await drag(mapBox.x + mapBox.width * .2, mapBox.x + mapBox.width * .8);
// El gesto inverso no repone el encuadre al píxel (inercia + timing de tiles): lo que
// se afirma es que volvieron pines y TODOS los que entraron quedaron bien clasificados,
// no que el viewport sea idéntico.
const trasVolver = await pinState();
check('volver al área con pines los reclasifica por moveend',
  trasVolver.onScreen > 0 && trasVolver.emojiOnScreen === trasVolver.onScreen &&
    trasVolver.solapes === 0 && trasVolver.dotsSolos === 0,
  trasMover.onScreen + ' → ' + trasVolver.onScreen + ' en pantalla · ' +
    trasVolver.emojiOnScreen + ' emoji · ' + trasVolver.solapes + ' solapes');
await page.screenshot({ path: `${OUT}/ac4-moveend.png` });

await clickCat('Todo');

// Con todo prendido, el mismo gesto: lo que entra al viewport se clasifica en el
// momento — los que caen cerca de otro quedan en punto y no aparece ningún solape
// ni ningún punto injustificado (AC4, la mitad "entra un pin denso").
await drag(mapBox.x + mapBox.width * .3, mapBox.x + mapBox.width * .7);
const todoMovido = await pinState();
check('con todo prendido, mover reclasifica lo que entra: clusters en punto, sin solapes',
  todoMovido.dotsOnScreen > 0 && todoMovido.emojiOnScreen > 0 &&
    todoMovido.solapes === 0 && todoMovido.dotsSolos === 0,
  todoMovido.emojiOnScreen + ' emoji + ' + todoMovido.dotsOnScreen + ' puntos · ' +
    todoMovido.solapes + ' solapes · ' + todoMovido.dotsSolos + ' puntos sin vecino');

// ------------------- 5 · paradas numeradas, cama y aeropuerto sin cambios
// De cero y con todas las familias prendidas (por default sólo actividades viene
// encendida), mirando Japón entero.
await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(1800);
await page.evaluate(() => {
  const todo = document.querySelector('.map-toggles .mt-all');
  if (!todo.classList.contains('active')) todo.click();
});
await page.waitForTimeout(1200);
const otros = await page.evaluate(() => {
  const num = document.querySelector('#map .marker-num');
  const bed = document.querySelector('#map .lodging-marker');
  const air = document.querySelector('#map .airport-marker');
  const r = e => e ? Math.round(e.getBoundingClientRect().width) : null;
  return {
    num: r(num), numTexto: num && num.textContent.trim(), numEmoji: num && /\p{Extended_Pictographic}/u.test(num.textContent),
    bed: r(bed), bedTexto: bed && bed.textContent.trim(),
    air: r(air), airTexto: air && air.textContent.trim(),
    diamante: !!document.querySelector('#map .marker-diamond'),
  };
});
check('la parada numerada sigue siendo el círculo de 30px con su número',
  otros.num === 30 && /^\d+$/.test(otros.numTexto || '') && !otros.numEmoji, otros.num + 'px · "' + otros.numTexto + '"');
check('la cama sigue siendo 🛏️ de 28px', otros.bed === 28 && otros.bedTexto === '🛏️', otros.bed + 'px · ' + otros.bedTexto);
check('el aeropuerto sigue siendo ✈ de 20px', otros.air === 20 && otros.air === 20 && otros.airTexto === '✈',
  otros.air + 'px · ' + otros.airTexto);
check('el nodo de paso sigue siendo el rombo', otros.diamante);
await page.screenshot({ path: `${OUT}/ac5-numeradas.png` });

// --------------------------------- 6 · el mapa de la jornada (AC1, segunda mitad)
// En el mapa del día todo punto con hora es una reserva y va numerado (task 685), así
// que el pin de lugar no aparece con los datos de hoy. Para ejercitar ESE pin —el que
// sale del mismo `placeIcon`— se sirve `views.js` con la numeración del día anulada:
// el punto entra al mapa sin número y toma el camino del pin de categoría.
// Primero, la jornada REAL (22/10, Naoshima: tres cosas con hora comprada): sus paradas
// numeradas y su cama siguen como estaban, y el mapa ya está en modo emoji.
const DIA = '2026-10-22';
await page.goto(BASE + '?tab=dias&jornada=' + DIA, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(2600);
const diaReal = await page.evaluate(() => ({
  ord: [...document.querySelectorAll('#day-view .rt-ord')].map(e =>
    [...e.childNodes].find(n => n.nodeType === Node.TEXT_NODE)?.textContent.trim() || ''
  ).join(' '),
  ordCats: document.querySelectorAll('#day-view .rt-ord .rt-ord-cat').length,
  camas: document.querySelectorAll('#day-view .lodging-marker').length,
  pp: document.querySelectorAll('#day-view .pp').length,
  emojiOn: document.querySelector('#day-view .leaflet-container').classList.contains('pins-emoji'),
}));
check('la jornada real mantiene sus paradas numeradas, suma sugerencias y conserva su cama',
  diaReal.ord === '1 2 3' && diaReal.ordCats === 3 && diaReal.camas === 1 && diaReal.pp > 0 && diaReal.emojiOn,
  'paradas ' + diaReal.ord + ' con ' + diaReal.ordCats + ' categorías · ' + diaReal.camas +
    ' cama · ' + diaReal.pp + ' sugerencias · contenedor en modo emoji: ' + diaReal.emojiOn);
await page.screenshot({ path: `${OUT}/ac5-jornada-real.png` });

const viewsSrc = readFileSync(join(DIR, 'views.js'), 'utf8');
const sinNumeros = viewsSrc
  .replace(/planNumber: fixedNumbers\.get\([^\n]*\|\| null,/, 'planNumber: null,')
  .replace('p.planNumber = fixedCount + wanted.indexOf(p.key) + 1;', 'p.planNumber = null;');
check('el fixture de la jornada anula la numeración del día',
  !/planNumber: fixedNumbers/.test(sinNumeros) && !/wanted\.indexOf\(p\.key\) \+ 1/.test(sinNumeros));
// Página nueva: el módulo ya cargado no se vuelve a pedir, así que el fixture tiene que
// estar puesto antes del primer load.
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1 });
await ctx.route('**/views.js', route => route.fulfill({ contentType: 'application/javascript', body: sinNumeros }));
const fx = await ctx.newPage();
fx.on('pageerror', e => { console.log('  [pageerror fixture]', String(e).slice(0, 300)); bad++; });
await fx.goto(BASE + '?tab=dias&jornada=' + DIA, { waitUntil: 'networkidle', timeout: 60000 });
await fx.waitForTimeout(2800);
const dia = await fx.evaluate(() => {
  const root = document.querySelector('#day-view');
  const pins = [...root.querySelectorAll('.pp')];
  return {
    total: pins.length,
    emojiVisible: pins.filter(p => {
      const e = p.querySelector('.pp-emoji');
      return e && getComputedStyle(e).display !== 'none';
    }).length,
    size: pins.length ? Math.round(pins[0].getBoundingClientRect().width) : null,
    pares: pins.map(p => p.style.getPropertyValue('--c').trim() + '|' +
      (p.querySelector('.pp-emoji') ? p.querySelector('.pp-emoji').textContent : '')),
  };
});
check('el mapa de la jornada muestra el emoji de la categoría, sin corte de zoom',
  dia.total > 0 && dia.emojiVisible === dia.total && dia.size === 22,
  dia.total + ' pines de ' + dia.size + 'px · ' + [...new Set(dia.pares)].join(' '));
check('y los pares color|emoji son los mismos de la taxonomía',
  dia.total > 0 && dia.pares.every(p => esperados.has(p.toLowerCase())), [...new Set(dia.pares)].join(' '));
check('la cama de la jornada sigue intacta',
  await fx.evaluate(() => { const b = document.querySelector('#day-view .lodging-marker'); return !!b && b.textContent.trim() === '🛏️' && Math.round(b.getBoundingClientRect().width) === 28; }));
await fx.screenshot({ path: `${OUT}/ac1-jornada.png` });
await ctx.close();

await browser.close();
console.log(bad ? `\n✗ ${bad} chequeo(s) fallaron` : '\n✓ todo verde');
process.exit(bad ? 1 : 0);
