# CLAUDE.md — spain-trip-mock

Demo/prototipo visual de una app de viaje con un itinerario **ficticio** por España.
Derivada de la estructura de `japon-trip`, sin sus constraints reales.

## Reglas

- Esto es un **mock**: nada acá es un plan real. No cargar reservas, vuelos con
  números reales, ni datos personales. Copy neutral, sin nombres propios de viajeros.
- El itinerario vive en el array `destinations` de `index.html` (mismo modelo de
  datos que japon-trip: `n/type/name/coords/dates/nights/leg/activities/daytrips`).
  `type: 'destino'` = se duerme ahí; `type: 'fullday'` = día de paso sin pernocte
  (Córdoba). Si se tocan fechas, mantener la cadena sin huecos: `departure` de un
  nodo = arranque del siguiente; el destino que sigue a un fullday empieza ese
  mismo día. Total actual: 18 noches (4+3+2+2+4+3), 12–30 may.
- Sin lodging (todos `lodging: null`) y sin `orphanPlaces` — el código los tolera;
  si algún día se agregan, la UI ya sabe renderizarlos.
- Fotos: thumbnails de Wikimedia Commons (500px), 3 por destino con facetas
  distintas. Hotlinkeables.
- Stack sin build: editar `index.html` y pushear a `main`; GitHub Pages sirve el sitio.
