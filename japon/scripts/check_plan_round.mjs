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
check('check-in muestra límite', /Límite de check-in:/.test(await checkin.innerText()));

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
check('check-in calcula margen contra llegada', /margen planificado 1 h 20/.test(await page.locator('.day-view .pl-check-in').innerText()));

// Los dos bordes del margen, ejercidos sobre el hospedaje de Fukuoka (llega 21:40)
// reescribiendo su ventana en el HTML servido: llegar DESPUÉS del límite, y un límite
// que cae del otro lado de la medianoche (Osaka abre 14:00 y cierra 01:00). El primero
// salía "-1 h 40" y el segundo habría contado la vuelta del reloj al revés.
const SRC = "checkInFrom: '15:00', checkInTo: '23:00'";
const marginText = async window => {
  const p = await browser.newPage();
  await p.route('https://votos.mewis.online/**', route => route.fulfill({ json: { days: {} } }));
  await p.route('**/japon/?*', async route => {
    const res = await route.fetch();
    const html = (await res.text()).replace(SRC, window);
    return route.fulfill({ response: res, body: html });
  });
  await p.goto(base + '?tab=dias&jornada=2026-10-31', { waitUntil: 'domcontentloaded' });
  await p.locator('.day-view .pl-limit').first().waitFor();
  const text = await p.locator('.day-view .pl-limit').first().innerText();
  await p.close();
  return text;
};
const lateText = await marginText("checkInFrom: '15:00', checkInTo: '21:00'");
check('llegar después del límite se dice, no se resta en negativo',
  /llegás 40 min tarde/.test(lateText) && !/-\d/.test(lateText), JSON.stringify(lateText));
const overnightText = await marginText("checkInFrom: '20:00', checkInTo: '01:00'");
check('el límite de madrugada suma margen, no lo resta',
  /margen planificado 3 h 20/.test(overnightText), JSON.stringify(overnightText));

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
