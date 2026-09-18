#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import playwright from '/usr/lib/node_modules/agent-browser/node_modules/playwright-core/index.js';
const { chromium } = playwright;

const base = process.argv[2] || 'http://127.0.0.1:8611/japon/';
const shots = process.argv[3] || path.resolve('evidence/676');
fs.mkdirSync(shots, { recursive: true });
let failed = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

const browser = await chromium.launch({ headless: true });
const planState = { days: {} };
const writes = [];
const planRoute = async route => {
  if (route.request().method() === 'PUT') {
    const body = route.request().postDataJSON();
    planState.days[body.date] = { promoted: body.promoted };
    writes.push(body);
    return route.fulfill({ json: { ok: true } });
  }
  return route.fulfill({ json: planState });
};

// Sin el link privado la vista es deliberadamente de sólo lectura. Se usa mouse real:
// si el handler público vuelve a enganchar el puntero, este gesto lo hace visible.
const publicPage = await browser.newPage({ viewport: { width: 900, height: 1200 } });
const publicWrites = [];
await publicPage.route('https://votos.mewis.online/**', async route => {
  if (route.request().method() === 'PUT') publicWrites.push(route.request().postDataJSON());
  return route.fulfill({ json: { days: {} } });
});
await publicPage.goto(base + '?tab=dias&jornada=2026-10-19', { waitUntil: 'domcontentloaded' });
const publicSource = publicPage.locator('.day-view .rt-item').first();
await publicSource.waitFor();
check('sin token muestra una sola línea para habilitar edición',
  await publicPage.locator('.day-view .plan-readonly-note:visible').count() === 1 &&
  /link privado del plan/.test(await publicPage.locator('.day-view .plan-readonly-note:visible').innerText()));
const publicBox = await publicSource.boundingBox();
await publicPage.mouse.move(publicBox.x + publicBox.width / 2, publicBox.y + publicBox.height / 2);
await publicPage.mouse.down();
await publicPage.mouse.move(publicBox.x + publicBox.width / 2 + 30, publicBox.y + publicBox.height / 2 + 30, { steps: 5 });
await publicPage.mouse.up();
check('sin token el ítem no se levanta con mouse real',
  await publicPage.locator('.day-view .is-dragging').count() === 0 &&
  await publicPage.locator('.day-view [data-plan-drop].is-drag-reveal').count() === 0 &&
  await publicSource.locator('.pl-grip').count() === 0 &&
  !await publicSource.evaluate(el => el.classList.contains('plan-move')) &&
  (await publicSource.evaluate(el => getComputedStyle(el).cursor)) !== 'grab' &&
  publicWrites.length === 0);
await publicPage.screenshot({ path: path.join(shots, 'plan-publico-solo-lectura.png'), fullPage: false });
await publicPage.close();
// El site tiene UN tema y dos modos de lectura: normal y discreto (🙈 / tecla `d`, el
// que enmascara hospedajes y fechas). No hay dark mode — pasarle `colorScheme: 'dark'`
// a Playwright no cambia un pixel, y así se sacaban cuatro capturas idénticas que no
// probaban nada. El badge se mide y se fotografía en los dos MODOS, recortando sobre la
// caja de sugerencias: si el recorte no contiene la lista, la captura no es evidencia.
const BADGE_BEFORE = '.rt-item,.rt-item .sg-item{align-items:baseline!important}' +
  '.rt-item .sg-item::before{font-size:8.5px!important;line-height:normal!important;position:relative!important;top:2px!important}';
for (const mode of ['normal', 'discreto']) {
  const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
  await page.route('https://votos.mewis.online/**', route => route.request().method() === 'GET'
    ? route.fulfill({ json: { days: {} } }) : route.fulfill({ json: { ok: true } }));
  await page.goto(base + '?tab=dias&jornada=2026-10-14&plan=test', { waitUntil: 'domcontentloaded' });
  await page.locator('.rt-item').first().waitFor();
  if (mode === 'discreto') {
    await page.evaluate(() => document.getElementById('discrete-toggle').click());
    await page.waitForFunction(() => document.body.classList.contains('discrete'));
  }
  const style = await page.locator('.rt-item').first().evaluate(el => {
    const row = getComputedStyle(el), badge = getComputedStyle(el.querySelector('.sg-item'), '::before');
    return { align: row.alignItems, size: badge.fontSize, line: badge.lineHeight, top: badge.top, pos: badge.position };
  });
  check(`${mode}: filas y badge alineados`, style.align === 'center' && style.size === '9px' && style.line === '9px' && style.pos === 'static', JSON.stringify(style));
  const sug = page.locator('.day-view .dv-sug').first();
  await sug.scrollIntoViewIfNeeded();
  const shot = async name => {
    await sug.screenshot({ path: path.join(shots, name) });
    return fs.readFileSync(path.join(shots, name)).toString('base64');
  };
  const after = await shot(`alignment-after-${mode}.png`);
  await page.addStyleTag({ content: BADGE_BEFORE });
  const before = await shot(`alignment-before-${mode}.png`);
  check(`${mode}: la captura antes/después muestra la diferencia`, before !== after);
  await page.close();
}

const page = await browser.newPage({ viewport: { width: 900, height: 1600 } });
await page.route('https://votos.mewis.online/**', planRoute);
await page.goto(base + '?tab=dias&jornada=2026-10-19&plan=test', { waitUntil: 'domcontentloaded' });
const source = page.locator('.day-view .rt-item.plan-move').first();
await source.evaluate(el => { window.__dragNode = el; });
check('drop vacío ausente antes del drag', await page.locator('.day-view [data-plan-drop].is-drag-reveal').count() === 0);
check('sin copy instructivo', (await page.locator('body').innerText()).includes('Arrastrá sugerencias acá') === false);
const affordance = await source.evaluate(el => ({ grip: !!el.querySelector('.pl-grip'), cursor: getComputedStyle(el).cursor }));
check('sugerencia tiene affordance', affordance.grip && affordance.cursor === 'grab', JSON.stringify(affordance));
await page.evaluate(() => {
  window.__listReplacements = 0; window.__pointerDown = false;
  document.addEventListener('pointerdown', () => { window.__pointerDown = true; }, true);
  document.addEventListener('pointerup', () => { window.__pointerDown = false; }, true);
  new MutationObserver(ms => {
    if (!window.__pointerDown) return;
    // Las DOS listas del día: la de sugerencias y la del itinerario (que desde la ronda 3
    // es `.pl-list[data-plan-drop]`; el viejo `.pl-promoted-list` ya no existe y dejaba
    // la mitad del gesto sin vigilar).
    window.__listReplacements += ms.filter(m => m.type === 'childList' && m.target.closest && m.target.closest('.rt-list,.pl-list')).length;
  }).observe(document.body, { subtree: true, childList: true });
});
const a = await source.boundingBox();
await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
await page.mouse.down();
await page.mouse.move(a.x + a.width / 2 + 12, a.y + a.height / 2, { steps: 2 });
const drop = page.locator('.day-view [data-plan-drop]');
await drop.waitFor();
check('zona unificada recibe el drag', await drop.count() === 1);
const b = await drop.boundingBox();
// La captura del hueco se toma en el MEDIO de la lista, no en el borde de arriba:
// soltando en la primera posición los vecinos casi no se corren y la foto no muestra
// nada. Parado entre dos renglones, el FLIP abre el hueco y eso es lo que hay que ver.
await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 });
await page.waitForTimeout(220);
const gap = await drop.boundingBox();
await page.screenshot({ path: path.join(shots, 'drag-gap-open.png'), clip: { x: gap.x - 10, y: gap.y - 10, width: gap.width + 20, height: gap.height + 20 } });
await page.mouse.up();
await page.waitForTimeout(100);
check('cero reemplazos de lista durante drag', await page.evaluate(() => window.__listReplacements) === 0, String(await page.evaluate(() => window.__listReplacements)));
check('drag conserva identidad del nodo', await page.evaluate(() => window.__dragNode === document.querySelector('.day-view .pl-promoted')));
// Promover es lo que le da sentido al check: el renglón lo estrena al entrar al
// itinerario, sin esperar a un re-render.
check('el ítem promovido estrena su círculo de checklist',
  await page.locator('.day-view .pl-promoted .activity-check').count() === 1);
const savedKey = await page.locator('.day-view .pl-promoted').first().getAttribute('data-plan-key');
check('mouse real hace PUT en día sin promociones', writes.some(w => w.date === '2026-10-19' && w.promoted.includes(savedKey)), JSON.stringify(writes.at(-1)));
await page.reload({ waitUntil: 'domcontentloaded' });
check('promoción sobrevive reload', await page.locator(`.day-view .pl-promoted[data-plan-key="${savedKey}"]`).count() === 1);
await page.screenshot({ path: path.join(shots, 'unified-itinerary.png'), fullPage: false });
check('sin controles ↑↓', await page.locator('[data-plan-up],[data-plan-down]').count() === 0);
check('itinerario y actividades comparten una lista', await page.locator('.day-view .pl-list[data-plan-drop] > .pl-it').count() >= 2 && await page.locator('.day-view .pl-list[data-plan-drop] > .pl-promoted').count() === 1);
check('sugerencias sin número; itinerario numerado', await page.locator('.day-view .rt-item .pl-t').count() === 0 && /^\d+\.$/.test((await page.locator('.day-view .pl-promoted .pl-t').innerText()).trim()));
check('emojis visibles en sugerencias e itinerario', await page.locator('.day-view .rt-item .rt-ic').count() > 0 && /[\u{1F300}-\u{1FAFF}]/u.test(await page.locator('.day-view .pl-promoted .pl-k').innerText()));

// Reproduce el camino que fallaba en un navegador táctil: Chromium cancelaba el
// pointer al interpretar el movimiento vertical como scroll. Los eventos enviados
// por CDP son input confiable del navegador, no PointerEvents sintéticos del DOM.
const touchContext = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
const touch = await touchContext.newPage();
await touch.route('https://votos.mewis.online/**', planRoute);
await touch.goto(base + '?tab=dias&jornada=2026-10-19&plan=test', { waitUntil: 'domcontentloaded' });
const touchSource = touch.locator('.day-view .rt-item.plan-move').first();
await touchSource.scrollIntoViewIfNeeded();
const grip = await touchSource.locator('.pl-grip').boundingBox();
const touchDrop = touch.locator('.day-view [data-plan-drop]');
const session = await touchContext.newCDPSession(touch);
await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: grip.x + grip.width / 2, y: grip.y + grip.height / 2 }] });
await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: grip.x + grip.width / 2 + 12, y: grip.y + grip.height / 2 + 18 }] });
await touchDrop.waitFor();
const touchTarget = await touchDrop.boundingBox();
const touchTargetY = Math.max(20, Math.min(824, touchTarget.y + touchTarget.height - 20));
await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: touchTarget.x + touchTarget.width / 2, y: touchTargetY }] });
await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
await touch.waitForTimeout(100);
check('touch real hace PUT y no termina en pointercancel', writes.some(w => w.date === '2026-10-19' && w.promoted.length === 2), JSON.stringify(writes.at(-1)));
await touch.reload({ waitUntil: 'domcontentloaded' });
check('persistencia táctil sobrevive reload', await touch.locator('.day-view .pl-promoted').count() === 2);
await touchContext.close();

// Task 690: la fila completa se agarra con long-press, pero un tap o un swipe inmediato
// conservan su semántica nativa. Todo entra por CDP para que Chromium decida de verdad
// entre scroll, pointercancel y drag; dispatchEvent(new PointerEvent(...)) no lo prueba.
const longPressState = { days: {} }, longPressWrites = [];
const phoneContext = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
const phone = await phoneContext.newPage();
await phone.route('https://votos.mewis.online/**', async route => {
  if (route.request().method() === 'PUT') {
    const body = route.request().postDataJSON();
    longPressState.days[body.date] = { promoted: body.promoted };
    longPressWrites.push(body);
    return route.fulfill({ json: { ok: true } });
  }
  return route.fulfill({ json: longPressState });
});
await phone.goto(base + '?tab=dias&jornada=2026-10-11&plan=touch-row', { waitUntil: 'domcontentloaded' });
const phoneSource = phone.locator('.day-view .rt-item.plan-move').first();
await phoneSource.scrollIntoViewIfNeeded();
const phoneSession = await phoneContext.newCDPSession(phone);
const rowPoint = async () => {
  const name = await phoneSource.locator('.sg-name').boundingBox();
  return { x: name.x + name.width / 2, y: name.y + name.height / 2 };
};
const gripSize = await phoneSource.locator('.pl-grip').boundingBox();
check('grip táctil mide al menos 44 × 44 px', gripSize.width >= 44 && gripSize.height >= 44,
  `${gripSize.width}×${gripSize.height}`);

let p = await rowPoint();
await phoneSession.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [p] });
await phoneSession.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
await phone.waitForTimeout(380);
check('tap corto no levanta ni escribe', await phone.locator('.is-dragging').count() === 0 &&
  await phone.locator('[data-plan-drop].is-drag-reveal').count() === 0 && longPressWrites.length === 0);

const scrollMetric = () => phone.evaluate(() => scrollY + [...document.querySelectorAll('.view-pane,.day-view')]
  .reduce((sum, el) => sum + el.scrollTop, 0));
const scrollBefore = await scrollMetric();
p = await rowPoint();
await phoneSession.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [p] });
for (const dy of [20, 55, 95, 135]) {
  await phoneSession.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: p.x, y: p.y - dy }] });
}
await phoneSession.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
await phone.waitForTimeout(180);
const scrollAfter = await scrollMetric();
check('swipe vertical inmediato conserva el scroll', scrollAfter > scrollBefore + 20 &&
  await phone.locator('.is-dragging').count() === 0 && longPressWrites.length === 0,
  `${scrollBefore}→${scrollAfter}`);

await phoneSource.scrollIntoViewIfNeeded();
p = await rowPoint();
const longPressKey = await phoneSource.getAttribute('data-plan-key');
await phoneSession.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [p] });
await phone.waitForTimeout(360);
check('long-press sobre la fila muestra que agarró', await phoneSource.evaluate(el => el.classList.contains('is-dragging')));
const phoneDrop = phone.locator('.day-view [data-plan-drop="2026-10-11"]');
await phoneDrop.waitFor();
const phoneTarget = await phoneDrop.boundingBox();
await phoneSession.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{
  x: phoneTarget.x + phoneTarget.width / 2,
  y: Math.max(20, Math.min(824, phoneTarget.y + Math.min(24, phoneTarget.height / 2))),
}] });
await phoneSession.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
await phone.waitForTimeout(150);
check('long-press de fila promueve con touch real', longPressWrites.at(-1)?.promoted.includes(longPressKey) &&
  await phone.locator(`.day-view .pl-promoted[data-plan-key="${longPressKey}"]`).count() === 1,
  JSON.stringify(longPressWrites.at(-1)));
await phoneContext.close();

// --------------------------------------------------- ronda 4 · arranque en frío
// El agujero que dejó pasar «cuando refresco ya no está»: hasta acá TODOS los GET del
// harness devolvían `{days:{}}`, así que nunca se ejercía el caso real —la página pinta
// con el plan vacío y el server contesta DESPUÉS con promovidos—. Y el día tiene que ser
// uno SIN nada fijo (el 11/10 es un día entero en Tokio: ni check-in, ni traslado, ni
// reserva), porque ahí el primer pintado ni siquiera crea la `[data-plan-drop]` sobre la
// que trabajaba `syncPlanDom`. Con el código de la ronda 3 esto queda en 0 promovidos.
const coldKeysPage = await browser.newPage();
await coldKeysPage.route('https://votos.mewis.online/**', route => route.fulfill({ json: { days: {} } }));
await coldKeysPage.goto(base + '?tab=dias&jornada=2026-10-11&plan=frio', { waitUntil: 'domcontentloaded' });
await coldKeysPage.locator('.day-view .rt-item[data-plan-key]').first().waitFor();
const coldKeys = await coldKeysPage.locator('.day-view .rt-item[data-plan-key]').evaluateAll(rows => rows.slice(0, 3).map(r => r.dataset.planKey));
check('el 11/10 no tiene itinerario fijo (es el día que rompía)',
  coldKeys.length === 3 && await coldKeysPage.locator('.day-view [data-plan-drop]').count() === 0);
await coldKeysPage.close();

// ------------------------------------------- ronda 5 · decir cada cosa una vez (686)
// Martín, 18/9, sobre la lista de un día: «no duplicaría el texto eg. en esta imagen de
// itinerario con más de un "templos y museos"» y «las actividades en esta lista deberían
// tener disponibles sus links también».
//
// El fixture se arma a mano —A, A, B: dos de la misma categoría seguidas y una tercera
// distinta— para que el caso no dependa de qué recorrido arme la geografía del día. Y se
// arma SÓLO con lugares que en el catálogo ya tienen links, porque contra eso se compara
// después: promover un lugar no le puede sacar lo que la ficha le daba.
const catalogLinks = new Map();
const groupedFixture = await (async () => {
  const p = await browser.newPage();
  await p.route('https://votos.mewis.online/**', route => route.fulfill({ json: { days: {} } }));
  await p.goto(base + '?tab=dias&jornada=2026-10-11&plan=groups', { waitUntil: 'domcontentloaded' });
  await p.locator('.day-view .sg-all > summary').first().click();
  await p.locator('.day-view .sg-all .thing-row[data-check]').first().waitFor();
  (await p.locator('.day-view .sg-all .thing-row[data-check]').evaluateAll(els => els.map(el => ({
    key: el.dataset.check, links: el.querySelectorAll('.source-links .source-link').length,
  })))).forEach(r => catalogLinks.set(r.key, r.links));
  const rows = (await p.locator('.day-view .rt-item[data-plan-key]').evaluateAll(els => els.map(el => ({
    key: el.dataset.planKey, cat: el.dataset.planCat,
  })))).filter(r => catalogLinks.get(r.key) > 0);
  await p.close();
  // Dos de la misma categoría + una de otra entran al plan; una cuarta, de una TERCERA
  // categoría, queda de sugerencia para promoverla con el dedo y ver si estrena rótulo.
  const cat = [...new Set(rows.map(r => r.cat))].find(c => rows.filter(r => r.cat === c).length >= 2);
  const same = rows.filter(r => r.cat === cat).slice(0, 2);
  const other = rows.find(r => r.cat !== cat);
  const third = rows.find(r => r.cat !== cat && r.cat !== other.cat);
  return { same, other, third, promoted: [same[0], same[1], other] };
})();
for (const width of [1400, 390]) {
  const grouped = await browser.newPage({ viewport: { width, height: 1100 } });
  await grouped.route('https://votos.mewis.online/**', route => route.fulfill({ json: {
    days: { '2026-10-11': { promoted: groupedFixture.promoted.map(x => x.key) } },
  } }));
  await grouped.goto(base + '?tab=dias&jornada=2026-10-11&plan=groups', { waitUntil: 'domcontentloaded' });
  await grouped.locator('.day-view .pl-promoted').first().waitFor();
  const labels = await grouped.locator('.day-view .pl-promoted .pl-k').allTextContents();
  check(`${width}px: categoría consecutiva se rotula una vez y vuelve al cambiar`,
    labels.length === 2 && labels[0].includes(groupedFixture.same[0].cat) &&
    labels[1].includes(groupedFixture.other.cat), JSON.stringify(labels));
  const rowLinks = await grouped.locator('.day-view .pl-promoted').evaluateAll(els => els.map(el => ({
    key: el.dataset.planKey, links: el.querySelectorAll(':scope .pl-mainrow > .source-links .source-link').length,
  })));
  check(`${width}px: el ítem del itinerario ofrece los mismos links que su ficha`,
    rowLinks.length === 3 && rowLinks.every(r => r.links > 0 && r.links === catalogLinks.get(r.key)),
    JSON.stringify(rowLinks));
  check(`${width}px: los links entran en el renglón, sin sumar uno fijo`,
    await grouped.locator('.day-view .pl-promoted .pl-lk').count() === 0 &&
    await grouped.locator('.day-view .pl-promoted .pl-mainrow > .source-links').count() === 3);
  await grouped.locator('.day-view').screenshot({ path: path.join(shots, `itinerario-686-${width}.png`) });
  await grouped.close();
}

// El orden lo cambia el dedo, así que "esta categoría ya se dijo" es una propiedad del
// DOM y no del render: mover el de la otra categoría arriba de todo deja a los dos
// iguales pegados, y ahí el rótulo tiene que decirse una sola vez. Después se promueve
// con el dedo un tercero de esa misma categoría: llega sin rótulo propio y CON sus links.
const groupState = { days: { '2026-10-11': { promoted: groupedFixture.promoted.map(x => x.key) } } };
const reorder = await browser.newPage({ viewport: { width: 1400, height: 1100 } });
await reorder.route('https://votos.mewis.online/**', async route => {
  if (route.request().method() !== 'PUT') return route.fulfill({ json: groupState });
  const body = route.request().postDataJSON();
  groupState.days[body.date] = { promoted: body.promoted };
  return route.fulfill({ json: { ok: true } });
});
await reorder.goto(base + '?tab=dias&jornada=2026-10-11&plan=groups', { waitUntil: 'domcontentloaded' });
await reorder.locator('.day-view .pl-promoted').first().waitFor();
// La regla, escrita como regla y no como una lista de rótulos esperados: lleva rótulo
// exactamente el que ABRE su categoría —el primero de la lista, o el que viene después
// de otra categoría— y ninguno más. Así el check no pasa de casualidad cuando el orden
// nuevo deja los rótulos donde estaban.
const planRows = () => reorder.locator('.day-view .pl-promoted').evaluateAll(els => els.map(el => ({
  cat: el.dataset.planCat, label: (el.querySelector(':scope > .pl-cat .pl-k') || {}).textContent || '',
})));
const opensRule = rows => rows.length > 1 && rows.every((r, i) =>
  !!r.label === (i === 0 || rows[i - 1].cat !== r.cat) && (!r.label || r.label.includes(r.cat)));
const dragRow = async (from, toBox, dy) => {
  const box = await from.boundingBox();
  await from.scrollIntoViewIfNeeded();
  await reorder.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await reorder.mouse.down();
  await reorder.mouse.move(box.x + box.width / 2 + 12, box.y + box.height / 2, { steps: 2 });
  await reorder.mouse.move(toBox.x + toBox.width / 2, toBox.y + dy, { steps: 10 });
  await reorder.mouse.up();
  await reorder.waitForTimeout(200);
};
check('el render ya cumple la regla del rótulo', opensRule(await planRows()), JSON.stringify(await planRows()));
// El de la otra categoría se mete EN EL MEDIO de los dos iguales: eso parte la serie y
// el segundo —que hasta recién no decía nada— tiene que estrenar rótulo. Con los rótulos
// escritos a mano en el check esto pasaba de casualidad; contra la regla, no.
const secondBox = await reorder.locator('.day-view .pl-promoted').nth(1).boundingBox();
await dragRow(reorder.locator('.day-view .pl-promoted').last(), secondBox, 2);
const afterDrag = await planRows();
check('reordenar recalcula el rótulo sobre el orden nuevo',
  opensRule(afterDrag) && afterDrag.length === 3 && afterDrag[1].cat === groupedFixture.other.cat &&
  !!afterDrag[2].label && afterDrag[2].cat === groupedFixture.same[0].cat, JSON.stringify(afterDrag));

const newcomer = reorder.locator(`.day-view .rt-item[data-plan-key="${groupedFixture.third.key}"]`);
const lastPromoted = await reorder.locator('.day-view .pl-promoted').last().boundingBox();
await dragRow(newcomer, lastPromoted, lastPromoted.height - 2);
const promotedNow = reorder.locator(`.day-view .pl-promoted[data-plan-key="${groupedFixture.third.key}"]`);
check('promovido con el dedo: entra con sus links y con el rótulo que le toque',
  await promotedNow.count() === 1 && opensRule(await planRows()) &&
  await promotedNow.locator(':scope > .pl-cat .pl-k').count() === 1 &&
  await promotedNow.locator('.pl-mainrow > .source-links .source-link').count() === catalogLinks.get(groupedFixture.third.key),
  JSON.stringify(await planRows()));
await reorder.close();

const coldRoute = async route => {
  if (route.request().method() !== 'GET') return route.fulfill({ json: { ok: true } });
  await new Promise(resolve => setTimeout(resolve, 300));   // resuelve después del primer pintado
  return route.fulfill({ json: { days: { '2026-10-11': { promoted: coldKeys } } } });
};
for (const [label, url, scope] of [
  ['vista de día', '?tab=dias&jornada=2026-10-11&plan=frio', '.day-view'],
  ['tarjeta de la tab', '?tab=dias&plan=frio', '[data-jornada-card="2026-10-11"]'],
]) {
  const cold = await browser.newPage({ viewport: { width: 900, height: 1200 } });
  await cold.route('https://votos.mewis.online/**', coldRoute);
  await cold.goto(base + url, { waitUntil: 'domcontentloaded' });
  await cold.locator(`${scope} .pl-promoted`).first().waitFor({ timeout: 5000 }).catch(() => {});
  check(`${label}: el plan que llega tarde crea la zona del día`,
    await cold.locator(`${scope} [data-plan-drop="2026-10-11"]`).count() === 1);
  check(`${label}: el plan que llega tarde promueve sus ítems`,
    await cold.locator(`${scope} .pl-promoted`).count() === coldKeys.length,
    String(await cold.locator(`${scope} .pl-promoted`).count()));
  check(`${label}: lo promovido ya no figura como sugerencia`,
    await cold.locator(`${scope} .rt-item[data-plan-key="${coldKeys[0]}"]`).count() === 0);
  await cold.close();
}

// Task 685: la numeración nace de la lista unificada, no de la posición que cada
// actividad ocupaba en el recorrido de sugerencias. El mapa consume ese mismo número.
const numberedState = { days: { '2026-10-11': { promoted: [...coldKeys] } } };
const numberedWrites = [];
const numbered = await browser.newPage({ viewport: { width: 900, height: 1200 } });
await numbered.route('https://votos.mewis.online/**', async route => {
  if (route.request().method() === 'PUT') {
    const body = route.request().postDataJSON();
    numberedState.days[body.date] = { promoted: body.promoted };
    numberedWrites.push(body);
    return route.fulfill({ json: { ok: true } });
  }
  return route.fulfill({ json: numberedState });
});
await numbered.goto(base + '?tab=dias&jornada=2026-10-11&plan=numeros', { waitUntil: 'domcontentloaded' });
await numbered.locator('.day-view .pl-promoted').first().waitFor();
const visibleNumbers = () => numbered.locator('.day-view .pl-promoted > .pl-t').allTextContents();
const pinNumbers = () => numbered.locator('.day-view [data-day-map] .rt-ord').allTextContents();
check('tres promovidos se numeran 1, 2, 3 sin huecos',
  JSON.stringify(await visibleNumbers()) === JSON.stringify(['1.', '2.', '3.']), JSON.stringify(await visibleNumbers()));
check('los pines promovidos usan los mismos números que las filas',
  JSON.stringify(await pinNumbers()) === JSON.stringify(['1', '2', '3']), JSON.stringify(await pinNumbers()));
await numbered.locator('.day-view [data-day-map]').screenshot({ path: path.join(shots, 'promovidos-mapa-numerado.png') });

// Reordenar el tercero al principio con input real renumera las tres filas y persiste
// el nuevo orden, sin heredar ningún ordinal del catálogo de sugerencias.
const lastRow = numbered.locator('.day-view .pl-promoted').last();
const firstRow = numbered.locator('.day-view .pl-promoted').first();
const lastBox = await lastRow.boundingBox(), firstBox = await firstRow.boundingBox();
const movedKey = await lastRow.getAttribute('data-plan-key');
await numbered.mouse.move(lastBox.x + lastBox.width / 2, lastBox.y + lastBox.height / 2);
await numbered.mouse.down();
await numbered.mouse.move(lastBox.x + lastBox.width / 2 + 12, lastBox.y + lastBox.height / 2, { steps: 2 });
await numbered.mouse.move(firstBox.x + firstBox.width / 2, firstBox.y + 2, { steps: 10 });
await numbered.mouse.up();
await numbered.waitForTimeout(150);
check('reordenar renumera 1, 2, 3 y guarda el orden nuevo',
  JSON.stringify(await visibleNumbers()) === JSON.stringify(['1.', '2.', '3.']) &&
    numberedWrites.at(-1)?.promoted[0] === movedKey,
  JSON.stringify(numberedWrites.at(-1)));

await numbered.locator('.day-view .pl-promoted').nth(1).locator('[data-plan-remove]').click();
await numbered.waitForTimeout(150);
check('quitar el del medio renumera filas y pines',
  JSON.stringify(await visibleNumbers()) === JSON.stringify(['1.', '2.']) &&
    JSON.stringify(await pinNumbers()) === JSON.stringify(['1', '2']),
  `filas=${JSON.stringify(await visibleNumbers())} pines=${JSON.stringify(await pinNumbers())}`);
await numbered.close();

// Arrastrar y refrescar contra un server con estado, en un día sin itinerario fijo: es
// el gesto de Martín, con F5 en el medio.
const f5 = await browser.newPage({ viewport: { width: 900, height: 1400 } });
await f5.route('https://votos.mewis.online/**', planRoute);
await f5.goto(base + '?tab=dias&jornada=2026-10-11&plan=test', { waitUntil: 'domcontentloaded' });
const f5src = f5.locator('.day-view .rt-item.plan-move').first();
await f5src.scrollIntoViewIfNeeded();
const f5box = await f5src.boundingBox();
const f5key = await f5src.getAttribute('data-plan-key');
await f5.mouse.move(f5box.x + f5box.width / 2, f5box.y + f5box.height / 2);
await f5.mouse.down();
await f5.mouse.move(f5box.x + f5box.width / 2 + 14, f5box.y + f5box.height / 2, { steps: 3 });
const f5drop = f5.locator('.day-view [data-plan-drop="2026-10-11"]');
await f5drop.waitFor();
const f5target = await f5drop.boundingBox();
await f5.mouse.move(f5target.x + f5target.width / 2, f5target.y + Math.min(24, f5target.height / 2), { steps: 10 });
await f5.mouse.up();
await f5.waitForTimeout(150);
check('arrastrar en un día sin itinerario fijo hace PUT',
  writes.some(w => w.date === '2026-10-11' && w.promoted.includes(f5key)), JSON.stringify(writes.at(-1)));
await f5.reload({ waitUntil: 'domcontentloaded' });
await f5.locator(`.day-view .pl-promoted[data-plan-key="${f5key}"]`).waitFor({ timeout: 5000 }).catch(() => {});
check('F5 deja el ítem donde se lo dejó',
  await f5.locator(`.day-view .pl-promoted[data-plan-key="${f5key}"]`).count() === 1);
await f5.close();

await page.goto(base + '?tab=dias&jornada=2026-10-14&plan=test', { waitUntil: 'domcontentloaded' });
const geibikei = page.locator('.day-view .pl-reserva').filter({ hasText: 'Geibikei' });
const text = await geibikei.innerText();
check('Geibikei fijo con salida calculada', /Salir 08:45/.test(text), text.replace(/\n/g, ' · '));
check('Geibikei avisa temporada', /temporada 2025-26, pendiente de reconfirmar/.test(text));
const checkin = page.locator('.day-view .pl-check-in').first();
const checkinText = await checkin.innerText();
check('check-in sin hora límite queda pendiente',
  /Horario límite pendiente de confirmar/.test(checkinText), checkinText.replace(/\n/g, ' · '));

// ------------------------------------------------- ronda 4 · una sola escala
// Martín, 18/9, sobre esta misma card: «hay muchas fonts con distintos tamaños, widths,
// weights, colores». Eran 15 tamaños, 3 pesos, 10 colores y 3 familias. Se recorre el
// texto REAL de la jornada —el que está a la vista, pseudo-elementos aparte— y se exige
// la escala declarada arriba de views.css. Si alguien agrega un `font-size` nuevo, acá
// aparece con su clase y su texto.
const SIZES = ['10px', '11.5px', '13.5px', '21px'];
const WEIGHTS = ['400', '600', '700'];
const COLORS = ['rgb(26, 26, 26)', 'rgb(141, 136, 120)', 'rgb(15, 110, 86)'];
const typeInventory = root => Array.from(document.querySelectorAll(root)).flatMap(el => {
  const out = [];
  const walk = node => {
    // La escala tipográfica mide la card; los glifos de Leaflet (incluidos los
    // ordinales del mapa) son iconografía superpuesta, no texto de la ficha.
    if (node.nodeType === 1 && node.closest('.leaflet-container')) return;
    const cs = getComputedStyle(node);
    if (cs.display === 'none' || cs.visibility === 'hidden') return;
    for (const child of node.childNodes) {
      if (child.nodeType === 3 && child.textContent.trim()) {
        out.push({ cls: String(node.className || node.tagName), size: cs.fontSize, weight: cs.fontWeight,
          color: cs.color, fam: cs.fontFamily.split(',')[0].trim(), txt: child.textContent.trim().slice(0, 30) });
      }
      if (child.nodeType === 1) walk(child);
    }
  };
  walk(el);
  return out;
});
for (const width of [1400, 390]) {
  const type = await browser.newPage({ viewport: { width, height: 1000 } });
  await type.route('https://votos.mewis.online/**', route => route.fulfill({ json: { days: {} } }));
  await type.goto(base + '?tab=dias&jornada=2026-10-14&plan=test', { waitUntil: 'domcontentloaded' });
  await type.locator('.day-view .pl-it').first().waitFor();
  const inv = await type.evaluate(typeInventory, '.day-view');
  const off = inv.filter(i => !SIZES.includes(i.size) || !WEIGHTS.includes(i.weight) ||
    !COLORS.includes(i.color) || i.fam !== '-apple-system');
  check(`${width}px: la card del 14/10 entra en la escala`, inv.length > 40 && off.length === 0,
    off.length ? off.slice(0, 4).map(i => `${i.cls} ${i.size}/${i.weight}/${i.color}/${i.fam} «${i.txt}»`).join(' · ')
      : `${inv.length} nodos · ${[...new Set(inv.map(i => i.size))].length} tamaños`);
  // La deducción no puede gritar más fuerte que el hecho: "Salir 08:45 · JR Ofunato…"
  // estaba en 16px, más grande que el nombre de la actividad.
  const pair = await type.evaluate(() => ({
    depart: parseFloat(getComputedStyle(document.querySelector('.day-view .pl-depart')).fontSize),
    name: parseFloat(getComputedStyle(document.querySelector('.day-view .pl-reserva .pl-w')).fontSize),
  }));
  check(`${width}px: .pl-depart no le gana a .pl-w`, pair.depart <= pair.name, JSON.stringify(pair));
  await type.close();
}

// El círculo de "hecho" es del itinerario, no del catálogo de candidatos (Martín, 18/9:
// «lo dejaría sólo para lo que está en el itinerario, no para las sugerencias»).
check('las sugerencias no llevan círculo de checklist',
  await page.locator('.day-view .rt-item .activity-check').count() === 0 &&
  await page.locator('.day-view .rt-item[data-check]').count() === 0);
check('el itinerario sí lo lleva (Geibikei es una actividad)',
  await geibikei.locator('.activity-check').count() === 1);

const beforeUrl = page.url();
await geibikei.locator('[data-day-map-act]').click();
check('link de mapa queda en la vista de día', page.url() === beforeUrl && await page.locator('.day-view:not([hidden])').count() === 1);
await page.goto(base + '?tab=dias&jornada=2026-10-31&plan=test', { waitUntil: 'domcontentloaded' });
const completeCheckinText = await page.locator('.day-view .pl-check-in').innerText();
check('check-in dice la ventana una vez y conserva el margen',
  (completeCheckinText.match(/23:00/g) || []).length === 1 && /margen planificado 1 h 20/.test(completeCheckinText) &&
  !/Límite de check-in:/.test(completeCheckinText), completeCheckinText.replace(/\n/g, ' · '));

// Los dos bordes del margen, ejercidos sobre el hospedaje de Fukuoka (llega 21:40)
// reescribiendo su ventana en el HTML servido: llegar DESPUÉS del límite, y un límite
// que cae del otro lado de la medianoche (Osaka abre 14:00 y cierra 01:00). El primero
// salía "-1 h 40" y el segundo habría contado la vuelta del reloj al revés.
const SRC = "checkInFrom: '15:00', checkInTo: '23:00'";
const SRC_BOOKING = "checkIn: '31 oct · 15:00–23:00'";
// Además del texto se mira la CLASE y el fondo: sacada la línea del límite, lo que
// separa un check-in normal de uno sin hora y de uno al que se llega tarde ya no es un
// renglón de más, así que tiene que verse (task 686). El fondo y no la tinta, porque la
// card tiene tres colores de texto y la ronda 4 es justamente no sumar un cuarto.
//
// La ventana se reescribe en los DOS lugares de los que puede salir —los campos del
// hospedaje y la línea de la reserva, que es la que gana— para que el hospedaje de
// mentira sea coherente; salvo cuando el caso a probar es justamente que no lo sea.
const marginLine = async ({ from, to, booking, shot }) => {
  const p = await browser.newPage();
  await p.route('https://votos.mewis.online/**', route => route.fulfill({ json: { days: {} } }));
  await p.route('**/japon/?*', async route => {
    const res = await route.fetch();
    const html = (await res.text())
      .replace(SRC, "checkInFrom: '" + from + "'" + (to ? ", checkInTo: '" + to + "'" : ''))
      .replace(SRC_BOOKING, "checkIn: '31 oct · " + (booking || (to ? from + '–' + to : 'desde ' + from)) + "'");
    return route.fulfill({ response: res, body: html });
  });
  await p.goto(base + '?tab=dias&jornada=2026-10-31', { waitUntil: 'domcontentloaded' });
  await p.locator('.day-view .pl-check-in').first().waitFor();
  const line = await p.locator('.day-view .pl-check-in').first().evaluate(el => {
    const row = el.querySelector('.pl-limit'), b = row && row.querySelector('b'), cs = b && getComputedStyle(b);
    return { win: el.querySelector('.pl-win').innerText, text: row ? row.innerText : '',
      cls: row ? row.className : '', ink: cs && cs.color, chip: cs && cs.backgroundColor };
  });
  if (shot) await p.locator('.day-view .pl-check-in').first().screenshot({ path: path.join(shots, shot) });
  await p.close();
  return line;
};
const normalLine = await marginLine({ from: '15:00', to: '23:00', shot: 'check-in-686-normal.png' });
check('con ventana completa el límite se dice una sola vez',
  normalLine.win === 'Check-in 15:00–23:00' && !/23:00/.test(normalLine.text) &&
  /margen planificado 1 h 20/.test(normalLine.text) && !/Límite de check-in/.test(normalLine.text),
  JSON.stringify(normalLine));
const lateLine = await marginLine({ from: '15:00', to: '21:00', shot: 'check-in-686-tarde.png' });
check('llegar después del límite se dice, no se resta en negativo',
  /llegás 40 min tarde/.test(lateLine.text) && !/-\d/.test(lateLine.text) && !/21:00/.test(lateLine.text) &&
  /is-late/.test(lateLine.cls) && lateLine.chip !== normalLine.chip && lateLine.ink === normalLine.ink,
  JSON.stringify(lateLine));
const overnightLine = await marginLine({ from: '20:00', to: '01:00' });
check('el límite de madrugada suma margen, no lo resta',
  /margen planificado 3 h 20/.test(overnightLine.text) && !/01:00/.test(overnightLine.text), JSON.stringify(overnightLine));
// El caso en que el rango NO nombra el límite: la reserva dice "desde 15:00" y el dato
// del hospedaje igual tiene las 23:00. Ahí este renglón es el único que lo puede decir.
const unsaidLine = await marginLine({ from: '15:00', to: '23:00', booking: 'desde 15:00' });
check('si el rango no nombra el límite, el renglón lo dice',
  !/23:00/.test(unsaidLine.win) && /Límite de check-in: 23:00/.test(unsaidLine.text) &&
  /margen planificado 1 h 20/.test(unsaidLine.text), JSON.stringify(unsaidLine));
const pendingLine = await marginLine({ from: '15:00', shot: 'check-in-686-pendiente.png' });
check('sin hora límite queda pendiente, no parece un check-in normal',
  /Horario límite pendiente de confirmar/.test(pendingLine.text) && /is-tbd/.test(pendingLine.cls) &&
  pendingLine.chip !== normalLine.chip && pendingLine.chip !== lateLine.chip, JSON.stringify(pendingLine));

// El plan del deep-link resuelve después del primer draw: el mapa debe incorporar
// los promovidos sin reconstruir la vista completa.
const keysPage = await browser.newPage();
await keysPage.route('https://votos.mewis.online/**', route => route.fulfill({ json: { days: {} } }));
await keysPage.goto(base + '?tab=dias&jornada=2026-10-19&plan=keys', { waitUntil: 'domcontentloaded' });
await keysPage.locator('.day-view .rt-item[data-plan-key]').first().waitFor();
const promotedKeys = await keysPage.locator('.day-view .rt-item[data-plan-key]').evaluateAll(rows => rows.slice(0, 4).map(r => r.dataset.planKey));
check('fixture deep-link tiene promociones', promotedKeys.length === 4, String(promotedKeys.length));
await keysPage.close();
const late = await browser.newPage({ viewport: { width: 900, height: 900 } });
await late.route('https://votos.mewis.online/**', async route => {
  if (route.request().method() !== 'GET') return route.fulfill({ json: { ok: true } });
  await new Promise(resolve => setTimeout(resolve, 350));
  return route.fulfill({ json: { days: { '2026-10-19': { promoted: promotedKeys } } } });
});
await late.goto(base + '?tab=dias&jornada=2026-10-19&plan=late', { waitUntil: 'domcontentloaded' });
await late.waitForTimeout(250);
const initialMarkers = await late.locator('.day-view .leaflet-marker-icon').count();
await late.waitForFunction(n => document.querySelectorAll('.day-view .leaflet-marker-icon').length >= n, Math.max(promotedKeys.length, initialMarkers + promotedKeys.length), { timeout: 5000 });
const lateMarkers = await late.locator('.day-view .leaflet-marker-icon').count();
check('mapa deep-link incorpora plan tardío', lateMarkers >= initialMarkers + promotedKeys.length, `${initialMarkers} → ${lateMarkers}`);
await late.close();
await browser.close();
process.exit(failed ? 1 : 0);
