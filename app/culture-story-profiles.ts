export type CultureProfileCard = {
  eyebrow: string;
  title: string;
  fact: string;
};

const cultureStoryProfiles: Record<string, CultureProfileCard[]> = {
  ramen: [
    { eyebrow: "Tokyo · after dark", title: "A bowl belongs to the pace of the city.", fact: "Tokyo ramen shops are often compact, fast-moving rooms where a deeply prepared broth meets a meal served in minutes." },
    { eyebrow: "The broth", title: "Clarity is built before the noodles arrive.", fact: "Shoyu ramen depends on layers: stock provides body, tare provides seasoning, and aromatic oil carries fragrance across the surface." },
    { eyebrow: "The noodle maker", title: "Spring begins with flour, water, and kansui.", fact: "Alkaline salts give ramen noodles their yellow cast, resilience, and the bite that lets them stay distinct in hot broth." },
    { eyebrow: "At the counter", title: "The bowl is composed for immediate eating.", fact: "Noodles continue to soften after serving, so cooks and diners share an understanding that the first minutes matter." },
    { eyebrow: "Tokyo styles", title: "There is no single city bowl.", fact: "Tokyo’s ramen culture contains old shoyu shops, postwar street-food histories, specialist broths, and constant neighborhood invention." },
    { eyebrow: "Home kitchen", title: "Keep the layers visible when you adapt it.", fact: "A home version can simplify the stock while preserving the distinction between broth, seasoning, noodles, and toppings." },
  ],
  carbonara: [
    { eyebrow: "Rome · everyday streets", title: "Carbonara is read through the city that serves it.", fact: "In Rome, pasta traditions sit beside markets, trattorie, family kitchens, and a culture of direct, ingredient-led cooking." },
    { eyebrow: "Pecorino Romano", title: "The cheese brings pasture, salt, and history.", fact: "Pecorino Romano is a firm sheep’s-milk cheese whose sharp salinity helps season the sauce as well as give it structure." },
    { eyebrow: "Guanciale", title: "Rendered pork fat becomes part of the sauce.", fact: "Guanciale is cured pork jowl; its fat is rendered slowly so crisp pieces and aromatic fat can season the pasta together." },
    { eyebrow: "The emulsion", title: "Heat is controlled by leaving the flame.", fact: "Egg, cheese, rendered fat, and starchy water form a glossy emulsion when tossed away from direct heat rather than scrambled in the pan." },
    { eyebrow: "The Roman table", title: "A short list leaves nowhere for technique to hide.", fact: "Carbonara’s familiar identity comes from the balance of pasta, egg, pecorino, guanciale, and black pepper—not from cream." },
    { eyebrow: "Versions and memory", title: "Origin stories remain debated; the method stays legible.", fact: "Documenting a version means naming its ingredients and technique clearly without pretending that one anecdote settles the dish’s entire history." },
  ],
  "butter-chicken": [
    { eyebrow: "Delhi · restaurant city", title: "A modern classic grew from a changing capital.", fact: "Butter chicken is closely associated with post-Partition Delhi restaurant culture and the practical reuse of tandoor-cooked chicken." },
    { eyebrow: "The tandoor", title: "Char comes before the sauce.", fact: "High heat gives the chicken browned edges and smoky flavor before it finishes gently in the tomato-butter gravy." },
    { eyebrow: "Tomato and butter", title: "Richness is balanced, not simply added.", fact: "Tomato acidity, dairy, warm spices, and fenugreek create a sauce that is rounded but should still taste savory and aromatic." },
    { eyebrow: "Chandni Chowk", title: "Old Delhi’s foodways are layered with movement.", fact: "Markets, migration, restaurants, and domestic kitchens all shape how Delhi’s dishes are remembered and remade." },
    { eyebrow: "Kasuri methi", title: "A dried leaf changes the finish.", fact: "Crushed dried fenugreek leaves bring a distinctive bittersweet aroma and are usually added near the end so they remain perceptible." },
    { eyebrow: "At home", title: "Separate browning from simmering.", fact: "A home stove can preserve the dish’s logic by charring the chicken first, reducing the sauce fully, and adding cream only after the heat is lowered." },
  ],
  "tacos-al-pastor": [
    { eyebrow: "Mexico City · street life", title: "The trompo turns in public view.", fact: "Tacos al pastor are inseparable from the rhythm of taquerías, where meat is sliced from a vertical spit directly onto small tortillas." },
    { eyebrow: "A migrant technique", title: "The vertical spit records exchange.", fact: "The cooking method reflects Lebanese migration and the adaptation of shawarma-like spit roasting to local pork, chiles, and tortillas." },
    { eyebrow: "Achiote and chile", title: "Color carries spice, acid, and aroma.", fact: "The adobo combines achiote with dried chiles and citrus, seasoning thin pork while helping its edges caramelize." },
    { eyebrow: "The tortilla", title: "The base is made to bend, not break.", fact: "A small warm corn tortilla supports the meat without overwhelming it and is heated only until fragrant and pliable." },
    { eyebrow: "The taquero", title: "Speed rests on practiced choreography.", fact: "Slicing meat, catching pineapple, warming tortillas, and adding onion and cilantro become one continuous service gesture." },
    { eyebrow: "Table-side balance", title: "Salsa and lime finish the taco in the diner’s hand.", fact: "Heat, acidity, sweetness, and fat are adjusted at the moment of eating, making the final flavor partly participatory." },
  ],
  ratatouille: [
    { eyebrow: "Nice · market morning", title: "The dish begins with Mediterranean abundance.", fact: "Ratatouille is associated with Provence and Nice, where summer vegetables, olive oil, and herbs form an everyday seasonal vocabulary." },
    { eyebrow: "Eggplant", title: "Browning protects texture.", fact: "Cooking eggplant separately allows it to take on color and tenderness without dissolving into the tomato base." },
    { eyebrow: "Cours Saleya", title: "A market teaches the season before a recipe does.", fact: "The changing display of tomatoes, peppers, zucchini, herbs, and garlic makes seasonality visible in the center of Nice." },
    { eyebrow: "One pot, many textures", title: "Unity does not require sameness.", fact: "The vegetables are brought together only after their individual textures and flavors have been developed." },
    { eyebrow: "Hot or cool", title: "Time changes the way the vegetables speak.", fact: "Ratatouille can be served warm or at room temperature, and resting lets olive oil, tomato, and herbs settle into a fuller balance." },
    { eyebrow: "Home versions", title: "Cut, order, and patience define the result.", fact: "Households vary the shape and sequence, but careful cutting and controlled cooking matter more than decorative arrangement." },
  ],
  "mapo-tofu": [
    { eyebrow: "Chengdu · teahouse city", title: "The dish belongs to Sichuan’s appetite for contrast.", fact: "Mapo tofu combines tender tofu, savory fermented beans, chile heat, and the numbing fragrance of Sichuan pepper." },
    { eyebrow: "Doubanjiang", title: "Fermentation gives the sauce its depth.", fact: "Broad-bean chile paste contributes salt, umami, and red oil; frying it carefully releases aroma without scorching it." },
    { eyebrow: "Sichuan pepper", title: "Málà is more than simple heat.", fact: "The citrusy numbing sensation of Sichuan pepper works with chile rather than merely increasing spiciness." },
    { eyebrow: "The tofu", title: "Softness is an intentional texture.", fact: "Briefly warming tofu in salted water helps it hold together while keeping the custard-like quality central to the dish." },
    { eyebrow: "Chengdu tables", title: "Rice turns intensity into a meal.", fact: "Mapo tofu is commonly eaten with plain rice, whose neutral warmth carries the aromatic sauce and balances its concentration." },
    { eyebrow: "Finishing the sauce", title: "Thickness is built in stages.", fact: "Adding starch slurry more than once creates a sauce that clings to the tofu instead of pooling thinly or setting into a gel." },
  ],
  kebab: [
    { eyebrow: "Adana · river and grill", title: "The city gives its name to a specific skewer.", fact: "Adana kebab is associated with hand-minced, seasoned meat pressed onto broad metal skewers and cooked over charcoal." },
    { eyebrow: "The mince", title: "Texture is made by hand.", fact: "Keeping meat and fat cold, then kneading until tacky, helps the mixture hold the skewer without fillers." },
    { eyebrow: "Charcoal", title: "Smoke is part of the seasoning.", fact: "Direct heat browns the ridges while rendered fat falls toward the coals, creating the aroma expected from the grill." },
    { eyebrow: "Flatbread beneath", title: "The bread catches more than juices.", fact: "Resting the cooked kebab over flatbread connects meat, smoke, and bread in the same serving gesture." },
    { eyebrow: "The shared spread", title: "Onion, sumac, herbs, and peppers frame the meat.", fact: "Fresh and tart accompaniments cut through richness and turn the skewer into a balanced table rather than an isolated portion." },
    { eyebrow: "Regional identity", title: "A named dish deserves regional precision.", fact: "Calling the recipe Adana means preserving its link to place, fat ratio, shaping, and charcoal technique instead of treating every kebab as interchangeable." },
  ],
  tagine: [
    { eyebrow: "Marrakech · market evening", title: "A slow braise meets a fast-moving square.", fact: "Marrakech food culture joins domestic braises, spice markets, bread ovens, and the public night life of Jemaa el-Fnaa." },
    { eyebrow: "The vessel", title: "A conical lid manages moisture.", fact: "A tagine’s shape encourages condensation to return to the food, supporting slow cooking with relatively little added liquid." },
    { eyebrow: "Preserved lemon", title: "Salt and time transform the peel.", fact: "Preserved lemon contributes perfume, salt, and gentle bitterness; rinsing and adding it late keeps its character distinct." },
    { eyebrow: "Olives and spice", title: "The sauce is aromatic, not heavy.", fact: "Ginger, turmeric, saffron, olives, and herbs build a bright savory profile around tender meat." },
    { eyebrow: "Bread at the table", title: "The meal is gathered from a shared center.", fact: "Moroccan bread is used to take sauce and meat from the communal vessel, linking cookware and service." },
    { eyebrow: "Home heat", title: "Gentle cooking matters more than owning the perfect pot.", fact: "A heavy covered pan can reproduce the slow, moist logic when a traditional clay tagine is not available." },
  ],
  feijoada: [
    { eyebrow: "Rio de Janeiro · Saturday table", title: "A long-cooked pot becomes a social meal.", fact: "Feijoada is widely associated with leisurely gatherings where beans, pork, rice, greens, orange, and farofa arrive as a full table." },
    { eyebrow: "Black beans", title: "The broth thickens from the bean itself.", fact: "Slow cooking and mashing a small portion back into the pot create a creamy broth without hiding the beans’ shape." },
    { eyebrow: "Many histories", title: "A national story should not become a simple myth.", fact: "Feijoada has been linked to Portuguese stews, Brazilian ingredients, restaurants, and contested stories about enslavement; responsible context keeps that complexity visible." },
    { eyebrow: "Collards and orange", title: "Freshness is built into the plate.", fact: "Bitter greens and bright citrus balance the depth and salt of beans and pork rather than serving as decoration." },
    { eyebrow: "The roda", title: "Food and music can share the same afternoon.", fact: "In Rio, feijoada gatherings are often imagined alongside samba, conversation, and the extended pace of weekend hospitality." },
    { eyebrow: "Resting the pot", title: "The stew improves when time briefly stops.", fact: "A short rest lets fat rise, seasoning settle, and the broth become easier to adjust before the accompaniments are served." },
  ],
  "green-curry": [
    { eyebrow: "Bangkok · market color", title: "Fresh herbs make the curry green.", fact: "Green curry paste depends on fresh green chiles, roots, herbs, and aromatics rather than on color added after cooking." },
    { eyebrow: "The paste", title: "Pounding builds a single fragrance from many parts.", fact: "Chile, lemongrass, galangal, coriander root, makrut lime, garlic, and shallot are worked into a paste whose texture affects the sauce." },
    { eyebrow: "Coconut cream", title: "The paste is fried before it is diluted.", fact: "Cooking curry paste in the thick coconut cream releases aroma and creates the glossy foundation for the remaining coconut milk." },
    { eyebrow: "Bangkok table", title: "Curry is part of a meal, not always a lone bowl.", fact: "Thai meals often balance several dishes, so rice and neighboring flavors help moderate the curry’s heat, salt, sweetness, and richness." },
    { eyebrow: "Thai basil", title: "The final leaves should still smell alive.", fact: "Thai basil and makrut lime leaves are added late because prolonged boiling dulls the volatile aromas that define the finish." },
    { eyebrow: "Balance by tasting", title: "Fish sauce and palm sugar work in tension.", fact: "The goal is not a sugary curry but a savory, aromatic balance adjusted to the paste, coconut milk, and ingredients in the pot." },
  ],
  bibimbap: [
    { eyebrow: "Jeonju · hanok kitchens", title: "A composed bowl carries a city’s reputation.", fact: "Jeonju is strongly associated with bibimbap and with a food culture that values careful preparation and the visible identity of ingredients." },
    { eyebrow: "Many namul", title: "Each vegetable keeps its own seasoning.", fact: "Blanching or sautéing components separately preserves color, texture, and individual flavor before they meet in the bowl." },
    { eyebrow: "The arrangement", title: "Order is temporary and purposeful.", fact: "The distinct sections let diners see the ingredients and their care before everything is mixed with rice, egg, sesame oil, and gochujang." },
    { eyebrow: "Gochujang", title: "Fermentation provides the bowl’s center of gravity.", fact: "The chile paste brings sweetness, savoriness, heat, and fermentation, but it is added to taste rather than used to erase the vegetables." },
    { eyebrow: "Dolsot", title: "A hot stone bowl adds another texture.", fact: "When served in heated stone, rice touching the bowl forms a crisp crust that contrasts with the seasoned vegetables above." },
    { eyebrow: "Mixing at the table", title: "The final act belongs to the diner.", fact: "Bibimbap becomes complete through mixing, an action that turns many prepared parts into one changing combination of bites." },
  ],
  pho: [
    { eyebrow: "Hanoi · early morning", title: "Steam rises with the city.", fact: "Pho is closely associated with northern Vietnam and with bowls eaten from morning street stalls as well as established shops." },
    { eyebrow: "A clear broth", title: "Gentle simmering is visible in the bowl.", fact: "Blanching bones, skimming carefully, and avoiding a hard boil produce a broth that is aromatic yet visually clear." },
    { eyebrow: "Charred aromatics", title: "Blackened edges make a bright broth deeper.", fact: "Onion and ginger are charred before simmering, contributing sweetness, smokiness, and warmth without turning the broth heavy." },
    { eyebrow: "Rice noodles", title: "The noodle and broth are cooked on different clocks.", fact: "Rice noodles are prepared separately so they remain supple and do not cloud or over-thicken the stock." },
    { eyebrow: "Northern restraint", title: "Hanoi bowls often keep the garnish focused.", fact: "Regional pho traditions differ; a northern presentation is commonly described as more restrained in herbs and sweetness than many southern versions." },
    { eyebrow: "At the counter", title: "Season the broth before it meets the bowl.", fact: "Because noodles and meat dilute the stock, the strained broth should taste slightly assertive before it is poured and served immediately." },
  ],
  paella: [
    { eyebrow: "Valencia · Albufera", title: "Before the pan, there is water.", fact: "Rice cultivation in the wetlands south of Valencia links the dish to irrigation, seasonal labor, and a landscape shaped around grain." },
    { eyebrow: "The rice", title: "A short grain absorbs the cooking liquid without disappearing.", fact: "Valencian rice varieties are valued for taking on the broth’s flavor while retaining a distinct grain in the shallow pan." },
    { eyebrow: "The huerta", title: "Green beans and garrofó point back to the fields.", fact: "Traditional Valencian ingredients connect the pan to the irrigated agricultural plain around the city rather than to a generic idea of Spanish seafood." },
    { eyebrow: "Fire and vessel", title: "The wide pan changes evaporation.", fact: "A thin, level layer of rice cooks through the relationship between surface area, liquid, flame, and the metal pan itself." },
    { eyebrow: "Sunday outdoors", title: "Cooking can become the gathering.", fact: "Paella is often prepared communally and brought to the table in its pan, so making the meal is part of the social occasion." },
    { eyebrow: "Socarrat", title: "Listen for the final layer.", fact: "Near the end, careful heat can toast the rice touching the pan; the dry crackle signals a crust without asking the rest of the rice to burn." },
  ],
  moussaka: [
    { eyebrow: "Athens · neighborhood oven", title: "A layered dish rewards patience before serving.", fact: "Greek moussaka brings eggplant, spiced meat sauce, and béchamel together, then needs a substantial rest before it will hold a clean slice." },
    { eyebrow: "Eggplant", title: "Roasting makes structure as well as flavor.", fact: "Removing moisture and browning the eggplant keeps the layers tender without making the finished dish oily or loose." },
    { eyebrow: "Eastern Mediterranean", title: "The name travels across several food cultures.", fact: "Moussaka has related forms across the Balkans and eastern Mediterranean; the familiar Greek baked version is one branch of a wider family." },
    { eyebrow: "The meat sauce", title: "Reduction prevents the layers from sliding.", fact: "Tomato, lamb or beef, onion, and warm spice are cooked until concentrated enough to sit between the eggplant." },
    { eyebrow: "Béchamel", title: "The top should be light enough to rise, firm enough to cut.", fact: "Egg and cheese enrich the white sauce so it bakes into a golden upper layer rather than remaining a pourable cream." },
    { eyebrow: "The shared pan", title: "Resting turns a casserole into portions.", fact: "The waiting time after baking is part of the method and makes it possible to serve generous slices without losing the layered structure." },
  ],
  rendang: [
    { eyebrow: "West Sumatra · Minangkabau", title: "Rendang carries the logic of a long journey.", fact: "The dish is rooted in Minangkabau food culture, where slow reduction also made richly spiced meat suitable for keeping and travel." },
    { eyebrow: "Coconut", title: "Milk becomes toasted solids and aromatic oil.", fact: "Hours of reduction transform coconut milk from pale liquid into a dark coating that clings to the beef." },
    { eyebrow: "The spice paste", title: "Fragrance is built before dryness.", fact: "Chile, shallot, garlic, ginger, galangal, lemongrass, and leaves create the aromatic base that concentrates as water leaves the pot." },
    { eyebrow: "Rumah gadang", title: "Food sits within a matrilineal culture.", fact: "Minangkabau identity is expressed through architecture, ceremony, migration, and shared food; rendang is one part of that larger social world." },
    { eyebrow: "Merantau", title: "Movement helped the dish travel.", fact: "The Minangkabau tradition of leaving home to seek experience spread cooks and restaurants across Indonesia and beyond." },
    { eyebrow: "The final hour", title: "Stir more as the sauce grows drier.", fact: "When oil separates and coconut solids begin to toast, low heat and frequent scraping create depth while preventing scorching." },
  ],
};

export function cultureProfileFor(slug: string) {
  return cultureStoryProfiles[slug] ?? [];
}
