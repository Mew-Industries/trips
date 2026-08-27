/* media-reel.js — qué reel puede ser el FONDO de la card de un lugar (task 559).
 *
 * Vive aparte de app.js porque lo usan dos lados: la app, para decidir qué
 * embebe cada card, y `japon/scripts/check_reels_mapping.js`, que verifica el
 * mapeo entero sin browser. Una segunda implementación en el check sería una
 * copia que se desincroniza justo cuando importa.
 *
 * El bug que originó esto (Zava, 2026-08-26): la infografía "Must-Visit Places
 * in TOKYO" de fondo en la card del Cat Cafe MOCHA y en la de Yanaka Ginza. El
 * post nombra a los dos —o sea que como FUENTE está bien— pero es una imagen
 * fija de treinta lugares: no muestra a ninguno en particular. Son dos
 * preguntas distintas y `data/reels.js` responde las dos por separado:
 *
 *   covers    — de qué lugares habla el post. Que un roundup sea la fuente de
 *               los veinte que nombra es correcto y no se toca.
 *   showsEach — si su media muestra a cada uno de ellos. Un video (`clips`) los
 *               recorre; una foto fija (`feed`) o un carrusel muestran UNA
 *               imagen —el embed abre siempre en la primera— y no hay manera de
 *               saber cuál de los lugares es. Un post de foto de un solo lugar
 *               sí lo muestra.
 */
(function (root) {
  'use strict';

  // El shortcode del reel es lo único que necesita el embed de Instagram. Los
  // datos traen la URL como /p/<code>/, pero /reel/ y /tv/ son lo mismo.
  function shortcode(url) {
    var m = /instagram\.com\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/.exec(url || '');
    return m ? m[1] : null;
  }

  // `SOURCE_REELS` (una lista) → índice por code, con `covers` de set para no
  // recorrerlo por cada lugar.
  function indexReels(list) {
    var out = {};
    (list || []).forEach(function (r) {
      var covers = {};
      (r.covers || []).forEach(function (id) { covers[id] = 1; });
      out[r.code] = {
        code: r.code, url: r.url, kind: r.kind, covers: covers,
        n: (r.covers || []).length, showsEach: !!r.showsEach
      };
    });
    return out;
  }

  // De las fuentes de un lugar, la que puede ser el fondo de su card: tiene que
  // hablar de ESE lugar y su media tiene que mostrarlo. Entre varias gana la más
  // específica (la que habla de menos lugares); a igual cantidad, la primera,
  // que es la más vieja y la que ya estaba puesta. Si no sirve ninguna devuelve
  // null y la card va sin reel — el mini-mapa antes que la foto de otro lugar.
  function mediaReel(id, sources, reels) {
    var best = null;
    (sources || []).forEach(function (s) {
      if (s.type && s.type !== 'instagram_reel') return;
      var r = reels[shortcode(s.url)];
      if (!r || !r.covers[id] || !r.showsEach) return;
      if (!best || r.n < best.n) best = r;
    });
    return best;
  }

  root.VOTAR_MEDIA = { shortcode: shortcode, indexReels: indexReels, mediaReel: mediaReel };
})(typeof window !== 'undefined' ? window : globalThis);
