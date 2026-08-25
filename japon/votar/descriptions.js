/* descriptions.js — texto largo de cada lugar del mazo (task 548, ronda 3).
 *
 * Archivo CURADO A MANO, aguas abajo de los generadores: `data/reels.js` y
 * `data/categories.js` los reescribe el pipeline de Instagram cada vez que
 * entran reels nuevos, éste no lo toca nadie automáticamente. Por eso vive
 * acá adentro de `votar/` y no en `data/`.
 *
 * Clave: el `place_id` que arma `app.js` (`p-<nombre normalizado>`). Si un
 * lugar no está acá, la card cae a la `note` de `reels.js`, que es una línea.
 *
 * Qué va en cada texto: qué es, por qué vale la pena y —cuando se sabe— el
 * dato práctico que cambia la decisión (si hay que reservar, si la temporada
 * no da, cuánto lleva). Lo que no se sabe no se inventa: antes que un horario
 * alucinado va una línea de menos.
 *
 * Cobertura: los 121 lugares del mazo de hoy, y de yapa los 64 de `compras` y
 * `otro`, que estaban escritos cuando la ronda 4 los sacó. No se borraron: si
 * mañana alguna vuelve al mazo, vuelve con su texto puesto. `check_votar.js`
 * falla si un lugar del mazo no tiene el suyo.
 */
window.VOTAR_DESCS = {

  'p-21-21-design-sight': 'Museo chico de diseño que dirigió Issey Miyake, dentro del complejo Tokyo Midtown. El edificio es de Tadao Ando y está casi todo enterrado: de afuera se ven dos planchas de acero doblado que asoman del pasto como un origami. No tiene colección permanente, son dos o tres muestras temáticas por año, así que conviene mirar qué hay puesto antes de ir. Se recorre en una hora.',

  'p-21st-century-museum-of-contemporary-art': 'El museo circular de SANAA en el centro de Kanazawa: todo vidrio, sin frente ni fondo, se entra por donde caiga. La estrella es la pileta de Leandro Erlich, donde la gente camina por abajo del agua y te saluda desde el fondo. Para bajar a la pileta hace falta la entrada paga de las muestras (el anillo exterior es gratis) y suele haber cola.',

  'p-2nd-street-sakai-shinkanaoka': 'Sucursal grande de 2nd STREET, la cadena de segunda mano mejor curada de Japón: ropa clasificada por marca y en buen estado, sin el caos de los thrift de revolver. Está pegada al BOOKOFF PLUS, así que las dos son una sola parada. Queda en Sakai, al sur de Osaka y fuera del circuito turístico, que es justamente por qué todavía queda cosa buena en las perchas.',

  'p-ainoshima': 'Isla de gatos frente a Fukuoka: hay como seis gatos por habitante y están tan acostumbrados a la gente que se te vienen encima en vez de escaparse. Se llega en un ferry corto desde el puerto de Shingu y se camina entera en un par de horas. Ojo con los horarios del ferry: son pocos por día y perder el último significa quedarse.',

  'p-aisorashi': 'Taller de Kanazawa donde hacés tu propio anillo con las artesanas al lado y te lo llevás el mismo día. Si lo martillás y lo limás vos lleva entre 75 y 90 minutos; también lo pueden terminar ellas. Es un taller chico y de a pocas personas, así que conviene consultar disponibilidad antes de caer.',

  'p-ameya-yokocho-market': 'El mercado callejero que corre bajo las vías entre Ueno y Okachimachi, heredero directo del mercado negro de posguerra. Hoy es un pasillo apretado de pescaderías, frutas, especias, zapatillas y bazar, con vendedores gritando precios: bastante menos pulcro que el resto de Tokio, que es la gracia. Se cruza en veinte minutos si no parás, pero la idea es parar.',

  'p-an-vintage': 'Vintage chiquito de Shimokitazawa, más del lado de las rarezas que de los básicos: pantalones flare de croco falso, joyitas, piezas que no vas a ver repetidas. Abre todos los días de 12 a 20, así que entra fácil en cualquier vuelta por el barrio.',

  'p-aomori-museum-of-art': 'Museo de arte de Aomori, un bloque blanco de Jun Aoki plantado al lado del yacimiento arqueológico de Sannai-Maruyama. Lo que va a ver todo el mundo es Aomori-ken, el perro blanco gigante de Yoshitomo Nara sentado en un patio hundido. Adentro también están los telones enormes que Chagall pintó para el ballet Aleko, que ocupan una sala entera.',

  'p-asakusa-hanayashiki': 'El parque de diversiones más viejo de Japón: abrió en 1853 como jardín de flores y sigue funcionando, metido entre las casas de Asakusa a pasos del Senso-ji. Es minúsculo y medio destartalado, con una montaña rusa de 1953 que pasa raspando los techos de los vecinos. No se va por la adrenalina, se va por lo raro que es que siga ahí.',

  'p-atom-tokyo': 'Boliche de Shibuya de varios pisos, de los que aparecen siempre en las listas para extranjeros porque entrar no depende de conocer a nadie. Música mainstream y público mezclado. Está en el reel como recomendación práctica, no como joya escondida.',

  'p-baia': 'Boliche de tres niveles con la pista chica, que juega a favor: se llena rápido y nunca da sensación de galpón vacío. Ponen música americana y throwbacks, y el público es mayormente extranjero. Buena primera parada si nadie del grupo tiene ganas de investigar mucho.',

  'p-bar-centifolia': 'Coctelería de las de ceremonia: te reciben con una copa de champagne y siempre dejan un lugar libre en la barra para que veas cómo preparan lo tuyo. Los tragos van ¥4.000 (el de la casa ¥5.000) más ¥1.000 de cubierto, así que es una salida cara y de una sola parada. Abre de 20:30 a 03:00 y cierra los miércoles.',

  'p-bazzstore-shimokitazawa': 'Cadena de segunda mano con local en Shimokitazawa y rotación rápida: lo que hay hoy no es lo que había la semana pasada. Precios de cadena, no de tienda curada, así que se revuelve sin culpa. Entra bien en la vuelta de thrift del barrio junto con las otras de la misma cuadra.',

  'p-benesse-house-museum': 'Museo y hotel en el mismo edificio, de Tadao Ando, colgado sobre el mar en el sur de Naoshima. Si dormís ahí podés recorrer las salas de noche, sin nadie alrededor, que es la razón real por la que la gente reserva. La isla también se hace en el día, pero el último ferry manda: cortar el recorrido a las corridas es el error clásico.',

  'p-betty-smith-ebisu-factory': 'Sucursal en Ebisu de Betty Smith, la marca de denim japonés de Kojima. El plan es armar tu propio jean: elegís el modelo, lo ajustan al cuerpo y le ponés remaches y botón. El dueño es parte del asunto, según quien lo recomendó. Sale un pantalón que te queda bien y ocupa una tarde, no diez minutos.',

  'p-bookoff-plus-sakai-shinkanaoka': 'BOOKOFF en formato grande: además de libros y manga usados tiene ropa, electrónica y bazar. Está pegado al 2nd STREET, así que las dos se hacen de una sentada. Es la parada de segunda mano de Sakai, al sur de Osaka.',

  'p-bookoff-super-bazaar-yao-nagahata': 'El formato más grande de BOOKOFF: pisos enteros de libros, manga, ropa, consolas y gadgets usados a precios de cadena. Queda en Yao, en el este de Osaka, en zona de galpones, así que se va con la ruta de segunda mano armada y no de paseo. Da para una hora larga si te gusta revolver.',

  'p-cas-pace': 'Tienda de fundas de celular delirantes: garras con ositos que se mueven, cosas que no entran en ningún bolsillo. Está en las callecitas de atrás de Harajuku, no sobre Takeshita. Rondan los USD 40 y es el souvenir raro que no va a tener nadie más.',

  'p-cat-cafe-mocha': 'Cadena de cafés con gatos, con local en Shibuya. Pagás por tiempo, tomás algo y los gatos hacen lo que quieren, que suele ser dormir. Sirve más para descansar media hora en el medio de Shibuya que como atracción en sí.',

  'p-chanel-ginza': 'El flagship que Peter Marino terminó en 2004: la fachada es una cortina de vidrio con unos 700.000 LEDs que de noche se convierte en una pantalla. No hace falta entrar a comprar nada. En los pisos altos está el Chanel Nexus Hall, que hace muestras y conciertos gratis, y arriba de todo un restaurante de Alain Ducasse.',

  'p-chokuritsuenjin': 'Jazz kissa de la era Showa, abierto en 1975 en Kamata: paredes de vinilos, equipo viejo y la regla implícita de escuchar más que hablar. Los tragos van de ¥500 a ¥800 y algo para picar arranca en ¥300, o sea barato para lo que es. Queda lejos del centro, así que es un plan en sí mismo y no algo que te queda de paso.',

  'p-choya-ume-studio-kyoto': 'Estudio de CHOYA, la marca de umeshu, donde armás tu propio frasco: catás variedades de ciruela y azúcares y elegís la combinación. Hay versión sin alcohol con sirope de ume, así que no queda nadie afuera. Hay que reservar.',

  'p-closet-child': 'La segunda mano favorita de la guía de vintage: ropa japonesa de calle y marcas locales, más barata que las tiendas curadas del mismo rubro. Fuerte en lolita, visual kei y todo lo que hizo famoso a Harajuku. La sucursal de Shinjuku es de las grandes.',

  'p-club-harlem': 'Boliche del circuito nocturno de Shinjuku. Aparece en el reel como recomendación suelta y poco más: es de los lugares que se terminan decidiendo esa misma noche, según dónde esté el resto.',

  'p-daikoku-pa': 'Área de descanso de autopista en Yokohama, abajo de un trébol de rampas, que de noche se convierte en la meca del JDM: se juntan los autos más impresentables y más lindos de Japón. No es un evento organizado ni tiene horario, depende de quién aparezca, y a veces la policía lo levanta. Se llega en auto o taxi, no hay estación cerca.',

  'p-dog-harajuku': 'Sótano de Harajuku, oscuro y avant-garde, de los que hicieron la fama del barrio: de acá salieron looks que después usó Lady Gaga. Es tanto tienda como muestra, se puede entrar sólo a mirar. Chiquito, se ve en quince minutos.',

  'p-dog-osaka': 'La sucursal de Osaka, en Amemura, especializada en calzado rave y alternativo: New Rock, Demonia, Rombaut. Con pasaporte hacés tax free desde ¥5.500. Amemura es el barrio joven de Osaka, así que la tienda cae dentro de una vuelta más larga.',

  'p-echizen-daibutsu': 'Buda sentado de 17 metros, más alto que el de Nara, dentro de un templo enorme que mandó a construir un empresario local a fines de los 80. Las paredes de la sala tienen 1.281 budas chicos y casi nunca hay nadie, lo que lo vuelve todavía más surreal. Entrada ¥500. Queda en Fukui, lejos de todo: es un desvío, no una parada.',

  'p-edo-tokyo-open-air-architectural-museum': 'Museo al aire libre en Koganei donde reconstruyeron edificios que Tokio iba a demoler: casas de campesinos, negocios de la era Meiji, una casa de baños de 1929 con el Fuji pintado en el mural. También está la casa que el arquitecto Kunio Maekawa se construyó para él en 1942, chica y perfecta. Se camina mucho: calculá dos o tres horas.',

  'p-expo-70-commemorative-park': 'El predio de la Expo del 70 en Osaka, convertido en parque. Sigue en pie la Torre del Sol de Taro Okamoto, que de cerca es bastante más extraña que en las fotos. En otoño se pone lindo con las kochia y los canteros de temporada.',

  'p-fusion-museum': 'Museo de una fábrica de tejido en Wakayama, con entrada gratis. La gracia está en las máquinas a pedal: tejés tu propia bufanda por ¥600 o un posavasos por ¥300, pedaleando vos. Es corto y bastante más divertido de lo que suena.',

  'p-gala-yuzawa': 'Centro de esquí pegado a la estación de shinkansen: bajás del tren y ya estás en la base, a menos de 90 minutos de Tokio. Alquilan todo el equipo, así que se puede ir con lo puesto. Ojo con la fecha: la temporada arranca a mediados de diciembre y el viaje es en octubre y noviembre, o sea que esto no aplica.',

  'p-general-store-railyard': 'Tienda de Akihabara para fans de los trenes japoneses: llaveros que suenan las melodías de cada estación, imanes con forma de boleto, libretas para coleccionar eki stamps, relojes de la mascota del Suica. Es de esas tiendas donde a los diez minutos te das cuenta de que estás comprando cosas que no sabías que existían.',

  'p-ghibli-park': 'El parque de Ghibli, en Aichi, cerca de Nagoya. No es un parque de atracciones: son ambientes y edificios de las películas para recorrer a pie, sin juegos mecánicos. Las entradas se compran con anticipación, por área y con horario, y se agotan. Contando el viaje es un día entero.',

  'p-ginza-six': 'El complejo de lujo grande de Ginza, con una instalación de arte colgando del atrio y marcas caras en todos los pisos. Lo que salva la visita si no vas a comprar: la terraza del último piso, abierta y gratis, y el subsuelo de comida. Se entra, se mira y se sigue.',

  'p-golden-gai': 'Seis callejones de Shinjuku con más de doscientos bares del tamaño de un baño, cada uno con su tema y su dueño. Varios cobran cubierto y algunos no reciben extranjeros, así que la regla es leer la puerta antes de entrar. Se llena tarde: antes de las diez está muerto.',

  'p-gotemba-premium-outlets': 'El outlet más grande de Japón, al pie del Fuji: con día despejado la montaña queda literalmente de fondo entre los locales. Llevá pasaporte para el tax free. Es ida y vuelta desde Tokio en bus, así que ocupa el día.',

  'p-goyomatsu-limestone-cave': 'Cueva de piedra caliza en las montañas de Nara, a la que se sube en un monorriel forestal montado sobre una vía maderera abandonada: unos ¥500 y la mejor parte del paseo. La escena es bastante Ghibli. Está en Dorogawa, zona de montaña, así que hay que ir con el transporte resuelto.',

  'p-hachiko-statue': 'La estatua del perro que siguió yendo a esperar a su dueño a la estación de Shibuya durante años después de que él muriera. Es el punto de encuentro por default de todo Tokio y siempre hay cola para la foto. Toma dos minutos y queda de paso al salir de la estación.',

  'p-hachinohe-art-museum': 'Museo chico en Hachinohe, con un hall público enorme de entrada libre que funciona más como plaza techada que como sala. Está bien si ya andás por Aomori; solo, no justifica el desvío.',

  'p-hakuba-norikura-winter-oasis': 'Pool party en la nieve: pileta climatizada, sauna y DJ, con acceso directo desde la pista. Funciona sólo de enero a marzo, así que en octubre y noviembre no hay nada que ver.',

  'p-hama-rikyu-gardens': 'Jardín de la época Edo sobre la bahía, con los rascacielos de Shiodome asomando por encima de los pinos. En otoño tiene un campo de cosmos, y sobre el estanque —de agua salada, sube y baja con la marea— hay una casa de té donde se toma matcha mirando el agua. Se puede llegar en el barco que baja por el Sumida desde Asakusa, que es la mejor manera.',

  'p-hard-off': 'La cadena de electrónica usada, en su versión Akihabara: cámaras digitales viejas, consolas, cables imposibles y una sección de rezagos donde todo cuesta monedas. Es de revolver, no de comprar rápido. Va bien con Sofmap en la misma vuelta.',

  'p-harry-s-animal-cafe': 'Café de animales de Harajuku donde el número fuerte es la nutria bebé que te ponen en las manos; también hay erizos y otros bichos chicos. Es divertidísimo y a la vez un poco incómodo si te ponés a pensarlo: decidilo con eso a la vista.',

  'p-haruki-murakami-library': 'El archivo de Murakami dentro de la Universidad de Waseda, en un edificio viejo que reformó Kengo Kuma: la escalera-túnel de madera curva de la entrada es la foto que circula. Adentro hay biblioteca, la reproducción de su estudio y un café que llevan estudiantes. La entrada es gratis y suele pedir reserva online.',

  'p-hill-of-the-buddha': 'El Atama Daibutsu de Tadao Ando, en un cementerio a las afueras de Sapporo. La estatua ya existía; lo que hizo Ando fue enterrarla en una colina y dejar afuera sólo la cabeza. Se llega por un túnel de 40 metros que termina de golpe frente al buda, bajo un óvalo de cielo abierto. La colina está plantada de lavanda.',

  'p-himeji-castle': 'El castillo más lindo de Japón y el único grande que llegó entero: nunca lo bombardearon ni lo quemaron, así que la torre es la original del 1600. Está a pasos de la estación de Himeji, o sea que es parada natural del shinkansen entre Osaka y Hiroshima. Subir hasta arriba es escalera empinada y en medias; los días de mucha gente reparten número para entrar.',

  'p-hiroshi-senju-museum': 'Museo de un solo artista en Karuizawa, dedicado a las cascadas de Hiroshi Senju. El edificio es de Ryue Nishizawa: piso curvo que sigue el terreno, vidrio de punta a punta y patios con árboles adentro de la sala. Es tranquilo y bastante corto.',

  'p-hitachi-seaside-park': 'El parque de las colinas de kochia, en Ibaraki: en octubre los arbustos redondos pasan de verde a rojo y cubren la loma entera. Es day trip desde Tokio, en tren más colectivo, y en el pico de color se llena. Alquilan bicis adentro, que es lo más cómodo porque el parque es enorme.',

  'p-honjo-life-safety-learning-center': 'Centro de los Bomberos de Tokio donde entrenás emergencias de verdad, y gratis: simulador de terremoto, sala de humo, viento de tifón. El curso dura una hora y tres cuartos y se reserva en la web del TFD, que está en japonés (con Google Translate se hace). Es de las cosas más raras y más útiles que se pueden hacer en Tokio.',

  'p-hozugawa-river-boat-ride': 'Bajada de dos horas por el río Hozu en un bote de madera con tres remeros, desde Kameoka hasta Arashiyama. Hay tramos de rápidos y tramos de deriva, y en otoño el desfiladero está rojo. Opera igual con lluvia y se puede sacar en el momento llegando a JR Kameoka. El combo obvio: bote a la mañana y Arashiyama a la tarde, porque te deja justo ahí.',

  'p-hypnotique-tokyo': 'Vintage de pieles y abrigos de alta gama, en el mismo edificio que NUDE TRUMP. Es tienda chica, de piezas caras y únicas, no de revolver. Sirve si andás buscando una campera puntual.',

  'p-ichihara-shouten': 'Taller de sandalias zori en Asakusa donde Ichihara-san te arma un par a medida: elegís la tela de la tira y él las monta ahí adelante tuyo. Lleva alrededor de una hora y arranca en ¥11.000. Hay que reservar.',

  'p-issey-miyake': 'No es la tienda oficial: es una de archivo y segunda mano, con la selección más amplia de Issey Miyake de Tokio y también tabis de Margiela. Precios de pieza de colección. Para quien mire la ropa como objeto, es de las paradas fuertes de la ciudad.',

  'p-itsukushima-shrine': 'El santuario sobre el agua de Miyajima, con el torii rojo que con marea alta queda flotando. Con marea baja se camina hasta la base, que es igual de lindo y bastante distinto, así que mirá la tabla de mareas antes de elegir la hora. Se llega en ferry desde Hiroshima y la isla tiene ciervos sueltos que roban comida de las manos.',

  'p-junintoiro': 'Taller de Kawagoe donde horneás tus propias galletas de arroz sobre la brasa: ¥650 por tres, y les pintás la salsa de soja vos. Es corto y barato, y Kawagoe ya es un paseo de día desde Tokio.',

  'p-kabuki-za-theatre': 'El teatro de kabuki principal de Tokio, en Ginza, en un edificio de 2013 que reprodujo la fachada vieja con una torre de oficinas atrás. No hace falta bancarse una función de cuatro horas: venden entradas por acto suelto, para el último piso, el mismo día y sin reserva. Alquilan audioguía en inglés, que acá cambia bastante las cosas.',

  'p-kabukicho': 'El barrio nocturno de Shinjuku: pantallas, karaokes, host clubs y el gato 3D de la esquina. Es más show que peligro, pero la regla no cambia: no seguir a nadie que te invite a un local. Se camina de noche, que es cuando existe.',

  'p-kait-workshop-plaza': 'Los dos edificios de Junya Ishigami en el campus de Kanagawa, uno al lado del otro: el taller de 2008, un bosque de 305 columnas finitas puestas sin grilla, y la plaza de 2020, un techo de chapa que se hunde y no tiene una sola columna adentro. Es de las peregrinaciones de arquitectura serias que se hacen en un día desde Tokio. Es una universidad, así que hay que chequear que estén abiertos al público.',

  'p-kamakura-kanzashi-aki-kobo': 'Tiendita de Kamakura de kanzashi, los prendedores tradicionales de pelo, hechos ahí mismo y con opción de pedirlos a medida. Es de las compras que quedan bien de regalo y no pesan nada. Kamakura ya es un paseo de día desde Tokio.',

  'p-kappabashi': 'La calle de los cocineros, entre Asakusa y Ueno: cuadras de tiendas de cuchillos, ollas, cerámica, moldes y la comida de plástico de las vidrieras. En varias cuchillerías te graban el nombre en la hoja en el momento. Aparece tres veces en el mazo porque salió en tres reels distintos: es la misma calle.',

  'p-kappabashi-kitchenware-street': 'Kappabashi otra vez, esta vez por el lado de la comida de plástico: los sampuru que se ven en las vidrieras de todo Japón se fabrican y se venden acá, y en algunos locales hacés uno vos. Muchos negocios cierran alrededor de las cinco de la tarde y varios no abren los domingos, así que es plan de mañana.',

  'p-kappabashi-street': 'La misma calle de Kappabashi, del lado de los souvenirs que después se usan: teteras de hierro, cuchillos, cerámica, palillos. De lo poco que se compra en un viaje y no termina juntando polvo. Si vas por un cuchillo bueno, andá con tiempo y dejate aconsejar.',

  'p-karaki-mokkou': 'Taller de Kawagoe donde te hacés tu propio par de palitos: elegís la madera, la lijás y le das forma. Salen únicos y no ocupan nada en la valija. Va pegado con el taller de senbei del mismo pueblo.',

  'p-karimoku-research-center': 'Centro de diseño de Karimoku, la mueblera japonesa, en Nishi-Azabu. La muestra Form Follows Feelings ocupa tres pisos y es gratis, con una instalación de sonido de OJAS/Devon Turnbull que es la mitad del motivo para ir. Abre días de semana.',

  'p-katayama-bunzaburo-shoten-kyoto-honten': 'Casa de shibori de Kioto, la técnica de teñido por anudado. En vez de quedarse en el kimono la usan para hacer bolsos y piezas con relieve, todas erizadas de púas de colores. Son objetos únicos y bastante caros, y no se parecen a nada. Queda en Nakagyo, en el centro.',

  'p-keihan-uji-station': 'La estación circular de Wakabayashi en Uji, premio Good Design del 96: un cilindro de vidrio y hormigón que no parece una estación de tren. Es la puerta de entrada a Uji, así que se ve de paso yendo al puente, al santuario Ujigami y al matcha, que es a lo que se va a Uji.',

  'p-kibune': 'Valle de montaña al norte de Kioto, con el santuario Kifune arriba de una escalera flanqueada por faroles rojos y el río corriendo abajo. Es famoso por el kawadoko, las plataformas montadas sobre el agua donde se come en verano; en otoño ya las levantaron, pero quedan el paseo y el color de los arces. Se llega en el tren Eizan, que es la mitad de la gracia.',

  'p-kichijoji': 'Barrio al oeste de Tokio, a quince minutos de Shibuya, con buena segunda mano, cultura pop y el parque Inokashira pegado. Es más vivible y menos turístico que el centro. Da para una tarde entera sin plan.',

  'p-kihoku-astronomical-museum': 'Observatorio de Kagoshima diseñado por Masaharu Takasaki, a 550 metros de altura y mirando al volcán Sakurajima. El edificio parece crecido de la tierra y venido de otro planeta al mismo tiempo. Está muy lejos de todo: es un viaje a Kyushu, no un desvío.',

  'p-kioi-seido': 'Cubo de hormigón y vidrio de Hiroshi Naito en Kioicho, reabierto por tiempo limitado. Adentro hay un memorial hecho con 18.800 piezas de vidrio por las víctimas del terremoto de 2011. Justamente porque la reapertura es temporaria, conviene chequear que siga abierto antes de ir.',

  'p-kurayoshi': 'Pueblo de Tottori con una hilera de depósitos de paredes blancas y tejas rojas sobre un canal, y casi nada de turismo. Es de las postales que en Kioto tendrían cola y acá no tienen a nadie. Se ve en un par de horas.',

  'p-kyocera-museum-of-art': 'El museo municipal de Kioto, de 1933, que reabrió en 2020 con una reforma de Jun Aoki: le excavaron el frente y le pusieron una entrada de vidrio hundida sin tocar el edificio viejo. Está en Okazaki, al lado del torii gigante y del jardín Heian. Las muestras temporales suelen ser fuertes.',

  'p-kyoto-international-conference-center': 'El centro de convenciones de Sachio Otani, de 1966, en Takaragaike: geometría de hormigón inclinada, como una escultura apoyada en el paisaje. Está al norte, lejos del centro. Es un edificio en uso, así que hay que ver si el día que vas se puede entrar o sólo verlo por fuera.',

  'p-kyu-iwasaki-tei-gardens': 'La casa que los Iwasaki, dueños de Mitsubishi, se hicieron en 1896: un ala occidental de Josiah Conder con galería y papel de cuero repujado, un ala japonesa pegada al costado y el jardín en el medio. Está en Ueno y casi nunca tiene gente. Se recorre en medias y en silencio.',

  'p-la-collina-omihachiman': 'La casa central de Taneya, una confitería de Shiga, hecha por Terunobu Fujimori: techo cubierto de pasto, escala de cuento y hormigas de carbón pegadas al cielorraso. Se compra baumkuchen y se camina el predio, que es enorme. Vale por el edificio tanto como por lo dulce.',

  'p-legoland-japan': 'Parque de LEGO en Nagoya, pensado para chicos bastante más que para adultos. Si te gusta LEGO en serio, la mini-ciudad de Japón armada en ladrillos justifica el rato. Si no, no.',

  'p-lemaire-tokyo': 'El flagship de Lemaire, con un jardín interno que es lo que hay que ir a ver aunque no compres nada. Funciona más como espacio que como tienda: madera, silencio, luz. Corto y gratis.',

  'p-live-haus': 'Live house en un sótano de Shimokitazawa que rompe el molde: bandas a la tarde, rock a la noche y DJs de madrugada, todo el mismo día. A los extranjeros no les cobran entrada, sólo la bebida obligatoria. Está a tres minutos de la estación.',

  'p-lush-spa-kyoto': 'Spa de Lush con baño privado reservable, además de los tratamientos. Es el plan del día que caminaste veinticinco mil pasos y ya no da para nada más. También hay sucursales en Tokio: Meguro, Shinjuku y Shibuya.',

  'p-m-g-item': 'Thrift de Shimokitazawa, fuerte en bolsos. Entra en la ruta de segunda mano del barrio, que se hace caminando de local en local sin planificar demasiado.',

  'p-maison-hermes-ginza': 'La torre de Hermès en Ginza, de Renzo Piano, terminada en 2001: ocho pisos forrados en bloques de vidrio de 45 centímetros que de día filtran la luz y de noche la tiran para afuera, como una linterna. En los pisos altos hay una sala de arte contemporáneo y un microcine. Se ve mejor de noche.',

  'p-mega-don-quijote-shibuya': 'La Donki más grande del país: siete pisos abiertos las 24 horas, todo apilado hasta el techo y el jingle sonando en loop. Es caótico a propósito y es donde termina saliendo la mitad de los souvenirs. Tax free desde ¥5.500 con pasaporte.',

  'p-meiji-jingu-museum': 'El museo del santuario Meiji, de Kengo Kuma: madera, techo bajo y una entrada larga entre los árboles del bosque. Guarda los objetos del emperador Meiji, incluido el carruaje. Queda dentro del predio, así que se hace en la misma visita al santuario.',

  'p-mineral-osaka': 'Select shop de Osaka con accesorios y piezas de diseño, tipo los head pieces de GANGYOUNG. Tienda chica y de gusto marcado. Cae dentro de la vuelta de compras del centro.',

  'p-mipig-cafe': 'Café de mini cerdos: se te suben encima, se te duermen en la falda y pesan bastante más de lo que parece. Media hora sale alrededor de ¥1.100 con bebida y alcanza de sobra. Según quien lo recomendó los tratan bien, que es lo único que hay que mirar en estos lugares.',

  'p-misasa-onsen': 'Pueblo de aguas termales en Tottori, con agua rica en radón: la propaganda local es que el radio hace bien. Es chico y lento, con baño público y un río en el medio. Es plan de quedarse a dormir, no de pasar.',

  'p-mitsuki': 'Sótano de Shibuya, chico, oscuro y con neones, sin nada más que música y pista. De los que funcionan cuando querés bailar y no ver un show.',

  'p-mitsukoshi-ginza': 'La tienda departamental clásica de Ginza, sobre el cruce de Ginza Yonchome. Lo que vale aunque no compres nada: el depachika del subsuelo, dos pisos de comida que son un museo en sí mismos. Arriba tiene terraza.',

  'p-mod-tokyo': 'Taller de Akihabara donde desarmás una Game Boy original y la armás de nuevo a tu gusto: carcasa, botones, pantalla retroiluminada y el juego que elijas. Salís con la consola andando. Es de los souvenirs que después se usan de verdad.',

  'p-nagomi-no-oyado-takinoyu': 'Ryokan con onsen en Echigo-Yuzawa, a poco más de una hora de Tokio en shinkansen. Es plan de quedarse a dormir: cena kaiseki, futón y baño caliente. Funciona bien como escapada de una noche en el medio del viaje.',

  'p-nakameguro': 'Barrio a cinco minutos de Shibuya, sobre el canal Meguro, con segunda mano más adulta y más cara que la de Shimokitazawa, cafés y librerías. Es para caminar sin apuro. En otoño el canal no está en flor, pero sigue siendo la calle más linda de la zona.',

  'p-nakamise-shopping-street': 'Los doscientos metros de puestos que van del portón Kaminarimon al Senso-ji: abanicos, souvenirs, dulces recién hechos. Es turístico hasta el hueso y aun así hay que pasarlo, porque es el camino al templo. Temprano a la mañana está vacío y es otra cosa.',

  'p-national-museum-of-western-art': 'El único edificio de Le Corbusier en Japón, de 1959, declarado Patrimonio de la Humanidad: el hall del siglo XIX con la rampa y los tragaluces triangulares es la razón para entrar. La colección es la del naviero Matsukata, con bastante impresionismo, y en el patio de adelante hay Rodin al aire libre y gratis. Suele haber fila igual yendo temprano; se combina con los otros museos de Ueno.',

  'p-neova': 'Buying shop de Urahara: traen drops comprados afuera, así que el stock es impredecible y no se repite. A veces limitan la entrada por cantidad de gente. Es tienda de nicho, para quien sepa qué está buscando.',

  'p-neverland-tokyo': 'Boliche de Shinjuku. Está en el mazo por una recomendación suelta del reel y poco más: de esos que se deciden esa misma noche según dónde estén los demás.',

  'p-nezu-museum': 'Museo de arte asiático en Aoyama, con edificio de Kengo Kuma y un pasillo de entrada de bambú y piedra que ya vale la entrada. Lo mejor está atrás: un jardín de casi diez mil metros con estanque, casas de té y linternas, en el medio de Omotesando. En otoño se pone rojo.',

  'p-nintendo-museum': 'El museo que Nintendo abrió en su vieja fábrica de Uji, con las cartas hanafuda del principio, todas las consolas y juegos hechos para el lugar. Las entradas salen por lotería y se piden con tres meses de anticipación: para ir en octubre hay que anotarse en julio. Sin ese sorteo ganado, no se entra.',

  'p-nonbei-yokocho': 'Callejón de Shibuya pegado a las vías, con bares de seis asientos que sobrevivieron a todas las demoliciones de alrededor. Es el mismo espíritu que Golden Gai pero más chico y menos turístico. Igual que allá: mirá la puerta y el cubierto antes de sentarte.',

  'p-nude-trump': 'Vintage en el sexto piso del Hoshi Building de Shibuya, el mismo edificio que Hypnotique. Piezas con historia; por acá pasó Rosalía. El edificio entero es de tiendas chicas, así que se sube y se van visitando pisos.',

  'p-oh-jo-building': 'Edificio de Shinjuku reconvertido en espacio de fiesta de varios pisos, cada uno con su género. Quien lo recomienda no fue: lo pasa de oídas, así que va con esa reserva.',

  'p-oita-fragrance-museum': 'Museo del perfume en Beppu, con colección de frascos y alambiques. La parte buena es el taller: armás tu propia fragancia por ¥2.800 y te la llevás. Beppu es el pueblo de los onsen, así que cae bien dentro del mismo día.',

  'p-okunoshima': 'La isla de los conejos, frente a Tadanoumi, cerca de Hiroshima: cientos de conejos sueltos que se te acercan apenas ven comida. La isla también tiene el museo de la fábrica de gas venenoso que funcionó ahí durante la guerra, que es el contraste raro del lugar. Se llega en ferry y se recorre a pie o en bici.',

  'p-orizuru-tower': 'Torre al lado de la Cúpula de la Bomba, en Hiroshima, con un mirador de madera abierto que da justo sobre el Parque de la Paz. Si querés, se baja por un tobogán espiral de doce pisos. Es la vista que termina de ordenar todo lo que viste abajo.',

  'p-osaka-aquarium-kaiyukan': 'Uno de los acuarios más grandes del mundo, en Tempozan: se sube hasta arriba y se baja en espiral alrededor de un tanque central de nueve metros de profundidad donde vive un tiburón ballena. Es de los pocos acuarios que aguantan tres horas. Los fines de semana se llena.',

  'p-oshimaya-chochin': 'Taller privado de farolitos chochin con el dueño de una casa histórica de Namidabashi: se pinta el papel a mano, igual que los que cuelgan en templos y restaurantes. Se reserva por Wabunka y es de a pocas personas. No es algo que se pueda hacer sin planificarlo.',

  'p-ozeki-tokyo-gallery': 'Showroom de Ozeki, la fábrica de Gifu que hace las lámparas Akari de Isamu Noguchi desde los años 50. Están todas colgadas juntas, que es como hay que verlas. Tiene tiendita: las chicas entran en la valija.',

  'p-pl-peace-tower': 'Torre blanca de 180 metros en Tondabayashi, levantada por una iglesia local. Sí, tiene aire de secta, y conviene ir sabiéndolo. Se puede entrar. Combina con el casco viejo de Tondabayashi, que es un pueblito retro bastante lindo.',

  'p-planet-of-zines': 'Tiendita de zines independientes en Omotesando: fanzines de fotografía, ilustración, cosas hechas de a cien copias. Es chica y barata. Buen souvenir si te gusta el papel.',

  'p-queens-tokyo': 'Vintage de Harajuku con estética de castillo y princesa: moños, encaje, puesta en escena. Más para ver que para comprar, salvo que sea exactamente lo tuyo. Corta, entra fácil en la vuelta del barrio.',

  'p-radd-lounge': 'Select shop de Harajuku que trabaja con diseñadores emergentes y saca drops exclusivos, tipo LA MASKARADE. Es de las tiendas donde se ve qué se está haciendo ahora y no qué se hizo. Chica.',

  'p-rainbow-bridge': 'El puente que cruza la bahía hacia Odaiba, iluminado de noche. Lo que casi nadie hace: se puede cruzar caminando por una pasarela lateral, gratis, con vista a la ciudad y al Fuji si el día está limpio. La caminata lleva alrededor de media hora y tiene horario acotado.',

  'p-red-tokyo-tower': 'Arcade grande metido adentro de la Torre de Tokio: trampolines, escalada, arquería, VR, carreras y peleas de robots. Es más parque de juegos que fichines. Sirve para el día de lluvia.',

  'p-reiyukai-shakaden-temple': 'Templo de los años 70 en Minato que parece una nave: hormigón oscuro inclinado, escalinatas enormes y una plaza vacía adelante. No se parece a ningún otro templo de Tokio. Casi no va nadie y se puede entrar.',

  'p-round-1-umeda': 'Sucursal de Round 1 en Umeda: fichines, grúas, karaoke y arriba el Spo-Cha con canchas de todo. Es la versión japonesa de perder tres horas sin darte cuenta. Abre hasta muy tarde.',

  'p-samurai-museum': 'Museo chico de Shinjuku con armaduras, cascos y espadas, y demostraciones cada tanto. Es más show para turistas que museo serio, y con eso a la vista es entretenido. Se hace en una hora.',

  'p-senso-ji-temple': 'El templo más viejo de Tokio, en Asakusa: el portón del farol rojo, la calle de puestos y el humo del incensario que todo el mundo se abanica encima. De día es una marea de gente; de noche el predio queda iluminado, abierto y vacío, y ahí es cuando conviene ir. La sala principal cierra, el resto no.',

  'p-shibori-shop-kyoto': 'Tienda chica de piezas de shibori, el teñido japonés por anudado: blusas, bolsos en tonos crudos, todo de a una. Son piezas únicas, así que lo que está es lo que hay. Buen recuerdo que no parece un souvenir.',

  'p-shibuya-crossing': 'El cruce que se ve en todas las películas: hasta tres mil personas por luz verde y nadie choca con nadie. Se cruza una vez y después se mira desde arriba; el Starbucks del Tsutaya y el pasillo de la estación son los miradores gratis. De noche y con lluvia es cuando mejor se ve.',

  'p-shibuya-loft': 'Pisos enteros de papelería, organización y cosmética en Shibuya. Es el lugar para resolver todos los regalos de una: lapiceras, cuadernos, cositas de baño. Eficiente y sin misterio.',

  'p-shibuya-parco': 'Mall de Shibuya de perfil más joven, con el piso de Nintendo, Pokémon y Jump, y una terraza abierta arriba. Los pisos de moda son de marcas japonesas, no de cadenas globales. Había un pop-up de selfFab con piezas hechas de camisetas de fútbol vintage: eso hay que chequear si sigue en pie.',

  'p-shibuya-sky': 'El mirador abierto arriba del Scramble Square, a 230 metros: no tiene techo, se siente el viento y el cruce se ve diminuto abajo. Las entradas del atardecer son las que valen y se agotan con días de anticipación. Si hay tormenta cierran la terraza y te dejan sólo el piso vidriado.',

  'p-shimokita-senrogai-flea-market': 'Feria de usado y hecho a mano en el espacio abierto de Senrogai, sobre las vías tapadas de Shimokitazawa. En octubre cae los fines de semana 12-13, 19-20 y 26-27, de 12 a 18, y la entrada es libre. Si estás en el barrio ese día, es la excusa perfecta.',

  'p-shimokitazawa': 'El barrio de la segunda mano: cuadras enteras de thrift, cafés, teatros chicos y casi ninguna cadena. No tiene una atracción, tiene una tarde. Se va sin lista y se vuelve con lo que apareció.',

  'p-shinjuku-flea-market': 'Mercado de pulgas de Shinjuku con ropa, kimonos usados, cerámica y cosas de anime a precios bajos. Se puede regatear, que en Japón casi nunca pasa. Depende del día, así que conviene chequear la fecha antes de ir.',

  'p-shinjuku-gyoen-national-garden': 'Cincuenta y ocho hectáreas de jardín en el medio de Shinjuku, con tres partes bien distintas —francesa, inglesa y japonesa— más un invernadero. En noviembre son los arces y los ginkgos amarillos, y hay muestra de crisantemos. Cobra una entrada barata, cierra temprano y no dejan entrar alcohol, que es parte de por qué está tan tranquilo.',

  'p-shinobazu-pond': 'El estanque de Ueno, tapado de lotos en verano y con un templo octogonal en una isla en el medio. En otoño los lotos están secos, que tiene su propia cosa. Se alquilan botes a pedal con forma de cisne.',

  'p-showa-kinen-park': 'Parque enorme en Tachikawa, al oeste de Tokio, construido sobre una vieja base aérea. En octubre tiene la loma de kochia rojas y campos de cosmos y dalias. Es tan grande que conviene alquilar bici adentro.',

  'p-sofmap-akihabara': 'Cadena de Akihabara con mucho equipo usado, buena para cazar una cámara puntual —la Canon G7X del caso— cuando en Bic Camera no hay stock. Los usados vienen clasificados por estado y con garantía corta. Hay varias sucursales sobre la misma avenida.',

  'p-solakzade': 'Anteojería vintage de Omotesando con marcos desde el 1800 hasta los 90, atendida sólo con cita: te miran la cara y te van trayendo. No es una tienda donde entrás a probarte solo. Es de las experiencias de compra más particulares de Tokio.',

  'p-sonora-shimokitazawa': 'Vintage chico en la misma cuadra de Kitazawa que los otros. Un local más de la ruta, de los que se hacen en cinco minutos y a veces tienen justo la pieza.',

  'p-spo-cha': 'El piso deportivo de Round1: bowling, pool, arcade y canchas de casi todo lo que se te ocurra, con tarifa por tiempo y todo incluido. Abre las 24 horas. Es el plan de las tres de la mañana cuando ya no queda nada más abierto en Osaka.',

  'p-st-mary-s-cathedral-tokyo': 'La catedral de Kenzo Tange, de 1964: ocho paredes de acero inoxidable que se retuercen hacia arriba y forman una cruz vista desde el cielo. Adentro es hormigón desnudo y una luz que entra por las junturas. Está abierta al público y no cobra entrada.',

  'p-stick-out-100': 'Vintage de Shimokitazawa con casi todo a precio fijo bajo. Es de revolver montañas, no de mirar percheros. Sale muy barato o no sale nada.',

  'p-street-kart-tokyo': 'Los karts disfrazados que se ven por la calle en Tokio, manejando entre los autos de verdad. Hace falta licencia internacional de conducir sí o sí, y se tramita antes de viajar. La ropa de Nintendo ya no va, pero el circuito por Shibuya y la Rainbow Bridge sigue igual.',

  'p-studio-j-45': 'Taller de vidrio soplado en Otaru, la ciudad del vidrio en Hokkaido: soplás tu propio vaso o jarro desde ¥2.700. Sale torcido y está bien que salga torcido. Preguntá cuándo se retira o cómo lo mandan, porque el vidrio necesita enfriarse despacio y no siempre te lo llevás en el momento.',

  'p-studio-nin': 'Forja en Shugakuin, al noreste de Kioto, donde hacés tus propias herramientas ninja —shuriken, kunai— o una hoja, martillando el metal caliente vos. Hay un bondi directo desde la estación de Kioto. Lo que sale de ahí va en la valija despachada, obviamente.',

  'p-suginami-animation-museum': 'Museo del anime gratis en Suginami, el barrio donde están la mitad de los estudios de animación de Japón. Tiene una cabina para doblar con tu voz una escena y un taller para hacer animación cuadro a cuadro. Está pensado para chicos y funciona igual de bien con adultos.',

  'p-super-second-street': 'Mega sucursal de 2nd STREET entre arrozales, cerca de Kanazawa: un galpón enorme con precios de provincia. De ahí salieron piezas de Vivienne Westwood; "en Kanazawa se vuela", según quien lo mandó. Hace falta auto, o un colectivo y paciencia.',

  'p-super-second-street-yao': 'Otra mega tienda de segunda mano, esta en Yao, al este de Osaka, a pasos del Treasure Factory. Las dos juntas son lo que justifica el viaje hasta ahí. Zona industrial, cero turismo.',

  'p-t2-tokyo': 'Boliche nuevo y espacioso, con lásers y drink tickets, mezclando EDM, pop y kpop. Es el favorito de quien lo recomendó y abre hasta que amanece. De los que funcionan yendo en grupo.',

  'p-takenoya': 'Baño privado en Osaka que acepta tatuajes, que es el problema de siempre con los onsen. Se reserva la sala entera, así que no hay que compartir con nadie. Buena salida para el día que caminaste de más.',

  'p-takeshita-street': 'La peatonal de Harajuku: crepes, moda barata, purikura y adolescentes. Los fines de semana es un embudo de gente y hay que atravesarlo una vez para decir que lo viste. Lo bueno del barrio está en las calles de atrás.',

  'p-tampopo-house': 'Thrift barato de los de búsqueda del tesoro: montañas de ropa sin ordenar y precios de nada. Aparece en la guía de vintage de Tokio como parada obligada de los que revuelven en serio. Andá con tiempo o no vas a encontrar nada.',

  'p-taro-okamoto-memorial-museum': 'La casa y el taller donde Taro Okamoto vivió y trabajó cuarenta años, en Aoyama, convertidos en museo. Está casi todo como lo dejó: los pinceles, las esculturas apiladas en el jardín. Es chico, es raro y se hace en una hora.',

  'p-teamlab-planets': 'Museo inmersivo de Toyosu que se recorre descalzo: se camina por agua hasta la rodilla, por pisos de espejo y por un cuarto de esferas gigantes que se encienden al empujarlas. Hay que sacar entrada con fecha y horario porque se agota, y conviene ir con pantalón que se pueda arremangar. Es de esos lugares que en foto parecen exagerados y en persona no.',

  'p-teshima-art-museum': 'En la isla de Teshima, una cáscara de hormigón blanco sin una sola columna, con dos óvalos abiertos al cielo. Adentro no hay obras colgadas: hay agua que brota del piso y se junta en gotas que se mueven solas. Se entra descalzo y en silencio, y la gente se queda mucho más de lo que pensaba quedarse.',

  'p-the-national-art-center': 'El centro de exposiciones de Kisho Kurokawa en Roppongi, con la fachada de vidrio ondulada y los conos invertidos que adentro sostienen el restaurante. No tiene colección propia: lo que hay depende de qué muestras estén puestas ese mes. Aparece dos veces en el mazo porque salió en dos reels distintos.',

  'p-the-national-art-center-tokyo': 'Es el mismo edificio de Roppongi que aparece más adelante en el mazo, sólo que del otro reel. La fachada ondulada de Kurokawa y el hall se pueden ver sin pagar entrada, así que la parada vale aunque no entres a ninguna muestra.',

  'p-three-treasures-harakado': 'Tienda de zapatillas y calzado de diseño en el segundo piso de Harakado, el edificio nuevo de Harajuku, con colaboraciones tipo Mikio Sakabe. El edificio en sí ya es una parada.',

  'p-todoroki-valley': 'Un kilómetro de barranca verde con un arroyo abajo, en Setagaya, tapado por los árboles: bajás una escalera y el ruido de Tokio desaparece de golpe. A mitad de camino hay un templo y una casa de té. Se hace en una hora y es de las cosas menos conocidas de la ciudad.',

  'p-togoshi-ginza': 'La shotengai más larga de Tokio: casi kilómetro y medio de comercios de barrio, croquetas, verdulerías y gente haciendo las compras. No hay nada para ver, y esa es exactamente la gracia. Está en Shinagawa, fuera de todo circuito.',

  'p-tokyo-city-flea-market': 'El flea market más grande de Tokio, en el estacionamiento del hipódromo de Oi: cientos de puestos con ropa de diseñador, arte, juguetes y antigüedades. Es sábados y domingos y arranca temprano. Los que van en serio llegan a la apertura.',

  'p-tokyo-disney-resort': 'Los dos parques de Maihama: Disneyland y DisneySea. DisneySea no existe en ningún otro lado y es el que vale la pena, incluso para el que no es fanático de Disney. Es un día entero y las entradas se compran con anticipación.',

  'p-tokyo-flea-market': 'Feria de usado en Katsushima, bien afuera del circuito turístico: precios locales y clientela local. Es más chica que la de Oi. Va si te gusta el formato y ya conocés las grandes.',

  'p-tokyo-joypolis': 'Parque de diversiones techado de SEGA en Odaiba, adentro del DECKS: montañas rusas chicas, laberintos de terror y juegos que mezclan pantalla y movimiento. El pase libre ronda los USD 35. Plan de día de lluvia.',

  'p-tokyo-metropolitan-government-building': 'Las dos torres de Kenzo Tange en Shinjuku, con miradores gratis a 202 metros en cada una. En los días limpios se ve el Fuji. Además, desde 2023 proyectan sobre la fachada un show de luces enorme a la noche, también gratis.',

  'p-tokyo-national-museum': 'El museo más grande de Japón, en Ueno: espadas, armaduras, budas, biombos y cerámica desde la prehistoria hasta el siglo XIX. Con el edificio Honkan alcanza para una visita; hacerlo entero es un día. El jardín de atrás abre sólo en primavera y otoño, o sea que en estas fechas está.',

  'p-tokyo-skytree': 'La torre de 634 metros en Sumida, la más alta de Japón, con dos miradores. Es más cara y más alta que la Tokyo Tower, y la vista es más lejana y menos linda justamente porque la ciudad te queda muy abajo. En la base tiene un shopping enorme y un acuario.',

  'p-tokyo-tower': 'La torre naranja de 1958, copia declarada de la Eiffel y bastante más linda que la Skytree. Lo mejor no es subir sino verla de noche desde abajo, o asomando entre los edificios de Minato. Igual tiene miradores, y el de arriba tiene piso de vidrio.',

  'p-tottori-sand-dunes': 'Dunas de arena de dos kilómetros sobre el mar de Japón, en la prefectura menos visitada del país. Se puede hacer sandboard, parapente o subirse a un camello. Al lado está el museo de esculturas de arena, que cambia de tema todos los años.',

  'p-towada-art-center': 'Centro de arte contemporáneo en Aomori formado por cajas blancas sueltas, con las obras desparramadas también por la calle de afuera: el caballo de flores de Choi Jeong Hwa y las hormigas gigantes se ven gratis, sin entrar. Es chico y muy bueno.',

  'p-toyo-department-store': 'Mini galería de puestos vintage en Shimokitazawa, cada uno de un vendedor distinto, en el edificio del Shimokita Garage Department. Es de revolver en un rato corto. Cae bien en el medio de la ruta del barrio.',

  'p-treasure-factory-yao': 'Thrift grande en Yao, en la ruta de segunda mano del este de Osaka, a pasos del Super Second Street. Vende de todo, no sólo ropa. Las dos juntas hacen que valga el viaje.',

  'p-trefacstyle-shimokitazawa': 'El formato moda de Treasure Factory: más curado y ordenado que el thrift de revolver, con las marcas japonesas bien identificadas. Está en Shimokitazawa, así que entra en la misma vuelta. Precios medios.',

  'p-ueno-park': 'El parque grande de Tokio: adentro están el Museo Nacional, el de arte occidental, el zoológico, el estanque de lotos y un par de templos. Es donde se pasa medio día sin planear nada. En noviembre los ginkgos están amarillos.',

  'p-ueno-toshogu-shrine': 'Santuario dorado de 1651 dentro del parque Ueno, que aguantó terremotos y bombardeos sin caerse. La galería de faroles de piedra que lleva hasta la puerta es gratis; entrar al patio dorado cuesta poco. Está al lado del zoo, así que se hace de paso.',

  'p-ueno-zoo': 'El zoológico más viejo de Japón, dentro del parque Ueno, con pandas gigantes que son la razón de la cola. Es barato y grande. Si los animales en cautiverio no son lo tuyo, salteálo sin culpa.',

  'p-ukiyo-e-de-kawamura-san': 'La tiendita de Kawamura-san sobre Ninenzaka, en Higashiyama: un señor de más de ochenta años que hace tarjetas ukiyo-e a mano, una por una. Cuestan poco y son el mejor recuerdo posible de Kioto. Está en la calle más transitada de la ciudad, así que hay que buscarla entre el gentío.',

  'p-underground-discharge-channel': 'El tanque contra inundaciones más grande del mundo, bajo Kasukabe: una nave de 59 columnas de hormigón de 500 toneladas cada una que parece un templo enterrado. Se entra con visita guiada y reserva, y son como cien escalones para bajar. Hay días que no se hace porque la obra está en operación.',

  'p-unimocc-art-gallery-cafe': 'Café de Osaka donde pintás tu propia torta: te dan la base como lienzo y colorantes, con diseños tipo Monet de referencia. Unos USD 30 con bebida, y hay que reservar online dos semanas antes o más. Después te la comés, que es la parte rara.',

  'p-uniqlo-ginza': 'El flagship de doce pisos en Ginza, con la línea completa y servicios que no están en las otras sucursales, como bordado y ajustes en el momento. Ahí están el HEATTECH para el frío y el AIRism para el calor, que en octubre y noviembre sirven los dos. Es la parada eficiente si falta ropa.',

  'p-uniqlo-utme': 'Estampás tu propia remera Uniqlo con un diseño armado ahí, desde el celular, y te la llevás en el momento. Son unos USD 7 arriba del precio de la prenda. Souvenir barato y propio.',

  'p-used-camera-box': 'Sótano de Shinjuku lleno de equipo fotográfico usado de todas las épocas, apilado sin mucho orden. Si te gustan las cámaras, te quedás una hora sin darte cuenta. Los precios son de negocio de nicho, no de cadena.',

  'p-vent': 'Club de techno en Omotesando, interior de hormigón tipo Blade Runner y política estricta de no cámaras, que es parte de por qué la pista funciona. Traen buenos DJs. Quien lo recomendó lo pone bien arriba de todo.',

  'p-wako-ginza': 'El edificio de la torre del reloj sobre el cruce de Ginza Yonchome, de 1932: es el símbolo de Ginza y el reloj da la hora con campanadas. Adentro es una tienda de relojes y joyas carísima, aunque se puede entrar a mirar. La foto es de afuera.',

  'p-warp-shinjuku': 'Boliche grande de Shinjuku con temática espacial y varios pisos. A quien lo mandó le resultó apretado y saturado, así que va con esa advertencia puesta.',

  'p-wayanpuri-ginza': 'Head spa: te lavan y masajean la cabeza durante un buen rato, en penumbra, y salís sin saber muy bien qué día es. Es de esas cosas japonesas que no existen igual en ningún otro lado. Buen plan para bajar revoluciones a mitad del viaje.',

  'p-xu-osaka': 'Select shop de Umeda con marcas coreanas de street y y2k, tipo CRANK. Chica y de gusto específico. Cae en la vuelta de compras de Osaka.',

  'p-yanagawa': 'Pueblo de canales en Fukuoka donde se pasea en barcaza a remo entre muros de piedra, con el barquero cantando. Dura una hora y pico y termina en la zona de las anguilas, que es lo que se come ahí. Le dicen la Venecia de Kyushu, con toda la exageración que eso implica.',

  'p-yanaka-ginza': 'Calle comercial de barrio del viejo Tokio, de las pocas que quedaron intactas: pescadería, croquetas, gatos y una escalera con vista al atardecer. No hay atracción, hay clima. Va junto con el cementerio de Yanaka y los templos de alrededor.',

  'p-yoshida-shoten': 'Taller de Shibuya que hace lámparas de papel personalizadas: te escriben la palabra que quieras. Tardan alrededor de una semana, así que hay que encargarla al principio del viaje y pasarla a buscar antes de irse. Planificarlo es todo el truco.',

  'p-yoyogi-national-gymnasium': 'El estadio que Kenzo Tange hizo para los Juegos del 64: el techo cuelga de dos cables como si fuera un puente, y por dentro la curva no parece de un edificio. Es Bien Cultural Importante y se sigue usando, así que salvo que haya evento se ve por fuera. Está entre Harajuku y el parque Yoyogi.',

  'p-yoyogi-park': 'El parque grande al lado de Harajuku, donde Tokio va a no hacer nada: gente ensayando baile, perros, picnic. En otoño la avenida de ginkgos se pone amarilla. Se cruza yendo del santuario Meiji a Shibuya, así que cae solo.',

  'p-oedo-antique-market': 'El mercado de antigüedades al aire libre más grande del país: unos 250 puestos en la explanada del Tokyo International Forum, en Yurakucho. Cerámica, kimonos viejos, monedas, cosas raras. Se hace sólo dos veces al mes, así que hay que hacer coincidir la fecha.',

};
