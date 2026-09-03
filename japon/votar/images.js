/* images.js — galería de imágenes curadas por lugar (task 590, ampliado 591).
 *
 * Archivo CURADO A MANO, como descriptions.js: los generadores no lo tocan.
 * Cubre los lugares cuyo reel es multi-lugar y no los muestra (los que la 559
 * dejó con mini-mapa de fondo) y, desde la 591, los que sí embeben un video
 * multi-lugar pero cuyo poster estático muestra otro de los lugares del
 * roundup: acá cada uno tiene 2-4 imágenes que SÍ son el
 * lugar. La primera es el thumbnail de la card; el resto se pasa con la
 * galería (app.js).
 *
 * Fuentes: thumbs de Wikimedia Commons (hotlink estable, licencias libres —
 * el nombre del File: va al lado de cada URL) salvo Cat Cafe MOCHA, que no
 * está en Commons: esas se bajaron del sitio oficial a img/ y se sirven
 * locales. Un lugar que no está acá sigue como siempre (frame del reel o
 * mini-mapa).
 */
window.VOTAR_IMAGES = {
 "p-21-21-design-sight": [
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a3/21_21_DESIGN_SIGHT.jpg/960px-21_21_DESIGN_SIGHT.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:21 21 DESIGN SIGHT.jpg · CC BY-SA 3.0
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bb/21_21_DESIGN_SIGHT_-_Tokyo%2C_Japan_-_DSC06708.JPG/960px-21_21_DESIGN_SIGHT_-_Tokyo%2C_Japan_-_DSC06708.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:21 21 DESIGN SIGHT - Tokyo, Japan - DSC06708.JPG · CC0
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e6/21_21_DESIGN_SIGHT_Interior_2015.jpg/960px-21_21_DESIGN_SIGHT_Interior_2015.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:21 21 DESIGN SIGHT Interior 2015.jpg · CC BY-SA 4.0
 ],
 "p-21st-century-museum-of-contemporary-art": [
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b2/21st_Century_Museum_of_Contemporary_Art%2C_Kanazawa011.jpg/960px-21st_Century_Museum_of_Contemporary_Art%2C_Kanazawa011.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:21st Century Museum of Contemporary Art, Kanazawa011.jpg · CC BY 2.1 jp
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b5/21st_Century_Museum_Of_Contemporary_Art_Kanazawa_%28118930731%29.jpeg/960px-21st_Century_Museum_Of_Contemporary_Art_Kanazawa_%28118930731%29.jpeg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:21st Century Museum Of Contemporary Art Kanazawa (118930731).jpeg · CC BY-SA 3.0
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bf/21st_Century_Museum_of_Contemporary_Art%2C_Kanazawa001.jpg/960px-21st_Century_Museum_of_Contemporary_Art%2C_Kanazawa001.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:21st Century Museum of Contemporary Art, Kanazawa001.jpg · CC BY 2.1 jp
 ],
 "p-asakusa-hanayashiki": [
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1c/Asakusa_Hanayashiki_-01.jpg/960px-Asakusa_Hanayashiki_-01.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Asakusa Hanayashiki -01.jpg · CC BY-SA 3.0
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/84/Asakusa_Hanayashiki_-03.jpg/960px-Asakusa_Hanayashiki_-03.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Asakusa Hanayashiki -03.jpg · CC BY-SA 3.0
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/07/Asakusa_Hanayashiki_-04.jpg/960px-Asakusa_Hanayashiki_-04.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Asakusa Hanayashiki -04.jpg · CC BY-SA 3.0
 ],
 "p-benesse-house-museum": [
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7d/Benesse_Art_House_%286900628038%29.jpg/960px-Benesse_Art_House_%286900628038%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Benesse Art House (6900628038).jpg · CC BY-SA 2.0
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d6/Benesse_house03s3872.jpg/960px-Benesse_house03s3872.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Benesse house03s3872.jpg · CC BY 2.5
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ad/Benesse_house09s3200.jpg/960px-Benesse_house09s3200.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Benesse house09s3200.jpg · CC BY 2.5
 ],
 "p-cat-cafe-mocha": [
  "img/mocha-shibuya-1.jpg",  // catmocha.jp (sitio oficial, Shibuya) · official-site
  "img/mocha-shibuya-2.jpg",  // catmocha.jp (sitio oficial, Shibuya) · official-site
  "img/mocha-shibuya-3.jpg",  // catmocha.jp (sitio oficial, Shibuya) · official-site
 ],
 "p-chanel-ginza": [
  "https://upload.wikimedia.org/wikipedia/commons/3/3e/Chanel-Ginza.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",  // File:Chanel-Ginza.jpg · CC BY-SA 4.0
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8a/Retail_buildings_in_Ginza_20241021_%28II%29.jpg/960px-Retail_buildings_in_Ginza_20241021_%28II%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Retail buildings in Ginza 20241021 (II).jpg · CC BY 4.0
 ],
 "p-expo-70-commemorative-park": [
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e5/Chugoku-suita_IC.JPG/960px-Chugoku-suita_IC.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Chugoku-suita IC.JPG · CC BY-SA 3.0
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/aa/EXPO_%2770_PAVILION_bekkan_2.jpg/960px-EXPO_%2770_PAVILION_bekkan_2.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:EXPO '70 PAVILION bekkan 2.jpg · CC BY-SA 4.0
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e2/Osaka_20170221122249_%2842768659704%29.jpg/960px-Osaka_20170221122249_%2842768659704%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Osaka 20170221122249 (42768659704).jpg · CC BY 2.0
 ],
 "p-hama-rikyu-gardens": [
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/09/2019-09-06_Hama-riky%C5%AB_Garden_01.jpg/960px-2019-09-06_Hama-riky%C5%AB_Garden_01.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:2019-09-06 Hama-rikyū Garden 01.jpg · CC BY-SA 2.0
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/61/Hamarikyu_Garden_as_seen_from_Shiodome.jpg/960px-Hamarikyu_Garden_as_seen_from_Shiodome.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Hamarikyu Garden as seen from Shiodome.jpg · CC BY-SA 3.0
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/71/Cherry_blossom_in_Hama-rikyu_garden_in_Tokyo_3.jpg/960px-Cherry_blossom_in_Hama-rikyu_garden_in_Tokyo_3.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Cherry blossom in Hama-rikyu garden in Tokyo 3.jpg · CC BY-SA 4.0
 ],
 "p-haruki-murakami-library": [
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/df/The_Waseda_International_House_of_Literature.jpg/960px-The_Waseda_International_House_of_Literature.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:The Waseda International House of Literature.jpg · CC BY-SA 4.0
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e1/Waseda_International_House_of_Literature_interior_2024.jpg/960px-Waseda_International_House_of_Literature_interior_2024.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Waseda International House of Literature interior 2024.jpg · CC BY 4.0
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c0/Waseda_International_House_of_Literature_01.jpg/960px-Waseda_International_House_of_Literature_01.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Waseda International House of Literature 01.jpg · CC BY-SA 4.0
 ],
 "p-hiroshi-senju-museum": [
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/26/160729_Hiroshi_Senju_Museum_Karuizawa_Nagano_pref_Japan01bs5.jpg/960px-160729_Hiroshi_Senju_Museum_Karuizawa_Nagano_pref_Japan01bs5.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:160729 Hiroshi Senju Museum Karuizawa Nagano pref Japan01bs5.jpg · CC BY 2.5
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/39/221001_Hiroshi_Senju_Museum_Karuizawa_Nagano_pref_Japan02s3.jpg/960px-221001_Hiroshi_Senju_Museum_Karuizawa_Nagano_pref_Japan02s3.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:221001 Hiroshi Senju Museum Karuizawa Nagano pref Japan02s3.jpg · CC BY-SA 4.0
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/27/221001_Hiroshi_Senju_Museum_Karuizawa_Nagano_pref_Japan05s3.jpg/960px-221001_Hiroshi_Senju_Museum_Karuizawa_Nagano_pref_Japan05s3.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:221001 Hiroshi Senju Museum Karuizawa Nagano pref Japan05s3.jpg · CC BY-SA 4.0
 ],
 "p-hitachi-seaside-park": [
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a0/Nemophila_and_Ferris_Wheel_in_Hitachi_Seaside_Park.jpg/960px-Nemophila_and_Ferris_Wheel_in_Hitachi_Seaside_Park.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Nemophila and Ferris Wheel in Hitachi Seaside Park.jpg · CC BY-SA 4.0
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c5/2025_Hitachi_Seaside_Park_2.jpg/960px-2025_Hitachi_Seaside_Park_2.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:2025 Hitachi Seaside Park 2.jpg · CC BY-SA 4.0
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/34/2009-10-24_Hitachi_seaside_park_08.jpg/960px-2009-10-24_Hitachi_seaside_park_08.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:2009-10-24 Hitachi seaside park 08.jpg · CC BY 2.0
 ],
 "p-kabuki-za-theatre": [
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bd/2019_Kabuki-za.jpg/960px-2019_Kabuki-za.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:2019 Kabuki-za.jpg · CC BY-SA 4.0
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/20/Ginza_%288973975510%29.jpg/960px-Ginza_%288973975510%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Ginza (8973975510).jpg · CC BY 2.0
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2f/Kabuki-za_%2824403479843%29.jpg/960px-Kabuki-za_%2824403479843%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Kabuki-za (24403479843).jpg · CC BY-SA 2.0
 ],
 "p-kabukicho": [
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/af/Gate_of_Kabuki-cho_Ichiban-gai.jpg/960px-Gate_of_Kabuki-cho_Ichiban-gai.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Gate of Kabuki-cho Ichiban-gai.jpg · CC BY-SA 4.0
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a8/-i---i-_%2853076438633%29.jpg/960px--i---i-_%2853076438633%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:-i---i- (53076438633).jpg · Public domain
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c2/2018-1-22_tokyo_%2839837819961%29.jpg/960px-2018-1-22_tokyo_%2839837819961%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:2018-1-22 tokyo (39837819961).jpg · CC BY 2.0
 ],
 "p-kyocera-museum-of-art": [
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/63/Kyoto_Municipal_Museum_of_Art_1933_%E2%85%B1.jpg/960px-Kyoto_Municipal_Museum_of_Art_1933_%E2%85%B1.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Kyoto Municipal Museum of Art 1933 ⅱ.jpg · CC BY-SA 4.0
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/37/Kyoto_Heian-jingu_Gro%C3%9Fes_Torii_%26_St%C3%A4dtisches_Kunstmuseum.jpg/960px-Kyoto_Heian-jingu_Gro%C3%9Fes_Torii_%26_St%C3%A4dtisches_Kunstmuseum.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Kyoto Heian-jingu Großes Torii & Städtisches Kunstmuseum.jpg · CC BY-SA 4.0
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a1/Kyoto_20220528154500_%2852270534360%29.jpg/960px-Kyoto_20220528154500_%2852270534360%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Kyoto 20220528154500 (52270534360).jpg · CC BY 2.0
 ],
 "p-kyu-iwasaki-tei-gardens": [
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c8/%E6%97%A7%E5%B2%A9%E5%B4%8E%E9%82%B8%E5%BA%AD%E5%9C%92_%E5%8D%97%E5%81%B4.jpg/960px-%E6%97%A7%E5%B2%A9%E5%B4%8E%E9%82%B8%E5%BA%AD%E5%9C%92_%E5%8D%97%E5%81%B4.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:旧岩崎邸庭園 南側.jpg · CC BY-SA 4.0
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ab/Former_Iwasaki_Family_House_and_Garden_2010.jpg/960px-Former_Iwasaki_Family_House_and_Garden_2010.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Former Iwasaki Family House and Garden 2010.jpg · CC BY-SA 3.0
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/31/Kyu-Iwasaki-tei_Gardens_%40_Ueno_%2811096176376%29.jpg/960px-Kyu-Iwasaki-tei_Gardens_%40_Ueno_%2811096176376%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Kyu-Iwasaki-tei Gardens @ Ueno (11096176376).jpg · CC BY 2.0
 ],
 "p-meiji-jingu-museum": [
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/18/%E6%98%8E%E6%B2%BB%E7%A5%9E%E5%AE%AEIMG_20220129_04.jpg/960px-%E6%98%8E%E6%B2%BB%E7%A5%9E%E5%AE%AEIMG_20220129_04.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:明治神宮IMG 20220129 04.jpg · CC BY-SA 4.0
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ab/%E6%98%8E%E6%B2%BB%E7%A5%9E%E5%AE%AEIMG_20220129_10.jpg/960px-%E6%98%8E%E6%B2%BB%E7%A5%9E%E5%AE%AEIMG_20220129_10.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:明治神宮IMG 20220129 10.jpg · CC BY-SA 4.0
 ],
 "p-nezu-museum": [
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/31/2018_Nezu_Museum_2.jpg/960px-2018_Nezu_Museum_2.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:2018 Nezu Museum 2.jpg · CC BY-SA 4.0
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f1/Nezu_museum_entrance_tokyo_2014.jpg/960px-Nezu_museum_entrance_tokyo_2014.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Nezu museum entrance tokyo 2014.jpg · CC BY-SA 3.0
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/44/Nezu_Museum_Interior1_201805.jpg/960px-Nezu_Museum_Interior1_201805.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Nezu Museum Interior1 201805.jpg · CC BY-SA 4.0
 ],
 "p-nonbei-yokocho": [
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c0/Shibuya_%2852501034202%29.jpg/960px-Shibuya_%2852501034202%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Shibuya (52501034202).jpg · CC BY 2.0
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/69/Shibuya-Nonbe-Yokocho-02.jpg/960px-Shibuya-Nonbe-Yokocho-02.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Shibuya-Nonbe-Yokocho-02.jpg · CC BY-SA 3.0
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e7/Shibuya_Nonbei_Yokocho_%2853085175407%29.jpg/960px-Shibuya_Nonbei_Yokocho_%2853085175407%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Shibuya Nonbei Yokocho (53085175407).jpg · CC BY 2.0
 ],
 "p-reiyukai-shakaden-temple": [
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/45/Around_Azabudai_Hills.jpg/960px-Around_Azabudai_Hills.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Around Azabudai Hills.jpg · CC0
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9c/Reiyukai-Shakaden-01.jpg/960px-Reiyukai-Shakaden-01.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Reiyukai-Shakaden-01.jpg · CC BY-SA 3.0
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cb/Buildings_around_Roppongi_7.jpg/960px-Buildings_around_Roppongi_7.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Buildings around Roppongi 7.jpg · CC0
 ],
 "p-samurai-museum": [
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/65/Samurai_Museum_Tokyo_2017_2.jpg/960px-Samurai_Museum_Tokyo_2017_2.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Samurai Museum Tokyo 2017 2.jpg · CC BY 2.0
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/38/Representacion_de_Samurai._%22Museo_del_Samur%C3%A1i%22.jpg/960px-Representacion_de_Samurai._%22Museo_del_Samur%C3%A1i%22.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Representacion de Samurai. "Museo del Samurái".jpg · CC BY-SA 4.0
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c5/Samurai_Museum_Tokyo_2017_3.jpg/960px-Samurai_Museum_Tokyo_2017_3.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Samurai Museum Tokyo 2017 3.jpg · CC BY 2.0
 ],
 "p-senso-ji-temple": [
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/22/Sensoji_temple%2C_Asakusa%2C_Tokyo%2C_Japan.jpg/960px-Sensoji_temple%2C_Asakusa%2C_Tokyo%2C_Japan.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Sensoji temple, Asakusa, Tokyo, Japan.jpg · CC BY-SA 4.0
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/43/Sensoji_2023.jpg/960px-Sensoji_2023.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Sensoji 2023.jpg · CC0
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/de/Asakusa_-_Asakusa111.jpg/960px-Asakusa_-_Asakusa111.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Asakusa - Asakusa111.jpg · CC0
 ],
 "p-shibuya-sky": [
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3c/Shibuya_Scramble_Square_-_SHIBUYA_SKY_10.jpg/960px-Shibuya_Scramble_Square_-_SHIBUYA_SKY_10.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Shibuya Scramble Square - SHIBUYA SKY 10.jpg · CC BY-SA 4.0
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a1/Shibuya_Sky_Observation_Deck_%2853415730632%29.jpg/960px-Shibuya_Sky_Observation_Deck_%2853415730632%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Shibuya Sky Observation Deck (53415730632).jpg · CC BY 2.0
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/ff/Tokyo_Tower_and_Skyscrapers_from_Shibuya_Sky_Observation_Deck_%2853416648661%29.jpg/960px-Tokyo_Tower_and_Skyscrapers_from_Shibuya_Sky_Observation_Deck_%2853416648661%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Tokyo Tower and Skyscrapers from Shibuya Sky Observation Deck (53416648661).jpg · CC BY 2.0
 ],
 "p-shinjuku-gyoen-national-garden": [
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9d/Shinjuku_Gyoen_National_Garden_-_sakura_3.JPG/960px-Shinjuku_Gyoen_National_Garden_-_sakura_3.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Shinjuku Gyoen National Garden - sakura 3.JPG · CC BY-SA 3.0
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9c/Autumn_leaves_-_Shinjuku_gyoen_-_nov_2016.jpg/960px-Autumn_leaves_-_Shinjuku_gyoen_-_nov_2016.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Autumn leaves - Shinjuku gyoen - nov 2016.jpg · CC BY-SA 3.0
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/76/A_path_from_the_greenhouse_in_Shinjuku_Gyoen_National_Garden_in_Shinjuku%2C_Tokyo%2C_Japan%2C_2024_May.jpg/960px-A_path_from_the_greenhouse_in_Shinjuku_Gyoen_National_Garden_in_Shinjuku%2C_Tokyo%2C_Japan%2C_2024_May.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:A path from the greenhouse in Shinjuku Gyoen National Garden in Shinjuku, Tokyo, Japan, 2024 May.jpg · CC BY-SA 4.0
 ],
 "p-shinobazu-pond": [
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ea/%E4%B8%8D%E5%BF%8D%E6%B1%A0_-_panoramio.jpg/960px-%E4%B8%8D%E5%BF%8D%E6%B1%A0_-_panoramio.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:不忍池 - panoramio.jpg · CC BY 3.0
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/dd/Estanque_Shinobazu%2C_en_Tokio.jpg/960px-Estanque_Shinobazu%2C_en_Tokio.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Estanque Shinobazu, en Tokio.jpg · CC BY-SA 4.0
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/48/Hasuike_Shinobazu_No_Ike02bs3200.jpg/960px-Hasuike_Shinobazu_No_Ike02bs3200.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Hasuike Shinobazu No Ike02bs3200.jpg · CC BY 2.5
 ],
 "p-showa-kinen-park": [
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d3/2018_Showa_Memorial_Park_05.jpg/960px-2018_Showa_Memorial_Park_05.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:2018 Showa Memorial Park 05.jpg · CC BY-SA 4.0
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/08/Arctic_poppies_at_Showa_Memorial_Park.jpg/960px-Arctic_poppies_at_Showa_Memorial_Park.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Arctic poppies at Showa Memorial Park.jpg · CC BY 2.0
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/de/Showa_Commemorative_National_Government_Park_1.JPG/960px-Showa_Commemorative_National_Government_Park_1.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Showa Commemorative National Government Park 1.JPG · CC BY-SA 4.0
 ],
 "p-st-mary-s-cathedral-tokyo": [
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/32/2018_St._Mary%27s_Cathedral%2C_Tokyo_3.jpg/960px-2018_St._Mary%27s_Cathedral%2C_Tokyo_3.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:2018 St. Mary's Cathedral, Tokyo 3.jpg · CC BY-SA 4.0
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/22/20030702_2_July_2003_Tokyo_Cathedorale_3_Tange_Kenzou_Sekiguchi_Tokyo_Japan.jpg/960px-20030702_2_July_2003_Tokyo_Cathedorale_3_Tange_Kenzou_Sekiguchi_Tokyo_Japan.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:20030702 2 July 2003 Tokyo Cathedorale 3 Tange Kenzou Sekiguchi Tokyo Japan.jpg · CC BY-SA 3.0
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8a/20030702_2_July_2003_Tokyo_Cathedorale_2_Tange_Kenzou_Sekiguchi_Tokyo_Japan.jpg/960px-20030702_2_July_2003_Tokyo_Cathedorale_2_Tange_Kenzou_Sekiguchi_Tokyo_Japan.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:20030702 2 July 2003 Tokyo Cathedorale 2 Tange Kenzou Sekiguchi Tokyo Japan.jpg · CC BY-SA 3.0
 ],
 "p-taro-okamoto-memorial-museum": [
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/53/Taro_Okamoto_Memorial_Museum_Tokyo.jpg/960px-Taro_Okamoto_Memorial_Museum_Tokyo.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Taro Okamoto Memorial Museum Tokyo.jpg · CC BY-SA 3.0
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/82/Taro_Okamoto_Memorial_Museum.jpg/960px-Taro_Okamoto_Memorial_Museum.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Taro Okamoto Memorial Museum.jpg · CC0
 ],
 "p-teshima-art-museum": [
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1d/Teshima_Art_Museum_exterior_view_201310.jpg/960px-Teshima_Art_Museum_exterior_view_201310.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Teshima Art Museum exterior view 201310.jpg · CC BY 2.0
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/69/Teshima_Art_Museum_01.jpg/960px-Teshima_Art_Museum_01.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Teshima Art Museum 01.jpg · CC BY 2.0
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/08/Teshima_Art_Museum_-_panoramio.jpg/960px-Teshima_Art_Museum_-_panoramio.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Teshima Art Museum - panoramio.jpg · CC BY 3.0
 ],
 "p-the-national-art-center": [
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/af/2018_National_Art_Center%2C_Tokyo_2.jpg/960px-2018_National_Art_Center%2C_Tokyo_2.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:2018 National Art Center, Tokyo 2.jpg · CC BY-SA 4.0
  "https://upload.wikimedia.org/wikipedia/commons/3/37/Nac_tokyo.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",  // File:Nac tokyo.jpg · CC0
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/85/National_Art_Center_%40_Tokyo_%2811495203735%29.jpg/960px-National_Art_Center_%40_Tokyo_%2811495203735%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:National Art Center @ Tokyo (11495203735).jpg · CC BY 2.0
 ],
 "p-the-national-art-center-tokyo": [
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/af/2018_National_Art_Center%2C_Tokyo_2.jpg/960px-2018_National_Art_Center%2C_Tokyo_2.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:2018 National Art Center, Tokyo 2.jpg · CC BY-SA 4.0
  "https://upload.wikimedia.org/wikipedia/commons/3/37/Nac_tokyo.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",  // File:Nac tokyo.jpg · CC0
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/85/National_Art_Center_%40_Tokyo_%2811495203735%29.jpg/960px-National_Art_Center_%40_Tokyo_%2811495203735%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:National Art Center @ Tokyo (11495203735).jpg · CC BY 2.0
 ],
 "p-tokyo-metropolitan-government-building": [
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/96/Tokyo_Metropolitan_Government_Building_2024.jpg/960px-Tokyo_Metropolitan_Government_Building_2024.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Tokyo Metropolitan Government Building 2024.jpg · CC BY-SA 4.0
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a0/Fureai_dori_towards_Tokyo_Metropolitan_Government_in_Shinjuku%2C_Tokyo%2C_Japan%2C_2024_May.jpg/960px-Fureai_dori_towards_Tokyo_Metropolitan_Government_in_Shinjuku%2C_Tokyo%2C_Japan%2C_2024_May.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Fureai dori towards Tokyo Metropolitan Government in Shinjuku, Tokyo, Japan, 2024 May.jpg · CC BY-SA 4.0
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f4/Another_world_%2816611934747%29.jpg/960px-Another_world_%2816611934747%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Another world (16611934747).jpg · CC BY 2.0
 ],
 "p-tokyo-national-museum": [
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a5/Tokyo_National_Museum%2C_Honkan_2010.jpg/960px-Tokyo_National_Museum%2C_Honkan_2010.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Tokyo National Museum, Honkan 2010.jpg · CC BY-SA 3.0
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ef/2018_The_Gallery_of_Horyuji_Treasures_01.jpg/960px-2018_The_Gallery_of_Horyuji_Treasures_01.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:2018 The Gallery of Horyuji Treasures 01.jpg · CC BY-SA 4.0
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/21/Clay_statue%2C_late_Jomon_period.jpg/960px-Clay_statue%2C_late_Jomon_period.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Clay statue, late Jomon period.jpg · CC BY-SA 4.0
 ],
 "p-tokyo-skytree": [
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/64/Tokyo_Skytree_2023.jpg/960px-Tokyo_Skytree_2023.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Tokyo Skytree 2023.jpg · CC0
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/13/Canal_%40_Tokyo_Skytree_%2814044445548%29.jpg/960px-Canal_%40_Tokyo_Skytree_%2814044445548%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Canal @ Tokyo Skytree (14044445548).jpg · CC BY 2.0
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/85/20240117_Tokyo_Skytree_10.35.39.jpg/960px-20240117_Tokyo_Skytree_10.35.39.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:20240117 Tokyo Skytree 10.35.39.jpg · CC0
 ],
 "p-ueno-park": [
  "https://upload.wikimedia.org/wikipedia/commons/9/9b/UenoPark_Hanami.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",  // File:UenoPark Hanami.jpg · CC BY-SA 3.0
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a6/Five-storied_Pagoda_-_Kan%27ei-ji.jpg/960px-Five-storied_Pagoda_-_Kan%27ei-ji.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Five-storied Pagoda - Kan'ei-ji.jpg · CC BY-SA 4.0
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/67/Hanazono-Inari-jinja_%28Ueno%29.jpg/960px-Hanazono-Inari-jinja_%28Ueno%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Hanazono-Inari-jinja (Ueno).jpg · CC BY-SA 2.0
 ],
 "p-ueno-toshogu-shrine": [
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/52/2019-09-03_Ueno_T%C5%8Dsh%C5%8D-g%C5%AB.jpg/960px-2019-09-03_Ueno_T%C5%8Dsh%C5%8D-g%C5%AB.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:2019-09-03 Ueno Tōshō-gū.jpg · CC BY-SA 2.0
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/59/Ueno_T%C5%8Dsh%C5%8D-g%C5%AB_DSC02777.JPG/960px-Ueno_T%C5%8Dsh%C5%8D-g%C5%AB_DSC02777.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Ueno Tōshō-gū DSC02777.JPG · CC BY-SA 3.0
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bd/Toshogu_Shrine_%40_Ueno_Park_%2811096076266%29.jpg/960px-Toshogu_Shrine_%40_Ueno_Park_%2811096076266%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Toshogu Shrine @ Ueno Park (11096076266).jpg · CC BY 2.0
 ],
 "p-wako-ginza": [
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b7/170312_Ginza_Tokyo_Japan01s3.jpg/960px-170312_Ginza_Tokyo_Japan01s3.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:170312 Ginza Tokyo Japan01s3.jpg · CC BY-SA 4.0
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/83/Ginza_4-Chome_Crossing_2020-04-19.jpg/960px-Ginza_4-Chome_Crossing_2020-04-19.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Ginza 4-Chome Crossing 2020-04-19.jpg · CC0
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7d/170312_Ginza_Tokyo_Japan02s3.jpg/960px-170312_Ginza_Tokyo_Japan02s3.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:170312 Ginza Tokyo Japan02s3.jpg · CC BY-SA 4.0
 ],
 "p-yanaka-ginza": [
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/94/Yanaka_Ginza_%2852492088947%29.jpg/960px-Yanaka_Ginza_%2852492088947%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Yanaka Ginza (52492088947).jpg · CC BY 2.0
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/63/Entrance_of_Y%C5%AByake_Dandan.png/960px-Entrance_of_Y%C5%AByake_Dandan.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Entrance of Yūyake Dandan.png · CC BY 4.0
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/70/Twilight_Yanaka%2C_Tokyo.jpg/960px-Twilight_Yanaka%2C_Tokyo.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Twilight Yanaka, Tokyo.jpg · CC BY-SA 3.0
 ],
 "p-yoyogi-national-gymnasium": [
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/95/Gym_stadium_%40_Harajuku_%288972770585%29.jpg/960px-Gym_stadium_%40_Harajuku_%288972770585%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Gym stadium @ Harajuku (8972770585).jpg · CC BY 2.0
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/60/Views_from_Shibuya_Scramble_Square_20200113-2.jpg/960px-Views_from_Shibuya_Scramble_Square_20200113-2.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Views from Shibuya Scramble Square 20200113-2.jpg · CC BY-SA 4.0
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b5/Constru%C3%A7%C3%A3o_em_Shibuya.jpg/960px-Constru%C3%A7%C3%A3o_em_Shibuya.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Construção em Shibuya.jpg · CC0
 ],
 "p-yoyogi-park": [
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8d/Fallinyoyogipark-nov30-2014.jpg/960px-Fallinyoyogipark-nov30-2014.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Fallinyoyogipark-nov30-2014.jpg · CC BY-SA 4.0
  "https://upload.wikimedia.org/wikipedia/commons/4/47/Bridge_Yoyogipark.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",  // File:Bridge Yoyogipark.JPG · CC BY 3.0
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/dd/Cherry_blossom_at_Yoyogi_Park_during_covid-19_2.jpg/960px-Cherry_blossom_at_Yoyogi_Park_during_covid-19_2.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Cherry blossom at Yoyogi Park during covid-19 2.jpg · CC0
 ],

 /* ---- Ronda 2 del scope (task 591): cards cuyo reel multi-lugar SÍ las
    muestra en video (showsEach) pero cuyo poster de embed —lo único estático
    que se ve antes del play— es de otro de los lugares del roundup (el caso
    Yanagawa, que el filtro geográfico dejó afuera). Con galería curada el
    thumbnail es una foto real del lugar y el poster ajeno nunca es lo primero
    que se ve. Clubs y talleres sin Commons: fotos de su sitio oficial en
    img/ (mismo criterio que Cat Cafe MOCHA). */
 "p-atom-tokyo": [
  "img/atom-shibuya-1.jpg",  // atom-tokyo.com (sitio oficial, main floor) · official-site
  "img/atom-shibuya-2.jpg",  // atomshibuya.com (sitio oficial, VIP) · official-site
 ],
 "p-baia": [
  "img/baia-shibuya-1.jpg",  // baiatokyo.com (sitio oficial, corredor de entrada) · official-site
  "img/baia-shibuya-2.jpg",  // baiatokyo.com (sitio oficial, lounge) · official-site
 ],
 "p-club-harlem": [
  "img/harlem-shibuya-1.jpg",  // harlem.co.jp (sitio oficial, show en el escenario) · official-site
  "img/harlem-shibuya-2.jpg",  // harlem.co.jp (sitio oficial, banda en vivo) · official-site
 ],
 "p-karaki-mokkou": [
  "img/karaki-kawagoe-1.jpg",  // karakimokkou.com (sitio oficial, muestrario de ohashi) · official-site
  "img/karaki-kawagoe-2.jpg",  // karakimokkou.com (sitio oficial, banco de trabajo) · official-site
 ],
 "p-kichijoji": [
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/06/%E5%90%89%E7%A5%A5%E5%AF%BA%E3%82%B5%E3%83%B3%E3%83%AD%E3%83%BC%E3%83%89%E5%95%86%E5%BA%97%E8%A1%97_%E5%90%89%E7%A5%A5%E5%AF%BA%E9%A7%85%E5%81%B4_%282025%E5%B9%B4%29.jpg/960px-%E5%90%89%E7%A5%A5%E5%AF%BA%E3%82%B5%E3%83%B3%E3%83%AD%E3%83%BC%E3%83%89%E5%95%86%E5%BA%97%E8%A1%97_%E5%90%89%E7%A5%A5%E5%AF%BA%E9%A7%85%E5%81%B4_%282025%E5%B9%B4%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:吉祥寺サンロード商店街 吉祥寺駅側 (2025年).jpg · CC0
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5e/Gate_of_the_Kichijoji_Sunroad_at_Night.jpg/960px-Gate_of_the_Kichijoji_Sunroad_at_Night.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Gate of the Kichijoji Sunroad at Night.jpg · CC BY-SA 4.0
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8d/Kichijoji_%E5%90%89%E7%A5%A5%E5%AF%BA_%2850683311408%29.jpg/960px-Kichijoji_%E5%90%89%E7%A5%A5%E5%AF%BA_%2850683311408%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Kichijoji 吉祥寺 (50683311408).jpg · CC BY-SA 2.0
 ],
 "p-mitsuki": [
  "img/mitsuki-shibuya-1.jpg",  // mitsuki-tokyo.com (sitio oficial, la luna de la entrada) · official-site
  "img/mitsuki-shibuya-2.jpg",  // mitsuki-tokyo.com (sitio oficial, cabina y barra) · official-site
 ],
 "p-nakameguro": [
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1e/Nakameguro_at_hanami_season_10.jpg/960px-Nakameguro_at_hanami_season_10.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Nakameguro at hanami season 10.jpg · CC0
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/54/River_in_Nakameguro_4.jpg/960px-River_in_Nakameguro_4.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:River in Nakameguro 4.jpg · CC0
 ],
 "p-oh-jo-building": [
  "https://upload.wikimedia.org/wikipedia/commons/6/67/Kabukicho_royal_castle_building_2008_may.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",  // File:Kabukicho royal castle building 2008 may.jpg · CC BY 3.0 — única foto libre del 王城ビル
 ],
 "p-rainbow-bridge": [
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bd/Rainbow_Bridge%2C_Tokyo%2C_West_view_20190419_1.jpg/960px-Rainbow_Bridge%2C_Tokyo%2C_West_view_20190419_1.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Rainbow Bridge, Tokyo, West view 20190419 1.jpg · CC BY-SA 4.0
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/25/Rainbow_Bridge%2C_Tokyo_20201112.jpg/960px-Rainbow_Bridge%2C_Tokyo_20201112.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Rainbow Bridge, Tokyo 20201112.jpg · CC BY-SA 4.0
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f2/Rainbow_Bridge%2C_Tokyo%2C_South_view_from_Odaiba_20190419_1.jpg/960px-Rainbow_Bridge%2C_Tokyo%2C_South_view_from_Odaiba_20190419_1.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Rainbow Bridge, Tokyo, South view from Odaiba 20190419 1.jpg · CC BY-SA 4.0
 ],
 "p-todoroki-valley": [
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b9/Todoroki_Valley_%E7%AD%89%E3%80%85%E5%8A%9B%E6%B8%93%E8%B0%B7_-_panoramio.jpg/960px-Todoroki_Valley_%E7%AD%89%E3%80%85%E5%8A%9B%E6%B8%93%E8%B0%B7_-_panoramio.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Todoroki Valley 等々力渓谷 - panoramio.jpg · CC BY 3.0
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/95/Fudo_no_Taki_-_Todoroki_Valley_-_Tokyo%2C_Japan_-_DSC09502.jpg/960px-Fudo_no_Taki_-_Todoroki_Valley_-_Tokyo%2C_Japan_-_DSC09502.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Fudo no Taki - Todoroki Valley - Tokyo, Japan - DSC09502.jpg · CC0
 ],
 "p-togoshi-ginza": [
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e5/Togoshi_Ginza_at_Night.jpg/960px-Togoshi_Ginza_at_Night.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Togoshi Ginza at Night.jpg · CC BY 2.0
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f7/Togoshi_ginza_2005_aug.jpg/960px-Togoshi_ginza_2005_aug.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",  // File:Togoshi ginza 2005 aug.jpg · CC BY-SA 3.0
 ],
 "p-vent": [
  "img/vent-omotesando-1.jpg",  // vent-tokyo.net (sitio oficial, el sound system) · official-site
  "img/vent-omotesando-2.jpg",  // vent-tokyo.net (sitio oficial, subwoofers) · official-site
 ],
 "p-warp-shinjuku": [
  "img/warp-shinjuku-1.jpg",  // warp-shinjuku.jp (sitio oficial, main floor) · official-site
  "img/warp-shinjuku-2.jpg",  // warp-shinjuku.jp (sitio oficial, segunda sala) · official-site
  "img/warp-shinjuku-3.jpg",  // warp-shinjuku.jp (sitio oficial, barra) · official-site
 ],
};
