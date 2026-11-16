import { dishes, videos } from "./data";

export type CatalogDish = (typeof dishes)[number] & {
  city: string;
  cuisine: string;
  ingredients: string[];
  technique: string;
  mealType: string;
  minutes: number;
  season: string;
  occasion: string;
  allergens: string[];
  verified: boolean;
  pronunciation: string;
  culturalNote: string;
};

const metadata: Record<string, Omit<CatalogDish, keyof (typeof dishes)[number]>> = {
  ramen: {
    city: "Tokyo",
    cuisine: "Japanese",
    ingredients: ["noodles", "soy sauce", "stock", "egg", "nori"],
    technique: "Simmering",
    mealType: "Dinner",
    minutes: 80,
    season: "Winter",
    occasion: "Everyday",
    allergens: ["Gluten", "Soy", "Egg"],
    verified: true,
    pronunciation: "SHOH-yoo RAH-men",
    culturalNote: "A Tokyo-associated style whose soy-seasoned broth reflects ramen’s layered Chinese and Japanese history.",
  },
  carbonara: {
    city: "Rome", cuisine: "Italian", ingredients: ["pasta", "egg", "pecorino", "guanciale", "black pepper"], technique: "Emulsifying", mealType: "Dinner", minutes: 30, season: "All year", occasion: "Weeknight", allergens: ["Gluten", "Egg", "Dairy"], verified: true, pronunciation: "kar-boh-NAH-rah", culturalNote: "A Roman pasta traditionally made without cream; origin stories remain debated.",
  },
  "butter-chicken": {
    city: "Delhi", cuisine: "North Indian", ingredients: ["chicken", "tomato", "butter", "cream", "garam masala"], technique: "Tandoor & simmering", mealType: "Dinner", minutes: 55, season: "All year", occasion: "Gathering", allergens: ["Dairy"], verified: true, pronunciation: "murgh makh-HAH-nee", culturalNote: "A Delhi restaurant dish associated with post-Partition culinary history and the Moti Mahal tradition.",
  },
  "tacos-al-pastor": {
    city: "Mexico City", cuisine: "Mexican", ingredients: ["pork", "achiote", "pineapple", "tortilla", "chile"], technique: "Vertical roasting", mealType: "Street food", minutes: 45, season: "Summer", occasion: "Casual", allergens: [], verified: true, pronunciation: "TAH-kos al pas-TOR", culturalNote: "A Mexican street-food classic shaped by Lebanese migration and adapted from vertical-spit cooking.",
  },
  ratatouille: {
    city: "Nice", cuisine: "Provençal", ingredients: ["eggplant", "zucchini", "tomato", "pepper", "olive oil"], technique: "Stewing", mealType: "Main or side", minutes: 60, season: "Summer", occasion: "Everyday", allergens: [], verified: true, pronunciation: "rat-ah-TOO-ee", culturalNote: "A rustic vegetable preparation associated with Nice and the wider Provençal region.",
  },
  "mapo-tofu": {
    city: "Chengdu", cuisine: "Sichuan", ingredients: ["tofu", "doubanjiang", "Sichuan pepper", "ground pork", "scallion"], technique: "Stir-fry & braise", mealType: "Dinner", minutes: 35, season: "All year", occasion: "Weeknight", allergens: ["Soy"], verified: true, pronunciation: "MAH-poh DOH-foo", culturalNote: "A Chengdu dish known for the balance of heat, fragrance, savor, and numbing málà spice.",
  },
  kebab: {
    city: "Adana", cuisine: "Turkish", ingredients: ["lamb", "pepper", "flatbread", "sumac", "parsley"], technique: "Charcoal grilling", mealType: "Dinner", minutes: 50, season: "Summer", occasion: "Gathering", allergens: ["Gluten"], verified: true, pronunciation: "ah-DAH-nah keh-BAHB", culturalNote: "A protected regional kebab tradition from Adana with specific meat, fat, pepper, and skewer conventions.",
  },
  tagine: {
    city: "Marrakech", cuisine: "Moroccan", ingredients: ["lamb", "preserved lemon", "olive", "onion", "spices"], technique: "Slow braising", mealType: "Dinner", minutes: 135, season: "Autumn", occasion: "Gathering", allergens: [], verified: true, pronunciation: "tah-ZHEEN", culturalNote: "Both a cooking vessel and a family of slow-cooked North African dishes with many regional forms.",
  },
  feijoada: {
    city: "Rio de Janeiro", cuisine: "Brazilian", ingredients: ["black beans", "pork", "orange", "rice", "collards"], technique: "Slow simmering", mealType: "Lunch", minutes: 150, season: "Winter", occasion: "Weekend", allergens: [], verified: true, pronunciation: "fay-zhoo-AH-dah", culturalNote: "A Brazilian bean-and-meat dish with regional variations and a history more complex than common origin myths suggest.",
  },
  "green-curry": {
    city: "Bangkok", cuisine: "Thai", ingredients: ["green chile", "coconut milk", "Thai basil", "eggplant", "fish sauce"], technique: "Pounding & simmering", mealType: "Dinner", minutes: 40, season: "Summer", occasion: "Weeknight", allergens: ["Fish"], verified: true, pronunciation: "gaeng khiao wan", culturalNote: "A central Thai curry whose name refers to its green color and gentle sweetness, not a dessert-like flavor.",
  },
  bibimbap: {
    city: "Jeonju", cuisine: "Korean", ingredients: ["rice", "vegetables", "gochujang", "egg", "beef"], technique: "Composed bowl", mealType: "Lunch", minutes: 50, season: "All year", occasion: "Everyday", allergens: ["Soy", "Egg", "Sesame"], verified: true, pronunciation: "BEE-bim-bap", culturalNote: "A mixed-rice dish with many regional and household forms; Jeonju is especially celebrated for its version.",
  },
  pho: {
    city: "Hanoi", cuisine: "Vietnamese", ingredients: ["rice noodles", "beef", "star anise", "ginger", "herbs"], technique: "Broth making", mealType: "Breakfast", minutes: 180, season: "All year", occasion: "Everyday", allergens: ["Fish"], verified: true, pronunciation: "fuh", culturalNote: "A Vietnamese noodle soup with northern and southern traditions; recipes reflect place, migration, and family practice.",
  },
  paella: {
    city: "Valencia", cuisine: "Valencian", ingredients: ["rice", "rabbit", "chicken", "green beans", "saffron"], technique: "Shallow-pan rice", mealType: "Lunch", minutes: 75, season: "All year", occasion: "Sunday", allergens: [], verified: true, pronunciation: "pah-EH-yah", culturalNote: "Valencian paella is a regional rice tradition; seafood and mixed versions belong to a broader modern family.",
  },
  moussaka: {
    city: "Athens", cuisine: "Greek", ingredients: ["eggplant", "lamb", "tomato", "béchamel", "cinnamon"], technique: "Layering & baking", mealType: "Dinner", minutes: 105, season: "Autumn", occasion: "Gathering", allergens: ["Dairy", "Gluten", "Egg"], verified: true, pronunciation: "moo-sah-KAH", culturalNote: "A layered baked form popularized in modern Greece, related to a wider family of eastern Mediterranean dishes.",
  },
  rendang: {
    city: "Padang", cuisine: "Minangkabau", ingredients: ["beef", "coconut milk", "galangal", "lemongrass", "chile"], technique: "Slow reduction", mealType: "Dinner", minutes: 210, season: "All year", occasion: "Celebration", allergens: [], verified: true, pronunciation: "ren-DAHNG", culturalNote: "A Minangkabau ceremonial preparation transformed through patient reduction until the spices cling to the meat.",
  },
};

export const catalogDishes: CatalogDish[] = dishes.map((dish) => ({ ...dish, ...metadata[dish.slug] }));

export const curatedCollections = [
  { title: "Trending Around the World", copy: "Highly saved dishes with strong community momentum.", slugs: ["ramen", "butter-chicken", "tacos-al-pastor"] },
  { title: "Under 45 Minutes", copy: "Weeknight dishes with clear, achievable techniques.", slugs: ["carbonara", "mapo-tofu", "green-curry"] },
  { title: "Vegetarian World Tour", copy: "Plant-forward recipes with cultural context and substitution notes.", slugs: ["ratatouille", "bibimbap", "mapo-tofu"] },
  { title: "Hidden Regional Gems", copy: "Specific regional traditions beyond generic country labels.", slugs: ["kebab", "rendang", "paella"] },
  { title: "Dishes With Popular Videos", copy: "Recipes paired with concise, credited YouTube demonstrations.", slugs: ["pho", "bibimbap", "butter-chicken"] },
  { title: "Comfort Food", copy: "Slow-cooked, layered, and deeply satisfying dishes.", slugs: ["tagine", "feijoada", "moussaka"] },
];

export const foodAssets = [
  { id: "asset-ramen-hero", title: "Shoyu ramen hero", type: "Hero image", dish: "Shoyu Ramen", country: "Japan", creator: "Unsplash contributor", license: "Unsplash License", status: "Published", source: dishes[0].image, alt: "Shoyu ramen with egg, nori, pork, and scallions", size: "1400×934", orientation: "Landscape", tags: ["ramen", "Tokyo", "hero"], warning: "" },
  { id: "asset-curry-hero", title: "Butter chicken hero", type: "Hero image", dish: "Butter Chicken", country: "India", creator: "Unsplash contributor", license: "Unsplash License", status: "Published", source: dishes[2].image, alt: "Butter chicken finished with cream and herbs", size: "1200×800", orientation: "Landscape", tags: ["curry", "Delhi", "hero"], warning: "" },
  { id: "asset-tacos-card", title: "Tacos al pastor card", type: "Card image", dish: "Tacos al Pastor", country: "Mexico", creator: "Unsplash contributor", license: "Unsplash License", status: "Published", source: dishes[3].image, alt: "Three tacos al pastor with pineapple and herbs", size: "1200×900", orientation: "Landscape", tags: ["tacos", "street food"], warning: "" },
  { id: "asset-rendang-card", title: "Rendang editorial image", type: "Card image", dish: "Beef Rendang", country: "Indonesia", creator: "Editorial review queue", license: "Attribution pending", status: "Draft", source: dishes[14].image, alt: "Beef rendang with aromatic garnish", size: "1200×800", orientation: "Landscape", tags: ["rendang", "Padang"], warning: "Missing final attribution" },
  ...videos.map((video) => ({ id: `video-${video.id}`, title: video.title, type: "YouTube embed", dish: video.dish, country: "Multiple", creator: video.creator, license: "Official YouTube embed", status: "Published", source: `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`, alt: `Official YouTube thumbnail for ${video.title}`, size: "480×360", orientation: "Landscape", tags: ["video", video.dish], warning: "" })),
];
