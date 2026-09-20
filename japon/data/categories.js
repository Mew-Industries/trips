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
  order: ['comida', 'bar-noche', 'parque', 'templo-museo', 'arte', 'arquitectura', 'landmark', 'actividad', 'taller', 'compras', 'barrio', 'otro'],
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
  // Segunda pasada (task 693): clubes y bares que seguían cayendo en
  // `actividad` por el default de `ocio`. El corte: si el plan es tomar algo,
  // bailar o ver música de noche, va acá; el head spa (Wayanpuri), los cat
  // cafes y los arcades se quedan en `actividad`.
  'ATOM Tokyo': 'bar-noche',                    // club foreigner-friendly
  'Baia': 'bar-noche',                          // club de tres niveles
  'Bar Centifolia': 'bar-noche',                // el mismo cocktail bar que CENTIFOLIA, cargado dos veces
  'Chokuritsuenjin (直立猿人)': 'bar-noche',      // jazz kissa era Showa, vinilos y tragos
  'Club Harlem': 'bar-noche',                   // club en Shinjuku
  'Golden Gai': 'bar-noche',                    // el callejón de bares de Kabukicho
  'LIVE HAUS': 'bar-noche',                     // live house de Shimokitazawa, rock y DJs de madrugada
  'Mitsuki': 'bar-noche',                       // sótano de neón en Shibuya, música y baile
  'Neverland Tokyo': 'bar-noche',               // club en Shinjuku
  'Nonbei Yokocho': 'bar-noche',                // callejón de bares junto a las vías en Shibuya
  'Oh-Jo Building': 'bar-noche',                // el mismo castillo-fiesta que OHJO BLDG, cargado dos veces
  'Rokusan Angel': 'bar-noche',                 // cabaret/girls bar con show y barra libre
  'T2 Tokyo': 'bar-noche',                      // club EDM/pop abierto hasta el amanecer
  'Vent': 'bar-noche',                          // el mismo club techno que VENT Tokyo, cargado dos veces
  'WARP Shinjuku': 'bar-noche',                 // club temática alien, varios pisos
  // Tercera pasada (task 695): bares que venían como `comida` o `miradores`.
  'Beer Hall Lion Ginza': 'bar-noche',          // la cervecería de 1934: el plan es la birra, no la carta
  'Ebisu Dagashi Bar (えびす駄菓子バー)': 'bar-noche',   // bar de golosinas retro, se va a tomar
  'Le Chamber (bar de cócteles)': 'bar-noche',  // speakeasy de Gangnam
  'Ohjo Building': 'bar-noche',                 // tercera grafía del mismo OHJO BLDG / Oh-Jo Building
  'Omoide Yokocho': 'bar-noche',                // callejón de izakayas: unifica las dos entradas (Shinjuku y última cena), como Nonbei y Golden Gai

  // --- Landmarks: hitos donde el plan es verlo y la foto ---
  'Shibuya Crossing': 'landmark',               // el cruce peatonal más famoso de Tokio
  'Hachiko Statue': 'landmark',                 // la estatua-punto de encuentro
  'Cartel de Glico (Glico Running Man), Dotonbori': 'landmark',   // el cartel del corredor sobre Ebisubashi
  'Daikoku PA': 'landmark',                     // la parada de autos meca de la cultura JDM
  'Shibuya Scramble': 'landmark',               // el mismo cruce que "Shibuya Crossing", cargado dos veces
  'Rainbow Bridge': 'landmark',                 // el puente se va a VER (desde Odaiba, de noche), no a cruzarlo

  // --- Arte: museos de arte, galerías, land art y exhibiciones ---
  // El corte contra `templo-museo` es qué se va a ver: si es obra (cuadros,
  // esculturas, instalaciones) va acá; si es el templo, el mirador o la
  // historia del lugar, se queda allá. Los museos que no son de arte (cerveza
  // Sapporo, Nintendo, perfume de Oita, Audeum) siguen en `templo-museo`, y
  // los lugares donde el plan es el EDIFICIO (Le Corbusier, KAIT, DDP) siguen
  // en `arquitectura`.
  'teamLab Planets': 'arte',
  'teamLab Borderless': 'arte',
  'Museo Ghibli si conseguís entrada': 'arte',
  'SCAI The Bathhouse (galería)': 'arte',
  '21_21 Design Sight': 'arte',                 // museo de diseño de Issey Miyake
  'Nezu Museum': 'arte',
  'Suginami Animation Museum': 'arte',
  'Sapporo Art Museum': 'arte',
  'Moerenuma Park (parque-escultura de Isamu Noguchi)': 'arte',   // el parque ES la obra
  'Museo del Siglo XXI (21st Century Museum)': 'arte',
  'Museo del Siglo XXI': 'arte',                // el mismo lugar, cargado dos veces
  'Garden of Fine Arts Kyoto (Tadao Ando)': 'arte',
  'MIHO MUSEUM': 'arte',
  'Murou Art Forest': 'arte',                   // land art de Dani Karavan
  'Naoshima': 'arte',                           // day trip del jue 22/10 desde Kioto
  // --- Naoshima: quedan solo las tres actividades con entrada comprada. Lee
  // Ufan, Valley Gallery, las calabazas de Kusama y el Art House Project
  // salieron de index.html el 3/9, cuando el day trip se volvió parada con
  // itinerario cerrado (Chichu → Benesse → Minamidera); sus overrides se
  // borraron con ellos (task 693). ---
  'Chichu Art Museum': 'arte',
  'Benesse House Museum': 'arte',
  'Minamidera (Art House Project, James Turrell)': 'arte',
  '国境を越えて・祈り': 'arte',                    // escultura de Kan Yasuda en Awaji Yumebutai
  'Aomori Museum of Art': 'arte',
  'Museo al Aire Libre de Hakone (Hakone Open-Air Museum)': 'arte',
  'Museo de Arte Leeum': 'arte',
  // Tercera pasada (task 695): museos de arte de reels que el legacy
  // `museos → templo-museo` dejaba bajo ⛩️.
  '21st Century Museum of Contemporary Art': 'arte',   // el mismo museo de Kanazawa que "Museo del Siglo XXI", cargado dos veces
  'Teshima Art Museum': 'arte',                 // la gota de Nishizawa: la obra y el edificio son lo mismo
  'Towada Art Center': 'arte',                  // arte contemporáneo, sedes de Nishizawa/Kusama
  'Kyocera Museum of Art': 'arte',              // el museo de arte municipal de Kioto
  'Hiroshi Senju Museum': 'arte',               // las cascadas de Senju en Karuizawa
  'Hachinohe Art Museum': 'arte',               // museo de arte de Hachinohe
  'Taro Okamoto Memorial Museum': 'arte',       // la casa-atelier del artista en Aoyama, hoy museo
  'Karimoku Research Center': 'arte',           // galería/archivo de diseño de la mueblera Karimoku
  'The National Art Center': 'arte',            // el de Kurokawa en Roppongi, sin colección propia: puras muestras
  'The National Art Center Tokyo': 'arte',      // el mismo, cargado dos veces (venía como `arquitectura`)

  // --- Arquitectura: guardados por el EDIFICIO, no por lo que pasa adentro ---
  'KAIT Workshop & Plaza': 'arquitectura',      // los edificios de Ishigami en el campus KAIT
  'Keihan Uji Station': 'arquitectura',         // la estación semienterrada de hormigón
  'Kioi Seido': 'arquitectura',                 // la capilla de madera de Kioi-cho
  'Reiyukai Shakaden Temple': 'arquitectura',   // el reel lo guarda por el brutalismo, no por el culto
  'Dongdaemun Design Plaza (DDP, Zaha Hadid)': 'arquitectura',   // el plan es el edificio de Zaha

  // --- Talleres: te sentás a hacer la pieza y te la llevás ---
  // Todos venían de `ocio` → `actividad`, mezclados con clubes, onsen y parques
  // de diversiones. Lo que los junta no es el rubro (metal, vidrio, comida,
  // electrónica) sino el plan: alguien te enseña y el resultado te lo llevás.
  'Aisorashi (anillos)': 'taller',              // hacés tu propio anillo, 75-90 min
  'CHOYA Ume Studio Kyoto': 'taller',           // armás tu umeshu catando ciruelas
  'Fusion Museum (knit)': 'taller',             // tejés tu bufanda en bici-máquina
  'Ichihara Shouten (zori)': 'taller',          // sandalias zori a medida con el artesano
  'Junintoiro (senbei)': 'taller',              // horneás tus galletas senbei
  'Karaki Mokkou': 'taller',                    // te hacés tu par de ohashi de madera
  'Mod Tokyo': 'taller',                        // desarmás y customizás una Game Boy
  'Oshimaya Chochin (Namidabashi)': 'taller',   // farolitos chochin con el dueño
  'Studio J-45': 'taller',                      // soplás tu propio vaso de vidrio
  'studio NIN': 'taller',                       // forjás shuriken/kunai o una hoja
  'Unimocc Art Gallery Café': 'taller',         // pintás tu torta-lienzo
  // Tercera pasada (task 695): el plan es HACER la prenda, mismo criterio que
  // Aisorashi. ("KAIT Workshop" sigue siendo el edificio de Ishigami — está en
  // `arquitectura` —, y Taro Okamoto, la casa-atelier ya museo, en `arte`.)
  'Betty Smith Ebisu Factory': 'taller',        // armás tu par de jeans en la fábrica
  'UNIQLO UTme! (Harajuku)': 'taller',          // diseñás y estampás tu remera en el momento
  // Mirados y dejados donde estaban: Oita Fragrance Museum y Suginami Animation
  // Museum son museos que ADEMÁS tienen workshop (el plan es la colección);
  // Honjo Life Safety Learning Center es un simulador guiado, no salís con nada
  // hecho.

  // --- Reels que el legacy dejaba mal clasificados ---
  'Nintendo Museum': 'templo-museo',
  'Himeji Castle': 'templo-museo',
  'Underground Discharge Channel (G-Cans)': 'actividad',   // se entra solo con tour
  'Hozugawa River Boat Ride': 'actividad',
  'Goyomatsu Limestone Cave': 'actividad',                 // el plan es el monorriel
  'Yanagawa': 'barrio',
  'Round 1 Umeda': 'actividad',
  'Ueno Zoo': 'actividad',                      // zoológico con pandas; estaba en `otros` de los reels
  // Tercera pasada (task 695):
  'Tokyo Rinkai Disaster Prevention Park': 'actividad',   // simulador de terremoto guiado, mismo criterio que Honjo

  // --- Actividades del itinerario (index.html) ---
  'Dotonbori (luces, takoyaki, kushikatsu)': 'barrio',
  'Check-in del night tour — café TAIRA (Awesome Tours)': 'actividad',   // punto de encuentro del tour comprado de Okunoin
  // Tercera pasada (task 695):
  'Genbikei (rápidos + "dango volador" por el cable)': 'parque',   // la garganta con los rápidos; el dango es el snack, no el plan
  'Harajuku': 'barrio',                         // unifica las dos entradas (llegada `barrios` / pre-vuelo `compras`)
  'GENTLE MONSTER (flagship)': 'compras',       // flagship de anteojos con puesta escenográfica, pero se va a comprar
  'HAUS NOWHERE Seoul': 'compras',              // la tienda-experiencia de GENTLE MONSTER en Seúl, mismo criterio

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
  'Aomori': 'barrio',
  'Ginzan Onsen': 'actividad',
  'Shirakawa': 'otro',                     // guardado ambiguo, geocodificado en Tokio

  // --- Day trips ---
  'Kamakura': 'templo-museo',
  'Yokohama': 'barrio',
  'KAIT広場 + Kanagawa Inst. of Technology': 'arquitectura',   // el day trip es por los edificios de Ishigami (task 695)
  'Fukazawa Tiny Museum': 'templo-museo',
  'Kazenooka Jumokuso Cemetery': 'arquitectura',   // el cementerio-paisaje de Fumihiko Maki (task 695)
  'Canal subterráneo de descarga (G-Cans)': 'actividad',
  'Nonohana': 'otro',
  'Matsushima': 'parque',
  'Yamadera': 'templo-museo',
  'Otaru': 'barrio',
  'Echizen Daibutsu': 'templo-museo',
  'Nara': 'templo-museo',
  'Murou-ji + Hasedera': 'templo-museo',
  'Uji': 'templo-museo',
  'Monte Hiei (Enryaku-ji)': 'templo-museo',
  'Kobe': 'barrio',
  'PL Tower (Great Peace Prayer Tower)': 'arquitectura',   // la torre expresionista; su duplicado "PL Peace Tower" ya estaba acá (task 695)
  'Dazaifu': 'templo-museo',
  'Gyeongju': 'templo-museo',
  'DMZ Tour': 'actividad',
  'Chureito Pagoda': 'templo-museo',
};
