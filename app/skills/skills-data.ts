// Kitchen skills content. English only for now; techniques are general kitchen practice, so
// cards carry no source citations. Safety-relevant numbers (core temperatures, storage
// times, smoke points) follow widely published food-safety guidance and are rounded.

export type ToolId =
  | "knife" | "cleaver" | "board" | "thermometer" | "wok" | "skillet" | "nonstick" | "hob" | "oven"
  | "shaker" | "mortar" | "espresso" | "kettle" | "dutch" | "steamer" | "jars";

export type Tool = { name: string; kind: string; spot: [number, number]; good: string; care: string; induction?: { text: string; ok: boolean } };
export type LaneId = "knife" | "stove" | "oven" | "flavour" | "grain" | "keep" | "drinks";
export type Lane = { id: LaneId; tone: string; name: string; blurb: string };
export type SkillNode = { id: string; lane: LaneId | null; tier: -1 | 0 | 1 | 2; title: string; icon: string; tools: ToolId[]; needs: string[]; practice?: string };
export type RefTable = { caption: string; head?: string[]; rows: string[][] };
export type Tip = { title: string; text: string };
export type Card = { summary: string; steps: [string, string, string?][]; tables: RefTable[]; tips: Tip[]; mistakes: [string, string][] };

export const TIERS = ["Start", "Build", "Master"] as const;

export const TOOLS: Record<ToolId, Tool> = {
  knife: { name: "Chef's knife", kind: "Knife · 20 cm", spot: [118, 236],
    good: "The everyday blade. Chopping, slicing and dicing almost anything that isn't bone.",
    care: "Hand-wash and dry the knife promptly; never leave it hidden in a sink of soapy water. Maintain the edge as the maker recommends, using a honing rod only if suitable, and sharpen when the edge becomes dull." },
  cleaver: { name: "Chinese cleaver", kind: "Knife · caidao", spot: [216, 214],
    good: "A thin, tall blade for fine slicing, smashing garlic and ginger, and scooping chopped food to the pan.",
    care: "A thin vegetable cleaver is not for bones. It chips. Use a heavy bone cleaver for that." },
  board: { name: "Cutting board", kind: "Prep", spot: [176, 440],
    good: "Use a stable, food-safe cutting board. Wood, suitable plastic or rubber protects the knife edge better than glass or stone.",
    care: "Lay a damp cloth underneath so it can't slide. Keep a separate board for raw meat. Never soak wood." },
  thermometer: { name: "Instant-read thermometer", kind: "Measure", spot: [363, 418],
    good: "Check the temperature of meat, bread and milk. For sugar syrup or frying oil, first check that the probe is rated for that temperature and use.",
    care: "Check the probe in a well-stirred ice-water slurry: it should read about 0 °C (32 °F). Clean it before and after use as the manufacturer directs, especially between raw and cooked food." },
  wok: { name: "Carbon-steel wok", kind: "Pan", spot: [490, 388],
    good: "Stir-frying, steaming and deep-frying, in one pan that heats and cools fast.",
    care: "Season it like cast iron. After washing, dry it over the heat and wipe on a thin film of oil.",
    induction: { text: "Use an induction-compatible flat-bottom wok on a standard induction hob; round-bottom woks need a suitable burner or dedicated hob", ok: true } },
  skillet: { name: "Cast-iron skillet", kind: "Pan", spot: [656, 362],
    good: "Holds heat for hard sears, crisp shallow-frying and going straight into the oven.",
    care: "Heat it up gradually. Dry it on the hob after washing and wipe on a thin film of oil. The handle gets as hot as the pan.",
    induction: { text: "Works on induction", ok: true } },
  nonstick: { name: "Nonstick frying pan", kind: "Pan", spot: [628, 509],
    good: "Useful for eggs, fish and pancakes, especially when you want food to release with little oil.",
    care: "Medium heat or lower, never heated empty on high. Use wooden or silicone tools and replace it once the coating flakes.",
    induction: { text: "Only if the base is marked for induction", ok: false } },
  hob: { name: "Induction hob", kind: "Heat", spot: [470, 525],
    good: "Fast, exact heat that responds as soon as you change the setting.",
    care: "Use cookware marked for induction, with a flat magnetic base that fits the hob. A magnet is a useful first check, but not a compatibility guarantee. The glass stays hot after cooking; follow the appliance and any implanted-device guidance." },
  oven: { name: "Oven & sheet pan", kind: "Heat", spot: [593, 612],
    good: "Hands-off cooking: roasting, baking and slow braising while you get on with something else.",
    care: "Fan-assisted ovens transfer heat more efficiently. A reduction of about 20 °C is a common starting point when adapting a conventional-oven recipe; follow the recipe and oven manual. Use a sturdy, rimmed sheet pan." },
  shaker: { name: "Shaker & jigger", kind: "Drinks", spot: [796, 500],
    good: "Measured, chilled, well-mixed drinks, with or without alcohol.",
    care: "Use a purpose-made cocktail shaker, preferably metal tins. Do not improvise with an ordinary drinking glass. Wash and dry the parts after use and follow the maker's instructions for opening the seal." },
  mortar: { name: "Mortar & pestle", kind: "Flavour", spot: [870, 510],
    good: "Pastes, spice blends and crushed garlic, with a texture a blender can't give.",
    care: "Granite grips best. A pinch of salt helps it grind. Rinse it and let it air-dry." },
  espresso: { name: "Espresso machine", kind: "Coffee", spot: [1000, 444],
    good: "Espresso, plus steamed milk for flat whites, lattes and cappuccinos.",
    care: "Purge and wipe the steam wand after every use. Descale as the manual says; hard water needs it more often. Switch off and cool down before cleaning the group." },
  kettle: { name: "Gooseneck kettle", kind: "Coffee & tea", spot: [1124, 496],
    good: "A narrow spout gives a controlled pour for filter coffee. Choose a model with temperature control if you need a particular water temperature for coffee or tea.",
    care: "Fill between the min and max marks. Descale with a product and method recommended by the manufacturer, then rinse or boil and discard water as directed." },
  dutch: { name: "Dutch oven", kind: "Pot · enamelled cast iron", spot: [868, 182],
    good: "Braises, stews, soups, rice for a crowd, and crusty loaves baked under the lid.",
    care: "Avoid empty preheating unless the manufacturer explicitly allows it, including in the oven. Check the lid knob and handles' temperature limits. Avoid thermal shock and abrasive metal scourers.",
    induction: { text: "Works on induction", ok: true } },
  steamer: { name: "Bamboo steamer", kind: "Steam", spot: [1006, 182],
    good: "Dumplings, buns, fish and vegetables, cooked gently with no oil.",
    care: "Use perforated baking paper or suitable leaves, leaving paths for steam. Keep the basket above the water and let it dry completely before storage." },
  jars: { name: "Glass jars", kind: "Keep", spot: [1122, 192],
    good: "Quick pickles, dressings, stocks and leftovers you can see into.",
    care: "Wash with hot soapy water and rinse well. For freezing, use freezer-safe jars and the maker's headspace guidance; ordinary glass may crack. These jars do not make food shelf-stable." },
};

/** Left to right across the wall, so the chip row reads like the picture. */
export const TOOL_ORDER: ToolId[] = ["knife", "cleaver", "board", "thermometer", "wok", "skillet", "nonstick", "hob", "oven", "shaker", "mortar", "espresso", "kettle", "dutch", "steamer", "jars"];

export const LANES: Lane[] = [
  { id: "knife", tone: "sky", name: "Knife work", blurb: "Even, safe, quick cuts." },
  { id: "stove", tone: "peach", name: "Stovetop", blurb: "Control heat in a pan." },
  { id: "oven", tone: "rose", name: "Oven & pot", blurb: "Slow, steady, hands-off heat." },
  { id: "flavour", tone: "butter", name: "Flavour", blurb: "Season, bloom, balance." },
  { id: "grain", tone: "lilac", name: "Dough & grain", blurb: "Rice, steam and bread." },
  { id: "keep", tone: "aqua", name: "Keep & preserve", blurb: "Store food and make it last." },
  { id: "drinks", tone: "latte", name: "Drinks", blurb: "Coffee, milk and mixed drinks." },
];

export const NODES: SkillNode[] = [
  { id: "station", lane: null, tier: -1, title: "Set up your station", icon: "station", tools: ["board", "knife"], needs: [] },
  { id: "grip", lane: "knife", tier: 0, title: "Hold a knife and protect your fingertips", icon: "grip", tools: ["knife", "board", "cleaver"], needs: [], practice: "salad" },
  { id: "dice", lane: "knife", tier: 1, title: "Dice an onion", icon: "dice", tools: ["knife", "board"], needs: ["grip"], practice: "onion" },
  { id: "julienne", lane: "knife", tier: 2, title: "Julienne & slice across the grain", icon: "julienne", tools: ["cleaver", "knife"], needs: ["dice"], practice: "stir-fry" },
  { id: "preheat", lane: "stove", tier: 0, title: "Preheat a pan", icon: "preheat", tools: ["skillet", "nonstick", "hob"], needs: [], practice: "egg" },
  { id: "sear", lane: "stove", tier: 1, title: "Sear & deglaze", icon: "sear", tools: ["skillet", "hob"], needs: ["preheat"], practice: "steak" },
  { id: "stirfry", lane: "stove", tier: 2, title: "Stir-fry in a wok", icon: "stirfry", tools: ["wok", "hob", "cleaver"], needs: ["sear", "julienne"], practice: "stir-fry" },
  { id: "roast", lane: "oven", tier: 0, title: "Roast on a sheet pan", icon: "roast", tools: ["oven"], needs: [], practice: "roast" },
  { id: "braise", lane: "oven", tier: 1, title: "Braise low & slow", icon: "braise", tools: ["dutch", "oven"], needs: ["roast", "sear"], practice: "stew" },
  { id: "temp", lane: "oven", tier: 2, title: "Cook to temperature", icon: "temp", tools: ["thermometer", "oven"], needs: ["braise"], practice: "chicken" },
  { id: "season", lane: "flavour", tier: 0, title: "Season in layers", icon: "season", tools: ["mortar"], needs: [], practice: "soup" },
  { id: "bloom", lane: "flavour", tier: 1, title: "Bloom spices & pastes", icon: "bloom", tools: ["mortar", "skillet"], needs: ["season"], practice: "curry" },
  { id: "balance", lane: "flavour", tier: 2, title: "Balance a sauce", icon: "balance", tools: ["mortar"], needs: ["bloom"], practice: "sauce" },
  { id: "rice", lane: "grain", tier: 0, title: "Cook rice by absorption", icon: "rice", tools: ["dutch"], needs: [], practice: "rice" },
  { id: "steam", lane: "grain", tier: 1, title: "Steam dumplings & buns", icon: "steam", tools: ["steamer", "wok"], needs: ["rice"], practice: "dumpling" },
  { id: "knead", lane: "grain", tier: 2, title: "Knead & proof a dough", icon: "knead", tools: ["dutch", "oven"], needs: ["steam"], practice: "bread" },
  { id: "store", lane: "keep", tier: 0, title: "Cool & store leftovers", icon: "store", tools: ["thermometer", "jars"], needs: [] },
  { id: "pickle", lane: "keep", tier: 1, title: "Quick pickle", icon: "pickle", tools: ["jars"], needs: ["store"], practice: "pickle" },
  { id: "freeze", lane: "keep", tier: 2, title: "Blanch & freeze", icon: "freeze", tools: [
  "dutch",
  "board",
  "knife"
], needs: ["pickle"] },
  { id: "brew", lane: "drinks", tier: 0, title: "Brew coffee by ratio", icon: "brew", tools: ["kettle", "thermometer"], needs: [], practice: "coffee" },
  { id: "espresso", lane: "drinks", tier: 1, title: "Pull an espresso, steam milk", icon: "espresso", tools: ["espresso", "thermometer"], needs: ["brew"], practice: "coffee" },
  { id: "mix", lane: "drinks", tier: 2, title: "Shake & stir a drink", icon: "mix", tools: ["shaker"], needs: ["espresso", "balance"] },
];

export const ICONS: Record<string, string> = {
  station: '<rect x="4" y="20" width="22" height="13" rx="3" class="c"/><path d="M8 15 H24 L21 11 H8 Z" class="a"/><circle cx="32" cy="14" r="4.5" class="b"/><circle cx="32" cy="27" r="4.5" class="a"/>',
  grip: '<path d="M4 23 H28 L35 19 H4 Z" class="c"/><path d="M28 23 L35 19"/><path d="M9 23 q3 6 7 0 M16 23 q3 6 7 0 M23 23 q3 5 6 0" class="b"/><rect x="4" y="13" width="9" height="6" rx="2" class="a"/>',
  dice: '<path d="M8 15 L20 9 L32 15 L20 21 Z" class="c"/><path d="M8 15 V27 L20 33 V21 Z" class="b"/><path d="M32 15 V27 L20 33 V21 Z" class="a"/><path d="M14 18 V30 M26 18 V30 M14 12 L26 18 M26 12 L14 18"/>',
  julienne: '<rect x="7" y="9" width="4" height="23" rx="1.5" transform="rotate(-14 9 20)" class="a"/><rect x="14" y="8" width="4" height="24" rx="1.5" transform="rotate(-6 16 20)" class="c"/><rect x="21" y="8" width="4" height="24" rx="1.5" transform="rotate(4 23 20)" class="a"/><rect x="28" y="9" width="4" height="23" rx="1.5" transform="rotate(12 30 20)" class="b"/>',
  preheat: '<path d="M5 23 H29 L27 30 H7 Z" class="a"/><path d="M29 24 H37"/><path d="M11 17 q3 -3 0 -6 q-3 -3 0 -6 M17 17 q3 -3 0 -6 q-3 -3 0 -6 M23 17 q3 -3 0 -6 q-3 -3 0 -6"/>',
  sear: '<path d="M7 16 Q19 6 32 13 Q37 24 27 30 Q13 35 7 25 Z" class="b"/><path d="M13 13 L18 28 M19 10 L25 29 M26 11 L31 25"/>',
  stirfry: '<path d="M5 20 Q20 38 35 20 Z" class="a"/><path d="M35 20 L38 15"/><circle cx="13" cy="11" r="2.5" class="c"/><rect x="18" y="5" width="5" height="5" rx="1" class="b"/><circle cx="27" cy="12" r="2.5" class="c"/>',
  roast: '<rect x="3" y="25" width="34" height="5" rx="1.5" class="a"/><circle cx="10" cy="20" r="4.5" class="b"/><circle cx="20" cy="18.5" r="6" class="c"/><circle cx="30" cy="20" r="4.5" class="b"/>',
  braise: '<path d="M8 19 H32 V28 Q32 33 27 33 H13 Q8 33 8 28 Z" class="b"/><path d="M6 17 Q20 6 34 17 Z" class="a"/><path d="M3 22 H8 M32 22 H37 M18 9 H22"/>',
  temp: '<rect x="15" y="4" width="11" height="21" rx="4" class="a"/><rect x="18" y="8" width="5" height="5" rx="1" class="c"/><path d="M20.5 25 V37"/>',
  season: '<path d="M13 5 H27 L25 18 H15 Z" class="c"/><path d="M15 9 H25"/><circle cx="16" cy="24" r="1.6" class="k"/><circle cx="22" cy="27" r="1.6" class="k"/><circle cx="18" cy="32" r="1.6" class="k"/><circle cx="25" cy="34" r="1.6" class="k"/><circle cx="13" cy="30" r="1.6" class="k"/>',
  bloom: '<ellipse cx="15" cy="25" rx="10" ry="6.5" class="a"/><path d="M24 22 L37 13"/><circle cx="11" cy="24" r="1.7" class="k"/><circle cx="16" cy="27" r="1.7" class="k"/><circle cx="18" cy="23" r="1.7" class="k"/><path d="M27 4 v6 M24 7 h6 M9 8 v4 M7 10 h4"/>',
  balance: '<path d="M20 7 V33 M12 34 H28 M7 11 L33 15"/><path d="M3 22 Q7 28 11 22 Z" class="b"/><path d="M29 26 Q33 32 37 26 Z" class="a"/><path d="M7 11 L3 22 M7 11 L11 22 M33 15 L29 26 M33 15 L37 26"/>',
  rice: '<path d="M5 20 H35 Q33 33 20 33 Q7 33 5 20 Z" class="a"/><path d="M9 20 Q20 9 31 20 Z" class="c"/><path d="M15 16 l2 -1 M20 13 l2 1 M24 16 l2 -1 M18 18 l2 0"/>',
  steam: '<rect x="6" y="21" width="28" height="12" rx="3" class="a"/><path d="M8 27 H32"/><path d="M4 21 Q20 11 36 21 Z" class="c"/><path d="M14 9 q-2 -2.5 0 -5 M20 9 q-2 -2.5 0 -5 M26 9 q-2 -2.5 0 -5"/>',
  knead: '<path d="M5 31 Q3 15 20 13 Q37 15 35 31 Z" class="c"/><path d="M11 25 Q20 18 29 25"/><path d="M4 34 H36"/>',
  store: '<rect x="6" y="17" width="28" height="16" rx="3" class="c"/><rect x="4" y="11" width="32" height="7" rx="2" class="a"/><path d="M13 25 H27"/>',
  pickle: '<rect x="10" y="12" width="20" height="23" rx="4" class="c"/><rect x="9" y="6" width="22" height="7" rx="2" class="a"/><circle cx="16" cy="21" r="3.2" class="b"/><circle cx="24" cy="28" r="3.2" class="b"/>',
  freeze: '<path d="M20 4 V36 M6 12 L34 28 M6 28 L34 12 M16 7 L20 11 L24 7 M16 33 L20 29 L24 33"/><circle cx="20" cy="20" r="4" class="a"/>',
  brew: '<path d="M10 8 H30 L23 20 H17 Z" class="a"/><path d="M12 24 H28 V31 Q28 35 24 35 H16 Q12 35 12 31 Z" class="c"/><path d="M28 26 q5 0 5 3.5 q0 3.5 -5 3.5"/><path d="M20 20 V24"/>',
  espresso: '<path d="M8 18 H28 V27 Q28 33 22 33 H14 Q8 33 8 27 Z" class="b"/><path d="M28 21 q6 0 6 4 q0 4 -6 4"/><path d="M5 36 H31"/><path d="M14 13 q-2 -3 0 -6 M21 13 q-2 -3 0 -6"/>',
  mix: '<path d="M10 35 L8 15 H22 L20 35 Z" class="c"/><path d="M9 15 L11 9 H19 L21 15 Z" class="a"/><rect x="12" y="4" width="6" height="5" rx="2" class="a"/><path d="M25 18 H35 L31 25 H29 Z" class="b"/><path d="M29 25 H31 L34 33 H26 Z" class="b"/>',
};

const board = '<rect x="6" y="84" width="148" height="18" rx="5" class="f-oak s-thin"/>';
const diceBits = [[18, 66], [28, 70], [38, 66], [48, 70], [22, 58], [33, 58], [44, 60], [54, 64], [28, 48], [40, 50], [52, 54]]
  .map(([x, y]) => `<rect x="${x}" y="${y}" width="9" height="9" rx="1.5" class="f-onion-in s-thin"/>`).join("");

export const STEP_ART: Record<string, string> = {
  dice1: board + '<circle cx="80" cy="54" r="29" class="f-onion s-line"/><path d="M66 32 Q60 54 66 76 M94 32 Q100 54 94 76" class="s-thin" fill="none" opacity=".5"/><path d="M80 25 L77 16 L84 19" class="s-line" fill="none"/><path d="M72 84 l3 -3 M80 85 v-4 M88 84 l-3 -3" class="s-line"/><path d="M80 12 V96" class="s-clay" stroke-width="2.4" stroke-dasharray="5 4"/>',
  dice2: board + '<path d="M36 84 C36 50 58 38 80 38 C102 38 124 50 124 84 Z" class="f-onion-in s-line"/><path d="M52 84 C54 60 66 50 80 50 C94 50 106 60 108 84 M66 84 C68 70 74 64 80 64 C86 64 92 70 94 84" class="s-onion" stroke-width="1.6"/><path d="M124 76 l7 -2 M124 81 l8 1 M123 71 l6 -4" class="s-line"/>',
  dice3: board + '<ellipse cx="78" cy="56" rx="50" ry="30" class="f-onion-in s-line"/><rect x="124" y="46" width="8" height="20" rx="3" class="f-onion s-thin"/><path d="M30 42 H112 M28 51 H112 M28 60 H112 M30 69 H112" class="s-clay" stroke-width="2"/>',
  dice4: board + '<clipPath id="skill-dice-cut"><rect x="74" y="20" width="70" height="70"/></clipPath><ellipse cx="78" cy="56" rx="50" ry="30" class="f-onion-in s-line" clip-path="url(#skill-dice-cut)"/><rect x="124" y="46" width="8" height="20" rx="3" class="f-onion s-thin"/><path d="M80 42 H112 M80 51 H112 M80 60 H112 M80 69 H112 M88 30 V82 M98 28 V84 M108 30 V82" class="s-clay" stroke-width="1.6"/>' + diceBits,
};

export const CARDS: Record<string, Card> = {
  station: {
    summary: "Get everything ready, and safe, before the heat goes on, so cooking is calm instead of a scramble.",
    steps: [
      ["Read the recipe to the end", "Note anything that needs time ahead: marinating, soaking, preheating the oven."],
      ["Wash your hands", "Before you start, and every time you've touched raw meat, fish or eggs."],
      ["Set up the board", "Put a damp cloth under it so it can't slide, with a bowl for scraps beside it."],
      ["Prep everything", "Wash produce, then cut and measure ingredients as needed. Do not wash raw meat or poultry. Keep raw-food prep separate and arrange ingredients in cooking order."],
      ["Clean as you go", "Wash the board and tools after raw-food prep before using them for ready-to-eat food. Keep the work surface clear between tasks."],
    ],
    tables: [{ caption: "Station checklist", head: ["Item", "Why"], rows: [
      ["Damp cloth under the board", "Stops it sliding"],
      ["Separate board for raw meat", "Keeps raw juices off ready-to-eat food"],
      ["Clear space beside the hob", "Somewhere to put a hot pan down"],
      ["Extractor on before high heat", "Clears smoke and steam"],
      ["Dry towel or oven gloves", "Hot handles; wet cloths conduct heat"],
    ] }],
    tips: [{ title: "If oil catches fire", text: "For a small pan fire, slide a metal lid or baking sheet over it and switch off the heat only if safe. Leave it covered until cool. Never use water or move the pan. If it is unsafe to approach, leave and call emergency services." }],
    mistakes: [
      ["Garlic burns while you chop the next thing", "Prep everything before the pan goes on."],
      ["Raw chicken juice on the salad board", "Use a separate board, and wash hands, board and knife afterwards."],
      ["The board slides", "Use a damp cloth or a non-slip mat underneath."],
    ],
  },
  grip: {
    summary: "A firm grip gives you control, and a claw hand keeps your fingertips away from the blade.",
    steps: [
      ["Pinch the blade", "Hold the blade just in front of the handle between your thumb and the side of your bent index finger. Wrap the other fingers round the handle."],
      ["Make a claw", "Curl the fingertips of your other hand under, with the thumb tucked behind them."],
      ["Guide with your knuckles", "Rest the flat of the blade against your knuckles. Move the claw back to set the width of each cut."],
      ["Let the knife travel", "Push forward and down through firm vegetables. For herbs, keep the tip on the board and rock."],
    ],
    tables: [{ caption: "Which motion", head: ["Motion", "Use for"], rows: [
      ["Push cut", "Onions, carrots, most vegetables"],
      ["Rocking", "Herbs, garlic"],
      ["Pull cut", "Soft food: fish, tomatoes"],
      ["Tap chop", "Fast slicing with a Chinese cleaver"],
    ] }],
    tips: [{ title: "Tip", text: "A sharp knife is safer than a dull one. It goes where you aim instead of skidding off." }],
    mistakes: [
      ["A knife falls", "Step back and let it drop. Never try to catch it."],
      ["Index finger along the top of the blade", "You lose control. Pinch the blade instead."],
      ["Fingertips flat on the food", "Curl them into a claw."],
      ["Round vegetables roll", "Cut a thin slice off one side so it sits flat first."],
    ],
  },
  dice: {
    summary: "Even cubes soften and brown at the same rate, so nothing burns while the rest catches up.",
    steps: [
      ["Halve it through the root", "Cut from the tip down through the root so each half keeps part of it.", "dice1"],
      ["Peel and lay it flat", "Trim the tip, pull off the papery skin, and put each half cut side down.", "dice2"],
      ["Slice toward the root", "Make lengthwise cuts the width you want. Stop just short of the root.", "dice3"],
      ["Cut across", "Slice across those cuts and the dice fall away. Throw out the root end.", "dice4"],
    ],
    tables: [{ caption: "Dice sizes", head: ["Cut", "Size", "Use for", "Softens in"], rows: [
      ["Brunoise", "3 mm", "Sauces, dressings", "~3 min"],
      ["Small", "6 mm", "Soffritto, salsa, fried rice", "5–7 min"],
      ["Medium", "12 mm", "Soups, stews, curries", "8–10 min"],
      ["Large", "20 mm", "Roasts, long braises", "12–15 min"],
    ] }],
    tips: [{ title: "Tip", text: "Softening times are for medium heat with a little oil." }],
    mistakes: [
      ["The onion falls apart", "Keep the root on until the last cut. It holds the layers together."],
      ["Pieces are uneven", "Make every cut the same width in both directions."],
      ["Your eyes sting", "Use a sharp knife and chill the onion for 15 minutes first."],
      ["The knife creeps toward your fingers", "Curl your fingertips into a claw and keep the blade against your knuckles."],
    ],
  },
  julienne: {
    summary: "Thin, even strips cook quickly and evenly, which helps a stir-fry finish without overcooking some pieces.",
    steps: [
  [
    "Square it off",
    "Trim the rounded sides so the vegetable sits flat and can't roll."
  ],
  [
    "Cut planks",
    "Slice lengthwise into planks about 3 mm thick."
  ],
  [
    "Stack and cut",
    "Stack two or three planks and cut them into 3 mm sticks."
  ],
  [
    "Chill meat first",
    "Chill the meat until firm enough to slice, using a short spell in the freezer if needed. Then cut across the grain with a sharp knife; keep raw meat chilled during preparation."
  ],
  [
    "Find the grain in meat",
    "Look for the lines of muscle fibre and slice across them, not along."
  ]
],
    tables: [{ caption: "Strip sizes", head: ["Cut", "Size", "Use for"], rows: [
      ["Fine julienne", "1.5 mm", "Garnishes, salads"],
      ["Julienne", "3 mm × 5–6 cm", "Stir-fries, slaws"],
      ["Batonnet", "6 mm", "Crudités, roasting"],
      ["Meat slices", "3–5 mm thick", "Stir-fries, noodle soups"],
    ] }],
    tips: [{ title: "Tip", text: "With a Chinese cleaver, use the side of the blade to scoop the strips straight into the bowl, sharp edge facing away from you." }],
    mistakes: [
      ["Strips are different thicknesses", "Cut the planks evenly first. The sticks follow."],
      ["Meat is chewy", "You sliced along the grain. Turn it 90° and slice across."],
      ["The stack slides apart", "Keep stacks low and hold them with a claw."],
    ],
  },
  preheat: {
    summary: "Match the pan heat to the food and cookware. A properly heated pan helps browning, but very high heat is not suitable for every task.",
    steps: [
      ["Choose a suitable heat setting", "For uncoated stainless steel, carbon steel or cast iron, warm gradually over medium heat. Time varies with the pan and hob. Add oil before warming a nonstick pan and follow its instructions."],
      ["Check the pan without guessing a temperature", "On an uncoated pan only, a few water drops can give a rough heat cue; they cannot measure an exact temperature. Let all water evaporate before adding oil. Never add water to hot oil or test a nonstick pan this way."],
      ["Add oil, then food", "Add a little suitable oil and look for a gentle shimmer, not smoke. Lower dry food into the pan away from you. Let a crust form before trying to turn it."],
    ],
    tables: [
      { caption: "Pan-heating cues, not temperature measurements", head: ["Pan", "What to look for", "How to respond"], rows: [
        ["Pan still cool", "Water sits or evaporates slowly", "Continue warming for tasks that need browning"],
        ["Moderate heat", "A small water drop sizzles and evaporates", "Often suitable for eggs or gently softening onions; adjust the heat"],
        ["Hot uncoated pan", "Water may move or evaporate quickly; behavior varies", "Dry the pan, add oil and check for a gentle shimmer"],
        ["Water beads and glides", "The surface is very hot; no precise temperature is established", "Do not use this as a target for every pan or food; reduce the heat if needed"],
      ] },
      { caption: "Smoke points (approx.)", rows: [
        ["Butter", "150 °C"], ["Extra-virgin olive oil", "190 °C"], ["Refined sunflower or rapeseed", "225 °C"], ["Ghee", "250 °C"], ["Refined avocado oil", "260 °C"],
      ] },
    ],
    tips: [
      { title: "Induction & nonstick", text: "Induction can overheat a pan quickly. Warm nonstick with oil or food over low to medium heat, and follow its manufacturer's limits; do not rely on one universal temperature limit." },
      { title: "Safety", text: "Ventilate before high-heat cooking. If oil smokes, switch off the heat and let it cool. For a small fire, cover with a metal lid only if safe; never use water or move a burning pan." },
    ],
    mistakes: [
      ["Food sticks and tears", "The pan wasn't hot enough, or you moved the food too soon."],
      ["Oil smokes as soon as it goes in", "Switch off the heat and let the pan cool before adding more oil or food. Choose an oil suited to the cooking temperature; do not try to fix overheating by adding oil."],
      ["Meat turns grey and watery", "The pan is crowded. Cook in batches."],
      ["Nonstick looks dull or blistered", "Stop using a pan with blistered or flaking coating. Replace it as the manufacturer advises; lower heat will not repair damaged coating."],
    ],
  },
  sear: {
    summary: "A deep brown crust adds flavour, and the browned bits left in the pan become the sauce.",
    steps: [
      ["Dry and season", "Pat the surface dry. Salt it just before cooking, or 40 minutes or more ahead."],
      ["Preheat", "Warm an uncoated steel or cast-iron pan gradually. Add a thin film of suitable oil and begin when it shimmers, without letting it smoke."],
      ["Lay it in and wait", "Place it away from you and leave it until it releases on its own, usually 2–4 minutes."],
      ["Turn once", "Brown the other side, then continue cooking as needed. A browned surface does not prove the centre is safe; check the appropriate core temperature before resting or serving."],
      ["Deglaze", "Pour off most of the fat, add a splash of stock, wine or water, and scrape up the brown bits as it bubbles."],
    ],
    tables: [{ caption: "Read the pan", head: ["You see", "It means"], rows: [
      ["Food sticks when nudged", "Crust not formed yet. Wait."],
      ["It slides freely", "Ready to turn"],
      ["Brown film on the pan", "Flavour. Deglaze it."],
      ["Black film on the pan", "The residue is burnt. Switch off the heat, let the pan cool and clean it out rather than using it for a sauce."],
    ] }],
    tips: [
      { title: "Safety", text: "Take the pan off the heat before pouring in wine or spirits. Alcohol can flare up." },
      { title: "Tip", text: "Rest meat for about 5 minutes before slicing so the juices settle." },
    ],
    mistakes: [
      ["Meat turns grey and steams", "The surface was wet or the pan was crowded. Dry it and cook in batches."],
      ["The brown bits burn", "Heat too high for too long. Turn it down a notch."],
      ["Hot fat spits at you", "Pat the food dry and lay it in moving away from you."],
    ],
  },
  stirfry: {
    summary: "Very hot, very fast cooking. It works when everything is prepped and the batches are small.",
    steps: [
      ["Prep everything first", "Cut ingredients to a similar size and mix the sauce. Line them up in order."],
      ["Heat the wok", "Warm a carbon-steel wok over medium-high heat, then swirl in a little suitable oil. Start cooking when the oil shimmers; do not aim for heavy smoke. Use lower heat for coated cookware."],
      ["Cook the meat", "Spread it out in a single layer, in small batches. Lift it out as soon as it's just cooked."],
      ["Cook the vegetables", "Fry the aromatics for a few seconds, then add the vegetables, hardest first."],
      ["Bring it together", "Return the meat, pour the sauce down the side of the wok and toss until glossy."],
    ],
    tables: [{ caption: "Order and timing", head: ["Goes in", "Time"], rows: [
      ["Garlic, ginger, chilli", "10–20 s"],
      ["Hard vegetables: carrot, broccoli", "2–3 min"],
      ["Soft vegetables: pepper, mushroom", "1–2 min"],
      ["Tender leafy greens", "30–60 s"],
      ["Sauce and cooked meat", "Until glossy"],
    ] }],
    tips: [
      { title: "On induction", text: "Use a flat-bottom wok and keep it on the glass, because the hob cuts out when the pan lifts. Toss with the spatula instead of the pan." },
      { title: "Safety", text: "Ventilate well and drain vegetables before adding them to hot oil. Cook bean sprouts thoroughly rather than relying on a brief toss; check meat for the appropriate safe core temperature." },
    ],
    mistakes: [
      ["Vegetables go soggy", "Too much in the wok. Cook in batches."],
      ["The garlic burns", "Give it only a few seconds before the vegetables go in."],
      ["The sauce is thin", "Stir in a little cornflour mixed with cold water. It thickens as it boils."],
    ],
  },
  roast: {
    summary: "Hot, dry air and space between pieces give browned edges and soft centres.",
    steps: [
      ["Heat the oven", "200–220 °C conventional, or 180–200 °C with the fan on."],
      ["Cut evenly", "Pieces of a similar size cook at the same rate."],
      ["Oil and salt", "Toss in a bowl so every piece is coated."],
      ["Spread out", "Arrange in a single layer with gaps. Use two trays rather than crowding one."],
      ["Turn once", "Flip halfway, when the underside has browned."],
    ],
    tables: [{ caption: "Roasting at 200 °C (fan 180 °C)", head: ["Vegetable", "Cut", "Time"], rows: [
      ["Potatoes", "3 cm chunks", "35–45 min"],
      ["Carrots", "2 cm batons", "25–35 min"],
      ["Broccoli, cauliflower", "Florets", "20–25 min"],
      ["Peppers, courgettes", "3 cm pieces", "20–25 min"],
      ["Onions", "Wedges", "25–35 min"],
    ] }],
    tips: [
      { title: "Tip", text: "Heat the empty tray in the oven first for a crisper base." },
      { title: "Safety", text: "Open the oven door and let the first blast of heat escape before reaching in. Use dry oven gloves." },
    ],
    mistakes: [
      ["Pale and soft", "The tray was crowded or the oven too cool."],
      ["Burnt edges, raw middle", "Pieces too big or uneven. Cut them smaller."],
      ["Pieces stick", "Coat them in oil, or line the tray with baking paper."],
    ],
  },
  braise: {
    summary: "Brown first, then cook gently in a little liquid until tough cuts turn tender.",
    steps: [
      ["Brown the meat", "Sear in batches in the Dutch oven, then lift it out."],
      ["Soften the aromatics", "Cook onion, carrot and garlic in the same pot, scraping up the browned bits."],
      ["Add liquid", "Stock, wine, tomatoes or water, about halfway up the meat."],
      ["Cover and cook low", "Lid on, into a 150–160 °C oven, or at a bare simmer on the hob."],
      ["Check for tender", "Check tenderness with a fork and verify the appropriate safe core temperature, especially for poultry. Skim excess fat and reduce a thin sauce separately if needed."],
    ],
    tables: [{ caption: "Good cuts at 150 °C", head: ["Cut", "Time"], rows: [
      ["Beef chuck or shin", "2½–3½ h"],
      ["Pork shoulder", "2½–3 h"],
      ["Lamb shoulder or shanks", "2–3 h"],
      ["Chicken thighs, bone in", "45–60 min"],
    ] }],
    tips: [
      { title: "Tip", text: "Braises often taste better the next day. Divide into shallow containers and refrigerate promptly, within 2 hours or within 1 hour above 32 °C (90 °F). Lift off solidified fat once chilled." },
      { title: "Safety", text: "A full cast-iron pot is heavy. Only slide a supported oven shelf out as the manual allows, then lift the pot with both hands in dry gloves. Do not overextend the shelf or balance the pot on an unsupported edge." },
    ],
    mistakes: [
      ["Meat is still tough", "It needs longer. Check every 30 minutes."],
      ["Meat is stringy and dry", "The liquid boiled. Keep it at a bare simmer."],
      ["Sauce is thin and bland", "Take the lid off for the last 30 minutes, or reduce it on the hob."],
    ],
  },
  temp: {
    summary: "A thermometer tells you when food is safe and done, so you stop guessing and cutting it open.",
    steps: [
      ["Check the thermometer", "Stir plenty of ice with a little water. Insert the sensing part without touching the glass and wait for a stable reading near 0 °C; follow the probe's calibration instructions."],
      ["Probe the thickest part", "Go in from the side to reach the centre, away from bone and fat."],
      ["Reach the safe core temperature", "For this beginner method, reach the safe minimum temperature before removing food from the heat. Carryover cooking varies; do not assume it will make undercooked food safe."],
      ["Rest", "3–5 minutes for steaks and chops, longer for roasts."],
      ["Clean the probe", "Clean the probe with hot soapy water and rinse, or use the maker's recommended method. Clean again after contact with raw food before checking cooked food; do not immerse the display."],
    ],
    tables: [{ caption: "Safe core temperatures", head: ["Food", "Minimum core temperature"], rows: [
      ["All poultry, including ground poultry", "74 °C (165 °F)"],
      ["Ground beef, pork or lamb, including burgers and sausages", "71 °C (160 °F)"],
      ["Whole cuts of beef, lamb, pork", "63 °C (145 °F), rest 3 min"],
      ["Fish", "63 °C (145 °F)"],
      ["Reheated leftovers", "74 °C (165 °F)"],
    ] }],
    tips: [
      { title: "Rare beef", text: "Colour alone cannot establish safety. Follow the temperature guidance above. Never use rare-steak advice for minced meat or poultry; people at higher risk should avoid undercooked meat." },
      { title: "Carryover", text: "The centre may keep warming during rest, especially in a large roast, but the rise varies. Use a thermometer instead of assuming a fixed increase." },
    ],
    mistakes: [
      ["Reading is too low", "The probe missed the centre. Push it to the middle of the thickest part."],
      ["Overcooked after resting", "Monitor the temperature more frequently near the end of cooking. Stop at the appropriate safe minimum and rest as directed; do not lower the safety target."],
      ["Reading jumps near the bone", "Bone carries heat. Move the probe away from it."],
    ],
  },
  season: {
    summary: "Salt a little at each stage, then taste and adjust at the end.",
    steps: [
      ["Salt meat ahead", "It seasons beyond the surface and browns better."],
      ["Season at each stage", "A pinch when the onions go in, another when the liquid goes in."],
      ["Taste before serving", "Use a clean spoon each time. Adjust with salt, acid or heat."],
      ["Season from a height", "Sprinkle from about 20 cm so it spreads evenly."],
    ],
    tables: [{ caption: "Salt, roughly", head: ["Use", "Amount"], rows: [
      ["Pasta water", "About 10 g per litre"],
      ["Dry-brining meat", "About 1% of its weight"],
      ["Soups and sauces", "Add gradually and taste"],
      ["Vegetables to roast", "A good pinch per tray"],
    ] }],
    tips: [{ title: "Tip", text: "Mushrooms can brown whether salted early or late. Avoid crowding the pan and let released moisture evaporate before expecting browning." }],
    mistakes: [
      ["Tastes flat even with enough salt", "It needs acid: lemon juice or vinegar."],
      ["Too salty", "Add more of the unsalted base, or serve with plain rice or bread."],
      ["Salty on top, bland inside", "Season earlier, in layers."],
    ],
  },
  bloom: {
    summary: "Heat and fat bring out the flavour in spices and pastes.",
    steps: [
      ["Toast whole spices", "Dry pan, medium heat, shaking often, until fragrant: 1–3 minutes."],
      ["Grind while warm", "Crush them in the mortar. A pinch of salt helps them grind."],
      ["Fry ground spices in oil", "30–60 seconds over medium heat, stirring, before any liquid goes in."],
      ["Cook pastes until fragrant", "Cook the paste as the recipe directs, stirring until its raw aroma fades. Some oily pastes separate visibly, but low-fat pastes may not; do not keep frying just to force oil separation."],
    ],
    tables: [{ caption: "How to treat them", head: ["Spice", "Method"], rows: [
      ["Cumin, coriander, fennel seeds", "Toast whole, then grind"],
      ["Mustard seeds", "Fry in hot oil until they pop"],
      ["Paprika, chilli powder", "Low heat, 20–30 s; burns fast"],
      ["Curry paste", "Fry gently until fragrant, following the recipe; oil separation is not always needed"],
    ] }],
    tips: [
      { title: "Tip", text: "Have the liquid ready before you start. Ground spices go from fragrant to burnt in seconds." },
      { title: "Safety", text: "Frying dried chilli makes a sharp smoke. Run the extractor and keep your face back from the pan; popping seeds can jump, so keep a lid handy." },
    ],
    mistakes: [
      ["Bitter taste", "The spices burnt. Start again; it can't be fixed."],
      ["Raw, dusty taste", "The spices weren't cooked in fat."],
      ["Seeds stay pale", "Heat too low, or not long enough."],
    ],
  },
  balance: {
    summary: "Balance a sauce to suit the dish: consider salt, acidity, sweetness and, where appropriate, chilli heat. Adjust one element at a time.",
    steps: [
      ["Taste it as it is", "Use a clean spoon and decide what's missing before you add anything."],
      ["Fix the biggest gap first", "Usually salt, then acid."],
      ["Adjust in small steps", "Add a little, stir, taste again."],
      ["Finish with fat or something fresh", "Butter or oil rounds it out; herbs or citrus zest lift it."],
    ],
    tables: [{ caption: "If it tastes…", head: ["Tastes", "Add"], rows: [
      ["Flat, dull", "Salt, then lemon or vinegar"],
      ["Too sharp", "Sugar, honey or fat"],
      ["Too salty", "More unsalted base; acid or fat does not remove excess salt"],
      ["Too sweet", "Acid, salt or a little heat"],
      ["Too hot", "Dairy, sugar or more base"],
      ["Heavy, greasy", "Acid or fresh herbs"],
    ] }],
    tips: [{ title: "Tip", text: "Sauces concentrate as they reduce. Do the final seasoning at the end." }],
    mistakes: [
      ["Adding several fixes at once", "Change one thing at a time."],
      ["Too salty after reducing", "Season lightly until the sauce has reduced."],
      ["Tasting straight from the pan", "Let the spoon cool first. Heat dulls taste and can burn your mouth."],
    ],
  },
  rice: {
    summary: "Measured water, low heat and a rest give separate, fluffy grains.",
    steps: [
      ["Rinse", "Swirl in cold water and drain until the water runs nearly clear."],
      ["Measure the water", "Start with the rice packet's instructions. The table gives approximate stovetop ratios for unsoaked rice; use the same cup for rice and water, then adjust for the variety, rinsing and pot."],
      ["Bring to a boil", "Uncovered, then stir once."],
      ["Simmer covered", "Lowest heat, lid on, and don't lift it."],
      ["Rest and fluff", "Take it off the heat for 10 minutes with the lid on, then fluff with a fork."],
    ],
    tables: [{ caption: "Water per cup of rice", head: ["Rice", "Water", "Simmer"], rows: [
      ["Jasmine", "1¼ cups", "12–15 min"],
      ["Basmati", "1½ cups", "12–15 min"],
      ["Short-grain", "1¼ cups", "15 min"],
      ["Long-grain white", "1½–2 cups", "15–18 min"],
      ["Brown", "2 cups", "40–45 min"],
    ] }],
    tips: [
      { title: "Tip", text: "Adjust next time: hard centres need a little more water, mushy rice a little less." },
      { title: "Food safety", text: "Cool leftover rice within an hour, keep it in the fridge and eat it within a day." },
    ],
    mistakes: [
      ["Rice is overly sticky", "Not rinsed, or too much water."],
      ["The bottom burns", "Heat too high. Use the lowest setting and a heavy pot."],
      ["Grains still crunchy", "Add 2 tablespoons of boiling water, cover and leave 5 more minutes."],
    ],
  },
  steam: {
    summary: "Gentle, moist heat for dumplings, buns, fish and vegetables.",
    steps: [
      ["Set up the base", "Put the steamer in a wok or on a pot, with water 2–3 cm below the basket."],
      ["Line the baskets", "Baking paper with holes poked in it, or cabbage leaves."],
      ["Space the food", "Leave about 2 cm between pieces. Buns expand."],
      ["Steam at a strong simmer", "Start timing once steam is flowing steadily. Check the water level without reaching through escaping steam; replenish carefully with hot water and never let the pan boil dry."],
      ["Rest buns", "Turn off the heat and wait 2–3 minutes before lifting the lid."],
    ],
    tables: [{ caption: "Steaming times", head: ["Food", "Time"], rows: [
      ["Fresh dumplings", "8–10 min"],
      ["Frozen dumplings", "12–15 min"],
      ["Buns (bao)", "12–15 min"],
      ["Whole fish, 500–700 g", "10–12 min"],
      ["Green vegetables", "3–5 min"],
    ] }],
    tips: [{ title: "Safety", text: "Lift the lid away from your face and hands using dry oven gloves. Times vary with size and filling: verify raw-meat fillings reach the appropriate safe core temperature, and fish reaches 63 °C (145 °F)." }],
    mistakes: [
      ["Soggy bottoms", "The water touched the basket, or the basket wasn't lined."],
      ["Buns wrinkle or collapse", "The lid came off too soon. Rest them first."],
      ["Dumplings stick", "Line the basket, or brush the paper with a little oil."],
    ],
  },
  knead: {
    summary: "Kneading builds gluten; proofing lets the yeast fill it with gas.",
    steps: [
      ["Mix a rough dough", "Combine flour, water, yeast and salt until no dry flour is left."],
      ["Knead", "Push away with the heel of your hand, fold it back and turn a quarter. 8–10 minutes by hand."],
      ["Windowpane test", "Stretch a small piece. If it goes thin enough to see light through without tearing, it's ready."],
      ["First proof", "Cover and leave somewhere warm until it has roughly doubled."],
      ["Shape and proof again", "Shape it, then proof until it passes the poke test."],
    ],
    tables: [
      { caption: "First proof", head: ["Room", "Time"], rows: [["Warm, 24–27 °C", "1–1½ h"], ["Cool, 18–20 °C", "2–3 h"], ["Fridge, 4 °C", "8–24 h, more flavour"]] },
      { caption: "Poke test", head: ["The dent…", "Means"], rows: [["Springs back fast", "Needs longer"], ["Springs back slowly, partly", "Ready to bake"], ["Stays, dough sighs", "Over-proofed"]] },
    ],
    tips: [
      { title: "Tip", text: "For crusty bread, follow a complete bread recipe and your pot's manual. Only preheat an empty Dutch oven if the manufacturer allows it; the lid-on time depends on the loaf and recipe." },
      { title: "Safety", text: "The pot, lid and knob can cause severe burns. Check their heat limits, use thick dry oven gloves and oven-rated baking paper within its temperature limit; follow the bread recipe's loading method." },
    ],
    mistakes: [
      ["Dense loaf", "Under-kneaded or under-proofed."],
      ["It collapses in the oven", "Over-proofed. Bake sooner next time."],
      ["Dough is sticky", "Don't add much flour. Use wet hands or a scraper."],
    ],
  },
  store: {
    summary: "Cool food quickly, keep it cold and eat it soon.",
    steps: [
      ["Cool it quickly", "Divide hot food into shallow containers and refrigerate promptly; do not wait for a large pot to cool on the counter. Refrigerate within 2 hours, or within 1 hour if the surroundings exceed 32 °C (90 °F)."],
      ["Cover and date", "Lid on, with the date written on it."],
      ["Keep the fridge at 4 °C (40 °F) or below", "Check with a thermometer. The door is the warmest spot."],
      ["Reheat until steaming hot", "74 °C in the centre. Reheat only once."],
    ],
    tables: [{ caption: "In the fridge", head: ["Food", "Eat within"], rows: [
      ["Cooked meat and poultry", "2–3 days"],
      ["Cooked rice", "1 day"],
      ["Soups and stews", "2–3 days"],
      ["Cooked vegetables", "3 days"],
      ["Refrigerator pickles", "Follow a tested refrigerator-pickle recipe's storage time"],
    ] }],
    tips: [
      { title: "Rice", text: "Rice is the exception: cool it within an hour and eat it within a day." },
      { title: "Freezer", text: "Keep it at −18 °C or below. Thaw in the fridge, not on the counter." },
    ],
    mistakes: [
      ["A pot of stew left on the hob overnight", "Discard food left out overnight. For the next batch, divide it into shallow containers and refrigerate promptly, within 2 hours or within 1 hour above 32 °C (90 °F)."],
      ["A packed fridge", "Cold air needs to circulate. Leave some space."],
      ["Reheating the same food twice", "Reheat only what you'll eat."],
    ],
  },
  pickle: {
    summary: "Refrigerator pickles are vegetables flavored with vinegar brine and kept chilled. Use a tested recipe for the vegetable, liquid proportions and storage time; this guide is not a canning method.",
    steps: [
      ["Clean the jar", "Wash it in hot soapy water and rinse well."],
      ["Slice the vegetables", "Thin and even, about 3 mm."],
      ["Make the brine", "Use the vinegar, water, vegetable, salt and sugar amounts from a tested refrigerator-pickle recipe. Heat the brine as directed until the salt and sugar dissolve."],
      ["Pour and cover", "Pack the vegetables in the jar and pour over hot brine to cover. Add spices."],
      ["Cool and chill", "Refrigerate promptly in a suitable container. Let the pickles develop flavor for the time in the tested recipe, and follow its refrigerated storage limit; do not store these at room temperature."],
    ],
    tables: [
  {
    "caption": "Before you start refrigerator pickles",
    "head": [
      "Check",
      "What to use"
    ],
    "rows": [
      [
        "Recipe",
        "A tested refrigerator-pickle recipe for your vegetable and container size"
      ],
      [
        "Vinegar",
        "Vinegar with the acidity specified by the tested recipe, usually 5%"
      ],
      [
        "Proportions",
        "Keep the recipe's vegetable, vinegar and water amounts unchanged"
      ],
      [
        "Storage",
        "Refrigerate promptly and follow that recipe's storage limit; do not can this method"
      ]
    ]
  }
],
    tips: [
      { title: "Good to pickle", text: "Red onion, cucumber, carrot, radish and chilli." },
      { title: "Food safety", text: "Keep refrigerator pickles chilled; covering them with brine does not guarantee safety. Use a tested recipe, a clean heat-safe container and vinegar of the specified acidity. Discard moldy, slimy or unexpectedly fizzy pickles; do not taste them to check." },
    ],
    mistakes: [
      ["Soft and limp", "Pour the brine over the vegetables. Don't boil them in it."],
      ["Too sharp", "Choose a tested recipe with a milder flavor, or adjust sweetness only as that recipe permits. Do not dilute the vinegar or change the vegetable-to-brine proportions used for preservation."],
      ["Cloudy brine", "Pickling salt helps avoid cloudiness from additives, but unexpected cloudiness with slime, mold, gas or an off smell may mean spoilage. Discard suspect pickles; changing the salt will not make them safe."],
    ],
  },
  freeze: {
    summary: "A quick boil and an ice bath keep vegetables' colour and texture in the freezer.",
    steps: [
      ["Boil a big pot of water", "Have a bowl of iced water ready beside it."],
      ["Blanch briefly", "Use small batches and start timing when the water returns to a boil. Follow the table for the stated cut and a tested freezing guide for other sizes."],
      ["Plunge into ice water", "Cool promptly in plenty of ice water until completely cold, usually for about the blanching time. For sweetcorn, cool the cobs before cutting off the kernels."],
      ["Dry well", "Spread on a towel. Surface water turns into ice crystals."],
      ["Freeze flat, then bag", "Freeze on a lined tray, then bag them. Squeeze out the air, label and date."],
    ],
    tables: [{ caption: "Blanching times", head: ["Vegetable", "Boil"], rows: [
      ["Peas", "1½ min"],
      ["Carrots, sliced", "2 min"],
      ["Spinach", "2 min"],
      ["Green beans", "3 min"],
      ["Broccoli florets", "3 min"],
      ["Sweetcorn on the cob, before cutting off the kernels", "4 min"],
    ] }],
    tips: [{ title: "Tip", text: "For best quality, use most frozen vegetables within 8–12 months. Continuous storage at −18 °C keeps properly handled food frozen, but freezing does not make previously unsafe food safe." }],
    mistakes: [
      ["Frozen into one block", "Freeze spread out on a tray first."],
      ["Freezer burn", "Squeeze out as much air as you can."],
      ["Dull colour", "Blanching skipped or too long."],
    ],
  },
  brew: {
    summary: "Weigh the coffee and water, use water just off the boil, and match the grind to the brewer.",
    steps: [
      ["Weigh", "Start with 1 g of coffee per 15–17 g of brewing water: for example, 15 g coffee to 240 g water. The finished drink weighs less because the grounds retain water."],
      ["Heat the water", "For many filter coffees, 92–96 °C is a useful starting range. Use a thermometer or temperature-controlled kettle if accuracy matters; a fixed 30-second wait does not guarantee that range."],
      ["Grind just before brewing", "Use the grind size for your brewer in the table."],
      ["Bloom", "For pour-over, wet all the grounds with roughly two to three times their weight in water, then wait about 30–45 seconds before continuing. Count this water in the total; other brewers use different methods."],
      ["Finish the brew", "Pour-over: pour slowly in circles, done in 2½–3½ minutes. French press: steep 4 minutes, then press slowly."],
    ],
    tables: [{ caption: "Grind and time", head: ["Brewer", "Grind", "Time", "Ratio"], rows: [
      ["Pour-over", "Medium-fine", "2½–3½ min", "1:16"],
      ["French press", "Coarse", "4 min", "1:15"],
      ["Moka pot", "Fine-medium", "About 5 min", "Fill basket level"],
      ["Cold brew", "Coarse", "12–24 h in the fridge", "1:8, then dilute"],
    ] }],
    tips: [
      { title: "Adjusting", text: "Sour and thin: grind finer or brew longer. Bitter and harsh: grind coarser or brew shorter." },
      { title: "Safety", text: "Press a French press slowly to avoid spraying hot coffee. Fill a moka pot only to the maker's indicated water level below the safety valve, keep the valve clear and never heat it empty." },
    ],
    mistakes: [
      ["Weak and watery", "For a stronger drink, use a little more coffee for the same water, then adjust grind and brew time to avoid under-extraction."],
      ["Bitter", "Water too hot or grind too fine."],
      ["Grit in a French press cup", "Grind coarser and pour gently, leaving the last bit behind."],
    ],
  },
  espresso: {
    summary: "Fine coffee, a firm tamp and about 25–30 seconds, then silky milk at drinking temperature.",
    steps: [
      ["Warm up", "Let the machine and portafilter heat fully, as the manual says, then run a short flush through the group."],
      ["Dose and level", "Use the dose recommended for your basket; 16–18 g can be a starting point for a suitably sized double basket. Distribute the grounds evenly."],
      ["Tamp", "Press straight down, firm and even, so the surface is flat."],
      ["Pull the shot", "Lock in and start. Aim for about twice the dry weight in the cup, such as 18 g in, 36 g out, in 25–30 seconds."],
      ["Steam the milk", "Purge the wand. Hold the tip just under the surface for a few seconds to add air, then lower it to spin the milk. Stop at 55–65 °C."],
      ["Clean straight away", "Wipe and purge the wand, knock out the puck and flush the group."],
    ],
    tables: [
      { caption: "Dial in", head: ["Shot runs", "Tastes", "Fix"], rows: [["Under 20 s", "Sour, thin", "Grind finer"], ["25–30 s", "Balanced", "Keep it"], ["Over 35 s", "Bitter, harsh", "Grind coarser"]] },
      { caption: "Milk texture", head: ["Drink", "Milk"], rows: [["Flat white", "Thin, glossy microfoam"], ["Latte", "Thin foam, more milk"], ["Cappuccino", "Thicker, airy foam"]] },
    ],
    tips: [{ title: "Safety", text: "The steam wand and group head are scalding. Never remove the portafilter while water is flowing, and point the wand into the jug or drip tray before you open the steam." }],
    mistakes: [
      ["The shot gushes in 10 seconds", "Try a finer grind; only increase the dose if it remains within the basket's recommended capacity."],
      ["Large bubbles form while steaming milk", "The tip may be too close to the surface. Lower it slightly to create a whirlpool, following the machine's instructions."],
      ["Milk tastes flat or scalded", "Use a suitable thermometer and stop steaming around 55–65 °C, or as the milk and machine instructions direct. Do not rely on holding a painfully hot jug to judge the temperature."],
      ["Coffee tastes stale", "Use beans within about a month of the roast date."],
    ],
  },
  mix: {
    summary: "Measure everything, chill it with plenty of ice, then shake drinks with juice and stir drinks without.",
    steps: [
      ["Measure with a jigger", "Small differences change the balance, so measure every pour."],
      ["Fill with ice", "Fill the tin or mixing glass about two-thirds with fresh, solid ice."],
      ["Shake or stir", "Shake hard for 10–15 seconds if there's citrus, juice, cream or egg. Stir for 20–30 seconds if it's only spirits."],
      ["Strain", "Strain over fresh ice or into a chilled glass. A fine sieve catches ice shards."],
      ["Top up last", "Add soda, tonic or sparkling wine in the glass, after shaking."],
    ],
    tables: [
      { caption: "Sour formula", head: ["Part", "Amount"], rows: [["Base: spirit, alcohol-free spirit or strong cold tea", "50 ml"], ["Fresh citrus juice", "25 ml"], ["Sugar syrup (1:1)", "15–20 ml"]] },
      { caption: "Shake or stir", head: ["Contains", "Method"], rows: [["Citrus, juice, cream, egg", "Shake"], ["Only spirits, vermouth, bitters", "Stir"], ["Soda, tonic, sparkling wine", "Build in the glass"]] },
    ],
    tips: [
      { title: "Safety", text: "Never shake hot or carbonated liquids in a sealed shaker: pressure can force it open. Use a purpose-made shaker, preferably metal tins, and use pasteurized egg white if the drink calls for it." },
      { title: "Alcohol", text: "Alcohol-free spirits or strong cold tea can be starting points, but taste and adjust sweetness and acidity for the substitute. Follow local alcohol laws and offer water and alcohol-free options." },
    ],
    mistakes: [
      ["Too sour", "Add syrup 5 ml at a time and taste."],
      ["Watery", "Too little ice or excessive mixing can over-dilute the drink. Use plenty of solid ice and shake only until properly chilled."],
      ["The tins are stuck", "Tap the top tin where the seal meets. Don't bang it on the counter."],
    ],
  },
};
