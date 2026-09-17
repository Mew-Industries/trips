#!/usr/bin/env node
/**
 * Genera `japon/dia/<fecha>.html`: una página estática por jornada, con los meta de
 * Open Graph de ESE día, que redirige a la app (task 660).
 *
 *   node japon/scripts/build_dias.js            # escribe
 *   node japon/scripts/build_dias.js --check    # no escribe; sale 1 si quedaron viejas
 *
 * Por qué existe: el site es estático y la vista de día vive en `?jornada=<fecha>`,
 * que resuelve JavaScript. El crawler que arma el preview de WhatsApp/Telegram NO
 * ejecuta JavaScript, así que un link con `?jornada=` le muestra siempre la tarjeta
 * del viaje entero. Estas páginas son lo que se comparte: traen el `<title>` y los
 * `og:` del día y mandan a la app en el mismo golpe.
 *
 * NO tienen datos propios: el título y la descripción salen de `dayMeta()` en
 * `views.js`, la misma función que usa la app para reescribir el head al abrir la
 * vista. Si cambia el itinerario, se corre esto de nuevo — y `--check` es lo que avisa
 * que hace falta (lo llama `check_dia_view.js`, con el resto de los checks del repo).
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const DIR = path.join(__dirname, '..');
const OUT = path.join(DIR, 'dia');
const SITE = 'https://mew-industries.github.io/trips/japon/';
const html = fs.readFileSync(path.join(DIR, 'index.html'), 'utf8');

// Mismo recorte que check_routes.js / check_categories.js: balancea corchetes
// salteando strings y comentarios, así no depende del formato del archivo.
function arrayLiteral(name) {
  const head = 'const ' + name + ' = [';
  const i = html.indexOf(head);
  if (i < 0) throw new Error('no se encontró el array ' + name + ' en index.html');
  const start = i + head.length - 1;
  let depth = 0, quote = null;
  for (let j = start; j < html.length; j++) {
    const c = html[j];
    if (quote) {
      if (c === '\\') j++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '/' && html[j + 1] === '/') { j = html.indexOf('\n', j); if (j < 0) break; continue; }
    if (c === '/' && html[j + 1] === '*') { const e = html.indexOf('*/', j); if (e < 0) break; j = e + 1; continue; }
    if (c === '[' || c === '{' || c === '(') depth++;
    else if (c === ']' || c === '}' || c === ')') {
      if (--depth === 0) return vm.runInNewContext(html.slice(start, j + 1));
    }
  }
  throw new Error('no se pudo cerrar el literal de ' + name + ' en index.html');
}

const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// `dayMeta()` no nombra el viaje (la app compartida usa la misma función y no puede
// nombrar el viaje entero): el nombre lo pone acá, que es donde se sabe de qué site
// son estas páginas.
const TRIP = 'Japón + Corea';
const TRIP_LONG = 'Japón + Corea, oct–nov 2026.';

// El meta-refresh no es redundante con el `location.replace`: es lo que redirige a un
// lector sin JavaScript. El link visible del body es el último recurso de los dos.
function pageHtml(meta) {
  const app = '../index.html?tab=dias&jornada=' + meta.date;
  const title = meta.title + ' · ' + TRIP;
  const desc = meta.desc + ' ' + TRIP_LONG;
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="${esc(TRIP)} 2026">
<meta property="og:locale" content="es_AR">
<meta property="og:title" content="${esc(meta.title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${SITE}dia/${meta.date}.html">
<meta property="og:image" content="${SITE}favicon-64.png">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${esc(meta.title)}">
<meta name="twitter:description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}?tab=dias&amp;jornada=${meta.date}">
<link rel="icon" href="../favicon.ico" sizes="any">
<meta http-equiv="refresh" content="0; url=${esc(app)}">
<script>{const u=new URL(${JSON.stringify(app)},location.href),p=new URL(location.href).searchParams.get('plan');if(p)u.searchParams.set('plan',p);location.replace(u.href);}</script>
<style>body{margin:0;padding:40px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f4f0;color:#1a1a1a}a{color:#0F6E56}</style>
</head>
<body>
<p><strong>${esc(meta.title)}</strong></p>
<p><a href="${esc(app)}">Abrir el itinerario →</a></p>
</body>
</html>
`;
}

(async () => {
  const check = process.argv.includes('--check');
  const { buildItinerary } = await import(path.join(DIR, 'itinerary.js'));
  const { dayMeta } = await import(path.join(DIR, 'views.js'));

  const it = buildItinerary(arrayLiteral('destinations'));
  const want = new Map(it.days.map(d => [d.date + '.html', pageHtml(dayMeta(d))]));

  if (!check) fs.mkdirSync(OUT, { recursive: true });
  const have = fs.existsSync(OUT) ? fs.readdirSync(OUT).filter(f => f.endsWith('.html')) : [];
  const stale = [];

  for (const [name, body] of want) {
    const file = path.join(OUT, name);
    const old = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
    if (old === body) continue;
    stale.push(name + (old === null ? ' (falta)' : ' (cambió)'));
    if (!check) fs.writeFileSync(file, body);
  }
  // Un día que salió del viaje deja su página apuntando a una fecha que ya no existe.
  for (const name of have) {
    if (want.has(name)) continue;
    stale.push(name + ' (sobra)');
    if (!check) fs.unlinkSync(path.join(OUT, name));
  }

  if (!stale.length) {
    console.log('✓ dia/ al día — ' + want.size + ' jornadas');
    return;
  }
  if (check) {
    console.error('✗ dia/ desactualizado (' + stale.length + '): ' + stale.join(', '));
    console.error('  corré: node japon/scripts/build_dias.js');
    process.exit(1);
  }
  console.log('✓ dia/ regenerado — ' + want.size + ' jornadas, ' + stale.length + ' cambio(s)');
})();
