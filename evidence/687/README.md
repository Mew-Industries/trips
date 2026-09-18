# Evidencia — task 687 (pasar de día con las flechas del teclado)

Martín, 18/9 04:38: «estaría bueno que se pueda pasar entre vistas individuales de días
con las flechas del teclado».

En la vista de un día, `→` va al siguiente y `←` al anterior: la misma cuenta y la misma
navegación que los botones ‹ › de la barra (`neighborDay()` + `goJornada()`), así que la
URL sigue al día, el link es compartible y "atrás" desanda salto por salto. Los bordes
del viaje no envuelven y la tecla no se le roba a nadie.

Todo lo de acá se regenera. El código vive en `repos/trips` (nested repo, origin
`Mew-Industries/trips`); esta carpeta sólo guarda lo que se miró para aceptar.

## Cómo se regenera

Servir el repo en loopback (el bind importa: este host no tiene firewall adelante):

    python3 -m http.server 8611 --bind 127.0.0.1   # desde repos/trips

**Suite del teclado** — 27 checks, escribe las capturas `ac*`:

    node japon/scripts/check_dia_keys.mjs /tmp/shots687 http://127.0.0.1:8611/japon/

**Invariantes sobre el modelo** (sin navegador), donde viven los checks de `neighborDay()`
y de las guardas del handler:

    node japon/scripts/check_dia_view.js

**El "antes"** no se simula: se sirve el commit anterior en otro puerto y se corre la
**misma suite nueva** contra él. Lo que falla ahí es exactamente lo que esta task agrega.

    git worktree add /tmp/trips-before-687 e63e02c
    python3 -m http.server 8621 --bind 127.0.0.1 --directory /tmp/trips-before-687
    node japon/scripts/check_dia_keys.mjs /tmp/shots687-before http://127.0.0.1:8621/japon/

## Última corrida (18/9 06:4x)

- **En producción (`https://mew-industries.github.io/trips/japon/`, commit `b917dd2`
  publicado): 27/27** con la misma suite. Es la corrida que vale para aceptar.
- **Contra el árbol nuevo: 27/27** (`check_dia_keys.mjs`) y **23/23** (`check_dia_view.js`,
  que antes traía 9 y ahora suma los 14 de esta task).
- **Contra `e63e02c` (lo que sirve producción hoy): 17 ✓ / 10 ✗**, y los 10 son los de
  esta task — control negativo. Los que ahí pasan "bien" son los de no-hacer-nada (en
  los bordes, con foco de texto, con drag, con lightbox): sin flechas nada se mueve
  nunca, así que pasan de casualidad. Por eso cada guarda tiene además su check espejo
  —"soltando el foco la misma tecla vuelve a navegar", "terminado el arrastre vuelve a
  pasar", "cerrado el lightbox la flecha vuelve a pasar de día"—, y **esos tres sí
  fallan** en el commit viejo: son los que distinguen "la guarda anda" de "no hay nada".
- Resto del repo, sin rojos nuevos: `check_dia_view.js`, `check_plan_round.mjs` (61/61),
  `check_things_ui.js`, `check_routes.js`, `check_no_prices.js`, `check_categories.js`,
  `check_reels_mapping.js`, `check_lightbox.mjs` (16/16), `check_activity_{compact,flat,round5}.mjs`,
  `build_dias.js --check`.
- **`check_hospedaje_cards.mjs` falla 8 y `check_lodging_layout.mjs` 4**, igual que en la
  task 686 y por lo mismo: `kioto-momiji` y `koyasan` sin fotos bajadas. No es de esta task.

## Qué muestra cada captura

| archivo | qué prueba |
| --- | --- |
| `ac1-derecha.png` | el 20/10 después de `→`: la barra dice `16 / 44`, el encabezado `mié 21 oct` y la URL `?jornada=2026-10-21`. |
| `ac1-izquierda.png` | dos `←` desde ahí: `14 / 44`, `lun 19 oct`. El salto no recarga (una marca puesta en `window` sobrevive) y cada uno deja su entrada en el histórico. |
| `ac2-primer-dia.png` | día 1 después de `←`: sigue en `1 / 44` con el ‹ en gris. No envuelve al 18/11. |
| `ac2-ultimo-dia.png` | día 44 después de `→`: sigue en `44 / 44` con el › en gris. |
| `ac3-foco-input.png` | con un `<input>` enfocado adentro de la vista, `←` mueve el cursor (5 → 4) y el día no se mueve. |
| `ac4-discreto.png` | la `d` sigue prendiendo el modo discreto adentro de la vista, y en discreto las flechas siguen pasando de día. |

## Lo que se decidió mirando el código

- **Un solo listener.** Las teclas de la vista (Esc y ‹ ›) viven en el `keydown` que ya
  tenía `views.js`, no en uno nuevo: dos listeners para las mismas teclas se pisan y el
  orden depende de quién se registró primero. La `d` del modo discreto sigue siendo del
  mapa (`index.html`), intacta.
- **Una sola cuenta de "el día siguiente".** Los botones de la barra hacían
  `it.days[i + 1]` a mano; ahora los dos lados llaman a `neighborDay()`, y hay un check
  que falla si alguno se vuelve a escribir suelto. Si un día el itinerario se reordena,
  el teclado y los botones no se pueden separar.
- **Las guardas son cuatro**: foco de texto (input, textarea, select, contenteditable),
  drag en curso (`body.plan-dragging`), lightbox abierto (usa ‹ › para las fotos) y
  tecla con modificador o ya atendida (`defaultPrevented`). El site hoy no tiene campos
  propios ni fotos en la vista de día: la guarda es barata y es para cuando los tenga.
  Por eso el check del input le **inyecta** uno y el del lightbox fuerza la clase con la
  que el lightbox se sabe abierto — lo que se prueba es la guarda, no el campo.
- **`preventDefault()` sólo cuando navega.** Si la flecha no lleva a ningún lado (borde
  del viaje) la tecla sigue su camino, que es lo que hace un borde deshabilitado.
