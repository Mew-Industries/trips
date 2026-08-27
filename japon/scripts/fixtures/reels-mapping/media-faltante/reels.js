// Fixture de check_reels_mapping.js — media inexistente (task 559).
//
// El mapeo está bien (el video cubre al lugar y lo muestra), pero frames.js
// apunta a un webp que no está en disco: la card pediría la imagen y se
// llevaría un 404. Error esperado: 1.
window.SOURCE_THINGS = [
 {
  "name": "Jardin Uno",
  "lat": 35.0, "lon": 139.0, "cat": "parques", "area": "Tokio",
  "note": "Su propio video.",
  "sources": [{ "type": "instagram_reel", "url": "https://www.instagram.com/p/VIDEOUNO12/", "owner": "tester" }]
 }
];
window.SOURCE_TIPS = [];
window.SOURCE_REELS = [
 {
  "code": "VIDEOUNO12",
  "url": "https://www.instagram.com/p/VIDEOUNO12/",
  "owner": "tester",
  "kind": "clips",
  "covers": ["p-jardin-uno"],
  "showsEach": true
 }
];
