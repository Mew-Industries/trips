// Fixture de check_reels_mapping.js — el caso que TIENE que fallar (task 559).
//
// Es el bug que reportó Zava, reducido: una infografía de dos lugares quedó de
// fuente de un tercero que no nombra ("Cafe Ajeno"), y encima le dejaron el
// frame de la infografía de fondo.
//
// Errores esperados: 2 — el reel asignado a una actividad que no cubre, y el
// frame de esa infografía en una card que va sin reel. Los dos jardines SÍ
// salen en la infografía: como fuente están bien y no dan error; lo único que
// pasa con ellos es que la card va sin fondo (`showsEach: false`), que es
// justamente el arreglo.
window.SOURCE_THINGS = [
 {
  "name": "Jardin Uno",
  "lat": 35.0, "lon": 139.0, "cat": "parques", "area": "Tokio",
  "note": "Sale en la infografía.",
  "sources": [{ "type": "instagram_reel", "url": "https://www.instagram.com/p/INFOGRAFIA/", "owner": "tester" }]
 },
 {
  "name": "Jardin Dos",
  "lat": 35.1, "lon": 139.1, "cat": "parques", "area": "Tokio",
  "note": "También sale en la infografía.",
  "sources": [{ "type": "instagram_reel", "url": "https://www.instagram.com/p/INFOGRAFIA/", "owner": "tester" }]
 },
 {
  "name": "Cafe Ajeno",
  "lat": 35.2, "lon": 139.2, "cat": "ocio", "area": "Tokio",
  "note": "La infografía no lo nombra: no tendría que ser su fuente.",
  "sources": [{ "type": "instagram_reel", "url": "https://www.instagram.com/p/INFOGRAFIA/", "owner": "tester" }]
 }
];
window.SOURCE_TIPS = [];
window.SOURCE_REELS = [
 {
  "code": "INFOGRAFIA",
  "url": "https://www.instagram.com/p/INFOGRAFIA/",
  "owner": "tester",
  "kind": "feed",
  "covers": ["p-jardin-uno", "p-jardin-dos"],
  "showsEach": false
 }
];
