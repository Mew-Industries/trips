# Votar — mazo de swipe de actividades (task 548)

App aparte para que los cuatro viajeros marquen qué les interesa hacer, con la
menor fricción posible (teléfono, momentos muertos). La salida es el tally de
`/aggregate`, que es lo que va a alimentar la capa de **destacados** de la app
principal.

Producción: <https://mew-industries.github.io/trips/japon/votar/?u=TOKEN>

## Cómo funciona

- **Datos**: no tiene copia propia. Lee `../data/reels.js` (`SOURCE_THINGS`, 221
  lugares) y `../data/categories.js` (taxonomía, colores, íconos), o sea
  exactamente lo mismo que la app principal.
- **Identidad**: un link por persona, `?u=<token>`. El token no es adivinable,
  identifica y autoriza; sin token conocido la app muestra el gate y no monta
  el mazo. No hay login.
- **place_id**: `p-<nombre normalizado>`, con el mismo `catKey`/`thingKey` que
  usa `index.html` para sus `act-…`. Por eso el tally se puede unir con las
  actividades de la app principal sin tabla de traducción.
- **Gestos**: derecha = sí, izquierda = paso, arriba = ⭐ "me RE interesa".
  Los mismos tres, más deshacer, están en la botonera; en desktop andan
  además ← → ↑ y `Z`.
- **Retomar**: el servidor es la fuente de verdad, y el orden del mazo es un
  barajado determinístico por token. Abrir el link en otro teléfono cae en el
  mismo lugar. El deshacer también sobrevive a la recarga: `/votes` devuelve el
  orden en que se votó y con eso el cliente rearma la pila.
- **Sin señal**: los votos que no salen quedan en una cola en `localStorage`,
  se avisa en pantalla y se reintenta (al volver online y cada 15 s).

## Backend

`server/votos.py` — proceso Python (stdlib + SQLite) en `127.0.0.1:9202`,
publicado como `https://votos.mewis.online` por el túnel cloudflared que ya
corría en el host.

```
GET  /health
GET  /votes?u=<token>   -> {user, votes:{place_id:voto}, history:[...], count}
PUT  /votes             -> {token, place_id, vote}   vote ∈ si|no|star|null
GET  /aggregate         -> {places:{place_id:{si,no,star,score,voters}}, ...}
```

`vote: null` borra el voto (es el deshacer). El `PUT` es idempotente por
`(token, place_id)`.

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
BASE=http://127.0.0.1:8770 TOKEN=… TOKEN2=… node votar/scripts/check_votar.js
```

`build_frames.py` toma un frame representativo por reel de
`projects/japan-trip/data/ig/frames/`. Esa carpeta es residual —el pipeline de
IG borra los frames después de transcribir—, así que hoy sólo **26 de 221**
lugares tienen foto (13 webp, 326 KB). El resto va con card tipográfica del
color de su categoría, que es un estado normal y no un faltante: si mañana el
pipeline deja más frames, se vuelve a correr el script y aparecen solos.
