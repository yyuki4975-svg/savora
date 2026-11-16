// Fuzzy, intent-aware recipe search for Explore. Pure and self-contained (no imports), so it runs on the
// server for Explore and suggestions and is unit-testable directly.
//
// 1. Intents: everyday words in six languages ("spicy", "辣", "快手", "冬天", "vegetarian", "川菜", "italian")
//    become conditions on the catalogue (ingredient facet, menu, time, country).
// 2. Spelling: Latin words that occur nowhere are corrected to the closest catalogue word ("chiken" → "chicken").
// 3. Ranking: weighted fields instead of "every word must appear": title > ingredients > place > menu > other text.
//    Chinese/Japanese runs also match by two-character fragments, so "番茄炒蛋" finds 西红柿炒鸡蛋-style wording
//    through the shared fragments. When nothing satisfies every condition, close matches are shown and flagged.

export type SearchLocale = "en" | "zh" | "ja" | "fr" | "it" | "es";

export type SearchableRecipe = {
  slug: string;
  title: string;
  ingredients: readonly string[];
  menuCategories: readonly string[];
  countrySlug: string;
  country: string;
  place: string | null;
  totalMinutes: number | null;
  /** Everything else that should be findable (summary, notes, keywords), any language. */
  text: string;
  /** Accepted translations of title/summary/ingredients, already normalized. */
  localized?: string;
};

type Condition =
  | { kind: "menu"; values: readonly string[] }
  | { kind: "ingredient"; facet: "chile" | "fish" | "rice" | "herbs" | "citrus" | "coconut" | "tomato" | "eggplant" }
  | { kind: "time"; max: number; simpleIngredients: number }
  | { kind: "country"; values: readonly string[] }
  | { kind: "meatless" };

export type Intent = {
  id: string;
  labels: Record<SearchLocale, string>;
  /** Normalized trigger words/phrases in any language. */
  triggers: readonly string[];
  condition: Condition;
  /** Extra words that should also score (e.g. "sichuan" for 川菜). */
  boost?: readonly string[];
};

const L = (en: string, zh: string, ja: string, fr: string, it: string, es: string): Record<SearchLocale, string> => ({ en, zh, ja, fr, it, es });

export const intents: readonly Intent[] = [
  { id: "spicy", labels: L("Spicy", "辣味", "辛い料理", "Épicé", "Piccante", "Picante"), condition: { kind: "ingredient", facet: "chile" },
    triggers: ["酸辣汤", "麻辣烫", "担担面", "酸辣粉", "spicy", "hot and spicy", "chilli", "chili", "chile", "fiery", "麻辣", "香辣", "辣", "辛い", "ピリ辛", "激辛", "épicé", "épicée", "pimenté", "piquant", "piccante", "picante", "enchilado"] },
  { id: "quick", labels: L("Quick & simple", "快手简单", "手早く簡単", "Rapide et simple", "Veloce e semplice", "Rápido y sencillo"), condition: { kind: "time", max: 30, simpleIngredients: 7 },
    triggers: ["quick", "fast", "easy", "simple", "weeknight", "in a hurry", "speedy", "快手", "快速", "简单", "省时", "懒人", "下班", "簡単", "時短", "手軽", "すぐ", "rapide", "facile", "express", "veloce", "facile e veloce", "rapido", "rápido", "fácil", "sencillo"] },
  { id: "warming", labels: L("Soups & stews", "汤和炖菜", "スープ・煮込み", "Soupes et ragoûts", "Zuppe e stufati", "Sopas y guisos"), condition: { kind: "menu", values: ["soup"] },
    triggers: ["soup", "soups", "stew", "stews", "warming", "warm", "hearty", "火锅", "热乎", "warm me up", "winter", "cozy", "cosy", "comfort food", "rainy day", "cold day", "鸡汤", "鱼汤", "牛肉汤", "酸辣汤", "麻辣烫", "汤", "炖", "暖身", "暖胃", "冬天", "冬季", "天冷", "下雨", "スープ", "鍋料理", "煮込み", "冬の", "温まる", "soupe", "ragoût", "hiver", "réconfortant", "zuppa", "stufato", "inverno", "minestra", "sopa", "guiso", "invierno", "caldo"] },
  { id: "vegetarian", labels: L("Vegetarian-friendly", "素食友好", "ベジタリアン向け", "Végétarien", "Vegetariano", "Vegetariano"), condition: { kind: "meatless" },
    triggers: ["vegetarian", "vegan", "veggie", "meatless", "meat free", "meat-free", "plant based", "plant-based", "素食", "吃素", "素菜", "全素", "无肉", "ベジタリアン", "ヴィーガン", "菜食", "肉なし", "végétarien", "végétarienne", "végétalien", "vegetariano", "vegetariana", "vegano", "senza carne", "sin carne"] },
  { id: "dessert", labels: L("Desserts", "甜点", "デザート", "Desserts", "Dolci", "Postres"), condition: { kind: "menu", values: ["dessert"] },
    triggers: ["dessert", "desserts", "sweet", "sweets", "cake", "treat", "汤圆", "甜点", "甜品", "甜食", "蛋糕", "デザート", "スイーツ", "甘い", "お菓子", "sucré", "gâteau", "dolce", "dolci", "torta", "postre", "postres", "dulce", "pastel"] },
  { id: "drink", labels: L("Drinks", "饮品", "ドリンク", "Boissons", "Bevande", "Bebidas"), condition: { kind: "menu", values: ["drink", "cocktail"] },
    triggers: ["drink", "drinks", "beverage", "cocktail", "饮料", "饮品", "喝的", "鸡尾酒", "飲み物", "ドリンク", "カクテル", "boisson", "boissons", "bevanda", "bevande", "bebida", "bebidas"] },
  { id: "breakfast", labels: L("Breakfast", "早餐", "朝食", "Petit-déjeuner", "Colazione", "Desayuno"), condition: { kind: "menu", values: ["breakfast"] },
    triggers: ["breakfast", "brunch", "早餐", "早饭", "早点", "朝食", "朝ごはん", "モーニング", "petit-déjeuner", "petit déjeuner", "colazione", "desayuno"] },
  { id: "light", labels: L("Light & fresh", "清淡轻食", "あっさり・ヘルシー", "Léger", "Leggero", "Ligero"), condition: { kind: "menu", values: ["salad", "vegetable", "seafood"] },
    triggers: ["light", "healthy", "fresh", "low fat", "清淡", "健康", "轻食", "低脂", "减脂", "爽口", "あっさり", "ヘルシー", "さっぱり", "léger", "légère", "sain", "leggero", "sano", "ligero", "saludable"] },
  { id: "seafood", labels: L("Seafood", "海鲜", "魚介", "Fruits de mer", "Pesce e frutti di mare", "Mariscos"), condition: { kind: "menu", values: ["seafood"] },
    triggers: ["鱼汤", "seafood", "fish", "shrimp", "prawn", "海鲜", "鱼", "虾", "蟹", "魚介", "魚", "海鮮", "エビ", "fruits de mer", "poisson", "pesce", "frutti di mare", "mariscos", "pescado"] },
  { id: "poultry", labels: L("Chicken & poultry", "鸡肉禽类", "鶏肉", "Volaille", "Pollame", "Aves"), condition: { kind: "menu", values: ["poultry"] },
    triggers: ["鸡汤", "炸鸡", "chicken", "poultry", "turkey", "duck", "鸡肉", "鸡腿", "鸡翅", "鸡胸", "鸭肉", "烤鸭", "鶏肉", "唐揚げ", "チキン", "poulet", "volaille", "pollo", "anatra", "pato"] },
  { id: "meat", labels: L("Meat", "肉类", "肉料理", "Viande", "Carne", "Carne"), condition: { kind: "menu", values: ["meat"] },
    triggers: ["meat", "beef", "pork", "lamb", "steak", "牛肉面", "牛肉汤", "吃肉", "肉类", "牛肉", "猪肉", "羊肉", "排骨", "红烧肉", "肉料理", "豚肉", "viande", "bœuf", "porc", "agneau", "manzo", "maiale", "agnello", "carne", "cerdo", "cordero", "res"] },
  { id: "noodles", labels: L("Pasta & noodles", "面食", "麺・パスタ", "Pâtes et nouilles", "Pasta e noodles", "Pasta y fideos"), condition: { kind: "menu", values: ["pasta"] },
    triggers: ["noodles", "noodle", "pasta", "牛肉面", "担担面", "酸辣粉", "ramen", "面条", "面食", "拉面", "汤面", "炒面", "米粉", "意面", "麺", "ラーメン", "うどん", "パスタ", "pâtes", "nouilles", "spaghetti", "fideos", "tallarines"] },
  { id: "rice", labels: L("Rice & grains", "米饭谷物", "ご飯もの", "Riz et céréales", "Riso e cereali", "Arroz y cereales"), condition: { kind: "menu", values: ["rice"] },
    triggers: ["蛋炒饭", "rice", "risotto", "grains", "米饭", "炒饭", "盖饭", "拌饭", "饭团", "ご飯", "丼", "炊き込み", "riz", "riso", "arroz"] },
  { id: "baking", labels: L("Bread & baking", "烘焙", "パン・焼き菓子", "Boulangerie", "Pane e forno", "Panadería"), condition: { kind: "menu", values: ["bread"] },
    triggers: ["bake", "baking", "bread", "烘焙", "面包", "烤箱", "パン", "焼き菓子", "pain", "boulangerie", "pane", "forno", "pan", "hornear"] },
  { id: "grill", labels: L("Grill & barbecue", "烧烤", "グリル・BBQ", "Grillades", "Grigliata", "Parrilla"), condition: { kind: "menu", values: ["grill"] },
    triggers: ["grill", "grilled", "barbecue", "bbq", "烧烤", "烤肉", "串", "焼き", "バーベキュー", "grillé", "barbecue", "griglia", "alla griglia", "parrilla", "asado"] },
  { id: "salad", labels: L("Salads", "沙拉", "サラダ", "Salades", "Insalate", "Ensaladas"), condition: { kind: "menu", values: ["salad"] },
    triggers: ["salad", "salads", "沙拉", "凉拌", "サラダ", "salade", "insalata", "ensalada"] },
  { id: "coconut", labels: L("Coconut", "椰香", "ココナッツ", "Coco", "Cocco", "Coco"), condition: { kind: "ingredient", facet: "coconut" },
    triggers: ["coconut", "椰子", "椰浆", "椰奶", "ココナッツ", "coco", "noix de coco", "cocco"] },
  { id: "citrus", labels: L("Citrus", "柑橘", "柑橘", "Agrumes", "Agrumi", "Cítricos"), condition: { kind: "ingredient", facet: "citrus" },
    triggers: ["citrus", "lemony", "柑橘", "柠檬", "レモン", "柑橘類", "agrumes", "citron", "agrumi", "limone", "cítricos", "limón"] },
  // Cuisines → countries (adjectives and cuisine names are not in the catalogue text).
  { id: "chinese", labels: L("Chinese", "中餐", "中華料理", "Chinois", "Cinese", "China"), condition: { kind: "country", values: ["china"] },
    triggers: ["chinese", "中餐", "中国菜", "中式", "家常菜", "中華", "中華料理", "chinois", "chinoise", "cinese", "china", "chino"] },
  { id: "sichuan", labels: L("Sichuan", "川菜", "四川料理", "Sichuan", "Sichuan", "Sichuan"), condition: { kind: "country", values: ["china"] }, boost: ["sichuan", "chengdu", "mapo", "花椒", "四川"],
    triggers: ["sichuan", "szechuan", "川菜", "四川", "四川料理"] },
  { id: "cantonese", labels: L("Cantonese", "粤菜", "広東料理", "Cantonais", "Cantonese", "Cantonés"), condition: { kind: "country", values: ["china"] }, boost: ["cantonese", "guangdong", "hong kong", "广东", "粤"],
    triggers: ["cantonese", "粤菜", "广东菜", "広東料理", "cantonais", "cantonés"] },
  { id: "japanese", labels: L("Japanese", "日料", "和食", "Japonais", "Giapponese", "Japonesa"), condition: { kind: "country", values: ["japan"] },
    triggers: ["japanese", "日料", "日本菜", "日式", "和食", "日本料理", "japonais", "japonaise", "giapponese", "japonés", "japonesa"] },
  { id: "korean", labels: L("Korean", "韩餐", "韓国料理", "Coréen", "Coreana", "Coreana"), condition: { kind: "country", values: ["south-korea"] },
    triggers: ["korean", "韩餐", "韩国菜", "韩式", "韓国料理", "韓国", "coréen", "coréenne", "coreano", "coreana"] },
  { id: "thai", labels: L("Thai", "泰国菜", "タイ料理", "Thaï", "Thailandese", "Tailandesa"), condition: { kind: "country", values: ["thailand"] },
    triggers: ["thai", "泰国菜", "泰式", "タイ料理", "thaï", "thaïlandais", "thailandese", "tailandés", "tailandesa"] },
  { id: "vietnamese", labels: L("Vietnamese", "越南菜", "ベトナム料理", "Vietnamien", "Vietnamita", "Vietnamita"), condition: { kind: "country", values: ["vietnam"] },
    triggers: ["vietnamese", "越南菜", "越式", "ベトナム料理", "vietnamien", "vietnamita"] },
  { id: "indian", labels: L("Indian", "印度菜", "インド料理", "Indien", "Indiana", "India"), condition: { kind: "country", values: ["india"] },
    triggers: ["indian", "印度菜", "インド料理", "indien", "indienne", "indiano", "indiana", "indio", "hindú"] },
  { id: "italian", labels: L("Italian", "意大利菜", "イタリア料理", "Italien", "Italiana", "Italiana"), condition: { kind: "country", values: ["italy"] },
    triggers: ["italian", "意大利菜", "意餐", "意式", "イタリアン", "イタリア料理", "italien", "italienne", "italiano", "italiana"] },
  { id: "french", labels: L("French", "法餐", "フランス料理", "Française", "Francese", "Francesa"), condition: { kind: "country", values: ["france"] },
    triggers: ["french", "法餐", "法国菜", "法式", "フレンチ", "フランス料理", "français", "française", "francese", "francés", "francesa"] },
  { id: "spanish", labels: L("Spanish", "西班牙菜", "スペイン料理", "Espagnole", "Spagnola", "Española"), condition: { kind: "country", values: ["spain"] },
    triggers: ["spanish", "西班牙菜", "西式小吃", "スペイン料理", "espagnol", "espagnole", "spagnolo", "spagnola", "español", "española"] },
  { id: "mexican", labels: L("Mexican", "墨西哥菜", "メキシコ料理", "Mexicaine", "Messicana", "Mexicana"), condition: { kind: "country", values: ["mexico"] },
    triggers: ["mexican", "墨西哥菜", "墨西哥", "メキシコ料理", "mexicain", "mexicaine", "messicano", "messicana", "mexicano", "mexicana"] },
  { id: "greek", labels: L("Greek", "希腊菜", "ギリシャ料理", "Grecque", "Greca", "Griega"), condition: { kind: "country", values: ["greece"] },
    triggers: ["greek", "希腊菜", "ギリシャ料理", "grec", "grecque", "greco", "greca", "griego", "griega"] },
  { id: "turkish", labels: L("Turkish", "土耳其菜", "トルコ料理", "Turque", "Turca", "Turca"), condition: { kind: "country", values: ["turkiye", "t-rkiye", "turkey"] },
    triggers: ["turkish", "土耳其菜", "トルコ料理", "turc", "turque", "turco", "turca"] },
  { id: "moroccan", labels: L("Moroccan", "摩洛哥菜", "モロッコ料理", "Marocaine", "Marocchina", "Marroquí"), condition: { kind: "country", values: ["morocco"] },
    triggers: ["moroccan", "摩洛哥菜", "モロッコ料理", "marocain", "marocaine", "marocchino", "marocchina", "marroquí"] },
  { id: "american", labels: L("American", "美式", "アメリカ料理", "Américaine", "Americana", "Estadounidense"), condition: { kind: "country", values: ["united-states"] },
    triggers: ["american", "美式", "美国菜", "アメリカ料理", "américain", "américaine", "americano", "americana", "estadounidense"] },
];

/** Lower-case, accent-insensitive (same rule as the existing Explore search). */
export function normalize(value: string): string {
  return value.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("en");
}

const cjk = /[぀-ヿ㐀-鿿豈-﫿]/u;
const stopWords = new Set(["dinner", "lunch", "supper", "meal", "meals", "tonight", "today", "晚饭", "晚餐", "午饭", "午餐", "今晚", "一顿", "夕食", "昼食", "dîner", "déjeuner", "cena", "pranzo", "almuerzo", "comida", "a", "an", "the", "and", "or", "with", "for", "of", "to", "in", "on", "me", "my", "some", "something", "recipe", "recipes", "dish", "dishes", "food", "make", "cook", "want", "like", "i", "de", "la", "le", "les", "des", "du", "et", "con", "di", "il", "lo", "el", "los", "las", "y", "per", "pour", "para", "una", "un", "une", "菜", "菜谱", "食谱", "做法", "的", "想吃", "想做", "推荐", "一道", "料理", "レシピ", "の"]);

// ---- Food words: equivalents across languages, and segmentation of Chinese/Japanese phrases ----
// A search word in a group matches any member, so 番茄 also finds 西红柿 and "tomato";
// "番茄炒蛋" is split into 番茄 · 炒 · 蛋.
export const foodLexicon: readonly (readonly string[])[] = [
  ["tomato", "番茄", "西红柿", "トマト", "tomate", "pomodoro", "jitomate"],
  ["egg", "蛋", "鸡蛋", "卵", "たまご", "玉子", "oeuf", "œuf", "uovo", "huevo"],
  ["potato", "土豆", "马铃薯", "洋芋", "じゃがいも", "ポテト", "pomme de terre", "patata", "papa"],
  ["beef", "牛肉", "牛", "ビーフ", "bœuf", "boeuf", "manzo", "res", "ternera"],
  ["pork", "猪肉", "豚肉", "ポーク", "porc", "maiale", "cerdo"],
  ["lamb", "羊肉", "ラム", "agneau", "agnello", "cordero"],
  ["chicken", "鸡肉", "鸡", "鶏肉", "チキン", "poulet", "pollo"],
  ["duck", "鸭", "鸭肉", "鴨", "canard", "anatra", "pato"],
  ["fish", "鱼", "魚", "poisson", "pesce", "pescado"],
  ["shrimp", "prawn", "虾", "えび", "エビ", "海老", "crevette", "gambero", "gamberi", "camarón", "gamba"],
  ["crab", "蟹", "螃蟹", "かに", "カニ", "crabe", "granchio", "cangrejo"],
  ["salmon", "三文鱼", "鲑鱼", "鮭", "サーモン", "saumon", "salmone", "salmón"],
  ["tofu", "豆腐", "tofu"],
  ["rice", "米饭", "大米", "米", "ご飯", "ごはん", "riz", "riso", "arroz"],
  ["noodle", "noodles", "面条", "面", "麺", "ラーメン", "nouilles", "fideos", "tagliatelle"],
  ["pasta", "意面", "意大利面", "パスタ", "pâtes", "pasta"],
  ["bread", "面包", "パン", "pain", "pane", "pan"],
  ["dumpling", "dumplings", "饺子", "包子", "馄饨", "餃子", "raviolis chinois", "gyoza"],
  ["mushroom", "mushrooms", "蘑菇", "香菇", "菌", "きのこ", "しいたけ", "champignon", "fungo", "funghi", "champiñón", "seta", "hongo"],
  ["eggplant", "aubergine", "茄子", "なす", "melanzana", "berenjena"],
  ["zucchini", "courgette", "西葫芦", "ズッキーニ", "zucchina", "calabacín"],
  ["cucumber", "黄瓜", "きゅうり", "concombre", "cetriolo", "pepino"],
  ["carrot", "carrots", "胡萝卜", "にんじん", "人参", "carotte", "carota", "zanahoria"],
  ["onion", "onions", "洋葱", "玉ねぎ", "たまねぎ", "oignon", "cipolla", "cebolla"],
  ["garlic", "大蒜", "蒜", "にんにく", "ail", "aglio", "ajo"],
  ["ginger", "姜", "生姜", "しょうが", "gingembre", "zenzero", "jengibre"],
  ["scallion", "spring onion", "green onion", "葱", "小葱", "ねぎ", "ネギ", "cébette", "cipollotto", "cebolleta"],
  ["cilantro", "coriander", "香菜", "パクチー", "coriandre", "coriandolo", "cilantro"],
  ["basil", "罗勒", "バジル", "basilic", "basilico", "albahaca"],
  ["spinach", "菠菜", "ほうれん草", "épinard", "spinaci", "espinaca"],
  ["cabbage", "白菜", "卷心菜", "包菜", "キャベツ", "chou", "cavolo", "repollo", "col"],
  ["pumpkin", "squash", "南瓜", "かぼちゃ", "citrouille", "potiron", "zucca", "calabaza"],
  ["corn", "玉米", "とうもろこし", "コーン", "maïs", "mais", "maíz", "elote"],
  ["bean", "beans", "豆", "豆子", "まめ", "haricot", "fagioli", "frijol", "frijoles", "judía"],
  ["chickpea", "chickpeas", "garbanzo", "鹰嘴豆", "ひよこ豆", "pois chiche", "ceci", "garbanzos"],
  ["lentil", "lentils", "扁豆", "小扁豆", "レンズ豆", "lentille", "lenticchie", "lenteja"],
  ["apple", "苹果", "りんご", "pomme", "mela", "manzana"],
  ["banana", "香蕉", "バナナ", "banane", "plátano"],
  ["lemon", "柠檬", "レモン", "citron", "limone", "limón"],
  ["chocolate", "巧克力", "チョコレート", "chocolat", "cioccolato"],
  ["milk", "牛奶", "奶", "牛乳", "ミルク", "lait", "latte", "leche"],
  ["cheese", "奶酪", "芝士", "チーズ", "fromage", "formaggio", "queso"],
  ["butter", "黄油", "バター", "beurre", "burro", "mantequilla"],
  ["coconut", "椰子", "椰浆", "ココナッツ", "coco", "noix de coco", "cocco"],
  ["peanut", "peanuts", "花生", "ピーナッツ", "cacahuète", "arachidi", "cacahuete", "maní"],
  ["sesame", "芝麻", "ごま", "sésame", "sesamo", "sésamo"],
  ["soy sauce", "酱油", "醤油", "しょうゆ", "sauce soja", "salsa di soia", "salsa de soja"],
  ["curry", "咖喱", "カレー", "curry", "cari"],
  ["dessert", "甜点", "甜品", "デザート", "dessert", "dolce", "postre"],
  ["cake", "蛋糕", "ケーキ", "gâteau", "torta", "pastel", "bizcocho"],
  ["cookie", "cookies", "biscuit", "饼干", "曲奇", "クッキー", "biscotto", "galleta"],
  ["pancake", "pancakes", "煎饼", "松饼", "パンケーキ", "crêpe", "frittella", "tortita"],
  ["salad", "沙拉", "サラダ", "salade", "insalata", "ensalada"],
  ["soup", "汤", "スープ", "soupe", "zuppa", "sopa"],
  ["stew", "炖", "炖菜", "煮込み", "ragoût", "stufato", "guiso", "estofado"],
  ["stir fry", "stir-fry", "stir fried", "炒", "炒菜", "炒め", "sauté", "saltato", "salteado"],
  ["fried", "deep fried", "炸", "油炸", "揚げ", "フライ", "frit", "fritto", "frito"],
  ["steamed", "蒸", "蒸し", "à la vapeur", "al vapore", "al vapor"],
  ["roast", "roasted", "烤", "焼き", "rôti", "arrosto", "asado"],
  ["braised pork", "red-braised pork", "红烧肉", "东坡肉", "角煮", "pork belly"],
  ["braised", "红烧", "焖", "煮物", "braisé", "brasato", "estofado"],
  ["cold", "凉拌", "冷", "冷たい", "froid", "freddo", "frío"],
];

const groups = foodLexicon.map((group) => group.map(normalize));
const groupOf = new Map<string, readonly string[]>();
for (const group of groups) for (const word of group) if (!groupOf.has(word)) groupOf.set(word, group);
const cjkWords = [...groupOf.keys()].filter((word) => cjk.test(word)).sort((left, right) => right.length - left.length);

/** All equivalent spellings for a word (the word itself when it is not in the lexicon). */
export function equivalents(word: string): readonly string[] {
  return groupOf.get(word) ?? [word];
}

export function isLexiconWord(word: string): boolean {
  return groupOf.has(word);
}

/** Split a Chinese/Japanese run on known food words; unknown single characters are dropped. */
export function segmentCjk(run: string): string[] {
  const parts: string[] = [];
  let index = 0, unknown = "";
  const flush = () => { if (Array.from(unknown).length >= 2) parts.push(unknown); unknown = ""; };
  while (index < run.length) {
    const word = cjkWords.find((candidate) => run.startsWith(candidate, index));
    if (word) { flush(); parts.push(word); index += word.length; }
    else { unknown += run[index]; index += 1; }
  }
  flush();
  return parts.length ? parts : [run];
}

function isWordChar(char: string | undefined) { return char !== undefined && /[\p{L}\p{N}]/u.test(char) && !cjk.test(char); }

/** Find intents in the query; returns them plus the query with their trigger text removed. */
export function detectIntents(query: string): { found: Intent[]; rest: string } {
  let rest = ` ${normalize(query)} `;
  const found: Intent[] = [];
  const triggers = intents.flatMap((intent) => intent.triggers.map((trigger) => ({ intent, trigger: normalize(trigger) })))
    .sort((left, right) => right.trigger.length - left.trigger.length || left.trigger.localeCompare(right.trigger));
  const owners = new Map<string, Intent[]>();
  for (const { intent, trigger } of triggers) owners.set(trigger, [...(owners.get(trigger) ?? []), intent]);
  for (const [trigger, named] of owners) {
    let index = rest.indexOf(trigger);
    while (index >= 0) {
      const before = rest[index - 1], after = rest[index + trigger.length];
      // Latin triggers must be whole words; CJK triggers may sit inside a run ("快手鸡肉").
      const whole = cjk.test(trigger) || (!isWordChar(before) && !isWordChar(after));
      if (whole) {
        for (const intent of named) if (!found.includes(intent)) found.push(intent);
        rest = `${rest.slice(0, index)} ${rest.slice(index + trigger.length)}`;
        index = rest.indexOf(trigger);
      } else index = rest.indexOf(trigger, index + 1);
    }
  }
  return { found, rest: rest.trim() };
}

function tokensOf(text: string): string[] {
  return normalize(text).split(/[^\p{L}\p{N}\p{M}]+/u).filter((token) => token && !stopWords.has(token));
}

function bigrams(run: string): string[] {
  const chars = Array.from(run);
  if (chars.length <= 2) return [run];
  return chars.slice(0, -1).map((char, index) => char + chars[index + 1]);
}

/** Damerau–Levenshtein distance, bounded (returns limit + 1 when exceeded). */
export function editDistance(a: string, b: string, limit = 2): number {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  const rows = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= a.length; i++) {
    let best = limit + 1;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) rows[i][j] = Math.min(rows[i][j], rows[i - 2][j - 2] + 1);
      best = Math.min(best, rows[i][j]);
    }
    if (best > limit) return limit + 1;
  }
  return rows[a.length][b.length];
}

const meatWords = /\b(?:beef|pork|lamb|mutton|veal|chicken|turkey|duck|goose|bacon|ham|sausage|chorizo|prosciutto|pancetta|guanciale|salami|pepperoni|mince|minced meat|steak|ribs?|fish|salmon|tuna|cod|shrimp|prawns?|crab|lobster|anchov(?:y|ies)|sardines?|clams?|mussels?|oysters?|squid|octopus|gelatin|lard|fish sauce|oyster sauce|oxtail|liver|kidney|venison|rabbit|goat)\b|[牛猪羊鸡鸭鹅鱼虾蟹肉]|ベーコン|ハム|豚|牛|鶏|魚|エビ/u;

type Facet = Extract<Condition, { kind: "ingredient" }>["facet"];
type PreparedRecipe = { recipe: SearchableRecipe; title: string; ingredients: string; place: string; menu: string; other: string; words: Set<string> };

function satisfies(prepared: PreparedRecipe, condition: Condition, facetMatch: (facet: Facet, ingredients: readonly string[]) => boolean): boolean {
  const { recipe } = prepared;
  switch (condition.kind) {
    case "menu": return condition.values.some((value) => recipe.menuCategories.includes(value));
    case "ingredient": return facetMatch(condition.facet, recipe.ingredients);
    case "time": return recipe.totalMinutes !== null ? recipe.totalMinutes <= condition.max : recipe.ingredients.length <= condition.simpleIngredients;
    case "country": return condition.values.includes(recipe.countrySlug);
    case "meatless": return !["meat", "poultry", "seafood"].some((menu) => recipe.menuCategories.includes(menu)) && !meatWords.test(prepared.ingredients);
  }
}

export type SearchOutcome<T extends SearchableRecipe> = {
  results: T[];
  intents: Intent[];
  /** Latin words replaced by the closest catalogue word. */
  corrections: Array<{ from: string; to: string }>;
  /** True when no recipe met every condition and close matches are shown instead. */
  relaxed: boolean;
};

/**
 * Rank recipes for a free-text query. `facetMatch` decides ingredient facets (Explore passes its tested matcher).
 * Hard Explore filters are applied by the caller; this function only interprets the query text.
 */
export function smartSearch<T extends SearchableRecipe>(recipes: readonly T[], query: string, facetMatch: (facet: Facet, ingredients: readonly string[]) => boolean): SearchOutcome<T> {
  const { found, rest } = detectIntents(query);
  const prepared: PreparedRecipe[] = recipes.map((recipe) => {
    const title = normalize(recipe.title);
    const ingredients = normalize(recipe.ingredients.join(" "));
    const place = normalize(`${recipe.country} ${recipe.place ?? ""} ${recipe.countrySlug.replaceAll("-", " ")}`);
    const menu = normalize(recipe.menuCategories.join(" "));
    const other = `${normalize(recipe.text)} ${recipe.localized ?? ""}`;
    return { recipe, title, ingredients, place, menu, other, words: new Set(tokensOf(`${recipe.title} ${recipe.ingredients.join(" ")} ${recipe.country} ${recipe.place ?? ""}`)) };
  });

  // Free words: correct Latin typos against the catalogue vocabulary when the word occurs nowhere.
  const corrections: Array<{ from: string; to: string }> = [];
  const rawTokens = tokensOf(rest).flatMap((token) => (cjk.test(token) ? segmentCjk(token) : [token]));
  const vocabulary = new Set<string>();
  for (const item of prepared) for (const word of item.words) if (word.length >= 4 && !cjk.test(word)) vocabulary.add(word);
  const tokens: string[] = rawTokens.map((token) => {
    if (cjk.test(token) || token.length < 4 || isLexiconWord(token)) return token;
    if (prepared.some((item) => item.title.includes(token) || item.ingredients.includes(token) || item.place.includes(token) || item.other.includes(token))) return token;
    const allowed = token.length >= 7 ? 2 : 1;
    let best: string | null = null, bestDistance = allowed + 1;
    for (const word of vocabulary) {
      const distance = editDistance(token, word, allowed);
      if (distance < bestDistance) { best = word; bestDistance = distance; }
    }
    if (best && bestDistance <= allowed) { corrections.push({ from: token, to: best }); return best; }
    return token;
  });
  if (corrections.length) {
    const again = detectIntents(tokens.join(" "));
    for (const intent of again.found) if (!found.includes(intent)) found.push(intent);
    tokens.splice(0, tokens.length, ...tokensOf(again.rest));
  }
  const boosts = found.flatMap((intent) => intent.boost ?? []).map(normalize);
  // Food words the intents absorbed still steer the order ("牛肉面" → beef first, "chicken" before turkey).
  const softWords = [...new Set(tokensOf(query).flatMap((token) => (cjk.test(token) ? segmentCjk(token) : [token])).filter(isLexiconWord))].filter((word) => !tokens.includes(word));
  // Words that express an intent also count when a recipe's own text uses them ("spicy" in a title).
  const intentWords = found.map((intent) => intent.triggers.map(normalize).filter((trigger) => trigger.length >= 3 || cjk.test(trigger)));

  // One word-start pattern per word (Latin words match at a word start; CJK anywhere), built once per query.
  const patterns = new Map<string, RegExp | null>();
  const patternFor = (word: string) => {
    if (!patterns.has(word)) patterns.set(word, cjk.test(word) ? null : new RegExp(`(?:^|[^\\p{L}\\p{N}])${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "u"));
    return patterns.get(word) ?? null;
  };
  const fieldScore = (item: PreparedRecipe, token: string): number => Math.max(...equivalents(token).map((word) => wordScore(item, word)));
  const wordScore = (item: PreparedRecipe, token: string): number => {
    const pattern = patternFor(token);
    const whole = (text: string) => (pattern ? pattern.test(text) : text.includes(token));
    if (whole(item.title)) return 6;
    if (item.title.includes(token)) return 4.5;
    if (whole(item.ingredients)) return 3;
    if (whole(item.place)) return 4;
    if (item.menu.includes(token)) return 2;
    if (item.other.includes(token)) return 1.5;
    if (cjk.test(token) && token.length > 2) {
      // Partial credit for Chinese/Japanese runs by shared two-character fragments.
      const grams = bigrams(token);
      const hits = grams.filter((gram) => item.title.includes(gram) || item.ingredients.includes(gram) || item.other.includes(gram)).length;
      if (hits / grams.length >= 0.5) return 3 * (hits / grams.length);
    }
    return 0;
  };

  const scored = prepared.map((item) => {
    let score = 0, matched = 0;
    for (const token of tokens) { const value = fieldScore(item, token); if (value > 0) matched++; score += value; }
    for (const boost of boosts) if (item.title.includes(boost) || item.other.includes(boost) || item.place.includes(boost)) score += 3;
    for (const soft of softWords) { const value = fieldScore(item, soft); if (value >= 3) score += value; }
    const met = found.filter((intent) => satisfies(item, intent.condition, facetMatch)).length;
    for (const words of intentWords) score += words.some((word) => item.title.includes(word)) ? 4 : words.some((word) => item.other.includes(word)) ? 1 : 0;
    // Known short times rank before "probably quick" guesses.
    if (found.some((intent) => intent.condition.kind === "time") && item.recipe.totalMinutes !== null && item.recipe.totalMinutes <= 30) score += 2;
    const coverage = tokens.length ? matched / tokens.length : 1;
    return { item, score: score + met * 5, matched, coverage, met };
  });

  const strict = scored.filter((entry) => entry.met === found.length && (tokens.length === 0 || entry.coverage === 1) && (tokens.length > 0 || found.length > 0));
  let pool = strict, relaxed = false;
  if (strict.length < 6 && (tokens.length > 1 || found.length > 1 || (found.length && tokens.length))) {
    // Close matches: at least half of the words and/or at least one condition.
    const minimum = Math.max(1, Math.ceil(tokens.length / 2));
    const close = scored.filter((entry) => !strict.includes(entry) && (entry.matched >= minimum || entry.met > 0) && (found.length === 0 || entry.met > 0 || entry.matched === tokens.length));
    if (close.length) { pool = [...strict, ...close]; relaxed = strict.length === 0; }
  }
  const ranked = pool.sort((left, right) => (right.met - left.met) || (right.coverage - left.coverage) || (right.score - left.score));
  return { results: ranked.map((entry) => entry.item.recipe as T), intents: found, corrections, relaxed };
}

const ingredientFacets: readonly Facet[] = ["tomato", "rice", "chile", "eggplant", "citrus", "coconut", "fish", "herbs"];

/** Coarse taste signals for a recipe (used only by the on-device recommendation profile). */
export function recipeSignals(recipe: SearchableRecipe, facetMatch: (facet: Facet, ingredients: readonly string[]) => boolean): string[] {
  const signals = recipe.menuCategories.map((menu) => `menu:${menu}`);
  for (const facet of ingredientFacets) if (facetMatch(facet, recipe.ingredients)) signals.push(`ing:${facet}`);
  if (recipe.countrySlug && recipe.countrySlug !== "general") signals.push(`country:${recipe.countrySlug}`);
  if (recipe.totalMinutes !== null && recipe.totalMinutes <= 30) signals.push("time:quick");
  if (!["meat", "poultry", "seafood"].some((menu) => recipe.menuCategories.includes(menu)) && !meatWords.test(normalize(recipe.ingredients.join(" ")))) signals.push("diet:vegetarian");
  return signals;
}

/** Signals expressed by a search's intents. */
export function intentSignals(found: readonly Intent[]): string[] {
  return found.flatMap((intent) => {
    const condition = intent.condition;
    if (condition.kind === "menu") return condition.values.map((value) => `menu:${value}`);
    if (condition.kind === "ingredient") return [`ing:${condition.facet}`];
    if (condition.kind === "country") return condition.values.map((value) => `country:${value}`);
    if (condition.kind === "time") return ["time:quick"];
    return ["diet:vegetarian"];
  });
}
