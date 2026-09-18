// Verificación en navegador de las flechas del teclado en la vista de día (task 687):
// `→` avanza y `←` vuelve, la URL sigue al día mostrado, los bordes del viaje no
// envuelven, y la tecla no se le roba a quien está escribiendo, arrastrando una fila
// del plan o mirando una foto en el lightbox (que tiene sus propias flechas). También
// comprueba que la `d` del modo discreto siga andando adentro de la vista.
//
// No es parte de ninguna suite: necesita Chromium y el sitio servido. Levantarlo con
//   python3 -m http.server 8611 --bind 127.0.0.1   (desde la raíz del repo)
// y después:
//   node japon/scripts/check_dia_keys.mjs [outdir] [baseUrl]
//
// Sale 1 si algún chequeo falla y deja las capturas en <outdir>.
import pw from '/usr/lib/node_modules/agent-browser/node_modules/playwright-core/index.js';
import { mkdirSync } from 'node:fs';
const { chromium } = pw;
const BASE = process.argv[3] || 'http://127.0.0.1:8611/japon/';
const OUT = process.argv[2] || '/tmp/shots-dia-keys';
mkdirSync(OUT, { recursive: true });

let bad = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) bad++;
};

// Lo que se mira en cada tecla: qué día dice la URL, qué día dibuja la barra y si la
// vista sigue abierta. Los tres tienen que moverse juntos o no se movió nada.
const dayState = (page) => page.evaluate(() => {
  const view = document.getElementById('day-view');
  const bar = view && view.querySelector('.dv-count');
  return {
    jornada: new URLSearchParams(location.search).get('jornada'),
    tab: new URLSearchParams(location.search).get('tab'),
    count: bar ? bar.textContent.trim() : null,
    fecha: view && !view.hidden ? view.querySelector('.dv-date').textContent.trim() : null,
    open: !!view && !view.hidden,
    title: document.title,
    prevOff: !!(bar && view.querySelector('.dv-nav.prev').disabled),
    nextOff: !!(bar && view.querySelector('.dv-nav.next').disabled),
    discrete: document.body.classList.contains('discrete'),
  };
});

const open = async (page, date) => {
  await page.goto(BASE + '?tab=dias&jornada=' + date, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1200);
};
const press = async (page, key) => { await page.keyboard.press(key); await page.waitForTimeout(450); };

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
page.on('pageerror', e => { console.log('  [pageerror]', String(e).slice(0, 300)); bad++; });

// ------------------------------------------------- 1 · adelante y atrás (AC1)
await open(page, '2026-10-20');
const s0 = await dayState(page);
check('la vista abre en el día pedido', s0.open && s0.jornada === '2026-10-20', s0.count + ' · ' + s0.fecha);
await press(page, 'ArrowRight');
const s1 = await dayState(page);
check('→ avanza al día siguiente', s1.jornada === '2026-10-21' && s1.open, s1.jornada + ' · ' + s1.count);
check('la URL refleja el día mostrado', s1.count === '16 / 44' && /21 oct/.test(s1.fecha), s1.count + ' · ' + s1.fecha);
check('el <title> también sigue al día', /Día 16/.test(s1.title), s1.title);
await page.screenshot({ path: `${OUT}/ac1-derecha.png` });
await press(page, 'ArrowLeft');
await press(page, 'ArrowLeft');
const s2 = await dayState(page);
check('← vuelve al día anterior', s2.jornada === '2026-10-19' && s2.count === '14 / 44', s2.jornada + ' · ' + s2.count);
await page.screenshot({ path: `${OUT}/ac1-izquierda.png` });
// La misma navegación que los botones: cada tecla deja su entrada y "atrás" desanda.
await page.goBack();
await page.waitForTimeout(500);
const s3 = await dayState(page);
check('cada salto queda en el histórico (atrás desanda uno)', s3.jornada === '2026-10-20', s3.jornada);
// Y sin recargar la página: si hubiera habido navegación dura, esta marca no sobrevive.
await page.evaluate(() => { window.__sinRecargar = true; });
await press(page, 'ArrowRight');
const vivo = await page.evaluate(() => !!window.__sinRecargar);
const s4 = await dayState(page);
check('el salto no recarga la página', vivo && s4.jornada === '2026-10-21', s4.jornada);

// -------------------------------------------------------- 2 · los bordes (AC2)
await open(page, '2026-10-06');
const b0 = await dayState(page);
check('el primer día abre con el ‹ deshabilitado', b0.count === '1 / 44' && b0.prevOff, b0.count);
await press(page, 'ArrowLeft');
const b1 = await dayState(page);
check('en el primer día ← no hace nada', b1.jornada === '2026-10-06' && b1.count === '1 / 44' && b1.open,
  b1.jornada + ' · ' + b1.count);
await page.screenshot({ path: `${OUT}/ac2-primer-dia.png` });
await open(page, '2026-11-18');
const b2 = await dayState(page);
check('el último día abre con el › deshabilitado', b2.count === '44 / 44' && b2.nextOff, b2.count);
await press(page, 'ArrowRight');
const b3 = await dayState(page);
check('en el último día → no hace nada', b3.jornada === '2026-11-18' && b3.count === '44 / 44' && b3.open,
  b3.jornada + ' · ' + b3.count);
await page.screenshot({ path: `${OUT}/ac2-ultimo-dia.png` });

// ------------------------------------------- 3 · el foco de texto manda (AC3)
// El site no tiene campos propios hoy, así que se le pone uno adentro de la vista: la
// guarda es para el que escriba MAÑANA (y para el `contenteditable` de cualquier
// extensión). Con el cursor en el medio del texto, ← tiene que mover el cursor.
await open(page, '2026-10-20');
await page.evaluate(() => {
  const inner = document.querySelector('#day-view .dv-inner');
  const i = document.createElement('input');
  i.id = 'probe-input'; i.type = 'text'; i.value = 'hola mundo';
  const ce = document.createElement('div');
  ce.id = 'probe-ce'; ce.contentEditable = 'true'; ce.textContent = 'texto editable';
  inner.prepend(i, ce);
});
await page.click('#probe-input');
await page.evaluate(() => { const i = document.getElementById('probe-input'); i.setSelectionRange(5, 5); });
await press(page, 'ArrowLeft');
const t1 = await dayState(page);
const cursor = await page.evaluate(() => document.getElementById('probe-input').selectionStart);
check('con el foco en un input ← mueve el cursor, no el día',
  t1.jornada === '2026-10-20' && cursor === 4, 'jornada ' + t1.jornada + ' · cursor ' + cursor);
await press(page, 'ArrowRight');
const t2 = await dayState(page);
check('y → tampoco pasa de día', t2.jornada === '2026-10-20',
  't2 ' + t2.jornada + ' · cursor ' + (await page.evaluate(() => document.getElementById('probe-input').selectionStart)));
await page.screenshot({ path: `${OUT}/ac3-foco-input.png` });
await page.click('#probe-ce');
await press(page, 'ArrowRight');
const t3 = await dayState(page);
check('con el foco en un contenteditable tampoco pasa de día', t3.jornada === '2026-10-20', t3.jornada);
// Suelto el foco: la misma tecla, ahora sí, navega.
await page.evaluate(() => document.activeElement.blur());
await press(page, 'ArrowRight');
const t4 = await dayState(page);
check('soltando el foco la misma tecla vuelve a navegar', t4.jornada === '2026-10-21', t4.jornada);

// ------------------------------------- 4 · el drag y el lightbox se quedan la tecla
// Un drag en curso se marca con `body.plan-dragging`; se simula esa marca porque el
// arrastre real lo prueba `check_plan_round.mjs`.
await open(page, '2026-10-20');
await page.evaluate(() => document.body.classList.add('plan-dragging'));
await press(page, 'ArrowRight');
const d1 = await dayState(page);
check('con un arrastre en curso la flecha no pasa de día', d1.jornada === '2026-10-20', d1.jornada);
await page.evaluate(() => document.body.classList.remove('plan-dragging'));
await press(page, 'ArrowRight');
check('terminado el arrastre vuelve a pasar', (await dayState(page)).jornada === '2026-10-21');

// El lightbox usa ‹ › para recorrer las fotos: mientras está abierto son suyas. Hoy la
// vista de día no dibuja fotos propias (las galerías viven en el acordeón, en la ficha
// de parada y en Hospedajes), así que el estado se fuerza con la clase que el lightbox
// usa para saberse abierto: lo que se prueba es la guarda, no el lightbox.
await open(page, '2026-10-20');
const hayLb = await page.evaluate(() => {
  const lb = document.querySelector('.lightbox');
  if (!lb) return false;
  lb.classList.add('open');
  return true;
});
check('el lightbox existe en la página', hayLb);
await press(page, 'ArrowRight');
const l1 = await dayState(page);
check('con el lightbox abierto encima la flecha no pasa de día', l1.jornada === '2026-10-20', l1.jornada);
await page.evaluate(() => document.querySelector('.lightbox').classList.remove('open'));
await press(page, 'ArrowRight');
check('cerrado el lightbox la flecha vuelve a pasar de día', (await dayState(page)).jornada === '2026-10-21');

// --------------------------------------------- 5 · el modo discreto sigue (AC4)
await open(page, '2026-10-20');
const q0 = await dayState(page);
await press(page, 'd');
const q1 = await dayState(page);
check('la `d` sigue prendiendo el modo discreto adentro de la vista',
  !q0.discrete && q1.discrete && q1.jornada === '2026-10-20', 'discrete ' + q1.discrete);
await page.screenshot({ path: `${OUT}/ac4-discreto.png` });
await press(page, 'ArrowRight');
const q2 = await dayState(page);
check('y en discreto las flechas siguen pasando de día', q2.discrete && q2.jornada === '2026-10-21',
  q2.jornada + ' · discrete ' + q2.discrete);
await press(page, 'd');
const q3 = await dayState(page);
check('la `d` vuelve a apagarlo', !q3.discrete);

// ------------------------------- 6 · fuera de la vista las flechas no son de nadie
await page.goto(BASE + '?tab=dias', { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(1000);
const urlLista = page.url();
await press(page, 'ArrowRight');
check('en la lista de días (sin vista abierta) la flecha no abre nada', page.url() === urlLista,
  page.url().replace(BASE, ''));

// --------------------------------------- 7 · los botones de la barra, intactos
await open(page, '2026-10-20');
await page.click('#day-view .dv-nav.next');
await page.waitForTimeout(400);
const n1 = await dayState(page);
check('el botón › sigue avanzando igual que la tecla', n1.jornada === '2026-10-21' && n1.count === '16 / 44',
  n1.jornada + ' · ' + n1.count);
await page.click('#day-view .dv-nav.prev');
await page.waitForTimeout(400);
const n2 = await dayState(page);
check('el botón ‹ sigue volviendo', n2.jornada === '2026-10-20' && n2.count === '15 / 44',
  n2.jornada + ' · ' + n2.count);
await press(page, 'Escape');
const n3 = await dayState(page);
check('Escape sigue cerrando la vista', !n3.open && !n3.jornada, 'tab ' + n3.tab);

await browser.close();
console.log(bad ? `\n✗ ${bad} check(s) fallaron` : `\n✓ todo ok`);
process.exit(bad ? 1 : 0);
