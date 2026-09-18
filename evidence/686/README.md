# Evidencia — task 686 (la lista del día dice cada cosa una vez)

Martín, 18/9 04:38, mirando la card de una jornada:

- «check ins tienen límite, pero aparece como un campo adicional, en vez de sólo
  aparecer como rango (mucha info duplicada y verboso al pedo)»
- «no duplicaría el texto eg. en esta imagen de itinerario con más de un "templos y
  museos"»
- «las actividades en esta lista deberían tener disponibles sus links también»

Todo lo de acá se regenera. El código vive en `repos/trips` (nested repo, origin
`Mew-Industries/trips`); esta carpeta sólo guarda lo que se miró para aceptar.

## Cómo se regenera

Servir el repo en loopback (el bind importa: este host no tiene firewall adelante):

    python3 -m http.server 8611 --bind 127.0.0.1   # desde repos/trips

**Suite del plan** — 61 checks (43 de la ronda 4 + los 18 de esta), escribe las capturas
`itinerario-686-*`, `check-in-686-*` y las que ya sacaba antes:

    node japon/scripts/check_plan_round.mjs http://127.0.0.1:8611/japon/ <shots>

**El "antes"** no se simula con CSS inyectado: se sirve el commit anterior en otro puerto
y se corre **la misma suite nueva** contra él. Lo que falla ahí es exactamente lo que
esta task arregla, y las capturas que deja son las de `*-antes-*`:

    git worktree add /tmp/trips-before e36e59d
    python3 -m http.server 8621 --bind 127.0.0.1 --directory /tmp/trips-before
    node japon/scripts/check_plan_round.mjs http://127.0.0.1:8621/japon/ /tmp/shots686-before

## Última corrida (18/9 06:2x)

- **Contra el árbol nuevo: 61/61.**
- **Contra `e36e59d` (lo que sirve producción hoy): 46 ✓ / 15 ✗**, y los 15 son los
  checks de esta task — control negativo: ninguno pasa "de casualidad".
  - rótulo repetido: `["🍜 Comida","🍜 Comida","🌳 Parques"]` en las tres filas;
  - links: `links: 0` en los tres promovidos, teniendo la ficha `1` cada uno;
  - check-in: `Límite de check-in: 23:00 · margen planificado 1 h 20` — las 23:00 dos
    veces, en dos renglones seguidos.
- Resto del repo, sin rojos nuevos: `check_dia_view.js`, `check_things_ui.js`,
  `check_routes.js`, `check_no_prices.js`, `check_categories.js`, `check_reels_mapping.js`,
  `check_lightbox.mjs`, `check_activity_{compact,flat,round5}.mjs`, `build_dias.js --check`.
- **`check_hospedaje_cards.mjs` falla 8 y `check_lodging_layout.mjs` 4 por ancho, y no es
  de esta task.** Son `kioto-momiji` y `koyasan` sin fotos bajadas. Comprobado sirviendo
  `e36e59d` en el otro puerto: **las mismas líneas, palabra por palabra**. Se arregla
  bajando las fotos del listing (`fetch_airbnb_photos.mjs`), que es otra task.

## Qué muestra cada captura

| archivo | qué prueba |
| --- | --- |
| `itinerario-antes-1400.png` / `itinerario-despues-1400.png` | el 11/10 con tres promovidos (dos de Comida + uno de Parques) a 1400 px. Antes: `🍜 COMIDA` dos veces y ningún link. Después: el rótulo abre el grupo y no se repite, y cada fila lleva sus links a la derecha. |
| `itinerario-antes-390.png` / `itinerario-despues-390.png` | lo mismo a 390 px, que es donde el renglón vacío del ⠿ se notaba más. |
| `check-in-antes-normal.png` / `check-in-despues-normal.png` | ventana completa: antes `Check-in 15:00–23:00` + `Límite de check-in: 23:00 · margen…`; después el rango una vez y el margen solo. |
| `check-in-antes-tarde.png` / `check-in-despues-tarde.png` | llegada después del límite (ventana reescrita a 15:00–21:00, el vuelo aterriza 21:40). Sigue diciendo `llegás 40 min tarde`, ahora sobre fondo rojo. |
| `check-in-antes-pendiente.png` / `check-in-despues-pendiente.png` | hospedaje sin hora límite: `Horario límite pendiente de confirmar` en el chip ámbar de "esto falta". Los tres estados se leen distinto sin renglón extra. |
| `unified-itinerary.png` | el 19/10, que mezcla itinerario fijo y promovidos: el rótulo de categoría cruza las dos columnas y el nombre queda alineado con el de las filas fijas. |
| `alignment-*`, `drag-gap-open.png`, `plan-publico-solo-lectura.png`, `promovidos-mapa-numerado.png` | las capturas que ya sacaba la suite (rondas 1 a 4 y task 685): se regeneran acá para dejar la corrida completa en un solo lugar. |

## Lo que se decidió mirando la pantalla

- **El ⠿ se mudó al final del renglón.** Vivía en la línea del rótulo; sacando el rótulo
  repetido quedaba un renglón con un grip suelto y aire al pedo (se ve en
  `itinerario-antes-390.png` contra el después). Ahora va con el `−`, del lado de los
  controles, y el nombre de todas las filas arranca en la misma columna.
- **El rótulo cruza las dos columnas** (`.pl-cat`, `grid-column: 1 / -1`) en vez de
  colgar del cuerpo: así el número queda a la altura del nombre que numera.
- **Los estados del check-in se marcan con fondo, no con tinta nueva.** La card tiene
  tres colores de texto declarados arriba de `views.css` y la ronda 4 fue justamente no
  sumar un cuarto; el primer intento (ámbar y rojo de *texto*) lo cazó el check de la
  escala tipográfica, que es para lo que está.
- **"Una vez" es literal.** La ventana puede salir de la línea de la reserva y decir sólo
  "desde 16:00": si el rango NO nombra el límite, el renglón lo sigue diciendo (check
  `si el rango no nombra el límite, el renglón lo dice`). Hoy los tres hospedajes con
  `checkInTo` lo muestran en el rango, así que en los datos reales nunca aparece.
- **El rótulo se recalcula sobre el DOM.** El orden lo cambia el dedo, así que "esta
  categoría ya se dijo" no se puede decidir sólo al renderizar: `relabelPlan()` corre
  junto con la renumeración, después de cada drag y de cada promoción.
