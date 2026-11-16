"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import { curatedRecipeDetails } from "./curated-recipe-details";
import { useI18n } from "./i18n";
import { planCatalogDish, readKitchenPlans, removeKitchenPlan, type KitchenPlan } from "./kitchen-plan-storage";
import { catalogDishes } from "./product-data";
import { socialRecipePool } from "./social-recipe-data";
import { DishCard } from "./ui";
import { productCall, productError, productSession } from "../lib/auth/product-client";
import type { AccountSession } from "../lib/auth/account-client";
import type { KitchenEntryResponse } from "../server/node/src/contracts/kitchen";
import { useKitchenWorkspace } from "../lib/auth/use-kitchen-workspace";
import { useKitchenPrep } from './use-kitchen-prep';
import { KitchenShell, slugTitle, useRecipeSummaries } from "./kitchen-shell";
import { useWebsiteCopy } from "./use-website-copy";
import k from "./kitchen-passed-bowl.module.css";

type SavedState = "Want to cook" | "Cooking" | "Cooked" | "Favorite";
const savedStates: SavedState[] = ["Want to cook", "Cooking", "Cooked", "Favorite"];

export function RecipeBox() {
  const { t } = useI18n();
  const copy = useWebsiteCopy();
  const [status, setStatus] = useState<Record<string, SavedState>>({});
  const [session,setSession] = useState<AccountSession | null>(null);
  const [entries,setEntries] = useState<KitchenEntryResponse[]>([]);
  const [busy,setBusy] = useState(false), [message,setMessage] = useState('Loading kitchen…');
  const [importPreview,setImportPreview] = useState<{recipeSlug:string;decision:string}[] | null>(null);
  const [importBatch,setImportBatch] = useState<unknown[]>([]);
  const [filter, setFilter] = useState<"All" | SavedState>("All");
  const [featuredSlug, setFeaturedSlug] = useState("ramen");
  const [noteDish, setNoteDish] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);
  const saved = catalogDishes.filter((dish) => status[dish.slug] && (filter === "All" || status[dish.slug] === filter));
  const featured = saved.find((dish) => dish.slug === featuredSlug) ?? saved[0];
  const savedCommunityNotes = socialRecipePool.filter((note) => status[note.id] && (filter === "All" || status[note.id] === filter));
  // Published catalogue recipes saved from Explore or a recipe page: account entries, or device statuses when signed out.
  const catalogSlugs = session
    ? entries.filter(r => !catalogDishes.some(d => d.slug===r.recipeSlug)).map(r => r.recipeSlug)
    : Object.keys(status).filter(slug => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && !catalogDishes.some(d => d.slug===slug) && !socialRecipePool.some(n => n.id===slug));
  const visibleCatalogSlugs = catalogSlugs.filter(slug => filter === "All" || (status[slug] ?? "Want to cook") === filter);
  const summaries = useRecipeSummaries(catalogSlugs);
  const total = Object.keys(status).length;

  async function load() {
    setBusy(true);
    try {
      const account = await productSession(); setSession(account); setImportPreview(null);
      if (!account) {
        setEntries([]); setStatus(JSON.parse(localStorage.getItem('savora-recipe-status') ?? '{}')); setNotes(JSON.parse(localStorage.getItem('savora-recipe-notes') ?? '{}')); setMessage('Device kitchen — sign in to use your account kitchen.'); return;
      }
      const rows: KitchenEntryResponse[] = []; let after: string | null = null;
      for (let page=0;page<25;page++) {
        const result: {items:KitchenEntryResponse[];nextCursor:string|null} = await productCall(`me/kitchen?limit=50${after ? `&after=${after}` : ''}`);
        rows.push(...result.items); after=result.nextCursor; if (!after) break;
      }
      if (after) throw new Error('TooMany');
      setEntries(rows); setStatus(Object.fromEntries(rows.filter(r => r.status).map(r => [r.recipeSlug,r.status!])));
      setNotes(Object.fromEntries(rows.map(r => [r.recipeSlug,r.privateNote ?? '']))); setMessage('Account kitchen loaded.');
    } catch(e) {setEntries([]); setStatus({}); setNotes({}); setMessage(productError(e));} finally {setBusy(false); setLoaded(true);}
  }
  useEffect(() => { const timer = window.setTimeout(() => void load(),0); return () => window.clearTimeout(timer); }, []);
  async function persist(slug: string, value = status[slug], note = notes[slug] ?? '') {
    if (!session || busy) return;
    setBusy(true);
    try {
      const current = await productSession(); if (!current || current.account.id !== session.account.id) throw new Error('ChangedAccount');
      const existing = entries.find(r => r.recipeSlug === slug);
      const saved = await productCall<KitchenEntryResponse>(`me/kitchen/${slug}`,'PUT',{status:value ?? null,privateNote:note.trim() || null,servings:existing?.servings ?? 1,expectedRevision:existing?.revision ?? 0},current);
      setEntries(rows => [...rows.filter(r => r.recipeSlug !== slug),saved]); setStatus(rows => ({...rows,[slug]:saved.status!})); setMessage('Saved to your account.');
    } catch(e) {setMessage(productError(e));} finally {setBusy(false);}
  }
  async function importDevice(apply: boolean) {
    if (busy) return; setBusy(true);
    try {
      const current = await productSession(); if (!current || current.account.id !== session?.account.id) throw new Error('ChangedAccount');
      const deviceStatus = JSON.parse(localStorage.getItem('savora-recipe-status') ?? '{}'), deviceNotes = JSON.parse(localStorage.getItem('savora-recipe-notes') ?? '{}');
      const items = apply ? importBatch : [...new Set([...Object.keys(deviceStatus),...Object.keys(deviceNotes)])].filter(s => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s)).slice(0,50).map(recipeSlug => ({recipeSlug,status:deviceStatus[recipeSlug] ?? null,privateNote:deviceNotes[recipeSlug]?.trim() || null,servings:1})).filter(i => i.status || i.privateNote);
      if (!items.length) {setMessage('No device records to import.');return;}
      const result = await productCall<{items:{recipeSlug:string;decision:string}[]}>(`me/kitchen/${apply ? 'import' : 'import-preview'}`,'POST',{items},current);
      setImportBatch(items); setImportPreview(result.items);
      if (apply) {setBusy(false); await load();} else setMessage('Preview only. Existing account records will be kept. Up to 50 device records per batch.');
    } catch(e) {setMessage(productError(e));} finally {setBusy(false);}
  }
  async function removeEntry(slug: string) {
    if (busy) return;
    if (session) {
      const existing = entries.find(r => r.recipeSlug === slug); if (!existing) return;
      setBusy(true);
      try {
        const current = await productSession(); if (!current || current.account.id !== session.account.id) throw new Error('ChangedAccount');
        await productCall(`me/kitchen/${slug}`,'DELETE',{expectedRevision:existing.revision},current);
        setEntries(rows => rows.filter(r => r.recipeSlug !== slug)); setMessage('Removed from your account kitchen.');
      } catch(e) {setMessage(productError(e));return;} finally {setBusy(false);}
    }
    const nextStatus = {...status}, nextNotes = {...notes}; delete nextStatus[slug]; delete nextNotes[slug];
    setStatus(nextStatus); setNotes(nextNotes);
    if (!session) try {localStorage.setItem('savora-recipe-status',JSON.stringify(nextStatus));localStorage.setItem('savora-recipe-notes',JSON.stringify(nextNotes));} catch {setMessage('Device storage unavailable.');}
  }

  function setNote(slug: string, value: string) {
    const next = { ...notes, [slug]: value };
    setNotes(next);
    if (!session) try { window.localStorage.setItem("savora-recipe-notes", JSON.stringify(next)); } catch { /* Optional local draft. */ }
  }

  function updateStatus(slug: string, value: SavedState) {
    if (session) {void persist(slug,value); return;}
    const next = { ...status, [slug]: value };
    setStatus(next);
    try { window.localStorage.setItem("savora-recipe-status", JSON.stringify(next)); } catch { /* Optional local save. */ }
    if (value === "Cooking") {
      const dish = catalogDishes.find((item) => item.slug === slug);
      if (dish) planCatalogDish(dish);
    }
  }

  const statusSelect = (slug: string, value: SavedState | undefined) => (
    <label className={k.inlineSelect}><span>{copy("Status")}</span><select disabled={busy} value={value ?? "Want to cook"} onChange={(event) => updateStatus(slug, event.target.value as SavedState)}>{savedStates.map((state) => <option value={state} key={state}>{copy(state)}</option>)}</select></label>
  );

  return (
    <KitchenShell
      active="recipe-box"
      title="Recipe box"
      lede="Organize dishes by what you want to cook, what is in progress, what you made, and what became a favorite."
      mode={!loaded ? "loading" : session ? "account" : "guest"}
      message={message}
      statusActions={<><button className={k.quiet} disabled={busy} type="button" onClick={() => void load()}>{copy("Reload")}</button>{!session ? <Link className={k.primarySmall} href="/account/login?returnTo=%2Frecipe-box">{copy("Sign in")}</Link> : null}</>}
    >
      <section className={k.panel} data-private>
        {session ? (
          <div className={k.accountTools}>
            <div className={k.importBox}>
              <h2>{copy("Records on this device")}</h2>
              <p>{copy("Preview first. Existing account records are never overwritten.")}</p>
              <div className={k.row}>
                <button className={k.secondary} disabled={busy} type="button" onClick={() => void importDevice(false)}>{copy("Preview device import")}</button>
                {importPreview ? <><span className={k.meta}>{copy(`${importPreview.filter(i => i.decision === 'Create').length} new · ${importPreview.filter(i => i.decision === 'KeepServer').length} kept · ${importPreview.filter(i => i.decision === 'Unavailable').length} unavailable`)}</span><button className={k.primary} disabled={busy} type="button" onClick={() => void importDevice(true)}>{copy("Import new records only")}</button></> : null}
              </div>
            </div>
            <label className={k.field}><span>{copy("Add recipe")}</span><select defaultValue="" disabled={busy} onChange={e => { if (e.target.value) void persist(e.target.value,'Want to cook',''); }}><option value="">{copy("Choose a recipe")}</option>{catalogDishes.map(d => <option value={d.slug} key={d.slug}>{d.name}</option>)}</select></label>
          </div>
        ) : null}

        <div className={k.segmented} role="tablist" aria-label={copy("Saved recipe status")}>
          {(["All", ...savedStates] as const).map((item) => <button type="button" role="tab" aria-selected={filter === item} key={item} onClick={() => setFilter(item)}>{copy(item)}<span>{item === "All" ? total : Object.values(status).filter((value) => value === item).length}</span></button>)}
        </div>

        {featured ? (
          <section className={k.feature} aria-label={`Featured saved recipe: ${featured.name}`}>
            <Link className={k.featureImage} href={`/dishes/${featured.slug}`}><img src={featured.image} alt={featured.name} /></Link>
            <div className={k.featureCopy}>
              <p className={k.meta}>{featured.flag} {featured.country} · {featured.city}</p>
              <h2>{featured.name}</h2>
              <blockquote>{featured.culturalNote}</blockquote>
              <div className={k.row}>
                <Link className={k.primary} href={`/dishes/${featured.slug}`}>{copy("Open recipe")}</Link>
                {statusSelect(featured.slug, status[featured.slug])}
              </div>
              <div className={k.row}>
                <button className={k.quiet} type="button" aria-expanded={noteDish === featured.slug} onClick={() => setNoteDish(noteDish === featured.slug ? "" : featured.slug)}>{copy(noteDish === featured.slug ? "Close note" : "Personal note")}</button>
                <button className={k.quietDanger} disabled={busy} type="button" onClick={() => void removeEntry(featured.slug)}>{copy("Remove from kitchen")}</button>
              </div>
              {noteDish === featured.slug ? <div className={k.note}><textarea disabled={busy} value={notes[featured.slug] ?? ""} onChange={(event) => setNote(featured.slug, event.target.value)} maxLength={4000} placeholder={copy("Private note for your next cook…")} />{session ? <button className={k.primary} disabled={busy} type="button" onClick={() => void persist(featured.slug)}>{copy("Save note")}</button> : <small>{copy("Saved on this device as you type.")}</small>}</div> : null}
            </div>
          </section>
        ) : null}

        {saved.length > 1 ? <div className={k.rail} aria-label={copy("Saved recipe gallery")}>{saved.map((dish) => <button type="button" aria-pressed={featured?.slug === dish.slug} onClick={() => setFeaturedSlug(dish.slug)} key={dish.slug}><img src={dish.image} alt="" /><span><strong>{dish.name}</strong><small>{copy(status[dish.slug])}</small></span></button>)}</div> : null}

        {visibleCatalogSlugs.length ? (
          <section className={k.savedSection} aria-labelledby="saved-catalogue">
            <h2 id="saved-catalogue">{copy("Saved from the catalogue")}</h2>
            <div className={k.savedGrid}>
              {visibleCatalogSlugs.map((slug, index) => {
                const summary = summaries[slug];
                return (
                  <article key={slug} style={{ "--i": Math.min(index, 10) } as CSSProperties}>
                    <Link className={k.savedImage} href={`/recipes/${slug}`}>{summary?.image ? <img src={summary.image} alt="" /> : <span aria-hidden="true" />}</Link>
                    <div>
                      <Link className={k.savedTitle} href={`/recipes/${slug}`}>{summary?.title ?? slugTitle(slug)}</Link>
                      {statusSelect(slug, status[slug])}
                      <label className={k.noteField}><span>{copy("Private note")}</span><textarea disabled={busy} maxLength={4000} value={notes[slug] ?? ""} onChange={e => setNote(slug,e.target.value)} rows={2} /></label>
                      <div className={k.row}>{session ? <button className={k.secondary} disabled={busy} type="button" onClick={() => void persist(slug)}>{copy("Save note")}</button> : null}<button className={k.quietDanger} disabled={busy} type="button" onClick={() => void removeEntry(slug)}>{copy("Remove from kitchen")}</button></div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}

        {savedCommunityNotes.length ? <section className={k.savedSection}><h2>{t("box.community")}</h2><div className={k.noteList}>{savedCommunityNotes.map((note) => <article key={note.id}><span aria-hidden="true">{note.flag}</span><div><p className={k.meta}>{note.area} · {note.category}</p><h3>{note.name}</h3>{statusSelect(note.id, status[note.id])}<Link href={`/notes/${note.id}`}>{t("box.openNote")} →</Link></div></article>)}</div></section> : null}

        {loaded && !featured && !visibleCatalogSlugs.length && !savedCommunityNotes.length ? (
          <div className={k.empty}>
            <h2>{copy(total ? "No recipes match this status yet." : "Your recipe box is empty.")}</h2>
            <p>{copy("Save a recipe with the heart on Explore or on any recipe page.")}</p>
            <Link className={k.primary} href="/explore">{copy("Find a recipe")}</Link>
          </div>
        ) : null}
      </section>
    </KitchenShell>
  );
}

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const slots = ["Breakfast", "Lunch", "Dinner"];

export function MealPlanner() {
  const copy = useWebsiteCopy();
  const cloud = useKitchenWorkspace();
  const [draftPlan, setDraftPlan] = useState<Record<string, string> | null>(null);
  const plan = draftPlan ?? cloud.workspace.content.mealPlan;
  const [dragged, setDragged] = useState("");
  const [saved, setSaved] = useState(false);
  function place(key: string, slug: string) {
    if (cloud.busy) return;
    setDraftPlan((items) => { const next = {...(items ?? cloud.workspace.content.mealPlan)}; if (slug) next[key]=slug; else delete next[key]; return next; });
    const dish = catalogDishes.find((item) => item.slug === slug);
    if (dish && cloud.mode==='guest') planCatalogDish(dish);
    setSaved(false);
  }
  const planned = Array.from(new Set(Object.values(plan))).map((slug) => catalogDishes.find((dish) => dish.slug === slug)).filter(Boolean);
  const uniqueRecipeCount=new Set(Object.values(plan)).size;
  const completeLocalPrep=planned.length===uniqueRecipeCount;
  const generatedIngredientCount = planned.reduce((total, dish) => total + (dish ? curatedRecipeDetails[dish.slug]?.ingredients.length ?? dish.ingredients.length : 0), 0);
  const generatedToolCount = new Set(planned.flatMap((dish) => dish ? curatedRecipeDetails[dish.slug]?.equipment ?? [] : [])).size;
  const draggedDish = catalogDishes.find((dish) => dish.slug === dragged);
  async function saveWeek() {
    const accepted = await cloud.save({mealPlan:plan}); setSaved(accepted); if (accepted) setDraftPlan(null);
  }
  return (
    <KitchenShell
      active="meal-planner"
      title="Meal planner"
      lede="Drop a dish into the week and Savora prepares its ingredient and tool lists immediately."
      mode={cloud.mode}
      message={cloud.message}
      actions={<><button className={k.primary} disabled={cloud.busy || cloud.mode !== 'account'} type="button" onClick={() => void saveWeek()}>{copy("Save this week")}</button><Link className={k.secondary} href="/grocery-list">{copy("Open prep list")}</Link></>}
      statusActions={<><button className={k.quiet} disabled={cloud.busy} type="button" onClick={() => void cloud.reload()}>{copy("Reload")}</button>{cloud.mode !== 'account' ? <Link className={k.primarySmall} href="/account/login?returnTo=%2Fmeal-planner">{copy("Sign in")}</Link> : null}</>}
    >
      {saved ? <p className={k.success} role="status">{copy("Week saved. Ingredients and tools are ready in your prep list.")}</p> : null}
      {draftPlan && cloud.mode === 'account' ? <p className={k.notice} role="status">{copy("Unsaved changes")}</p> : null}
      <section className={k.planner} data-private>
        <div className={k.tray}>
          <h2>{copy("Choose a dish, then a meal")}</h2>
          <p className={k.meta}>{copy(draggedDish ? `Selected: ${draggedDish.name}` : "Drag a dish onto the week, or select it and choose a cell.")}</p>
          <div>{catalogDishes.slice(0, 8).map((dish) => <button aria-pressed={dragged === dish.slug} draggable onClick={() => setDragged(dragged === dish.slug ? "" : dish.slug)} onDragStart={() => setDragged(dish.slug)} type="button" key={dish.slug}><img src={dish.image} alt="" /><span><strong>{dish.name}</strong><small>{`${dish.minutes} min`}</small></span></button>)}</div>
        </div>
        <div className={k.weekScroll}>
          <div className={k.week}>
            <span className={k.corner} aria-hidden="true" />
            {weekdays.map((day) => <strong className={k.dayHead} key={day}>{copy(day)}</strong>)}
            {slots.map((slot) => <PlannerRow slot={slot} key={slot} plan={plan} dragged={dragged} place={place} copy={copy} />)}
          </div>
        </div>
        <dl className={k.summary}>
          <div><dt>{copy("Unique recipes")}</dt><dd>{uniqueRecipeCount}</dd></div>
          <div><dt>{copy("Ingredient lines")}</dt><dd>{completeLocalPrep ? generatedIngredientCount : '—'}</dd></div>
          <div><dt>{copy("Tools prepared")}</dt><dd>{completeLocalPrep ? generatedToolCount : '—'}</dd></div>
          <p>{copy("Save your week, then open the prep list for quantities and tools for all planned recipes.")}</p>
        </dl>
      </section>
    </KitchenShell>
  );
}

function PlannerRow({ slot, plan, dragged, place, copy }: { slot: string; plan: Record<string, string>; dragged: string; place: (key: string, slug: string) => void; copy: (value: string) => string }) {
  return <><span className={k.slotHead}>{copy(slot)}</span>{weekdays.map((day) => { const key = `${day}-${slot}`; const dish = catalogDishes.find((item) => item.slug === plan[key]); return <div className={k.cell} data-filled={plan[key] ? "true" : "false"} key={key} onDragOver={(event) => event.preventDefault()} onDrop={() => dragged && place(key, dragged)}>{plan[key] && !dish ? <><Link href={`/recipes/${plan[key]}`}>{plan[key].replaceAll("-"," ")}</Link><button type="button" aria-label={`Remove ${plan[key]}`} onClick={() => place(key, "")}>×</button></> : dish ? <><img src={dish.image} alt="" /><strong>{dish.name}</strong><button type="button" onClick={() => place(key, "")}>×<span className="sr-only">Remove {dish.name}</span></button></> : <button className={k.cellAdd} type="button" disabled={!dragged} onClick={() => dragged && place(key, dragged)}><span aria-hidden="true">+</span><span className="sr-only">{dragged ? `Add to ${day} ${slot}` : "Select a dish"}</span></button>}</div>; })}</>;
}

export function GroceryList() {
  const copy = useWebsiteCopy();
  const cloud = useKitchenWorkspace();
  const prep = useKitchenPrep(cloud.session,cloud.workspace.content.mealPlan);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [manual, setManual] = useState<string[]>([]);
  const [staged, setStaged] = useState<Array<{ ingredient: string; dish: string }>>([]);
  const [devicePlans, setKitchenPlans] = useState<KitchenPlan[]>([]);
  const kitchenPlans=cloud.mode==='account' ? prep.plans : cloud.mode==='guest' ? devicePlans : [];
  const [entry, setEntry] = useState("");

  useEffect(() => {
    if (cloud.mode!=='guest' && cloud.mode!=='account') return;
    if (cloud.session) {
      const timer = window.setTimeout(() => {
        setStaged([]);
        setChecked(Object.fromEntries(cloud.workspace.content.groceryChecked.map(v => [v,true])));
      },0); return () => window.clearTimeout(timer);
    }
    const refreshPlans = () => setKitchenPlans(readKitchenPlans());
    refreshPlans();
    window.addEventListener("savora-kitchen-plans-updated", refreshPlans);
    const collected: Array<{ ingredient: string; dish: string }> = [];
    try {
      for (let index = 0; index < window.localStorage.length; index += 1) {
        const key = window.localStorage.key(index);
        if (!key?.startsWith("savora-grocery-")) continue;
        const slug = key.replace("savora-grocery-", "");
        const dish = catalogDishes.find((item) => item.slug === slug)?.name ?? slug.replaceAll("-", " ");
        const ingredients = JSON.parse(window.localStorage.getItem(key) ?? "[]") as string[];
        ingredients.forEach((ingredient) => collected.push({ ingredient, dish }));
      }
    } catch { /* Staged recipe ingredients are a device-local enhancement. */ }
    const unique = Array.from(new Map(collected.map((item) => [item.ingredient.toLowerCase(), item])).values());
    const timer = window.setTimeout(() => setStaged(unique), 0);
    return () => { window.clearTimeout(timer); window.removeEventListener("savora-kitchen-plans-updated", refreshPlans); };
  }, [cloud.session,cloud.workspace,cloud.mode,prep.plans]);

  const generatedIngredients = Array.from(kitchenPlans.reduce((items, plan) => {
    plan.ingredients.forEach((ingredient) => {
      const key = `${ingredient.name.toLowerCase()}|${ingredient.unit.toLowerCase()}`;
      const existing = items.get(key);
      const current = existing ?? { ...ingredient, dishes: [] as string[] };
      if (existing) current.amount = current.amount === null || ingredient.amount === null ? null : Number((current.amount + ingredient.amount).toFixed(2));
      if (!current.dishes.includes(plan.dish)) current.dishes.push(plan.dish);
      items.set(key, current);
    });
    return items;
  }, new Map<string, { amount: number | null; unit: string; name: string; dishes: string[] }>()).values());
  const generatedTools = Array.from(kitchenPlans.reduce((items, plan) => {
    plan.equipment.forEach((tool) => {
      const key = tool.toLowerCase();
      const current = items.get(key) ?? { tool, dishes: [] as string[] };
      if (!current.dishes.includes(plan.dish)) current.dishes.push(plan.dish);
      items.set(key, current);
    });
    return items;
  }, new Map<string, { tool: string; dishes: string[] }>()).values());
  const totalItems = generatedIngredients.length + staged.length + manual.length;
  const checkedCount = Object.values(checked).filter(Boolean).length;

  function amountLabel(amount: number | null, unit: string) {
    if (amount === null) return unit || "As needed";
    const rounded = Number.isInteger(amount) ? amount : Number(amount.toFixed(2));
    return `${rounded} ${unit}`.trim();
  }

  async function removePlan(slug: string) {
    if (cloud.session) {
      await cloud.save({mealPlan:Object.fromEntries(Object.entries(cloud.workspace.content.mealPlan).filter(([,value]) => value !== slug))}); return;
    }
    removeKitchenPlan(slug);
    setKitchenPlans(readKitchenPlans());
  }

  const toggle = (key: string, value: boolean) => setChecked((items) => ({ ...items, [key]: value }));

  return (
    <KitchenShell
      active="grocery-list"
      title="Prep list"
      lede="Choose a recipe or place it in the weekly planner. Savora merges its quantities and prepares the equipment bench automatically."
      mode={cloud.mode}
      message={prep.error || cloud.message}
      actions={<><button className={k.secondary} type="button" onClick={() => window.print()}>{copy("Print prep list")}</button><Link className={k.secondary} href="/meal-planner">{copy("Adjust meal plan")}</Link></>}
      statusActions={<>{cloud.mode === 'account' ? <button className={k.primarySmall} disabled={cloud.busy} type="button" onClick={() => void cloud.save({groceryChecked:Object.keys(checked).filter(key => checked[key])})}>{copy("Save checklist to account")}</button> : null}<button className={k.quiet} disabled={cloud.busy} type="button" onClick={() => void cloud.reload()}>{copy("Reload")}</button></>}
    >
      <section className={k.prep} data-private>
        {kitchenPlans.length ? (
          <section className={k.planStrip} aria-labelledby="planned-recipes-title">
            <header><h2 id="planned-recipes-title">{copy("Selected recipes")}</h2><p className={k.meta}>{copy(`${generatedIngredients.length} ingredient lines · ${generatedTools.length} unique tools`)}</p></header>
            <div>{kitchenPlans.map((plan) => <article key={plan.slug}>{plan.image ? <img src={plan.image} alt="" /> : <span className={k.thumbBlank} aria-hidden="true" />}<span><strong>{plan.dish}</strong><small>{copy(`Serves ${plan.servings}`)}</small></span><button className={k.quiet} type="button" disabled={cloud.busy} onClick={() => void removePlan(plan.slug)} aria-label={`Remove ${plan.dish} from My Kitchen`}>{copy("Remove")}</button></article>)}</div>
          </section>
        ) : (
          <div className={k.empty}>
            <h2>{copy("Choose what you want to cook.")}</h2>
            <p>{copy("Plan a recipe from its page, or drop a dish into the weekly planner.")}</p>
            <div className={k.row}><Link className={k.primary} href="/explore">{copy("Find a recipe")}</Link><Link className={k.secondary} href="/meal-planner">{copy("Open the planner")}</Link></div>
          </div>
        )}

        {totalItems ? <div className={k.progress}><strong>{copy(`${checkedCount} of ${totalItems} items collected`)}</strong><span><i style={{ width: `${(checkedCount / (totalItems || 1)) * 100}%` }} /></span></div> : null}

        <div className={k.prepColumns}>
          {generatedIngredients.length ? <section className={k.checklist}><h2>{copy("Ingredients")}</h2><p className={k.meta}>{copy("Compatible units are merged; preparation notes stay visible.")}</p><ul>{generatedIngredients.map((item) => { const key = `generated-${item.name}-${item.unit}`; return <li data-checked={checked[key] ? "true" : "false"} key={key}><label><input disabled={cloud.busy} type="checkbox" checked={Boolean(checked[key])} onChange={(event) => toggle(key, event.target.checked)} /><span><strong>{item.name}</strong><small>{item.dishes.join(" · ")}</small></span><em>{amountLabel(item.amount, item.unit)}</em></label></li>; })}</ul></section> : null}
          {generatedTools.length ? <section className={k.checklist}><h2>{copy("Cooking tools")}</h2><p className={k.meta}>{copy("Shared tools appear once, even when several recipes use them.")}</p><ul>{generatedTools.map((item) => { const key = `tool-${item.tool}`; return <li data-checked={checked[key] ? "true" : "false"} key={key}><label><input disabled={cloud.busy} type="checkbox" checked={Boolean(checked[key])} onChange={(event) => toggle(key, event.target.checked)} /><span><strong>{item.tool}</strong><small>{item.dishes.join(" · ")}</small></span></label></li>; })}</ul></section> : null}
          {staged.length && !generatedIngredients.length ? <section className={k.checklist}><h2>{copy("Added from legacy recipes")}</h2><p className={k.meta}>{copy("These older entries need quantity confirmation.")}</p><ul>{staged.map((item) => { const key = `staged-${item.ingredient}`; return <li data-checked={checked[key] ? "true" : "false"} key={key}><label><input disabled={cloud.busy} type="checkbox" checked={Boolean(checked[key])} onChange={(event) => toggle(key, event.target.checked)} /><span><strong>{item.ingredient}</strong><small>{item.dish}</small></span><em>{copy("Confirm amount")}</em></label></li>; })}</ul></section> : null}
          <section className={k.checklist}>
            <h2>{copy("Other items")}</h2>
            <p className={k.meta}>{copy("Extra items are temporary on this page and are not saved.")}</p>
            {manual.length ? <ul>{manual.map((item) => <li key={item}><label><input type="checkbox" /><span><strong>{item}</strong></span></label></li>)}</ul> : null}
            <form className={k.addRow} onSubmit={(event) => { event.preventDefault(); if (entry.trim()) { setManual((items) => [...items, entry.trim()]); setEntry(""); } }}><label><span className="sr-only">{copy("Add another item")}</span><input maxLength={160} value={entry} onChange={(event) => setEntry(event.target.value)} placeholder={copy("Add another item")} /></label><button className={k.primary}>{copy("Add")}</button></form>
          </section>
        </div>
      </section>
    </KitchenShell>
  );
}

type PantryResult = { slug: string; title: string; image: string; alt: string; have: string[]; swaps: Array<{ need: string; use: string }>; missing: string[]; total: number };
type PantryAnswer = { key: string; status: "ready" | "error"; results: PantryResult[]; recognized: Array<string | null> };

/** "Cook with what you have" over every published recipe (matching: lib/search/pantry-match.ts). */
export function PantryMatcher({ staples = [] }: { staples?: Array<Record<string, string>> }) {
  const copy = useWebsiteCopy();
  const { locale } = useI18n();
  const cloud = useKitchenWorkspace();
  const [draftOwned,setOwned] = useState<string[] | null>(null);
  const owned = draftOwned ?? cloud.workspace.content.pantry;
  const [entry, setEntry] = useState("");
  const [answer, setAnswer] = useState<PantryAnswer | null>(null);
  const [more, setMore] = useState({ key: "", count: 12 });
  const key = JSON.stringify([locale, owned]);
  // The list travels in the request body, never the URL; the server keeps nothing.
  useEffect(() => {
    if (!owned.length) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetch("/api/pantry/match", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ have: owned, locale }), signal: controller.signal })
        .then((response) => response.ok ? response.json() : Promise.reject(new Error(String(response.status))))
        .then((data: Pick<PantryAnswer, "results" | "recognized">) => setAnswer({ key, status: "ready", results: data.results, recognized: data.recognized }))
        .catch(() => { if (!controller.signal.aborted) setAnswer({ key, status: "error", results: [], recognized: [] }); });
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [key, owned, locale]);
  const current = owned.length && answer?.key === key ? answer : null;
  const shown = more.key === key ? more.count : 12;
  const quick = staples.map((labels) => labels[locale] ?? labels.en).filter((label) => !owned.some((item) => item.toLowerCase() === label.toLowerCase())).slice(0, 12);
  const list = (items: string[]) => items.join(locale === "zh" || locale === "ja" ? "、" : ", ");
  function add(value: string) {
    const item = value.trim();
    if (owned.length < 100 && item && !owned.includes(item)) setOwned((items) => [...(items ?? owned), item]);
  }
  return (
    <KitchenShell
      active="pantry"
      title="Cook with what you have"
      lede="Every published recipe is checked against your kitchen: ready now, one ingredient away, or ready with a common swap."
      mode={cloud.mode}
      message={cloud.message}
      statusActions={<>{cloud.mode === 'account' ? <button className={k.primarySmall} disabled={cloud.busy} type="button" onClick={() => void cloud.save({pantry:owned})}>{copy("Save pantry to account")}</button> : <Link className={k.primarySmall} href="/account/login?returnTo=%2Fpantry">{copy("Sign in")}</Link>}<button className={k.quiet} disabled={cloud.busy} type="button" onClick={() => void cloud.reload()}>{copy("Reload")}</button></>}
    >
      <section className={k.pantry} data-private>
        <form className={k.pantryInput} onSubmit={(event) => { event.preventDefault(); add(entry); setEntry(""); }}>
          <label><span>{copy("What is in your kitchen?")}</span><div><input maxLength={160} disabled={cloud.busy} value={entry} onChange={(event) => setEntry(event.target.value)} placeholder={copy("Add an ingredient")} /><button className={k.primary}>{copy("Add")}</button></div></label>
          {owned.length ? <div className={k.chips} aria-label={copy("Your ingredients")}>{owned.map((item, index) => {
            const known = current ? current.recognized[index] !== null : true;
            return <button disabled={cloud.busy} type="button" key={item} data-known={known ? "true" : "false"} title={known ? undefined : copy("Not in Savora’s ingredient list, so only recipes using this exact name are matched.")} aria-label={`${copy("Remove")} ${item}`} onClick={() => setOwned((items) => (items ?? owned).filter((value) => value !== item))}>{item}<b aria-hidden="true">×</b></button>;
          })}</div> : null}
          {quick.length ? <div className={k.staples}><span>{copy("Quick add")}</span>{quick.map((item) => <button disabled={cloud.busy} type="button" key={item} onClick={() => add(item)}>+ {item}</button>)}</div> : null}
          <p className={k.pantryNote}>{copy("Salt, pepper and water are assumed. A swap is shown when a common substitute is in your kitchen; it never counts as the original.")}</p>
        </form>
        <div className={k.matches} aria-busy={owned.length > 0 && !current}>
          {!owned.length ? <div className={k.pantryEmpty}><h2>{copy("Start with a few ingredients")}</h2><p>{copy("Add what is in your fridge and cupboard. Savora checks every published recipe and lists the closest matches first.")}</p></div> : null}
          {current && current.status === "error" ? <p className={k.pantryEmpty} role="status">{copy("The recipe catalogue could not be reached. Your list is still here; try again in a moment.")}</p> : null}
          {current && current.status === "ready" && !current.results.length ? <p className={k.pantryEmpty} role="status">{copy("No published recipe uses these ingredients yet. Try adding a few staples.")}</p> : null}
          {current ? current.results.slice(0, shown).map((recipe, index) => {
            const missing = recipe.missing.length, used = recipe.have.length + recipe.swaps.length;
            return (
              <article key={recipe.slug} data-ready={missing === 0 ? "true" : "false"} style={{ "--i": Math.min(index % 12, 10) } as CSSProperties}>
                <Link className={k.matchImage} href={`/recipes/${recipe.slug}`}><img src={recipe.image} alt={recipe.alt} loading="lazy" /></Link>
                <div>
                  <p className={k.matchState}>{copy(missing === 0 ? (recipe.swaps.length ? "Ready with a swap" : "Ready to cook") : missing === 1 ? "Missing one ingredient" : `Missing ${missing} ingredients`)}</p>
                  <h2><Link href={`/recipes/${recipe.slug}`}>{recipe.title}</Link></h2>
                  <div className={k.meter} role="img" aria-label={copy(`${used} of ${recipe.total} ingredients in your kitchen`)}><i style={{ width: `${(used / recipe.total) * 100}%` }} /></div>
                  <ul className={k.essentials} aria-hidden="true">
                    {recipe.have.map((item) => <li key={`have-${item}`} data-have="true">{item}</li>)}
                    {recipe.swaps.map((swap) => <li key={`swap-${swap.need}`} data-have="swap">{swap.need}</li>)}
                    {recipe.missing.map((item) => <li key={`missing-${item}`} data-have="false">{item}</li>)}
                  </ul>
                  {recipe.swaps.map((swap) => <p className={k.needed} key={swap.need}>{copy(`Use ${swap.use} instead of ${swap.need}`)}</p>)}
                  {missing ? <p className={k.needed}>{copy("Still needed:")} <strong>{list(recipe.missing)}</strong></p> : <p className={k.needed}>{copy("You have everything this recipe lists.")}</p>}
                </div>
              </article>
            );
          }) : null}
          {current && current.results.length > shown ? <button className={k.secondary} type="button" onClick={() => setMore({ key, count: shown + 12 })}>{copy("Show more recipes")}</button> : null}
        </div>
      </section>
    </KitchenShell>
  );
}

export function NotificationsExperience() {
  const copy = useWebsiteCopy();
  return (
    <div className={k.page}>
      <header className={k.toolHeader}><div className={k.toolHeaderInner}><div><h1>{copy("Notifications")}</h1><p>{copy("Replies, review decisions and kitchen reminders will appear here.")}</p></div></div></header>
      <div className={k.toolBody}>
        <div className={k.empty}>
          <h2>{copy("No notifications yet.")}</h2>
          <p>{copy("Notifications are not connected to accounts yet. Check a submission’s status on Share, and replies on Community.")}</p>
          <div className={k.row}><Link className={k.primary} href="/share">{copy("My submissions")}</Link><Link className={k.secondary} href="/community">{copy("Community")}</Link></div>
        </div>
      </div>
    </div>
  );
}

export function PlaceLanding({ type, name }: { type: "Country" | "Region" | "Cuisine"; name: string }) {
  const copy = useWebsiteCopy();
  const normalized = name.replace(/-/g, " ");
  const title = normalized.replace(/w/g, (letter) => letter.toUpperCase());
  const matches = catalogDishes.filter((dish) => [dish.country, dish.region, dish.cuisine].some((value) => value.toLowerCase().includes(normalized.toLowerCase())));
  const search = `/explore?q=${encodeURIComponent(normalized)}#explore-controls`;
  return (
    <div className={k.page}>
      <header className={k.toolHeader}>
        <div className={k.toolHeaderInner}>
          <div><p className={k.meta}>{copy(`${type} guide`)}</p><h1>{copy(title)}</h1><p>{copy("Savora distinguishes regional dishes, diaspora variations, disputed origins, and modern adaptations. No cuisine is reduced to a single national stereotype.")}</p></div>
          <div className={k.headerActions}><Link className={k.primary} href={search}>{copy("Search Explore")}</Link><Link className={k.secondary} href="/world-map">{copy("Open the world map")}</Link></div>
        </div>
      </header>
      <div className={k.toolBody}>
        {matches.length ? <><p className={k.meta}>{copy(`${matches.length} featured dishes`)}</p><div className="dish-grid">{matches.map((dish) => <DishCard dish={dish} key={dish.slug} />)}</div></> : <div className={k.empty}><h2>{copy("No featured dishes for this guide yet.")}</h2><p>{copy("The full published archive may still include recipes from this place.")}</p><Link className={k.primary} href={search}>{copy("Search Explore")}</Link></div>}
      </div>
    </div>
  );
}

// Contributor profiles need published community recipes; Savora does not invent cooks or follower counts.
export function CreatorProfile({ slug }: { slug: string }) {
  const copy = useWebsiteCopy();
  void slug;
  return (
    <div className={k.page}>
      <header className={k.toolHeader}><div className={k.toolHeaderInner}><div><h1>{copy("Contributor profiles")}</h1><p>{copy("Profiles will list a cook’s published recipes and sources once community submissions are published.")}</p></div></div></header>
      <div className={k.toolBody}>
        <div className={k.empty}>
          <h2>{copy("This profile is not available yet.")}</h2>
          <p>{copy("Published recipes credit their sources on each recipe page. You can share your own recipe for review.")}</p>
          <div className={k.row}><Link className={k.primary} href="/share">{copy("Share a recipe")}</Link><Link className={k.secondary} href="/explore">{copy("Explore recipes")}</Link></div>
        </div>
      </div>
    </div>
  );
}
