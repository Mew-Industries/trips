#!/usr/bin/env node
/**
 * El site NO muestra plata (Martín, 25/8/2026 · task 553).
 *
 *   node japon/scripts/check_no_prices.js
 *
 * El sitio lo miran las familias y los que viajan con nosotros: cuánto salió cada
 * reserva y quién la pagó viven SÓLO en el sheet de costos. Este guard falla si vuelve
 * a aparecer un importe en el HTML servido (index.html + la vista compartida).
 *
 * Lo que sí puede quedar es lo que cuesta algo ALLÁ y todavía hay que pagar en el
 * mostrador (accommodation tax del hotel, lockers de la estación, una entrada
 * orientativa): no es lo que gastamos, es lo que hay que tener a mano. Esos casos van
 * en ALLOW, uno por uno y con su motivo — la lista es corta a propósito.
 */
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..');
// `data/reels.js` queda AFUERA a propósito: sus `note` dicen lo que sale una entrada, un
// taller o un trago EN JAPÓN (¥500 el templo, ¥2.800 el perfume). Eso es lo que cuesta la
// cosa allá, no lo que gastamos nosotros — y además lo escribe el pipeline del workspace.
const FILES = ['index.html', 'compartido/index.html', 'views.js', 'itinerary.js'];

// Un importe: US$1.078,41 · ¥17.100 · €92 · USD 440. Sólo las formas con símbolo: los
// importes de este repo se escriben siempre así, y "la moneda de 10 yenes" (el Byodo-in
// de Uji) no es un precio.
const MONEY = /(?:US\$|USD\s?|€|¥|\$)\s?\d[\d.,]*/gi;

// Excepciones explícitas, con el motivo al lado. Si agregás una, que sea algo que se
// paga en destino y no una reserva nuestra.
const ALLOW = [
  { text: '~¥700-1.000', why: 'lockers de la estación de Nikko: se paga allá, en el día' },
  { text: '¥500/noche', why: 'accommodation tax de Fukuoka: la cobra el hotel al llegar' },
];

let bad = 0;
for (const rel of FILES) {
  const file = path.join(DIR, rel);
  if (!fs.existsSync(file)) continue;
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    // Los comentarios del código hablan de importes sin mostrarlos (ejemplos, avisos).
    if (line.trimStart().startsWith('//')) return;
    for (const hit of line.match(MONEY) || []) {
      // La excepción es la frase completa (`~¥700-1.000`); el regex agarra sólo su
      // primer número, así que se compara contra la línea Y contra el hit.
      if (ALLOW.some(a => line.includes(a.text) && a.text.includes(hit))) continue;
      console.error(`✗ ${rel}:${i + 1} · importe en el site: ${hit.trim()}`);
      console.error(`    ${line.trim().slice(0, 160)}`);
      bad++;
    }
  });
}

if (bad) {
  console.error(`\n${bad} importe(s) en el HTML servido. Los costos van al sheet, no al site.`);
  process.exit(1);
}
console.log(`✓ sin importes en el site (${ALLOW.length} excepciones declaradas: se pagan allá)`);
