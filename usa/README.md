# Roadtrip USA · costa a costa · 2026

Sitio de un roadtrip de costa a costa por Estados Unidos (Atlántico → Pacífico) con
mapa interactivo, detalle por parada, tramos de manejo y curva climática.

Itinerario **plausible y editable** (starter, sin reservas ni datos privados):
un clásico de parques nacionales por el norte, ~4 semanas.

## Sitio en vivo

**https://mew-industries.github.io/usa-roadtrip/**

(o abrir [`index.html`](./index.html) directamente)

Dashboard único con 3 secciones:

- **Mapa** (izquierda) — 15 paradas numeradas sobre tiles reales, con la ruta de
  manejo, hospedajes sugeridos, day trips y lugares guardados. Hover/click
  bidireccional con las cards.
- **Curva climática** (arriba a la derecha, colapsable) — máxima y mínima por parada.
  Click en un punto enfoca esa parada.
- **Cards de paradas** (abajo a la derecha) — tarjeta por parada con fechas, noches,
  clima, qué hacer y day trips. Entre cada card, el **módulo de manejo**: distancia
  (mi/km), tiempo al volante y carretera principal.

## Itinerario (5 sep – 4 oct 2026, 29 noches)

| # | Parada | Noches | Tramo hasta acá |
|---|--------|--------|-----------------|
| 1 | Nueva York (Atlántico) | 3 | punto de partida |
| 2 | Pittsburgh | 1 | 372 mi · ~6 h 10 (I-78/I-76) |
| 3 | Chicago | 2 | 461 mi · ~7 h (I-80/I-90) |
| 4 | Minneapolis | 1 | 408 mi · ~6 h 20 (I-94) |
| 5 | Badlands + Mount Rushmore (Rapid City) | 2 | 560 mi · ~8 h 20 (I-90) |
| 6 | Cody | 1 | 431 mi · ~7 h (Bighorn Mtns) |
| 7 | Yellowstone (West Yellowstone) | 3 | 178 mi · ~4 h 30 (puerta Este) |
| 8 | Grand Teton (Jackson) | 2 | 120 mi · ~2 h 45 (US-89/191) |
| 9 | Salt Lake City | 1 | 285 mi · ~4 h 45 (I-15) |
| 10 | Zion + Bryce (Springdale) | 2 | 308 mi · ~4 h 30 (I-15/UT-9) |
| 11 | Gran Cañón (South Rim) | 2 | 250 mi · ~4 h 15 (Vermilion Cliffs) |
| 12 | Las Vegas | 2 | 278 mi · ~4 h 30 (US-93 / Hoover Dam) |
| 13 | Los Ángeles | 3 | 270 mi · ~4 h 15 (I-15 / Mojave) |
| 14 | Big Sur + Monterey | 1 | 320 mi · ~6 h 30 (PCH / CA-1) |
| 15 | San Francisco (Pacífico) | 3 | 120 mi · ~2 h 45 (CA-1/US-101) |

**Total: ~4.360 mi (~7.000 km) de manejo.** La fuente de datos es el array
`destinations` en [`index.html`](./index.html) — editable.

## Clima

`scripts/update_weather.py` refresca la temperatura máx/mín por parada:
climatología (promedio de los últimos años del archivo de Open-Meteo) hasta ~2
semanas antes del viaje, y pronóstico real cuando la fecha entra en ventana. Sin
API key. `scripts/cron_update_weather.sh` corre a diario y pushea si cambió.

## Stack

HTML + JavaScript + Leaflet 1.9.4 + Chart.js 4.4 (todo CDN, sin build step).
