// Fixture de check_reels_mapping.js — el caso que TIENE que pasar (task 559).
//
// Un video que recorre tres jardines es la fuente de los tres y el fondo de las
// tres cards. Compartir un reel entre varias actividades no es el bug: el bug es
// compartirlo con una que el reel no nombra. Este dataset no tiene ninguna.
window.SOURCE_THINGS = [
 {
  "name": "Jardin Uno",
  "lat": 35.0, "lon": 139.0, "cat": "parques", "area": "Tokio",
  "note": "Primer jardín del recorrido.",
  "sources": [{ "type": "instagram_reel", "url": "https://www.instagram.com/p/VIDEOTRES1/", "owner": "tester" }]
 },
 {
  "name": "Jardin Dos",
  "lat": 35.1, "lon": 139.1, "cat": "parques", "area": "Tokio",
  "note": "Segundo jardín del recorrido.",
  "sources": [{ "type": "instagram_reel", "url": "https://www.instagram.com/p/VIDEOTRES1/", "owner": "tester" }]
 },
 {
  "name": "Jardin Tres",
  "lat": 35.2, "lon": 139.2, "cat": "parques", "area": "Tokio",
  "note": "Tercer jardín del recorrido.",
  "sources": [{ "type": "instagram_reel", "url": "https://www.instagram.com/p/VIDEOTRES1/", "owner": "tester" }]
 }
];
window.SOURCE_TIPS = [];
window.SOURCE_REELS = [
 {
  "code": "VIDEOTRES1",
  "url": "https://www.instagram.com/p/VIDEOTRES1/",
  "owner": "tester",
  "kind": "clips",
  "covers": ["p-jardin-uno", "p-jardin-dos", "p-jardin-tres"],
  "showsEach": true
 }
];
