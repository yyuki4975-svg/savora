// Source-bound public interface/editorial copy; no HTTP or model calls at runtime.
type Copy = Record<string, string>;
const normalize = (value: string) => value.replace(/\s+/g, " ").trim();
const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Presentation only: prose, source dictionaries and other locales stay intact.
export function formatWebsiteHeading(value: string, locale: string) {
  if (locale !== "zh" || !/[\u3400-\u9fff]/.test(value) || /\.{2,}[”’」』）)]*\s*$/.test(value)) return value;
  return value.replace(/[。.](?=[”’」』）)]*\s*$)/u, "");
}

export function createWebsiteCopy(copy: Copy) {
  const countTemplates = new Set([
    "{slotA} characters", "{slotA} countries · {slotB} cities · {slotC} recipes",
    "{slotA} featured dishes", "{slotA} ingredient lines · {slotB} unique tools",
    "{slotA} ingredients · {slotB} steps", "{slotA} ingredients ready", "{slotA} more recipes",
    "{slotA} new · {slotB} kept · {slotC} unavailable", "{slotA} of {slotB} items collected",
    "{slotA} of {slotB} practised", "{slotA} of 2 steps needed", "{slotA} of 40 characters needed",
    "{slotA} planned meals", "{slotA} private notes", "{slotA} published recipes", "{slotA} recipes",
    "{slotA} recipes · Page {slotB} of {slotC}", "{slotA} sources ready", "{slotA} steps",
    "{slotA}% essential ingredient match", "Missing {slotA} ingredients", "See all {slotA} in Explore",
    "Serves {slotA}", "Showing {slotA}–{slotB} of {slotC}", "Explore {slotA} recipes",
  ]);
  // {slotA} captures any text; {numA} captures only a number, so count templates such as
  // "{numA} recipes" never swallow ordinary phrases like "Explore recipes".
  const templates = Object.entries(copy).filter(([source]) => /\{(?:slot|num)[A-Z]\}/.test(source)
    // Too little literal context: this swallowed complete cooking/safety sentences.
    && !/^\{slot[A-Z]\} from /.test(source)).map(([source, target]) => {
    const tokens = [...source.matchAll(/\{(?:slot|num)[A-Z]\}/g)].map(match => match[0]);
    const expression = source.split(/\{(?:slot|num)[A-Z]\}/).map(escape)
      .reduce((pattern, part, index) => index === 0 ? part : `${pattern}${tokens[index - 1].startsWith("{num") || countTemplates.has(source) || source === "{slotA}: {slotB} recipes" && index === 2 ? "(\\d[\\d,.]*)" : ["{slotA} min", "{slotA} kitchens"].includes(source) ? "([~≈\\d][\\d.,¼½¾⅓⅔⅛⅜⅝⅞ –—~-]*)" : "(.+?)"}${part}`, "");
    return { pattern: new RegExp(`^${expression}$`), tokens, target };
  });
  return (value: string): string => {
    const key = normalize(value);
    if (Object.hasOwn(copy, key)) return copy[key];
    const counted = /^(.*?)\s+(\([\d,]+\))$/.exec(key);
    if (counted && Object.hasOwn(copy, counted[1])) return `${copy[counted[1]]} ${counted[2]}`;
    for (const { pattern, tokens, target } of templates) {
      const match = pattern.exec(key);
      if (!match) continue;
      let output = target;
      // Captured names/counts remain data. Never recursively interpret templates.
      tokens.forEach((token, index) => { output = output.replaceAll(token, copy[normalize(match[index + 1])] ?? match[index + 1]); });
      return output;
    }
    return value;
  };
}

const loadedCopies = new Map<string, (value: string) => string>();
const pendingCopies = new Map<string, Promise<(value: string) => string>>();
export async function getWebsiteCopy(locale: string) {
  if (locale === "en") return (value: string) => value;
  const loaded = loadedCopies.get(locale);
  if (loaded) return loaded;
  const pending = pendingCopies.get(locale);
  if (pending) return pending;
  // Lazy chunk: the frozen Home does not pay for the exhibition language bundle.
  const loaders = {
    zh: () => import("./locales/website/zh.json"), ja: () => import("./locales/website/ja.json"),
    fr: () => import("./locales/website/fr.json"), it: () => import("./locales/website/it.json"), es: () => import("./locales/website/es.json"),
  };
  const interfaceLoaders = {
    zh: () => import("./locales/interface/zh.json"), ja: () => import("./locales/interface/ja.json"),
    fr: () => import("./locales/interface/fr.json"), it: () => import("./locales/interface/it.json"), es: () => import("./locales/interface/es.json"),
  };
  const load = Object.hasOwn(loaders, locale) ? loaders[locale as keyof typeof loaders] : undefined;
  if (!load) return (value: string) => value;
  const work = (async () => {
    // Independent chunks start together. One preparation per locale is shared by all hooks.
    const [imageCopy, greenCopy, redesignModule, interfaceModule, websiteModule] = await Promise.all([
      import("./exhibition-image-copy"), import("./green-ingredient-copy"), import("./redesign-copy"),
      interfaceLoaders[locale as keyof typeof interfaceLoaders](), load(),
    ]);
    const additions = imageCopy.exhibitionImageCopy;
    const ingredients = greenCopy.greenIngredientCopy[locale];
    const redesign = redesignModule.redesignCopy[locale];
    const interfaceCopy = interfaceModule.default as Copy;
    // Preserve exact dictionary precedence and template ordering from the accepted version.
    const copy = createWebsiteCopy({ ...interfaceCopy, ...redesign, ...websiteModule.default as Copy,
      ...additions[locale as keyof typeof additions], ...ingredients, ...redesign, ...interfaceCopy });
    loadedCopies.set(locale, copy);
    return copy;
  })().finally(() => { pendingCopies.delete(locale); });
  pendingCopies.set(locale, work);
  return work;
}

export function isWebsiteCopyPage(pathname: string) {
  return /^\/(?:explore|world-map|community|share|trust|videos|library)\/?$/.test(pathname)
    || /^\/stories\/(?:regions\/[^/]+|autumn-table|paella-valenciana)\/?$/.test(pathname);
}
