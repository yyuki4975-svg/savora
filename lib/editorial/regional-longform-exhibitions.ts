export type ExhibitionMedia = {
  src: string;
  alt: string;
  credit: string;
  source: string;
};

type RecipePath = {
  label: string;
  copy: string;
  terms: readonly string[];
};

export type RegionalLongformExhibition = {
  slug: "mexico" | "france" | "japan";
  country: string;
  eyebrow: string;
  title: string;
  introduction: string;
  referenceLabel: string;
  referenceUrl: string;
  hero: ExhibitionMedia;
  taste: { label: string; title: string; copy: string; paths: readonly RecipePath[] };
  landscape: { label: string; title: string; copy: string; media: ExhibitionMedia };
  essentials: { label: string; title: string; copy: string; paths: readonly RecipePath[] };
  people: { label: string; title: string; copy: string; media: ExhibitionMedia };
  memory: { label: string; title: string; copy: string; note: string; quote: string; cite: string };
  histories: { label: string; title: string; copy: string; paths: readonly RecipePath[] };
  flavors: { label: string; title: string; copy: string; paths: readonly RecipePath[] };
  ending: { title: string; copy: string };
};

export const regionalLongformExhibitions: readonly RegionalLongformExhibition[] = [
  {
    slug: "france",
    country: "France",
    eyebrow: "La baguette · Craft, ritual, and daily life",
    title: "France, read through its bread.",
    introduction: "Follow a loaf from grain and fermentation to the neighborhood boulangerie. Four ingredients become a record of timing, trained hands, regional identity, and the rhythm of buying bread fresh each day.",
    referenceLabel: "Google Arts & Culture · La Baguette",
    referenceUrl: "https://artsandculture.google.com/project/baguette",
    hero: {
      src: "https://commons.wikimedia.org/wiki/Special:Redirect/file/French_bakery_bread_(43991934612).jpg",
      alt: "Baguettes and loaves arranged in a French bakery.",
      credit: "Ella Olsson · CC BY 2.0",
      source: "https://commons.wikimedia.org/wiki/File:French_bakery_bread_(43991934612).jpg",
    },
    taste: {
      label: "A taste of France",
      title: "Begin with the loaf, then follow the table",
      copy: "Bread opens routes into pastry, markets, slow cooking, and the small rituals of an ordinary meal.",
      paths: [
        { label: "The loaf", copy: "Crust, crumb, fermentation, and the sound of a fresh bake.", terms: ["baguette", "bread"] },
        { label: "The boulangerie", copy: "A neighborhood workplace where craft is made visible every day.", terms: ["croissant", "brioche", "tart"] },
        { label: "The shared table", copy: "Soups, stews, gratins, and sauces made for bread to accompany.", terms: ["onion soup", "cassoulet", "beef bourguignon"] },
        { label: "The sweet finish", copy: "Pastry turns precision, butter, and season into celebration.", terms: ["tarte", "crepe", "clafoutis"] },
      ],
    },
    landscape: {
      label: "From grain to street",
      title: "Bread belongs to a chain of people.",
      copy: "The grain farmer, miller, baker, shop assistant, and customer each shape the final loaf. A baguette may feel immediate, but its flour, fermentation, heat, and daily sale connect field knowledge to city routine.",
      media: {
        src: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Devanture_Boulangerie_159_rue_Ordener.jpg",
        alt: "The historic façade of a bakery on rue Ordener in Paris.",
        credit: "KoS · CC BY-SA 3.0",
        source: "https://commons.wikimedia.org/wiki/File:Devanture_Boulangerie_159_rue_Ordener.jpg",
      },
    },
    essentials: {
      label: "How bread is made",
      title: "Four ingredients, hundreds of decisions",
      copy: "Focus or hover to open each note. The image beneath leads back into Savora's published recipes.",
      paths: [
        { label: "Flour", copy: "The cereal and milling determine strength, aroma, and color.", terms: ["flour", "bread"] },
        { label: "Water", copy: "Hydration changes openness, handling, and the finished crumb.", terms: ["baguette", "bread"] },
        { label: "Salt", copy: "Seasoning also controls fermentation and strengthens the dough.", terms: ["fougasse", "bread"] },
        { label: "Leaven", copy: "Yeast or sourdough creates gas, aroma, and time.", terms: ["sourdough", "brioche"] },
        { label: "Heat", copy: "Steam, scoring, and the oven form crust, sole, and slashes.", terms: ["croissant", "tart"] },
      ],
    },
    people: {
      label: "Meet the makers",
      title: "Craft is stored in movement.",
      copy: "A baker reads elasticity, bubbles, temperature, resistance, and color. Training transfers knowledge through repetition: mixing, folding, shaping, scoring, loading, and learning when the loaf is ready without reducing judgment to a timer.",
      media: {
        src: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Baguettes_in_a_Paris_shop_(34743548581).jpg",
        alt: "Baguettes displayed in a shop in Paris.",
        credit: "Bex Walton · CC BY 2.0",
        source: "https://commons.wikimedia.org/wiki/File:Baguettes_in_a_Paris_shop_(34743548581).jpg",
      },
    },
    memory: {
      label: "A taste for tradition",
      title: "The best loaf is also read with the senses.",
      copy: "Look for a caramel-gold crust, uneven air pockets in the crumb, a well-baked sole, opened slashes, and a crisp heel. These are not decorative details; they reveal fermentation, shaping, and heat.",
      note: "à la boulangerie",
      quote: "A fresh baguette has a short life. That is why the walk to the bakery becomes part of the food itself.",
      cite: "— Savora editorial synthesis, informed by the reference exhibition",
    },
    histories: {
      label: "Every loaf has a history",
      title: "Bread changes as it crosses a region",
      copy: "Three routes through grain, local form, and the ways yesterday's bread continues at today's table.",
      paths: [
        { label: "Regional breads", copy: "Rye, buckwheat, wheat, shape, and local ovens create a map larger than the baguette alone.", terms: ["baguette", "bread"] },
        { label: "Nothing wasted", copy: "Stale bread returns as toast, crumbs, fillings, and custardy desserts.", terms: ["french toast", "bread pudding"] },
        { label: "Beyond the loaf", copy: "Pastries and everyday dishes show the bakery's wider grammar of dough, butter, and time.", terms: ["croissant", "tarte", "crepe"] },
      ],
    },
    flavors: {
      label: "Culture behind the crust",
      title: "Six details to follow",
      copy: "A compact index of the material, social, and sensory ideas that make bread more than a generic staple.",
      paths: [
        { label: "Crust", copy: "Caramel color, crackle, and the first aroma of the loaf.", terms: ["baguette", "bread"] },
        { label: "Crumb", copy: "Air pockets reveal fermentation and the handling of wet dough.", terms: ["brioche", "bread"] },
        { label: "Daily ritual", copy: "Freshness makes the neighborhood visit part of the meal.", terms: ["croissant", "baguette"] },
        { label: "Regional form", copy: "Crowns, twists, flatbreads, rye loaves, and festive breads.", terms: ["fougasse", "bread"] },
        { label: "Butter & pastry", copy: "Lamination transforms patient folding into crisp layers.", terms: ["croissant", "pain au chocolat"] },
        { label: "Table memory", copy: "Soup, sauce, cheese, and bread meet in repeated combinations.", terms: ["onion soup", "cassoulet"] },
      ],
    },
    ending: { title: "The loaf reaches beyond the bakery.", copy: "Continue into the reference project for bakers, regional breads, historic tools, art, language, and the wider legacy of grain." },
  },
  {
    slug: "japan",
    country: "Japan",
    eyebrow: "Meshiagare · Makers, culture, taste, ingredients",
    title: "Japan, from season to table.",
    introduction: "Meet the growers, fishers, fermenters, market workers, craftspeople, and cooks behind familiar dishes. Everyday food becomes a guide to landscape, timing, preservation, and care.",
    referenceLabel: "Google Arts & Culture · Meshiagare! Flavors of Japan",
    referenceUrl: "https://artsandculture.google.com/project/japanese-food",
    hero: {
      src: "https://images.unsplash.com/photo-1720873915320-84103511b1fb?auto=format&fit=crop&q=88&w=1400",
      alt: "A carefully garnished bowl of shoyu ramen.",
      credit: "Unsplash contributor · owner-approved Savora asset",
      source: "https://unsplash.com/license",
    },
    taste: {
      label: "A taste of Japan",
      title: "Four courses through food culture",
      copy: "Begin with the people, then move through tradition, flavor, and the building blocks of the pantry.",
      paths: [
        { label: "The makers", copy: "Specialized knowledge links landscape, harvest, quality, and sale.", terms: ["ramen", "udon"] },
        { label: "The culture", copy: "Phrases, vessels, season, and hospitality shape how food is received.", terms: ["bento", "sushi"] },
        { label: "The taste", copy: "Broth, grill, ferment, steam, and fry build precise layers of flavor.", terms: ["teriyaki", "tempura", "yakitori"] },
        { label: "The ingredients", copy: "Rice, soy, seaweed, tea, fruit, noodles, and seafood carry place.", terms: ["miso", "rice", "salmon"] },
      ],
    },
    landscape: {
      label: "The faces behind the flavors",
      title: "Quality begins before the kitchen.",
      copy: "Rice fields, orchards, fisheries, tea gardens, and fermentation rooms each demand a different kind of attention. Variety is maintained because makers keep observing weather, ripeness, texture, and time.",
      media: {
        src: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Japan,_rice_harvesting.jpg",
        alt: "Rice being harvested in Japan.",
        credit: "Marie-Sophie Mejan · CC BY 4.0",
        source: "https://commons.wikimedia.org/wiki/File:Japan,_rice_harvesting.jpg",
      },
    },
    essentials: {
      label: "Kitchen essentials",
      title: "The pantry is a landscape in miniature",
      copy: "Focus or hover to uncover each ingredient route, then open a published recipe from the Savora archive.",
      paths: [
        { label: "Rice", copy: "Daily staple, ceremonial food, and the beginning of sake.", terms: ["rice", "sushi"] },
        { label: "Soy", copy: "Tofu, miso, and soy sauce turn one bean into many textures.", terms: ["miso", "soy"] },
        { label: "Dashi", copy: "Kelp and dried fish create depth through extraction rather than weight.", terms: ["dashi", "ramen"] },
        { label: "Noodles", copy: "Udon, soba, and ramen make region, broth, and texture legible.", terms: ["udon", "ramen", "soba"] },
        { label: "Season", copy: "Fruit, fish, and vegetables are valued at a particular moment.", terms: ["salmon", "strawberry", "fruit"] },
      ],
    },
    people: {
      label: "Markets and makers",
      title: "Food quality is maintained in public.",
      copy: "Markets make expertise visible. Sellers grade, arrange, preserve, and explain; customers compare season and origin. These exchanges connect household cooking to the larger systems that keep variety alive.",
      media: {
        src: "https://commons.wikimedia.org/wiki/Special:Redirect/file/A_vegetable_store_in_tokyo.jpg",
        alt: "A traditional vegetable store in Tokyo.",
        credit: "Kentin · CC BY-SA 2.1 JP",
        source: "https://commons.wikimedia.org/wiki/File:A_vegetable_store_in_tokyo.jpg",
      },
    },
    memory: {
      label: "There is more to food than eating",
      title: "A meal begins and ends with attention.",
      copy: "Words spoken before and after eating acknowledge ingredients, labor, and hospitality. Season also appears through color, serving vessels, garnish, and the decision that a particular food feels right now.",
      note: "meshiagare",
      quote: "Please, enjoy the meal—not only as a dish, but as the work of many hands and places.",
      cite: "— Savora editorial synthesis, informed by the reference exhibition",
    },
    histories: {
      label: "Every recipe has a history",
      title: "Ordinary dishes carry long systems of knowledge",
      copy: "Follow three routes through preservation, urban appetite, and the precision hidden inside convenience.",
      paths: [
        { label: "Fermentation", copy: "Miso, soy sauce, pickles, and sake use microbes, climate, and time as ingredients.", terms: ["miso", "pickle", "teriyaki"] },
        { label: "The everyday bowl", copy: "Broth and noodles turn regional variation into a form that can keep evolving.", terms: ["ramen", "udon", "soba"] },
        { label: "Season in a box", copy: "Bento organizes color, texture, nourishment, portability, and care.", terms: ["bento", "sushi"] },
      ],
    },
    flavors: {
      label: "Flavors",
      title: "Six signatures to follow",
      copy: "Not a checklist of a single national cuisine, but routes into balance, place, technique, and the work of makers.",
      paths: [
        { label: "Umami", copy: "A shared depth built from kelp, mushrooms, fish, soy, and fermentation.", terms: ["miso", "ramen"] },
        { label: "Rice", copy: "Texture, variety, washing, resting, and steam matter.", terms: ["rice", "sushi"] },
        { label: "Broth", copy: "Clear or rich, it records extraction, timing, and region.", terms: ["ramen", "udon"] },
        { label: "Grill", copy: "Direct heat concentrates glaze, smoke, and surface texture.", terms: ["yakitori", "teriyaki"] },
        { label: "Ferment", copy: "Time turns soy, rice, vegetables, and fish into pantry foundations.", terms: ["miso", "pickle"] },
        { label: "Seasonality", copy: "The best ingredient is understood as a moment as well as a product.", terms: ["salmon", "fruit"] },
      ],
    },
    ending: { title: "Japanese food reaches beyond the finished dish.", copy: "Continue into the reference project for farmers, food history, regional ingredients, fruit culture, phrases, and the people behind the flavors." },
  },
  {
    slug: "mexico",
    country: "Mexico",
    eyebrow: "Maize · chile · community",
    title: "Where the milpa becomes a table.",
    introduction: "Look beyond the shorthand of burritos and tacos. Maize, beans, squash, chile, markets, grinding, fire, and regional memory reveal a food culture built through transformation and reciprocity.",
    referenceLabel: "Google Arts & Culture · The Hidden Story of Mexican Food",
    referenceUrl: "https://artsandculture.google.com/story/VAWRQkyi4kS5dw",
    hero: {
      src: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Milpa_in_Zaragoza,_Tilantongo.jpg",
      alt: "A milpa field growing maize, beans, and squash in Oaxaca, Mexico.",
      credit: "Paul Rogé · CC BY 4.0",
      source: "https://commons.wikimedia.org/wiki/File:Milpa_in_Zaragoza,_Tilantongo.jpg",
    },
    taste: {
      label: "A taste of Mexico",
      title: "Begin with the system, not a stereotype",
      copy: "The field, the market, the comal, and the shared table offer four routes into many regional cuisines.",
      paths: [
        { label: "The milpa", copy: "Maize, beans, squash, and chile grow as an agricultural conversation.", terms: ["corn", "bean", "squash"] },
        { label: "The market", copy: "Fresh and dried ingredients make region and season visible.", terms: ["salsa", "guacamole"] },
        { label: "The comal", copy: "Heat transforms masa, chiles, seeds, and everyday technique.", terms: ["tortilla", "taco"] },
        { label: "The feast", copy: "Mole, tamales, pozole, and sweets gather labor and celebration.", terms: ["mole", "tamale", "pozole"] },
      ],
    },
    landscape: {
      label: "The growing system",
      title: "The field is already a recipe.",
      copy: "The milpa is more than a list of crops. Maize offers structure, beans replenish soil, squash shades the ground, and chile adds both food and protection. Ecological relationships continue as culinary relationships.",
      media: {
        src: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Masa_de_tortillas.jpg",
        alt: "Fresh tortilla masa in a market in Tepoztlán, Mexico.",
        credit: "Museo de Arte Popular · CC0",
        source: "https://commons.wikimedia.org/wiki/File:Masa_de_tortillas.jpg",
      },
    },
    essentials: {
      label: "Kitchen essentials",
      title: "Transformation creates the pantry",
      copy: "Focus or hover to follow each ingredient into a published recipe from the Savora archive.",
      paths: [
        { label: "Maize", copy: "Nixtamal, masa, tortillas, tamales, drinks, and countless local forms.", terms: ["corn", "tortilla", "tamale"] },
        { label: "Chile", copy: "Fresh, dried, smoked, toasted, soaked, ground, or used whole.", terms: ["chile", "chili", "pepper"] },
        { label: "Beans", copy: "A daily foundation with varieties and textures tied to region.", terms: ["bean", "frijol"] },
        { label: "Squash", copy: "Fruit, flower, and seed each enter the kitchen differently.", terms: ["squash", "pumpkin"] },
        { label: "Tomatillo", copy: "Tart brightness gives green salsas their structure.", terms: ["salsa", "tomatillo", "green"] },
      ],
    },
    people: {
      label: "Hands, stone, and fire",
      title: "Technique is a form of living memory.",
      copy: "Soaking maize, grinding masa, pressing tortillas, toasting chile, and judging the heat of a comal are learned through repetition. Tools matter because they carry gestures from one generation into the next.",
      media: {
        src: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Mexican_woman_maize_tortillas.jpg",
        alt: "A woman preparing maize while making tortillas in Yucatán, Mexico.",
        credit: "Alaskan Dude · CC BY 2.0",
        source: "https://commons.wikimedia.org/wiki/File:Mexican_woman_maize_tortillas.jpg",
      },
    },
    memory: {
      label: "The hidden story",
      title: "A tortilla begins long before it reaches the plate.",
      copy: "Nixtamalization changes maize nutritionally, structurally, and aromatically. The process makes good masa possible and shows why technique cannot be separated from the history of an ingredient.",
      note: "del maíz a la mesa",
      quote: "The shortest recipe may contain the longest memory: seed, soil, soaking, stone, fire, and hands.",
      cite: "— Savora editorial synthesis, informed by the reference exhibition",
    },
    histories: {
      label: "Every recipe has a history",
      title: "Regional kitchens speak different languages",
      copy: "Three routes through masa, complex sauces, and foods designed to travel between home, market, work, and celebration.",
      paths: [
        { label: "Masa", copy: "Tortillas, tamales, sopes, and enchiladas begin with related doughs but distinct forms.", terms: ["tortilla", "tamale", "enchilada"] },
        { label: "Mole & salsa", copy: "Layered sauces combine roasting, grinding, fruit, seed, spice, and patient adjustment.", terms: ["mole", "salsa"] },
        { label: "Market food", copy: "Portable dishes make local appetite visible in public space.", terms: ["taco", "quesadilla", "pozole"] },
      ],
    },
    flavors: {
      label: "Flavors",
      title: "Six signatures to follow",
      copy: "Use these as doors into regional technique and ingredient history, not as a claim that Mexico can be reduced to one menu.",
      paths: [
        { label: "Maize", copy: "Sweetness, toast, earth, and the scent released by the comal.", terms: ["corn", "tortilla"] },
        { label: "Chile", copy: "Fruit, smoke, heat, bitterness, and color change by variety and handling.", terms: ["chile", "chili"] },
        { label: "Acid", copy: "Lime, tomatillo, and fermented notes keep rich dishes vivid.", terms: ["lime", "salsa"] },
        { label: "Beans", copy: "Creamy, brothy, mashed, refried, or folded into other dishes.", terms: ["bean"] },
        { label: "Mole", copy: "A technique of layering rather than one fixed sauce.", terms: ["mole"] },
        { label: "Cacao & sweet", copy: "Chocolate, fruit, seed, and spice move between drink, sauce, and dessert.", terms: ["chocolate", "sweet"] },
      ],
    },
    ending: { title: "Mexican food is a living system, not a single plate.", copy: "Continue into the reference story for deeper cultural context, then return to Savora's recipes to follow individual ingredients and techniques." },
  },
] as const;

export function getRegionalLongformExhibition(slug: string) {
  return regionalLongformExhibitions.find((exhibition) => exhibition.slug === slug) ?? null;
}
