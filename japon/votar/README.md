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
- **Qué entra al mazo**: todo menos `comida`, `bar-noche`, `compras` y `otro`
  — 121 de los 272. Comer y tomar no se vota: se decide en el momento y con
  hambre. Las sesenta de `compras` son casi todas thrift shops sueltas y los
  cuatro de `otro` son el cajón de sastre de la taxonomía; ninguna de las dos
  cosas es un plan que valga la pena ordenar entre cuatro personas. Los dos
  cortes los pidió Martín (rondas 2 y 4), y el segundo es por volumen: 185
  cards seguían siendo demasiadas para votar de a ratos. El corte es por
  **exclusión** sobre la categoría ya resuelta, no por lista de incluidas: la
  taxonomía crece (`taller` salió el mismo día) y una categoría nueva tiene
  que entrar sola. Los votos ya emitidos sobre un lugar excluido **no se
  borran** de la db: dejan de aparecer y listo.
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
- **El texto de la card sale de `descriptions.js`** (ronda 3), no de la `note`
  de `reels.js`. Ver abajo.
- **Retomar**: el servidor es la fuente de verdad, y el orden del mazo es un
  barajado determinístico por token. Abrir el link en otro teléfono cae en el
  mismo lugar. El deshacer también sobrevive a la recarga: `/votes` devuelve el
  orden en que se votó y con eso el cliente rearma la pila.
- **Sin señal**: los votos que no salen quedan en una cola en `localStorage`,
  se avisa en pantalla y se reintenta (al volver online y cada 15 s).

## El fondo de la card

La card de arriba embebe el reel de Instagram de ese lugar — **cuando hay uno
que lo muestre**. Hoy son 82 de las 121; las otras 39 van con el mini-mapa.

**Por qué no todas** (ronda 5, task 559). Zava reportó que la card del Cat Cafe
MOCHA y la de Yanaka Ginza tenían de fondo la misma infografía ("Must-Visit
Places in TOKYO"), que no es ninguna de las dos. El post nombra a los dos —es un
roundup de treinta lugares de Tokio— así que como **fuente** está bien; lo que
estaba mal era usarlo de **media**. Son dos preguntas distintas y `data/reels.js`
las responde por separado en `SOURCE_REELS`: `covers` (de qué lugares habla el
post) y `showsEach` (si su media muestra a cada uno — sí en un video, no en una
foto fija o un carrusel de varios, porque el embed abre siempre en la primera
imagen y no hay forma de saber a cuál corresponde). Un reel compartido entre
varias cards sigue siendo válido —diez lo están— mientras las muestre a todas; lo
que ya no pasa es que una card muestre media de otro lugar.

La regla vive en `media-reel.js` y de ahí la leen la app y
`japon/scripts/check_reels_mapping.js`, para que no haya dos versiones que se
desincronizan. El frame estático de `frames.js` sale del mismo post que el embed
(la misma regla, en Python, dentro de `build_frames.py`); si no coinciden, la app
descarta el frame antes que mostrar la foto de otro lugar.

Tres cosas hacen que embeber el reel no sea un problema:

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

**Cuándo aparece el mini-mapa**: cuando el lugar no tiene ningún reel que lo
muestre (39 de 121 desde la ronda 5) y cuando el embed no llegó a tiempo. Es un
Leaflet sin un solo control y con `pointer-events: none` — el dedo que lo toca es
el que está swipeando. Debajo de todo siempre queda dibujado algo (el frame
estático si lo hay, el lavado de la categoría si no), así que la card nunca está
en blanco mientras carga.

Los tiles **no** son los de CARTO que usa el mapa de `index.html`: CARTO les
empezó a estampar "API KEY REQUIRED" atravesado a las cuentas sin key (agosto
2026, se ve igual en producción). Mientras el mini-mapa era el camino raro daba
lo mismo; con 39 cards apoyadas ahí, no. Van con Esri Light Gray Canvas, que no
pide key y es gris claro parecido. El mapa del site principal sigue con CARTO y
sigue marcado — es el mismo problema, sin arreglar.

**Por qué el `load` del iframe no alcanza para saber si el reel está**: cuando
el iframe no puede cargar, Chromium le mete adentro su propia página de error y
dispara `load` igual — comprobado abortando el request. Fiarse de eso sería
mostrar un rectángulo blanco con toda confianza. Lo que destapa el reel es otra
cosa: el embed le postea al padre un `{type:"LOADING"}` **desde el origen de
Instagram** apenas arranca, y eso una página de error no lo puede fingir. Llega
en ~1 s (medido sobre 8 posteos distintos). El timeout de 6,5 s destapa el mapa,
pero el oído queda abierto 30 s más: con mala señal el reel puede llegar tarde,
y cuando llega se pone encima.

## El texto de la card

`descriptions.js` (`window.VOTAR_DESCS`, keyed por `place_id`) es un archivo
**curado a mano**, con dos a cuatro oraciones por lugar: qué es, por qué vale
la pena y el dato práctico que cambia la decisión cuando se lo sabe (hay que
reservar, la temporada no da, cuánto lleva). La regla al escribirlas es que lo
que no se sabe no se inventa: antes que un horario alucinado va una línea de
menos. Cubre los 121 lugares del mazo y `check_votar.js` falla si aparece uno
sin descripción. Las 64 de `compras` y `otro` estaban escritas cuando la ronda
4 sacó esas dos categorías y quedaron en el archivo: si alguna vuelve al mazo,
vuelve con su texto puesto.

Vive en `votar/` y no en `data/` **a propósito**: `data/reels.js` y
`data/categories.js` los reescribe el pipeline de Instagram cada vez que entran
reels nuevos, y un archivo escrito a mano ahí adentro dura hasta la próxima
corrida. Si mañana se suma un lugar y nadie le escribe la descripción, la card
cae sola a la `note` de `reels.js` (una línea) y el chequeo avisa.

En la card el texto arranca **recortado a tres líneas**, con un "más" que lo
abre: atrás está el reel andando y taparlo entero con texto sería cambiar un
problema por otro. El botón aparece sólo si el texto de verdad no entraba —eso
se **mide** en `noteToggle()`, no se estima por largo de string, porque depende
del ancho del teléfono y del tamaño de letra del sistema— y sólo en la card de
arriba, que es la única que se lee entera.

Abierta, la descripción tiene un tope de alto y arriba de eso scrollea adentro.
Ese scroll lo mueve `app.js` a mano, en el `pointermove`: la card entera es
`touch-action: none` para que el arrastre sea del mazo, eso lo heredan los
hijos, y entonces el navegador no scrollea el párrafo solo. Con las
descripciones de hoy (405 caracteres la más larga) el texto entra sin scroll en
un viewport de 390×844, así que ese camino es el seguro para el día que alguien
escriba una más larga.

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
node ../japon/scripts/check_reels_mapping.js            # el mapeo actividad → reel
node ../japon/scripts/check_reels_mapping.js --selftest # y que el chequeo pueda fallar
set -a; . ~/.openclaw/workspace/data/japon-votos/test-tokens.env; set +a
BASE=http://127.0.0.1:8770 node votar/scripts/check_votar.js
python3 votar/scripts/check_keepalive.py votos.mewis.online 443 $TOKEN
```

`check_reels_mapping.js` es la guarda del mapeo (ronda 5): que cada reel que la
card embebe hable de ese lugar, que el frame estático sea de ese mismo post y
exista, y que un lugar sin reel propio no arrastre el frame de otro. **No** es un
chequeo de unicidad — un reel compartido por varias cards que sí muestra es
válido y tiene su fixture. `--selftest` corre los tres fixtures de
`japon/scripts/fixtures/reels-mapping/` y verifica que falle donde tiene que
fallar: un chequeo que nunca puede fallar no chequea nada.

`TOKEN`/`TOKEN2` son **los de prueba**, nunca los de un viajero: la suite borra
votos. Si igual se le pasa el de una persona, no arranca.

`check_votar.js` levanta la app con Playwright y prueba el gesto de verdad
(mouse y touch por CDP), el deshacer, retomar tras recargar, el gate sin token,
el `/aggregate` con dos votantes, y —desde la ronda 2— que el mazo no traiga
ninguna de las cuatro categorías excluidas pero sí todo el resto de la
taxonomía, que la card de arriba embeba el reel, que con el iframe puesto el
swipe táctil siga votando, que el
toque quieto active el reel y el botón lo devuelva, y que cortando Instagram
aparezca el mini-mapa y se pueda seguir swipeando igual. Desde la ronda 3
también chequea que los lugares del mazo tengan descripción curada, que la card
muestre ésa y no la `note`, que el "más" aparezca exactamente cuando el texto
se recorta, que abrirlo no vote, que con el texto abierto la card no se
desborde ni empuje la botonera, y que el swipe táctil siga votando igual. Desde
la ronda 5 chequea además que **ninguna card del mazo embeba un reel que no la
nombra** —el reporte de Zava, medido sobre la app viva— y avanza hasta una card
con reel propio antes de probar el embed, porque ya no todas tienen.
`check_keepalive.py` manda a mano los requests
rotos que ningún cliente HTTP normal deja mandar y comprueba que no se lleven
puesto al request siguiente de la misma conexión; corre igual contra el puerto
local (`127.0.0.1 9202`) que contra el dominio, y contra el dominio es más
representativo porque incluye el pool de cloudflared.

`build_frames.py` toma un frame representativo por reel de
`projects/japan-trip/data/ig/frames/`. Esa carpeta es residual —el pipeline de
IG borra los frames después de transcribir—, así que hoy sólo **14 de 272**
lugares tienen foto (11 webp, 291 KB). Eran 26 hasta la ronda 5: los doce que se
cayeron eran frames de carruseles de varios lugares, o sea la foto de otro. El
resto va con card tipográfica del color de su categoría, que es un estado normal
y no un faltante: si mañana el pipeline deja más frames, se vuelve a correr el
script y aparecen solos.

Limitación conocida: algunos reels traen el nombre del lugar quemado en el
video (un zócalo), y como la card dibuja su propio título encima, ahí se ve el
nombre dos veces. Elegir el frame del medio evita las placas de título y de
cierre pero no los zócalos que duran todo el video; separarlos de verdad
necesitaría OCR sobre cada frame, que es bastante más máquina de la que justifica
el detalle.
