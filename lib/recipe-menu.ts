// Editorial discovery labels, not dietary/allergen certifications.
export const menuCategories = [
  { slug: "seafood", label: "Seafood", terms: "seafood fish shellfish 海鲜 鱼 虾 蟹" },
  { slug: "vegetable", label: "Vegetables", terms: "vegetable vegetables vegetarian 蔬菜 素菜" },
  { slug: "soup", label: "Soups & stews", terms: "soup soups stew stews 汤 炖菜" },
  { slug: "salad", label: "Salads", terms: "salad salads 沙拉" },
  { slug: "pizza", label: "Pizza", terms: "pizza pizzas 披萨" },
  { slug: "grill", label: "Grill & barbecue", terms: "grill grilled barbecue bbq roast 烤肉 烧烤" },
  { slug: "sandwich", label: "Sandwiches & burgers", terms: "sandwich sandwiches burger burgers wraps 三明治 汉堡" },
  { slug: "pasta", label: "Pasta & noodles", terms: "pasta noodles 意面 面条" },
  { slug: "rice", label: "Rice & grains", terms: "rice grains risotto 米饭 谷物" },
  { slug: "poultry", label: "Chicken & poultry", terms: "chicken poultry turkey 鸡肉 禽肉" },
  { slug: "meat", label: "Meat", terms: "meat beef lamb pork 肉 牛肉 羊肉 猪肉" },
  { slug: "bread", label: "Bread & baking", terms: "bread baking 面包 烘焙" },
  { slug: "breakfast", label: "Breakfast", terms: "breakfast brunch 早餐" },
  { slug: "dessert", label: "Desserts", terms: "dessert desserts sweet cake 甜点 甜品" },
  { slug: "drink", label: "Drinks", terms: "drink drinks beverage beverages 饮料 饮品" },
  { slug: "cocktail", label: "Cocktails", terms: "cocktail cocktails 鸡尾酒" },
  { slug: "sauce", label: "Sauces & sides", terms: "sauce sauces side sides condiment 配菜 酱汁" },
] as const;
export type MenuCategory = (typeof menuCategories)[number]["slug"];

export function recipeMenuCategories(recipe: { title: string; summary?: string; ingredients: readonly string[] }, reviewed: readonly string[] = []): MenuCategory[] {
  if (reviewed.length) return menuCategories.filter(c => reviewed.includes(c.slug)).map(c => c.slug);
  const title = recipe.title.toLowerCase();
  const category = recipe.summary?.match(/ is a (.+?) recipe associated/i)?.[1]?.toLowerCase() ?? "";
  const result = new Set<MenuCategory>();
  const add = (key: MenuCategory, pattern: RegExp, text = title) => { if (pattern.test(text)) result.add(key); };
  add("cocktail", /dark [’']?n[’']? stormy/);
  if (!/\b(?:crab|fish|salmon|tuna|shrimp|potato|vegetable) cakes?\b/.test(title)) add("dessert", /\b(cake|cookie|biscuit|brownie|tart|pudding|fudge|ice cream|cheesecake|chocolate|baklava|tiramisu|sweet pie|rhubarb|pecan pie|apple pie|doughnut|donut|trifle|crumble)\b/);
  add("dessert", /dessert/, category);
  if (!/\b(sauce|seafood|prawn|shrimp|clam|chowder|soup)\b/.test(title)) add("cocktail", /\b(mojito|martini|margarita|negroni|daiquiri|manhattan|old fashioned|whiskey sour|whisky sour|bloody mary|cosmopolitan|cocktail|aperol spritz|spritz|pina colada|piña colada|moscow mule|paloma|tom collins|tequila sunrise|gin and tonic|dark . stormy|long island iced tea|caipirinha)\b/);
  if (!result.has("dessert") && !/\b(chicken|beef|pork|lamb|steak|salmon|fish)\b/.test(title) && !/\btea[ -](eggs?|tree)\b|\bsoda\s+(bread|loaf|farl)\b/.test(title)) add("drink", /\b(tea|coffee|smoothie|lemonade|milkshake|juice|drink|lassi|hot chocolate|agua fresca|horchata|sangria|kombucha|kefir|punch|soda|cold brew|matcha)\b/);
  add("drink", /drink|beverage/, category);
  if (result.has("cocktail")) result.add("drink");
  const sweetOrDrink = result.has("dessert") || result.has("drink");
  if (!sweetOrDrink) {
    add("seafood", /\b(crab|lobster|shrimp|prawn|prawns|scallop|scallops|mussel|mussels|clam|clams|oyster|oysters|salmon|tuna|cod|haddock|tilapia|sardine|trout|mackerel|turbot|halibut|sea bass|seabass|herring|perch|eel|anchovy|anchovies|fish|seafood|squid|calamari|octopus)\b/);
    add("seafood", /seafood/, category);
    add("soup", /\b(soup|stew|chowder|bisque|broth|pozole|menudo|bouillabaisse|goulash)\b/);
    add("salad", /\bsalad\b/);
    add("pizza", /\bpizza\b/);
    add("grill", /\b(grilled|grill|barbecue|bbq|roast|roasted|kebab|kabob|ribs|churrasco|yakitori|satay|tandoori|souvlaki)\b/);
    add("sandwich", /\b(sandwich|sandwiches|burger|cheeseburger|panini|toastie|grilled cheese|club|blt|muffuletta|bánh mì|banh mi|wrap|pinwheels|po boy|po' boy)\b/);
    add("pasta", /\b(pasta|noodle|noodles|spaghetti|linguine|macaroni|lasagna|lasagne|orzo|rotini|bowtie|fettuccine|carbonara|ramen)\b/);
    add("rice", /\b(rice|risotto|paella|pilaf|pilau|biryani|couscous|quinoa)\b/);
    add("poultry", /\b(chicken|turkey|duck|poultry)\b/);
    add("poultry", /chicken|poultry/, category);
    add("meat", /beef|lamb|pork|goat/, category);
    add("pasta", /pasta/, category);
    add("grill", /\b(char siu|pulled pork|pan-grilled|lamb chops)\b/);
    add("soup", /\bramen\b/);
    add("meat", /\b(beef|lamb|pork|meat|steak|sausage|bacon|ham|veal|rabbit)\b/);
    add("vegetable", /vegetarian|vegan/, category);
    add("vegetable", /\b(vegetable|vegetables|broccoli|cauliflower|eggplant|aubergine|green beans|spinach|cabbage|ratatouille|chickpea|lentil|choy|lettuce|asparagus|beets?|beetroot|carrots?|mushrooms?|zucchini|courgettes?|pumpkin|squash|kale|celery|cucumbers?|tofu|okra|turnips?|radish(?:es)?|leeks?|corn|peas|beans)\b/);
    // "Broccoli with Oyster Sauce" is a vegetable dish served in a sauce, not a sauce recipe.
    add("sauce", /\b(sauce|salsa|chutney|dip|dipping|relish|crouton|croutons)\b/, title.replace(/\b(with|in|over|on)\b[^,]*\b(sauce|salsa|chutney|dip|dipping|relish)\b.*$/, " "));
    add("sauce", /side|starter/, category);
  }
  add("breakfast", /breakfast/, category);
  add("breakfast", /\b(breakfast|omelette|omelet|pancake|pancakes|waffle|waffles|french toast|porridge|scrambled egg)\b/);
  // "bun thit nuong" is a Vietnamese noodle dish, not a bread bun.
  add("bread", /\b(bread|baguette|focaccia|croissant|naan|bagel|bun|buns|flatbread)\b/, title.replace(/\bbun[- ](thit|cha|bo)\b/g, " "));
  return [...result];
}
