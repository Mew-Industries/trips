import pw from '/usr/lib/node_modules/agent-browser/node_modules/playwright-core/index.js';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
const base=process.argv[2] || 'http://127.0.0.1:8760/japon/';
const out=process.argv[3] || '/tmp/task761/reels';mkdirSync(out,{recursive:true});
const browser=await pw.chromium.launch({executablePath:'/home/openclaw/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome',args:['--no-sandbox']});
try {
 const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.route('https://japon-checklist.mewis.online/**',r=>r.fulfill({json:{done:[]},headers:{'access-control-allow-origin':'*'}}));
 await page.goto(base+'?tab=dias&jornada=2026-10-11');
 const done=page.locator('.dv-body .dy-done');await done.waitFor();
 assert.equal(await done.locator('[data-done-pin]').count(),2);
 assert.equal(await done.locator('small').count(),2);
 const betty=done.getByRole('button',{name:'workshop de Betty Smith (Ebisu Factory)',exact:true});
 const key=await betty.getAttribute('data-done-pin');
 await betty.click();await page.locator('.dv-day-map .leaflet-popup').last().waitFor();
 assert.match(await page.locator('.dv-day-map .leaflet-popup').last().innerText(),/Betty Smith Ebisu Factory/);
 assert.match(await page.locator('.dv-day-map .leaflet-popup').last().innerText(),/Taller/);
 const dayPin=page.locator('.dv-day-map [data-id="'+key+'"]');
 assert.equal(await dayPin.evaluate(e=>e.classList.contains('pp-logged')),true);
 const general=page.locator('#map [data-id="'+key+'"]');
 assert.equal(await general.evaluate(e=>e.classList.contains('pp-logged')),true);
 assert.equal(await dayPin.locator('.pp-emoji').textContent(),'🛠️');
 assert.equal(await general.locator('.pp-emoji').textContent(),'🛠️');
 assert.equal(await dayPin.evaluate(e=>getComputedStyle(e).backgroundColor),await general.evaluate(e=>getComputedStyle(e).backgroundColor));
 await page.locator('.dv-day-map .leaflet-popup-close-button').click();
 await page.mouse.move(1,1);
 assert.equal(await dayPin.evaluate(e=>getComputedStyle(e).opacity),'1');
 assert.ok((await page.locator('.dv-day-map .pp-logged').evaluateAll(es=>es.map(e=>getComputedStyle(e).opacity))).every(o=>o==='1'));
 await page.evaluate(()=>document.querySelector('#map').classList.add('day-focus'));
 await page.waitForTimeout(200);
 assert.equal(await general.evaluate(e=>getComputedStyle(e).opacity),'1');
 await page.evaluate(()=>document.querySelector('#map').classList.remove('day-focus'));
 await page.screenshot({path:out+'/betty-day.png'});
 await general.evaluate(e=>e.parentElement.click());
 await page.locator('#map .leaflet-popup').last().waitFor();
 assert.match(await page.locator('#map .leaflet-popup').last().innerText(),/Betty Smith Ebisu Factory/);
 assert.equal(await dayPin.evaluate(e=>getComputedStyle(e,'::after').width),'11px');
 assert.equal(await general.evaluate(e=>getComputedStyle(e,'::after').width),'11px');
 await done.getByRole('button',{name:'paseo por Shibuya y Shibuya Crossing',exact:true}).click();
 assert.match(await page.locator('.dv-day-map .leaflet-popup').last().innerText(),/Shibuya Scramble/);
 await page.goto(base+'?tab=dias');const card=page.locator('[data-jornada-card="2026-10-11"]');await card.waitFor();
 if(await card.evaluate(e=>e.classList.contains('dy-collapsed')))await card.locator('.dy-collapse').click();
 await card.getByRole('button',{name:'workshop de Betty Smith (Ebisu Factory)',exact:true}).click();
 await page.locator('.dv-day-map .leaflet-popup').last().waitFor();
 assert.match(await page.locator('.dv-day-map .leaflet-popup').last().innerText(),/Betty Smith Ebisu Factory/);
 // Every historical pin is dimmed globally and absent from later suggestions.
 await page.goto(base+'?tab=dias&jornada=2026-10-31');
 await page.locator('.dv-body .dv-sug').waitFor();
 const loggedKeys=await page.locator('#map .pp-logged').evaluateAll(es=>es.map(e=>e.dataset.id));
 assert.ok(loggedKeys.includes(key));assert.ok(loggedKeys.length>=8);
 await page.mouse.move(1,1);
 const opacity=await page.locator('#map [data-id="'+key+'"]').evaluate(e=>getComputedStyle(e).opacity);
 assert.equal(opacity,'0.35');
 for(const date of ['2026-10-20','2026-10-31','2026-11-14']) {
  await page.goto(base+'?tab=dias&jornada='+date);
  await page.locator('.dv-body').waitFor();
  const suggestions=await page.locator('.dv-sug [data-plan-key]').evaluateAll(es=>es.map(e=>e.dataset.planKey));
  assert.ok(!suggestions.some(k=>loggedKeys.includes(k)),date);
 }
 await page.goto(base+'?tab=resumen');
 await page.locator('#map .pp-logged').first().waitFor();
 await page.mouse.move(1,1);
 const globalOpacity=await page.locator('#map .pp-logged').evaluateAll(es=>es.map(e=>getComputedStyle(e).opacity));
 assert.ok(globalOpacity.length>=8 && globalOpacity.every(o=>o==='0.35'),JSON.stringify(globalOpacity));
 await page.screenshot({path:out+'/general-dimmed.png'});
 for(const id of ['tokio-medio','tokio-final']) {
  const card=page.locator('article[data-id="'+id+'"]');await card.waitFor();
  const pending=await card.locator('.activity-live [data-check]').evaluateAll(es=>es.map(e=>e.dataset.check));
  assert.ok(!pending.some(k=>loggedKeys.includes(k)),id);
 }
 assert.deepEqual(errors,[]);console.log('October 11: Betty clickable from list/detail, workshop icon/color + done badge on both maps; Shibuya pin; two free entries; future suggestions/catalogs exclude all historical pins; global opacity 0.35; no page errors OK');
} finally {await browser.close();}
