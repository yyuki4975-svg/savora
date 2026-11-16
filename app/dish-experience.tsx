"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { curatedRecipeDetails } from "./curated-recipe-details";
import { cultureProfileFor } from "./culture-story-profiles";
import { cultureImagePoolFor } from "./culture-image-pools";
import type { CultureMedia } from "./culture-image-pools";
import { RecipeKitchenActions } from "./recipe-kitchen-actions";
import { CookKitchenControls } from "./cook-kitchen-controls";
import type { CatalogDish } from "./product-data";
import { catalogDishes } from "./product-data";
import { dishes, videos } from "./data";
import { useWebsiteCopy } from "./use-website-copy";
import { formatRecipeMinutes, recipeTime } from "./recipe-presentation";
import styles from "./dish-guide.module.css";
import { responsiveFillSourceSet } from "../lib/images/responsive-fill.mjs";
import { localImage } from "../lib/media/local-media";

type RecipeData = {
  baseServings: number;
  ingredients: [number | null, string, string][];
  steps: { title: string; text: string; minutes: number; ingredients: string[] }[];
  equipment: string[];
  chefTip: string;
  storage: string;
  methodSource: { label: string; url: string };
  cultureMedia?: { src: string; alt: string; credit: string; source: string };
};

export type CanonicalRecipe = {
  locale: string;
  title: string;
  summary: string;
  culturalNote: string | null;
  version: number;
  servings: number;
  preparationMinutes?: number | string | null;
  cookingMinutes?: number | string | null;
  ingredients: { name: string; quantity: number | null; unit: string | null; rawUnit?: string | null; englishName?: string; preparationNote: string | null }[];
  steps: { title: string | null; instruction: string; englishInstruction?: string; durationMinutes: number | null }[];
  sources: { sourceUrl: string; sourceName: string }[];
};

const recipeTemplates: Record<string, RecipeData> = {
  ramen: {
    baseServings: curatedRecipeDetails.ramen.baseServings,
    ingredients: [[800, "ml", "chicken or vegetable stock"], [4, "tbsp", "Japanese soy sauce"], [2, "tbsp", "mirin"], [1, "tsp", "toasted sesame oil"], [2, "", "garlic cloves"], [20, "g", "fresh ginger"], [320, "g", "fresh ramen noodles"], [200, "g", "chashu pork or roasted mushrooms"], [2, "", "soft-boiled eggs"], [2, "sheets", "nori"]],
    steps: [
      { title: "Build the aromatic broth", text: "Simmer stock, ginger, and garlic gently, then strain. Keep the heat low so the broth remains clear.", minutes: 25, ingredients: ["stock", "ginger", "garlic"] },
      { title: "Make the shoyu tare", text: "Warm soy sauce, mirin, and sesame oil without boiling. Divide between serving bowls.", minutes: 4, ingredients: ["soy sauce", "mirin", "sesame oil"] },
      { title: "Prepare the toppings", text: "Warm chashu or mushrooms, halve the eggs, slice scallions, and cut the nori.", minutes: 10, ingredients: ["chashu or mushrooms", "eggs", "nori"] },
      { title: "Cook the noodles last", text: "Boil noodles until springy, agitate early, drain well, and do not rinse.", minutes: 3, ingredients: ["ramen noodles"] },
      { title: "Assemble without delay", text: "Ladle broth over tare, add noodles, arrange toppings lightly, and serve immediately.", minutes: 3, ingredients: ["all prepared components"] },
    ],
    equipment: curatedRecipeDetails.ramen.equipment,
    chefTip: curatedRecipeDetails.ramen.chefTip,
    storage: curatedRecipeDetails.ramen.storage,
    methodSource: curatedRecipeDetails.ramen.methodSource,
    cultureMedia: curatedRecipeDetails.ramen.cultureMedia,
  },
};

type RecipeStep = {
  title: string;
  text: string;
  minutes: number;
  ingredients: string[];
};

const specificSteps: Record<string, RecipeStep[]> = {
  carbonara: [
    { title: "Render the guanciale", text: "Bring well-salted water to a boil. Cook the guanciale in a cool pan over medium-low heat until the fat renders and the edges turn crisp; keep the fat in the pan.", minutes: 10, ingredients: ["guanciale", "pasta"] },
    { title: "Mix the egg base", text: "Whisk the eggs, finely grated pecorino, and plenty of black pepper into a thick paste. Loosen it with a spoonful of warm pasta water.", minutes: 4, ingredients: ["egg", "pecorino", "black pepper"] },
    { title: "Bring pasta and fat together", text: "Cook the pasta until just al dente, reserve the cooking water, then transfer the pasta to the guanciale pan and toss to coat.", minutes: 10, ingredients: ["pasta", "guanciale"] },
    { title: "Emulsify off the heat", text: "Take the pan off the heat, add the egg mixture, and toss continuously. Add reserved pasta water a little at a time until the sauce is glossy and clings to every strand; serve at once.", minutes: 4, ingredients: ["egg mixture", "pasta water"] },
  ],
  "butter-chicken": [
    { title: "Marinate the chicken", text: "Coat the chicken with yogurt, garam masala, ginger, garlic, and salt. Refrigerate for at least 30 minutes so the seasoning reaches the surface evenly.", minutes: 30, ingredients: ["chicken", "yogurt", "garam masala"] },
    { title: "Char before simmering", text: "Broil or sear the chicken over high heat until browned at the edges. It can remain slightly underdone because it will finish in the sauce.", minutes: 10, ingredients: ["marinated chicken"] },
    { title: "Cook the tomato sauce", text: "Cook tomato, butter, and the ground spices until the raw tomato aroma disappears and the fat begins to separate. Blend or strain for a smoother restaurant-style sauce.", minutes: 18, ingredients: ["tomato", "butter", "spices"] },
    { title: "Finish gently", text: "Add the charred chicken and simmer until the thickest piece reaches 74°C / 165°F. Lower the heat, stir in cream and crushed kasuri methi, then adjust salt before serving.", minutes: 12, ingredients: ["chicken", "cream", "kasuri methi"] },
  ],
  "tacos-al-pastor": [
    { title: "Make the adobo", text: "Blend achiote, softened chiles, citrus juice, garlic, and salt into a smooth paste, then coat the thinly sliced pork and marinate until deeply seasoned.", minutes: 20, ingredients: ["pork", "achiote", "chile"] },
    { title: "Brown the pork", text: "Sear or roast the pork in uncrowded batches until caramelized and at least 63°C / 145°F at the center. Rest it for 3 minutes, then chop it into small pieces.", minutes: 14, ingredients: ["marinated pork"] },
    { title: "Warm the tortillas", text: "Heat the tortillas on a dry comal or skillet until pliable and lightly spotted. Char the pineapple and onion in the same pan.", minutes: 6, ingredients: ["tortilla", "pineapple", "onion"] },
    { title: "Assemble to order", text: "Fill each warm tortilla with pork, pineapple, onion, and cilantro. Serve immediately with salsa and lime so the tortillas stay supple.", minutes: 5, ingredients: ["pork", "tortilla", "pineapple"] },
  ],
  ratatouille: [
    { title: "Prepare the vegetables", text: "Cut the eggplant, zucchini, peppers, and tomatoes into even pieces. Salt the eggplant for 20 minutes, then pat it completely dry.", minutes: 25, ingredients: ["eggplant", "zucchini", "pepper"] },
    { title: "Brown in separate batches", text: "Sauté the eggplant, zucchini, and peppers separately in olive oil so each vegetable browns instead of steaming. Transfer each batch to a bowl.", minutes: 20, ingredients: ["eggplant", "zucchini", "pepper", "olive oil"] },
    { title: "Build the tomato base", text: "Soften onion and garlic, add the tomatoes, and cook until the juices reduce to a loose, jammy sauce.", minutes: 12, ingredients: ["tomato", "onion", "garlic"] },
    { title: "Fold and finish", text: "Fold the browned vegetables into the tomato base and simmer gently until tender but distinct. Finish with basil and a final drizzle of olive oil.", minutes: 12, ingredients: ["browned vegetables", "basil"] },
  ],
  "mapo-tofu": [
    { title: "Set the tofu", text: "Slide the tofu cubes into lightly salted simmering water for 2 minutes, then drain gently. This warms and firms them before they enter the sauce.", minutes: 5, ingredients: ["tofu"] },
    { title: "Fry the aromatic base", text: "Brown the pork until the fat renders, then fry the doubanjiang and fermented black beans until the oil turns red and fragrant.", minutes: 8, ingredients: ["ground pork", "doubanjiang", "fermented black beans"] },
    { title: "Braise without breaking", text: "Add stock and tofu, then simmer gently. Move the pan rather than stirring vigorously so the cubes remain intact.", minutes: 10, ingredients: ["tofu", "stock"] },
    { title: "Thicken in stages", text: "Add the starch slurry in two or three additions, waiting for the sauce to bubble between each. Finish with ground Sichuan pepper, chile oil, and scallion.", minutes: 5, ingredients: ["starch slurry", "Sichuan pepper", "scallion"] },
  ],
  kebab: [
    { title: "Season and knead the lamb", text: "Keep the lamb and fat cold, then mince and knead them with salt and pepper until the mixture becomes tacky enough to hold a skewer.", minutes: 12, ingredients: ["lamb", "pepper"] },
    { title: "Shape on flat skewers", text: "Press an even layer of meat along each flat skewer with damp hands. Chill the shaped kebabs for 15 minutes before grilling.", minutes: 18, ingredients: ["seasoned lamb"] },
    { title: "Grill over high heat", text: "Cook over hot charcoal, rotating often, until the surface is deeply browned and the ground lamb reaches 71°C / 160°F at the center.", minutes: 10, ingredients: ["lamb skewers"] },
    { title: "Rest over flatbread", text: "Lay the kebabs on flatbread for a short rest, then serve with sumac onion, parsley, and grilled peppers.", minutes: 5, ingredients: ["flatbread", "sumac", "parsley"] },
  ],
  tagine: [
    { title: "Brown the lamb", text: "Season the lamb and brown it in batches so the pot develops a dark fond without crowding or steaming the meat.", minutes: 18, ingredients: ["lamb"] },
    { title: "Start the braise", text: "Soften the onion with the spices, return the lamb, and add enough water to come partway up the meat. Cover and cook at a very gentle simmer.", minutes: 80, ingredients: ["onion", "spices", "lamb"] },
    { title: "Add the bright ingredients", text: "When the lamb is nearly tender, add the olives and rinsed preserved lemon so their salt and aroma remain distinct.", minutes: 20, ingredients: ["olive", "preserved lemon"] },
    { title: "Reduce the sauce", text: "Uncover and simmer until the sauce lightly coats the lamb. Skim excess fat, taste for salt, and serve directly from the warm pot.", minutes: 15, ingredients: ["braising sauce"] },
  ],
  feijoada: [
    { title: "Start the beans", text: "Soak the black beans if time allows, then cover with fresh water and simmer until they begin to soften.", minutes: 55, ingredients: ["black beans"] },
    { title: "Brown and stagger the meats", text: "Brown the pork in batches. Add tougher cuts to the beans first and quicker-cooking sausages later so nothing dries out.", minutes: 35, ingredients: ["pork"] },
    { title: "Build a creamy broth", text: "Fry onion, garlic, and bay, stir them into the pot, and simmer until the beans are tender. Mash a small spoonful of beans back into the broth to thicken it.", minutes: 45, ingredients: ["onion", "garlic", "bay"] },
    { title: "Rest before serving", text: "Let the pot stand for 20 minutes, then adjust salt and remove excess fat. Serve with rice, collards, and fresh orange.", minutes: 20, ingredients: ["rice", "collards", "orange"] },
  ],
  "green-curry": [
    { title: "Fry the curry paste", text: "Pound or blend the curry paste, then fry it in the thick coconut cream until intensely fragrant and small beads of oil appear.", minutes: 10, ingredients: ["green chile", "coconut cream", "curry paste"] },
    { title: "Simmer the main ingredients", text: "Add the remaining coconut milk, protein, and firm eggplant. Keep the curry at a gentle simmer so the coconut milk does not split harshly.", minutes: 16, ingredients: ["coconut milk", "eggplant"] },
    { title: "Balance the seasoning", text: "Season with fish sauce and palm sugar, tasting for a savory, aromatic balance rather than pronounced sweetness. Add tender vegetables near the end.", minutes: 6, ingredients: ["fish sauce", "palm sugar"] },
    { title: "Finish off the heat", text: "Turn off the heat and fold in Thai basil, sliced chile, and torn makrut lime leaves. Serve while the herbs are still vivid.", minutes: 3, ingredients: ["Thai basil", "chile", "makrut lime leaves"] },
  ],
  bibimbap: [
    { title: "Cook the rice", text: "Cook the rice slightly firm so it keeps its structure beneath the toppings, then keep it covered and warm.", minutes: 25, ingredients: ["rice"] },
    { title: "Season each vegetable", text: "Blanch or sauté each vegetable separately and season it lightly. Keep the colors and textures distinct instead of mixing them in the pan.", minutes: 18, ingredients: ["vegetables"] },
    { title: "Cook the protein and egg", text: "Sear the marinated beef or tofu in a hot pan, then fry the egg so the yolk remains soft enough to enrich the rice.", minutes: 8, ingredients: ["beef", "egg"] },
    { title: "Arrange, then mix", text: "Place the vegetables, protein, and egg in separate sections over the rice. Add gochujang and sesame oil, then mix thoroughly at the table.", minutes: 4, ingredients: ["gochujang", "sesame oil"] },
  ],
  pho: [
    { title: "Char and toast", text: "Char the onion and ginger until blackened at the edges, and toast the whole spices just until fragrant.", minutes: 12, ingredients: ["onion", "ginger", "star anise"] },
    { title: "Make a clear broth", text: "Blanch the bones, rinse them, and start again with fresh water. Simmer gently, skim often, and add the charred aromatics and toasted spices.", minutes: 130, ingredients: ["beef bones", "aromatics", "spices"] },
    { title: "Season and strain", text: "Season the broth with fish sauce, salt, and a little sugar, then strain it. It should taste slightly assertive before it meets the noodles.", minutes: 15, ingredients: ["fish sauce", "broth"] },
    { title: "Assemble each bowl", text: "Cook the rice noodles separately, top with thinly sliced beef, and pour over boiling broth. Add herbs and sliced onion immediately before serving.", minutes: 8, ingredients: ["rice noodles", "beef", "herbs"] },
  ],
  paella: [
    { title: "Brown the meat and beans", text: "Brown the rabbit and chicken well in olive oil, then add the green beans and cook until their surfaces begin to blister.", minutes: 20, ingredients: ["rabbit", "chicken", "green beans"] },
    { title: "Build the cooking liquid", text: "Cook down grated tomato, briefly fry the paprika, then add water, saffron, and salt. Simmer so the meat flavors the liquid.", minutes: 25, ingredients: ["tomato", "paprika", "saffron"] },
    { title: "Add the rice once", text: "Distribute the rice evenly across the pan and do not stir after the liquid returns to a boil. Keep the pan level so it cooks uniformly.", minutes: 17, ingredients: ["rice", "cooking liquid"] },
    { title: "Form the socarrat", text: "When the rice is tender and the chicken reaches 74°C / 165°F, raise the heat briefly to toast the bottom layer. Listen for a dry crackle, remove from the heat, and rest for 5 minutes.", minutes: 8, ingredients: ["paella"] },
  ],
  moussaka: [
    { title: "Roast the eggplant", text: "Salt the eggplant, pat it dry, brush with oil, and roast until tender and browned rather than frying it until greasy.", minutes: 30, ingredients: ["eggplant"] },
    { title: "Reduce the meat sauce", text: "Brown the lamb, add onion, tomato, and cinnamon, and simmer until the sauce is thick enough to hold a clean layer.", minutes: 30, ingredients: ["lamb", "tomato", "cinnamon"] },
    { title: "Finish the béchamel", text: "Cook a smooth béchamel, let it cool slightly, then whisk in the egg and cheese so the topping bakes into a light crust.", minutes: 12, ingredients: ["béchamel", "egg", "cheese"] },
    { title: "Layer, bake, and rest", text: "Layer eggplant, meat sauce, and béchamel in a snug dish. Bake until deeply golden, then rest for 30 minutes before cutting.", minutes: 60, ingredients: ["eggplant", "meat sauce", "béchamel"] },
  ],
  rendang: [
    { title: "Fry the spice paste", text: "Blend the chile, shallot, garlic, ginger, and galangal, then fry the paste until the raw aroma disappears.", minutes: 18, ingredients: ["chile", "shallot", "galangal"] },
    { title: "Begin the reduction", text: "Add the beef, coconut milk, lemongrass, and aromatic leaves. Simmer uncovered so moisture can escape steadily.", minutes: 90, ingredients: ["beef", "coconut milk", "lemongrass"] },
    { title: "Stir as the oil separates", text: "As the sauce thickens, lower the heat and stir more frequently, scraping the base so the coconut solids toast without burning.", minutes: 70, ingredients: ["reducing sauce"] },
    { title: "Cook until dark and dry", text: "Continue over low heat until the sauce is dark, the oil has separated, and the spices cling to the tender beef. Rest before serving so the flavor settles.", minutes: 25, ingredients: ["beef rendang"] },
  ],
};

type CultureStoryCard = {
  eyebrow: string;
  title: string;
  paragraphs: string[];
  media: CultureMedia;
  theme: "rice" | "clay" | "olive" | "saffron" | "plum" | "ink";
  layout: "split" | "reverse" | "inset" | "portrait" | "panorama" | "soft-edge";
  motion: "wipe" | "lift" | "zoom" | "turn" | "drift" | "dissolve";
};

const cultureVisuals: Pick<CultureStoryCard, "theme" | "layout" | "motion">[] = [
  { theme: "rice", layout: "split", motion: "wipe" },
  { theme: "clay", layout: "reverse", motion: "lift" },
  { theme: "olive", layout: "inset", motion: "zoom" },
  { theme: "saffron", layout: "portrait", motion: "turn" },
  { theme: "plum", layout: "panorama", motion: "drift" },
  { theme: "ink", layout: "soft-edge", motion: "dissolve" },
];

const cultureBridges = [
  (dish: CatalogDish) => `The landscape around ${dish.city} is not scenery added after the fact; it helps explain why this food took this form.`,
  (dish: CatalogDish) => `In the kitchen, ${dish.ingredients[0]} carries both flavor and the memory of how people around ${dish.city} have sourced, handled, and valued it.`,
  (dish: CatalogDish) => `This detail separates ${dish.name} from a generic national label and keeps its regional vocabulary visible.`,
  (dish: CatalogDish) => `${dish.technique} turns the vessel and the heat source into ingredients of their own, not merely equipment around the recipe.`,
  (dish: CatalogDish) => `The finished dish is only one moment; shopping, preparation, gathering, and serving are also part of its cultural record.`,
  (dish: CatalogDish) => `A home adaptation can change scale and equipment while still naming what comes from ${dish.city} and what has been changed.`,
];

function CultureWeeklyCarousel({ dish, recipe, culturalNote }: { dish: CatalogDish; recipe: RecipeData; culturalNote: string }) {
  const copy = useWebsiteCopy();
  const cards = useMemo<CultureStoryCard[]>(() => {
    const recipePhoto: CultureMedia = { src: dish.image, alt: `${dish.name} from ${dish.city}`, credit: `${dish.name} recipe image`, source: dish.image };
    const candidates = [...cultureImagePoolFor(dish.slug), ...(recipe.cultureMedia ? [recipe.cultureMedia] : []), recipePhoto];
    const seen = new Set<string>();
    const media = candidates.filter((item) => {
      if (seen.has(item.src)) return false;
      seen.add(item.src);
      return true;
    });
    const mediaFor = (index: number) => media[index] ?? recipePhoto;
    const profile = cultureProfileFor(dish.slug);
    const fallbackProfile = [
      { eyebrow: `${dish.city} · ${dish.country}`, title: `${dish.city} gives the dish its first vocabulary.`, fact: culturalNote },
      { eyebrow: dish.ingredients[0], title: "An ingredient begins in a working landscape.", fact: `${dish.ingredients.slice(0, 3).join(", ")} connect the recipe to agriculture, trade, and the choices of local cooks.` },
      { eyebrow: dish.technique, title: "The method carries regional knowledge.", fact: `${dish.technique} is understood through heat, sound, aroma, and repeated practice—not only through written timings.` },
      { eyebrow: `${dish.city} kitchens`, title: "The vessel changes the result.", fact: "Cookware, fuel, and scale help explain the texture expected from the finished dish." },
      { eyebrow: "At the table", title: "Serving is part of the recipe.", fact: "The company, occasion, and accompanying dishes shape how the food is understood." },
      { eyebrow: "Adapt with context", title: "Name what changed and what remained.", fact: "A respectful home version can adjust access and equipment while keeping the route back to place visible." },
    ];
    return (profile.length === 6 ? profile : fallbackProfile).map((story, index) => ({
      ...story,
      title: copy(story.title, { heading: true }),
      eyebrow: copy(story.eyebrow),
      paragraphs: [copy(story.fact), copy(cultureBridges[index](dish))],
      media: { ...mediaFor(index), src: localImage(mediaFor(index).src), alt: copy(mediaFor(index).alt) },
      ...cultureVisuals[index],
    }));
  }, [culturalNote, dish, recipe.cultureMedia, copy]);
  const [cardIndex, setCardIndex] = useState(0);
  const [paragraphIndex, setParagraphIndex] = useState(0);
  const [previous, setPrevious] = useState<{ card: CultureStoryCard; paragraph: number; index: number } | null>(null);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [manualPaused, setManualPaused] = useState(false);
  const [interactionPaused, setInteractionPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [onscreen, setOnscreen] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const sectionRef = useRef<HTMLElement | null>(null);
  const transitionTimer = useRef<number | null>(null);
  const transitionRequest = useRef(0);
  const imagePromises = useRef(new Map<string, Promise<void>>());
  const card = cards[cardIndex];
  const paused = manualPaused || interactionPaused || reducedMotion || !onscreen || !pageVisible;

  const preloadImage = useCallback((src: string) => {
    const existing = imagePromises.current.get(src);
    if (existing) return existing;
    const promise = new Promise<void>((resolve) => {
      const image = new Image();
      image.decoding = "async";
      image.fetchPriority = "low";
      // A failed remote photograph must not leave carousel controls waiting forever.
      const deadline = window.setTimeout(resolve, 8000);
      image.onload = () => {
        window.clearTimeout(deadline);
        if (typeof image.decode === "function") image.decode().catch(() => undefined).finally(resolve);
        else resolve();
      };
      image.onerror = () => { window.clearTimeout(deadline); resolve(); };
      image.src = src;
      if (image.complete) { window.clearTimeout(deadline); resolve(); }
    });
    imagePromises.current.set(src, promise);
    return promise;
  }, []);

  const moveToCard = useCallback((next: number, nextDirection: 1 | -1) => {
    const normalized = (next + cards.length) % cards.length;
    if (normalized === cardIndex) return;
    const request = ++transitionRequest.current;
    void preloadImage(cards[normalized].media.src).then(() => {
      if (request !== transitionRequest.current) return;
      setDirection(nextDirection);
      setPrevious({ card, paragraph: paragraphIndex, index: cardIndex });
      setCardIndex(normalized);
      setParagraphIndex(0);
      window.clearTimeout(transitionTimer.current ?? undefined);
      transitionTimer.current = window.setTimeout(() => setPrevious(null), 760);
    });
  }, [card, cardIndex, cards, paragraphIndex, preloadImage]);

  useEffect(() => {
    // Only warm the next card while this below-fold section is actually visible.
    // https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API
    if (!onscreen || !pageVisible) return;
    void preloadImage(cards[(cardIndex + 1) % cards.length].media.src);
  }, [cards, cardIndex, onscreen, pageVisible, preloadImage]);
  useEffect(() => () => {
    transitionRequest.current += 1;
    window.clearTimeout(transitionTimer.current ?? undefined);
  }, []);
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const observer = new IntersectionObserver(([entry]) => setOnscreen(entry.isIntersecting), { threshold: 0.16 });
    observer.observe(section);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const update = () => setPageVisible(document.visibilityState === "visible");
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  useEffect(() => {
    if (paused || previous) return;
    const timer = window.setTimeout(() => {
      if (paragraphIndex < card.paragraphs.length - 1) setParagraphIndex((value) => value + 1);
      else moveToCard(cardIndex + 1, 1);
    }, 5200);
    return () => window.clearTimeout(timer);
  }, [card.paragraphs.length, cardIndex, moveToCard, paragraphIndex, paused, previous]);

  const cardClass = (story: CultureStoryCard) => `theme-${story.theme} layout-${story.layout} motion-${story.motion}`;

  // Keep translated paragraphs centered without clipping them inside a fixed frame.
  // https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver
  useEffect(() => {
    const section = sectionRef.current;
    const text = section?.querySelector<HTMLElement>(".culture-weekly-card:not(.culture-weekly-card-out) .culture-weekly-copy");
    if (!section || !text) return;
    let frame = 0;
    const measure = () => {
      const style = getComputedStyle(text);
      const children = Array.from(text.children) as HTMLElement[];
      const height = children.reduce((total, child) => {
        const computed = getComputedStyle(child);
        return total + child.scrollHeight + parseFloat(computed.marginTop) + parseFloat(computed.marginBottom);
      }, parseFloat(style.paddingTop) + parseFloat(style.paddingBottom) + 12);
      const value = `${Math.ceil(height)}px`;
      if (section.style.getPropertyValue("--culture-copy-height") !== value) section.style.setProperty("--culture-copy-height", value);
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); };
    const observer = new ResizeObserver(schedule);
    Array.from(text.children).forEach(child => observer.observe(child));
    schedule();
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [cardIndex, paragraphIndex, copy]);

  return <section data-website-copy data-website-localized ref={sectionRef} className={`culture-weekly culture-weekly-theme-${card.theme}`} id="culture" aria-labelledby="culture-title" tabIndex={0} onFocusCapture={() => setInteractionPaused(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setInteractionPaused(false); }} onKeyDown={(event) => { if (event.key === "ArrowLeft") moveToCard(cardIndex - 1, -1); if (event.key === "ArrowRight") moveToCard(cardIndex + 1, 1); }}>
    <header className="culture-weekly-heading"><span className="kicker light"><i /> {copy("Culture & context")}</span><h2 id="culture-title">{copy(`A visual story from ${dish.city}`)}</h2><button type="button" aria-pressed={manualPaused} onClick={() => setManualPaused((value) => !value)}>{copy(manualPaused ? "Play story" : "Pause story")}</button></header>
    <div className="culture-weekly-stage" onMouseEnter={() => setInteractionPaused(true)} onMouseLeave={() => setInteractionPaused(false)}>
      <button className="culture-weekly-arrow culture-weekly-arrow-prev" type="button" aria-label={copy("Previous culture card")} onClick={() => moveToCard(cardIndex - 1, -1)}><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M15 5 8 12l7 7" /></svg></button>
      {previous ? <article className={`culture-weekly-card ${cardClass(previous.card)} culture-weekly-card-out culture-weekly-card-out-${direction > 0 ? "left" : "right"}`} aria-hidden="true"><CultureStoryBody card={previous.card} paragraphIndex={previous.paragraph} /></article> : null}
      <article className={`culture-weekly-card ${cardClass(card)} ${previous ? `culture-weekly-card-in-${direction > 0 ? "right" : "left"}` : ""}`} aria-live="polite"><CultureStoryBody card={card} paragraphIndex={paragraphIndex} /></article>
      <button className="culture-weekly-arrow culture-weekly-arrow-next" type="button" aria-label={copy("Next culture card")} onClick={() => moveToCard(cardIndex + 1, 1)}><svg aria-hidden="true" viewBox="0 0 24 24"><path d="m9 5 7 7-7 7" /></svg></button>
    </div>
    <div className="culture-weekly-progress" role="tablist" aria-label={copy("Culture story cards")}>{cards.map((item, index) => <button type="button" role="tab" aria-selected={index === cardIndex} aria-label={`${index + 1}. ${item.eyebrow}`} key={item.title} onClick={() => moveToCard(index, index >= cardIndex ? 1 : -1)}><i style={{ "--story-progress": index === cardIndex ? (paragraphIndex + 1) / item.paragraphs.length : index < cardIndex ? 1 : 0 } as CSSProperties} /></button>)}</div>
    <span className="culture-variation-anchor" id="variations" aria-hidden="true" />
  </section>;
}

function CultureStoryBody({ card, paragraphIndex }: { card: CultureStoryCard; paragraphIndex: number }) {
  const copy = useWebsiteCopy();
  return <><div className="culture-weekly-copy"><p className="culture-weekly-eyebrow">{card.eyebrow}</p><h3>{card.title}</h3><div className="culture-weekly-paragraph" key={paragraphIndex}><p>{card.paragraphs[paragraphIndex]}</p></div></div><figure><img src={card.media.src} alt={card.media.alt} loading="lazy" decoding="async" fetchPriority="low" /><a className="sr-only" href={card.media.source} target="_blank" rel="noreferrer noopener">{copy("Image source:")} {card.media.credit}</a></figure></>;
}

function genericRecipe(dish: CatalogDish) {
  const detail = curatedRecipeDetails[dish.slug];
  return {
    baseServings: detail?.baseServings ?? 2,
    ingredients: detail?.ingredients ?? dish.ingredients.map((ingredient, index) => [index === 0 ? 500 : index === 1 ? 2 : 1, index === 0 ? "g" : index === 1 ? "tbsp" : "portion", ingredient] as [number, string, string]),
    steps: specificSteps[dish.slug] ?? [],
    equipment: detail?.equipment ?? ["Chef’s knife", "Cutting board", "Heavy pan or pot", "Measuring spoons"],
    chefTip: detail?.chefTip ?? `The defining technique is ${dish.technique.toLowerCase()}; do not rush the stage where aroma and texture develop.`,
    storage: detail?.storage ?? "Cool promptly, refrigerate in a sealed container, and reheat until steaming. Texture is best on the day of cooking.",
    methodSource: detail?.methodSource ?? { label: "Savora editorial method review", url: "https://www.foodsafety.gov/food-safety-charts/safe-minimum-internal-temperatures" },
    cultureMedia: detail?.cultureMedia,
  };
}

function culinaryFraction(value: number) {
  const whole = Math.floor(value + 1e-8);
  const fraction = value - whole;
  const candidates: [number, string][] = [[0.125, "⅛"], [0.25, "¼"], [1 / 3, "⅓"], [0.375, "⅜"], [0.5, "½"], [0.625, "⅝"], [2 / 3, "⅔"], [0.75, "¾"], [0.875, "⅞"]];
  const match = candidates.find(([candidate]) => Math.abs(fraction - candidate) < 0.035);
  if (!match) return Number(value.toFixed(1)).toString();
  return `${whole || ""}${whole ? " " : ""}${match[1]}`;
}

type Units = "Metric" | "Imperial";
const zhUnits: Record<string, string> = { c: "杯", cup: "杯", cups: "杯", t: "茶匙", tsp: "茶匙", tbsp: "汤匙", ml: "毫升", l: "升", g: "克", kg: "千克", oz: "盎司", lb: "磅" };

function amountText(amount: number | null, unit: string, rawUnit: string, scale: number, units: Units, locale?: string) {
  if (amount === null) return unit;
  const scaled = amount * scale;
  if (units === "Imperial" && rawUnit === "g") return `${culinaryFraction(scaled / 28.35)} oz`;
  if (units === "Imperial" && rawUnit === "ml") return `${culinaryFraction(scaled / 236.6)} cups`;
  if (locale === "zh") return `${Number(scaled.toFixed(2))}${zhUnits[unit.trim().toLowerCase()] ?? unit}`;
  return `${culinaryFraction(scaled)} ${unit}`.trim();
}

// Which ingredient lines a step uses, read from the English text so it works in every locale.
const genericWords = new Set(["fresh", "ground", "sliced", "thinly", "large", "small", "medium", "whole", "into", "pieces", "piece", "leaves", "finely", "grated", "chopped", "optional", "serve", "serving", "taste", "plus", "more", "each", "sheets", "cloves", "clove", "cooked", "dried", "prepared", "full-fat", "plain", "boneless", "lengthwise", "even", "toasted", "japanese", "white", "yellow", "green", "red", "fine", "and", "for", "the", "with", "cut", "peeled", "cored", "trimmed", "halved", "diced", "minced", "bruised", "drained", "rinsed", "soaked", "thick", "thin", "mixed", "allows", "time", "if", "bunch", "stalks", "short", "strips", "bone-in", "long", "flat", "wedges", "soft-boiled", "unsalted", "heavy", "seeds", "removed", "alternative", "vegan"]);
function ingredientKeys(name: string) {
  const words = name.toLowerCase().split(",")[0].split(/[^a-zà-ž-]+/u).filter((word) => word.length >= 3 && !genericWords.has(word));
  // "stock or water" is a stock line: plain water only counts when the line is water itself.
  return words.length > 1 ? words.filter((word) => word !== "water") : words;
}
function stepIngredientIndexes(stepText: string, names: string[]) {
  const text = stepText.toLowerCase();
  const mentions = (key: string) => {
    const stem = key.replace(/(?:es|s)$/u, "");
    return new RegExp(`(?:^|[^a-zà-ž])${stem.replace(/[-]/g, "\\-")}(?:e?s|ed|ing)?(?=$|[^a-zà-ž])`, "u").test(text);
  };
  return names.flatMap((name, index) => ingredientKeys(name).some(mentions) ? [index] : []);
}

type ResolvedRecipe = RecipeData & { rawUnits: string[]; matchNames: string[]; matchSteps: string[] };
function resolveRecipe(dish: CatalogDish, canonical?: CanonicalRecipe): ResolvedRecipe {
  const fallback = recipeTemplates[dish.slug] ?? genericRecipe(dish);
  if (!canonical) return { ...fallback, rawUnits: fallback.ingredients.map(([, unit]) => unit), matchNames: fallback.ingredients.map(([, , name]) => name), matchSteps: fallback.steps.map((step) => `${step.text} ${step.ingredients.join(" ")}`) };
  return {
    ...fallback,
    baseServings: canonical.servings,
    ingredients: canonical.ingredients.map((item) => [item.quantity, item.unit ?? "", item.preparationNote ? `${item.name}, ${item.preparationNote}` : item.name] as [number | null, string, string]),
    steps: canonical.steps.map((item, index) => ({ title: item.title ?? `Step ${index + 1}`, text: item.instruction, minutes: item.durationMinutes ?? 0, ingredients: [] })),
    rawUnits: canonical.ingredients.map((item) => item.rawUnit ?? item.unit ?? ""),
    matchNames: canonical.ingredients.map((item) => item.englishName ?? item.name),
    matchSteps: canonical.steps.map((item) => item.englishInstruction ?? item.instruction),
  };
}

// Only videos reviewed for this exact dish; no dish borrows another dish's video.
const dishVideos: Record<string, string> = { "butter-chicken": "vBWWwjhoIGU", pho: "ulobO6wq_V8", bibimbap: "BxmIxTJFbZE", "tacos-al-pastor": "07iNwXuQODk" };

function sourceHost(url: string) {
  try { return new URL(url).hostname.replace(/^www\./u, ""); } catch { return ""; }
}

export function DishExperience({ dish, canonicalRecipe }: { dish: CatalogDish; canonicalRecipe?: CanonicalRecipe }) {
  const copy = useWebsiteCopy();
  const recipe = resolveRecipe(dish, canonicalRecipe);
  const baseServings = recipe.baseServings;
  const [servings, setServings] = useState(baseServings);
  const [units, setUnits] = useState<Units>("Metric");
  const [planRequested, setPlanRequested] = useState(false);
  const video = videos.find((item) => item.id === dishVideos[dish.slug]) ?? null;
  const related = catalogDishes.filter((item) => item.slug !== dish.slug && (item.region === dish.region || item.technique === dish.technique)).slice(0, 4);
  const time = recipeTime({ preparationMinutes: canonicalRecipe?.preparationMinutes, cookingMinutes: canonicalRecipe?.cookingMinutes, stepMinutes: recipe.steps.map((step) => step.minutes || null) }, recipe.steps.map((step) => step.text));
  const timeLabel = time ? `${time.estimated ? "About " : ""}${formatRecipeMinutes(time.minutes)}` : dish.time;
  const curated = curatedRecipeDetails[dish.slug];
  const sources = [...new Map((canonicalRecipe?.sources ?? []).map((item) => [item.sourceUrl, item])).values()];
  const localized = canonicalRecipe ? "" : undefined;

  function devicePlan() {
    const ratio = servings / baseServings;
    return {
      slug: dish.slug, dish: dish.name, image: dish.image, servings,
      ingredients: recipe.ingredients.map(([amount, unit, name]) => ({ amount: amount === null ? null : Number((amount * ratio).toFixed(2)), unit, name })),
      equipment: recipe.equipment, updatedAt: new Date().toISOString(),
    };
  }

  return <div className={styles.page} data-website-page data-website-localized>
    <div className={styles.shell}>
      <nav className={styles.crumbs} aria-label={copy("Breadcrumb")}><Link href="/explore">{copy("Explore")}</Link><span aria-hidden="true">/</span><Link href={`/countries/${dish.country.toLowerCase().replaceAll(" ", "-")}`}>{copy(dish.country)}</Link><span aria-hidden="true">/</span><span>{canonicalRecipe?.title ?? dish.name}</span></nav>
      <header className={styles.hero}>
        <div className={styles.heroCopy} id="recipe-top">
          <p className={styles.origin}>{copy(dish.city)} · {copy(dish.country)}</p>
          <h1 className={styles.title} data-catalog-localized={localized}>{canonicalRecipe?.title ?? dish.name}</h1>
          <p className={styles.local} translate="no"><span lang={dish.country === "Japan" ? "ja" : undefined}>{dish.localName}</span> · {dish.pronunciation}</p>
          <p className={styles.deck} data-catalog-localized={localized}>{canonicalRecipe?.summary ?? dish.culturalNote}</p>
          <dl className={styles.meta}>
            <div><dt>{copy("Taste")}</dt><dd>{copy(dish.taste)}</dd></div>
            <div><dt>{copy("Time")}</dt><dd>{copy(timeLabel)}</dd></div>
            <div><dt>{copy("Difficulty")}</dt><dd>{copy(dish.difficulty)}</dd></div>
          </dl>
          <RecipeKitchenActions slug={dish.slug} servings={servings} devicePlan={devicePlan()} planning={planRequested} onPlanningChange={setPlanRequested} className={styles.actions} />
        </div>
        <figure className={styles.photo}><img src={dish.image} {...responsiveFillSourceSet(dish.image)} sizes="(max-width: 900px) 92vw, 50vw" decoding="async" fetchPriority="high" alt={copy(`${dish.name} from ${dish.city}, ${dish.country}`)} /><figcaption>{dish.flag} {copy(dish.city)}, {copy(dish.country)}</figcaption></figure>
      </header>

      <section className={styles.recipe} id="recipe">
        <aside className={`${styles.panel} ${styles.ingredients}`} aria-labelledby="ingredients-title">
          <h2 className={styles.sectionTitle} id="ingredients-title">{copy("Ingredients")}</h2>
          <div className={styles.controls}>
            <div className={styles.stepper} role="group" aria-label={copy("Servings")}>
              <button type="button" aria-label={copy("Fewer servings")} disabled={servings <= 1} onClick={() => setServings((value) => Math.max(1, value - 1))}>−</button>
              <output aria-live="polite">{copy(`Serves ${servings}`)}</output>
              <button type="button" aria-label={copy("More servings")} disabled={servings >= 12} onClick={() => setServings((value) => Math.min(12, value + 1))}>+</button>
            </div>
            <div className={styles.segmented} role="group" aria-label={copy("Measurement units")}>{(["Metric", "Imperial"] as const).map((item) => <button type="button" aria-pressed={units === item} onClick={() => setUnits(item)} key={item}>{copy(item)}</button>)}</div>
          </div>
          <ul className={styles.checklist}>{recipe.ingredients.map(([amount, unit, ingredient], index) => <li key={`${index}-${ingredient}`}><label><input type="checkbox" /><strong className={styles.amount}>{amountText(amount, unit, recipe.rawUnits[index], servings / baseServings, units, canonicalRecipe?.locale)}</strong><span data-catalog-localized={localized}>{ingredient}</span></label></li>)}</ul>
          <div className={styles.panelLinks}><button type="button" className={styles.textButton} onClick={() => { setPlanRequested(true); document.getElementById("recipe-top")?.scrollIntoView({ block: "center" }); }}>{copy("Add to grocery list")}</button><Link className={styles.textButton} href="/grocery-list">{copy("Open grocery list")}</Link></div>
          <p className={styles.allergen}><b>{copy("Allergen check")}</b>{copy(dish.allergens.length ? `Contains or may contain ${dish.allergens.join(", ")}. Verify every packaged ingredient.` : "No major allergens are inherent in this sample version, but check packaged ingredients and cross-contact.")}</p>
        </aside>

        <section className={styles.method} aria-labelledby="method-title">
          <div className={styles.methodHead}><h2 className={styles.sectionTitle} id="method-title">{copy("Method")}</h2><p>{copy(`${recipe.steps.length} steps`)} · {copy(timeLabel)}</p></div>
          <ol className={styles.steps}>{recipe.steps.map((step, index) => <li key={`${index}-${step.title}`}><span className={styles.seed} aria-hidden="true">{index + 1}</span><div className={styles.stepBody}><header><h3 data-catalog-localized={localized}>{step.title}</h3>{step.minutes ? <time>{copy(`${step.minutes} min`)}</time> : null}</header><p data-catalog-localized={localized}>{step.text}</p></div></li>)}</ol>
          <div className={styles.notes}>
            {curated ? <p className={styles.note}><b>{copy("Cook’s tip")}</b>{copy(curated.chefTip)}</p> : null}
            {curated ? <p className={styles.note}><b>{copy("Storage")}</b>{copy(curated.storage)}</p> : null}
            <div className={styles.note}><b>{copy("Tools")}</b><ul className={styles.tools}>{recipe.equipment.map((item) => <li key={item}>{copy(item)}</li>)}</ul></div>
          </div>
          <div className={styles.cookCall}><p>{copy("Cook it one step at a time, with timers.")}</p><Link className={styles.pillStrong} href={`/cook/${dish.slug}`}>{copy("Start Cook Mode →")}</Link></div>
        </section>
      </section>
    </div>

    <div className={styles.culture}><CultureWeeklyCarousel dish={dish} recipe={recipe} culturalNote={canonicalRecipe?.culturalNote ?? dish.culturalNote} /></div>

    <div className={styles.shell}>
      {related.length ? <section className={styles.band} aria-labelledby="related-title">
        <div className={styles.bandHead}><h2 className={styles.sectionTitle} id="related-title">{copy("Related by place or technique")}</h2><Link className={styles.textButton} href="/explore">{copy("Explore more recipes")}</Link></div>
        <ul className={styles.related}>{related.map((item) => <li key={item.slug}><Link href={`/dishes/${item.slug}`}><img src={item.image} alt="" loading="lazy" /><strong>{copy(item.name)}</strong><span>{copy(item.city)}, {copy(item.country)}</span></Link></li>)}</ul>
      </section> : null}

      <section className={styles.sources} aria-label={copy("Video and sources")}>
        {video ? <div>
          <h2>{copy("Watch it made")}</h2>
          <a className={styles.video} href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noreferrer noopener"><img src={`https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`} alt="" loading="lazy" /><div><strong>{video.title}</strong><span>{video.creator} · YouTube ↗</span></div></a>
        </div> : null}
        <div>
          <h2>{copy("Sources")}</h2>
          <ul className={styles.sourceList}>
            {sources.map((item) => <li key={item.sourceUrl}><a href={item.sourceUrl} target="_blank" rel="noreferrer noopener">{copy(item.sourceName)}</a> <span>{sourceHost(item.sourceUrl)}</span></li>)}
            {canonicalRecipe ? <li><Link href={`/recipes/${dish.slug}/source`}>{copy("Full source and licence record")}</Link></li> : null}
            <li><Link href="/share">{copy("Cooked it? Share your version")}</Link></li>
          </ul>
        </div>
      </section>
    </div>
  </div>;
}

export function CookMode({ dish, initialStep = 0, canonicalRecipe }: { dish: CatalogDish; initialStep?: number; canonicalRecipe?: CanonicalRecipe }) {
  const copy = useWebsiteCopy();
  const recipe = resolveRecipe(dish, canonicalRecipe);
  const total = recipe.steps.length;
  const [step, setStep] = useState(Math.max(0, Math.min(Number.isFinite(initialStep) ? Math.floor(initialStep) : 0, total - 1)));
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [timer, setTimer] = useState<{ step: number; left: number; running: boolean } | null>(null);
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);
  const [awake, setAwake] = useState(false);
  const wakeLock = useRef<{ release: () => Promise<void> } | null>(null);
  const audio = useRef<AudioContext | null>(null);
  const active = recipe.steps[step];
  const stepIngredients = stepIngredientIndexes(recipe.matchSteps[step] ?? "", recipe.matchNames);
  const localized = canonicalRecipe ? "" : undefined;

  useEffect(() => {
    if (!timer?.running) return;
    const id = window.setInterval(() => setTimer((value) => value && value.running ? { ...value, left: Math.max(0, value.left - 1), running: value.left > 1 } : value), 1000);
    return () => window.clearInterval(id);
  }, [timer?.running]);
  useEffect(() => {
    if (!timer || timer.left > 0 || !audio.current) return;
    // A short two-tone chime; the context was created by the click that started the timer.
    const context = audio.current;
    [0, 0.35].forEach((offset, index) => {
      const tone = context.createOscillator(), gain = context.createGain();
      tone.frequency.value = index ? 880 : 660; gain.gain.setValueAtTime(0.18, context.currentTime + offset); gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + offset + 0.3);
      tone.connect(gain).connect(context.destination); tone.start(context.currentTime + offset); tone.stop(context.currentTime + offset + 0.32);
    });
  }, [timer]);
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("step", String(step));
    window.history.replaceState(window.history.state, "", url);
  }, [step]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement | null)?.closest("textarea, input, select") || done) return;
      if (event.key === "ArrowRight" && step < total - 1) setStep(step + 1);
      if (event.key === "ArrowLeft" && step > 0) setStep(step - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [done, step, total]);
  useEffect(() => () => { void wakeLock.current?.release().catch(() => undefined); }, []);

  async function toggleAwake() {
    try {
      if (wakeLock.current) { await wakeLock.current.release(); wakeLock.current = null; setAwake(false); return; }
      const nav = navigator as Navigator & { wakeLock?: { request: (kind: "screen") => Promise<{ release: () => Promise<void> }> } };
      wakeLock.current = await nav.wakeLock?.request("screen") ?? null;
      setAwake(Boolean(wakeLock.current));
    } catch { wakeLock.current = null; setAwake(false); }
  }
  function startTimer(minutes: number) {
    try { audio.current ??= new AudioContext(); void audio.current.resume(); } catch { audio.current = null; }
    setTimer({ step, left: minutes * 60, running: true });
  }
  const clock = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const ingredientRow = (index: number) => {
    const [amount, unit, name] = recipe.ingredients[index];
    return <li key={index}><label><input type="checkbox" checked={Boolean(checked[index])} onChange={(event) => setChecked((items) => ({ ...items, [index]: event.target.checked }))} /><strong className={styles.amount}>{amountText(amount, unit, recipe.rawUnits[index], 1, "Metric", canonicalRecipe?.locale)}</strong><span data-catalog-localized={localized}>{name}</span></label></li>;
  };

  return <main className={`${styles.page} ${styles.cook}`} data-website-page data-website-localized>
    <header className={styles.bar}>
      <Link className={styles.pill} href={`/dishes/${dish.slug}`}>← {copy("Recipe")}</Link>
      <div className={styles.barTitle}><strong data-catalog-localized={localized}>{canonicalRecipe?.title ?? dish.name}</strong><span>{copy(done ? "Finished" : `Step ${step + 1} of ${total}`)}</span></div>
      <button type="button" className={styles.pill} aria-pressed={awake} onClick={() => void toggleAwake()}>{copy(awake ? "Screen stays on" : "Keep screen on")}</button>
    </header>
    <ol className={styles.seeds} aria-label={copy("Steps")}>
      {recipe.steps.map((item, index) => <li key={index}><button type="button" aria-label={`${index + 1}. ${item.title}`} aria-current={!done && index === step ? "step" : undefined} data-state={done || index < step ? "done" : "todo"} onClick={() => { setDone(false); setStep(index); }}>{done || index < step ? "✓" : index + 1}</button></li>)}
    </ol>

    {done ? <section className={styles.finish}>
      <span className={styles.finishSeed} aria-hidden="true">✓</span>
      <h1>{copy(`You cooked ${dish.name}.`)}</h1>
      <p>{copy("Write down what you would change while it is fresh.")}</p>
      <textarea data-private value={note} onChange={(event) => setNote(event.target.value)} placeholder={copy("What would you change next time?")} aria-label={copy("Your note")} />
      <div><Link className={styles.pillStrong} href="/recipe-box">{copy("Open My Kitchen")}</Link><button type="button" className={styles.pill} onClick={() => { setDone(false); setStep(0); setChecked({}); }}>{copy("Cook again")}</button><Link className={styles.pill} href={`/dishes/${dish.slug}`}>{copy("Back to the recipe")}</Link></div>
      <CookKitchenControls className={styles.progressTools} slug={dish.slug} step={step} completed={done} note={note} stepCount={total} onResume={(saved) => { setStep(saved.step); setDone(saved.completed); }} />
    </section> : <div className={styles.stage}>
      <article className={styles.stepCard} key={step} aria-live="polite">
        <p className={styles.stepCount}>{copy(`Step ${step + 1} of ${total}`)}</p>
        <h1 className={styles.stepTitle} data-catalog-localized={localized}>{active.title}</h1>
        <p className={styles.instruction} data-catalog-localized={localized}>{active.text}</p>
        {timer && timer.step === step ? <div className={styles.timer} data-state={timer.left === 0 ? "over" : "on"} role="timer" aria-live="off">
          <strong className={styles.clock}>{clock(timer.left)}</strong>
          {timer.left === 0 ? <span>{copy("Time’s up. Check it before you move on.")}</span> : <button type="button" className={styles.pill} onClick={() => setTimer({ ...timer, running: !timer.running })}>{copy(timer.running ? "Pause" : "Resume")}</button>}
          <button type="button" className={styles.pill} onClick={() => setTimer(null)}>{copy(timer.left === 0 ? "Dismiss" : "Reset")}</button>
        </div> : <div className={styles.timer}>
          {active.minutes ? <button type="button" className={styles.pill} onClick={() => startTimer(active.minutes)}>⏱ {copy(`Start ${active.minutes} min timer`)}</button> : null}
          {timer ? <button type="button" className={styles.textButton} onClick={() => setStep(timer.step)}>{copy(`Step ${timer.step + 1} timer`)} · {clock(timer.left)}</button> : null}
        </div>}
      </article>
      <aside className={styles.side}>
        <section className={styles.panel} aria-labelledby="step-ingredients">
          <h2 id="step-ingredients">{copy("For this step")}</h2>
          {stepIngredients.length ? <ul className={styles.checklist}>{stepIngredients.map(ingredientRow)}</ul> : <p className={styles.empty}>{copy("No new ingredients in this step.")}</p>}
          <details><summary>{copy(`All ingredients (${recipe.ingredients.length})`)}</summary><ul className={styles.checklist}>{recipe.ingredients.map((_, index) => ingredientRow(index))}</ul></details>
        </section>
        <section className={styles.panel}>
          <label><span>{copy("Your note")}</span><textarea data-private value={note} onChange={(event) => setNote(event.target.value)} placeholder={copy("Only you can see this")} /></label>
          <CookKitchenControls className={styles.progressTools} slug={dish.slug} step={step} completed={done} note={note} stepCount={total} onResume={(saved) => { setStep(saved.step); setDone(saved.completed); }} />
        </section>
      </aside>
    </div>}

    {done ? <span /> : <nav className={styles.nav} aria-label={copy("Step navigation")}>
      <button type="button" className={styles.pill} disabled={step === 0} onClick={() => setStep((value) => Math.max(0, value - 1))}>← {copy("Previous")}</button>
      <button type="button" className={styles.pillStrong} onClick={() => step === total - 1 ? setDone(true) : setStep((value) => value + 1)}>{copy(step === total - 1 ? "Finish cooking" : "Next step")} →</button>
    </nav>}
  </main>;
}

export function DishNotFound() {
  return <section className="section-shell not-found-dish"><span>🍽️</span><h1>This dish is not on the table yet.</h1><p>Explore the current editorial collection or suggest a culturally sourced recipe.</p><Link href="/explore">Browse dishes</Link></section>;
}

export function findDish(slug: string) {
  return catalogDishes.find((dish) => dish.slug === slug) ?? catalogDishes.find((dish) => dish.slug === "ramen") ?? ({ ...dishes[0] } as CatalogDish);
}
