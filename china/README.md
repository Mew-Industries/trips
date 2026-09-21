# China · dos meses · Beijing a Hong Kong · 2026

Sitio de un viaje de dos meses por China, de norte a sur, con mapa interactivo,
detalle por parada, tramos de transporte (tren bala / vuelo / crucero) y curva
climática.

Itinerario **plausible y editable** (starter, sin reservas ni datos privados): los
grandes clásicos — Gran Muralla, Guerreros de Terracota, pandas, crucero por el
Yangtsé, Huangshan, karst de Guilin, montañas de Zhangjiajie — más la China que el
circuito de un mes deja afuera: las grutas de Yungang, la Pingyao amurallada, los
tulou de Fujian, Fenghuang, el Cantón del dim sum y la Shenzhen de Huaqiangbei,
antes de cerrar en Hong Kong. ~60 días.

## Sitio en vivo

**https://mew-industries.github.io/trips/china/**

(o abrir [`index.html`](./index.html) directamente)

Dashboard único con 3 secciones:

- **Mapa** (izquierda) — 19 paradas numeradas sobre tiles reales, con las líneas de
  transporte coloreadas por modo (tren bala, vuelo, crucero), hospedajes sugeridos,
  day trips y lugares guardados. Hover/click bidireccional con las cards.
- **Curva climática** (arriba a la derecha, colapsable) — máxima y mínima por parada.
  Click en un punto enfoca esa parada.
- **Cards de paradas** (abajo a la derecha) — tarjeta por parada con fechas, noches,
  clima, qué hacer y day trips. Entre cada card, el **módulo de transporte**: modo,
  tiempo, distancia y la línea/ruta concreta.

## Itinerario (10 oct – 9 dic 2026, 60 noches)

| # | Parada | Noches | Tramo hasta acá |
|---|--------|--------|-----------------|
| 1 | Beijing (Gran Muralla, Ciudad Prohibida) | 5 | punto de partida |
| 2 | Datong (grutas de Yungang) | 2 | 🚄 300 km · ~1 h 50 |
| 3 | Pingyao (ciudad amurallada Ming) | 2 | 🚄 360 km · ~2 h 40 |
| 4 | Xi'an (Guerreros de Terracota) | 4 | 🚄 470 km · ~2 h 50 |
| 5 | Chengdu (pandas, Leshan, Emei) | 5 | 🚄 700 km · ~3 h 30 (túneles del Qinling) |
| 6 | Chongqing | 2 | 🚄 300 km · ~1 h 15 |
| 7 | Crucero por el Yangtsé (Tres Gargantas) | 3 | 🚢 ~660 km de río · 3 noches a bordo |
| 8 | Wuhan (Grulla Amarilla) | 2 | 🚄 300 km · ~2 h (desde Yichang) |
| 9 | Huangshan (Montaña Amarilla, Hongcun) | 3 | 🚄 550 km · ~4 h (vía Hefei) |
| 10 | Hangzhou (Lago del Oeste) | 3 | 🚄 265 km · ~1 h 30 |
| 11 | Suzhou (jardines y canales) | 2 | 🚄 200 km · ~1 h 30 |
| 12 | Shanghái | 4 | 🚄 100 km · ~30 min |
| 13 | Xiamen (Gulangyu, tulou) | 4 | 🚄 1.000 km · ~5 h 30 (costera) |
| 14 | Zhangjiajie (pilares de Avatar) | 3 | ✈️ 1.100 km · ~2 h vuelo |
| 15 | Fenghuang (casas colgantes) | 1 | 🚄 100 km · ~40 min |
| 16 | Guilin y Yangshuo (karst del río Li) | 4 | 🚄 360 km · ~2 h 20 (vía Huaihua) |
| 17 | Guangzhou (dim sum, río Perla) | 3 | 🚄 430 km · ~2 h 10 |
| 18 | Shenzhen (Huaqiangbei, OCT-LOFT, Dafen) | 4 | 🚄 100 km · ~35 min |
| 19 | Hong Kong (+ Macao) | 4 | 🚄 30 km · ~15 min (Futian → West Kowloon) |

El transporte es una mezcla realista: **tren de alta velocidad (CRH)** entre ciudades
conectadas por la red, **un solo vuelo doméstico** para el único salto sin tren
razonable (Xiamen → Zhangjiajie) y **crucero fluvial** para las Tres Gargantas del
Yangtsé. La fuente de datos es el array `destinations` en
[`index.html`](./index.html) — editable.

## Clima

`scripts/update_weather.py` refresca la temperatura máx/mín por parada: climatología
(promedio de los últimos años del archivo de Open-Meteo) hasta ~2 semanas antes del
viaje, y pronóstico real cuando la fecha entra en ventana. Sin API key.
`scripts/cron_update_weather.sh` corre a diario y pushea si cambió. El viaje cruza
del otoño seco del norte (Datong con mínimas de ~0° en octubre) al invierno templado
del delta del Perla (~20° en diciembre).

## Stack

HTML + JavaScript + Leaflet 1.9.4 + Chart.js 4.4 (todo CDN, sin build step).
Imágenes vía Wikimedia Commons. Tiles de CARTO / OpenStreetMap.
