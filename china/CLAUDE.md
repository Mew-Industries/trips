# CLAUDE.md — china (viaje 2027)

Contexto para cualquier agente (Mew u otro) que desarrolle este sitio.

## Qué es esto

Sitio del viaje de **dos meses por China, 10 oct – 9 dic 2027** (60 noches,
19 paradas, Beijing → Hong Kong). Itinerario **plausible y editable** (starter):
todavía **no hay reservas, ni vuelos comprados, ni datos privados** — cada
`lodging` es una *sugerencia de zona* con `booked: false`, y no se inventa nada
de eso (regla dura: lo que no está decidido no se completa).

Deploy: GitHub Pages del monorepo `Mew-Industries/trips`, rama `main` →
https://mew-industries.github.io/trips/china/

## De dónde viene el molde (y cómo re-sincronizar)

Este sitio es el **molde de `japon/` a su HEAD del 2026-09-21** (task 706, sobre
la data de la 704) — el manual de ese molde es **`../japon/CLAUDE.md`**: leerlo
antes de tocar nada acá; todo lo que dice sobre el modelo de datos, las cuatro
vistas, la vista de jornada, el foco de día, las capas del mapa, la taxonomía de
categorías y los invariantes de fechas aplica igual.

Archivos copiados 1:1 de japon (salvo comentarios genericizados, sin lógica
propia): `views.css`, `itinerary.js`, `plan/client.js`. `views.js` tiene **un**
delta de lógica (ver abajo). `index.html` es el shell de japon con la data de
China y los deltas documentados abajo. Para re-sincronizar con el molde cuando
japon avance:

```
diff ../japon/views.js china/views.js        # debería dar solo comentarios + el contador
diff ../japon/views.css china/views.css
diff ../japon/itinerary.js china/itinerary.js
```

y para `index.html`, comparar por secciones (el shell fuera de `destinations` /
`orphanPlaces` / `airports` debería seguir al de japon).

## Deltas deliberados respecto de japon/ (no "faltantes")

- **`views.js` — contador de Hospedajes**: acá un nodo con `lodging` no está
  reservado; cuenta como reservado solo `lodging.booked !== false`. (Candidato a
  subir al molde.)
- **`RESV_PROVIDER`** quedó con `booking` solo y sin el branch de Airbnb en
  `resvUrl()`: China no tiene ninguna reserva. Al cargar la primera, sumar su
  provider con `home` probada con browser real (ver japon/CLAUDE.md §reserva).
- **Chips de categoría**: solo se dibujan las categorías con algún pin
  (`usedCats` en `buildCatBar`) — varias de la taxonomía están vacías en China y
  un chip que no prende nada es un botón muerto. El sync de chips en
  `applyCatFilter` guarda con `if (b.btns[c])`.
- **Checklist sin backend**: `CHECKLIST_ENDPOINT = null` → localStorage solo,
  cero fetches. El guard difiere `checklistChanged()` un tick (TDZ de
  `_dayViewMap`). Si algún día se quiere sync, crear un worker como el de japon
  y poner acá su URL.
- **Plan editable inerte**: `plan/client.js` es el de japon; sin `?plan=<token>`
  no llama a ningún server. China no tiene token emitido.
- **Capas por datos que China no tiene**: `data/reels.js` (tres arrays vacíos),
  `data/added_by.js` (vacío), sin `compartido/` ni `votar/`. Existen para que el
  shell cargue igual; se rellenan si algún día hay pipeline.
- **Vuelos internacionales**: no hay vuelo de llegada cargado (el viaje "arranca"
  en Beijing) y la vuelta sale de HKG con destino a definir — se dibuja solo el
  tramo ciudad → aeropuerto (`hongkong:out`).
- **`CITY_ALIASES = []`**: ninguna ciudad está partida en varias paradas.
- **Segments de tren/crucero**: el campo `road` del molde viejo (la línea
  ferroviaria / el tramo del río) viaja en el slot **`aircraft`**, que el
  renderer nuevo muestra como línea descriptiva bajo el horario. No hay campo
  `road` en el molde nuevo; no reintroducirlo.
- **Claves de localStorage propias**: `china-discrete`,
  `china-activity-checklist-v1` (+pending/migrated).

## Datos

- Fuente de verdad: el array `destinations` de `index.html` (19 nodos `destino`,
  todos con `start`/`end` ISO 2027, `flag`, `lodging` sugerido con coords de
  zona, `activities` `{text, cat, coords}` con cat legacy → taxonomía en
  `data/categories.js`, `daytrips`). `orphanPlaces`: 4 desvíos de ruta.
- **Invariante de fechas** (japon/CLAUDE.md §invariante): la cadena 10/10 → 9/12
  no tiene huecos ni solapes y las noches suman 60. Si cambiás fechas, cambiá
  `dates` (prosa) **y** `start`/`end` (ISO), y re-corré los checks.
- **Sin plata**: ningún importe en el site (`check_no_prices.js` lo caza).
- ⚠️ `scripts/update_weather.py` parsea los nodos por regex
  (`id: '...', n: N, ...` con comillas simples) — no convertir el array a JSON
  ni cambiar ese estilo.

## Scripts y verificación

Sin navegador (rápidos, corren desde la raíz del repo):

```
node china/scripts/check_categories.js    # taxonomía: cada lugar, una categoría
node china/scripts/check_no_prices.js     # cero importes en el HTML
node china/scripts/check_dia_view.js      # modelo de jornadas + dia/ al día
node china/scripts/check_routes.js        # orden geográfico de los recorridos
node china/scripts/build_dias.js          # regenera dia/ (61 páginas); --check
```

Con Chromium y el sitio servido (`python3 -m http.server <puerto> --bind
127.0.0.1` desde la raíz del repo — **elegir un puerto libre**; 8611 suele
estar tomado por checks de japon):

```
node china/scripts/check_map_pins.mjs <outdir> http://127.0.0.1:<puerto>/china/
node china/scripts/check_hospedaje_cards.mjs http://127.0.0.1:<puerto>/china/
```

Los checks copiados de japon traen sondas adaptadas a fechas/densidad de China
(días 11/10, 19/10 y 20/10; sin nodos `fullday`; clusters recién a z11; sin
carrusel hasta que exista un hospedaje con fotos). Si un check de japon se
re-copia, re-aplicar esas adaptaciones.

Clima: `scripts/update_weather.py` (TRIP_YEAR 2027, Open-Meteo, sin key) — 
`cron_update_weather.sh` es monorepo-aware si se quiere clima vivo por cron.

## Si cambiás el itinerario

1. Editar `destinations` (prosa + `start`/`end`).
2. `node china/scripts/build_dias.js`
3. Correr los checks de arriba.
4. Verificar la card de China en `../index.html` (fechas/paradas) si cambió el
   resumen del viaje.
