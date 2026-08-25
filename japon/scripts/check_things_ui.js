#!/usr/bin/env node
/** Regression checks for the compact, source-aware “Cosas para hacer” list. */
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const checks = [
  ['categorías usan details nativo cerrado por default',
    /return '<details class="cat-group">'/.test(html) && !/return '<details class="cat-group" open/.test(html)],
  ['encabezado conserva nombre y cantidad',
    /<summary class="cat-head"><span class="cat-name">/.test(html) && /class="cat-count"/.test(html)],
  ['cada cosa agrupa nombre y fuentes en una fila',
    /<li class="thing-row" data-check="/.test(html) && /sourceLinksHtml\(a\)/.test(html)],
  ['las acciones quedan inline y flexibles',
    /\.thing-row \{ display: flex;/.test(html) && /\.act-row \{[^}]*width: auto;/.test(html)],
  ['targets de fuentes siguen siendo táctiles en mobile',
    /@media \(max-width: 900px\)[\s\S]*\.source-link \{ min-height: 32px; line-height: 32px;/.test(html)],
  ['la ficha completa reutiliza las mismas categorías',
    /categoryGroupsHtml\(cityActs, false\)/.test(html)],
  // task 552: la lista es de la ciudad, no de la visita. Si alguien vuelve a pasarle
  // `d.activities` a la lista, Tokio se fragmenta otra vez entre sus tres paradas.
  ['la lista sale del pool de la ciudad, no de la parada',
    /function cityActivities\(d\)/.test(html) &&
    /categoryGroupsHtml\(cityActs, true\)/.test(html) &&
    !/categoryGroupsHtml\(d\.activities/.test(html)],
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (!ok) failed++;
}
if (failed) process.exit(1);
