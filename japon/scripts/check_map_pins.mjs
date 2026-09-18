// Verificación en navegador de los pines de lugar del mapa (task 688): cada pin muestra
// el emoji de su categoría —el mismo de `data/categories.js` que usa la lista— dentro
// del disco con el aro del color, de cerca; lejos vuelve al punto de color para que el
// mapa de una ciudad entera (~300 lugares) siga siendo legible. Y lo que ya tenía
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
// está realmente visible (no basta con que esté en el HTML).
const pinState = (sel = '#map') => page.evaluate((sel) => {
  const root = document.querySelector(sel);
  const pins = [...root.querySelectorAll('.pp')];
  return {
    total: pins.length,
    // Sin `.pp-emoji` (el pin viejo, sólo punto) cuenta como emoji ausente, no como error.
    emojiVisible: pins.filter(p => {
      const e = p.querySelector('.pp-emoji');
      return e && getComputedStyle(e).display !== 'none';
    }).length,
    size: pins.length ? Math.round(pins[0].getBoundingClientRect().width) : null,
    pares: pins.map(p => p.style.getPropertyValue('--c').trim() + '|' +
      (p.querySelector('.pp-emoji') ? p.querySelector('.pp-emoji').textContent : '')),
    aro: pins.length ? getComputedStyle(pins[0]).borderTopColor : null,
    aroDe: pins.length ? pins[0].style.getPropertyValue('--c').trim() : null,
  };
}, sel);

await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(1800);

// ------------------------------------------------ 1 · el emoji de cada categoría (AC1)
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
check('el emoji está visible, no sólo en el HTML', cerca.emojiVisible === cerca.total,
  cerca.emojiVisible + '/' + cerca.total);
check('el color de categoría sigue puesto: es el aro del pin', cerca.aro === hexToRgb(cerca.aroDe),
  cerca.aroDe + ' → ' + cerca.aro);
await page.screenshot({ path: `${OUT}/ac1-emoji-cerca.png` });

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

// ------------------------------------------- 2 · densidad: lejos vuelve el punto (AC2)
await page.evaluate(() => { document.querySelectorAll('.leaflet-popup-close-button').forEach(b => b.click()); });
for (const z of [13, 12, 11]) {
  const got = await zoomOutTo(z);
  const s = await pinState();
  if (z === 13) {
    check('a zoom 13 (barrio en pantalla) el pin es el emoji', got === 13 && s.emojiVisible === s.total && s.size === 22,
      s.total + ' pines de ' + s.size + 'px');
  } else {
    check('a zoom ' + z + ' (ciudad entera) vuelve el punto de 12px',
      got === z && s.emojiVisible === 0 && s.size === 12, s.total + ' pines de ' + s.size + 'px, 0 emojis');
  }
  await page.screenshot({ path: `${OUT}/ac2-tokio-z${z}.png` });
}

// ------------------------------------ 3 · el hover desde la lista resalta su pin (AC4)
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

// --------------------------------------------- 4 · los filtros por categoría (AC3)
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

// ------------------- 5 · paradas numeradas, cama y aeropuerto sin cambios (AC5)
// De cero y con todas las familias prendidas (los aeropuertos y el transporte vienen
// apagados por default), mirando Japón entero.
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
  ord: [...document.querySelectorAll('#day-view .rt-ord')].map(e => e.textContent.trim()).join(' '),
  camas: document.querySelectorAll('#day-view .lodging-marker').length,
  pp: document.querySelectorAll('#day-view .pp').length,
  emojiOn: document.querySelector('#day-view .leaflet-container').classList.contains('pins-emoji'),
}));
check('la jornada real mantiene sus paradas numeradas y su cama',
  diaReal.ord === '1 2 3' && diaReal.camas === 1 && diaReal.pp === 0 && diaReal.emojiOn,
  'paradas ' + diaReal.ord + ' · ' + diaReal.camas + ' cama · contenedor en modo emoji: ' + diaReal.emojiOn);
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
