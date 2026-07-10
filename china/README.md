# China · un mes · Beijing a Hong Kong · 2026

Sitio de un viaje de un mes por China, de norte a sur, con mapa interactivo, detalle
por parada, tramos de transporte (tren bala / vuelo / crucero) y curva climática.

Itinerario **plausible y editable** (starter, sin reservas ni datos privados): los
grandes clásicos — Gran Muralla, Guerreros de Terracota, pandas, crucero por el
Yangtsé, karst de Guilin, montañas de Zhangjiajie y el eje Shanghái–Suzhou — más
Hong Kong para cerrar. ~30 días.

## Sitio en vivo

**https://mew-industries.github.io/china-trip/**

(o abrir [`index.html`](./index.html) directamente)

Dashboard único con 3 secciones:

- **Mapa** (izquierda) — 11 paradas numeradas sobre tiles reales, con las líneas de
  transporte coloreadas por modo (tren bala, vuelo, crucero), hospedajes sugeridos,
  day trips y lugares guardados. Hover/click bidireccional con las cards.
- **Curva climática** (arriba a la derecha, colapsable) — máxima y mínima por parada.
  Click en un punto enfoca esa parada.
- **Cards de paradas** (abajo a la derecha) — tarjeta por parada con fechas, noches,
  clima, qué hacer y day trips. Entre cada card, el **módulo de transporte**: modo,
  tiempo, distancia y la línea/ruta concreta.

## Itinerario (10 oct – 8 nov 2026, 29 noches)

| # | Parada | Noches | Tramo hasta acá |
|---|--------|--------|-----------------|
| 1 | Beijing (Gran Muralla, Ciudad Prohibida) | 4 | punto de partida |
| 2 | Xi'an (Guerreros de Terracota) | 3 | 🚄 1.216 km · ~4 h 30 tren bala |
| 3 | Chengdu (pandas) | 3 | 🚄 700 km · ~3 h 30 (túneles del Qinling) |
| 4 | Chongqing | 1 | 🚄 300 km · ~1 h 15 |
| 5 | Crucero por el Yangtsé (Tres Gargantas) | 3 | 🚢 ~660 km de río · 3 noches a bordo |
| 6 | Zhangjiajie (pilares de Avatar) | 2 | 🚄 380 km · ~2 h 30 (desde Yichang) |
| 7 | Guilin y Yangshuo (karst del río Li) | 3 | 🚄 460 km · ~3 h |
| 8 | Shanghái | 3 | ✈️ 1.350 km · ~2 h 20 vuelo |
| 9 | Hangzhou (Lago del Oeste) | 2 | 🚄 170 km · ~1 h |
| 10 | Suzhou (jardines y canales) | 2 | 🚄 200 km · ~1 h 30 |
| 11 | Hong Kong | 3 | ✈️ ~2 h 30 vuelo (vía Shanghái) |

El transporte es una mezcla realista: **tren de alta velocidad (CRH)** entre ciudades
conectadas por la red, **vuelo doméstico** para los saltos largos (Guilin → Shanghái,
Shanghái → Hong Kong) y **crucero fluvial** para las Tres Gargantas del Yangtsé. La
fuente de datos es el array `destinations` en [`index.html`](./index.html) — editable.

## Clima

`scripts/update_weather.py` refresca la temperatura máx/mín por parada: climatología
(promedio de los últimos años del archivo de Open-Meteo) hasta ~2 semanas antes del
viaje, y pronóstico real cuando la fecha entra en ventana. Sin API key.
`scripts/cron_update_weather.sh` corre a diario y pushea si cambió.

## Stack

HTML + JavaScript + Leaflet 1.9.4 + Chart.js 4.4 (todo CDN, sin build step).
Imágenes vía Wikimedia Commons. Tiles de CARTO / OpenStreetMap.
