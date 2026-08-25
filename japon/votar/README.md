# Votar — mazo de swipe de actividades (task 548)

App aparte para que los cuatro viajeros marquen qué les interesa hacer, con la
menor fricción posible (teléfono, momentos muertos). La salida es el tally de
`/aggregate`, que es lo que va a alimentar la capa de **destacados** de la app
principal.

Producción: <https://mew-industries.github.io/trips/japon/votar/?u=TOKEN>

## Cómo funciona

- **Datos**: no tiene copia propia. Lee `../data/reels.js` (`SOURCE_THINGS`, 272
  lugares) y `../data/categories.js` (taxonomía, colores, íconos), o sea
  exactamente lo mismo que la app principal.
- **Qué entra al mazo**: todo menos `comida` y `bar-noche` — 185 de los 272.
  Comer y tomar no se vota (pedido de Martín): se decide en el momento y con
  hambre. El corte es por **exclusión** sobre la categoría ya resuelta, no por
  lista de incluidas: la taxonomía crece (`taller` salió el mismo día) y una
  categoría nueva tiene que entrar sola. Los votos ya emitidos sobre un lugar
  excluido **no se borran** del KV: dejan de aparecer y listo.
- **Identidad**: un link por persona, `?u=<token>`. El token no es adivinable,
  identifica y autoriza; sin token conocido la app muestra el gate y no monta
  el mazo. No hay login. En el journal el token sale enmascarado (`?u=<token>`):
  es una credencial y el log lo lee más gente que el `0600` de la db.
- **place_id**: `p-<nombre normalizado>`, con el mismo `catKey`/`thingKey` que
  usa `index.html` para sus `act-…`. Por eso el tally se puede unir con las
  actividades de la app principal sin tabla de traducción. El id se foldea a
  ASCII (el backend valida `^p-[a-z0-9-]+$`); un nombre que no deje ni una letra
  ASCII —kana puro— cae en `p-x<hash>`. `app.js` y `build_frames.py` tienen que
  generar el mismo id: si tocás uno, tocá el otro.
- **Gestos**: derecha = sí, izquierda = paso, arriba = ⭐ "me RE interesa".
  Los mismos tres, más deshacer, están en la botonera; en desktop andan
  además ← → ↑ y `Z`.
- **La card muestra el reel, no una foto del reel** (ronda 2). Ver abajo.
- **Retomar**: el servidor es la fuente de verdad, y el orden del mazo es un
  barajado determinístico por token. Abrir el link en otro teléfono cae en el
  mismo lugar. El deshacer también sobrevive a la recarga: `/votes` devuelve el
  orden en que se votó y con eso el cliente rearma la pila.
- **Sin señal**: los votos que no salen quedan en una cola en `localStorage`,
  se avisa en pantalla y se reintenta (al volver online y cada 15 s).

## El fondo de la card

La card de arriba embebe el reel de Instagram de ese lugar. Tres cosas hacen
que eso no sea un problema:

- **Recorte**. El embed (`/p/<code>/embed/`) mide siempre lo mismo por dentro:
  54 px de encabezado y abajo el media en 4:5 sobre el ancho del iframe —
  medido igual en reel, video y carrusel. `app.js` escala el iframe para cubrir
  la card y lo sube esos 54 px, así queda sólo el media a sangre, sin la barra
  de "View profile" ni los botones. Si Instagram cambia el alto del encabezado,
  la constante a tocar es `IG_HEAD`.
- **Sólo la de arriba**. Es la única que se ve entera y la única que se
  arrastra; las de atrás siguen con su lavado de categoría. El iframe se monta
  90 ms después de que la card ya está en pantalla, para no trabar el swipe que
  la trajo. Cada swipe carga un embed, no N.
- **El gesto sigue siendo del mazo**. Un iframe se come el touch, así que
  arriba del embed va un escudo transparente y el arrastre se lee ahí. Un
  **toque quieto** (menos de 8 px) saca el escudo y el reel pasa a ser del dedo
  —play, sonido, las flechas del carrusel— con un botón "↔ deslizar" que lo
  devuelve al mazo. El swipe sigue disponible desde el texto y la botonera. La
  suite prueba las dos cosas con touch de verdad (CDP), que es el criterio duro
  de la ronda 2.

**Cuándo aparece el mini-mapa**: cuando el lugar no tiene reel (hoy ninguno: los
272 vienen de un reel, así que es el camino del dato futuro) y cuando el embed
no llegó a tiempo. Es un Leaflet con los mismos tiles del mapa principal, sin
un solo control y con `pointer-events: none` — el dedo que lo toca es el que
está swipeando. Debajo de todo siempre queda dibujado algo (el frame estático
si lo hay, el lavado de la categoría si no), así que la card nunca está en
blanco mientras carga.

**Por qué el `load` del iframe no alcanza para saber si el reel está**: cuando
el iframe no puede cargar, Chromium le mete adentro su propia página de error y
dispara `load` igual — comprobado abortando el request. Fiarse de eso sería
mostrar un rectángulo blanco con toda confianza. Lo que destapa el reel es otra
cosa: el embed le postea al padre un `{type:"LOADING"}` **desde el origen de
Instagram** apenas arranca, y eso una página de error no lo puede fingir. Llega
en ~1 s (medido sobre 8 posteos distintos). El timeout de 6,5 s destapa el mapa,
pero el oído queda abierto 30 s más: con mala señal el reel puede llegar tarde,
y cuando llega se pone encima.

## Backend

`server/votos.py` — proceso Python (stdlib + SQLite) en `127.0.0.1:9202`,
publicado como `https://votos.mewis.online` por el túnel cloudflared que ya
corría en el host.

```
GET  /health
GET  /votes?u=<token>   -> {user, votes:{place_id:voto}, history:[...], count}
PUT  /votes             -> {token, place_id, vote}   vote ∈ si|no|star|null
GET  /aggregate         -> {places:{place_id:{si,no,star,score,voters}}, voterCount, ...}
```

Además de los cuatro viajeros hay **dos votantes de prueba** (`test-a`,
`test-b`), y sus votos **no cuentan en `/aggregate`** — el tally que va a
alimentar destacados es el de la gente. Existen porque `check_votar.js` arranca
borrando los votos del token que le pasan: con el token de una persona eso es
destruirle lo que votó, y pasó —en la ronda 2 la suite se llevó puesta la
primera tanda de votos de Martín, que no se pudo recuperar (las filas son
`DELETE`, no hay historial y el snapshot del día era anterior). Ahora hay dos
cosas que lo impiden: los tokens de prueba en `test-tokens.env` y un portero en
la suite que corta si el token que recibió no es de un `test-*`. El único uso de
`?includeTest=1` en `/aggregate` es que el test pueda probar que la suma cruza
dos votantes sin usar la cuenta de nadie.

`vote: null` borra el voto (es el deshacer). El `PUT` es idempotente por
`(token, place_id)`. `/aggregate` no lleva token, así que devuelve cuántos
votaron (`voterCount`) pero no quiénes.

El `PUT` es público: cualquiera puede mandarle un request roto. Como la
conexión es HTTP/1.1 con keep-alive y cloudflared reusa las conexiones al
origen entre requests de gente distinta, un body anunciado y no leído queda en
el socket y desfasa el request siguiente — el de otro viajero. Por eso el
handler consume el body ANTES de decidir la respuesta (ruta incluida), y cuando
no puede consumirlo con certeza (chunked, largo ilegible, body > 4 KB) cierra la
conexión con `Connection: close` en vez de seguir usándola. `check_keepalive.py`
es la prueba de regresión de eso.

**No es un Cloudflare Worker + KV**, que era el plan. El `CF_API_TOKEN` de la
casa tiene permisos de zona y de Cloudflare Tunnel pero **no** de Workers ni
de KV: `POST /accounts/*/workers/scripts` y `/storage/kv/namespaces` devuelven
`10000 Authentication error` (el mismo muro contra el que chocó la task 546).
La superficie HTTP es la que iba a tener el Worker, así que si algún día
aparece un token con permisos se reimplementa detrás y el cliente no se entera.

Operación:

```
systemctl --user status  japon-votos      # unidad: ~/.config/systemd/user/japon-votos.service
systemctl --user restart japon-votos
```

Estado y links personales: `~/.openclaw/workspace/data/japon-votos/`
(`votos.db` + `links.md`). Está **fuera del repo** a propósito: esto es GitHub
Pages, todo lo que se commitea es público.

## Para la integración de destacados (task futura)

`/aggregate` expone el tally crudo y el `score` (⭐=2, sí=1, paso=0) por
`place_id`, más `voterCount`. El **umbral** de qué cuenta como destacado se
decide del lado de la app principal — acá no se decide nada, sólo se cuenta.

## Regenerar / verificar

```
python3 votar/scripts/build_frames.py          # img/*.webp + frames.js
set -a; . ~/.openclaw/workspace/data/japon-votos/test-tokens.env; set +a
BASE=http://127.0.0.1:8770 node votar/scripts/check_votar.js
python3 votar/scripts/check_keepalive.py votos.mewis.online 443 $TOKEN
```

`TOKEN`/`TOKEN2` son **los de prueba**, nunca los de un viajero: la suite borra
votos. Si igual se le pasa el de una persona, no arranca.

`check_votar.js` levanta la app con Playwright y prueba el gesto de verdad
(mouse y touch por CDP), el deshacer, retomar tras recargar, el gate sin token,
el `/aggregate` con dos votantes, y —desde la ronda 2— que el mazo no traiga
comida ni bar-noche pero sí todo el resto de la taxonomía, que la card de arriba
embeba el reel, que con el iframe puesto el swipe táctil siga votando, que el
toque quieto active el reel y el botón lo devuelva, y que cortando Instagram
aparezca el mini-mapa y se pueda seguir swipeando igual. `check_keepalive.py` manda a mano los requests
rotos que ningún cliente HTTP normal deja mandar y comprueba que no se lleven
puesto al request siguiente de la misma conexión; corre igual contra el puerto
local (`127.0.0.1 9202`) que contra el dominio, y contra el dominio es más
representativo porque incluye el pool de cloudflared.

`build_frames.py` toma un frame representativo por reel de
`projects/japan-trip/data/ig/frames/`. Esa carpeta es residual —el pipeline de
IG borra los frames después de transcribir—, así que hoy sólo **26 de 272**
lugares tienen foto (13 webp, 356 KB). El resto va con card tipográfica del
color de su categoría, que es un estado normal y no un faltante: si mañana el
pipeline deja más frames, se vuelve a correr el script y aparecen solos.

Limitación conocida: algunos reels traen el nombre del lugar quemado en el
video (un zócalo), y como la card dibuja su propio título encima, ahí se ve el
nombre dos veces —`21st Century Museum of Contemporary Art` es el caso más
visible—. Elegir el frame del medio evita las placas de título y de cierre pero
no los zócalos que duran todo el video; separarlos de verdad necesitaría OCR
sobre cada frame, que es bastante más máquina de la que justifica el detalle.
