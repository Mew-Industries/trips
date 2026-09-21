#!/usr/bin/env node
/**
 * gmapsLink (task 705): el link a Google Maps sale del mejor dato disponible.
 *
 *   node japon/scripts/check_gmaps_link.js
 *
 * Evalúa la función real de index.html y prueba los tres casos: con gpid abre
 * la ficha exacta (query_place_id + coords en query), con solo coords la
 * búsqueda del nombre centrada en el punto, y sin nada el search de texto.
 * Sale 1 si algún caso no da la URL esperada.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const m = html.match(/function gmapsLink\([\s\S]*?\n\}/);
if (!m) { console.error('✗ no se encontró gmapsLink en index.html'); process.exit(1); }
const ctx = {};
vm.createContext(ctx);
vm.runInContext(m[0] + '; this.gmapsLink = gmapsLink;', ctx);

const checks = [
  ['con gpid: ficha exacta con coords en query',
    ctx.gmapsLink('Audeum', [37.511034, 127.098351], 'ChIJ14cLaHqnfDUR7K09keu289o'),
    'https://www.google.com/maps/search/?api=1&query=37.511034%2C127.098351&query_place_id=ChIJ14cLaHqnfDUR7K09keu289o'],
  ['con gpid sin coords: ficha exacta con el nombre de query',
    ctx.gmapsLink('Izakaya Toyo', null, 'ChIJG62yz9ngAGARDTCalqQkXJk'),
    'https://www.google.com/maps/search/?api=1&query=Izakaya%20Toyo&query_place_id=ChIJG62yz9ngAGARDTCalqQkXJk'],
  ['con cid numérico (lista de Maps): link ?cid=',
    ctx.gmapsLink('Eco Jardin', [37.55, 126.97], '3854123224714346233'),
    'https://maps.google.com/?cid=3854123224714346233'],
  ['solo coords: búsqueda del nombre centrada en el punto',
    ctx.gmapsLink('Ginzan Onsen (pueblo)', [38.570618, 140.530546], null),
    'https://www.google.com/maps/place/Ginzan%20Onsen/@38.570618,140.530546,17z'],
  ['sin nada: el search de texto de siempre',
    ctx.gmapsLink('Parque Chansey', null, null),
    'https://www.google.com/maps/search/?api=1&query=Parque%20Chansey'],
];

let failed = 0;
for (const [name, got, want] of checks) {
  const ok = got === want;
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (!ok) { console.log(`    got:  ${got}\n    want: ${want}`); failed++; }
}

// Actividades del itinerario (task 705 addendum): tienen coords pero ningún
// gpid propio en el HTML — data/activity_gpids.js (geocodificado con validación
// ≤300 m) las cubre y gpidOf lo consulta ANTES que el GPID de reels/added_by.
vm.runInContext('window = this; ' +
  html.match(/const catKey = [\s\S]*?\.trim\(\);/)[0] + '\n' +
  html.match(/const thingKey = .*;/)[0] +
  '; this.thingKey = thingKey;', ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'data', 'activity_gpids.js'), 'utf8'), ctx);
const AG = ctx.window.ACTIVITY_GPIDS || {};

// El caso del veredicto de Martín: "Ichiran original" (Fukuoka) tiene que abrir
// LA ficha ICHIRAN Original Shop and Headquarters (ftid …:0x686cca1ac34ca0bb),
// no un homónimo. Vale el CID decimal o el ChIJ equivalente de la misma ficha.
const ichiranGpid = AG[ctx.thingKey('Ichiran original')];
const ichiranIdOk = String(ichiranGpid) === '7524611293723795643' ||
  ichiranGpid === 'ChIJSc8jdZORQTURu6BMwxrKbGg';
const ichiranHref = ctx.gmapsLink('Ichiran original', [33.593241, 130.404597], ichiranGpid);

const bools = [
  ['index.html carga data/activity_gpids.js',
    /<script src="data\/activity_gpids\.js"><\/script>/.test(html)],
  ['gpidOf mira ACTIVITY_GPIDS antes que el GPID de reels/added_by',
    /const gpidOf = name => ACTIVITY_GPIDS\[thingKey\(name\)\] \|\| GPID\[thingKey\(name\)\]/.test(html)],
  ['actividad del itinerario con gpid: el href abre ficha exacta (?cid= / query_place_id=)',
    /(\?cid=|query_place_id=)/.test(ichiranHref)],
  [`Ichiran original → la ficha 0x686cca1ac34ca0bb (gpid: ${ichiranGpid})`,
    ichiranIdOk && (ichiranHref.includes('cid=' + ichiranGpid) || ichiranHref.includes('query_place_id=' + ichiranGpid))],
];
for (const [name, ok] of bools) {
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (!ok) failed++;
}
process.exit(failed ? 1 : 0);
