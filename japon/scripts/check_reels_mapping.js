#!/usr/bin/env node
/**
 * Verifica el mapeo actividad → reel de la app de votar (task 559).
 *
 *   node japon/scripts/check_reels_mapping.js [--data <dir>] [-v]
 *
 * El bug que originó el chequeo: la infografía "Must-Visit Places in TOKYO" de
 * fondo en la card del Cat Cafe MOCHA y en la de Yanaka Ginza (Zava, 2026-08-26).
 *
 * NO es un chequeo de unicidad: que un reel quede de fuente de varias
 * actividades está bien mientras el reel hable de todas ellas —un roundup de
 * veinte lugares es la fuente legítima de los veinte—. Lo que se verifica es
 * que la card nunca muestre media de otro lugar:
 *
 *   1. cada lugar que trae reel lo tiene declarado en `SOURCE_REELS`;
 *   2. el reel que la app va a EMBEBER de fondo cubre a ese lugar (`covers`);
 *   3. el frame estático de la card sale de ese MISMO post, y el webp existe
 *      (media inexistente = card rota);
 *   4. `frames.js` no le pone frame a un lugar que va sin reel — ahí la card es
 *      tipográfica, no la foto de un post ajeno;
 *   5. `covers` referencia lugares reales del dataset (un id que no existe es
 *      un place_id que se desincronizó entre el generador y la app).
 *
 * La regla de qué reel puede ser fondo NO se reimplementa acá: se carga
 * `votar/media-reel.js`, el mismo archivo que corre en el browser.
 *
 * `--data <dir>` corre contra otro dataset (reels.js + frames.js). `--selftest`
 * corre los fixtures de `japon/scripts/fixtures/reels-mapping/` y verifica que
 * el chequeo falle donde tiene que fallar y pase donde tiene que pasar — un
 * chequeo que no puede fallar no chequea nada. Sale 1 si algo no cierra.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const DIR = path.join(__dirname, '..');
const argv = process.argv.slice(2);
const verbose = argv.includes('-v') || argv.includes('--verbose');
const dataArg = argv.indexOf('--data');
const DATA = dataArg >= 0 ? path.resolve(argv[dataArg + 1]) : null;

if (argv.includes('--selftest')) process.exit(selftest());

// Los fixtures y el veredicto que se espera de cada uno.
function selftest() {
  const { spawnSync } = require('child_process');
  const casos = [
    ['compartido', 0, 'un reel multi-lugar compartido por varias cards que sí cubre'],
    ['mismatch', 1, 'una actividad con un reel asignado que no la cubre'],
    ['media-faltante', 1, 'un frame que apunta a un webp inexistente']
  ];
  let malos = 0;
  for (const [nombre, esperado, que] of casos) {
    const dir = path.join(__dirname, 'fixtures/reels-mapping', nombre);
    const r = spawnSync(process.execPath, [__filename, '--data', dir], { encoding: 'utf8' });
    const ok = r.status === esperado;
    if (!ok) malos++;
    console.log(`${ok ? '✓' : '✗'} ${nombre}: ${que} → salida ${r.status} (esperada ${esperado})`);
    if (!ok) console.log((r.stdout + r.stderr).split('\n').map(l => '    ' + l).join('\n'));
    else if (esperado === 1) {
      console.log(r.stderr.trim().split('\n').filter(l => l.startsWith('  - ')).join('\n'));
    }
  }
  console.log(malos ? `\n✗ ${malos} fixture(s) no se comportaron como se esperaba` : '\n✓ los fixtures fallan y pasan donde tienen que');
  return malos ? 1 : 0;
}

// Dataset: por defecto el de producción (data/reels.js + votar/frames.js); con
// --data, el del fixture, que trae los dos archivos juntos en un directorio.
const files = DATA
  ? { reels: path.join(DATA, 'reels.js'), frames: path.join(DATA, 'frames.js'), img: path.join(DATA, 'img') }
  : { reels: path.join(DIR, 'data/reels.js'), frames: path.join(DIR, 'votar/frames.js'), img: path.join(DIR, 'votar/img') };

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(DIR, 'votar/media-reel.js'), 'utf8'), sandbox);
vm.runInContext(fs.readFileSync(path.join(DIR, 'data/categories.js'), 'utf8'), sandbox);
vm.runInContext(fs.readFileSync(files.reels, 'utf8'), sandbox);
vm.runInContext(fs.readFileSync(files.frames, 'utf8'), sandbox);
const W = sandbox.window;
const MEDIA = W.VOTAR_MEDIA;
const THINGS = W.SOURCE_THINGS || [];
const REELS = MEDIA.indexReels(W.SOURCE_REELS);
const FRAMES = W.VOTAR_FRAMES || {};

// placeId / catKey / catOf: los mismos de votar/app.js. Acá sí es una copia —
// la alternativa era levantar la app entera, que es lo que hace check_votar.js.
const catKey = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
function hash32(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h.toString(36);
}
function placeId(name) {
  const base = catKey(String(name || '').split('(')[0]).replace(/\s+/g, '-');
  const ascii = base.replace(/[^a-z0-9-]+/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return ascii ? 'p-' + ascii.slice(0, 140) : 'p-x' + hash32(String(name || ''));
}
const TAX = W.PLACE_TAXONOMY || { meta: {} };
const CAT_BY_NAME = {};
Object.keys(W.PLACE_CAT_OVERRIDES || {}).forEach(n => { CAT_BY_NAME[catKey(n)] = W.PLACE_CAT_OVERRIDES[n]; });
function catOf(name, legacy) {
  const own = CAT_BY_NAME[catKey(name)];
  if (own && TAX.meta[own]) return own;
  if (TAX.meta[legacy]) return legacy;
  const mapped = (W.PLACE_CAT_LEGACY || {})[legacy];
  return (mapped && TAX.meta[mapped]) ? mapped : 'otro';
}
const SKIP_CATS = { 'comida': 1, 'bar-noche': 1, 'compras': 1, 'otro': 1 };

const errors = [];
const fail = (msg) => errors.push(msg);

// El mazo tal cual lo arma app.js: sin las cuatro categorías excluidas y sin
// repetir un lugar que entró por dos reels.
const seen = new Set();
const deck = THINGS
  .filter(t => !SKIP_CATS[catOf(t.name, t.cat)])
  .filter(t => { const id = placeId(t.name); if (seen.has(id)) return false; seen.add(id); return true; });

const allIds = new Set(THINGS.map(t => placeId(t.name)));
const stats = { conReel: 0, sinReel: 0, conFrame: 0, compartidos: 0 };

for (const t of deck) {
  const id = placeId(t.name);
  const sources = (t.sources || []).filter(s => s.type === 'instagram_reel');

  // (1) toda fuente de reel tiene que estar declarada en el registro Y declarar
  // que habla de este lugar. Un reel que quedó de fuente de una actividad que ya
  // no nombra es el mismatch de raíz: la asignación sobrevivió al dato.
  for (const s of sources) {
    const code = MEDIA.shortcode(s.url);
    if (!code) { fail(`${t.name}: fuente de reel sin shortcode (${s.url})`); continue; }
    const r = REELS[code];
    if (!r) { fail(`${t.name}: el reel ${code} no está en SOURCE_REELS (no declara qué cubre)`); continue; }
    if (!r.covers[id]) fail(`${t.name}: tiene asignado el reel ${code}, que no la cubre (covers: ${r.n} lugar/es)`);
  }

  const media = MEDIA.mediaReel(id, sources, REELS);
  const frame = FRAMES[id];

  if (media) {
    stats.conReel++;
    // (2) red de seguridad sobre mediaReel(): el fondo tiene que cubrir al lugar.
    if (!media.covers[id]) fail(`${t.name}: la card embebe ${media.code}, que NO cubre a ${id}`);
    // (3) el frame estático es del mismo post que el embed y existe en disco.
    if (frame) {
      stats.conFrame++;
      const code = path.basename(frame, '.webp');
      if (code !== media.code) {
        fail(`${t.name}: el frame es de ${code} y el embed de ${media.code} — dos publicaciones distintas`);
      }
      const abs = path.join(files.img, path.basename(frame));
      if (!fs.existsSync(abs)) fail(`${t.name}: frames.js apunta a ${frame}, que no existe`);
    }
  } else {
    stats.sinReel++;
    // (4) sin reel propio la card es tipográfica: un frame acá es de otro lugar.
    if (frame) fail(`${t.name}: va sin reel pero frames.js le deja ${frame} — es media de otro lugar`);
  }
  if (verbose) {
    console.log(`  ${media ? media.code.padEnd(14) : '—'.padEnd(14)} ${media ? String(media.n).padStart(2) : ' -'} lug  ${t.name}`);
  }
}

// (5) `covers` tiene que hablar de lugares que existen. Un id que no matchea
// ninguno es el place_id desincronizado entre build_reels_js.py y app.js.
const huerfanos = [];
for (const code in REELS) {
  for (const id in REELS[code].covers) if (!allIds.has(id)) huerfanos.push(`${code} → ${id}`);
}
// Los lugares que no geocodificaron quedan en `covers` y fuera de SOURCE_THINGS:
// eso es normal y sólo se reporta. Lo que rompe es que NINGUNO matchee, que es
// la firma de que los ids dejaron de generarse igual.
const totalCovers = Object.values(REELS).reduce((n, r) => n + r.n, 0);
if (huerfanos.length && huerfanos.length === totalCovers) {
  fail(`ningún place_id de covers matchea un lugar del dataset (${totalCovers}) — los ids se desincronizaron`);
}

// Cuántos reels quedan compartidos entre varias cards (esperado, no un error).
const porCode = {};
for (const t of deck) {
  const id = placeId(t.name);
  const m = MEDIA.mediaReel(id, (t.sources || []).filter(s => s.type === 'instagram_reel'), REELS);
  if (m) (porCode[m.code] = porCode[m.code] || []).push(t.name);
}
stats.compartidos = Object.values(porCode).filter(v => v.length > 1).length;

console.log(`mazo=${deck.length} · con reel de fondo=${stats.conReel} · sin reel=${stats.sinReel} · ` +
  `con frame=${stats.conFrame} · reels compartidos por >1 card=${stats.compartidos} · ` +
  `reels declarados=${Object.keys(REELS).length}`);
if (huerfanos.length) {
  console.log(`  (${huerfanos.length}/${totalCovers} ids de covers sin lugar publicado — geocode fallado, no rompe)`);
}

if (errors.length) {
  console.error(`\n✗ ${errors.length} problema(s) de mapeo actividad → reel:`);
  errors.forEach(e => console.error('  - ' + e));
  process.exit(1);
}
console.log('✓ ninguna card muestra media de otro lugar');
