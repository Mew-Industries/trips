#!/usr/bin/env node
/** Regression checks for the city pool + flat, filterable activity catalog. */
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const checks = [
  ['la lista abre plana sin navegación por barrios',
    /class="card-list activity-list"/.test(html) &&
    !/<details class="cat-group hood-group">/.test(html) &&
    !/class="cat-count"/.test(html)],
  ['la lista plana mantiene orden por distancia al hospedaje',
    /entries\.slice\(\)\.sort\(\(a, b\) => activityDistance\(a\.act, node\) - activityDistance\(b\.act, node\)\)/.test(html)],
  ['chips combinables persisten en acat',
    /data-activity-chip/.test(html) && /searchParams\.set\('acat'/.test(html)],
  ['cada cosa muestra note y fuentes en la fila',
    /class="activity-note"/.test(html) && /sourceLinksHtml\(a\)/.test(html)],
  ['ids estables salen del slug y no del índice',
    /const activityId =/.test(html) && /data-check="' \+ key/.test(html)],
  ['las estadías de una ciudad comparten el mismo pool',
    /function cityActivities\(d\)/.test(html) && /cityPools\.get\(key\)/.test(html)],
  ['el hospedaje del plan diario abre su ficha',
    /data-hosp-day/.test(fs.readFileSync(path.join(__dirname, '..', 'views.js'), 'utf8'))],
  ['las acciones quedan inline y flexibles',
    /\.thing-row \{ display: flex;/.test(html) && /\.act-row \{[^}]*width: auto;/.test(html)],
  ['targets de fuentes siguen siendo táctiles en mobile',
    /@media \(max-width: 900px\)[\s\S]*\.source-link \{ min-height: 32px; line-height: 32px;/.test(html)],
  ['la ficha completa reutiliza la lista plana filtrable',
    /activityCatalogHtml\(cityActs, d, false\)/.test(html)],
  // task 552: la lista es de la ciudad, no de la visita. Si alguien vuelve a pasarle
  // `d.activities` a la lista, Tokio se fragmenta otra vez entre sus tres paradas.
  ['la lista sale del pool de la ciudad, no de la parada',
    /function cityActivities\(d\)/.test(html) &&
    /activityCatalogHtml\(cityActs, d, true\)/.test(html) &&
    !/activityCatalogHtml\(d\.activities/.test(html)],
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (!ok) failed++;
}
if (failed) process.exit(1);
