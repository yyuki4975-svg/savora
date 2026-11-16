import { localCommonsFile } from "../lib/media/local-media";
export type CultureMedia = {
  src: string;
  alt: string;
  credit: string;
  source: string;
};

function commons(file: string, alt: string): CultureMedia {
  const encoded = encodeURIComponent(file).replaceAll("%2F", "/");
  return {
    src: localCommonsFile(file, `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encoded}?width=1600`),
    alt,
    credit: "Wikimedia Commons contributor · license on source page",
    source: `https://commons.wikimedia.org/wiki/File:${encoded}`,
  };
}

/**
 * Five place-specific culture images per premium recipe. The recipe photograph is
 * appended as the sixth chapter in the carousel, so no chapter repeats an image.
 */
const cultureImagePools: Record<string, CultureMedia[]> = {
  ramen: [
    commons("Tokyo Ramen Street in First Avenue Tokyo Station 01.jpg", "Tokyo Ramen Street inside Tokyo Station."),
    commons("Ramen shop by ngader in Tsukiji, Tokyo.jpg", "A ramen shop in Tokyo's Tsukiji district."),
    commons("Eating ramen at outdoor table by ngader in Tsukiji, Tokyo.jpg", "Diners eating ramen at an outdoor table in Tsukiji."),
    commons("Tachi-gúi ramen 2014 (14327023280).jpg", "A standing ramen counter in Tokyo."),
    commons("Yarō Ramen, Akihabara main shop, 3-2-11 Sotokanda (野郎ラーメン 秋葉原総本店, 外神田3-2-11) (2022-03-30 18.50.22 by DLKR).jpg", "A ramen shopfront in Akihabara, Tokyo."),
  ],
  carbonara: [
    commons("Campo dei Fiori.jpg", "The Campo de' Fiori market in Rome."),
    commons("Campo de' Fiori street market 2016 - 12.jpg", "A produce stall at Campo de' Fiori in Rome."),
    commons("Spice market in Campo de' Fiori square - Rome, Italy.jpg", "Spices displayed at Campo de' Fiori."),
    commons("Prepared food display in an Italian deli in Rome.jpg", "Prepared foods in a Roman delicatessen."),
    commons("Bosc pears in Rome's farmers market.jpg", "Seasonal produce at a farmers market in Rome."),
  ],
  "butter-chicken": [
    commons("20191205 Spice market, Old Delhi 0711 6764.jpg", "The spice market of Old Delhi."),
    commons("A market in Chandni Chowk, Delhi.JPG", "The dense lanes of Chandni Chowk market in Delhi."),
    commons("Shop selling spices, at Khari Baoli, Old Delhi.jpg", "A spice shop in Khari Baoli, Old Delhi."),
    commons("Spice Box -2 (6922905007).jpg", "A traditional Indian spice box."),
    commons("Preparing Paranthas in ghee in Paranthe Wali Gali, Delhi, India.jpg", "Flatbreads cooking in ghee in Old Delhi."),
  ],
  "tacos-al-pastor": [
    commons("Al pastor (41223713980).jpg", "Al pastor meat cooking on a vertical spit in Mexico City."),
    commons("Puestos de tacos afuera de la Arena México 01.jpg", "Taco stalls outside Arena México."),
    commons("Street taco stall in Mexico City.jpg", "A street taco stall in Mexico City."),
    commons("Tortillas (5469343283).jpg", "Fresh tortillas prepared for tacos."),
    commons("Tacos al pastor - taquería Los Güeros de Boturini.jpg", "A taquería serving tacos al pastor in Mexico City."),
  ],
  ratatouille: [
    commons("Cours Saleya flower market vegetable stalls Nice 2026.JPG", "Vegetable stalls at Nice's Cours Saleya market."),
    commons("Cours Saleya market fruit stalls Nice 2026.JPG", "Fruit stalls at Cours Saleya in Nice."),
    commons("Dried fruits shop in the Saleya market in Nice.jpg", "Dried fruit at the Saleya market."),
    commons("Fruits shop in the Saleya market in Nice.jpg", "A fruit shop at Cours Saleya."),
    commons("France-002482 - Market Day in Nice (15721359589).jpg", "Market day in Nice, Provence."),
  ],
  "mapo-tofu": [
    commons("China - Chengdu 5 - vegetable market (135953962).jpg", "A vegetable market in Chengdu."),
    commons("Chengdu hot pot.jpg", "A Chengdu hot pot table."),
    commons("Chengdu Zhong Dumpling(Zhong Jiaozi).jpg", "Zhong dumplings from Chengdu."),
    commons("Meat Dishes 荤菜 - 麻辣火锅 Sichuan Hotpot (1648200823).jpg", "A Sichuan hot pot in Chengdu."),
    commons("Vegetable, Dried Pea and Bone Marrow Soup - Chen's Mapo Tofu (1483820732).jpg", "A Chengdu restaurant table with regional dishes."),
  ],
  kebab: [
    commons("Grilling kebabs in Adana.jpg", "Kebabs grilling over charcoal in Adana."),
    commons("Adana kebap 2024.jpg", "Adana kebap served with its accompaniments."),
    commons("Adana kebab with bulgur.jpg", "Adana kebab with bulgur and vegetables."),
    commons("Green Almonds, Kozan 01.JPG", "Green almonds from Adana Province."),
    commons("Şırdan adana 2022.jpg", "A street-food specialty from Adana."),
  ],
  tagine: [
    commons("Spice market in Marrakech, 20250125 1116 7196.jpg", "A spice market in Marrakech."),
    commons("Spices in Jemaa Al Fna.jpg", "Spices displayed in Jemaa el-Fnaa."),
    commons("Spices in Marrakech.jpg", "Colorful spices in a Marrakech market."),
    commons("Spice Market, Marakech (2242330035).jpg", "A spice merchant in Marrakech."),
    commons("Moroccan herbs.JPG", "Herbs used in Moroccan cooking."),
  ],
  feijoada: [
    commons("Feijoada Vila da Penha Rio de Janeiro Brazil Food Largo do Bicao.JPG", "Feijoada served in Rio de Janeiro."),
    commons("Rio-de-Janeiro-panorama.jpg", "A panorama of Rio de Janeiro."),
    commons("Feijoada à brasileira.jpg", "A Brazilian feijoada table."),
    commons("Feijoada 01.jpg", "Beans and accompaniments served as feijoada."),
    commons("Feijoada (Brazilian dish), São Luís, Maranhão.jpg", "Feijoada with rice, greens and orange slices in São Luís, Maranhão."),
  ],
  "green-curry": [
    commons("Bangkok market P1130011.JPG", "A food market in Bangkok."),
    commons("A man prepares food in a market in Bangkok, Thailand.jpg", "A cook preparing food at a Bangkok market."),
    commons("Red and green peppers on sale in Bangkok.jpg", "Fresh peppers at a Bangkok market."),
    commons("Thai curry paste at the market so good I brought some home (3195324838).jpg", "Thai curry paste at a market."),
    commons("Bangkok fruit stall.jpg", "A tropical fruit stall in Bangkok."),
  ],
  bibimbap: [
    commons("Bibimbap in Jeonju.jpg", "Bibimbap served in Jeonju."),
    commons("Korea-Jeonju-Bibimbap festival-01.jpg", "The Jeonju Bibimbap Festival."),
    commons("Jeonju-bibim-bap and kongnamul-guk.png", "Jeonju bibimbap with bean sprout soup."),
    commons("Bibimbap (8111593238).jpg", "A bowl of bibimbap with arranged vegetables."),
    commons("Korean cuisine-Hwangpomuk-01.jpg", "Hwangpomuk, a Jeonju regional ingredient."),
  ],
  pho: [
    commons("Street vendor pho ga Hanoi.jpg", "A pho ga street vendor in Hanoi."),
    commons("Street food preparation in Hanoi (49356318418).jpg", "Street-food preparation in Hanoi."),
    commons("Street food - Hanoi (15657896380).jpg", "A Hanoi street-food stall."),
    commons("Street markets, Urban Discovery Tour, Hanoi (7060671921).jpg", "A street market in Hanoi."),
    commons("Street fruit vendor in Hanoi, 9 March 2019.jpg", "A fruit vendor on a Hanoi street."),
  ],
  paella: [
    commons("Paddy field Albufera.jpg", "Rice fields in Valencia's Albufera."),
    commons("Albufera Rice Paddy.jpg", "A rice paddy in the Albufera wetlands."),
    commons("Paella a la leña en Valencia.jpg", "Paella cooking over wood fire in Valencia."),
    commons("074 Paelles d'arròs al Mercat Central de València.jpg", "Rice dishes at Valencia's Central Market."),
    commons("03 paella hirviendo con romero.jpg", "Valencian paella simmering with rosemary."),
  ],
  moussaka: [
    commons("Preparing musaka.jpg", "Preparing the layers of moussaka."),
    commons("Sliced eggplant.JPG", "Sliced eggplant ready for cooking."),
    commons("Moussaka and Greek Salad at a taverna in Greece.jpg", "Moussaka served at a Greek taverna."),
    commons("Greece Food Moussaka.JPG", "A baked Greek moussaka."),
    commons("Grekiska koket 01.jpg", "A table of Greek dishes."),
  ],
  rendang: [
    commons("Rumah Gadang in Padang Panjang.jpg", "A Minangkabau rumah gadang in West Sumatra."),
    commons("Rendang daging sapi asli Padang.JPG", "A bowl of beef rendang with ketupat rice cakes behind it."),
    commons("Nasi Padang.jpg", "A spread of Minangkabau dishes."),
    commons("Sate padang.jpg", "Sate Padang from West Sumatra."),
    commons("Makan bajamba.jpg", "A Minangkabau communal meal."),
  ],
};

export function cultureImagePoolFor(slug: string) {
  return cultureImagePools[slug] ?? [];
}
