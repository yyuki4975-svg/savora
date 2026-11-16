export type RegionalFoodExhibition = {
  slug: "mexico" | "france" | "spain" | "japan";
  country: string;
  eyebrow: string;
  title: string;
  introduction: string;
  referenceLabel: string;
  referenceUrl: string;
  hero: { src: string; alt: string; credit: string; source: string };
  chapters: readonly { label: string; title: string; copy: string }[];
  recipeTerms: readonly string[];
};

export const regionalFoodExhibitions: readonly RegionalFoodExhibition[] = [
  {
    slug: "mexico",
    country: "Mexico",
    eyebrow: "Maize · chile · community",
    title: "Where the milpa becomes a table",
    introduction: "A food landscape built through reciprocity: maize grows with beans and squash, while kitchens turn harvest, heat, and memory into many regional languages.",
    referenceLabel: "Google Arts & Culture · The Hidden Story of Mexican Food",
    referenceUrl: "https://artsandculture.google.com/story/VAWRQkyi4kS5dw",
    hero: {
      src: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Milpa_in_Zaragoza,_Tilantongo.jpg",
      alt: "A milpa field growing maize, beans, and squash in Oaxaca, Mexico.",
      credit: "Paul Rogé · CC BY 4.0",
      source: "https://commons.wikimedia.org/wiki/File:Milpa_in_Zaragoza,_Tilantongo.jpg",
    },
    chapters: [
      { label: "The growing system", title: "Three crops, one conversation", copy: "Maize, beans, and squash are often described together because each changes the conditions in which the others grow. The field is already a recipe before it reaches the kitchen." },
      { label: "The everyday craft", title: "Transformation is the technique", copy: "Grinding, soaking, toasting, and fermenting turn a short list of ingredients into tortillas, tamales, moles, drinks, and countless local expressions." },
      { label: "The living table", title: "Tradition keeps moving", copy: "Home cooks, market vendors, farmers, and contemporary chefs continue to adapt these foods without making their histories stand still." },
    ],
    recipeTerms: ["mexican", "taco", "tamale", "enchilada", "guacamole", "chile"],
  },
  {
    slug: "france",
    country: "France",
    eyebrow: "Flour · fermentation · daily ritual",
    title: "A country read through its bread",
    introduction: "The baguette is an everyday object and a skilled practice: a small set of ingredients shaped by fermentation, timing, gesture, and the social rhythm of the neighborhood bakery.",
    referenceLabel: "Google Arts & Culture · Baguette",
    referenceUrl: "https://artsandculture.google.com/project/baguette",
    hero: {
      src: "https://commons.wikimedia.org/wiki/Special:Redirect/file/French_bakery_bread_(43991934612).jpg",
      alt: "Baguettes and loaves displayed in a French bakery.",
      credit: "Ella Olsson · CC BY 2.0",
      source: "https://commons.wikimedia.org/wiki/File:French_bakery_bread_(43991934612).jpg",
    },
    chapters: [
      { label: "The dough", title: "Few ingredients, many decisions", copy: "Flour, water, salt, and yeast leave little room to hide. Temperature, hydration, fermentation, and shaping give each loaf its character." },
      { label: "The hands", title: "Craft is stored in movement", copy: "A baker reads elasticity, bubbles, resistance, and color. Knowledge passes through repeated gestures as much as through written formulas." },
      { label: "The street", title: "Bread sets the day’s rhythm", copy: "The bakery joins food to place: morning queues, a warm loaf carried home, and regional breads that change as the journey moves across France." },
    ],
    recipeTerms: ["french", "baguette", "croissant", "ratatouille", "onion soup", "tarte"],
  },
  {
    slug: "spain",
    country: "Spain",
    eyebrow: "Color · people · memory",
    title: "Spain, served in many voices",
    introduction: "There is no single Spanish table. Coast, plateau, island, migration, preservation, and celebration produce a cuisine best explored through color, people, and remembered dishes.",
    referenceLabel: "Google Arts & Culture · Spanish Gastronomy",
    referenceUrl: "https://artsandculture.google.com/project/spanish-gastronomy",
    hero: {
      src: "https://upload.wikimedia.org/wikipedia/commons/e/ed/01_Paella_Valenciana_original.jpg",
      alt: "Traditional Paella Valenciana in a shallow metal pan.",
      credit: "Jan Harenburg · CC BY-SA 4.0",
      source: "https://commons.wikimedia.org/wiki/File:01_Paella_Valenciana_original.jpg",
    },
    chapters: [
      { label: "The landscape", title: "A pantry shaped by distance", copy: "Rice wetlands, olive groves, fishing ports, mountain pastures, and dry inland fields place different ingredients at the center of regional cooking." },
      { label: "The guardians", title: "Recipes live with their makers", copy: "Farmers, fishers, market sellers, home cooks, and restaurant teams preserve knowledge by practicing it—and by deciding what must change." },
      { label: "The memory", title: "A dish can hold a place", copy: "Paella, tortilla, stews, sweets, and preserved foods gather family histories while refusing to collapse Spain’s regions into one menu." },
    ],
    recipeTerms: ["spanish", "paella", "tortilla", "gazpacho", "chorizo", "tapas"],
  },
  {
    slug: "japan",
    country: "Japan",
    eyebrow: "Makers · seasons · precision",
    title: "From field and sea to everyday form",
    introduction: "Japanese food culture connects growers, fishers, fermenters, market traders, craftspeople, and cooks. Familiar dishes reveal systems of seasonality and exacting care behind them.",
    referenceLabel: "Google Arts & Culture · Japanese Food",
    referenceUrl: "https://artsandculture.google.com/project/japanese-food",
    hero: {
      src: "https://images.unsplash.com/photo-1720873915320-84103511b1fb?auto=format&fit=crop&q=88&w=1400",
      alt: "A carefully garnished bowl of shoyu ramen.",
      credit: "Unsplash contributor · owner-approved Savora asset",
      source: "https://unsplash.com/license",
    },
    chapters: [
      { label: "The makers", title: "Ingredients have biographies", copy: "Rice, tea, fruit, seafood, soy, and noodles reach the table through specialized work and knowledge rooted in particular landscapes." },
      { label: "The season", title: "Timing becomes flavor", copy: "Attention to season is not only decorative. It influences harvest, preservation, texture, serving vessels, and what feels right to eat now." },
      { label: "The everyday", title: "Care survives in ordinary forms", copy: "Bento, ramen, pickles, grilled fish, and home rice dishes show how precision and convenience can occupy the same table." },
    ],
    recipeTerms: ["japanese", "ramen", "sushi", "udon", "teriyaki", "miso"],
  },
] as const;

export function getRegionalFoodExhibition(slug: string) {
  return regionalFoodExhibitions.find((exhibition) => exhibition.slug === slug) ?? null;
}
