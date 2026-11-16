import { localCommonsFile } from "../../../lib/media/local-media";
// Content for "The autumn table". Every photograph is from Wikimedia Commons with its author
// and licence recorded below; captions describe what the photograph actually shows. Seasonal
// customs are presented as customs ("in parts of China", "a folk saying"), not as health claims.

export type Photo = { file: string; caption: string; author: string; license: string; licenseUrl: string; page: string; width: number; height: number };

const commons = (file: string) => `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(file)}?width=1920`;
// Served from Savora's own copy when mirrored (scripts/localize-commons-media.mjs).
export const photoSrc = (photo: Photo) => localCommonsFile(photo.file, commons(photo.file));

export const PHOTOS = {
  hero: { file: "Hanging Hachiya Persimmons to become Hoshigaki.jpg", caption: "Persimmons hung to dry into hoshigaki, Japan", author: "Tachikoma805", license: "CC BY 3.0", licenseUrl: "https://creativecommons.org/licenses/by/3.0", page: "https://commons.wikimedia.org/wiki/File:Hanging_Hachiya_Persimmons_to_become_Hoshigaki.jpg", width: 3445, height: 2587 },
  pork: { file: "Red braised pork (20141106191221).JPG", caption: "Red-braised pork, Shanghai style", author: "N509FZ", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", page: "https://commons.wikimedia.org/wiki/File:Red_braised_pork_(20141106191221).JPG", width: 2592, height: 1936 },
  tongsui: { file: "Mango pudding and a papaya and white fungus tong sui from Gong He Guan dessert shop, Chinatown, Singapore - 20140215.jpg", caption: "Papaya and white fungus sweet soup, Singapore", author: "RM Bulseco", license: "CC BY 2.0", licenseUrl: "https://creativecommons.org/licenses/by/2.0", page: "https://commons.wikimedia.org/wiki/File:Mango_pudding_and_a_papaya_and_white_fungus_tong_sui_from_Gong_He_Guan_dessert_shop,_Chinatown,_Singapore_-_20140215.jpg", width: 1200, height: 799 },
  crab: { file: "Shanghai hairy crab (4178989634).jpg", caption: "Steamed hairy crab, Shanghai", author: "Kentaro Iemoto", license: "CC BY-SA 2.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0", page: "https://commons.wikimedia.org/wiki/File:Shanghai_hairy_crab_(4178989634).jpg", width: 2100, height: 1400 },
  chestnuts: { file: "Sugar-roasted chestnuts (1).jpg", caption: "Sugar-roasted chestnuts", author: "Fumikas Sagisavas", license: "CC0", licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/", page: "https://commons.wikimedia.org/wiki/File:Sugar-roasted_chestnuts_(1).jpg", width: 4000, height: 3000 },
  persimmon: { file: "柿饼.jpg", caption: "Dried persimmons for sale in Wandong Village, Huizhou", author: "Mx. Granger", license: "CC0", licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/", page: "https://commons.wikimedia.org/wiki/File:%E6%9F%BF%E9%A5%BC.jpg", width: 4096, height: 3072 },
  mooncake: { file: "WING WAH LOTUS SEED PASTE MOONCAKE (2).jpg", caption: "Lotus-seed paste mooncake with salted egg yolk", author: "Dinkun Chen", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", page: "https://commons.wikimedia.org/wiki/File:WING_WAH_LOTUS_SEED_PASTE_MOONCAKE_(2).jpg", width: 8192, height: 5464 },
  songpyeon: { file: "Songpyeon.jpg", caption: "Songpyeon, Korean half-moon rice cakes", author: "wizdata", license: "CC0", licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/", page: "https://commons.wikimedia.org/wiki/File:Songpyeon.jpg", width: 4000, height: 3236 },
  matsutake: { file: "Matsutake gohan (2016-11-29) 01.jpg", caption: "Matsutake rice with ginkgo nuts", author: "Lombroso", license: "CC0", licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/", page: "https://commons.wikimedia.org/wiki/File:Matsutake_gohan_(2016-11-29)_01.jpg", width: 3264, height: 2448 },
  federweisser: { file: "Federweisser and Zwiebelkuchen.jpg", caption: "Federweißer and Zwiebelkuchen", author: "Illustratedjc", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", page: "https://commons.wikimedia.org/wiki/File:Federweisser_and_Zwiebelkuchen.jpg", width: 4000, height: 6016 },
  truffle: { file: "White truffles from Alba.jpg", caption: "White truffles from Alba", author: "Kent Wang", license: "CC BY-SA 2.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0", page: "https://commons.wikimedia.org/wiki/File:White_truffles_from_Alba.jpg", width: 5472, height: 3648 },
  panDeMuerto: { file: "Pan de muerto en ofrenda.jpg", caption: "Pan de muerto on an ofrenda", author: "JMndz", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", page: "https://commons.wikimedia.org/wiki/File:Pan_de_muerto_en_ofrenda.jpg", width: 6000, height: 4000 },
  pumpkinPie: { file: "Thanksgiving Pumpkin Pie New Orleans 2021 - The pie.jpg", caption: "Pumpkin pie for Thanksgiving, New Orleans", author: "Infrogmation of New Orleans", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", page: "https://commons.wikimedia.org/wiki/File:Thanksgiving_Pumpkin_Pie_New_Orleans_2021_-_The_pie.jpg", width: 3945, height: 3054 },
} satisfies Record<string, Photo>;

export type SolarTerm = { hanzi: string; pinyin: string; name: string; date: string; food: string };

/** The six autumn terms. Dates shift by a day from year to year, so they are given as "around". */
export const SOLAR_TERMS: SolarTerm[] = [
  { hanzi: "立秋", pinyin: "Lìqiū", name: "Start of Autumn", date: "Around 7 August", food: "Braised meat to “put on autumn weight”, and watermelon to “bite the autumn”." },
  { hanzi: "处暑", pinyin: "Chǔshǔ", name: "End of Heat", date: "Around 23 August", food: "Duck, in many northern households, as the last heat breaks." },
  { hanzi: "白露", pinyin: "Báilù", name: "White Dew", date: "Around 7 September", food: "Longan in Fuzhou; clear sweet soups against the dry air." },
  { hanzi: "秋分", pinyin: "Qiūfēn", name: "Autumn Equinox", date: "Around 23 September", food: "Harvest celebrations, and in Lingnan a soup of wild autumn greens." },
  { hanzi: "寒露", pinyin: "Hánlù", name: "Cold Dew", date: "Around 8 October", food: "Chrysanthemums open and freshwater crabs are at their fullest." },
  { hanzi: "霜降", pinyin: "Shuāngjiàng", name: "Frost’s Descent", date: "Around 23 October", food: "Persimmons, eaten fresh or dried for winter." },
];

export type Chapter = { id: string; nav: string; place: string; title: string; body: string; fact: string; photo: Photo; action: string; href: string; tone: "pork" | "pear" | "crab" | "chestnut" | "persimmon" };

export const CHAPTERS: Chapter[] = [
  {
    id: "liqiu", nav: "Liqiu", place: "China · Liqiu", tone: "pork", photo: PHOTOS.pork,
    title: "After summer, the table puts on autumn weight.",
    body: "Liqiu, the Start of Autumn, arrives in early August while the heat has barely loosened. In northern China, families mark it with tiē qiū biāo, “putting on autumn fat”: braised pork and other rich dishes that make up for a long summer of light eating.",
    fact: "In parts of China people also “bite the autumn” at Liqiu, eating watermelon to see the summer off.",
    action: "Find braised pork recipes", href: "/explore?q=pork",
  },
  {
    id: "bailu", nav: "Bailu", place: "China · Bailu", tone: "pear", photo: PHOTOS.tongsui,
    title: "Fruit and white fungus soften the season’s dry air.",
    body: "White Dew signals cooler mornings. Across Chinese dessert traditions, pear or papaya joins tremella, red dates, lotus seeds, or rock sugar in clear sweet soups—a gentle response to a season increasingly described as dry.",
    fact: "In Fuzhou, longan is the fruit of White Dew, eaten as the harvest reaches its peak.",
    action: "Explore pear dishes", href: "/explore?q=pear",
  },
  {
    id: "hanlu", nav: "Hanlu", place: "China · Hanlu", tone: "crab", photo: PHOTOS.crab,
    title: "Chrysanthemums open, and crabs come to the table.",
    body: "By Cold Dew, chrysanthemum shows fill parks and temple courtyards, and the freshwater crabs of the lower Yangtze are at their best. Holding a crab claw while admiring chrysanthemums has been a scholar’s pleasure for centuries, with ginger and vinegar to balance the rich roe.",
    fact: "An old saying advises female crabs in the ninth lunar month, when their roe is fullest, and males in the tenth.",
    action: "Find crab recipes", href: "/explore?q=crab",
  },
  {
    id: "chestnuts", nav: "Chestnuts", place: "Beijing · Late autumn", tone: "chestnut", photo: PHOTOS.chestnuts,
    title: "Chestnuts warm the street before they reach the kitchen.",
    body: "By Cold Dew, paper bags of sugar-roasted chestnuts become hand warmers as much as snacks. Their glossy shells and toasted sweetness also move indoors—into braises, rice, poultry, and cakes built for longer evenings.",
    fact: "Street vendors roast chestnuts in woks of hot dark sand mixed with sugar, which gives the shells their shine.",
    action: "Search chestnut recipes", href: "/explore?q=chestnut",
  },
  {
    id: "shuangjiang", nav: "Shuangjiang", place: "China · Shuangjiang", tone: "persimmon", photo: PHOTOS.persimmon,
    title: "Persimmon holds the last orange light of the season.",
    body: "At Frost’s Descent the persimmons are ripe, and a folk saying promises that eating one will keep colds away all winter. Fruit that cannot be eaten fresh is peeled and dried into shìbǐng, pressed flat until a white bloom of natural sugar forms on the skin.",
    fact: "Japan dries persimmons too: hoshigaki hang on strings and are gently massaged every few days as they dry.",
    action: "Follow persimmon", href: "/explore?q=persimmon",
  },
];

export type WorldTable = { id: string; place: string; when: string; title: string; body: string; photo: Photo; action?: string; href?: string };

export const WORLD_TABLES: WorldTable[] = [
  { id: "japan", place: "Japan", when: "September–November", title: "Aki no mikaku, the tastes of autumn", photo: PHOTOS.matsutake, action: "Enter the Japan exhibition", href: "/stories/regions/japan",
    body: "Japan has a phrase for the season’s flavours: aki no mikaku. Matsutake perfumes rice and clear soup, grilled sanma arrives with grated daikon, and ginkgo nuts and chestnuts turn up everywhere." },
  { id: "germany", place: "Germany", when: "September–October", title: "New wine and onion tart", photo: PHOTOS.federweisser,
    body: "In German wine regions, the first partly fermented wine of the harvest, Federweißer, is sold for just a few weeks. It is drunk young and cloudy, almost always with warm Zwiebelkuchen, an onion and bacon tart." },
  { id: "italy", place: "Italy · Piedmont", when: "October–December", title: "The white truffle of Alba", photo: PHOTOS.truffle,
    body: "Truffle hunters and their dogs search the oak and poplar woods around Alba, whose white truffle fair runs through the autumn. The truffle is never cooked: it is shaved raw over buttered tajarin or a fried egg." },
  { id: "mexico", place: "Mexico", when: "1–2 November", title: "Bread for the Day of the Dead", photo: PHOTOS.panDeMuerto,
    body: "For Día de Muertos, families build ofrendas for those who have died, with marigolds, photographs and favourite foods. Pan de muerto, scented with orange blossom and topped with dough shaped like bones, is placed on the altar and shared." },
  { id: "north-america", place: "Canada · United States", when: "October–November", title: "A harvest pie", photo: PHOTOS.pumpkinPie,
    body: "Canada gives thanks for the harvest on the second Monday of October, the United States on the fourth Thursday of November. Pumpkin pie, spiced with cinnamon, ginger and nutmeg, closes both tables." },
];

export const FACTS = [
  "Since 2018, China has celebrated its Farmers’ Harvest Festival on the Autumn Equinox.",
  "Matsutake cannot be farmed. It grows only with the roots of living pine trees, which is why it is foraged and costly.",
  "South of the equator, autumn runs from March to May, so Argentina and Chile celebrate their grape harvest in March.",
];

export const QUIZ = {
  question: "In much of China, which fruit belongs to Frost’s Descent?",
  options: ["Watermelon", "Longan", "Persimmon", "Lychee"],
  answer: "Persimmon",
  right: "Right. Persimmons ripen as the first frost arrives.",
  wrong: "Not quite. Watermelon belongs to the Start of Autumn and longan to White Dew; lychee is a summer fruit. The answer is persimmon.",
};

export const READING = [
  { label: "The Twenty-Four Solar Terms · UNESCO ↗", href: "https://ich.unesco.org/en/RL/the-twenty-four-solar-terms-knowledge-in-china-of-time-and-practices-developed-through-observation-of-the-sun-s-annual-motion-00647" },
];
