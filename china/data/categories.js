// Taxonomía única de lugares del mapa (reels de IG + guardados de Google Maps
// + day trips). Se edita A MANO y ningún generador la pisa:
// `build_reels_js.py` sigue escribiendo su `cat` legacy en data/reels.js y el
// sync de Maps no toca index.html — el mapeo a esta taxonomía vive acá, aguas
// abajo, así que regenerar reels.js nunca resetea una categoría.
//
// Cómo recategorizar un lugar: agregarlo (o corregirlo) en OVERRIDES con su
// nombre tal cual aparece en el dato (el match ignora mayúsculas, acentos y
// puntuación). Si no está en OVERRIDES se usa LEGACY sobre su `cat` viejo, y
// si tampoco hay, cae en `otro`.
// Verificación: node scripts/check_categories.js

window.PLACE_TAXONOMY = {
  order: ['comida', 'bar-noche', 'parque', 'templo-museo', 'arte', 'arquitectura', 'landmark', 'actividad', 'taller', 'compras', 'barrio', 'otro', 'sin-identificar'],
  meta: {
    'comida':       { label: 'Comida',     icon: '🍜',  color: '#D8452F' },
    'bar-noche':    { label: 'Bar/noche',  icon: '🍸',  color: '#6D4AA8' },
    'parque':       { label: 'Parques',    icon: '🌳',  color: '#3E9B4F' },
    'templo-museo': { label: 'Templos y museos', icon: '⛩️', color: '#C9891C' },
    // Arte visual y exhibiciones (museos de arte, galerías, teamLab, land art).
    // El violeta es el hueco de tono más grande que quedaba, entre el índigo de
    // bar-noche (#6D4AA8) y el rosa de compras (#D4408C); va más saturado que
    // los dos para que a 9px (los puntos del filtro y los pines) no se confunda
    // con el violeta apagado de bar-noche.
    'arte':         { label: 'Arte',       icon: '🎨',  color: '#A733B5' },
    'arquitectura': { label: 'Arquitectura', icon: '🏛️', color: '#237C78' },
    // Hitos icónicos donde el plan es ir a VERLO (y la foto): un cruce, una
    // estatua, un cartel, la meca JDM de Daikoku. El corte contra
    // `arquitectura` es que acá el edificio no importa —no siempre lo hay— y
    // contra `actividad`, que no se entra a ningún lado. El marrón es el color
    // de la señalética vial de atractivos turísticos en medio mundo. Para
    // `taller` el marrón se había descartado por pegarse al ocre de
    // templo-museo, pero este va mucho más oscuro (L 36 contra L 62 del ocre):
    // ΔE2000 22.1 contra el par más cercano (el rojo de comida) y ≥ 25 contra
    // taller, templo-museo y las demás —tips incluido—, bien arriba del piso
    // de ~15. Contraste 7.4:1 sobre blanco, sobra para el punto de 9px del
    // chip y el aro del pin.
    'landmark':     { label: 'Landmarks',  icon: '🗼', color: '#7A4A21' },
    'actividad':    { label: 'Actividades', icon: '🎢', color: '#0F8FA8' },
    // Talleres: el plan del lugar es APRENDER o HACER algo con instrucción y
    // volver con la pieza (forjar un shuriken, soplar un vaso, tejer una
    // bufanda, hornear senbei). El corte contra `actividad` es quién hace: acá
    // lo hacés vos, allá se visita, se pasea o te lo dan hecho (parque de
    // diversiones, onsen, karting, tour). Un museo que además ofrece un
    // workshop sigue siendo museo — el plan de fondo es la colección.
    // El oliva es el único hueco de tono que quedaba. En Lab la rueda ya estaba
    // ocupada de 144° (verde de parques) hasta 87° (mostaza de tips) dando la
    // vuelta larga; este cae en 109°, en el medio de esa franja vacía, a ΔE2000
    // ≥ 20 de las diez categorías del mapa — casi el doble del par más cerrado
    // que ya convivía (bar-noche vs arte, ΔE 11.6). Va oscuro a propósito
    // (L 44, 5.6:1 contra blanco): el color se ve en un punto de 9px en el chip
    // y detrás del número blanco del recorrido del día, los dos sobre el mapa
    // claro. El marrón —el otro candidato obvio para "taller"— se descartó:
    // queda pegado al ocre de templo-museo, que son 93 pines.
    'taller':       { label: 'Talleres',   icon: '🛠️', color: '#646E0E' },
    'compras':      { label: 'Compras',    icon: '🛍️', color: '#D4408C' },
    'barrio':       { label: 'Barrios',    icon: '🏙️', color: '#3B6FD4' },
    'otro':         { label: 'Otros',      icon: '✨',  color: '#8C8C8C' },
    // Guardados que no se sabe QUÉ son (un pin de Maps sin nota ni nombre que
    // diga nada): cola de trabajo para Martín, no basura — por eso SÍ va en
    // `order`, para que tenga chip filtrable y se vea en la leyenda. Se vacía
    // moviendo cada lugar a su categoría real cuando se identifica. El gris
    // claro dice "todavía sin color asignado" sin pisar el gris medio de
    // `otro`: ΔE2000 16.4 contra #8C8C8C —su par más cercano en toda la
    // paleta, arriba del piso de ~15— y ≥ 16 contra el resto. El contraste
    // sobre blanco es bajo (1.7:1) a propósito de que se lea como placeholder;
    // el ❓ dentro del pin es lo que carga la identificación.
    'sin-identificar': { label: 'Sin identificar', icon: '❓', color: '#C4C4C4' },
    // Consejos del viaje (reels sin lugar concreto: JR Pass, valija, eSIM,
    // etiqueta). Está en `meta` pero NO en `order` A PROPÓSITO: un tip no tiene
    // coordenada, así que nunca es un pin —y `order` es lo que arma los filtros
    // del mapa, donde un chip "Tips" no prendería ni apagaría nada—. Le da
    // etiqueta y color a quien los liste (data/reels.js → window.SOURCE_TIPS).
    'tips':         { label: 'Tips',       icon: '💡', color: '#B08B00' },
  },
};

// Categorías viejas (las que emiten el pipeline de reels y el array de
// actividades de index.html) → taxonomía nueva.
window.PLACE_CAT_LEGACY = {
  comida: 'comida',
  templos: 'templo-museo',
  museos: 'templo-museo',
  arquitectura: 'arquitectura',
  miradores: 'landmark',       // torres y decks de observación: el plan es la vista/el hito (task 695)
  parques: 'parque',
  barrios: 'barrio',
  compras: 'compras',
  onsen: 'actividad',
  ocio: 'actividad',           // el default de `ocio`; los bares/clubes van en OVERRIDES
  otros: 'otro',
  tips: 'tips',                // reels sin lugar (window.SOURCE_TIPS), sin pin
};

// Categoría explícita por lugar. Gana sobre LEGACY. En China arranca vacío:
// las actividades de la 704 vienen con `cat` legacy y el mapeo de arriba alcanza.
// Para recategorizar un lugar puntual, sumarlo acá con su nombre tal cual aparece
// en el dato (el match ignora mayúsculas, acentos y puntuación).
window.PLACE_CAT_OVERRIDES = {};
