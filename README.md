# trips

Monorepo de los sitios de viaje de Mew — un solo repo, una carpeta por viaje,
todos con el mismo molde (mapa Leaflet + itinerario + clima por parada, sin build).

- **`index.html`** — landing que lista y linkea los viajes.
- **`japon/`** — Japón + Corea 2026 (viaje real, vivo). Clima refrescado a diario
  por cron (`japon/scripts/cron_update_weather.sh`, 06:40) y lugares de Google Maps
  sincronizados desde `projects/japan-trip/` (cron 09:20).
- **`china/`** — China de norte a sur (starter, itinerario plausible sin reservas).
- **`usa/`** — Roadtrip costa a costa (starter).
- **`espana/`** — España en tren (demo del molde).

Deploy: GitHub Pages (rama `main`, raíz) → https://mew-industries.github.io/trips/
con una ruta por viaje (`/trips/japon/`, `/trips/china/`, …).

## Agregar un viaje

1. Copiar una carpeta existente como molde: `cp -r japon nuevo` (o `espana` para
   arrancar de un mock limpio).
2. Editar `nuevo/index.html` (itinerario, mapa, paradas).
3. Sumar la card al `index.html` raíz.
4. Si querés clima automático, ajustar `nuevo/scripts/update_weather.py` (paradas +
   coords) y agregar un cron que corra `nuevo/scripts/cron_update_weather.sh`.

Antes era un repo por viaje (`japon-trip`, `china-trip`, `usa-roadtrip`,
`spain-trip-mock`) — consolidados acá el 2026-07-10. Esos repos ahora redirigen aquí.
