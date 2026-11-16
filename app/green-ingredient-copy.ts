// Short public copy, manually reviewed in five languages. No runtime model calls.
const sources = [
  "The green pantry", "Discover fresh green ingredients and what to cook with them.",
  "Spinach", "Basil", "Peas", "Avocado", "Image sources",
  "Leafy greens for soups, pies, and quick sautés.",
  "Fresh leaves for pesto, salads, and fragrant finishes.",
  "Sweet green peas for rice, pasta, and soups.",
  "Creamy avocado for dips, salads, and sandwiches.",
] as const;
const targets = {
  zh: ["绿色食材图鉴", "认识新鲜的绿色食材，发现它们的美味做法。", "菠菜", "罗勒", "豌豆", "牛油果", "图片来源",
    "煮汤、烘焙或快炒，让绿叶菜变成一餐美味。", "用新鲜叶片制作青酱、拌入沙拉，或为菜肴增香。",
    "清甜豌豆，适合搭配米饭、意面和汤品。", "绵密牛油果，适合制作蘸酱、沙拉和三明治。"],
  ja: ["緑の食材図鑑", "新鮮な緑の食材と、そのおいしい使い方を見つけましょう。", "ほうれん草", "バジル", "グリーンピース", "アボカド", "画像の出典",
    "スープ、パイ、さっと炒める料理に使える葉野菜。", "ペストやサラダ、仕上げの香りづけに使う新鮮な葉。",
    "ご飯、パスタ、スープに合う甘みのあるグリーンピース。", "ディップ、サラダ、サンドイッチに合うなめらかなアボカド。"],
  fr: ["Le garde-manger vert", "Découvrez des ingrédients verts et frais, et des idées pour les cuisiner.", "Épinards", "Basilic", "Petits pois", "Avocat", "Sources des images",
    "Des feuilles vertes pour les soupes, les tartes et les poêlées express.", "Des feuilles fraîches pour le pesto, les salades et une touche parfumée.",
    "Des petits pois doux pour accompagner le riz, les pâtes et les soupes.", "Un avocat onctueux pour les sauces à tremper, les salades et les sandwichs."],
  it: ["La dispensa verde", "Scopri ingredienti verdi e freschi e tante idee per cucinarli.", "Spinaci", "Basilico", "Piselli", "Avocado", "Fonti delle immagini",
    "Verdure a foglia per zuppe, torte salate e piatti saltati in padella.", "Foglie fresche per pesto, insalate e un tocco aromatico finale.",
    "Dolci piselli verdi per riso, pasta e zuppe.", "Avocado cremoso per salse, insalate e panini."],
  es: ["La despensa verde", "Descubre ingredientes verdes y frescos e ideas para cocinarlos.", "Espinacas", "Albahaca", "Guisantes", "Aguacate", "Fuentes de las imágenes",
    "Hojas verdes para sopas, tartas saladas y salteados rápidos.", "Hojas frescas para pesto, ensaladas y un toque aromático final.",
    "Guisantes dulces para acompañar arroz, pasta y sopas.", "Aguacate cremoso para salsas, ensaladas y sándwiches."],
};
export const greenIngredientCopy: Record<string, Record<string, string>> = Object.fromEntries(
  Object.entries(targets).map(([locale, strings]) => [locale, Object.fromEntries(sources.map((source, index) => [source, strings[index]]))]),
);
