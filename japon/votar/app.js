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
  function placeId(name) {
    return 'p-' + (catKey(String(name || '').split('(')[0]).replace(/\s+/g, '-') || 'sin-nombre');
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

  var FRAMES = window.VOTAR_FRAMES || {};
  var PLACES = (window.SOURCE_THINGS || []).map(function (t) {
    var reel = (t.sources || []).filter(function (s) { return s.type === 'instagram_reel'; })[0];
    return {
      id: placeId(t.name),
      name: t.name,
      note: t.note || '',
      area: t.area || '',
      city: cityOf(t.area),
      hood: hoodOf(t.area) || placeOf(t.area),
      cat: catOf(t.name, t.cat),
      img: FRAMES[placeId(t.name)] || null,
      reel: reel ? reel.url : null,
      maps: 'https://www.google.com/maps/search/?api=1&query=' +
        encodeURIComponent(t.name + (t.area ? ' ' + t.area : ''))
    };
  });
  // Un lugar puede aparecer en dos reels: se vota una sola vez.
  var seen = {};
  PLACES = PLACES.filter(function (p) { return seen[p.id] ? false : (seen[p.id] = true); });

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
     (y dos personas no arrancan las 221 por el mismo lado). */
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

  function cardHTML(p) {
    var meta = TAX.meta[p.cat] || TAX.meta.otro || { label: 'Otros', icon: '✨', color: '#8C8C8C' };
    var links = [];
    if (p.reel) links.push('<a href="' + esc(p.reel) + '" target="_blank" rel="noopener">Ver el reel →</a>');
    links.push('<a href="' + esc(p.maps) + '" target="_blank" rel="noopener">Maps →</a>');
    return '' +
      (p.img ? '<img class="card-img" src="' + esc(p.img) + '" alt="" draggable="false">'
             : '<span class="card-glyph">' + meta.icon + '</span>') +
      '<span class="stamp stamp-si">Sí</span>' +
      '<span class="stamp stamp-no">Paso</span>' +
      '<span class="stamp stamp-star">★ Re</span>' +
      '<div class="card-body">' +
        '<div class="card-tags">' +
          '<span class="tag" style="--tc:' + meta.color + '">' + meta.icon + ' ' + esc(meta.label) + '</span>' +
          (p.hood ? '<span class="tag tag-hood">' + esc(p.hood) + '</span>' : '') +
        '</div>' +
        '<h2 class="card-name">' + esc(p.name) + '</h2>' +
        (p.note ? '<p class="card-note">' + esc(p.note) + '</p>' : '') +
        '<div class="card-links">' + links.join('') + '</div>' +
      '</div>';
  }

  function buildCard(p, depth) {
    var meta = TAX.meta[p.cat] || TAX.meta.otro;
    var el = document.createElement('article');
    el.className = 'card ' + (p.img ? 'has-img' : 'no-img') + (depth ? ' behind' : ' top');
    el.dataset.depth = depth;
    el.dataset.place = p.id;
    if (!p.img) {
      el.style.setProperty('--wash-a', meta.color + '26');
      el.style.setProperty('--wash-b', meta.color + '0D');
    }
    el.innerHTML = cardHTML(p);
    return el;
  }

  function render() {
    var left = queueLeft();
    var total = pool().length;
    $('pg-count').textContent = (total - left.length) + '/' + total;
    $('pg-fill').style.width = (total ? ((total - left.length) / total) * 100 : 0) + '%';
    $('b-undo').disabled = history.length === 0;

    deckEl.innerHTML = '';
    // Sólo las tres de arriba viven en el DOM: el mazo son 221 lugares. Se
    // pintan al revés para que la de más abajo quede primera y la top última.
    var visible = left.slice(0, 3);
    for (var i = visible.length - 1; i >= 0; i--) deckEl.appendChild(buildCard(visible[i], i));
    var top = deckEl.querySelector('.card.top');
    if (top) drag(top);

    var finished = left.length === 0;
    deckEl.hidden = finished;
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
    var sx = 0, sy = 0, dx = 0, dy = 0, on = false;
    var si = card.querySelector('.stamp-si'), no = card.querySelector('.stamp-no'),
        st = card.querySelector('.stamp-star');

    card.addEventListener('pointerdown', function (e) {
      // Los links de la card se tocan, no se arrastran.
      if (e.target.closest('a')) return;
      on = true; sx = e.clientX; sy = e.clientY; dx = dy = 0;
      card.setPointerCapture(e.pointerId);
      card.style.transition = 'none';
    });

    card.addEventListener('pointermove', function (e) {
      if (!on) return;
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
      var up = dy < -UP_THRESH && Math.abs(dy) > Math.abs(dx) * 1.4;
      if (up) return vote('star');
      if (dx > THRESH) return vote('si');
      if (dx < -THRESH) return vote('no');
      card.style.transition = 'transform 0.22s cubic-bezier(.3,1.2,.5,1)';
      card.style.transform = '';
      si.style.opacity = no.style.opacity = st.style.opacity = 0;
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
