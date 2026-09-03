# CLAUDE.md — japon-trip

Contexto para cualquier agente (Mew u otro) que desarrolle este sitio.

## Qué es esto y para qué sirve

Sitio del viaje a **Japón + Corea, sept–nov 2026** de **Marto + Catalina**.

**Objetivo / propósito** (tener SIEMPRE en cuenta al desarrollar):
- **Guía de viaje para Marto y Cata** mientras viajan: a dónde van, cuándo, qué pensaban hacer en cada lugar.
- **Ventana para las familias**: que la familia de ambos pueda mirar el sitio y saber dónde están / a dónde van en cada momento del viaje. Por eso la info de fechas y ubicaciones tiene que ser clara y legible para alguien que NO está organizando el viaje, solo siguiéndolo.

Implicancias de diseño:
- Claridad por sobre densidad: alguien de la familia abre el sitio y entiende "ahora están en X, el N de mes se van a Y".
- Mobile-friendly (lo van a mirar desde el celular, en viaje y desde casa).
- El estado del viaje debe poder actualizarse a medida que pasa (ver "Registro vivo" abajo).

## Registro vivo por lugar (el modelo de datos que queremos)

A medida que el viaje se concreta y transcurre, en CADA parada queremos registrar:
- **Dónde paramos** — alojamiento (nombre, zona, link si hay).
- **Cuándo llegamos y cuándo nos vamos** — fechas/horas reales, no solo el plan.
- **Qué pensábamos hacer ahí** — actividades planeadas (y, idealmente, marcar lo que se hizo).

Hoy el array `destinations` en `index.html` ya tiene `n/type/name/coords/dates/nights/arrival/departure/lodging/activities/daytrips`. `type` distingue `destino` (se duerme) de `fullday` (día de paso sin pernocte). La evolución natural es ir completando `lodging` (dónde paramos) y `arrival`/`departure` con hora real, y mantener `activities` como "qué pensábamos hacer". No romper la estructura existente — extenderla.

**Modelo de `lodging`** (2026-06-03): cada nodo puede tener `lodging` (antes `null`) = objeto `{ name, type, rating?, guests?, area?, checkIn, checkOut, nights?, img?, url }`. Se renderiza como tarjeta "🛏️ Hospedaje" en el detalle (después del intro, antes de "Qué hacer") vía `lodgingHtml()`. La foto sale del listing y se guarda **local** (ver "Fotos y links del `lodging`" abajo); nombre/zona del og:title/og:description. Primero cargado: Seúl (hanok en Bukchon). Para sumar un hospedaje a otro destino: completar su `lodging` (fetchear el og: del link de Airbnb/booking con curl + UA de browser).

**Fotos y links del `lodging`** (2026-08-07 · task 491 · actualizado 2026-08-26 · task 557 ronda 2): además de `img` (la foto principal), el objeto acepta `imgs: [...]` — galería del alojamiento, que se muestra entera en **un solo carrusel arriba de la ficha, a lo ancho de la tarjeta** (`carouselHtml()` → `.lgc`). La tira de miniaturas de abajo (`.lodging-gallery`) **ya no existe**: eran dos bandas de fotos separadas por el texto («hay dos partes con imagenes, algo awkward», Martín 26/8). `url` es **la ficha pública del alojamiento** y `mapsUrl` **siempre** el link a Maps: van como links separados, y el de la ficha se rotula siempre "Ficha del alojamiento" (nunca con el nombre de la OTA — el dominio de la ficha no dice dónde está hecha la reserva).

- **Todas las fotos son locales**, `img/<slug>-<qué>.jpg` para los hoteles cargados a mano e `img/lodging/<slug>-<n>.jpg` para las bajadas de un listing. Los CDN de Rakuten/Booking nunca fueron hotlinkables; el de Airbnb (muscache) se dejó de hotlinkear en la ronda 4 —rota las URLs y deja huecos en la tarjeta—, así que **ningún `img`/`imgs` apunta afuera del repo**.
- Para bajar las de un listing de Airbnb hace falta **browser real**: `curl` con UA cae en el `domain_switch` de `es.airbnb.com` y devuelve un form vacío. La receta que funcionó: playwright-core (`/usr/lib/node_modules/agent-browser/node_modules/playwright-core`), abrir `airbnb.com/rooms/<id>?locale=en`, juntar `og:image` + los `<img>` de muscache filtrando `AirbnbPlatformAssets` y `/pictures/user/`, y guardar con `?im_w=1200`. Descartar los planos de planta: son fotos de ficha, no del lugar.

**Layout de la tarjeta de hospedaje** (2026-08-26 · task 553 ronda 4 + task 557). La tarjeta es **una banda de fotos + cuatro renglones de texto + un desplegable**, y nada más. En orden: carrusel a lo ancho · nombre · tipo/capacidad · zona/dirección · el "cuándo" (fechas, noches y las horas de check-in/out, estas últimas medio tono más abajo) · los links (ficha, Maps, reserva) · `<details class="lodging-more">`. Vale para las dos superficies que muestran un hospedaje: `lodgingHtml()` en `index.html` (acordeón del resumen y ficha de parada) y `RENDER.hospedajes` en `views.js`. Si se toca el CSS: `.lodging-card`/`.lg-main` son bloques, no flex rows (la foto al costado dejaba media tarjeta vacía — 553 ronda 4).

Lo que se plegó y por qué (557 ronda 2 — Martín: «sigue tomando bastante real estate»): **adentro del `<details>` van la descripción del lugar y el bloque de la reserva** (`resvHtml()`). El número de reserva se busca a propósito, parado en el mostrador; no es lo que se lee scrolleando el itinerario. El rótulo del desplegable se adapta a lo que hay adentro ("Reserva y detalle" / "Reserva" / "Detalle"). Los horarios dejaron de ser chips (`.lg-h`) y son una línea de texto (`hoursParts()`): el rótulo y su hora van pegados con `nowrap`, y lo que venga después de la hora sí puede cortar.

**Carrusel de fotos** (2026-08-26 · task 557 ronda 2): `carouselHtml(shots, galKey, cls?)` en `index.html`, compartido con `views.js` por `ctx`. El movimiento lo hace el navegador —`overflow-x: auto` + `scroll-snap-type: x mandatory`, o sea que el swipe del celular sale gratis—; el JS de `document` sólo empuja con las flechas, sincroniza los puntos y apaga la flecha que no lleva a ningún lado (`at-start`/`at-end`). Cada foto conserva su `data-gal`/`data-gi`, así que tocar la que se está mirando abre el lightbox en ESA. El click con el que termina un swipe se suprime durante 350 ms (`lastCarouselScroll`, listener en captura), si no cada swipe abriría el lightbox.

**Lightbox de fotos** (2026-08-26 · task 553 ronda 4): una sola instancia en `index.html`, con el listener de `[data-gal]` en `document` — así funciona en el acordeón, adentro de la ficha de parada (`z-index` 5000, por encima del modal) y en las vistas laterales, que registran su galería en el mismo objeto `galleries` (llega por `ctx.galleries`). Cada superficie usa su propia clave (`lodging:<galId>`, `sm:<nodo>`, `hosp:<nodo>`) porque la misma foto aparece en varias. No tiene URL propia —es transitorio— pero **empuja una entrada de historia** para que el "atrás" del celular lo cierre en vez de sacarte del sitio; con una sola foto se pone `.single` y desaparecen las flechas. Verificación: `node japon/scripts/check_lightbox.mjs`, `node japon/scripts/check_lodging_layout.mjs <ancho>` y `node japon/scripts/check_hospedaje_cards.mjs` —este último es el guardián de la forma de la tarjeta: una sola zona de imagen, reserva plegada, horarios en una línea, techo de 430 px por tarjeta y el carrusel andando, en las dos apps y a los dos anchos— (los tres necesitan Chromium y el sitio servido — `python3 -m http.server 8611 --bind 127.0.0.1` desde la raíz del repo). Para bajar fotos de un listing: `node japon/scripts/fetch_airbnb_photos.mjs japon/img/lodging <slug> <roomId>`.

**Reserva del `lodging`** (2026-08-07 · task 491 rondas 2-4): `lodging.booking = { provider, ref, refLabel?, ref2?, ref2Label?, checkIn, checkOut, cancel?, includes?, payThere?, phone?, warn?, url? }` alimenta el bloque "Tu reserva" (`resvHtml()`), que es lo que Martín va a mirar parado en un mostrador. Reglas:

- `provider` es el dato **canónico** de dónde se reservó (`airbnb` · `booking` · `rakuten` = Rakuten global travel.rakuten.com, USD · `rakuten-jp` = Rakuten Travel Japón travel.rakuten.co.jp, yenes+puntos). **Son dos cuentas separadas**: la lista de reservas de una no muestra las de la otra. De `provider` salen la etiqueta ("Mi reserva en …") y el link a la reserva (`RESV_PROVIDER[provider].home`, o el itinerario de Airbnb cuando hay `ref`).
- **`url` (la ficha) tiene que estar en el MISMO dominio que `provider`**: es el cuarto que se compró, con sus fotos y condiciones. Una ficha de otra OTA muestra otras tarifas y se lee como si la reserva estuviera ahí.
- Cada link se prueba con browser real antes de commitear (status después de redirects). Un provider sin link que resuelva va **sin** `home`: la tarjeta muestra el número y ningún botón.
- `ref` se publica (no abre nada solo); `refLabel` es cómo lo llama esa plataforma (予約受付番号, Booking ID). **Nunca** al HTML lo que abre la reserva sin login: el PIN de Booking (el que va con `bn` en la URL de confirmación) y el confirmation code de Rakuten global quedan fuera del repo. El site es GitHub Pages público y el modo discreto es CSS, no control de acceso.
- Códigos que no tenemos van en `ref: null` — la línea del número simplemente no se renderiza. No se inventan.
- **Una reserva que tomó otro de los cuatro SÍ lleva `booking`, pero con `url` propia** (2026-08-26 · task 553 ronda 4 — lo pidió Martín: quiere el número a mano como el de Sendai). El link "Abrir" por default va al itinerario de Airbnb, que sin la sesión del que reservó no abre: por eso se fuerza `booking.url` a la **ficha del alojamiento**, que sí puede ver cualquiera. Lo que no tenemos —la política de cancelación la maneja Ari— simplemente **no se pone**; no se inventa una línea. Así está Kioto (`ref: 'HMYZ4QJ8AP'`, sin `cancel`). Lo que sigue afuera es la plata: quién pagó y cuánto viven sólo en el sheet.

**El site NO muestra plata** (2026-08-25 · task 553 — Martín: «los costos ni quién pagó tienen que estar en el site»). El sitio lo miran las familias y los que viajan con nosotros: **cuánto salió cada cosa y quién la pagó viven sólo en el sheet de costos**. Por eso `booking.total` **dejó de existir** (se sacó el campo de los 10 hospedajes, su fila en `resvHtml()` y el `.lg-cost` de la vista Hospedajes), y los importes que estaban sueltos en prosa —los `¥` de las tarifas de vuelo en `leg.detail`, el precio de teamLab en su `booked`— también. El corte no es "moneda sí / moneda no" sino **qué pagamos nosotros**: lo que cuesta algo allá y todavía hay que pagar en el mostrador se queda (la accommodation tax de Fukuoka en `payThere`, los lockers de Nikko). Guard: `node japon/scripts/check_no_prices.js` falla si vuelve a aparecer un importe en el HTML servido; las dos excepciones están declaradas ahí, una por una y con su motivo.

**Modelo de `activities`** (refactor 2026-06-02): cada actividad es un objeto `{ text, cat, coords?, url? }`. `cat` es la categoría **legacy** (templos, museos, parques, miradores, barrios, comida, compras, onsen, ocio, otros); desde 2026-08-03 se traduce a la taxonomía única de `data/categories.js` — ver "Categorías de lugares" abajo — y la lista "Qué hacer" se renderiza **agrupada por esa taxonomía** (CAT_ORDER/CAT_LABELS salen de ahí). `coords: [lat,lon]` + `url` (Google Maps) están presentes en las actividades que vienen de un lugar guardado (53 de ellas); esas se muestran como ítem clickeable que **vuela al punto en el mapa y abre su popup** (el link a Google Maps vive en el popup del punto, NO en el ítem de la lista). Las actividades escritas a mano sin lugar guardado (~70) van como texto plano bajo su categoría (sin pin). El viejo array paralelo `activityPlaces` (puntitos anónimos) fue **eliminado** y fundido acá. Para recategorizar algo, agregalo a `PLACE_CAT_OVERRIDES` en `data/categories.js` (el `cat` legacy podés dejarlo como está); para darle pin a una idea a mano, agregale `coords` + `url`.

**Las actividades son de la CIUDAD, no de la parada** (2026-08-25 · task 552). Tokio son tres nodos (`tokio-llegada` n1, `tokio-medio` n10, `tokio-final` n15) y una sola ciudad: repartir las actividades entre las tres fichas escondía dos tercios de la lista detrás de un corte arbitrario. En `index.html`, `cityKeyOf()` normaliza el nodo a una clave de ciudad (`CITY_RULES`: `tok(io|yo)` · `k(io|yo)to` · `osaka`; el resto cae en su `short` normalizado) y **`cityActivities(d)` devuelve el pool de la ciudad**: la unión de las `activities` de sus paradas, en orden de itinerario, deduplicada por `thingKey` (nombre normalizado, sin acentos ni paréntesis). `cityDaytrips(d)` hace lo mismo con los day trips. Reglas al tocar esto:

- **El pool se DERIVA en render; `d.activities` NO se toca.** De ese array salen el reparto por día y el orden del recorrido (ver el ⚠️ de abajo): mutarlo para "unificar" rompe el itinerario. Los tres nodos de Tokio siguen teniendo cada uno su lista en el dato.
- **Cada ítem del pool viaja con la clave de su parada dueña** (`{ act, key: '<nodo>:<i>' }`). Esa clave es la del pin en `actMarkers`, la del tachado (`data-check`) y la del índice de búsqueda: por eso el pool no duplica pines ni resetea el checklist. `categoryGroupsHtml()` y `catListHtml()` (views.js) reciben esos entries, no actividades sueltas.
- Una ciudad de una sola parada (Kioto, Osaka, Sendai…) recorre el mismo camino y queda igual — salvo que tuviera el MISMO lugar cargado dos veces, que ahora se muestra una sola vez (pasaba en Kanazawa, Kioto y Seúl).
- La ficha repetida avisa con `.qh-shared` ("Tokio · las 3 visitas"); una ciudad de una sola parada no muestra nada.
- En `compartido/` sólo viven los nodos de la allowlist (`kioto`, `osaka`, `tokio-medio`), así que ahí Tokio queda solo en su grupo y **no se filtra** el catálogo de las otras dos paradas. Es lo correcto: el pool se arma sobre el dataset que el navegador efectivamente recibió.
- Guarda de regresión: `scripts/check_things_ui.js` falla si la lista vuelve a salir de `d.activities`.

**Modelo de tiempo** (2026-08-07 · task 499): el itinerario dejó de tener las fechas solo en prosa. Cada nodo lleva ahora **`start`/`end` en ISO** (`'2026-10-08'` / `'2026-10-13'`) — `start` = día de llegada, `end` = día de salida, un `fullday` tiene `start === end`, y las noches de un `destino` son el intervalo `[start, end)`. Los strings `dates`/`arrival`/`departure` quedan como estaban (son la prosa que se lee en la tarjeta); `start`/`end` son lo que se computa. **Si cambiás fechas, cambiá los dos** — y verificá el invariante de abajo.

Sobre esa base, los campos de horario (todos opcionales; **lo que no está decidido NO se completa** — las vistas lo muestran como "a definir", nunca lo inventan):

- `leg.departure` / `leg.arrival` — `'YYYY-MM-DDTHH:MM'`, horario **real** de salida y llegada del tramo. No confundir con `leg.time`, que es la duración. Cada punta va en **hora local de su punta** (la que se lee en el cartel de la estación): por eso el UA6 sale de Narita 17:45 y llega a Houston 14:40 del mismo día.
- `leg.segments[].departure` / `.arrival` — lo mismo por tramo, para vuelos con escala.
- `leg.segments[].tracker` — **todo vuelo comprado lleva tracker, pero solo si su ruta se verificó por contenido** (2026-08-25 · task 539, ronda 3). Un solo proveedor:
  - **Siempre FlightAware** — preferencia explícita de Martín: `https://flightaware.com/live/flight/<ICAO><nº>` con el código **de tres letras de la aerolínea**, no el IATA de dos (UA→UAL, MM→APJ, NH→ANA, BX→ABL, JL→JAL, 7C→JJA, LJ→JNA, TW→TWB). Los seis del viaje: UAL818, UAL7937, APJ419, ANA1174, UAL6, UAL831.
  - **Flightradar24 NO se usa** (probado y descartado en la ronda 2 de la task 539: a Martín no le gusta la página). Si FlightAware no sirve para un vuelo, el leg va sin link — no se sustituye por FR24.
  - ⚠️ **FlightAware arrastra rutas viejas para códigos ICAO reciclados**: `ABL506` (Air Busan BX506) resuelve a un YYJ→YVR canadiense de 2001. Por eso el link no se escribe hasta verificar la ruta.
  - **Verificación obligatoria antes de escribir el link, por CONTENIDO y no por status code**: comprobar que el `<ICAO><nº>` corresponda al **par de aeropuertos esperado** (`SDJ`/`CTS`, `CTS`/`KMQ`). El HTML de FlightAware está detrás de Cloudflare (403 + "Just a moment..." a curl y a playwright headless, con y sin perfil persistente), así que el chequeo automático se hace contra **adsbdb**, que mapea callsign ICAO → ruta y es curleable:
    ```
    curl -s https://api.adsbdb.com/v0/callsign/APJ419 | jq '.response.flightroute | {callsign_iata, o: .origin.iata_code, d: .destination.iata_code}'
    ```
    Devuelve `{"callsign_iata":"MM419","o":"SDJ","d":"CTS"}` → el link es correcto. Para `ABL506` devuelve `YYJ`/`YVR`: mismo dato podrido que muestra FlightAware, o sea que el chequeo detecta el caso.
  - **Si no hay fuente que verifique la ruta, el leg va SIN tracker** y se deja el motivo en un comentario al lado del segmento (así está el BX506), más un recordatorio para re-chequear cerca de la fecha, cuando el schedule de la temporada ya esté cargado (para el BX506: 12/10). Mejor ausente que mentiroso.
  - Un vuelo sin comprar **no** lleva tracker: el leg se queda con su `dirUrl` de Google Flights ("ver vuelos ↗") hasta que haya reserva.
- `leg.fromName` / `leg.toName` — puntas que no son nodos del viaje (`'Buenos Aires (EZE)'`).
- `leg.fromTerminal` / `leg.toTerminal` — `{ name, coords, mode, icon? }`, la punta **física** del salto: el aeropuerto, la estación o el puerto por donde se sale y se entra. Es lo que cierra el recorrido de un día de traslado en el foco de día (ver abajo). Los 16 tramos las tienen; un tramo nuevo sin ellas hace que la línea del día corte derecho de hotel a hotel.
- `leg.why: [string]` — **por qué el horario es el que es**: la restricción que ata el salto (check-in estricto, último bote, valijas en lockers, control de migraciones). Es lo que hace que la vista de transportes sirva para algo y no sea una tabla de horarios sueltos.
- `leg.deadline: { by, what, departBy? }` — hora límite dura de llegada en ISO, qué la impone, y a más tardar cuándo hay que salir para cumplirla.
- `lodging.checkInFrom` / `checkInTo` / `checkOutFrom` / `checkOutBy` — `'HH:MM'`, la ventana parseable. El texto libre de `booking.checkIn`/`checkOut` sigue existiendo y no se toca.
- actividad `at` / `until` — `'YYYY-MM-DDTHH:MM'` para lo que tiene hora fija comprada (teamLab Planets, 9/10 9:00–9:30). Además `openHours` y `bestTime`, ambos texto libre, solo donde se sepa.

**`itinerary.js`** es la capa derivada: recibe `destinations` y devuelve `{ days, transfers, lodgings }`. No tiene datos propios ni un segundo registro del viaje — un cambio en `destinations` se refleja solo. La única regla con criterio propio es cómo reparte las sugerencias del día: agrupa las actividades por su `group` (que en los datos ya significa "esto se hace en la misma salida"), las sueltas van de a una, y los clusters se reparten en orden sobre los **días completos** del nodo (ni llegada ni salida); cuando un nodo no tiene ninguno —de paso, o una sola noche— se usan todos sus días.

**⚠️ El orden de `activities` es el reparto por día** (2026-08-11 · task 509). `dayRoute()` ordena por geografía lo que ya cayó en una jornada, pero *qué* cae en cuál sigue saliendo del orden del array: `spreadClusters` recorre los clusters en orden y corta cuando el peso acumulado pasa `total/días`. Consecuencias al editar:

- Las actividades de un nodo van **agrupadas por jornada, en bloques contiguos**, y cada bloque es un barrio o una zona (Tokio: bahía · Shibuya/Harajuku · Shinjuku · noreste; Kioto: Arashiyama · templos del este · noroeste · Fushimi/Nishiki · norte). Meter una actividad en el medio **corre el corte y le cambia el día a las que siguen** — no es una inserción inocente.
- El corte no se declara, se calcula: un día no puede quedar con menos peso del que le toca (`≥ total/días`). Si querés un día liviano y otro cargado, el reparto no te deja; hay que aceptar el tamaño que sale.
- Dentro de un día las entradas quedan en el **orden en que se caminan** (el que devuelve `dayRoute`), así el array registrado se lee igual que la app. Es cosmética del dato: reordenar dentro del día no cambia el recorrido.
- Lo que tiene `at` (hora comprada) no entra en el reparto y va **primero en el array** del nodo.
- Para verificar después de tocar el orden: `node japon/scripts/check_routes.js`.

## Las cuatro vistas (2026-08-07 · tasks 499 y 500)

El site tiene **el mapa fijo a la izquierda** y, a la derecha, un sidebar con un **riel de tabs arriba** y cuatro cortes del **mismo** itinerario. No hay un segundo registro en ningún lado: las cuatro leen `destinations`.

1. **Resumen** — el itinerario colapsable de siempre (chart de temperatura + `#details-list`). Es el `<main class="content-pane" id="view-resumen">` de `index.html`: `views.js` solo lo muestra y lo esconde.
2. **Hospedajes** — las 15 paradas donde se duerme, en orden, con la ventana de check-in/out y el bloque "Tu reserva" (reusa `resvHtml()`, no lo copia). La que no tiene reserva aparece igual, marcada.
3. **Transportes** — los 18 saltos (17 `leg` + el `departureLeg`), con horario o "a definir", las `why` de cada uno, las `deadline` y el check-in que espera del otro lado.
4. **Días** — las 44 jornadas del primer despegue al último aterrizaje: dónde estás, dónde dormís, qué hay con hora y qué hacer.

**El mapa NO es una vista** (task 500): vive fuera del sistema de tabs, en su propia columna de `.shell`, se dibuja una sola vez y no se esconde nunca. Cambiar de tab solo cambia el contenido del sidebar — por eso ya no existe el hook `onResumen`/`invalidateSize`: nadie redimensiona el mapa. Un ítem de cualquier vista lateral **vuela al punto en el mapa sin sacarte de la tab** (`focusMarker()` en `index.html`, el mismo camino que la lista "Qué hacer" del itinerario; `.v-goto` encuadra el nodo, `[data-act]` la actividad). En mobile el mapa se queda arriba (50vh) y las tabs quedan pegajosas debajo.

**Las sugerencias de la vista Días** son **el recorrido de la jornada**, numerado en el orden en que se camina (task 508 ronda 2; antes iban agrupadas por categoría, task 500). Cada actividad con `coords` es un botón al mapa y lleva su ordinal —el mismo que el pin—, con el ícono y el color de su categoría (`data/categories.js`); sin `coords` va al final, sin número (no se inventan). Los `group` ("Asakusa + Sumida River + Skytree" = una salida) siguen como subtítulo, ahora sobre un tramo del recorrido, con sus ítems indentados. La agrupación por categoría sobrevive en el catálogo (`catListHtml()`), que es una lista para elegir y no un recorrido. Además, cada día trae plegado **"todo lo de \<ciudad\> · N"** con el catálogo COMPLETO de la ciudad (`ctx.cityActivities`, task 552: Tokio 216 — las tres paradas juntas —, Kioto 37, Seúl 22), para que el reparto por peso —que le da 2-3 cosas por día— no deje nada invisible. Ese cuerpo se arma recién al abrirlo: el catálogo se repite en cada día de la ciudad y renderizarlo de entrada son ~800 botones.

Archivos: **`views.css`** (todo el estilo nuevo —incluido el layout de dos columnas— con un `<link>` en el head) + **`views.js`** (riel, ruteo y las tres vistas nuevas) + **`itinerary.js`** (la capa derivada; `clustersOf()` emite `{ i, act }` porque `i` es la clave del pin, `actMarkers['<nodo>:<i>']`). En `index.html` solo se agregaron el `<link>`, un `import`, la estructura `.shell` > `.map-pane` + `.side-pane` y la llamada a `mountViews(destinations, ctx)` al final del módulo — envuelta en `try/catch`: si una vista explota, el resumen sigue funcionando.

Ruteo por URL: `?tab=hospedajes|transportes|dias` (sin parámetro = resumen), con `pushState`, así que back/forward andan y el link es compartible. Un `?tab=` desconocido cae en resumen. `?dia=`, `?tramo=` y `?hosp=` valen por su tab cuando no hay `tab=` explícito; por eso, si alguno está puesto, tocar "Resumen" en el riel **escribe** `tab=resumen` en vez de borrar el parámetro (si no, el implícito te devolvía a la vista de la que querías salir).

## Un tramo, dos caras: la línea y su ficha (2026-08-11 · task 510)

La polyline del mapa y la tarjeta de la vista Transportes son **el mismo tramo**, y tocar cualquiera de las dos selecciona las dos. Martín: «apretar un tramo de transporte en el mapa debería mostrar el análogo en el sidebar de transporte».

- **El id del tramo es el mismo de los dos lados**: el del nodo al que se llega (`kioto`), y `<nodo>:out` para el vuelo de vuelta — el que ya emitía `transfersOf()` en `itinerary.js`. El mapa lo indexa en `legSegments[id]` y la ficha lo lleva en `data-leg`. No hay tabla de equivalencias en el medio: si un día cambia el id, cambia solo en los dos.
- **Los dos internacionales también son tramos** (antes eran dos polylines sueltas con popup): se registran como `<primer nodo>` y `<último nodo>:out`, así los 16 saltos de la vista tienen su línea y viceversa. Los popups siguen donde estaban.
- **Estado en la URL**: `?tab=transportes&tramo=<id>`, con `pushState` — el link aterriza con la ficha abierta y marcada, "atrás" deselecciona, y volver a tocar la ficha la suelta. Tocar la línea desde otra tab te lleva a Transportes; tocarla dos veces no ensucia el histórico.
- **El encuadre lo pide el que no tiene el tramo delante**: deep-link y click en la ficha encuadran (`fitBounds`); el click en la propia línea no —ya la estás mirando— y con el foco de día tomado tampoco, que el encuadre es del día.
- **Hit-area**: debajo de cada línea va una gemela invisible de 22 px (`hitLine()`), en la MISMA capa, así el toggle de transporte las apaga juntas (capa apagada = nada tocable) y va al fondo del pane para no robarle el click a ninguna línea visible. Sin eso, una línea de 3-4 px —punteada en los vuelos, donde el hit-test sólo agarra los guiones— es imposible de acertar con el dedo.
- **Foco de día**: el foco apaga el transporte de todo el viaje, pero el salto de ESE día se queda dibujado y clickeable (`spec.legs`, que `dayRoute()` saca de los eventos de la jornada). Tocarlo abre su ficha sin soltar el foco: `?dia=` sobrevive en la URL.
- **Marcado**: la ficha seleccionada lleva anillo verde (`.v-card[data-leg].on`) más el flash de siempre; la línea, su mismo color y trazo con 3 px más de grosor. El naranja sigue siendo el flash de `highlightSegment()` (fila de transporte del resumen), y cuando termina el tramo vuelve al estilo que le toca — marcado si sigue seleccionado.
- **Reversibilidad**: es un commit sobre las 4 vistas (499/500) y el foco de día (508). Revertirlo devuelve el click de la línea a "expandir la card del resumen" (`focusTrip`), que es el camino que sigue vivo como fallback si `views.js` no monta.

Verificación (navegador de verdad, los 16 saltos + mobile + capas + foco): `node evidence/510/tooling/check.mjs http://127.0.0.1:8123` en el workspace de Mew, contra un `python3 -m http.server` servido desde `japon/`.

## Una cama, dos caras: el pin y su ficha (2026-08-25 · task 544)

Lo mismo que la 510, con el hospedaje. Martín: «clickear en un hospedaje en el mapa lleve a la ficha del panel lateral». El pin 🛏️ del mapa y la tarjeta de la vista **Hospedajes** son el mismo alojamiento, y tocar cualquiera de los dos selecciona los dos.

- **El id es el del nodo donde se duerme** (`sendai`, `hakone`, `kioto`): el mapa ya indexaba el pin en `lodgingMarkers[d.id]` y la ficha ahora lo lleva en `data-hosp`. Sin tabla de equivalencias, igual que los tramos.
- **Estado en la URL**: `?tab=hospedajes&hosp=<nodo>`, con `pushState` — el link aterriza con la ficha marcada y a la vista, "atrás" deselecciona, y volver a tocar la ficha la suelta. Tocar el pin desde otra tab te lleva a Hospedajes; tocarlo dos veces no ensucia el histórico.
- **El popup del pin no se toca**: sigue abriéndose con el mismo contenido (nombre, fechas, link a Airbnb/Maps) — el click hace las dos cosas, como el de los pines de destino, que abren popup y expanden su card.
- **El encuadre lo pide el que no tiene la cama delante**: deep-link y click en la ficha vuelan al pin (`flyTo` a zoom ≥13) y le abren el popup; el click en el propio pin no —ya lo estás mirando—. `revealLayer(lodgingLayer)` prende la familia si estaba apagada y `showFocused()` mete la cama en el foco de día si no era de esa jornada; sin eso, un `?hosp=` con `layersOff=hospedaje` dejaba el mapa en el punto correcto y sin pin.
- **Marcado**: la ficha lleva el mismo anillo verde que la del tramo (`.v-card[data-hosp].on`) más el flash; el pin, `.lodging-marker.sel` (borde violeta más oscuro + halo).
- **Fallback**: si `views.js` no monta, el click en el pin cae en `focusTrip(d.id)` — abre la card de esa parada en el resumen, que también trae el hospedaje.

Verificación (navegador de verdad, los 12 pines uno por uno + mobile + deep-link + back): `node evidence/544/tooling/check.mjs <base>` en el workspace de Mew.

## Una parada fuera de la cadena: `type: 'pendiente'` (2026-08-25 · task 545)

El re-armado del tramo Kioto/Osaka/Tokio con Zava y Ari sacó **Koyasan** de la secuencia
sin cancelarlo. (Actualización 3/9 · tasks 585/586: Koyasan volvió a la cadena como
destino firme — con el plan B quedó 13-14 nov — y hoy NO hay ningún nodo `pendiente`; el
mecanismo queda documentado para la próxima parada que entre en ese limbo.) El tercer
tipo de nodo:

- **`type: 'pendiente'`** = la parada existe (ficha, fotos, hospedaje, pin en el mapa) pero
  **no ocupa ninguna noche del viaje**. Va con `n: null`, `start: null`, `end: null`,
  `leg: null` y `dates` en prosa (`'candidato 10-11 nov'`), más `pendingNote` con el estado
  completo que se lee en la tarjeta. La suma de noches y la numeración 1..17 son de la
  cadena; el pendiente no entra en ninguna de las dos.
- **`const chain`** (en `index.html`, apenas cerrado el array) es `destinations` sin los
  pendientes, y es lo que usan **todos** los lugares que leen "el anterior" o "el
  siguiente": las polylines de ruta, las etiquetas de fecha de cada tramo, la curva de
  temperatura, el `prev` de la fila de transporte y de los dos mini-mapas (`prevInChain`).
  Sin eso el mapa dibujaba Kioto→Koyasan→Osaka y la ficha de Hakone decía "se llega desde
  Koyasan".
- En la capa derivada: `transfersOf()` filtra los pendientes (si no, el nodo anterior al de
  llegada era el pendiente y el tramo mentía su origen), `daysOf()` los descarta solo
  —filtra por `start`/`end`— y **`lodgingsOf()` SÍ los incluye**, marcados con
  `pending: true`: la reserva sigue existiendo y hay que hacerle algo. El contador
  "N de M reservados · X noches" cuenta la cadena, no el pendiente.
- En la UI: pin y badge con **"?"** punteados (`.marker-num.pending` / `.card-num.pending`),
  etiqueta "en reubicación" al lado del título, y en la vista Hospedajes la columna de
  fechas dice "a reubicar" con la fecha candidata en `.lg-dates` (que es lo que se cae en
  modo discreto).
- Ubicación en el array: donde caería si se confirma (Koyasan está entre Seúl y Hakone).
  Como el pendiente no encadena, moverlo no cambia ninguna línea del mapa — sólo el lugar
  donde aparece su tarjeta en el resumen.

**Reserva vieja vs. fecha nueva.** Cuando el nodo ya cambió de fecha y la reserva todavía
no, el dato canónico de lo comprado sigue siendo `lodging.booking` (fechas reales de la
reserva) y lo que falta hacerle va en **`lodging.pending`** (string), que se renderiza como
aviso ámbar en la tarjeta del resumen (`.lodging-pending`) y en la vista Hospedajes
(`.lg-warn`). Nunca se pisa el `booking` con la fecha deseada: en el mostrador hay que
mostrar lo que efectivamente está reservado. Un nodo sin `lodging` puede declarar
**`lodgingTbd`** (string) y muestra la tarjeta igual, punteada y con "Sin reservar" — es lo
que hace el Tokio del medio ("a definir · para 4, compartido con Zava y Ari").

## Tramo compartido: `sharedWith` y la vista `/japon/compartido/` (2026-08-25 · task 545 ronda 2)

Kioto (19-24), Osaka (24-27) y el Tokio del medio (27-31) se hacen **con Zava y Ari**. Eso
es un atributo del nodo, no un tipo: siguen siendo destinos de la cadena, numerados y
verdes.

- **`sharedWith: 'Zava y Ari'`** en el nodo. De ahí salen el badge `+ Zava y Ari` y el
  acento **violeta `#6C4BB6`** en el borde izquierdo de la tarjeta (`.dest-card.shared`),
  el halo del pin del mapa (`.marker-num.shared`) y las fichas de las vistas laterales
  (`.v-card.shared` en views.css). El badge (`.shared-tag`) va en la **línea de fechas, no
  en el título** — Martín, ronda 2: «Kioto y Osaka también son con ellos, el título no es
  el lugar para marcarlo»; por eso el nodo se llama `Tokio (medio)` a secas. En
  **Transportes** el borde izquierdo ya es el color del modo, así que ahí va sólo el badge,
  y sólo en los saltos con las **dos** puntas compartidas (el que llega a Kioto viene de
  Shirakawa-go: no lo es). Para eso `transfersOf()` emite ahora `prev` además de `node`.
- **`/japon/compartido/`** es la versión filtrada que se le manda a ellos: sólo las tres
  paradas, renumeradas 1-2-3, con sus dos saltos internos, hospedajes (sin la reserva) y
  el "qué hacer". **Es una página aparte, no un `?view=`**: el itinerario entero vive en el
  array `destinations` de `index.html`, así que filtrarlo en runtime dejaría igual las 15
  paradas dentro del documento que recibe quien abre el link. Esconder por CSS no es
  filtrar.
- El dato de esa página es **`compartido/data.js`, generado**, y la fuente de verdad sigue
  siendo `index.html` — no hay un segundo registro del viaje:

  ```
  node japon/scripts/build_compartido.js            # regenera compartido/data.js
  node japon/scripts/build_compartido.js --check     # falla si quedó viejo o si se filtró algo
  ```

  ⚠️ **Si tocás fechas, hospedaje o actividades de Kioto/Osaka/Tokio-medio, regenerá.**
  El `--check` es lo que lo caza (y corre en segundos).
- El generador copia por **allowlist** (campo por campo) y **reescribe la prosa** en su
  tabla `OVERRIDES`: el `intro`/`arrival`/`departure` de `destinations` está escrito para
  Martín y Cata y nombra el resto del viaje. Del `lodging` se copia dónde y cómo entrar,
  **nunca el `booking`** (código, importe, teléfono del host). La categoría de cada lugar
  se resuelve en el generador con `data/categories.js` y viaja ya resuelta, así la página
  compartida no carga ese archivo —sus overrides nombran lugares de todo el viaje—.
  `--check` además falla si aparece cualquier palabra de `FORBIDDEN` (las otras paradas,
  los otros hospedajes, los códigos de reserva) en `compartido/`.

Verificación (browser de verdad, las tres marcas + la vista filtrada + su HTML servido):
`node evidence/545/tooling/check-r2.mjs <base> <shots>` en el workspace de Mew.

## El fondo del mapa sigue en CARTO (2026-08-27 · task 564, rollback de la 562)

Los tres `L.map` de la app —el grande y los dos mini-mapas de las fichas— van con los
tiles de **CARTO `light_all`**, como siempre. La 562 los había pasado a Esri Light Gray
Canvas para sacarse de encima el **"API KEY REQUIRED"** que CARTO les estampa a las
cuentas sin key desde agosto 2026, y Martín lo bajó al verlo: *«queda horrible»*. Esri
rinde peor a este zoom —menos calles y rótulos, y del 17 para arriba no tiene caché, así
que estira el nivel 16 y se ve borroso—. **Con el watermark, pero nítido, se ve mejor.**

O sea: el watermark en el mapa de `/japon/` y `/japon/compartido/` es **conocido y
aceptado transitoriamente**. No hay que volver a "arreglarlo" cambiando de proveedor: el
reemplazo definitivo es CARTO **con API key** (misma URL, autenticada), y va en su propia
ronda cuando la key exista.

Dos cosas que este rollback NO toca:

- **El mini-mapa del votar** (`votar/app.js` §TILES) se queda **en Esri**. Ahí el swap fue
  de la 559 y quedó bien: son 39 mapas chiquitos apoyados en cards, donde el watermark
  repetido sí molestaba y el detalle del basemap no importa.
- **china/, usa/ y espana/**, que nunca se movieron de CARTO.

## Foco de día y capas del mapa (2026-08-11 · task 508)

**Foco de día.** Cada jornada de la vista Días tiene un botón **"ver en mapa"** que le da el mapa a ese día solo: se apagan todas las familias de capas y quedan los puntos de esa jornada —las actividades del día, la cama de anoche y la de esta noche, y las terminales del traslado si hay—, unidos por una polyline punteada, con `flyToBounds` + padding. **No es ruteo por calles** (pedía dependencia externa + API key en un site sin build step): es la guía visual de qué sigue a qué.

- **El orden de la línea es geográfico, y la lista lo obedece** (ronda 2, 2026-08-11 — Martín: «se nota más que los recorridos no son muy inteligentes, todos los días voy para todos lados»). `dayRoute(day, ctx)` en `views.js` devuelve UN array de puntos ordenados, que el mapa dibuja y la lista imprime: no son dos recorridos que pueden divergir, es el mismo objeto. Lo que no tiene `coords` sale aparte (`spec.loose`), sin número. Cada punto lleva su ordinal en el pin (`.rt-ord`) y en su ítem (`.sg-item[data-ord]`), pintado con el color de su categoría — numerar en el mapa algo que no se puede volver a encontrar en la lista no sirve de nada.
- **Cómo se ordena** (`orderRoute()`, JS puro, sin servicio externo): inserción más barata + 2-opt/relocate hasta que nada mejore. Son ≤10 puntos por día, así que da el óptimo o al lado (verificado contra fuerza bruta). Cuatro reglas mandan sobre la cercanía, en este orden:
  1. **Las puntas son las camas, y en un traslado la terminal** — se sale de la cama de anoche (`day.wake`, que agrega `itinerary.js`) y se termina en la de esta noche (`day.sleep`); en un día normal son la misma y el recorrido cierra el círculo. Cuando ese día hay un salto, la punta es la **terminal** del tramo (ver abajo): el día no termina en el hotel de la ciudad siguiente a 500 km, termina en el aeropuerto o la estación.
  2. **Los nodos van en el orden del itinerario**, no por cercanía: en un día de traslado no se vuelve sobre los pasos.
  3. **Una salida (`group`) se camina entera** — es lo que el campo significa en los datos. Van como bloque (`blocksOf()`/`orderBlocks()`), se ordena entre bloques y después adentro. Sin esto la geografía parte "Bukchon + Insadong" en dos y el rótulo aparece dos veces en el mismo día.
  4. **Lo que tiene hora comprada es un ancla** (`activity.at`): conserva su orden de reloj y no se le pueden meter adelante más paradas de las que entran antes de esa hora. `capBefore()` lo calcula con **el único supuesto del módulo, explícito: el día arranca a las 9 y una parada lleva hora y media** (los lugares no traen duración). Sin él teamLab 9:00 se acomodaba cuarto porque caminando convenía.
- **Las terminales del traslado son dato, no render** (task 509 ronda 2, 2026-08-11 — Martín: «agregaria el hospedaje como punto de partida y de vuelta, salvo que nos vayamos de un lugar en cuyo caso marcaria el punto de partida al otro lugar»). Cada `leg` lleva `fromTerminal`/`toTerminal` = `{ name, coords, mode, icon? }`: el aeropuerto, la estación o el puerto por donde se sale y se entra. `dayRoute()` los intercala en la línea en el lugar que les toca —después de las paradas de la ciudad que se deja, antes de las de la que se llega— y son también las puntas contra las que se ordena cada tanda. Sólo los de HOY: en un vuelo que aterriza al otro día, la punta de llegada es del día siguiente (el 18/11 el foco es Ezeiza y nada más). El mapa les dibuja su propio marker (`.term-marker`, ícono del `mode` vía `MODE_STYLE`, o el `icon` del dato para el funicular de Koyasan) que vive sólo mientras dura el foco. **Si agregás un tramo, agregale las dos terminales** — sin ellas la línea vuelve a cortar derecho de hotel a hotel. Coords de Google, como el resto (nunca Nominatim).
- **Verificación**: `node japon/scripts/check_routes.js` mide cada jornada contra el orden de listado viejo y sale 1 si alguna quedó peor. Mide la línea ENTERA (camas + terminales + paradas), que es lo que se recorre; las dos versiones comparten puntas y lo único que cambia es el orden de adentro. Hoy: 2330 km → 2294 km, con −27/−46% en los días de ciudad (que es donde se camina) y sin ninguna jornada peor.
- **Reparto de responsabilidades**: la vista decide QUÉ puntos y en qué orden (`dayRoute` → `{ date, label, route, line, stops, legs }` — `route` son las paradas que se numeran, `line` el trazo entero con camas y terminales), el mapa lo dibuja (`enterDayFocus()` en `index.html`). El mapa no sabe de itinerario y la vista no sabe de Leaflet.
- **Salir restaura, no resetea**: `exitDayFocus()` vuelve a `inactiveLayers` (la intención del usuario) y al centro/zoom guardados. Las categorías filtradas siguen filtradas solas, porque sus pines nunca volvieron a su `layerGroup`. Mientras el foco está activo, `setLayer()` guarda la intención pero no toca el mapa.
- **URL**: `?dia=2026-10-14` con `pushState` — link compartible y "atrás" sale del foco. Un `?dia=` sin tab vale por `tab=dias`; un `?dia=` de una jornada sin ningún punto (día en vuelo) se ignora en vez de dejar el mapa vacío con un chip. Salir preserva la tab explícitamente.
- La salida es el chip **"✕ Día N"** arriba del mapa (o volver a tocar el mismo día). Mientras dura el foco, toggles / chips de categoría / leyenda se ocultan: son controles que el foco pisa. El chip enmascara la fecha en modo discreto (su `label` trae el `DX()`).

**Familias de capas.** El control de arriba a la derecha tiene cuatro: `destinos` · `actividades` (guardados de Maps + day trips + reels + huérfanos: para quien mira el mapa son la misma cosa, y los chips de categoría cortan más fino adentro) · `hospedaje` · `transporte`, más un master **"Todo"** que las apaga o prende de una. El estado va en `?layersOff=transporte`. `revealLayer()` prende la familia cuando se va a un punto desde una lista y su capa estaba apagada — el mismo agujero que `revealCat()` ya tapaba para las categorías.

**`transporte` es UNA sola familia (task 541, 2026-08-25 — Martín: «vuelos y transporte deberían ser un solo item»).** Antes eran dos botones, `🚆 Transporte` (`routeLayer`, terrestre) y `✈️ Vuelos` (`flightLayer`, líneas aéreas + pines de aeropuerto): un vuelo ES transporte y el corte duplicaba navegación. Hoy el toggle `transporte` cuelga las dos capas (`layers: [routeLayer, flightLayer]`) — los dos layerGroups siguen existiendo por separado porque `registerLeg()` elige uno u otro por modo y el foco de día los apaga por familia. La iconografía ✈️ de cada leg aéreo no cambió: vive en las fichas y en los pines, no en el botón. Los links viejos con `?layersOff=vuelos` se traducen a `transporte` en `LEGACY_LAYER_KEYS` al parsear la URL (ignorarlos habría dejado el mapa distinto al que compartió quien mandó el link).

**Reversibilidad**: las vistas son 4 commits de la 499 (shell, hospedajes, transportes, días) sobre 2 de modelo, y 4 de la 500 (mapa fuera de las tabs, Días por categorías, catálogo completo, fechas en discreto). La 508 son 3 más, en cadena: primero las capas, después el foco de día (que usa `TOGGLES`/`layerOn()` para apagar y restaurar) y por último el orden geográfico del recorrido (ronda 2). Revertir el último devuelve la lista agrupada por categoría y la línea en orden de listado, con el foco intacto. `git revert` de cualquiera de los rangos deja el árbol idéntico al del commit anterior y el site andando — probado en los tres. Revertir las vistas **no** toca el modelo extendido (`start`/`end`, horarios, `why`), que sirve por sí solo.

## Categorías de lugares (taxonomía única, 2026-08-03 · task 474)

Todos los lugares del mapa —reels de IG, guardados de Google Maps (actividades con `coords` + `orphanPlaces`) y day trips— comparten **una sola taxonomía**: `comida · bar-noche · parque · templo-museo · arte · arquitectura · actividad · taller · compras · barrio · otro`. Vive en **`data/categories.js`** (archivo de datos versionado, se edita a mano):

- `PLACE_TAXONOMY` — orden, etiqueta, ícono y **color** de cada categoría.
- `PLACE_CAT_LEGACY` — mapeo de las categorías viejas (las que emite el pipeline de reels y el `cat` de `activities`) a la taxonomía nueva.
- `PLACE_CAT_OVERRIDES` — categoría explícita por nombre de lugar; gana sobre el mapeo legacy. El match ignora mayúsculas, acentos y puntuación.

**`taller` vs `actividad`** (2026-08-25 · task 551): el corte es quién hace. En
`taller` alguien te enseña y volvés con la pieza (forjar un shuriken en studio NIN,
soplar un vaso en Studio J-45, tejer una bufanda, hornear senbei); en `actividad`
se visita, se pasea o te lo dan hecho (parque de diversiones, onsen, karting, tour).
Un museo que ADEMÁS ofrece un workshop sigue siendo museo: el plan de fondo es la
colección. Los 11 talleres de hoy están en `PLACE_CAT_OVERRIDES`, y los casos que se
miraron y se dejaron donde estaban tienen su motivo anotado ahí al lado.

`catOf(nombre, catLegacy)` en `index.html` resuelve override → legacy → `otro`. **Por qué aguas abajo:** `build_reels_js.py` (workspace, fuera de este repo) sigue escribiendo su `cat` viejo en `data/reels.js` y el sync de Maps no toca `index.html`, así que regenerar reels nunca resetea una categoría.

Por la misma razón, **el texto largo de cada lugar vive en `votar/descriptions.js`** (task 548 ronda 3), escrito a mano y keyed por `place_id`: en `data/` la próxima corrida del pipeline de reels se lo llevaría puesto. La app de votación lo muestra ahí y cae a la `note` de `reels.js` si falta; `node japon/votar/scripts/check_votar.js` avisa si entró un lugar nuevo al mazo sin descripción.

En el mapa: **el color del pin es la categoría y la forma es la fuente** (● guardado de Maps · ◆ reel · ◎ day trip; la leyenda de formas está arriba a la derecha con la de transportes). Los **chips de categoría** abajo del mapa filtran y hacen de leyenda de color a la vez: con todo prendido un click aísla esa categoría, después cada click suma/saca, y el chip "Todo" vuelve al estado completo. El estado va a la URL (`?cat=comida,bar-noche`), así que un deep-link aterriza ya filtrado.

Verificación (cada lugar tiene exactamente una categoría de la taxonomía, y avisa de overrides que dejaron de matchear):

```
node japon/scripts/check_categories.js
```

⚠️ El script `scripts/update_weather.py` parsea los nodos por regex esperando el formato `id: '...', n: N, type: '...', name: '...'` con comillas simples — NO convertir el array a JSON ni cambiar ese estilo o se rompe el updater de clima.

## Tips: los reels que no son un lugar (2026-08-25 · task 547)

Martín guarda en la colección de IG dos cosas distintas: lugares y **consejos**
(cómo moverse, qué llevar, cuándo ir, cómo pedir en un restaurante). El pipeline
del workspace ahora separa las dos y `data/reels.js` trae **dos arrays**:

- `window.SOURCE_THINGS` — los lugares de siempre, con `lat`/`lon`, que
  `index.html` funde con `activities`/`orphanPlaces` y pinta en el mapa.
- `window.SOURCE_TIPS` — los consejos: `{ name, cat: 'tips', area, note, sources }`
  y **NINGUNA coordenada**. `name` es el título corto (se lee solo en una lista),
  `note` el consejo en 1-2 líneas y `sources` el/los reels de donde salió.

**Por qué van en un array aparte y no en `SOURCE_THINGS`**: un tip no tiene
coordenada. Metido en `SOURCE_THINGS` caería en `orphanPlaces` —o sea, de chip en
"Otras cosas para hacer", que dice ser lugares— y, si su `area` matcheara un
destino, entraría a `activities` con `coords: [null, null]`, que es *truthy* y
revienta el `L.circleMarker` del foco de día. Por la misma razón la categoría
`tips` está en `PLACE_TAXONOMY.meta` (para que quien los liste tenga su label 💡 y
su color) pero **NO en `order`**: `order` es lo que arma los chips-filtro del mapa
y un chip que no prende ni apaga ningún pin es un botón roto.

Hoy **nada del site los renderiza todavía** — la lista global de tips es de la
task 546. `node japon/scripts/check_categories.js` sí los verifica: cuenta cuántos
hay y falla si alguno viene con coordenada, sin `cat: 'tips'` o sin consejo.

## Un reel puede ser fuente de varios lugares y media de ninguno (2026-08-26 · task 559)

Zava reportó que la card del **Cat Cafe MOCHA** y la de **Yanaka Ginza** mostraban
la misma infografía de fondo ("Must-Visit Places in TOKYO"), que no es ninguna de
las dos. El post **sí** nombra a los dos —es un roundup de treinta lugares de
Tokio— así que como *fuente* estaba bien. Lo que estaba mal era usarlo de *media*:
es una imagen fija de un listado, no muestra a ninguno en particular.

Por eso `data/reels.js` trae un **tercer array**, `window.SOURCE_REELS`, con un
registro por reel publicado que responde las dos preguntas por separado:

- `covers` — los `place_id` de los lugares de los que habla el post. Que un
  roundup sea la fuente de los veinte que nombra es correcto y **no** se toca:
  el chequeo NO es de unicidad.
- `showsEach` — si su media muestra a cada uno de ellos. `true` para los videos
  (`kind: "clips"`, que recorren lo que nombran) y para los posts de foto de un
  solo lugar; `false` para la foto fija (`feed`) o el carrusel
  (`carousel_container`) de varios, porque el embed abre siempre en la primera
  imagen y no hay manera de saber a cuál de los lugares corresponde.

La regla de qué reel puede ser el fondo de una card vive en **un solo archivo**,
`votar/media-reel.js` (`mediaReel()`: cubre + muestra, y entre varios gana el más
específico). La usan la app y el chequeo; `votar/scripts/build_frames.py` tiene la
misma regla en Python para elegir de qué post sale el frame estático, que tiene
que ser el **mismo** que el del embed.

Hoy quedan 82 de las 121 cards con reel de fondo y 39 con mini-mapa. Diez reels
siguen compartidos entre varias cards, que es lo esperado.

```
node japon/scripts/check_reels_mapping.js            # el mapeo publicado
node japon/scripts/check_reels_mapping.js --selftest # los fixtures: falla donde tiene que
```

⚠️ El mini-mapa de las cards **no** usa los tiles de CARTO del mapa principal:
CARTO les estampa "API KEY REQUIRED" encima a las cuentas sin key (agosto 2026).
`votar/app.js` tira de Esri Light Gray Canvas, que no pide key. **El mapa de
`index.html` sigue con CARTO y sigue con la marca de agua** — es el mismo problema
y está sin arreglar.

## ⚠️ INVARIANTE de fechas (regla dura — verificar SIEMPRE al editar el itinerario)

Toda noche del viaje DEBE tener un lugar de pernocte asignado, y las fechas tienen que encadenar sin huecos ni solapes:
- `departure` de un nodo `destino` = `arrival` / fecha de inicio del siguiente nodo `destino`. Sin días sueltos en el medio.
- un nodo `fullday` (día de paso, 0 noches) NO consume una noche: el día de viaje se pasa en el fullday y **se duerme en el siguiente nodo `destino` esa misma noche**. Por eso el `destino` que sigue a un `fullday` empieza su estadía el MISMO día del fullday (su primera noche es esa).
- un nodo `type: 'pendiente'` (parada fuera de la cadena, ver su sección) NO consume ninguna noche ni número: no tiene `start`/`end` y queda afuera de todas estas cuentas.
- la suma de `nights` de todos los `destino` = total de noches del viaje (hoy 40; los vuelos del 6/10 fijan esto — no se puede pasar de 40 sin huecos. Cualquier noche que se agregue en un lugar hay que restarla de otro).
- la `departure`/fecha-fin del último nodo = fecha del vuelo de vuelta.
Antes de pushear cualquier cambio de fechas: recorrer la secuencia día por día y confirmar que no quede ninguna noche sin cama (el bug del 2026-06-01: Nikko fullday el 10/10 dejó la noche del 10 sin asignar porque Kanazawa arrancaba el 11 — se arregló haciendo que Kanazawa entre el 10).

## Relación con el workspace de Mew

**Fuente de verdad = ESTE sitio, `index.html` (array `destinations`)** — invertido por Martín 2026-06-13 (antes la regla 2026-05-31 ponía el workspace como fuente; ya NO). El itinerario se edita acá, en `index.html`, y es el único registro autoritativo de paradas/fechas/noches/lodging/transporte. El `projects/japan-trip/itinerary.md` del workspace y el `itinerario-2026.md` de este repo son ahora solo punteros a `index.html` (quedaron deprecados como planes paralelos porque se desincronizaban). `data/saved-places.json` (lista de Google Maps auto-sync) sigue alimentando los puntos del mapa.

## Stack

HTML + JavaScript + Leaflet 1.9.4 + Chart.js 4.4, todo por CDN, **sin build step**. Se sirve como sitio estático (GitHub Pages: https://mew-industries.github.io/japon-trip/). Editás `index.html` directo y pusheás a `main`.

## Datos clave actuales (2026-06-02)

- **Vuelos** (United, Polaris business; **FIRMES — tickets del 6/10**): open jaw por Tokio — **ida** EZE→IAH→HND: UA818 (EZE 6/10 21:00 → IAH 7/10 5:15, B777-200) + escala Houston 6h20 + UA7937 op. ANA (IAH 7/10 11:35 → **Tokio HANEDA/HND 8/10 15:25**, B787-9). **Vuelta** NRT→IAH→EZE (directa por Houston, SIN LAX): UA6 (Tokio **NRT 17/11 17:45** → IAH 17/11 14:40, B787-9) + escala Houston 3h50 + UA831 (IAH 17/11 18:30 → **EZE 18/11 7:20**, B777-200). Open jaw: entra por Haneda, sale por Narita.
- **Estructura**: **40 noches**, **17 nodos numerados** (15 destinos + 2 nodos "de paso"). Tokio está PARTIDO: 5 noches al llegar (parada 1, 8–13 oct) + 3 noches al final pre-vuelo (parada 17, 14–17 nov, última noche 16/11; el 17 es día final pre-vuelo de la tarde). El viaje termina de vuelta en Tokio para el vuelo del 17/11 (llega BA 18/11). **Chain norte al arranque** (sin backtrack): Tokio → Nikko (de paso) → **Ichinoseki 1n** (base; foco Geibikei; Hiraizumi/Chūson-ji opcional a 8 min) → **Sendai 1n** → Sapporo 2n → vuelo a Komatsu → Kanazawa. Hokkaido en oct está templado (~17°/7°); el norte de Honshu (Iwate/Yamagata) en foliage arrancando. **Sin Hiroshima**. **Medio re-armado el 25/8 (task 545)**: Kioto 5n · Osaka 3n · **Tokio del medio 4n** (parada 10, con Zava y Ari). **Cierre re-armado el 3/9 (tasks 585+586, decisión de Martín)**: plan B — Yoshiike no tenía lugar 12-14, así que la reserva 10-12 se mantiene y el orden del plan A se invirtió. De Seúl se vuela a **HND** y siguen **Hakone 10-12 (2n, Yoshiike sin cambios)** → **Naoshima 12-13 (1n, nodo nuevo)** → **Koyasan 13-14 (1n, shukubo por reservar)** → Tokio final 14-17 (3n).
- **Tipos de nodo** (modelo de datos): `type: "destino"` = se duerme ahí (marcador redondo numerado); `type: "fullday"` = día completo de paso sin pernocte, rompe la cadena A→[X]→B (marcador rombo ámbar numerado); `type: "daytrip"` = round-trip desde una base, sub-ítem sin numerar. Dos `fullday`: **Nikko** (parada 2, 14 oct, entre Tokio y Kanazawa, duerme en Kanazawa) y **Shirakawa-go** (parada 4, 16 oct, entre Kanazawa y Koyasan, duerme en Koyasan).
- **Secuencia** (re-armada 2026-09-03 · tasks 585+586, plan B): 1.Tokio llegada (5n) · 2.Nikko (de paso) · 3.**Ichinoseki** (1n) · 4.**Sendai** (1n) · 5.Sapporo (2n) · 6.Kanazawa (2n) · 7.Shirakawa-go (de paso) · 8.Kioto (5n) · 9.Osaka (3n) · 10.**Tokio medio** (4n) · 11.Fukuoka (3n) · 12.Busan+Gyeongju (3n) · 13.Seúl (4n) · 14.**Hakone** (2n, Yoshiike 10-12) · 15.**Naoshima** (1n, hospedaje por reservar) · 16.**Koyasan** (1n, shukubo por reservar) · 17.Tokio final (3n). Suma destinos = 5+1+1+2+2+5+3+4+3+3+4+2+1+1+3 = **40**. **17 nodos** (15 destinos + 2 de paso), sin pendientes. **Tramo norte = Ichinoseki + Sendai** (Ginzan dropeado 2026-06-14: sin buen hospedaje + mucho trajín por 1 noche; node 3 renombrado Hiraizumi→**Ichinoseki** 2026-06-14: la base es Ichinoseki —stop del shinkansen, hoteles, gateway al **Geibikei** y al shinkansen onward—, con Hiraizumi/Chūson-ji opcional a 8 min en tren): Ichinoseki (Iwate, base del paseo en bote por **Geibikei**; Chūson-ji + Konjikidō dorado opcional en Hiraizumi; cocina de mochi + carne de Maesawa) noche 1, **Sendai** (Miyagi, base cómoda para un day-trip — Matsushima ~30min este o Yamadera ~55min oeste — gyutan; **Sendai Kokusai Hotel** reservado 14-15 oct, Booking #5769665121) noche 2. Día 14: Geibikei a la mañana + Shinkansen ~40min a Sendai. Desde Sendai, al día siguiente, aeropuerto de Sendai (~25min) → vuelo a Sapporo. Shirakawa-go (de paso) duerme en Kioto. **Koyasan estuvo entre Kioto y Osaka** (reorden 2026-06-02, para evitar el Shirakawa→Koyasan de ~7h) hasta el 25/8: el tramo Kioto 19-24 → Osaka 24-27 → Tokio 27-31 pasó a ser de los cuatro (Zava y Ari llegan a KIX el 19 y vuelan de Tokio el 1/11) y Koyasan quedó en reubicación.
- **UI / panel**: el panel es un **itinerario colapsado**. Cada nodo tiene `img` (foto de Wikipedia, thumbnail en la fila + banner en el detalle) y `leg: {mode, time, detail}` = transporte desde el nodo anterior (manual/estático), renderizado como `.leg-row` ANTES de la card, con un link "cómo llegar ↗" (Google Maps directions origin→destination, travelmode=transit). **Vuelos internacionales como módulos**: la ida vive en el `leg` del nodo 1 (tokio-llegada) y la vuelta en `departureLeg` del nodo 15 (tokio-final), ambos con `segments: [{route,no,when,aircraft,tracker} | {layover}]`. Se renderizan con `legSegsHtml()` como sub-filas (nº de vuelo, horarios, avión, link al tracker del vuelo en FlightAware, ver `leg.segments[].tracker` arriba; un segmento sin `tracker` se renderiza igual pero sin `href`, tanto acá como en la vista Transportes). La vieja "flight card" del tope fue eliminada. Cualquier `leg` puede tener `segments` (no solo vuelos). **Toggles de capas**: control propio arriba a la derecha con cuatro familias + master — ver "Foco de día y capas del mapa" arriba.
**Transporte / líneas de ruta**: cada `leg` puede tener `via: [[lat,lon],...]` (hubs/aeropuertos que atraviesa) — la línea de ruta se dibuja por tramo pasando por esos waypoints, NO en línea recta. El **modo** se deduce de los emojis (`legType()` → air/ferry/train/bus, prioridad vuelo>ferry>tren>bus) y define color+trazo de la línea (MODE_STYLE) + una etiqueta de texto en la fila de transporte + el borde de color de la fila. **Link bidireccional**: click en la fila de transporte del panel → `highlightSegment(id)` (flashea + encuadra el tramo en el mapa); click en el segmento del mapa → su ficha en la vista Transportes (task 510, ver abajo; sin las vistas laterales, `focusTrip(id)`). Aeropuertos en `airports[]` (markers ✈). Leyenda de modos abajo-izquierda.
**Mapa→sidebar**: click en un marcador o en el label de fecha de un segmento llama `focusTrip(id)` → expande la card, ancla al inicio del bloque (la leg-row, no el centro, para que la carga de imágenes no descoloque) y hace un flash de resaltado. **Popups del mapa** = `miniPopup(img, title, sub, mapsUrl)`, estilo mini-Google-Maps (foto + nombre + sub + "Ver en Google Maps →"). Destinos y daytrips tienen foto (Wikipedia, campo `img`); las actividades (lugares guardados específicos) NO tienen foto embebida (Wikipedia no cubre comercios) — solo nombre+categoría+link a Maps. **Panel de temperatura colapsado por default** (toggle `#chart-toggle`, hace `weatherChart.resize()` al abrir). **Banderita de país**: cada nodo tiene `flag` (🇯🇵 / 🇰🇷 — Busan y Seúl son Corea), renderizada en el título de la card (`.dest-flag`) y en el popup.
**Galería de fotos**: cada nodo tiene `imgs: [...]` (3 fotos) renderizadas como `.gallery-thumb` en el detalle; click → lightbox full-screen con ‹/› y Esc. `img` (single, para thumb+popup) = `imgs[0]`. **Fuente: Wikimedia Commons search por FACETAS** (3 queries distintas por destino, ej. Kioto = Fushimi Inari torii / Arashiyama bamboo / Kiyomizu-dera) para que las 3 fotos caractericen aspectos diferentes en vez de repetir lo mismo. (Openverse/Flickr CC se descartó: rate-limita con 429 y daba fotos poco variadas.) Para refrescar fotos: editar el dict FACETS en el script de fetch y re-correr. **Transporte**: `leg.time` son duraciones REALES scrapeadas de Google Maps directions (door-to-door); `leg.dirUrl`/`dirLabel` opcionales overridean el link "cómo llegar" — vuelos → Google Flights ("ver vuelos"), bus privado Kanazawa→Shirakawa → japanbusonline.com ("reservar bus"), resto → Google Maps directions transit. ⚠️ Shirakawa-go→Koyasan dio ~7h door-to-door (tramo largo, posible candidato a repensar). La card es un header clickeable (`.itin-head`) + detalle oculto (`.card-detail`, se muestra con la clase `.open`). **La temperatura vive dentro del detalle** (no siempre visible). Dentro, "Qué hacer" es otro acordeón colapsado por default. Los nodos "de paso" muestran "· de paso (por el día)". Cada actividad geolocalizada linkea a su punto en el mapa; el link a Google Maps vive en el popup del punto. **Coords reales de Google** (no Nominatim) — ver `projects/japan-trip/data/master_coords.json`.
- **Nikko como pivote del chain norte**: Nikko (de paso) ya NO va entre Tokio y Kanazawa, sino entre Tokio y Sendai — es el primer salto del recorrido norte (Tokio→Nikko→Ichinoseki→Sendai→Sapporo, todo hacia arriba, sin volver sobre los pasos). Desde Sapporo se vuela a Komatsu para retomar Kanazawa/Kansai. Esto resolvió el día imposible que había cuando Sapporo iba antes que Nikko.
- **Tohoku (Sendai)**: parada de 1 noche elegida por Martín (financiada sacando 1 noche de Tokio final, 7→6). Sendai como hub: gyutan, Zuihōden, daytrips a Matsushima y Zaō Fox Village. Swap posible a una parada foliage más al norte (Towada/Oirase, Aomori) pero esa pide 2n. Los lugares guardados Zuihōden + Zaō Fox Village salieron de orphans a Sendai (orphans 19→17).
- **Cambios (25 ago 2026 · task 545)**: se suman **Zava y Ari** al tramo del medio (19/10 KIX → 1/11 desde Tokio). Kioto 6n→**5n** (19-24), Osaka 5n→**3n** (24-27, y ya no se llega de Koyasan sino de Kioto en tren), **Tokio del medio 4n** (27-31, sin hospedaje todavía, se busca para 4) y el salto del 31/10 dejó de ser el Shinkansen Shin-Osaka→Hakata: ahora es un **vuelo Tokio→Fukuoka sin comprar** ("a definir"). Fukuoka, Hakone y Tokio final no se tocaron. La reserva de Osaka sigue con las fechas viejas y lleva su aviso de rebooking en la tarjeta. **Ronda 2**: los tres nodos llevan `sharedWith` (badge violeta, sin nombrarlos en el título) y existe `/japon/compartido/`, la vista filtrada del tramo para mandarles — ver su sección arriba.
- **Hospedaje de Kioto** (25 ago 2026 · task 553): el Airbnb propio de Ayakōji-dōri (19-25, para 2) **quedó reemplazado** por el que sacó otro de los cuatro: **«Kyotofish · Kamogawa»**, machiya entera de 180 m² sobre el río en Shimogyō-ku (348-2 Yatsuyanagichō, 600-8112), 4 dormitorios / 8 camas / 3 baños, para los 4, **19-24 oct** (5 noches, check-in 16:00, checkout 10:00). Desde la **ronda 4** (26/8) lleva su bloque de reserva como cualquier otro hospedaje —`ref: 'HMYZ4QJ8AP'`, check-in 19/10 16:00, checkout 24/10 10:00, "Abrir" a la ficha de la casa—, sin política de cancelación (la maneja Ari) y sin nada de plata. Fotos del listing, locales en `img/lodging/kioto-machiya-*.jpg`; de portada va la casa vista desde el río, porque el og:image del listing tiene el logo del host encima y se lee como un aviso. La reserva arrancó siendo 19-23 y quedaba una noche corta contra el nodo; el 25/8 se pidió a la host extender hasta el 24 y se da por aceptado, así que **reserva y nodo coinciden** (19-24) y la tarjeta ya no lleva `lodging.pending`. Coords de Google para la dirección: `34.9940, 135.7671`.
- **Hospedaje de Osaka** (25 ago 2026 · task 553, ampliación): el Airbnb 川HOUSE Dotonbori (reserva 26-31 para 2, que ya no coincidía con el nodo) **quedó reemplazado** por el **Mercure Tokyu Stay Osaka Namba** (2-2-4 Nishi-Shinsaibashi, Chūō-ku 〒542-0086; coords de la ficha del hotel `34.67062, 135.49964`), Superior Queen de 25 m² en los pisos 14-18, room only, **24-27 oct** — que es exactamente lo que ya decía el nodo, así que las fechas no se tocaron y la tarjeta va **sin `pending`**. Reservado en **Rakuten global** (`provider: 'rakuten'`, Booking ID + nro de reserva), igual que Fukuoka. Dos diferencias con Kioto: acá la reserva **sí es de Martín** (por eso lleva `booking`) y es **para 2** — Zava y Ari se alojan por su cuenta, o sea que el tramo sigue compartido pero **el alojamiento ya no**; el intro de Kioto lo aclara, para que no quede flotando la idea vieja de "los cuatro bajo el mismo techo todo el tramo". La `url` es la del **sitio propio del hotel** (mercure-tokyustay-osaka.com) y no la de la OTA: cuenta mejor dónde se duerme, y el número de reserva ya dice en qué plataforma está. Fotos **locales** (`img/osaka-mercure-*.jpg`), como todo hotel que no es Airbnb.
- **Fotos locales en la vista compartida** (misma task): Osaka es el primer hospedaje con fotos del repo dentro del tramo compartido, y `compartido/index.html` se sirve un nivel más abajo. El rewrite de paths de `build_compartido.js` sólo tocaba el HTML (CSS, favicon) y las fotos viven en los **datos** → cuatro 404 justo en la vista que se les manda a Zava y Ari. Lo arregla `rebaseLocalImages()`: le pone `../` a cualquier string que arranque con `img/`. Las remotas (muscache, Wikimedia) son absolutas y no se tocan.
- **Cambios (jun 2026)**: chain norte al arranque (Nikko→Sendai 1n→Sapporo 2n), financiado con −1 Tokio inicial, −1 Koyasan, −1 Tokio final; agregar Sendai corrió todo el medio del viaje +1 día. Sin Noboribetsu/Hakodate e Hiroshima/Miyajima; Osaka 5n; ventana de vuelo 6/10–18/11.
- **Silver Week** (~19–23 sep) cae ANTES del viaje (arranca 6/10) — el viaje la esquiva por completo.
- Estado: vuelos FIRMES (tickets del 6/10, ambos tramos confirmados con números/horarios reales).
