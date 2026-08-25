/* app.js — mazo de votación de actividades de Japón (task 548).
 *
 * Fuente de lugares: ../data/reels.js (window.SOURCE_THINGS) + la taxonomía de
 * ../data/categories.js, o sea exactamente los mismos datos que la app
 * principal — esta app no tiene copia propia de nada.
 *
 * Identidad: `?u=<token>`. El token viaja en el link personal de cada viajero;
 * sin token conocido no se ve el mazo. No hay login ni cuentas.
 *
 * Estado: el servidor (votos.mewis.online) es la fuente de verdad, así que
 * abrir el link en otro teléfono retoma donde iba. localStorage sólo guarda la
 * cola de votos que todavía no se pudieron mandar.
 */
(function () {
  'use strict';

  var API = 'https://votos.mewis.online';

  /* ------------------------------------------------------------- datos */

  // Mismo `catKey`/`thingKey` que index.html: el place_id de un lugar es su
  // nombre normalizado, así el tally de /aggregate se puede unir con las
  // actividades de la app principal sin tabla de traducción.
  function catKey(s) {
    return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  }
  function hash32(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h.toString(36);
  }
  // El id tiene que ser ASCII: el backend valida `^p-[a-z0-9-]+$` y un id con
  // kana adentro se comería un 400 y el voto se perdería en silencio. Hoy todos
  // los nombres foldean a ASCII (los acentos los saca el NFD y lo que está en
  // japonés viene entre paréntesis, que se cortan), así que el filtro no cambia
  // ningún id existente; está para el día que entre un lugar escrito en kana.
  function placeId(name) {
    var base = catKey(String(name || '').split('(')[0]).replace(/\s+/g, '-');
    var ascii = base.replace(/[^a-z0-9-]+/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
    if (ascii) return 'p-' + ascii.slice(0, 140);
    // Nombre sin una sola letra ASCII: id estable por hash del nombre, así el
    // lugar sigue siendo el mismo entre recargas, personas y regeneraciones.
    return 'p-x' + hash32(String(name || ''));
  }

  var TAX = window.PLACE_TAXONOMY || { meta: {}, order: [] };
  var CAT_BY_NAME = {};
  Object.keys(window.PLACE_CAT_OVERRIDES || {}).forEach(function (n) {
    CAT_BY_NAME[catKey(n)] = window.PLACE_CAT_OVERRIDES[n];
  });
  function catOf(name, legacy) {
    var own = CAT_BY_NAME[catKey(name)];
    if (own && TAX.meta[own]) return own;
    if (TAX.meta[legacy]) return legacy;
    var mapped = (window.PLACE_CAT_LEGACY || {})[legacy];
    return (mapped && TAX.meta[mapped]) ? mapped : 'otro';
  }

  // Las cuatro ciudades donde se concentra el viaje; el resto cae en "Otros".
  // Sin esto el filtro tendría 31 chips de una entrada cada uno.
  var CITY_RULES = [
    ['Tokio', /tok(io|yo)/], ['Kioto', /k(io|yo)to/], ['Osaka', /osaka/]
  ];
  function cityOf(area) {
    var a = String(area || '').toLowerCase();
    for (var i = 0; i < CITY_RULES.length; i++) if (CITY_RULES[i][1].test(a)) return CITY_RULES[i][0];
    return 'Otros';
  }
  // El chip de abajo dice DÓNDE queda: el barrio si el `area` lo trae, y si no
  // la ciudad tal cual está escrita. Nunca el bucket del filtro: "Otros" no le
  // dice a nadie que el museo está en Kanazawa.
  function placeOf(area) {
    return String(area || '').split('(')[0].split(',')[0].trim();
  }
  function hoodOf(area) {
    var m = /\(([^)]+)\)/.exec(area || '');
    if (m) return m[1].trim();
    var parts = String(area || '').split(',');
    return parts.length === 2 ? parts[0].trim() : '';
  }

  // Comer y tomar no se votan: se deciden en el momento y con hambre (pedido
  // explícito de Martín). Se excluye por categoría RESUELTA y por exclusión, no
  // por lista de incluidas: así una categoría nueva de la taxonomía (`taller`
  // fue la última) entra sola al mazo sin tocar este archivo.
  var SKIP_CATS = { 'comida': 1, 'bar-noche': 1 };

  // El shortcode del reel es lo único que necesita el embed de Instagram. Los
  // datos traen la URL como /p/<code>/, pero /reel/ y /tv/ son lo mismo.
  function shortcode(url) {
    var m = /instagram\.com\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/.exec(url || '');
    return m ? m[1] : null;
  }

  var FRAMES = window.VOTAR_FRAMES || {};
  // `descriptions.js` es curado a mano y va aguas abajo de los generadores: la
  // card muestra eso. La `note` de reels.js queda de red por si entra un lugar
  // nuevo antes de que alguien le escriba la descripción.
  var DESCS = window.VOTAR_DESCS || {};
  var PLACES = (window.SOURCE_THINGS || []).map(function (t) {
    var reel = (t.sources || []).filter(function (s) { return s.type === 'instagram_reel'; })[0];
    return {
      id: placeId(t.name),
      name: t.name,
      note: DESCS[placeId(t.name)] || t.note || '',
      area: t.area || '',
      city: cityOf(t.area),
      hood: hoodOf(t.area) || placeOf(t.area),
      cat: catOf(t.name, t.cat),
      lat: typeof t.lat === 'number' ? t.lat : null,
      lon: typeof t.lon === 'number' ? t.lon : null,
      img: FRAMES[placeId(t.name)] || null,
      reel: reel ? reel.url : null,
      ig: reel ? shortcode(reel.url) : null,
      maps: 'https://www.google.com/maps/search/?api=1&query=' +
        encodeURIComponent(t.name + (t.area ? ' ' + t.area : ''))
    };
  }).filter(function (p) { return !SKIP_CATS[p.cat]; });
  // Un lugar puede aparecer en dos reels: se vota una sola vez.
  var seen = {};
  PLACES = PLACES.filter(function (p) { return seen[p.id] ? false : (seen[p.id] = true); });
  // El mazo tal cual lo armó la app, para que `check_votar.js` pueda mirar lo
  // que se ve y no una reimplementación del filtro que puede desincronizarse.
  window.VOTAR_PLACES = PLACES;

  /* -------------------------------------------------------------- estado */

  var qs = new URLSearchParams(location.search);
  var token = (qs.get('u') || '').trim();
  var city = qs.get('city') || 'todo';

  var me = null;          // {id, name}
  var votes = {};         // place_id -> 'si'|'no'|'star' (confirmado o en cola)
  var queue = [];         // votos que no se pudieron mandar todavía
  var history = [];       // pila de deshacer: place_id en orden de swipe
  var order = [];         // orden estable del mazo, por token
  var deckEl, pending = false;

  var $ = function (id) { return document.getElementById(id); };
  var QKEY = function () { return 'votar:queue:' + token.slice(0, 8); };

  /* Orden barajado pero determinístico por persona: cada uno ve su propio
     recorrido y siempre el mismo, así recargar retoma exactamente donde iba
     (y dos personas no arrancan las 272 por el mismo lado). */
  function seededOrder(list, seed) {
    var h = 0;
    for (var i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    var rnd = function () {
      h ^= h << 13; h >>>= 0; h ^= h >> 17; h ^= h << 5; h >>>= 0;
      return h / 4294967296;
    };
    var out = list.slice();
    for (var j = out.length - 1; j > 0; j--) {
      var k = Math.floor(rnd() * (j + 1));
      var t = out[j]; out[j] = out[k]; out[k] = t;
    }
    return out;
  }

  function inCity(p) { return city === 'todo' || p.city === city; }
  function pool() { return order.filter(inCity); }
  function queueLeft() { return pool().filter(function (p) { return !votes[p.id]; }); }

  /* ------------------------------------------------------------ servidor */

  function loadQueue() {
    try { queue = JSON.parse(localStorage.getItem(QKEY()) || '[]') || []; } catch (e) { queue = []; }
  }
  function saveQueue() {
    try { localStorage.setItem(QKEY(), JSON.stringify(queue)); } catch (e) { /* modo privado */ }
    var n = queue.length;
    $('sync').hidden = n === 0;
    $('sync').textContent = n === 1 ? '1 voto sin guardar · reintentando' : n + ' votos sin guardar · reintentando';
  }

  function send(entry) {
    return fetch(API + '/votes', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: token, place_id: entry.place_id, vote: entry.vote })
    }).then(function (r) {
      if (!r.ok && r.status !== 403 && r.status !== 400) throw new Error('http ' + r.status);
      return true;   // 400/403 no se reintentan: el voto nunca va a entrar
    });
  }

  // La cola se drena en orden: dos votos del mismo lugar tienen que aplicarse
  // como se hicieron, si no el "deshacer" podría quedar pisado por su propio sí.
  function flush() {
    if (pending || !queue.length) return Promise.resolve();
    pending = true;
    var entry = queue[0];
    return send(entry).then(function () {
      queue.shift(); saveQueue(); pending = false;
      return queue.length ? flush() : null;
    }).catch(function () { pending = false; });
  }

  function record(placeId_, vote) {
    queue.push({ place_id: placeId_, vote: vote });
    saveQueue();
    flush();
  }

  /* ----------------------------------------------------------- render */

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function cardHTML(p, top) {
    var meta = TAX.meta[p.cat] || TAX.meta.otro || { label: 'Otros', icon: '✨', color: '#8C8C8C' };
    var links = [];
    if (p.reel) links.push('<a href="' + esc(p.reel) + '" target="_blank" rel="noopener">Ver el reel →</a>');
    links.push('<a href="' + esc(p.maps) + '" target="_blank" rel="noopener">Maps →</a>');
    return '' +
      '<div class="card-media">' +
        (p.img ? '<img class="card-img" src="' + esc(p.img) + '" alt="" draggable="false">'
               : '<span class="card-glyph">' + meta.icon + '</span>') +
        // El escudo tapa al iframe para que el gesto sea del mazo y no de
        // Instagram. Sólo la card de arriba lo necesita: es la única que
        // embebe y la única que se arrastra.
        (top && p.ig ? '<div class="media-shield"></div>' : '') +
      '</div>' +
      (top && p.ig ? '<button type="button" class="media-back">↔ deslizar</button>' : '') +
      '<span class="stamp stamp-si">Sí</span>' +
      '<span class="stamp stamp-no">Paso</span>' +
      '<span class="stamp stamp-star">★ Re</span>' +
      '<div class="card-body">' +
        '<div class="card-tags">' +
          '<span class="tag" style="--tc:' + meta.color + '">' + meta.icon + ' ' + esc(meta.label) + '</span>' +
          (p.hood ? '<span class="tag tag-hood">' + esc(p.hood) + '</span>' : '') +
        '</div>' +
        '<h2 class="card-name">' + esc(p.name) + '</h2>' +
        // La descripción arranca recortada a tres líneas: el reel que está
        // atrás tiene que seguir viéndose. El "más" lo abre, y sólo aparece en
        // la card de arriba —las de atrás se ven por el borde— y sólo si el
        // texto de verdad no entraba (lo mide `render`).
        (p.note ? '<p class="card-note">' + esc(p.note) + '</p>' +
                  (top ? '<button type="button" class="note-more" hidden>más</button>' : '') : '') +
        '<div class="card-links">' + links.join('') + '</div>' +
      '</div>';
  }

  function buildCard(p, depth) {
    var meta = TAX.meta[p.cat] || TAX.meta.otro;
    var el = document.createElement('article');
    el.className = 'card ' + (p.img ? 'has-img on-dark' : 'no-img') + (depth ? ' behind' : ' top');
    el.dataset.depth = depth;
    el.dataset.place = p.id;
    if (!p.img) {
      el.style.setProperty('--wash-a', meta.color + '26');
      el.style.setProperty('--wash-b', meta.color + '0D');
    }
    el.innerHTML = cardHTML(p, !depth);
    return el;
  }

  /* --------------------------------------------------------------- media */

  /* La card de arriba muestra el reel de verdad, no un frame congelado.
   *
   * El embed de Instagram mide siempre lo mismo por dentro: 54 px de
   * encabezado y debajo el media en 4:5 sobre el ancho del iframe (medido en
   * los tres tipos de posteo: reel, video y carrusel). Con eso se puede
   * recortar el iframe a sangre y dejar SÓLO el media, ocupando la card como
   * la ocupaba la foto — sin la barra azul de "View profile" ni los botones.
   *
   * Debajo del iframe siempre queda algo dibujado (el frame estático, el
   * mini-mapa o el lavado de la categoría), así que mientras el embed carga —
   * o si nunca carga — la card nunca está en blanco. */
  var IG_ORIGIN = 'https://www.instagram.com';
  var IG_W = 400, IG_HEAD = 54, IG_MEDIA = IG_W * 1.25, IG_TIMEOUT = 6500, IG_GIVEUP = 30000;

  function mountMedia(card, p) {
    var media = card.querySelector('.card-media');
    if (!media) return;
    // Sin reel no hay nada que embeber: si el lugar tiene coordenada, la card
    // muestra dónde queda. Hoy los 272 lugares vienen de un reel, así que este
    // camino es el del dato que todavía no existe (y el del embed que falla).
    if (!p.ig) return mapFallback(card, p);

    var f = document.createElement('iframe');
    f.className = 'media-ig';
    f.src = 'https://www.instagram.com/p/' + encodeURIComponent(p.ig) + '/embed/';
    f.setAttribute('scrolling', 'no');
    f.setAttribute('allowtransparency', 'true');
    f.setAttribute('allow', 'autoplay; clipboard-write; encrypted-media; picture-in-picture');
    f.setAttribute('allowfullscreen', '');
    f.setAttribute('title', 'Reel de ' + p.name);
    fitIG(f, card);
    media.appendChild(f);

    // `load` NO sirve para saber si el reel está: cuando el iframe no puede
    // cargar, Chromium le mete adentro su propia página de error y dispara
    // `load` igual (probado abortando el request). Si nos fiáramos de eso, la
    // card mostraría un rectángulo blanco con toda confianza.
    //
    // El embed de Instagram, en cambio, le postea al padre un `{type:LOADING}`
    // desde su propio origen apenas arranca — algo que una página de error no
    // puede fingir. Eso es lo que destapa el reel. Llega en ~1 s.
    var timer, giveUp;
    var alive = function (e) {
      if (e.origin !== IG_ORIGIN || e.source !== f.contentWindow) return;
      window.removeEventListener('message', alive);
      clearTimeout(timer); clearTimeout(giveUp);
      if (card.isConnected) card.classList.add('ig-on', 'on-dark');
    };
    window.addEventListener('message', alive);
    // Si a los pocos segundos no dio señales, abajo aparece el mapa — pero el
    // oído queda abierto un rato más: con mala señal el reel puede llegar
    // tarde, y cuando llega se pone encima. El mapa era el mientras tanto.
    timer = setTimeout(function () { mapFallback(card, p); }, IG_TIMEOUT);
    giveUp = setTimeout(function () { window.removeEventListener('message', alive); }, IG_GIVEUP);
    f.addEventListener('error', function () {
      clearTimeout(timer);
      mapFallback(card, p);
    });
  }

  // Recorte del iframe: se escala para cubrir la card (como un object-fit
  // cover) y se sube IG_HEAD para que el encabezado quede fuera del marco.
  function fitIG(f, card) {
    var w = card.clientWidth || 380, h = card.clientHeight || 560;
    var k = Math.max(w / IG_W, h / IG_MEDIA);
    f.style.width = IG_W + 'px';
    f.style.height = (IG_HEAD + IG_MEDIA + 2) + 'px';
    f.style.transform = 'scale(' + k + ')';
    f.style.left = ((w - IG_W * k) / 2) + 'px';
    f.style.top = ((h - IG_MEDIA * k) / 2 - IG_HEAD * k) + 'px';
  }

  var leafletP = null;
  function leaflet() {
    if (window.L) return Promise.resolve(window.L);
    if (leafletP) return leafletP;
    leafletP = new Promise(function (res, rej) {
      var css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(css);
      var s = document.createElement('script');
      s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      s.onload = function () { res(window.L); };
      s.onerror = function () { leafletP = null; rej(new Error('leaflet')); };
      document.head.appendChild(s);
    });
    return leafletP;
  }

  // Mini-mapa: mismos tiles que el mapa del site principal, sin un solo
  // control ni gesto propio (`pointer-events: none`) — el mazo no puede
  // pelearse con un mapa por el mismo dedo.
  function mapFallback(card, p) {
    var media = card.querySelector('.card-media');
    if (!media || p.lat == null || p.lon == null) return;
    if (media.querySelector('.media-map')) return;
    var box = document.createElement('div');
    box.className = 'media-map';
    media.appendChild(box);
    leaflet().then(function (L) {
      if (!card.isConnected) return;
      var m = L.map(box, {
        zoomControl: false, dragging: false, inertia: false,
        scrollWheelZoom: false, doubleClickZoom: false, boxZoom: false, keyboard: false,
        touchZoom: false, tap: false, zoomAnimation: false, fadeAnimation: false,
        // Los tiles son de otro: la atribución va, aunque el mapa sea del
        // tamaño de una card. El CSS la manda arriba, donde no pisa el texto.
        attributionControl: true
      });
      m.attributionControl.setPrefix(false);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap, © CARTO', subdomains: 'abcd', maxZoom: 19
      }).addTo(m);
      m.setView([p.lat, p.lon], 15);
      L.circleMarker([p.lat, p.lon], {
        radius: 9, weight: 3, color: '#fff', fillColor: '#B4483A', fillOpacity: 1
      }).addTo(m);
      m.invalidateSize();
      card.classList.add('map-on');
    }).catch(function () { /* sin mapa la card sigue siendo la de siempre */ });
  }

  /* El "más" de la descripción. No se decide por largo de string —eso depende
     del ancho del teléfono y del tamaño de letra del sistema— sino midiendo:
     si el texto completo no entra en las tres líneas del recorte, aparece el
     botón; si entraba, no hay nada que abrir y el botón no se ve. */
  function noteToggle(card) {
    var note = card.querySelector('.card-note'), more = card.querySelector('.note-more');
    if (!note || !more) return;
    if (note.scrollHeight <= note.clientHeight + 2) return;
    more.hidden = false;
    more.addEventListener('click', function () {
      more.textContent = note.classList.toggle('open') ? 'menos' : 'más';
    });
  }

  function render() {
    var left = queueLeft();
    var total = pool().length;
    $('pg-count').textContent = (total - left.length) + '/' + total;
    $('pg-fill').style.width = (total ? ((total - left.length) / total) * 100 : 0) + '%';
    $('b-undo').disabled = history.length === 0;

    // El mazo se destapa ANTES de dibujar: `noteToggle` mide si la descripción
    // entra recortada, y sobre un `hidden` todas las alturas dan cero.
    var finished = left.length === 0;
    deckEl.hidden = finished;
    deckEl.innerHTML = '';
    // Sólo las tres de arriba viven en el DOM: el mazo son 272 lugares. Se
    // pintan al revés para que la de más abajo quede primera y la top última.
    var visible = left.slice(0, 3);
    for (var i = visible.length - 1; i >= 0; i--) deckEl.appendChild(buildCard(visible[i], i));
    var top = deckEl.querySelector('.card.top');
    if (top) {
      drag(top);
      noteToggle(top);
      var back = top.querySelector('.media-back');
      if (back) back.addEventListener('click', function () { top.classList.remove('playing'); });
      // El embed pesa medio mega: se monta un tick después de que la card ya
      // está en pantalla, así el swipe que la trajo no se traba cargando IG.
      (function (card, place) {
        setTimeout(function () { if (card.isConnected) mountMedia(card, place); }, 90);
      })(top, visible[0]);
    }

    $('done').hidden = !finished;
    $('acts').hidden = false;
    $('b-no').disabled = $('b-si').disabled = $('b-star').disabled = finished;
    if (finished) tally(total);
  }

  function tally(total) {
    var n = { si: 0, no: 0, star: 0 };
    pool().forEach(function (p) { if (votes[p.id]) n[votes[p.id]]++; });
    $('done-lead').textContent = total
      ? 'Votaste ' + total + (city === 'todo' ? ' actividades.' : ' de ' + city + '.')
      : 'No hay nada para votar acá.';
    $('done-tally').innerHTML = total ? '' +
      '<div class="dt dt-star"><span class="dt-n">' + n.star + '</span><span class="dt-l">Re</span></div>' +
      '<div class="dt dt-si"><span class="dt-n">' + n.si + '</span><span class="dt-l">Sí</span></div>' +
      '<div class="dt dt-no"><span class="dt-n">' + n.no + '</span><span class="dt-l">Paso</span></div>' : '';
    $('done-again').hidden = history.length === 0;
  }

  function cities() {
    var counts = { todo: PLACES.length };
    PLACES.forEach(function (p) { counts[p.city] = (counts[p.city] || 0) + 1; });
    var keys = ['todo', 'Tokio', 'Kioto', 'Osaka', 'Otros'].filter(function (k) { return counts[k]; });
    $('cities').innerHTML = keys.map(function (k) {
      return '<button type="button" class="city' + (k === city ? ' on' : '') + '" data-city="' + esc(k) + '">' +
        (k === 'todo' ? 'Todo' : esc(k)) + '<b>' + counts[k] + '</b></button>';
    }).join('');
    $('cities').querySelectorAll('.city').forEach(function (b) {
      b.addEventListener('click', function () {
        city = b.dataset.city;
        // La ciudad va en la URL: el link filtrado se puede compartir y volver.
        var u = new URLSearchParams(location.search);
        if (city === 'todo') u.delete('city'); else u.set('city', city);
        history_replace(u);
        cities(); render();
      });
    });
  }
  function history_replace(u) {
    window.history.replaceState(null, '', location.pathname + '?' + u.toString());
  }

  /* ------------------------------------------------------------- gestos */

  var THRESH = 88, UP_THRESH = 110;

  function vote(vt) {
    var left = queueLeft();
    if (!left.length) return;
    var p = left[0];
    votes[p.id] = vt;
    var at = history.indexOf(p.id);
    if (at >= 0) history.splice(at, 1);
    history.push(p.id);
    record(p.id, vt);
    var card = deckEl.querySelector('.card.top');
    if (card) fly(card, vt, render);
    else render();
  }

  function fly(card, vt, done) {
    card.classList.remove('top');
    card.classList.add('behind');
    var dx = vt === 'si' ? 1 : (vt === 'no' ? -1 : 0);
    var dy = vt === 'star' ? -1 : 0;
    card.style.transition = 'transform 0.32s cubic-bezier(.3,.1,.3,1), opacity 0.32s';
    card.style.transform = 'translate(' + (dx * window.innerWidth) + 'px,' +
      (dy * window.innerHeight * 0.9) + 'px) rotate(' + (dx * 22) + 'deg)';
    card.style.opacity = '0';
    var end = false;
    var finish = function () { if (end) return; end = true; done(); };
    card.addEventListener('transitionend', finish, { once: true });
    setTimeout(finish, 360);
  }

  function drag(card) {
    var sx = 0, sy = 0, dx = 0, dy = 0, ly = 0, on = false, fromShield = false, scroller = null;
    var si = card.querySelector('.stamp-si'), no = card.querySelector('.stamp-no'),
        st = card.querySelector('.stamp-star');

    // Una descripción abierta que no entra en la card se scrollea con el dedo,
    // y ese arrastre no puede ser un voto. No alcanza con `touch-action` en el
    // párrafo: la card entera es `touch-action: none` y eso se hereda, así que
    // el scroll lo movemos a mano acá. El resto de la card sigue swipeando.
    function scrollableNote(t) {
      var n = t.closest && t.closest('.card-note.open');
      return (n && n.scrollHeight > n.clientHeight + 2) ? n : null;
    }

    card.addEventListener('pointerdown', function (e) {
      // Los links, el "más" y el botón de volver al mazo se tocan, no se arrastran.
      if (e.target.closest('a, .media-back, .note-more')) return;
      fromShield = !!e.target.closest('.media-shield');
      scroller = scrollableNote(e.target);
      on = true; sx = e.clientX; sy = ly = e.clientY; dx = dy = 0;
      card.setPointerCapture(e.pointerId);
      card.style.transition = 'none';
    });

    card.addEventListener('pointermove', function (e) {
      if (!on) return;
      if (scroller) { scroller.scrollTop -= e.clientY - ly; ly = e.clientY; return; }
      dx = e.clientX - sx; dy = e.clientY - sy;
      card.style.transform = 'translate(' + dx + 'px,' + dy + 'px) rotate(' + (dx / 18) + 'deg)';
      // El gesto vertical sólo cuenta si es claramente vertical: si no,
      // cualquier swipe en diagonal terminaría poniendo estrellas sin querer.
      var up = dy < -30 && Math.abs(dy) > Math.abs(dx) * 1.4;
      st.style.opacity = up ? Math.min(1, -dy / UP_THRESH) : 0;
      si.style.opacity = (!up && dx > 0) ? Math.min(1, dx / THRESH) : 0;
      no.style.opacity = (!up && dx < 0) ? Math.min(1, -dx / THRESH) : 0;
    });

    var release = function (e) {
      if (!on) return;
      on = false;
      try { card.releasePointerCapture(e.pointerId); } catch (_) {}
      if (scroller) { scroller = null; return; }
      var up = dy < -UP_THRESH && Math.abs(dy) > Math.abs(dx) * 1.4;
      if (up) return vote('star');
      if (dx > THRESH) return vote('si');
      if (dx < -THRESH) return vote('no');
      card.style.transition = 'transform 0.22s cubic-bezier(.3,1.2,.5,1)';
      card.style.transform = '';
      si.style.opacity = no.style.opacity = st.style.opacity = 0;
      // Toque quieto sobre el escudo: se lo saca del medio y el reel pasa a
      // ser del dedo (play, sonido, carrusel). El "↔ deslizar" lo devuelve.
      if (fromShield && Math.abs(dx) < 8 && Math.abs(dy) < 8) card.classList.add('playing');
    };
    card.addEventListener('pointerup', release);
    card.addEventListener('pointercancel', release);
  }

  function undo() {
    if (!history.length) return;
    var id = history.pop();
    delete votes[id];
    record(id, null);
    render();
  }

  /* -------------------------------------------------------------- arranque */

  function gate(msg) {
    $('app').hidden = true;
    $('gate').hidden = false;
    if (msg) $('gate-msg').textContent = msg;
  }

  function start(user, serverVotes, serverHistory) {
    me = user;
    votes = serverVotes || {};
    // La pila de deshacer se reconstruye con el orden en que el servidor
    // registró cada voto: si no, cerrar la app y volver dejaría el último
    // swipe sin manera de arrepentirse.
    history = (serverHistory || []).slice();
    // Lo que quedó en la cola manda sobre lo que devolvió el servidor: son
    // votos posteriores que todavía no llegaron.
    queue.forEach(function (e) {
      var at = history.indexOf(e.place_id);
      if (at >= 0) history.splice(at, 1);
      if (e.vote) { votes[e.place_id] = e.vote; history.push(e.place_id); }
      else delete votes[e.place_id];
    });
    order = seededOrder(PLACES, token);
    $('gate').hidden = true;
    $('app').hidden = false;
    $('who').textContent = 'Hola, ' + me.name;
    deckEl = $('deck');
    cities();
    render();
    flush();

    $('b-si').addEventListener('click', function () { vote('si'); });
    $('b-no').addEventListener('click', function () { vote('no'); });
    $('b-star').addEventListener('click', function () { vote('star'); });
    $('b-undo').addEventListener('click', undo);
    $('done-again').addEventListener('click', undo);

    document.addEventListener('keydown', function (e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); vote('si'); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); vote('no'); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); vote('star'); }
      else if (e.key === 'z' || e.key === 'Z' || e.key === 'Backspace') { e.preventDefault(); undo(); }
    });

    // Girar el teléfono cambia el alto de la card, y el recorte del embed está
    // calculado sobre ese alto: sin esto el reel queda corrido hasta el
    // siguiente swipe.
    window.addEventListener('resize', function () {
      var f = deckEl.querySelector('.card.top .media-ig');
      if (f) fitIG(f, f.closest('.card'));
    });

    window.addEventListener('online', flush);
    setInterval(flush, 15000);
  }

  loadQueue();
  if (!token) return gate('Pedile tu link a Martín.');
  if (!PLACES.length) return gate('No pude cargar las actividades. Recargá en un rato.');

  fetch(API + '/votes?u=' + encodeURIComponent(token))
    .then(function (r) {
      if (r.status === 403) { gate('Ese link no es válido. Pedile el tuyo a Martín.'); return null; }
      if (!r.ok) throw new Error('http ' + r.status);
      return r.json();
    })
    .then(function (d) { if (d) start(d.user, d.votes, d.history); })
    .catch(function () { gate('No me pude conectar. Probá de nuevo en un minuto.'); });
})();
