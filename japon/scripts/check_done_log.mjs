import pw from '/usr/lib/node_modules/agent-browser/node_modules/playwright-core/index.js';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
const base = process.argv[2] || 'http://127.0.0.1:8760/japon/';
const out = process.argv[3] || '/tmp/task760';
mkdirSync(out,{recursive:true});
const browser = await pw.chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/home/openclaw/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
try {
const page = await browser.newPage({viewport:{width:390,height:844}});
const errors=[];page.on('pageerror',e=>errors.push(String(e)));
await page.addInitScript(() => {const RealDate=Date;window.Date=class extends RealDate {constructor(...args){super(...(args.length?args:['2026-10-11T01:00:00Z']));}static now(){return new RealDate('2026-10-11T01:00:00Z').getTime();}};});
await page.route('https://japon-checklist.mewis.online/**',r=>r.fulfill({json:{done:[]},headers:{'access-control-allow-origin':'*'}}));
await page.goto(base+'?tab=dias');
await page.locator('[data-jornada-card="2026-10-09"]').waitFor();
await page.locator('[data-jornada-card="2026-10-09"]').scrollIntoViewIfNeeded();
await page.screenshot({path:out+'/collapsed-mobile.png'});
for(const date of ['2026-10-09','2026-10-10']) {
const card=page.locator(`[data-jornada-card="${date}"]`);
assert.equal(await card.evaluate(e=>e.classList.contains('dy-collapsed')),true);
assert.match(await card.locator('.dy-collapse').innerText(),/3 hechas/);
await card.locator('.dy-collapse').click();
assert.equal(await card.locator('.dy-done li').count(),3);
assert.equal(await card.locator('.dy-done').isVisible(),true);
}
const today=page.locator('[data-jornada-card="2026-10-11"]');
assert.equal(await today.evaluate(e=>e.classList.contains('dy-today')&&!e.classList.contains('dy-collapsed')),true);
assert.equal(await page.locator('[data-jornada-card="2026-10-09"] .pl-logged-done').count(),2);
await page.screenshot({path:out+'/mobile.png',fullPage:false});
await page.reload();await page.locator('[data-jornada-card="2026-10-09"]').waitFor();
assert.equal(await page.locator('[data-jornada-card="2026-10-09"]').evaluate(e=>e.classList.contains('dy-collapsed')),false);
await page.goto(base+'?tab=dias&jornada=2026-10-09');
await page.locator('.dv-body .dy-done').waitFor();
assert.equal(await page.locator('.dv-body .dy-done li').count(),3);
await page.screenshot({path:out+'/day-deep-link.png'});
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
for (const date of ['2026-10-09','2026-10-10']) {
 await page.goto(base+'?tab=dias&jornada='+date);
 const buttons=page.locator('.dv-body .dy-done [data-done-pin]');
 await buttons.first().waitFor();
 assert.equal(await buttons.count(),3);
 assert.ok(await page.locator('.dv-day-map .pp-logged, .dv-day-map .rt-ord.pp-logged').count()>=3);
 for(let i=0;i<3;i++) {
  await buttons.nth(i).click();
  await page.locator('.dv-day-map .leaflet-popup').last().waitFor();
  assert.equal(await page.locator('.dv-day-map .leaflet-popup').last().isVisible(),true);
  const names = date === '2026-10-09' ? [/G-Cans/, /Toyosu Market/, /teamLab Planets/] : [/Edo-Tokyo/, /Metropolitan Government/, /New York Bar/];
  assert.match(await page.locator('.dv-day-map .leaflet-popup').last().innerText(), names[i]);
 }
 await page.screenshot({path:out+'/pins-'+date+'.png'});
}
await page.goto(base+'?tab=dias');
const card10=page.locator('[data-jornada-card="2026-10-10"]');
await card10.waitFor();
await card10.locator('[data-done-pin]').first().click();
await page.locator('.dv-day-map .leaflet-popup').last().waitFor();
assert.ok(await page.locator('#map .pp-logged').count()>=6);
assert.deepEqual(errors,[]);
console.log('six clickable pins: day + general maps OK');
console.log('done-log browser: collapsed 9/10, 3 each, current 11, matched plan, persistence, deep link, mobile OK');
}finally{await browser.close();}
