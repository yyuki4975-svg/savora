export type CuratedIngredient = [amount: number | null, unit: string, ingredient: string];

export type CuratedRecipeDetail = {
  baseServings: number;
  ingredients: CuratedIngredient[];
  equipment: string[];
  chefTip: string;
  storage: string;
  methodSource: { label: string; url: string };
  cultureMedia?: { src: string; alt: string; credit: string; source: string };
};

/**
 * Editorial quantities and mise-en-place for Savora's small premium collection.
 * The public catalog can be much larger; this file is intentionally limited to
 * the hand-reviewed dishes that expose Cook Mode and My Kitchen automation.
 */
export const curatedRecipeDetails: Record<string, CuratedRecipeDetail> = {
  ramen: {
    baseServings: 2,
    ingredients: [[800, "ml", "chicken or vegetable stock"], [4, "tbsp", "Japanese soy sauce"], [2, "tbsp", "mirin"], [1, "tsp", "toasted sesame oil"], [2, "", "garlic cloves, crushed"], [20, "g", "fresh ginger, sliced"], [320, "g", "fresh ramen noodles"], [200, "g", "chashu pork or roasted mushrooms"], [2, "", "soft-boiled eggs"], [2, "sheets", "nori"]],
    equipment: ["Stockpot", "Small saucepan", "Fine-mesh strainer", "Noodle basket or colander", "2 deep serving bowls"],
    chefTip: "Taste the broth and tare together. Correct the bowl with tare by the teaspoon instead of adding plain soy sauce.",
    storage: "Chill broth, tare, and toppings separately for up to 3 days. Cook fresh noodles only when serving.",
    methodSource: { label: "Ramen preparation overview · Wikipedia", url: "https://en.wikipedia.org/wiki/Ramen" },
    cultureMedia: { src: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Japan,_rice_harvesting.jpg", alt: "Rice being harvested in Japan.", credit: "Marie-Sophie Mejan · CC BY 4.0", source: "https://commons.wikimedia.org/wiki/File:Japan,_rice_harvesting.jpg" },
  },
  carbonara: {
    baseServings: 4,
    ingredients: [[400, "g", "spaghetti"], [180, "g", "guanciale, cut into batons"], [4, "", "egg yolks"], [1, "", "whole egg"], [120, "g", "Pecorino Romano, finely grated"], [2, "tsp", "freshly cracked black pepper"], [null, "", "fine salt for the pasta water"]],
    equipment: ["Large pasta pot", "Wide skillet", "Heatproof mixing bowl", "Fine grater", "Tongs"],
    chefTip: "Add the egg and cheese off the heat; the pasta's residual heat and starchy water create the sauce without scrambling it.",
    storage: "Serve immediately. If needed, refrigerate promptly for 1 day and rewarm very gently with a splash of water.",
    methodSource: { label: "Carbonara method · Great Italian Chefs", url: "https://www.greatitalianchefs.com/recipes/carbonara-recipe" },
  },
  "butter-chicken": {
    baseServings: 4,
    ingredients: [[700, "g", "boneless chicken thighs, cut into large pieces"], [150, "g", "plain yogurt"], [2, "tbsp", "lemon juice"], [2, "tbsp", "ginger-garlic paste"], [2, "tsp", "garam masala"], [1, "tsp", "Kashmiri chile powder"], [500, "g", "tomatoes, crushed"], [60, "g", "unsalted butter"], [120, "ml", "heavy cream"], [1, "tbsp", "kasuri methi, crushed"], [null, "", "fine salt"]],
    equipment: ["Nonreactive mixing bowl", "Sheet pan or grill pan", "Heavy saucepan", "Blender or fine-mesh sieve", "Instant-read thermometer"],
    chefTip: "Char the marinated chicken before it enters the sauce, then finish it gently so the edges stay distinct and the sauce remains velvety.",
    storage: "Cool within 2 hours, refrigerate for up to 3 days, and reheat to 74°C / 165°F.",
    methodSource: { label: "Butter chicken preparation · Wikipedia", url: "https://en.wikipedia.org/wiki/Butter_chicken" },
  },
  "tacos-al-pastor": {
    baseServings: 4,
    ingredients: [[700, "g", "pork shoulder, sliced 5 mm thick"], [60, "g", "achiote paste"], [3, "", "dried guajillo chiles, seeded and softened"], [80, "ml", "orange juice"], [40, "ml", "lime juice"], [2, "", "garlic cloves"], [12, "", "small corn tortillas"], [300, "g", "fresh pineapple, sliced"], [1, "", "white onion, finely diced"], [20, "g", "cilantro leaves"], [null, "", "salt and salsa to serve"]],
    equipment: ["Blender", "Nonreactive bowl", "Cast-iron skillet or grill", "Tongs", "Sharp knife", "Instant-read thermometer"],
    chefTip: "Cook in uncrowded batches so the adobo caramelizes instead of steaming; chop only after a short rest.",
    storage: "Refrigerate cooked pork for up to 3 days. Reheat to 74°C / 165°F and warm tortillas separately.",
    methodSource: { label: "Tacos al pastor overview · Wikipedia", url: "https://en.wikipedia.org/wiki/Al_pastor" },
    cultureMedia: { src: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Masa_de_tortillas.jpg", alt: "Fresh tortilla masa in a market in Tepoztlán, Mexico.", credit: "Museo de Arte Popular · CC0", source: "https://commons.wikimedia.org/wiki/File:Masa_de_tortillas.jpg" },
  },
  ratatouille: {
    baseServings: 4,
    ingredients: [[1, "", "large eggplant, cut into 2 cm pieces"], [2, "", "zucchini, cut into 2 cm pieces"], [2, "", "bell peppers, cut into strips"], [5, "", "ripe tomatoes, peeled and chopped"], [1, "", "yellow onion, sliced"], [3, "", "garlic cloves, sliced"], [80, "ml", "extra-virgin olive oil"], [12, "g", "fresh basil"], [null, "", "thyme, salt, and black pepper"]],
    equipment: ["Chef's knife", "Cutting board", "Colander", "Wide sauté pan or Dutch oven", "Wooden spoon"],
    chefTip: "Brown the vegetables separately before combining them so each keeps its own texture and the finished stew does not become watery.",
    storage: "Refrigerate for up to 4 days. The flavor improves overnight; serve warm or at room temperature.",
    methodSource: { label: "Ratatouille overview · Wikipedia", url: "https://en.wikipedia.org/wiki/Ratatouille" },
  },
  "mapo-tofu": {
    baseServings: 4,
    ingredients: [[450, "g", "soft or medium tofu, cut into 2 cm cubes"], [150, "g", "ground beef or pork"], [2, "tbsp", "Pixian doubanjiang, finely chopped"], [1, "tbsp", "fermented black beans, rinsed"], [2, "", "garlic cloves, minced"], [10, "g", "fresh ginger, minced"], [300, "ml", "unsalted stock"], [2, "tsp", "cornstarch mixed with 2 tbsp water"], [1, "tsp", "toasted Sichuan pepper, ground"], [2, "", "scallions, sliced"], [1, "tbsp", "chile oil"]],
    equipment: ["Wok or wide skillet", "Small saucepan", "Heatproof spatula", "Mortar and pestle", "Fine-mesh skimmer"],
    chefTip: "Move the wok rather than stirring hard once the tofu is added. Add the starch slurry in stages so the sauce clings without becoming pasty.",
    storage: "Refrigerate for up to 2 days. Reheat gently until steaming so the tofu stays intact.",
    methodSource: { label: "Mapo tofu ingredients and character · Wikipedia", url: "https://en.wikipedia.org/wiki/Mapo_tofu" },
  },
  kebab: {
    baseServings: 4,
    ingredients: [[650, "g", "coarsely ground lamb"], [130, "g", "lamb tail fat or finely minced lamb fat"], [2, "tbsp", "pul biber or Aleppo pepper"], [1.5, "tsp", "fine salt"], [4, "", "flat metal skewers"], [4, "", "flatbreads"], [1, "", "red onion, thinly sliced"], [2, "tsp", "sumac"], [25, "g", "flat-leaf parsley"], [4, "", "long green peppers"]],
    equipment: ["Large mixing bowl", "Wide flat skewers", "Charcoal grill", "Tongs", "Instant-read thermometer"],
    chefTip: "Keep the meat and fat cold and knead until tacky; that protein development is what keeps the kebab on the skewer.",
    storage: "Refrigerate cooked kebab for up to 3 days and reheat to 74°C / 165°F. Keep flatbread separate.",
    methodSource: { label: "Adana kebabı overview · Wikipedia", url: "https://en.wikipedia.org/wiki/Adana_kebab%C4%B1" },
  },
  tagine: {
    baseServings: 4,
    ingredients: [[800, "g", "lamb shoulder, cut into 4 cm pieces"], [2, "", "yellow onions, sliced"], [3, "", "garlic cloves, minced"], [2, "tsp", "ground ginger"], [1, "tsp", "ground cumin"], [1, "tsp", "ground coriander"], [0.5, "tsp", "ground cinnamon"], [1, "", "preserved lemon, rinsed and quartered"], [150, "g", "green olives"], [500, "ml", "water or unsalted stock"], [3, "tbsp", "olive oil"], [20, "g", "cilantro and parsley"]],
    equipment: ["Tagine or heavy Dutch oven", "Large skillet", "Chef's knife", "Wooden spoon", "Ladle"],
    chefTip: "Add preserved lemon and olives late in the braise so their aroma stays clear and their salt does not dominate the sauce.",
    storage: "Cool promptly and refrigerate for up to 3 days. Reheat gently until steaming throughout.",
    methodSource: { label: "Tagine cooking overview · Encyclopaedia Britannica", url: "https://www.britannica.com/topic/tagine" },
  },
  feijoada: {
    baseServings: 6,
    ingredients: [[500, "g", "dried black beans, soaked overnight"], [500, "g", "pork shoulder, cut into chunks"], [250, "g", "smoked sausage, sliced"], [150, "g", "smoked bacon, cut into lardons"], [2, "", "yellow onions, diced"], [5, "", "garlic cloves, minced"], [3, "", "bay leaves"], [1.8, "l", "water"], [600, "g", "cooked white rice"], [1, "bunch", "collard greens, finely sliced"], [3, "", "oranges, cut into wedges"]],
    equipment: ["Large Dutch oven", "Heavy skillet", "Wooden spoon", "Ladle", "Chef's knife"],
    chefTip: "Stagger the meats: tougher cuts need the long bean simmer, while sausage keeps a better texture when added later.",
    storage: "Refrigerate for up to 4 days or freeze for 2 months. Reheat to 74°C / 165°F.",
    methodSource: { label: "Feijoada overview · Wikipedia", url: "https://en.wikipedia.org/wiki/Feijoada" },
  },
  "green-curry": {
    baseServings: 4,
    ingredients: [[3, "tbsp", "green curry paste"], [400, "ml", "full-fat coconut milk"], [450, "g", "chicken thigh or firm tofu, sliced"], [200, "g", "Thai eggplant, quartered"], [100, "g", "bamboo shoots"], [2, "tbsp", "fish sauce or vegan alternative"], [2, "tsp", "palm sugar"], [4, "", "makrut lime leaves, torn"], [25, "g", "Thai basil leaves"], [2, "", "green or red chiles, sliced"], [600, "g", "cooked jasmine rice"]],
    equipment: ["Mortar and pestle or blender", "Wok or medium saucepan", "Wooden spoon", "Rice cooker or lidded pot"],
    chefTip: "Fry the paste in the thick coconut cream first; add basil only after the heat is off to preserve its aroma.",
    storage: "Refrigerate curry and rice separately for up to 3 days. Reheat both to 74°C / 165°F.",
    methodSource: { label: "Thai green curry overview · Wikipedia", url: "https://en.wikipedia.org/wiki/Green_curry" },
  },
  bibimbap: {
    baseServings: 4,
    ingredients: [[600, "g", "cooked short-grain rice"], [200, "g", "beef sirloin or firm tofu, thinly sliced"], [200, "g", "spinach"], [200, "g", "soybean sprouts"], [1, "", "carrot, julienned"], [1, "", "zucchini, julienned"], [200, "g", "shiitake mushrooms, sliced"], [4, "", "eggs"], [4, "tbsp", "gochujang"], [2, "tbsp", "toasted sesame oil"], [2, "tsp", "sesame seeds"], [2, "tbsp", "soy sauce"]],
    equipment: ["Rice cooker or lidded pot", "Large skillet", "Small saucepan", "Mixing bowls", "4 serving bowls or dolsot"],
    chefTip: "Season and cook every vegetable separately. The point is contrast—mix only once the bowl reaches the table.",
    storage: "Refrigerate cooked components separately for up to 3 days. Fry eggs fresh and reheat other components to 74°C / 165°F.",
    methodSource: { label: "Bibimbap overview · Wikipedia", url: "https://en.wikipedia.org/wiki/Bibimbap" },
  },
  pho: {
    baseServings: 6,
    ingredients: [[2.5, "kg", "beef marrow and knuckle bones"], [500, "g", "beef brisket"], [2, "", "yellow onions, halved"], [120, "g", "fresh ginger, split lengthwise"], [5, "", "star anise"], [1, "", "cinnamon stick"], [4, "", "whole cloves"], [1, "tbsp", "coriander seeds"], [60, "ml", "fish sauce"], [600, "g", "flat rice noodles"], [350, "g", "beef sirloin, frozen briefly and sliced paper-thin"], [1, "bunch", "scallions and cilantro"], [null, "", "lime, herbs, and chile to serve"]],
    equipment: ["Large stockpot", "Sheet pan or gas burner for charring", "Fine-mesh strainer", "Spice bag", "Noodle pot", "6 deep bowls"],
    chefTip: "Blanch and rinse the bones, then keep the stock below a hard boil and skim often for a clear broth.",
    storage: "Chill strained broth quickly for up to 4 days or freeze for 3 months. Store noodles and garnishes separately.",
    methodSource: { label: "Phở broth and assembly · Wikipedia", url: "https://en.wikipedia.org/wiki/Pho" },
  },
  paella: {
    baseServings: 4,
    ingredients: [[500, "g", "bone-in chicken, cut into small pieces"], [400, "g", "rabbit, cut into small pieces"], [300, "g", "Valencian short-grain rice"], [180, "g", "flat green beans, trimmed"], [150, "g", "cooked garrofó or large lima beans"], [2, "", "ripe tomatoes, grated"], [70, "ml", "olive oil"], [1, "tsp", "sweet paprika"], [0.25, "g", "saffron threads"], [1.2, "l", "water"], [1, "sprig", "rosemary, optional"], [null, "", "fine salt"]],
    equipment: ["38–40 cm paella pan", "Wide level burner or outdoor fire", "Box grater", "Long spoon", "Instant-read thermometer"],
    chefTip: "Once the rice is distributed, do not stir. A level pan and controlled evaporation create separate grains and an even socarrat.",
    storage: "Cool rice promptly, refrigerate within 2 hours for up to 2 days, and reheat once to 74°C / 165°F.",
    methodSource: { label: "Paella Valenciana ingredients · Wikipedia", url: "https://en.wikipedia.org/wiki/Paella" },
    cultureMedia: { src: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Los_Navalmorales_2022_02.jpg/1280px-Los_Navalmorales_2022_02.jpg", alt: "Olive harvesters working among trees in Toledo, Spain.", credit: "LBM1948 · CC BY-SA 4.0", source: "https://commons.wikimedia.org/wiki/File:Los_Navalmorales_2022_02.jpg" },
  },
  moussaka: {
    baseServings: 6,
    ingredients: [[3, "", "large eggplants, sliced lengthwise"], [700, "g", "ground lamb"], [1, "", "yellow onion, diced"], [3, "", "garlic cloves, minced"], [400, "g", "crushed tomatoes"], [0.5, "tsp", "ground cinnamon"], [60, "g", "butter"], [60, "g", "plain flour"], [700, "ml", "whole milk"], [2, "", "eggs"], [100, "g", "Kefalotyri or Parmesan, grated"], [60, "ml", "olive oil"]],
    equipment: ["2 sheet pans", "Large skillet", "Medium saucepan", "Whisk", "23 × 33 cm baking dish", "Instant-read thermometer"],
    chefTip: "Reduce the meat sauce until it can hold a clean layer, and cool the béchamel slightly before whisking in the eggs.",
    storage: "Refrigerate for up to 3 days. Reheat covered to 74°C / 165°F, then uncover briefly to refresh the top.",
    methodSource: { label: "Moussaka overview · Wikipedia", url: "https://en.wikipedia.org/wiki/Moussaka" },
  },
  rendang: {
    baseServings: 6,
    ingredients: [[1.2, "kg", "beef chuck, cut into 5 cm pieces"], [800, "ml", "full-fat coconut milk"], [150, "g", "red chiles, shallot, garlic, and ginger spice paste"], [50, "g", "fresh galangal, bruised"], [3, "", "lemongrass stalks, bruised"], [2, "", "turmeric leaves or 1 tsp ground turmeric"], [5, "", "makrut lime leaves"], [2, "tbsp", "tamarind water"], [1, "tbsp", "palm sugar"], [2, "tsp", "fine salt"], [50, "g", "toasted coconut, ground, optional"]],
    equipment: ["Blender or mortar and pestle", "Large wide heavy pot or wok", "Long wooden spatula", "Chef's knife"],
    chefTip: "As the coconut oil separates, lower the heat and stir increasingly often. The final stage is a slow fry, not simply a braise.",
    storage: "Cool promptly and refrigerate for up to 4 days; the flavor deepens overnight. Reheat to 74°C / 165°F.",
    methodSource: { label: "Rendang cooking process · Wikipedia", url: "https://en.wikipedia.org/wiki/Rendang" },
  },
};

