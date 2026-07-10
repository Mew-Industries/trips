# Japón + Corea · sept-nov 2026

Sitio del viaje con mapa interactivo, detalles por destino y curva climática.

## Sitio en vivo

**https://mew-industries.github.io/japon-trip/**

(o abrir [`index.html`](./index.html) directamente)

Dashboard único con 3 secciones siempre visibles:

- **Mapa** (izquierda) — 12 nodos numerados sobre tiles reales (10 destinos redondos donde se duerme + 2 nodos "día completo" en rombo ámbar: Nikko y Shirakawa-go, de paso) + day trips marcados aparte + ruta del viaje. Hover/click bidireccional con las cards.
- **Curva climática** (arriba a la derecha) — máxima y mínima por destino. Click en un punto enfoca esa ciudad.
- **Cards de destinos** (abajo a la derecha, scrollable) — tarjeta por parada con fechas, temperatura, qué hacer, day trips.

## Itinerario completo

El itinerario vivo y canónico es el sitio mismo: **https://mew-industries.github.io/japon-trip/** (desglose día por día, transporte, clima y qué hacer por parada). La fuente de datos es el array `destinations` en [`index.html`](./index.html). El antiguo `itinerario-2026.md` quedó deprecado (era una copia que se desincronizó).

## Vuelos

United, Polaris business. **Ventana nueva (reprogramada de nuevo)**: salida BA **6/10**, llegada Tokio **8/10**; vuelta **16/11** (llega BA 17/11). **Open jaw**: entra por Tokio **HANEDA (HND)**, sale por Tokio **NARITA (NRT)**.

> ⚠️ Los números y horarios de vuelo de abajo son los de los pasajes previos (ventana 28/9) y quedan **TENTATIVOS** — a reconfirmar con los tickets nuevos del 6/10. Solo las fechas de la ventana (6/10 ida, 16/11 vuelta) están actualizadas.

**Ida → Tokio Haneda (6-8 oct)** *(números/horarios tentativos)*

| Vuelo | Ruta | Salida | Llegada | Avión | Tracker |
|---|---|---|---|---|---|
| UA818 | EZE → IAH | 6 oct 21:00 | 7 oct 5:15 | B777-200 (10h15) | [UAL818](https://flightaware.com/live/flight/UAL818) |
| — | *escala Houston 6h20* | | | | |
| UA7937 | IAH → HND | 7 oct 11:35 | 8 oct 15:25 | B787-9 op. ANA (13h50) | [UAL7937](https://flightaware.com/live/flight/UAL7937) |

**Vuelta → Buenos Aires (16-17 nov)** *(números/horarios tentativos)*

| Vuelo | Ruta | Salida | Llegada | Avión | Tracker |
|---|---|---|---|---|---|
| UA33 | NRT → LAX | 16 nov 17:30 | 16 nov 10:35 | B787-9 (10h05) | [UAL33](https://flightaware.com/live/flight/UAL33) |
| — | *escala Los Ángeles 2h35* | | | | |
| UA2318 | LAX → IAH | 16 nov 13:10 | 16 nov 18:25 | B737-900 | [UAL2318](https://flightaware.com/live/flight/UAL2318) |
| — | *escala Houston 2h05* | | | | |
| UA819 | IAH → EZE | 16 nov 20:30 | 17 nov 9:20 | B777-200 (9h50) | [UAL819](https://flightaware.com/live/flight/UAL819) |

## Resumen del viaje

- **39 noches en Asia** + ~3 días de vuelos
- **Open jaw por Tokio** (entra por Haneda el 8/10, sale por Narita el 16/11; el viaje termina de vuelta en Tokio)
- **Sin norte**: se sacó todo Hokkaido (Sapporo, Noboribetsu, Hakodate) e Hiroshima/Miyajima
- **Tokio partido**: 6 noches al llegar + 6 noches al final pre-vuelo
- **Pareja:** Marto + Catalina

### Nodos del recorrido

Los nodos se numeran en orden de viaje: 10 **destinos** (se duerme ahí) + 2 nodos **día completo** (Nikko y Shirakawa-go, de paso, sin pernocte).

| # | Lugar | Tipo | Fechas | Noches | Day trips |
|---|-------|------|--------|--------|-----------|
| 1 | Tokio (llegada) | destino | 8-14 oct | 6 | Kamakura, Yokohama |
| 2 | **Nikko** | **día completo** | 14 oct | 0 | — |
| 3 | Kanazawa | destino | 14-16 oct | 2 | — |
| 4 | **Shirakawa-go** | **día completo** | 16 oct | 0 | — |
| 5 | Koyasan (shukubo) | destino | 16-18 oct | 2 | — |
| 6 | Kioto | destino | 18-24 oct | 6 | Nara, Murou-ji |
| 7 | Osaka | destino | 24-29 oct | 5 | Naoshima, Kobe |
| 8 | Fukuoka | destino | 29 oct–1 nov | 3 | Dazaifu, Yanagawa |
| 9 | Busan + Gyeongju | destino | 1-4 nov | 3 | Gyeongju |
| 10 | Seúl | destino | 4-8 nov | 4 | DMZ |
| 11 | Hakone (onsen + Fuji) | destino | 8-10 nov | 2 | Chureito Pagoda |
| 12 | Tokio (final, pre-vuelo) | destino | 10-16 nov | 6 | — |

**Total: 39 noches** (Nikko y Shirakawa-go aportan 0 — son días de paso).

### Tipos de nodo

- **destino** — se duerme ahí. Marcador redondo verde numerado.
- **día completo (fullday)** — se pasa un día entero, sin pernocte; se sigue viaje esa misma tarde/noche. Rompe la cadena de transporte (A → [día en X] → B). Marcador en rombo ámbar, numerado. Dos casos: **Nikko** (entre Tokio y Kanazawa) y **Shirakawa-go** (entre Kanazawa y Koyasan).
- **day trip** — ida y vuelta desde una base (base → X → base), no rompe la cadena. Sub-ítem sin numerar bajo su destino (ej. Naoshima desde Osaka).

### Lógica del orden

Con la llegada Tokio HND el 8/10 y la salida desde Tokio NRT el 16/11:

1. **Tokio al llegar (8-14 oct)**: 6 noches de aclimatación y jet lag para arrancar. Clásicos de Tokio (Asakusa, Shibuya, Tsukiji, Golden Gai) + day trips Kamakura/Yokohama. Los museos/teamLab/Yanaka/compras quedan para la Tokio del final.
2. **Nikko y Shirakawa-go de paso**: dos días completos UNESCO sin pernocte — Nikko el 14/10 (duerme en Kanazawa esa noche) y Shirakawa-go el 16/10 (duerme en Koyasan esa noche).
3. **Osaka con aire (24-29 oct, 5 noches)**: subió de 3 a 5 — da margen para Naoshima, un día de Kobe y barrios de Osaka sin apuro.
4. **Hakone (8-10 nov)**: de vuelta de Corea — onsen + Fuji + koyo de noviembre, antes de cerrar en Tokio.
5. **Tifones**: la temporada baja hacia octubre. Kyushu (Fukuoka) a fin de octubre, ya fuera del pico.
6. **Tokio al final (10-16 nov)**: buffer pre-vuelo + pico de ginkgo amarillo y koyo en Tokio. El viaje arranca y termina en Tokio.

**Sin 1-night stays.** Tokio es la primera parada (6 noches) y también la última (6 noches).

## Stack

HTML + JavaScript + Leaflet 1.9.4 + Chart.js 4.4 (todo CDN, sin build step).
