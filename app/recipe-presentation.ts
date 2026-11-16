import type { Locale } from "./i18n";

/** Presentation only: accepted source text and version digests remain untouched. */
export function recipeSummaryForDisplay(text: string, english: string, locale: string = "en") {
  if (!/imported from TheMealDB for editorial review/i.test(english)) return text;
  // A few accepted fallback fields are still English even in a target-language DTO.
  if (/imported from TheMealDB for editorial review/i.test(text)) return text.replace(/,?\s*imported from TheMealDB for editorial review\.?$/iu, "").replace(/[.]?$/u, ".");
  if (locale === "ja" && /(?:編集レビュー|エディトリアルレビュー)のためにTheMealDBからインポートされた/u.test(text)) {
    return text.replace(/(?:編集レビュー|エディトリアルレビュー)のためにTheMealDBからインポートされた[、,]?/u, "").replace(/関連付けられ、/u, "関連付けられた");
  }
  const tails: Record<string, RegExp> = {
    en: /,?\s*imported from TheMealDB for editorial review\.?$/iu,
    zh: /[，,。]?\s*(?:从|由|自)?\s*TheMealDB[^。]*编辑[^。]*[。.]?$/u,
    ja: /[、,]?\s*(?:編集[^。]*TheMealDB|TheMealDB[^。]*編集)[^。]*。?$/u,
    fr: /,?\s*importée?s?\s+(?:de|depuis|à partir de)\s+TheMealDB[^.]*\.?$/iu,
    it: /,?\s*importat[oaie]\s+da\s+TheMealDB[^.]*\.?$/iu,
    es: /,?\s*importad[oa]s?\s+(?:de|desde)\s+TheMealDB[^.]*\.?$/iu,
  };
  const clean = text.replace(tails[locale] ?? tails.en, "").trim();
  if (clean === text.trim()) return clean;
  if (locale === "ja") return clean.replace(/で$/u, "です").replace(/[、,]$/u, "") + "。";
  return clean.replace(/[，,。.]$/u, "") + (locale === "zh" ? "。" : ".");
}

/** Remove a tools preamble only where that exact English step has one. */
export function methodForDisplay(text: string, english: string) {
  if (!/^Equipment:\s*[^.]+\.\s*/iu.test(english)) return text;
  return text.replace(/^(?:Equipment|Équipement|Matériel|Material|Attrezzatura|Equipo|Utensilios|Equipamiento|设备|器具|厨具|用具|工具|設備|調理器具|用意する道具|道具)\s*[:：]\s*[^.。]+[.。]\s*/iu, "");
}

// Six-column editorial dictionary. No provider request, no translated-text inference.
const rows = {
  measures: "Measuring cups and spoons|量杯和量匙|計量カップと計量スプーン|Verres et cuillères doseurs|Misurini e cucchiai dosatori|Tazas y cucharas medidoras",
  knife: "Kitchen knife|厨刀|包丁|Couteau de cuisine|Coltello da cucina|Cuchillo de cocina",
  board: "Cutting board|砧板|まな板|Planche à découper|Tagliere|Tabla de cortar",
  seafoodBoard: "Separate cutting board for raw seafood|生海鲜专用砧板|生の魚介用のまな板|Planche réservée aux fruits de mer crus|Tagliere separato per il pesce crudo|Tabla separada para mariscos crudos",
  bowl: "Mixing bowl|搅拌碗|ボウル|Saladier|Ciotola|Bol para mezclar",
  dryBowl: "Dry mixing bowl|干燥的搅拌碗|乾いたボウル|Saladier sec|Ciotola asciutta|Bol seco",
  shallowBowl: "Shallow bowl|浅碗|浅いボウル|Bol peu profond|Ciotola bassa|Bol poco profundo",
  pan: "Frying pan|平底锅|フライパン|Poêle|Padella|Sartén",
  nonstickPan: "Nonstick frying pan|不粘平底锅|フッ素加工のフライパン|Poêle antiadhésive|Padella antiaderente|Sartén antiadherente",
  heavyPan: "Heavy skillet|厚底平底锅|厚手のフライパン|Poêle à fond épais|Padella dal fondo spesso|Sartén de fondo grueso",
  grillPan: "Heavy skillet or grill pan|厚底平底锅或条纹煎锅|厚手のフライパンまたはグリルパン|Poêle épaisse ou poêle-gril|Padella pesante o bistecchiera|Sartén gruesa o parrilla de cocina",
  wok: "Wok or large frying pan|炒锅或大平底锅|中華鍋または大きなフライパン|Wok ou grande poêle|Wok o padella grande|Wok o sartén grande",
  pot: "Cooking pot|汤锅|鍋|Marmite|Pentola|Olla",
  liddedPot: "Large pot or wok with a lid|带盖大锅或炒锅|蓋付きの大鍋または中華鍋|Grande marmite ou wok avec couvercle|Pentola grande o wok con coperchio|Olla grande o wok con tapa",
  saucepan: "Saucepan|小汤锅|片手鍋|Casserole|Pentolino|Cazo",
  liddedSaucepan: "Saucepan with a lid|带盖小汤锅|蓋付きの片手鍋|Casserole avec couvercle|Pentolino con coperchio|Cazo con tapa",
  liddedPan: "Frying pan with a lid|带盖平底锅|蓋付きのフライパン|Poêle avec couvercle|Padella con coperchio|Sartén con tapa",
  casserole: "Ovenproof casserole with a lid|带盖耐烤炖锅|蓋付きのオーブン対応鍋|Cocotte avec couvercle allant au four|Casseruola con coperchio adatta al forno|Cazuela con tapa apta para horno",
  oven: "Oven|烤箱|オーブン|Four|Forno|Horno",
  tray: "Baking tray|烤盘|天板|Plaque de cuisson|Teglia|Bandeja de horno",
  nonstickTray: "Nonstick baking tray|不粘烤盘|くっつきにくい天板|Plaque de cuisson antiadhésive|Teglia antiaderente|Bandeja antiadherente",
  roastingTray: "Rimmed roasting tray|带边烤盘|縁付きのロースト用天板|Plat à rôtir à rebords|Teglia da arrosto con bordi|Bandeja de asar con bordes",
  rackTray: "Rack and rimmed roasting tray|烤架和带边烤盘|網と縁付きの天板|Grille et plat à rôtir à rebords|Griglia e teglia da arrosto con bordi|Rejilla y bandeja de asar con bordes",
  bakingDish: "Ovenproof baking dish|耐烤烤皿|耐熱皿|Plat allant au four|Pirofila|Fuente apta para horno",
  loafPan: "Loaf pan|长条面包模具|パウンド型|Moule à cake|Stampo da plumcake|Molde rectangular",
  cakeTin: "Cake tin|蛋糕模具|ケーキ型|Moule à gâteau|Tortiera|Molde para pastel",
  microwave: "Microwave|微波炉|電子レンジ|Four à micro-ondes|Forno a microonde|Microondas",
  microwaveDish: "Microwave-safe dish|微波炉适用容器|電子レンジ対応の容器|Récipient adapté au micro-ondes|Recipiente adatto al microonde|Recipiente apto para microondas",
  mitts: "Oven gloves|隔热手套|オーブンミトン|Gants de cuisine|Guanti da forno|Guantes de horno",
  foil: "Aluminium foil|铝箔|アルミホイル|Papier aluminium|Foglio di alluminio|Papel de aluminio",
  rack: "Cooling rack|冷却架|ケーキクーラー|Grille de refroidissement|Griglia di raffreddamento|Rejilla para enfriar",
  spoon: "Spoon|勺子|スプーン|Cuillère|Cucchiaio|Cuchara",
  woodenSpoon: "Wooden spoon|木勺|木べら|Cuillère en bois|Cucchiaio di legno|Cuchara de madera",
  stirringSpoon: "Stirring spoon|搅拌勺|混ぜるためのスプーン|Cuillère pour mélanger|Cucchiaio per mescolare|Cuchara para remover",
  slottedSpoon: "Slotted spoon|漏勺|穴あきお玉|Écumoire|Schiumarola|Espumadera",
  spatula: "Spatula|锅铲|ヘラ|Spatule|Spatola|Espátula",
  whisk: "Whisk|打蛋器|泡立て器|Fouet|Frusta|Batidor",
  fork: "Fork|叉子|フォーク|Fourchette|Forchetta|Tenedor",
  tongs: "Kitchen tongs|厨房夹|トング|Pince de cuisine|Pinze da cucina|Pinzas de cocina",
  colander: "Colander|沥水篮|ざる|Passoire|Scolapasta|Escurridor",
  strainer: "Fine-mesh strainer|滤网|こし器|Passoire fine|Colino|Colador fino",
  cocktailStrainer: "Cocktail strainer|滤冰器|カクテル用ストレーナー|Passoire à cocktail|Colino da cocktail|Colador de coctelería",
  rollingPin: "Rolling pin|擀面杖|麺棒|Rouleau à pâtisserie|Mattarello|Rodillo",
  blender: "Blender|搅拌机|ミキサー|Mixeur|Frullatore|Licuadora",
  blenderProcessor: "Blender or food processor|搅拌机或食品料理机|ミキサーまたはフードプロセッサー|Mixeur ou robot culinaire|Frullatore o robot da cucina|Licuadora o procesador de alimentos",
  grater: "Grater|擦丝器|おろし器|Râpe|Grattugia|Rallador",
  thermometer: "Food thermometer|食品温度计|料理用温度計|Thermomètre alimentaire|Termometro per alimenti|Termómetro de cocina",
  steamer: "Steamer rack or basket|蒸架或蒸篮|蒸し台または蒸し器|Grille ou panier vapeur|Griglia o cestello per cottura a vapore|Rejilla o cesta para cocinar al vapor",
  brush: "Pastry or basting brush|食品刷|料理用の刷毛|Pinceau de cuisine|Pennello da cucina|Brocha de cocina",
  cleanBrush: "Clean basting brush|干净的食品刷|清潔な料理用の刷毛|Pinceau de cuisine propre|Pennello da cucina pulito|Brocha de cocina limpia",
  breadKnife: "Bread knife|面包刀|パン切り包丁|Couteau à pain|Coltello da pane|Cuchillo de pan",
  pizzaCutter: "Pizza cutter or knife|披萨刀或厨刀|ピザカッターまたは包丁|Roulette à pizza ou couteau|Rotella per pizza o coltello|Cortapizzas o cuchillo",
  plate: "Clean serving plate|干净的餐盘|清潔な盛り付け皿|Assiette de service propre|Piatto da portata pulito|Plato limpio para servir",
  saladPlate: "Salad plates|沙拉盘|サラダ用の皿|Assiettes à salade|Piatti da insalata|Platos para ensalada",
  saladBowl: "Salad bowls|沙拉碗|サラダボウル|Bols à salade|Ciotole da insalata|Boles para ensalada",
  glass: "Clean serving glass|干净的饮用杯|清潔なグラス|Verre de service propre|Bicchiere da servizio pulito|Vaso limpio para servir",
  jigger: "Jigger or graduated measure|量酒器或刻度量杯|ジガーまたは目盛り付き計量器|Jigger ou verre mesureur gradué|Jigger o misurino graduato|Jigger o vaso medidor graduado",
  barSpoon: "Bar spoon|吧勺|バースプーン|Cuillère de bar|Cucchiaio da bar|Cuchara de bar",
  shaker: "Cocktail shaker or leakproof food-safe container|调酒壶或防漏食品级容器|シェーカーまたは漏れない食品用容器|Shaker ou récipient alimentaire étanche|Shaker o contenitore alimentare a tenuta|Coctelera o recipiente alimentario hermético",
  mixingGlass: "Mixing glass|调酒杯|ミキシンググラス|Verre à mélange|Bicchiere per miscelare|Vaso mezclador",
  muddler: "Muddler|捣棒|ペストル|Pilon à cocktail|Pestello da cocktail|Mortero para cócteles",
  container: "Airtight container|密封容器|密閉容器|Récipient hermétique|Contenitore ermetico|Recipiente hermético",
  fridgeContainer: "Covered refrigerator container|带盖冷藏容器|蓋付きの冷蔵用容器|Récipient couvert pour le réfrigérateur|Contenitore con coperchio per frigorifero|Recipiente con tapa para refrigerar",
  crabTools: "Crab crackers or kitchen shears|蟹钳夹或厨房剪刀|カニ用クラッカーまたはキッチンばさみ|Pince à crustacés ou ciseaux de cuisine|Pinza per crostacei o forbici da cucina|Pinzas para cangrejo o tijeras de cocina",
  toaster: "Toaster|烤面包机|トースター|Grille-pain|Tostapane|Tostadora",
  ladle: "Ladle|汤勺|お玉|Louche|Mestolo|Cucharón",
  grill: "Grill or barbecue|烤架或烧烤炉|グリルまたはバーベキューコンロ|Gril ou barbecue|Griglia o barbecue|Parrilla o barbacoa",
  pressureCooker: "Pressure cooker|压力锅|圧力鍋|Autocuiseur|Pentola a pressione|Olla a presión",
  slowCooker: "Slow cooker|慢炖锅|スロークッカー|Mijoteuse|Pentola a cottura lenta|Olla de cocción lenta",
  doubleBoiler: "Double boiler or saucepan with a heatproof bowl|双层隔水锅或小锅配耐热碗|湯せん鍋または鍋と耐熱ボウル|Bain-marie ou casserole avec un bol résistant à la chaleur|Bagnomaria o pentolino con ciotola resistente al calore|Baño maría o cazo con bol resistente al calor",
  deepFryer: "Deep heavy pot or deep fryer|深厚底锅或炸锅|深い厚手の鍋またはフライヤー|Marmite profonde à fond épais ou friteuse|Pentola profonda dal fondo spesso o friggitrice|Olla profunda de fondo grueso o freidora",
  skewers: "Wooden skewers|竹签或木签|木製の串|Brochettes en bois|Spiedini di legno|Brochetas de madera",
  masher: "Potato masher|土豆压泥器|ポテトマッシャー|Presse-purée|Schiacciapatate|Prensapapas",
} as const;
export type EquipmentKey = keyof typeof rows;
export type EquipmentItem = { key: EquipmentKey; count?: number } | { key: "named"; name: string; count?: never };
const locales = ["en", "zh", "ja", "fr", "it", "es"];
export function equipmentNameLabel(name: string, locale: Locale) {
  if (locale === "en") return name;
  return reviewedEquipmentNames[name.trim().replace(/\s+/gu, " ").toLowerCase()]?.[locales.indexOf(locale) - 1] ?? name;
}
export function equipmentLabel(item: EquipmentItem, locale: Locale) {
  if (item.key === "named") return equipmentNameLabel(item.name, locale);
  const columns = rows[item.key].split("|");
  const reviewed = equipmentNameLabel(columns[0], locale);
  const label = reviewed === columns[0] && locale !== "en" ? columns[locales.indexOf(locale)] : reviewed;
  return item.count ? `${item.count} × ${label}` : label;
}

const aliases: Array<[EquipmentKey, RegExp]> = [
  ["seafoodBoard", /separate raw-seafood cutting board/], ["board", /^(?:clean )?(?:cutting )?board$/],
  ["dryBowl", /^dry mixing bowl$/], ["shallowBowl", /^shallow mixing bowl$/], ["bowl", /^(?:clean |mixing )?bowls?$/],
  ["saladBowl", /^salad bowls$/], ["saladPlate", /^salad plates$/],
  ["breadKnife", /^bread knife$/], ["pizzaCutter", /^pizza cutter or knife$/], ["knife", /^knife$/],
  ["casserole", /^lidded ovenproof casserole$/], ["liddedPot", /^large lidded pot or wok$/],
  ["liddedPan", /^lidded skillet$/], ["liddedSaucepan", /^small lidded saucepan$/],
  ["grillPan", /^heavy skillet or grill pan$/], ["heavyPan", /^heavy skillet$/], ["wok", /^wok or large skillet$/],
  ["nonstickPan", /^nonstick pan$/], ["pan", /^(?:(?:small|large) )?(?:skillet|frying pan|sauté pan)$/],
  ["saucepan", /^(?:(?:small|large) )?saucepan$/], ["oven", /^(?:home )?oven$/],
  ["rackTray", /^rack and rimmed roasting tin$/], ["roastingTray", /^(?:deep roasting tin|rimmed roasting tray)$/],
  ["nonstickTray", /^nonstick baking tray$/], ["tray", /^(?:metal )?baking tray$/],
  ["bakingDish", /^small ovenproof baking dish$/], ["loafPan", /^loaf pan$/], ["microwaveDish", /^microwave-safe dish$/],
  ["mitts", /^oven gloves$/], ["foil", /^foil$/], ["rack", /^rack$/], ["measures", /^measuring cups$/],
  ["jigger", /^measuring jigger or graduated measure$/], ["glass", /^clean serving glass$/], ["plate", /^clean serving plate$/],
  ["shaker", /^cocktail shaker or leakproof food-safe container$/], ["barSpoon", /^bar spoon$/],
  ["mixingGlass", /^mixing glass$/], ["muddler", /^muddler$/], ["blenderProcessor", /^blender or food processor$/],
  ["blender", /^blender$/], ["thermometer", /^food thermometer$/], ["crabTools", /^crab crackers or kitchen shears$/],
  ["fridgeContainer", /^covered refrigerator container$/], ["container", /^airtight container$/], ["cleanBrush", /^clean basting brush$/],
  ["brush", /^brush$/], ["colander", /^colander$/], ["rollingPin", /^rolling pin$/], ["steamer", /^steamer rack$/],
  ["slottedSpoon", /^slotted spoon$/], ["woodenSpoon", /^wooden spoon$/], ["spoon", /^spoon$/],
  ["fork", /^forks?$/], ["spatula", /^spatula$/], ["whisk", /^whisk$/], ["tongs", /^tongs$/],
  ["strainer", /^strainer$/], ["toaster", /^toaster$/],
];

export function explicitEquipment(steps: string[]): EquipmentItem[] | null {
  const preamble = steps.join("\n").match(/(?:^|\n)Equipment:\s*([^.]+)\./iu);
  if (!preamble) return null;
  const cocktail = /\b(?:measuring jigger|cocktail shaker|mixing glass)\b/iu.test(preamble[1]);
  const items = preamble[1].split(";").map(label => {
    let normalized = label.trim().toLowerCase();
    // This imported entry is a purchased food base, already in ingredients.
    if (normalized === "deep nine-ounce commercial crumb crust") return null;
    if (normalized === "strainer" && cocktail) return { key: "cocktailStrainer" } as EquipmentItem;
    const countWords: Record<string, number> = { two: 2, three: 3, four: 4 };
    const count = normalized.match(/^(two|three|four) /)?.[1];
    if (count) normalized = normalized.slice(count.length + 1);
    const key = aliases.find(([, pattern]) => pattern.test(normalized))?.[0];
    if (key && count) return { key, count: countWords[count] } as EquipmentItem;
    // Keep explicit names, sizes and alternatives. One unfamiliar tool must not
    // discard the whole source checklist and trigger guesses from the method.
    return { key: "named", name: label.trim() } as EquipmentItem;
  });
  return items.filter((item): item is EquipmentItem => item !== null);
}

/** Infer a preparation checklist from English methods, never from ingredient translations.
 * This is a display aid, not an editor-verified new method or a database mutation.
 */
export function recipeEquipment(steps: string[], preparationNotes: string[] = []): EquipmentItem[] {
  const explicit = explicitEquipment(steps);
  if (explicit) return explicit;
  const method = steps.join(" ");
  const prep = [method, ...preparationNotes].join(" ");
  const keys = new Set<EquipmentKey>(["measures"]);
  const add = (key: EquipmentKey, pattern: RegExp, text = method) => { if (pattern.test(text)) keys.add(key); };
  if (/\b(?:chop\w*|mince\w*|dic\w*|slic\w*|peel\w*|trim\w*|cut\w*)\b/iu.test(prep)) { keys.add("knife"); keys.add("board"); }
  add("bowl", /\bbowls?\b/iu);
  add("bowl", /\b(?:mix|combine|beat|whisk) (?:all |the |together )?(?:ingredients|wet ingredients|dry ingredients|eggs?|cream|flour|fruit|spice mix)\b/iu);
  add("nonstickPan", /\bnon[- ]?stick (?:pan|skillet)\b/iu);
  add("pan", /\b(?:skillet|frying pan|saut[ée] (?:pan|\w+ in a pan)|saut[ée]pan)\b/iu);
  add("pot", /\b(?:stockpot|saucepot|pot|boil\w* (?:a pot of|water))\b/iu);
  add("saucepan", /\bsaucepan\b/iu);
  add("casserole", /\bcasserole\b/iu);
  const positiveTools = method.replace(/\b(?:do not|don't|never)\s+(?:use|cook in|cook with)\s+(?:an?\s+)?(?:electric\s+)?pressure cooker\b/giu, "")
    .replace(/\bnon[- ]pressure\s+(?:rice\s+)?cooker\b/giu, "");
  add("pressureCooker", /\b(?:pressure cooker|instant pot|high pressure)\b/iu, positiveTools);
  add("slowCooker", /\b(?:slow cooker|crock[- ]?pot)\b/iu);
  add("doubleBoiler", /\bdouble boiler\b/iu);
  if (/\b(?:deep[- ]fry|deep fryer|fryer|deep,? hot fat|hot oil \(365|oil[^.]*365\s*°)\b/iu.test(method)) { keys.add("deepFryer"); keys.add("thermometer"); }
  if (!keys.has("pot") && !keys.has("saucepan") && !keys.has("pressureCooker")) add("pot", /\b(?:boil(?:ing)?|simmer(?:ing)?)\b/iu);
  add("liddedPan", /\b(?:pan|skillet)\b[^.]*\b(?:cover|lid)\b/iu);
  add("wok", /\bwok\b/iu);
  if (/\b(?:oven|bake|baking|roast)\b/iu.test(method.replace(/\b(?:no[- ]bake|baked beans|baking (?:powder|soda)|oven (?:mitts|gloves))\b/giu, ""))) {
    keys.add("oven"); keys.add("mitts");
    if (/\b(?:brais\w*|casserole|ovenproof pan)\b/iu.test(method)) keys.add("casserole");
    else if (/\b(?:loaf (?:pan|tin)|bread (?:pan|tin))\b/iu.test(method)) keys.add("loafPan");
    else if (/\b(?:cake (?:pan|tin)|springform)\b/iu.test(method)) keys.add("cakeTin");
    else if (/\b(?:baking dish|ovenproof dish|bakeware)\b/iu.test(method)) keys.add("bakingDish");
    else keys.add("tray");
  }
  if (/\bmicrowave\b/iu.test(method)) { keys.add("microwave"); keys.add("microwaveDish"); }
  add("whisk", /\b(?:whisk\w*|beat (?:the )?(?:eggs?|batter|cream))\b/iu);
  add("stirringSpoon", /\bstir\w*\b/iu);
  add("woodenSpoon", /\bwooden spoon\b/iu);
  add("spatula", /\b(?:flip\w*|spatula|turn (?:the )?(?:pancakes?|omelette))\b/iu);
  add("fork", /\bfork\b/iu);
  add("tongs", /\btongs\b/iu);
  add("colander", /\bcolander\b|\bdrain\w*\b[^.]*\b(?:pasta|noodles|spaghetti)\b|\b(?:pasta|noodles|spaghetti)\b[^.]*\bdrain\w*\b/iu);
  if (/\b(?:pasta|noodles|spaghetti)\b/iu.test(method) && /\bdrain\b/iu.test(method)) keys.add("colander");
  add("strainer", /\b(?:strain\w*|sieve|sift\w*)\b/iu);
  add("rollingPin", /\b(?:rolling pin|roll (?:the (?:dough|pastry) )?out|roll out (?:the )?(?:dough|pastry))\b/iu);
  add("blenderProcessor", /\b(?:blender|food processor|immersion blender)\b/iu);
  add("grater", /\b(?:grat\w*|zest\w*)\b/iu, prep);
  add("steamer", /\b(?:steam (?:the |in )|steamer|steam basket)\b/iu);
  add("thermometer", /\b(?:thermometer|internal temperature|thickest part[^.]*\d+\s*°|reaches?\s+(?:74|75|165)\s*°)\b/iu);
  add("ladle", /\bladle\b/iu);
  add("skewers", /\bskewers?\b/iu);
  add("masher", /\bmash(?:er|ed)?\b/iu);
  add("glass", /\b(?:glasses|serving glass|glass|serving cup)\b/iu);
  add("spoon", /\b(?:spoon|scoop|tablespoon at a time)\b/iu);
  add("brush", /\bbrush\w*\b/iu);
  add("grill", /\b(?:barbecue|grill (?:the |over |on ))\b/iu);
  add("plate", /\b(?:plate|platter)\b/iu);
  // Generic pan actions otherwise omitted by legacy sources (e.g. "heat oil in a pan").
  if (!keys.has("pan") && !keys.has("nonstickPan") && !keys.has("saucepan") && !keys.has("casserole")) add("pan", /\bpan\b/iu);
  if (keys.has("nonstickPan") || keys.has("liddedPan") || keys.has("wok")) keys.delete("pan");
  if (keys.has("casserole")) keys.delete("liddedPan");
  return [...keys].map(key => ({ key }));
}

const copyRows = {
  equipment: "Equipment|厨具|調理器具|Matériel|Attrezzatura|Utensilios",
  source: "Recipe source|食谱来源|レシピの出典|Source de la recette|Fonte della ricetta|Fuente de la receta",
  recipe: "Recipe|食谱|レシピ|Recette|Ricetta|Receta",
  image: "Image|图片|画像|Image|Immagine|Imagen",
  generated: "AI-generated image|AI 生成图片|AI生成画像|Image générée par IA|Immagine generata con IA|Imagen generada por IA",
  adaptations: "Formatting and safety notes adapted by Savora. Recipe text retains its source license.|Savora 调整了排版和安全提示，食谱正文沿用来源许可。|Savoraが書式と安全上の注意を調整しました。本文には出典のライセンスが適用されます。|Savora a adapté la mise en forme et les consignes de sécurité. Le texte conserve sa licence d’origine.|Savora ha adattato la formattazione e le note di sicurezza. Il testo conserva la licenza originale.|Savora ha adaptado el formato y las notas de seguridad. El texto conserva su licencia original.",
  resized: "Image resized and compressed for display.|图片经缩放和压缩用于展示。|表示用に画像のサイズと圧縮率を調整しています。|Image redimensionnée et compressée pour l’affichage.|Immagine ridimensionata e compressa per la visualizzazione.|Imagen redimensionada y comprimida para su visualización.",
  originalImage: "Original image|图片原始来源|元の画像|Image originale|Immagine originale|Imagen original",
  back: "Back to recipe|返回食谱|レシピに戻る|Retour à la recette|Torna alla ricetta|Volver a la receta",
} as const;
export type RecipeLabelKey = keyof typeof copyRows;
export function recipeLabel(key: RecipeLabelKey, locale: Locale) { return copyRows[key].split("|")[locales.indexOf(locale)]; }

export function safeSourceUrl(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : undefined; }
  catch { return undefined; }
}

const numberWords: Record<string, number> = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, fifteen: 15, twenty: 20, thirty: 30, forty: 40, "forty-five": 45, sixty: 60 };
const writtenTime = /\b(\d+(?:[.,]\d+)?|an?|one|two|three|four|five|six|seven|eight|nine|ten|fifteen|twenty|thirty|forty-five|forty|sixty)(?:\s*(?:-|–|to|or)\s*(\d+(?:[.,]\d+)?))?\s*(?:more\s+)?(minutes?|mins?|hours?|hrs?)\b/giu;

/**
 * Total time for the recipe header. Stated prep + cook time wins, then stated step durations;
 * otherwise the durations written in the method are added up and marked as an estimate.
 * Returns null when nothing is stated anywhere, so the page never invents a time.
 */
export function recipeTime(stated: { preparationMinutes?: number | string | null; cookingMinutes?: number | string | null; stepMinutes?: Array<number | string | null> }, method: string[]): { minutes: number; estimated: boolean } | null {
  const statedTotal = Number(stated.preparationMinutes ?? 0) + Number(stated.cookingMinutes ?? 0);
  if (statedTotal > 0) return { minutes: statedTotal, estimated: false };
  const stepTotal = (stated.stepMinutes ?? []).reduce<number>((total, value) => total + Number(value ?? 0), 0);
  if (stepTotal > 0) return { minutes: stepTotal, estimated: false };
  let written = 0;
  for (const match of method.join(" ").matchAll(writtenTime)) {
    const raw = (match[2] ?? match[1]).toLowerCase();
    const value = Number(raw.replace(",", ".")) || numberWords[raw] || 0;
    written += /^h/iu.test(match[3]) ? value * 60 : value;
  }
  if (written <= 0) return null;
  return { minutes: written > 30 ? Math.round(written / 5) * 5 : Math.round(written), estimated: true };
}

export function formatRecipeMinutes(minutes: number) {
  if (minutes >= 1440) { const days = Math.round(minutes / 1440); return `${days} ${days === 1 ? "day" : "days"}`; }
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60), rest = minutes % 60;
  return rest ? `${hours} hr ${rest} min` : `${hours} hr`;
}

// Source-bound, personally reviewed names. No runtime translation request.
const reviewedEquipmentNames: Record<string, readonly string[]> = {
  "12-hole muffin pan": [
    "12孔马芬烤盘",
    "12個用マフィン型",
    "moule à muffins 12 empreintes",
    "teglia per muffin a 12 scomparti",
    "molde para 12 magdalenas"
  ],
  "18 cm springform cake pan": [
    "18厘米可拆侧圈蛋糕模",
    "18cmスプリングフォーム型",
    "moule à charnière de 18 cm",
    "tortiera a cerniera da 18 cm",
    "molde desmontable de 18 cm"
  ],
  "19 cm square baking tin": [
    "19厘米方形蛋糕烤模",
    "19cm角型焼き型",
    "moule carré de 19 cm",
    "teglia quadrata da 19 cm",
    "molde cuadrado para hornear de 19 cm"
  ],
  "2 deep serving bowls": [
    "2只深口盛菜碗",
    "深めのラーメン鉢2個",
    "2 grands bols profonds pour servir",
    "2 ciotole da portata profonde",
    "2 tazones hondos para servir"
  ],
  "2 sheet pans": [
    "2个烤盘",
    "天板2枚",
    "2 plaques de cuisson",
    "2 teglie da forno",
    "2 bandejas de horno"
  ],
  "20 cm square cake tin": [
    "20厘米方形蛋糕模",
    "20cm角型ケーキ型",
    "moule à gâteau carré de 20 cm",
    "tortiera quadrata da 20 cm",
    "molde cuadrado para tarta de 20 cm"
  ],
  "23 × 30 cm baking dish": [
    "23×30厘米烤皿",
    "23×30cm耐熱焼き型",
    "plat de cuisson de 23 × 30 cm",
    "pirofila da 23 × 30 cm",
    "fuente para horno de 23 × 30 cm"
  ],
  "23 × 33 cm baking dish": [
    "23×33厘米烤皿",
    "23×33cm耐熱焼き型",
    "plat de cuisson de 23 × 33 cm",
    "pirofila da 23 × 33 cm",
    "fuente para horno de 23 × 33 cm"
  ],
  "23 cm ovenproof pie pan": [
    "23厘米可入烤箱的派盘",
    "23cmオーブン対応パイ皿",
    "plat à tarte résistant au four de 23 cm",
    "teglia da torta resistente al forno da 23 cm",
    "molde para tarta apto para horno de 23 cm"
  ],
  "38 cm paellera with manufacturer-approved stable heating source": [
    "38厘米西班牙米饭锅，配制造商认可且能稳固支撑的热源",
    "メーカー認定の安定熱源付き38cmパエリア鍋",
    "poêle à paella de 38 cm avec une source de chaleur stable approuvée par le fabricant",
    "padella per paella da 38 cm con fonte di calore stabile approvata dal produttore",
    "paellera de 38 cm con fuente de calor estable aprobada por el fabricante"
  ],
  "38–40 cm paella pan": [
    "38-40厘米西班牙海鲜饭锅",
    "38〜40cmパエリア鍋",
    "poêle à paella de 38 à 40 cm",
    "padella per paella da 38-40 cm",
    "paellera de 38 a 40 cm"
  ],
  "4 serving bowls or dolsot": [
    "4个上菜碗或石锅",
    "盛り付け用丼または石鍋4個",
    "4 bols de service ou dolsots",
    "4 ciotole da portata o dolsot",
    "4 tazones para servir o cuencos de piedra dolsot"
  ],
  "6 deep bowls": [
    "6个深碗",
    "深めの丼6個",
    "6 grands bols profonds",
    "6 ciotole profonde",
    "6 tazones hondos"
  ],
  "9 × 5 × 3-inch loaf pan": [
    "9×5×3英寸吐司模",
    "9×5×3インチ（約23×13×7.5cm）ローフ型",
    "moule à pain de 9 × 5 × 3 pouces",
    "stampo per plumcake da 9 × 5 × 3 pollici",
    "molde para pan de 9 × 5 × 3 pulgadas"
  ],
  "9 × 5-inch loaf pan": [
    "9×5英寸吐司模",
    "9×5インチ（約23×13cm）ローフ型",
    "moule à pain de 9 × 5 pouces",
    "stampo per plumcake da 9 × 5 pollici",
    "molde para pan de 9 × 5 pulgadas"
  ],
  "9-inch round pie pan": [
    "9英寸圆形派盘",
    "9インチ（約23cm）丸型パイ皿",
    "moule à tarte rond de 9 pouces",
    "tortiera rotonda da crostata da 9 pollici",
    "molde redondo para tarta de 9 pulgadas"
  ],
  "air fryer": [
    "空气炸锅",
    "ノンフライヤー",
    "friteuse sans huile",
    "friggitrice ad aria",
    "freidora de aire"
  ],
  "airtight container": [
    "密封容器",
    "密閉容器",
    "boîte hermétique",
    "contenitore ermetico",
    "recipiente hermético"
  ],
  "aluminium foil": [
    "铝箔纸",
    "アルミホイル",
    "papier d'aluminium",
    "carta stagnola",
    "papel de aluminio"
  ],
  "baking dish": [
    "烤皿",
    "耐熱焼き型",
    "plat à four",
    "pirofila da forno",
    "fuente para horno"
  ],
  "baking pan": [
    "烤盘",
    "天板",
    "plat de cuisson",
    "teglia da forno",
    "bandeja de horno"
  ],
  "baking parchment": [
    "烘焙纸",
    "クッキングシート",
    "papier cuisson",
    "carta da forno",
    "papel de hornear"
  ],
  "baking sheet": [
    "平底烤盘",
    "浅型天板",
    "plaque de cuisson",
    "placca da forno",
    "bandeja para hornear"
  ],
  "baking sheets": [
    "平底烤盘若干",
    "浅型天板複数枚",
    "plaques de cuisson",
    "placche da forno",
    "bandejas para hornear"
  ],
  "baking tray": [
    "烤盘",
    "天板",
    "plaque de four",
    "teglia da forno",
    "bandeja para horno"
  ],
  "bar spoon": [
    "调酒长柄勺（吧勺）",
    "バースプーン",
    "cuillère à mélange de bar",
    "cucchiaio da bar",
    "cuchara de bar"
  ],
  "bean saucepan": [
    "煮豆用小锅",
    "豆用片手鍋",
    "casserole pour haricots",
    "casseruola per legumi",
    "cazo para alubias"
  ],
  "blender": [
    "搅拌机",
    "ブレンダー",
    "blender",
    "frullatore",
    "licuadora"
  ],
  "blender or fine-mesh sieve": [
    "搅拌机或细网筛",
    "ブレンダーまたは極細こし器",
    "blender ou passoire fine",
    "frullatore o colino a maglie fini",
    "licuadora o colador de malla fina"
  ],
  "blender or food processor": [
    "搅拌机或多功能料理机",
    "ブレンダーまたはフードプロセッサー",
    "blender ou robot de cuisine",
    "frullatore o robot da cucina",
    "licuadora o procesador de alimentos"
  ],
  "blender or mortar": [
    "搅拌机或研钵",
    "ブレンダーまたはすり鉢",
    "blender ou mortier",
    "frullatore o mortaio",
    "licuadora o mortero"
  ],
  "blender or mortar and pestle": [
    "搅拌机，或研钵和研杵",
    "ブレンダーまたはすり鉢・すりこぎ",
    "blender ou mortier et pilon",
    "frullatore o mortaio e pestello",
    "licuadora o mortero con mano"
  ],
  "blender or whisk": [
    "搅拌机或打蛋器",
    "ブレンダーまたは泡立て器",
    "blender ou fouet",
    "frullatore o frusta",
    "licuadora o batidor"
  ],
  "bowl": [
    "碗",
    "ボウル",
    "bol",
    "ciotola",
    "tazón"
  ],
  "bowl for milk": [
    "装牛奶用碗",
    "牛乳用ボウル",
    "bol pour le lait",
    "ciotola per il latte",
    "cuenco para la leche"
  ],
  "box grater": [
    "四面擦丝器",
    "ボックスグレーター",
    "râpe à boîte",
    "grattugia a scatola",
    "rallador de cuatro caras"
  ],
  "bread knife": [
    "面包刀",
    "パン切り包丁",
    "couteau à pain",
    "coltello da pane",
    "cuchillo de pan"
  ],
  "brush": [
    "料理刷",
    "料理用ブラシ",
    "pinceau",
    "pennello da cucina",
    "brocha"
  ],
  "butter knife": [
    "黄油刀",
    "バターナイフ",
    "couteau à beurre",
    "coltello da burro",
    "cuchillo de mantequilla"
  ],
  "cake tin": [
    "蛋糕模",
    "ケーキ型",
    "moule à gâteau",
    "tortiera",
    "molde para tarta"
  ],
  "cast-iron skillet or grill": [
    "铸铁平底锅或烧烤架",
    "鋳鉄スキレットまたはグリル",
    "poêle en fonte ou gril",
    "padella in ghisa o griglia",
    "sartén de hierro fundido o parrilla"
  ],
  "charcoal grill": [
    "木炭烤炉",
    "炭火グリル",
    "gril au charbon de bois",
    "barbecue a carbonella",
    "parrilla de carbón"
  ],
  "cheesecloth": [
    "食品用过滤纱布",
    "チーズクロス",
    "étamine",
    "garza per formaggio",
    "tela para quesos"
  ],
  "chef's knife": [
    "主厨刀",
    "牛刀",
    "couteau de chef",
    "coltello da chef",
    "cuchillo de chef"
  ],
  "citrus juicer": [
    "柑橘榨汁器",
    "柑橘絞り器",
    "presse-agrumes",
    "spremiagrumi",
    "exprimidor de cítricos"
  ],
  "clean basting brush": [
    "干净的料理刷",
    "清潔な料理用ハケ",
    "pinceau de cuisine propre",
    "pennello da cucina pulito",
    "brocha de cocina limpia"
  ],
  "clean board": [
    "洁净案板",
    "清潔なまな板",
    "planche propre",
    "tagliere pulito",
    "tabla limpia"
  ],
  "clean covered container": [
    "洁净带盖容器",
    "蓋付きの清潔な容器",
    "récipient propre avec couvercle",
    "contenitore pulito con coperchio",
    "recipiente limpio con tapa"
  ],
  "clean cutting board": [
    "洁净切菜板",
    "清潔なまな板",
    "planche à découper propre",
    "tagliere pulito",
    "tabla de cortar limpia"
  ],
  "clean food-grade cheesecloth": [
    "洁净食品级纱布",
    "食品衛生基準を満たした清潔なチーズクロス",
    "étamine propre de qualité alimentaire",
    "garza pulita per uso alimentare",
    "tela para quesos limpia de uso alimentario"
  ],
  "clean food-grade cling film, optional": [
    "洁净食品级保鲜膜（可选）",
    "食品用清潔なラップフィルム（任意）",
    "film étirable propre de qualité alimentaire, facultatif",
    "pellicola trasparente pulita per alimenti, facoltativa",
    "film transparente limpio de uso alimentario, opcional"
  ],
  "clean kitchen towel": [
    "洁净厨房布",
    "清潔なキッチンクロス",
    "torchon de cuisine propre",
    "canovaccio da cucina pulito",
    "paño de cocina limpio"
  ],
  "clean pressing weight": [
    "洁净压重物",
    "清潔な重石",
    "poids de pressage propre",
    "peso pulito per pressare",
    "peso limpio para prensar"
  ],
  "clean serving glass": [
    "干净的饮用玻璃杯",
    "清潔なグラス",
    "verre de service propre",
    "bicchiere da servizio pulito",
    "vaso limpio para servir"
  ],
  "clean serving plate": [
    "干净的餐盘",
    "清潔な盛り付け皿",
    "assiette de service propre",
    "piatto da portata pulito",
    "plato limpio para servir"
  ],
  "clean unbleached food-grade cotton cloth": [
    "洁净未经漂白食品级棉布",
    "無漂白の食品用清潔な綿布",
    "toile de coton écru propre de qualité alimentaire",
    "panno di cotone grezzo pulito per uso alimentare",
    "paño de algodón sin blanquear limpio de uso alimentario"
  ],
  "clean work surface": [
    "洁净操作台面",
    "清潔な調理台",
    "plan de travail propre",
    "piano di lavoro pulito",
    "superficie de trabajo limpia"
  ],
  "cocktail shaker or leakproof food-safe container": [
    "摇酒壶或防漏食品容器",
    "シェイカーまたは密閉できる食品用容器",
    "shaker à cocktail ou récipient hermétique de qualité alimentaire",
    "shaker per cocktail o contenitore a tenuta per uso alimentare",
    "coctelera o recipiente hermético de uso alimentario"
  ],
  "colander": [
    "沥水篮",
    "水切りかご",
    "passoire",
    "scolapasta",
    "escurridor"
  ],
  "colander or fine sieve": [
    "沥水篮或细滤网",
    "水切りざるまたは細目こし器",
    "passoire ou tamis fin",
    "scolapasta o colino a maglie fini",
    "escurridor o colador fino"
  ],
  "controlled deep fryer": [
    "温控油炸锅",
    "温度調節付きフライヤー",
    "friteuse à température réglable",
    "friggitrice a temperatura controllata",
    "freidora con control de temperatura"
  ],
  "cooking pot": [
    "煮锅",
    "調理鍋",
    "casserole",
    "pentola da cucina",
    "olla de cocina"
  ],
  "cooling rack": [
    "冷却网架",
    "クーリングラック",
    "grille de refroidissement",
    "gratella di raffreddamento",
    "rejilla para enfriar"
  ],
  "covered bowl": [
    "带盖碗",
    "蓋付きボウル",
    "bol avec couvercle",
    "ciotola con coperchio",
    "cuenco con tapa"
  ],
  "covered braising pot": [
    "带盖焖炖锅",
    "蓋付き煮込み鍋",
    "braisière avec couvercle",
    "casseruola da brasato con coperchio",
    "olla para estofar con tapa"
  ],
  "covered container": [
    "带盖容器",
    "蓋付き保存容器",
    "boîte avec couvercle",
    "contenitore con coperchio",
    "recipiente con tapa"
  ],
  "covered containers": [
    "带盖容器若干",
    "蓋付き保存容器複数個",
    "boîtes avec couvercle",
    "contenitori con coperchio",
    "recipientes con tapa"
  ],
  "covered deep frying pan": [
    "带盖深平底锅",
    "深型フタ付きフライパン",
    "poêle profonde avec couvercle",
    "padella fonda con coperchio",
    "sartén honda con tapa"
  ],
  "covered food-safe container": [
    "带盖食品级容器",
    "蓋付きの食品用容器",
    "boîte alimentaire avec couvercle",
    "contenitore per alimenti con coperchio",
    "recipiente para alimentos con tapa"
  ],
  "covered refrigerator container": [
    "带盖冷藏保鲜盒",
    "蓋付き冷蔵庫用保存容器",
    "récipient avec couvercle pour le réfrigérateur",
    "contenitore per frigorifero con coperchio",
    "recipiente con tapa para frigorífico"
  ],
  "covered rice pot": [
    "带盖煮饭锅",
    "蓋付き炊飯鍋",
    "casserole à riz avec couvercle",
    "pentola per riso con coperchio",
    "olla para arroz con tapa"
  ],
  "covered saucepan": [
    "带盖单柄锅",
    "蓋付き片手鍋",
    "casserole avec couvercle",
    "casseruola con coperchio",
    "cazo con tapa"
  ],
  "covered simmering pot": [
    "带盖炖锅",
    "蓋付き煮込み鍋",
    "faitout avec couvercle pour mijoter",
    "pentola per sobbollire con coperchio",
    "olla para hervir a fuego lento con tapa"
  ],
  "crab crackers or kitchen shears": [
    "开蟹夹或厨房剪刀",
    "カニ割り器またはキッチンバサミ",
    "pince à crabe ou ciseaux de cuisine",
    "pinza per crostacei o forbici da cucina",
    "pinzas para cangrejo o tijeras de cocina"
  ],
  "cutting board": [
    "切菜板",
    "まな板",
    "planche à découper",
    "tagliere",
    "tabla de cortar"
  ],
  "deep bowl": [
    "深碗",
    "深底ボウル",
    "bol profond",
    "ciotola fonda",
    "tazón hondo"
  ],
  "deep fryer or heavy deep pot": [
    "油炸机或厚底深锅",
    "フライヤーまたは厚手の深鍋",
    "friteuse ou marmite profonde à fond épais",
    "friggitrice o pentola profonda a fondo spesso",
    "freidora o cazuela honda de fondo grueso"
  ],
  "deep frying pan": [
    "深底煎锅",
    "深型フライパン",
    "poêle profonde",
    "padella profonda",
    "sartén honda"
  ],
  "deep heavy pot or deep fryer": [
    "厚底深锅或油炸机",
    "厚手の深鍋またはフライヤー",
    "marmite profonde à fond épais ou friteuse",
    "pentola profonda a fondo spesso o friggitrice",
    "olla honda de fondo grueso o freidora"
  ],
  "deep nine-ounce commercial crumb crust": [
    "市售9盎司深层饼干挞底",
    "市販の深型クランブルタルト台（9オンス）",
    "fond de tarte en miettes du commerce de 9 onces",
    "base per crostata di biscotti da 9 once confezionata",
    "base comercial profunda de masa de galleta de 9 onzas"
  ],
  "deep roasting tin": [
    "深烤盘",
    "深底ロースト天板",
    "plat à rôtir profond",
    "teglia per arrosti profonda",
    "fuente honda para asar"
  ],
  "deep roasting tray": [
    "深底烤盘",
    "深型ローストトレー",
    "plaque à rôtir profonde",
    "teglia profonda per arrosti",
    "bandeja profunda para asar"
  ],
  "deep saucepan": [
    "深口单柄锅",
    "深型片手鍋",
    "casserole profonde",
    "casseruola profonda",
    "cazo hondo"
  ],
  "deep soup pot": [
    "深汤锅",
    "深型スープ鍋",
    "marmite à soupe profonde",
    "pentola per zuppa profonda",
    "olla honda para sopa"
  ],
  "dessert bowl": [
    "甜品碗",
    "デザートボウル",
    "ramequin à dessert",
    "coppa da dessert",
    "copa de postre"
  ],
  "double boiler": [
    "隔水加热锅",
    "湯煎鍋（ダブルボイラー）",
    "bain-marie",
    "bagnomaria",
    "baño maría"
  ],
  "double boiler or saucepan with a heatproof bowl": [
    "隔水加热锅，或单柄锅配耐热碗",
    "湯煎鍋、または片手鍋と耐熱ボウル",
    "bain-marie ou casserole avec bol résistant à la chaleur",
    "bagnomaria o casseruola con ciotola resistente al calore",
    "baño maría o cazo con cuenco resistente al calor"
  ],
  "draining rack": [
    "沥水网架",
    "油切り網",
    "grille d'égouttage",
    "griglia per sgocciolare",
    "rejilla de goteo"
  ],
  "dry mixing bowl": [
    "干燥搅拌碗",
    "乾いたミキシングボウル",
    "cul-de-poule sec",
    "ciotola da miscelazione asciutta",
    "cuenco para mezclar seco"
  ],
  "eight cups or bowls": [
    "8个杯子或碗",
    "カップまたはボウル8個",
    "huit tasses ou bols",
    "otto tazze o ciotole",
    "ocho tazas o cuencos"
  ],
  "eight small serving dishes": [
    "8个小分餐盘",
    "小さめの取り分け皿8枚",
    "huit petits plats de service",
    "otto piattini da portata",
    "ocho platillos para servir"
  ],
  "equipment specified on the prepared chips package": [
    "半成品薯条包装上注明的器具",
    "市販ポテトのパッケージ指定の調理器具",
    "matériel indiqué sur l'emballage des frites",
    "attrezzatura specificata sulla confezione delle patatine",
    "equipamiento indicado en el paquete de las patatas preparadas"
  ],
  "espresso machine or espresso-making equipment": [
    "意式浓缩咖啡机或浓缩咖啡冲煮器具",
    "エスプレッソマシンまたはエスプレッソ器具",
    "machine à expresso ou matériel à expresso",
    "macchina per espresso o attrezzatura per espresso",
    "cafetera espresso o equipo para espresso"
  ],
  "fine grater": [
    "细孔擦蓉器",
    "細目おろし金",
    "râpe fine",
    "grattugia fine",
    "rallador fino"
  ],
  "fine sieve": [
    "细网筛",
    "細目こし器",
    "tamis fin",
    "setaccio fine",
    "tamiz fino"
  ],
  "fine strainer": [
    "细网筛",
    "細目ストレーナー",
    "passoire fine",
    "colino fine",
    "colador fino"
  ],
  "fine-mesh skimmer": [
    "细网漏勺",
    "極細あく取り網",
    "écumoire à mailles fines",
    "schiumarola a maglia fine",
    "espumadera de malla fina"
  ],
  "fine-mesh strainer": [
    "细滤网",
    "細目ストレーナー",
    "passoire à mailles fines",
    "colino a maglia fine",
    "colador de malla fina"
  ],
  "foil": [
    "铝箔",
    "ホイル",
    "papier d'aluminium",
    "foglio di alluminio",
    "papel de aluminio"
  ],
  "food processor": [
    "多功能食物料理机",
    "フードプロセッサー",
    "robot culinaire",
    "robot da cucina",
    "procesador de alimentos"
  ],
  "food processor or masher": [
    "食物料理机或压泥器",
    "フードプロセッサーまたはマッシャー",
    "robot culinaire ou presse-purée",
    "robot da cucina o schiacciapatate",
    "procesador de alimentos o machacador"
  ],
  "food processor or mortar": [
    "食物料理机或研钵",
    "フードプロセッサーまたはすり鉢",
    "robot culinaire ou mortier",
    "robot da cucina o mortaio",
    "procesador de alimentos o mortero"
  ],
  "food thermometer": [
    "食品温度计",
    "料理用温度計",
    "thermomètre de cuisine",
    "termometro per alimenti",
    "termómetro de cocina"
  ],
  "food thermometer for stored rice": [
    "熟米饭测温用食品温度计",
    "保存ご飯用料理温度計",
    "thermomètre alimentaire pour le riz cuit",
    "termometro per alimenti per riso conservato",
    "termómetro para alimentos para arroz cocido"
  ],
  "food-safe jug with lid": [
    "带盖食品用水罐",
    "蓋付き食品用ピッチャー",
    "pichet alimentaire avec couvercle",
    "caraffa per alimenti con coperchio",
    "jarra de uso alimentario con tapa"
  ],
  "food-safe spice pouch": [
    "食品用香料袋",
    "食品用スパイスバッグ",
    "sachet à épices alimentaire",
    "sacchetto per spezie per alimenti",
    "bolsa para especias de calidad alimentaria"
  ],
  "food-safe spice pouch, optional": [
    "食品用香料袋（可选）",
    "食品用スパイスバッグ（任意）",
    "sachet à épices alimentaire, facultatif",
    "sacchetto per spezie per alimenti, facoltativo",
    "bolsa para especias de uso alimentario, opcional"
  ],
  "food-safe storage containers": [
    "食品级保鲜盒",
    "食品用保存容器",
    "boîtes de conservation alimentaires",
    "contenitori per alimenti",
    "recipientes de uso alimentario para conservar"
  ],
  "fork": [
    "叉子",
    "フォーク",
    "fourchette",
    "forchetta",
    "tenedor"
  ],
  "four oven-safe indented snail dishes": [
    "4只可入烤箱的凹槽蜗牛烤盘",
    "耐熱エスカルゴ皿4枚",
    "quatre plats à escargots allant au four",
    "quattro piatti da lumache da forno",
    "cuatro platos para caracoles aptos para horno"
  ],
  "four salad bowls": [
    "4个沙拉碗",
    "サラダボウル4個",
    "quatre saladiers",
    "quattro ciotole da insalata",
    "cuatro ensaladeras"
  ],
  "four salad plates": [
    "4个沙拉盘",
    "サラダ皿4枚",
    "quatre assiettes à salade",
    "quattro piatti da insalata",
    "cuatro platos de ensalada"
  ],
  "frying pan": [
    "平底锅",
    "フライパン",
    "poêle",
    "padella",
    "sartén"
  ],
  "frying pan with a lid": [
    "带盖平底锅",
    "蓋付きフライパン",
    "poêle avec couvercle",
    "padella con coperchio",
    "sartén con tapa"
  ],
  "frying pan with lid": [
    "带盖煎锅",
    "蓋付きフライパン",
    "poêle avec couvercle",
    "padella con coperchio",
    "sartén con tapa"
  ],
  "frying thermometer": [
    "油温计",
    "揚げ物用温度計",
    "thermomètre à friture",
    "termometro per friggere",
    "termómetro para freír"
  ],
  "glass": [
    "玻璃杯",
    "グラス",
    "verre",
    "bicchiere",
    "vaso"
  ],
  "grater": [
    "擦丝器",
    "おろし金",
    "râpe",
    "grattugia",
    "rallador"
  ],
  "grill or barbecue": [
    "烤架或烧烤炉",
    "グリルまたはバーベキュー台",
    "gril ou barbecue",
    "griglia o barbecue",
    "parrilla o barbacoa"
  ],
  "grill or oven grill": [
    "烧烤架或烤箱炙烤档",
    "焼き網またはオーブングリル",
    "gril ou fonction gril du four",
    "griglia o grill del forno",
    "parrilla o grill del horno"
  ],
  "grill-safe tray": [
    "耐烤盘",
    "耐熱グリル皿",
    "plat adapté au gril",
    "teglia per griglia",
    "bandeja resistente al grill"
  ],
  "heat-safe bowl": [
    "耐热碗",
    "耐熱ボウル",
    "bol résistant à la chaleur",
    "ciotola resistente al calore",
    "cuenco resistente al calor"
  ],
  "heat-safe measuring jug": [
    "耐热量杯",
    "耐熱計量カップ",
    "verre doseur résistant à la chaleur",
    "misurino resistente al calore",
    "jarra medidora resistente al calor"
  ],
  "heat-safe skewers": [
    "耐热烤签",
    "耐熱スキュワー",
    "brochettes résistantes à la chaleur",
    "spiedini resistenti al calore",
    "brochetas resistentes al calor"
  ],
  "heatproof bowl": [
    "耐热碗",
    "耐熱ボウル",
    "bol résistant à la chaleur",
    "ciotola termoresistente",
    "cuenco resistente al calor"
  ],
  "heatproof cup": [
    "耐热杯",
    "耐熱カップ",
    "tasse résistante à la chaleur",
    "tazza termoresistente",
    "taza resistente al calor"
  ],
  "heatproof dish": [
    "耐热盘",
    "耐熱皿",
    "plat résistant à la chaleur",
    "piatto termoresistente",
    "plato resistente al calor"
  ],
  "heatproof glasses": [
    "耐热玻璃杯",
    "耐熱グラス",
    "verres résistants à la chaleur",
    "bicchieri termoresistenti",
    "vasos resistentes al calor"
  ],
  "heatproof mixing bowl": [
    "耐热搅拌碗",
    "耐熱ミキシングボウル",
    "cul-de-poule résistant à la chaleur",
    "ciotola da miscelazione resistente al calore",
    "cuenco para mezclar resistente al calor"
  ],
  "heatproof plate": [
    "耐热盘",
    "耐熱皿",
    "assiette résistante à la chaleur",
    "piatto termoresistente",
    "plato resistente al calor"
  ],
  "heatproof spatula": [
    "耐热刮刀或锅铲",
    "耐熱スパチュラ",
    "spatule thermorésistante",
    "spatola termoresistente",
    "espátula resistente al calor"
  ],
  "heavy frying pan": [
    "厚底煎锅",
    "厚手のフライパン",
    "poêle épaisse",
    "padella dal fondo spesso",
    "sartén pesada"
  ],
  "heavy saucepan": [
    "厚底小煮锅",
    "厚手片手鍋",
    "casserole à fond épais",
    "casseruola a fondo spesso",
    "cazo de fondo grueso"
  ],
  "heavy saucepan with lid": [
    "带盖厚底小锅",
    "蓋付き厚手片手鍋",
    "casserole épaisse avec couvercle",
    "casseruola a fondo spesso con coperchio",
    "cazo de fondo grueso con tapa"
  ],
  "heavy saucepan with tight lid": [
    "配严实锅盖的厚底单柄锅",
    "ぴったり閉まる蓋付きの厚手片手鍋",
    "casserole à fond épais avec couvercle bien ajusté",
    "casseruola a fondo spesso con coperchio aderente",
    "cazo pesado con tapa ajustada"
  ],
  "heavy skillet": [
    "厚底煎锅",
    "厚手スキレット",
    "poêle à fond épais",
    "padella dal fondo spesso",
    "sartén de fondo grueso"
  ],
  "heavy skillet or grill pan": [
    "厚底平底锅或条纹煎锅",
    "厚底フライパンまたはグリルパン",
    "poêle lourde ou poêle à griller",
    "padella pesante o bistecchiera",
    "sartén pesada o sartén grill"
  ],
  "home oven": [
    "家用烤箱",
    "家庭用オーブン",
    "four traditionnel",
    "forno di casa",
    "horno doméstico"
  ],
  "household grill": [
    "家用烤架",
    "家庭用グリル",
    "gril domestique",
    "griglia da cucina",
    "parrilla doméstica"
  ],
  "instant-read thermometer": [
    "即读式食品温度计",
    "瞬読式温度計",
    "thermomètre à lecture instantanée",
    "termometro a lettura istantanea",
    "termómetro de lectura instantánea"
  ],
  "jigger or graduated measure": [
    "量酒器或带刻度量杯",
    "ジガーまたは目盛り付き計量カップ",
    "mesure à alcool graduée ou jigger",
    "dosatore per cocktail o misurino graduato",
    "jigger o medidor graduado"
  ],
  "kitchen knife": [
    "厨房刀",
    "万能包丁",
    "couteau de cuisine",
    "coltello da cucina",
    "cuchillo de cocina"
  ],
  "kitchen tongs": [
    "厨房夹",
    "キッチントング",
    "pince de cuisine",
    "pinze da cucina",
    "pinzas de cocina"
  ],
  "kitchen twine": [
    "厨房棉线",
    "たこ糸",
    "ficelle de cuisine",
    "spago da cucina",
    "hilo de cocina"
  ],
  "knife": [
    "厨房用刀",
    "包丁",
    "couteau",
    "coltello",
    "cuchillo"
  ],
  "knife and chopping board": [
    "刀和切菜板",
    "包丁とまな板",
    "couteau et planche à découper",
    "coltello e tagliere",
    "cuchillo y tabla de cortar"
  ],
  "knife or mandoline with a hand guard": [
    "刀，或带护手器的切片器",
    "安全ガード付きスライサーまたは包丁",
    "couteau ou mandoline avec garde de sécurité",
    "coltello o mandolina con paramano",
    "cuchillo o mandolina con protector"
  ],
  "ladle": [
    "汤勺",
    "お玉",
    "louche",
    "mestolo",
    "cucharón"
  ],
  "large clean work surface": [
    "宽大洁净操作台面",
    "広くて清潔な作業台",
    "grand plan de travail propre",
    "grande piano di lavoro pulito",
    "superficie de trabajo limpia y amplia"
  ],
  "large covered pot": [
    "带盖大锅",
    "蓋付き大鍋",
    "grande marmite avec couvercle",
    "grande pentola con coperchio",
    "olla grande con tapa"
  ],
  "large covered saucepan": [
    "带盖大号单柄锅",
    "蓋付き大型片手鍋",
    "grande casserole avec couvercle",
    "grande casseruola con coperchio",
    "cazo grande con tapa"
  ],
  "large covered soup pot": [
    "带盖大汤锅",
    "蓋付き大容量スープ鍋",
    "grande marmite à soupe avec couvercle",
    "grande pentola per zuppa con coperchio",
    "olla grande para sopa con tapa"
  ],
  "large covered stew pot": [
    "带盖大炖锅",
    "蓋付き大容量煮込み鍋",
    "grande cocotte avec couvercle",
    "grande pentola per stufato con coperchio",
    "olla grande para estofados con tapa"
  ],
  "large deep ovenproof baking dish": [
    "大号深口耐热焗烤盘",
    "大型の深型オーブン焼き皿",
    "grand plat à gratin profond allant au four",
    "grande pirofila profonda da forno",
    "fuente grande y honda apta para horno"
  ],
  "large dutch oven": [
    "大号厚底带盖铸铁锅",
    "大型ダッチオーブン",
    "grande cocotte en fonte",
    "grande casseruola in ghisa con coperchio",
    "olla grande de hierro fundido con tapa"
  ],
  "large frying pan": [
    "大煎锅",
    "大型フライパン",
    "grande poêle",
    "padella grande",
    "sartén grande"
  ],
  "large frying pan with lid": [
    "带盖大煎锅",
    "蓋付き大型フライパン",
    "grande poêle avec couvercle",
    "padella grande con coperchio",
    "sartén grande con tapa"
  ],
  "large heavy pot": [
    "大号厚底锅",
    "厚手の大型深鍋",
    "grande marmite épaisse",
    "grande pentola pesante",
    "olla grande de fondo grueso"
  ],
  "large heavy saucepan": [
    "大号厚底单柄锅",
    "厚手の大型片手鍋",
    "grande casserole épaisse",
    "grande casseruola dal fondo spesso",
    "cazo grande y pesado"
  ],
  "large lidded pot or wok": [
    "带盖大煮锅或炒锅",
    "蓋付き大鍋または中華鍋",
    "grande marmite ou wok avec couvercle",
    "grande pentola o wok con coperchio",
    "olla grande o wok con tapa"
  ],
  "large mixing bowl": [
    "大搅拌碗",
    "大型ミキシングボウル",
    "grand saladier",
    "grande ciotola da miscelazione",
    "cuenco grande para mezclar"
  ],
  "large pasta pot": [
    "大号煮面锅",
    "パスタ用大鍋",
    "grande marmite à pâtes",
    "pentola grande per la pasta",
    "olla grande para pasta"
  ],
  "large pot": [
    "大锅",
    "大鍋",
    "grande marmite",
    "grande pentola",
    "olla grande"
  ],
  "large pot or wok with a lid": [
    "带盖大煮锅或大炒锅",
    "蓋付き大鍋または中華鍋",
    "grande marmite ou grand wok avec couvercle",
    "grande pentola o wok con coperchio",
    "olla grande o wok con tapa"
  ],
  "large pot with lid": [
    "带盖大锅",
    "蓋付き大鍋",
    "grande marmite avec couvercle",
    "grande pentola con coperchio",
    "olla grande con tapa"
  ],
  "large saucepan": [
    "大号单柄锅",
    "大型片手鍋",
    "grande casserole",
    "grande casseruola",
    "cazo grande"
  ],
  "large serving glass": [
    "大玻璃杯",
    "大きめのサービンググラス",
    "grand verre à dégustation",
    "grande bicchiere da servizio",
    "vaso grande para servir"
  ],
  "large skillet": [
    "大煎锅",
    "大型フライパン",
    "grande poêle à frire",
    "grande padella",
    "sartén grande"
  ],
  "large stockpot": [
    "大汤锅",
    "大型寸胴鍋",
    "grande marmite",
    "grande pentolone per brodo",
    "olla sopera grande"
  ],
  "large stockpot with lid": [
    "带盖大汤锅",
    "蓋付き大型寸胴鍋",
    "grande marmite avec couvercle",
    "grande pentolone con coperchio",
    "olla sopera grande con tapa"
  ],
  "large stovetop-safe dutch oven": [
    "适于炉灶的大号厚底带盖铸铁锅",
    "直火対応大型ダッチオーブン",
    "grande cocotte en fonte allant sur le feu",
    "grande casseruola in ghisa per piano cottura",
    "cazuela tipo dutch oven apta para fuego directo"
  ],
  "large wide heavy pot or wok": [
    "大口径厚底深锅或炒锅",
    "厚手で幅広の大鍋または中華鍋",
    "grande cocotte évasée ou grand wok",
    "grande casseruola larga e pesante o wok",
    "olla ancha y pesada o wok grande"
  ],
  "lidded cooking pot": [
    "带盖煮锅",
    "蓋付き調理鍋",
    "faitout avec couvercle",
    "casseruola con coperchio",
    "olla con tapa"
  ],
  "lidded jar": [
    "带盖玻璃罐",
    "蓋付き保存瓶",
    "bocal avec couvercle",
    "barattolo con coperchio",
    "tarro con tapa"
  ],
  "lidded ovenproof casserole": [
    "带盖耐烤炖锅",
    "蓋付き耐熱キャセロール",
    "cocotte allant au four avec couvercle",
    "casseruola da forno con coperchio",
    "cazuela apta para horno con tapa"
  ],
  "lidded skillet": [
    "带盖煎锅",
    "蓋付きスキレット",
    "poêle avec couvercle",
    "padella con coperchio",
    "sartén con tapa"
  ],
  "lined mold or baking dish": [
    "铺好内衬的模具或烤皿",
    "敷き紙をした型または耐熱焼き皿",
    "moule ou plat chemisé",
    "stampo o pirofila foderata",
    "molde o fuente forrada"
  ],
  "loaf pan": [
    "长条面包模",
    "ローフ型",
    "moule à cake",
    "stampo per plumcake",
    "molde de pan rectangular"
  ],
  "long spoon": [
    "长柄匙",
    "柄の長いスプーン",
    "cuillère à long manche",
    "cucchiaio lungo",
    "cuchara de mango largo"
  ],
  "long wooden spatula": [
    "长木铲",
    "木製ロングスパチュラ",
    "longue spatule en bois",
    "spatola lunga in legno",
    "espátula larga de madera"
  ],
  "manufacturer instructions": [
    "按生产商说明准备所需厨具",
    "メーカーの使用説明書",
    "instructions du fabricant",
    "istruzioni del produttore",
    "instrucciones del fabricante"
  ],
  "measuring cup": [
    "量杯",
    "計量カップ",
    "tasse à mesurer",
    "dosatore a tazza",
    "taza medidora"
  ],
  "measuring cup or small mold": [
    "量杯或小成型模",
    "計量カップまたは小型押し型",
    "tasse à mesurer ou petit moule",
    "dosatore a tazza o piccolo stampo",
    "taza medidora o molde pequeño"
  ],
  "measuring cups": [
    "量杯",
    "計量カップ",
    "verres doseurs",
    "tazze di misurazione",
    "tazas medidoras"
  ],
  "measuring cups and spoons": [
    "量杯与量勺",
    "計量カップと計量スプーン",
    "verres doseurs et cuillères de mesure",
    "misurini a tazza e cucchiai dosatori",
    "tazas y cucharas medidoras"
  ],
  "measuring jigger or graduated measure": [
    "量酒器或带刻度量杯",
    "ジガーまたは目盛り付き計量カップ",
    "mesure à cocktail ou verre doseur gradué",
    "jigger o misurino graduato",
    "jigger o medidor graduado"
  ],
  "measuring jug": [
    "带刻度量杯",
    "目盛り付き計量ジャグ",
    "pichet doseur gradué",
    "caraffa graduata",
    "jarra medidora"
  ],
  "measuring spoon or cup": [
    "量勺或量杯",
    "計量スプーンまたは計量カップ",
    "cuillère ou tasse à mesurer",
    "cucchiaio o tazza dosatrice",
    "cuchara o taza medidora"
  ],
  "medium saucepan": [
    "中号单柄锅",
    "中型片手鍋",
    "casserole moyenne",
    "casseruola media",
    "cazo mediano"
  ],
  "metal baking tray": [
    "金属烤盘",
    "金属製天板",
    "plaque de cuisson métallique",
    "teglia metallica da forno",
    "bandeja metálica de horno"
  ],
  "metal skewers if used": [
    "金属烤签（若使用）",
    "金属製スキュワー（使用する場合）",
    "brochettes métalliques, le cas échéant",
    "spiedini di metallo se usati",
    "brochetas de metal si se utilizan"
  ],
  "microwave": [
    "微波炉",
    "電子レンジ",
    "micro-ondes",
    "microonde",
    "microondas"
  ],
  "microwave-safe bowl": [
    "微波炉适用碗",
    "電子レンジ対応ボウル",
    "bol compatible micro-ondes",
    "ciotola adatta al microonde",
    "cuenco apto para microondas"
  ],
  "microwave-safe dish": [
    "微波炉适用容器",
    "電子レンジ対応皿",
    "plat allant au micro-ondes",
    "piatto adatto al microonde",
    "plato apto para microondas"
  ],
  "microwave-safe plate": [
    "微波炉适用浅平盘",
    "電子レンジ対応平皿",
    "assiette compatible micro-ondes",
    "piatto piano per microonde",
    "plato plano apto para microondas"
  ],
  "mixer": [
    "电动搅拌器",
    "電動ハンドミキサーまたはスタンドミキサー",
    "batteur électrique",
    "sbattitore elettrico",
    "batidora eléctrica"
  ],
  "mixing bowl": [
    "搅拌碗",
    "ミキシングボウル",
    "cul-de-poule",
    "ciotola per impastare",
    "cuenco para mezclar"
  ],
  "mixing bowls": [
    "搅拌碗若干",
    "ミキシングボウル複数個",
    "saladiers",
    "ciotole per mescolare",
    "cuencos para mezclar"
  ],
  "mixing glass": [
    "调酒搅拌杯",
    "ミキシンググラス",
    "verre à mélange",
    "bicchiere da miscelazione",
    "vaso mezclador"
  ],
  "mortar": [
    "研钵",
    "すり鉢",
    "mortier",
    "mortaio",
    "mortero"
  ],
  "mortar and pestle": [
    "研钵和杵",
    "すり鉢とすりこぎ",
    "mortier et pilon",
    "mortaio e pestello",
    "mortero y mano"
  ],
  "mortar and pestle or blender": [
    "研钵和研杵，或搅拌机",
    "すり鉢・すりこぎまたはブレンダー",
    "mortier et pilon ou blender",
    "mortaio e pestello o frullatore",
    "mortero y maja o licuadora"
  ],
  "muddler": [
    "调酒捣棒",
    "カクテル用ペストル",
    "pilon à cocktail",
    "pestello da cocktail",
    "majador de cóctel"
  ],
  "non-pressure rice cooker": [
    "普通电饭煲（非高压）",
    "非圧力式炊飯器",
    "cuiseur à riz sans pression",
    "cuociriso non a pressione",
    "arrocera convencional sin presión"
  ],
  "nonreactive bowl": [
    "耐酸碗",
    "非反応性素材のボウル",
    "bol en matière non réactive",
    "ciotola non reattiva",
    "cuenco de material no reactivo"
  ],
  "nonreactive container": [
    "耐酸容器",
    "非反応性素材の容器",
    "récipient non réactif",
    "contenitore non reattivo",
    "recipiente no reactivo"
  ],
  "nonreactive mixing bowl": [
    "耐酸搅拌碗",
    "非反応性素材のミキシングボウル",
    "saladier non réactif",
    "ciotola da miscelazione non reattiva",
    "cuenco para mezclar no reactivo"
  ],
  "nonstick baking tray": [
    "不粘烤盘",
    "こびり付きにくい加工の天板",
    "plaque de cuisson antiadhésive",
    "teglia antiaderente da forno",
    "bandeja de horno antiadherente"
  ],
  "nonstick frying pan": [
    "不粘平底锅",
    "ノンスティックフライパン",
    "poêle antiadhésive",
    "padella antiaderente",
    "sartén antiadherente"
  ],
  "nonstick pan": [
    "不粘锅",
    "こびり付きにくいフライパン",
    "poêle antiadhésive",
    "padella antiaderente",
    "sartén antiadherente"
  ],
  "noodle basket or colander": [
    "煮面漏勺或滤水篮",
    "麺用ざるまたは水切りカゴ",
    "égouttoir à nouilles ou passoire",
    "cestello per pasta o scolapasta",
    "cesta para fideos o escurridor"
  ],
  "noodle pot": [
    "煮面锅",
    "麺茹で用鍋",
    "casserole à nouilles",
    "pentola per la pasta",
    "olla para fideos"
  ],
  "one small measuring spoon or cup": [
    "小号量勺或量杯1个",
    "小さな計量スプーンまたは計量カップ1個",
    "une petite cuillère ou tasse à mesurer",
    "un piccolo cucchiaio dosatore o misurino",
    "una cuchara o taza medidora pequeña"
  ],
  "outdoor grill": [
    "室外烧烤炉",
    "屋外用バーベキューグリル",
    "barbecue d'extérieur",
    "barbecue all'aperto",
    "parrilla exterior"
  ],
  "oven": [
    "烤箱",
    "オーブン",
    "four",
    "forno",
    "horno"
  ],
  "oven gloves": [
    "隔热手套",
    "オーブン用耐熱グローブ",
    "gants de four isolants",
    "guanti da forno protettivi",
    "guantes aislantes para horno"
  ],
  "oven grill": [
    "烤箱上火炙烤功能",
    "オーブングリル",
    "gril du four",
    "grill del forno",
    "grill del horno"
  ],
  "oven grill or household grill": [
    "烤箱上火炙烤功能或家用烧烤炉",
    "オーブングリルまたは家庭用焼き網",
    "gril de four ou gril de table",
    "grill del forno o bistecchiera da casa",
    "grill del horno o parrilla doméstica"
  ],
  "oven mitts": [
    "隔热手套",
    "鍋つかみ",
    "gants de cuisine isolants",
    "presine da cucina",
    "manoplas térmicas de cocina"
  ],
  "oven or grill": [
    "烤箱或烤架",
    "オーブンまたはグリル",
    "four ou barbecue",
    "forno o griglia",
    "horno o parrilla"
  ],
  "oven-safe tray": [
    "可入烤箱的烤盘",
    "オーブン対応トレー",
    "plaque allant au four",
    "teglia adatta al forno",
    "bandeja apta para horno"
  ],
  "ovenproof baking dish": [
    "耐烤烤皿",
    "オーブン用焼き皿",
    "plat à gratin allant au four",
    "teglia refrattaria da forno",
    "fuente refractaria para horno"
  ],
  "ovenproof casserole dish": [
    "可入烤箱的炖烤皿",
    "耐熱キャセロール皿",
    "plat à gratin allant au four",
    "pirofila da forno",
    "cazuela refractaria para horno"
  ],
  "ovenproof casserole with a lid": [
    "带盖耐烤炖锅",
    "蓋付き耐熱キャセロール鍋",
    "cocotte allant au four avec couvercle",
    "casseruola da forno con coperchio",
    "cazuela para horno con tapa"
  ],
  "ovenproof serving ramekins": [
    "耐热分装焗烤盅",
    "オーブン対応スフレ型",
    "ramequins de service allant au four",
    "stampini da porzione resistenti al forno",
    "ramequines de servicio aptos para horno"
  ],
  "pan for warming tortillas and beans": [
    "温热玉米饼和豆子用的平底锅",
    "トルティーヤと豆を温める鍋",
    "poêle pour réchauffer tortillas et haricots",
    "padella per scaldare tortillas e fagioli",
    "sartén para calentar tortillas y frijoles"
  ],
  "paper liners": [
    "纸质玛芬杯托",
    "マフィン用紙カップ",
    "caissettes en papier",
    "pirottini di carta",
    "moldes de papel para magdalenas"
  ],
  "parchment": [
    "烘焙纸",
    "クッキングシート",
    "papier sulfurisé",
    "carta da forno",
    "papel pergamino"
  ],
  "pasta pot": [
    "煮面锅",
    "パスタ鍋",
    "casserole à pâtes",
    "pentola per pasta",
    "olla para pasta"
  ],
  "pastry brush": [
    "烘焙油刷",
    "製菓用ハケ",
    "pinceau à pâtisserie",
    "pennello per pasticceria",
    "brocha de repostería"
  ],
  "pastry or basting brush": [
    "烘焙刷或涂酱刷",
    "製菓用または料理用ハケ",
    "pinceau à pâtisserie ou à badigeonner",
    "pennello da cucina o pasticceria",
    "brocha para repostería o engrasar"
  ],
  "peeler": [
    "削皮刀",
    "皮むき器",
    "économe",
    "pelaverdure",
    "pelador"
  ],
  "pie plate that fits the dough and filling": [
    "大小适合面皮和馅料的派盘",
    "生地とフィリングに合うパイ型",
    "moule à tarte adapté à la pâte et la garniture",
    "teglia da crostata di misura adatta",
    "molde para tarta adaptado a la masa y al relleno"
  ],
  "piping bag": [
    "裱花袋",
    "絞り袋",
    "poche à douille",
    "tasca da pasticciere",
    "manga pastelera"
  ],
  "pizza cutter or knife": [
    "披萨轮刀或菜刀",
    "ピザカッターまたは包丁",
    "roulette à pizza ou couteau",
    "rotella taglia-pizza o coltello",
    "cortador de pizza o cuchillo"
  ],
  "plate": [
    "餐盘",
    "平皿",
    "assiette",
    "piatto",
    "plato"
  ],
  "pot": [
    "煮锅",
    "鍋",
    "marmite",
    "pentola",
    "olla"
  ],
  "potato masher": [
    "马铃薯压泥器",
    "ポテトマッシャー",
    "presse-purée manuel",
    "schiacciapatate manuale",
    "machacador de patatas"
  ],
  "pressure cooker": [
    "高压锅",
    "圧力鍋",
    "autocuiseur",
    "pentola a pressione",
    "olla a presión"
  ],
  "pressure cooker approved for beans": [
    "适于煮豆类的高压锅",
    "豆調理対応の圧力鍋",
    "autocuiseur adapté à la cuisson des haricots",
    "pentola a pressione adatta alla cottura dei legumi",
    "olla a presión apta para legumbres"
  ],
  "rack": [
    "网架",
    "網",
    "grille",
    "griglia",
    "rejilla"
  ],
  "rack and rimmed roasting tin": [
    "带烤架深边烤盘",
    "網付き深型ローストトレー",
    "grille et plat à rôtir à bord haut",
    "griglia con teglia per arrosti a bordi alti",
    "rejilla con bandeja de asar de bordes altos"
  ],
  "rack and rimmed roasting tray": [
    "网架和带边烤盘",
    "網付きフチ高ロースト天板",
    "grille et plaque à rebords",
    "griglia con teglia bordata per arrosti",
    "rejilla y bandeja con bordes para asar"
  ],
  "refrigerator": [
    "冰箱",
    "冷蔵庫",
    "réfrigérateur",
    "frigorifero",
    "refrigerador"
  ],
  "rice cooker or lidded pot": [
    "电饭煲或带盖煮锅",
    "炊飯器または蓋付き鍋",
    "cuiseur à riz ou marmite avec couvercle",
    "cuociriso o pentola con coperchio",
    "arrocera u olla con tapa"
  ],
  "rice cooker or saucepan": [
    "电饭煲或单柄小锅",
    "炊飯器または片手鍋",
    "cuiseur à riz ou casserole",
    "cuociriso o casseruola",
    "arrocera o cazo"
  ],
  "rice pot": [
    "煮饭锅",
    "炊飯用鍋",
    "casserole pour le riz",
    "pentola per riso",
    "olla para arroz"
  ],
  "rimmed roasting tray": [
    "带沿烤盘",
    "縁付きロースト天板",
    "plaque de four à bords relevés",
    "teglia per arrosti a bordi rialzati",
    "bandeja con bordes para hornear"
  ],
  "rolling pin": [
    "擀面杖",
    "麺棒",
    "rouleau à pâtisserie",
    "mattarello",
    "rodillo"
  ],
  "rolling pin or pasta roller": [
    "擀面杖或压面机",
    "麺棒またはパスタマシーン",
    "rouleau à pâtisserie ou machine à pâtes",
    "mattarello o macchina per pasta",
    "rodillo o máquina para pasta"
  ],
  "salad bowls": [
    "沙拉碗",
    "サラダボウル",
    "saladiers",
    "ciotole per insalata",
    "ensaladeras"
  ],
  "salad plates": [
    "沙拉盘",
    "サラダ皿",
    "assiettes à salade",
    "piatti da insalata",
    "platos para ensalada"
  ],
  "salad spinner": [
    "沙拉甩干篮",
    "サラダスピナー",
    "essoreuse à salade",
    "centrifuga per insalata",
    "centrifugadora de lechuga"
  ],
  "saucepan": [
    "单柄小煮锅",
    "片手鍋",
    "casserole",
    "casseruola",
    "cazo"
  ],
  "saucepan with a lid": [
    "带盖单柄锅",
    "蓋付き片手鍋",
    "casserole avec couvercle",
    "casseruola con coperchio",
    "cazo con tapa"
  ],
  "sauté pan": [
    "煎炒锅",
    "ソテーパン",
    "sauteuse",
    "padella da salto",
    "sartén honda para saltear"
  ],
  "scale": [
    "厨房秤",
    "クッキングスケール",
    "balance de cuisine",
    "bilancia da cucina",
    "báscula de cocina"
  ],
  "separate basting and serving bowls": [
    "分别用于刷酱和盛装的碗",
    "タレ塗り用と盛り付け用の別々の器",
    "bols séparés pour badigeonner et servir",
    "ciotole separate per spennellare e servire",
    "cuencos separados para glasear y servir"
  ],
  "separate cutting board for raw seafood": [
    "生海鲜专用砧板",
    "生鮮魚介専用まな板",
    "planche à découper dédiée aux fruits de mer crus",
    "tagliere separato per frutti di mare crudi",
    "tabla separada para marisco crudo"
  ],
  "separate raw-seafood cutting board": [
    "生海鲜专用砧板",
    "生の魚介用の専用まな板",
    "planche à découper séparée pour fruits de mer crus",
    "tagliere riservato ai frutti di mare crudi",
    "tabla de cortar reservada para mariscos crudos"
  ],
  "serving bowls": [
    "盛菜碗",
    "盛り付け用ボウル",
    "bols de service",
    "ciotole da servizio",
    "tazones para servir"
  ],
  "serving glass": [
    "饮用玻璃杯",
    "サービンググラス",
    "verre de dégustation",
    "bicchiere da servizio",
    "vaso para servir"
  ],
  "shallow bowl": [
    "浅碗",
    "浅底ボウル",
    "bol peu profond",
    "ciotola poco profonda",
    "cuenco poco profundo"
  ],
  "shallow covered containers": [
    "浅底带盖容器",
    "浅型フタ付き保存容器",
    "boîtes de conservation plates avec couvercle",
    "contenitori bassi con coperchio",
    "recipientes poco profundos con tapa"
  ],
  "shallow dredging dish": [
    "浅底裹粉盘",
    "浅い衣付け皿",
    "assiette creuse pour fariner",
    "piatto fondo per impanare",
    "fuente plana para rebozar"
  ],
  "shallow food-safe containers": [
    "浅底食品级保鲜盒",
    "浅型食品用容器",
    "boîtes alimentaires peu profondes",
    "contenitori per alimenti bassi",
    "recipientes llanos para alimentos"
  ],
  "shallow mixing bowl": [
    "浅口搅拌碗",
    "浅底ミキシングボウル",
    "bol à mélanger peu profond",
    "ciotola da impasto poco profonda",
    "cuenco para mezclar poco profundo"
  ],
  "shallow ovenproof dish": [
    "浅底耐热焗盘",
    "浅型耐熱オーブン皿",
    "plat à gratin peu profond",
    "pirofila da forno poco profonda",
    "fuente plana apta para horno"
  ],
  "sharp knife": [
    "锋利厨刀",
    "切れ味の良い包丁",
    "couteau bien aiguisé",
    "coltello affilato",
    "cuchillo afilado"
  ],
  "sheet pan or gas burner for charring": [
    "烤盘，或用于炙烤表面的燃气灶头",
    "天板、または直火焼き用ガスコンロ",
    "plaque de four ou brûleur à gaz pour noircir",
    "leccarda o fornello a gas per arrostire",
    "bandeja de horno o quemador de gas para chamuscar"
  ],
  "sheet pan or grill pan": [
    "烤盘或条纹煎锅",
    "天板またはグリルパン",
    "plaque de cuisson ou poêle à griller",
    "teglia da forno o bistecchiera",
    "bandeja de horno o sartén estriada"
  ],
  "sieve": [
    "滤网",
    "こし器",
    "tamis",
    "setaccio",
    "tamiz"
  ],
  "skewer": [
    "细签",
    "金串または竹串",
    "pique en bois ou brochette",
    "spiedino sottile",
    "pincho fino"
  ],
  "skewers": [
    "烤串签",
    "串",
    "brochettes",
    "spiedini",
    "brochetas"
  ],
  "skillet": [
    "平底煎锅",
    "スキレット",
    "poêle à frire",
    "padella",
    "sartén"
  ],
  "slotted spoon": [
    "漏勺",
    "穴あきお玉",
    "écumoire",
    "schiumarola",
    "espumadera"
  ],
  "slow cooker": [
    "慢炖锅",
    "スロークッカー",
    "mijoteuse électrique",
    "slow cooker",
    "olla de cocción lenta"
  ],
  "slow cooker large enough for the chicken": [
    "容量足以放入鸡肉的慢炖锅",
    "鶏肉が丸ごと入るサイズのスロークッカー",
    "mijoteuse assez grande pour le poulet",
    "slow cooker abbastanza capiente per il pollo",
    "olla de cocción lenta con capacidad para el pollo"
  ],
  "small bowl": [
    "小碗",
    "小鉢",
    "petit bol",
    "piccola ciotola",
    "cuenco pequeño"
  ],
  "small bowls": [
    "小碗若干",
    "小鉢複数枚",
    "petits bols",
    "piccole ciotole",
    "cuencos pequeños"
  ],
  "small frying pan": [
    "小煎锅",
    "小型フライパン",
    "petite poêle",
    "padellino",
    "sartén pequeña"
  ],
  "small heatproof dessert glass or bowl": [
    "耐热甜品小玻璃杯或小碗",
    "耐熱の小さなデザートグラスまたは器",
    "petit verre ou coupe à dessert résistant à la chaleur",
    "coppetta o bicchierino resistente al calore per dessert",
    "vasito o cuenco resistente al calor para postre"
  ],
  "small lidded saucepan": [
    "带盖小单柄锅",
    "蓋付き小型片手鍋",
    "petite casserole avec couvercle",
    "piccola casseruola con coperchio",
    "cazo pequeño con tapa"
  ],
  "small ovenproof baking dish": [
    "小号耐烤烤皿",
    "小型耐熱焼き型",
    "petit plat à four",
    "piccola pirofila da forno",
    "fuente pequeña para horno"
  ],
  "small pan": [
    "小锅",
    "小型鍋",
    "petite poêle ou casserole",
    "padellino o piccolo tegame",
    "sartén o cazo pequeño"
  ],
  "small saucepan": [
    "小单柄锅",
    "小型片手鍋",
    "petite casserole",
    "piccola casseruola",
    "cazo pequeño"
  ],
  "small whisk": [
    "小型手动打蛋器",
    "小型泡立て器",
    "mini-fouet",
    "piccola frusta a mano",
    "batidor de mano pequeño"
  ],
  "spatula": [
    "刮刀或锅铲",
    "スパチュラ（ヘラまたはフライ返し）",
    "spatule",
    "spatola",
    "espátula"
  ],
  "spätzle maker or sturdy wide-holed colander": [
    "德式面疙瘩制作器，或结实的大孔沥水篮",
    "シュペッツレ削り器または頑丈な大穴ざる",
    "appareil à spätzle ou passoire robuste à gros trous",
    "macchina per spätzle o scolapasta robusto a fori larghi",
    "utensilio para spätzle o escurridor resistente de orificios anchos"
  ],
  "spice bag": [
    "香料袋",
    "香辛料用パック",
    "sachet d'épices",
    "sacchetto filtro per spezie",
    "bolsa para especias"
  ],
  "spice grinder or mortar": [
    "香料研磨机或研钵",
    "スパイスグラインダーまたはすり鉢",
    "moulin à épices ou mortier",
    "macina spezie o mortaio",
    "molinillo de especias o mortero"
  ],
  "spoon": [
    "勺子",
    "スプーン",
    "cuillère",
    "cucchiaio",
    "cuchara"
  ],
  "steamer": [
    "蒸锅",
    "蒸し器",
    "cuit-vapeur",
    "vaporiera",
    "vaporera"
  ],
  "steamer rack": [
    "蒸架",
    "蒸し網",
    "grille de cuisson vapeur",
    "cestello grigliato per cottura a vapore",
    "rejilla para vapor"
  ],
  "steamer rack or basket": [
    "蒸架或蒸篮",
    "蒸し台または蒸しカゴ",
    "grille ou panier vapeur",
    "griglia o cestello per cottura a vapore",
    "rejilla o cesta para cocinar al vapor"
  ],
  "stockpot": [
    "大汤锅",
    "スープ寸胴鍋",
    "marmite à bouillon",
    "pentolone da brodo",
    "olla para caldo"
  ],
  "strainer": [
    "过滤筛",
    "こし器",
    "passoire",
    "colino",
    "colador"
  ],
  "tagine or heavy dutch oven": [
    "塔吉锅或厚底带盖铸铁锅",
    "タジン鍋または重厚なダッチオーブン",
    "plat à tajine ou cocotte lourde en fonte",
    "tajine o casseruola pesante in ghisa",
    "tajín o cazuela pesada de hierro fundido"
  ],
  "thin-probe food thermometer": [
    "细探针食品温度计",
    "極細プローブ付き中心温度計",
    "thermomètre sonde fine pour aliments",
    "termometro per alimenti a sonda sottile",
    "termómetro para alimentos con sonda fina"
  ],
  "three glasses": [
    "3个玻璃杯",
    "グラス3個",
    "trois verres",
    "tre bicchieri",
    "tres vasos"
  ],
  "three mixing bowls": [
    "3个搅拌碗",
    "ミキシングボウル3個",
    "trois saladiers",
    "tre ciotole per mescolare",
    "tres cuencos para mezclar"
  ],
  "toaster": [
    "吐司烤面包机",
    "トースター",
    "grille-pain",
    "tostapane",
    "tostadora"
  ],
  "toaster oven with grill setting": [
    "带烧烤功能的烤面包箱",
    "グリル機能付きオーブントースター",
    "four grille-pain avec fonction gril",
    "fornetto tostapane con funzione grill",
    "horno tostador con función grill"
  ],
  "tongs": [
    "料理夹",
    "トング",
    "pince de cuisine",
    "pinze da cucina",
    "pinzas de cocina"
  ],
  "toothpicks": [
    "牙签",
    "つま楊枝",
    "cure-dents",
    "stuzzicadenti",
    "palillos de dientes"
  ],
  "tray": [
    "托盘",
    "トレー",
    "plateau",
    "vassoio",
    "bandeja"
  ],
  "twelve-cup muffin tin": [
    "12孔马芬烤模",
    "12個用マフィン型",
    "plaque à muffins 12 trous",
    "stampo per muffin da 12",
    "molde para 12 magdalenas"
  ],
  "twenty-centimeter removable-base tin": [
    "20厘米活底圆模",
    "20cm底取れ式焼き型",
    "moule à fond amovible de 20 cm",
    "tortiera con fondo rimovibile da 20 cm",
    "molde con fondo desmontable de 20 cm"
  ],
  "two bowls": [
    "2个碗",
    "ボウル2個",
    "deux bols",
    "due ciotole",
    "dos cuencos"
  ],
  "two clean bowls": [
    "2个洁净碗",
    "清潔なボウル2個",
    "deux bols propres",
    "due ciotole pulite",
    "dos cuencos limpios"
  ],
  "two clean food-grade containers large enough for water and grounds with headspace": [
    "2个足够容纳咖啡粉与水并留有顶部空间的洁净食品级容器",
    "粉と水を入れても余裕のある清潔な食品用容器2個",
    "deux récipients alimentaires propres assez grands avec espace supérieur",
    "due contenitori per uso alimentare puliti abbastanza capienti da lasciare spazio in cima",
    "dos recipientes limpios de uso alimentario bastante amplios para café y agua dejando holgura"
  ],
  "two covered saucepans": [
    "2个带盖单柄小锅",
    "蓋付き片手鍋2個",
    "deux casseroles avec couvercle",
    "due casseruole con coperchio",
    "dos cazos con tapa"
  ],
  "two cups": [
    "2个杯子",
    "カップ2客",
    "deux tasses",
    "due tazze",
    "dos tazas"
  ],
  "two forks": [
    "2把餐叉",
    "フォーク2本",
    "deux fourchettes",
    "due forchette",
    "dos tenedores"
  ],
  "two frying pans": [
    "2个平底煎锅",
    "フライパン2枚",
    "deux poêles",
    "due padelle",
    "dos sartenes"
  ],
  "two glasses": [
    "2个玻璃杯",
    "グラス2個",
    "deux verres",
    "due bicchieri",
    "dos vasos"
  ],
  "two large glasses": [
    "2个大玻璃杯",
    "大型グラス2個",
    "deux grands verres",
    "due bicchieri grandi",
    "dos vasos grandes"
  ],
  "two large pots": [
    "2个大煮锅",
    "大鍋2個",
    "deux grandes marmites",
    "due grandi pentole",
    "dos ollas grandes"
  ],
  "two mixing bowls": [
    "2个搅拌碗",
    "ミキシングボウル2個",
    "deux saladiers",
    "due ciotole per impastare",
    "dos cuencos para mezclar"
  ],
  "two shallow bowls": [
    "2个浅碗",
    "浅底ボウル2個",
    "deux bols peu profonds",
    "due ciotole basse",
    "dos cuencos llanos"
  ],
  "vegetable peeler": [
    "果蔬削皮刀",
    "ピーラー",
    "épluche-légumes",
    "pelaverdure",
    "pelador de verduras"
  ],
  "whisk": [
    "手动打蛋器",
    "泡立て器",
    "fouet manuel",
    "frusta a mano",
    "batidor de varillas manual"
  ],
  "whisk or electric hand mixer": [
    "手动打蛋器或电动打蛋机",
    "泡立て器またはハンドミキサー",
    "fouet manuel ou batteur électrique",
    "frusta a mano o sbattitore elettrico",
    "batidor manual o batidora eléctrica de varillas"
  ],
  "wide covered frying pan": [
    "宽口带盖煎锅",
    "フタ付き幅広フライパン",
    "grande poêle évasée avec couvercle",
    "padella larga con coperchio",
    "sartén ancha con tapa"
  ],
  "wide deep frying pan with lid": [
    "宽口深底带盖煎锅",
    "フタ付き幅広深型フライパン",
    "grande poêle profonde et évasée avec couvercle",
    "padella larga e profonda con coperchio",
    "sartén ancha y profunda con tapa"
  ],
  "wide flat skewers": [
    "宽扁烤肉签",
    "幅広の平型スキュワー",
    "brochettes plates et larges",
    "spiedi piatti larghi",
    "brochetas anchas y planas"
  ],
  "wide glass or bowl": [
    "宽口玻璃杯或碗",
    "口の広いグラスまたは器",
    "grand verre large ou bol",
    "bicchiere largo o ciotola",
    "vaso ancho o cuenco"
  ],
  "wide heavy pot": [
    "宽口厚底锅",
    "厚手の広口鍋",
    "marmite large et épaisse",
    "pentola larga a fondo spesso",
    "olla ancha de fondo grueso"
  ],
  "wide level burner or outdoor fire": [
    "宽阔平稳炉头或室外明火",
    "平らで広いバーナーまたは屋外の直火",
    "brûleur large et horizontal ou feu d'extérieur",
    "fornello largo e livellato o fuoco all'aperto",
    "quemador amplio y nivelado o fuego exterior"
  ],
  "wide sauté pan or dutch oven": [
    "宽口炒炖锅或厚底带盖铸铁锅",
    "幅広ソテーパンまたはダッチオーブン",
    "grande sauteuse ou cocotte en fonte",
    "ampia sauteuse o casseruola in ghisa",
    "sartén ancha para saltear o cazuela tipo dutch oven"
  ],
  "wide skillet": [
    "宽底煎锅",
    "幅広のフライパン",
    "grande poêle évasée",
    "padella larga",
    "sartén amplia"
  ],
  "wok": [
    "中式炒锅",
    "中華鍋",
    "wok",
    "wok",
    "wok"
  ],
  "wok or large frying pan": [
    "炒锅或大平底锅",
    "中華鍋または大型フライパン",
    "wok ou grande poêle",
    "wok o padella grande",
    "wok o sartén grande"
  ],
  "wok or large skillet": [
    "炒锅或大煎锅",
    "中華鍋または大型スキレット",
    "wok ou grande poêle",
    "wok o grande padella",
    "wok o sartén grande"
  ],
  "wok or medium saucepan": [
    "炒锅或中号单柄锅",
    "中華鍋または中型片手鍋",
    "wok ou casserole moyenne",
    "wok o casseruola media",
    "wok o cazo mediano"
  ],
  "wok or wide skillet": [
    "中式炒锅或宽底平底锅",
    "中華鍋または幅広フライパン",
    "wok ou grande poêle évasée",
    "wok o padella ampia",
    "wok o sartén ancha"
  ],
  "wok with lid": [
    "带盖炒锅",
    "蓋付き中華鍋",
    "wok avec couvercle",
    "wok con coperchio",
    "wok con tapa"
  ],
  "wooden skewers": [
    "木签",
    "竹串・木串",
    "brochettes en bois",
    "spiedini di legno",
    "brochetas de madera"
  ],
  "wooden spoon": [
    "木勺",
    "木べら・木製スプーン",
    "cuillère en bois",
    "cucchiaio di legno",
    "cuchara de madera"
  ]
};
