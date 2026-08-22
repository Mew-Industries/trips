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
  order: ['comida', 'bar-noche', 'parque', 'templo-museo', 'arquitectura', 'actividad', 'compras', 'barrio', 'otro'],
  meta: {
    'comida':       { label: 'Comida',     icon: '🍜',  color: '#D8452F' },
    'bar-noche':    { label: 'Bar/noche',  icon: '🍸',  color: '#6D4AA8' },
    'parque':       { label: 'Parques',    icon: '🌳',  color: '#3E9B4F' },
    'templo-museo': { label: 'Templos y museos', icon: '⛩️', color: '#C9891C' },
    'arquitectura': { label: 'Arquitectura', icon: '🏛️', color: '#237C78' },
    'actividad':    { label: 'Actividades', icon: '🎢', color: '#0F8FA8' },
    'compras':      { label: 'Compras',    icon: '🛍️', color: '#D4408C' },
    'barrio':       { label: 'Barrios',    icon: '🏙️', color: '#3B6FD4' },
    'otro':         { label: 'Otros',      icon: '✨',  color: '#8C8C8C' },
  },
};

// Categorías viejas (las que emiten el pipeline de reels y el array de
// actividades de index.html) → taxonomía nueva.
window.PLACE_CAT_LEGACY = {
  comida: 'comida',
  templos: 'templo-museo',
  museos: 'templo-museo',
  arquitectura: 'arquitectura',
  miradores: 'templo-museo',   // arquitectura y miradores entran acá
  parques: 'parque',
  barrios: 'barrio',
  compras: 'compras',
  onsen: 'actividad',
  ocio: 'actividad',           // el default de `ocio`; los bares/clubes van en OVERRIDES
  otros: 'otro',
};

// Categoría explícita por lugar. Gana sobre LEGACY.
window.PLACE_CAT_OVERRIDES = {
  // --- Bares, clubes y music bars (venían como `ocio`/`comida` en los reels) ---
  'A10 (bar secreto)': 'bar-noche',
  'BAR PIANO': 'bar-noche',
  'CENTIFOLIA': 'bar-noche',
  'CIRCUS TOKYO': 'bar-noche',
  'clubasia': 'bar-noche',
  'CUBE Roppongi': 'bar-noche',
  'Decabar': 'bar-noche',
  'ENTER Shibuya': 'bar-noche',
  'Fujiki Shoten': 'bar-noche',        // sake self-serve, es plan de tragos
  'HVEN': 'bar-noche',
  'Janai Coffee': 'bar-noche',         // café de día, bar escondido de noche
  'MIDNIGHT EAST': 'bar-noche',
  'No Room For Squares': 'bar-noche',
  'NUMM': 'bar-noche',
  'OHJO BLDG': 'bar-noche',
  'R Lounge': 'bar-noche',
  'SALOON Daikanyama': 'bar-noche',
  'solfa': 'bar-noche',
  'SPACE Tokyo': 'bar-noche',
  'SPREAD': 'bar-noche',
  'The Liquor Museum (FamilyMart)': 'bar-noche',
  'TRAFFIC Tokyo': 'bar-noche',
  'VENT Tokyo': 'bar-noche',
  'WOMB': 'bar-noche',
  'WWW / WWW X': 'bar-noche',
  'ZEROTOKYO': 'bar-noche',

  // --- Reels que el legacy dejaba mal clasificados ---
  'Nintendo Museum': 'templo-museo',
  'Himeji Castle': 'templo-museo',
  'Underground Discharge Channel (G-Cans)': 'actividad',   // se entra solo con tour
  'Hozugawa River Boat Ride': 'actividad',
  'Goyomatsu Limestone Cave': 'actividad',                 // el plan es el monorriel
  'Yanagawa': 'barrio',
  'Round 1 Umeda': 'actividad',

  // --- Actividades del itinerario (index.html) ---
  'Dotonbori (luces, takoyaki, kushikatsu)': 'barrio',

  // --- Guardados de Maps sin destino asignado (orphanPlaces) ---
  'Yakushima National Park': 'parque',
  'Tashirojima': 'parque',                 // la isla de los gatos
  'Ōuchi-juku': 'barrio',
  'Goshikinuma Ponds': 'parque',
  'Geibikei Gorge': 'parque',
  'Takamatsu Pond': 'parque',
  'Castillo de Aizuwakamatsu': 'templo-museo',
  'Parque Chansey': 'parque',
  'Narai-juku': 'barrio',
  'Kotakuji': 'templo-museo',
  'Oirase keiryū Gorge': 'parque',
  'Aomori Museum of Art': 'templo-museo',
  'Aomori': 'barrio',
  'Ginzan Onsen': 'actividad',
  'Chichu Art Museum': 'templo-museo',
  'Benesse House Oval': 'templo-museo',
  'Shirakawa': 'otro',                     // guardado ambiguo, geocodificado en Tokio

  // --- Day trips ---
  'Kamakura': 'templo-museo',
  'Yokohama': 'barrio',
  'KAIT広場 + Kanagawa Inst. of Technology': 'templo-museo',
  'Fukazawa Tiny Museum': 'templo-museo',
  'Kazenooka Jumokuso Cemetery': 'templo-museo',
  'Canal subterráneo de descarga (G-Cans)': 'actividad',
  'Nonohana': 'otro',
  'Matsushima': 'parque',
  'Yamadera': 'templo-museo',
  'Otaru': 'barrio',
  'Echizen Daibutsu': 'templo-museo',
  'Nara': 'templo-museo',
  'Murou-ji + Hasedera': 'templo-museo',
  'MIHO MUSEUM': 'templo-museo',
  'Uji': 'templo-museo',
  'Monte Hiei (Enryaku-ji)': 'templo-museo',
  'Naoshima': 'templo-museo',
  'Kobe': 'barrio',
  'Murou Art Forest': 'templo-museo',
  'PL Tower (Great Peace Prayer Tower)': 'templo-museo',
  'Dazaifu': 'templo-museo',
  'Gyeongju': 'templo-museo',
  'DMZ Tour': 'actividad',
  'Chureito Pagoda': 'templo-museo',
};
