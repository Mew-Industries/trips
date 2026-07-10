# spain-trip-mock

Demo de una app de viaje: mapa + itinerario ficticio de 18 noches por España
(Madrid → Córdoba → Sevilla → Granada → Valencia → Barcelona → Palma de Mallorca).

**Live:** https://mew-industries.github.io/spain-trip-mock/

Es un **mock**: el itinerario es inventado (pero plausible) y no hay reservas,
vuelos ni datos reales. Sirve como prototipo visual, inspirado en la estructura
de [japon-trip](https://github.com/Mew-Industries/japon-trip).

## Stack

HTML + JavaScript + Leaflet 1.9.4 + Chart.js 4.4, todo por CDN, sin build step.
Un solo archivo: `index.html`. Se sirve como sitio estático (GitHub Pages).

## Qué tiene

- Mapa principal con las paradas numeradas, rutas por tramo coloreadas por modo
  (tren / bus / ferry / vuelo), day trips, actividades geolocalizadas y toggles de capas.
- Panel de itinerario colapsable: cada parada con fechas, noches, transporte de
  llegada, galería de fotos (Wikimedia Commons), "qué hacer" agrupado por categoría
  y day trips.
- Ficha modal por parada y por tramo, con mini-mapa y link compartible
  (`?stop=<id>` / `?leg=<id>`).
- Gráfico de temperaturas (climatología de mayo, valores ilustrativos).
- Mobile-friendly (mapa arriba, itinerario abajo).
