"use client";
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useKitchenWorkspace } from '../lib/auth/use-kitchen-workspace';
import { kitchenEntries, sameKitchenAccount, saveKitchenEntry } from '../lib/auth/kitchen-client';
import { productError } from '../lib/auth/product-client';
import { guestStatuses, kitchenDays, kitchenMeals, planRecipe } from '../lib/auth/kitchen-model.mjs';
import { saveKitchenPlan, type KitchenPlan } from './kitchen-plan-storage';
import { useWebsiteCopy } from './use-website-copy';

export function RecipeKitchenActions({slug,servings=1,devicePlan,cook=true,print=false,className='dish-guide-actions',planning:externalPlanning,onPlanningChange}: {
  slug:string;servings?:number;devicePlan?:KitchenPlan;cook?:boolean;print?:boolean;className?:string;
  planning?:boolean;onPlanningChange?:(open:boolean)=>void;
}) {
  const copy = useWebsiteCopy();
  const cloud = useKitchenWorkspace();
  const [saved,setSaved] = useState(false), [message,setMessage] = useState('');
  const [localPlanning,setLocalPlanning] = useState(false), [day,setDay] = useState('Mon'), [meal,setMeal] = useState('Dinner');
  const planning=externalPlanning ?? localPlanning;
  const setPlanning=onPlanningChange ?? setLocalPlanning;
  const [busy,setBusy] = useState(false), [loadedKey,setLoadedKey] = useState('');
  const contextKey=`${cloud.session?.account.id ?? 'guest'}:${slug}`;
  const loaded=loadedKey===contextKey && ['guest','account'].includes(cloud.mode) && !cloud.busy;
  const operation = useRef(false), epoch = useRef(0);
  // Ignore late reads when a route changes or unmounts (React's documented effect cleanup pattern).
  // https://react.dev/reference/react/useEffect#fetching-data-with-effects
  useEffect(() => {
    const ticket=++epoch.current;
    if (cloud.busy || !['guest','account'].includes(cloud.mode)) return;
    (async () => {
      try {
        if (cloud.session) {
          const rows = await kitchenEntries();
          if (ticket===epoch.current) setSaved(rows.some(r => r.recipeSlug===slug));
        } else {
          // An unavailable account service must never be mistaken for an anonymous kitchen.
          await sameKitchenAccount(null);
          if (ticket===epoch.current) setSaved(Boolean(guestStatuses(localStorage)[slug]));
        }
        if (ticket===epoch.current) setLoadedKey(contextKey);
      } catch(e) { if (ticket===epoch.current) setMessage(productError(e)); }
    })();
    return () => {epoch.current=ticket+1;};
  },[slug,cloud.session,cloud.busy,cloud.mode,contextKey]);
  async function act(kind:'save'|'plan') {
    if (operation.current || !loaded) return;
    operation.current=true;setBusy(true);setMessage('Saving…');
    const ticket=epoch.current;
    try {
      const account = await sameKitchenAccount(cloud.session);
      if (account) {
        // Preserve existing status/notes; Save never doubles as destructive remove.
        if (kind==='plan') planRecipe(cloud.workspace.content,slug,day,meal);
        await saveKitchenEntry(account,slug,servings);
        if (ticket===epoch.current) setSaved(true);
        if (kind==='plan' && !await cloud.save({mealPlan:planRecipe(cloud.workspace.content,slug,day,meal)})) {
          setMessage('Recipe saved, but the meal plan was not confirmed. Reload account state before retrying.');return;
        }
        setMessage(kind==='plan' ? `Planned for ${day} ${meal}. Open the prep list in My Kitchen.` : 'Saved to your account kitchen.');
      } else {
        if (kind==='plan' && !devicePlan) throw new Error('Sign in to use the meal planner for this recipe.');
        const statuses=guestStatuses(localStorage);
        localStorage.setItem('savora-recipe-status',JSON.stringify({...statuses,[slug]:statuses[slug] ?? 'Want to cook'}));
        if (kind==='plan') {
          if (!devicePlan) throw new Error('Sign in to use the meal planner for this recipe.');
          if (!saveKitchenPlan(devicePlan)) throw new Error('Device storage is unavailable.');
        }
        setSaved(true);setMessage(kind==='plan' ? 'Prep list saved on this device only.' : 'Saved on this device only. Sign in for an account kitchen.');
      }
      setPlanning(false);
    } catch(e) {setMessage(e instanceof Error && !(e.name==='ProductFailure') && ['This slot already has a recipe. Change it in the meal planner first.','Sign in to use the meal planner for this recipe.','Device storage is unavailable.'].includes(e.message) ? e.message : productError(e));}
    finally {operation.current=false;setBusy(false);}
  }
  return <div data-private>
    <div className={className} aria-busy={busy || cloud.busy}>
      <button className={saved ? 'saved' : ''} disabled={busy || !loaded} type="button" onClick={() => void act('save')}>{copy(saved ? '♥ Saved' : '♡ Save recipe')}</button>
      <button disabled={busy || !loaded} type="button" onClick={() => setPlanning(!planning)}>{copy('Plan in My Kitchen')}</button>
      {cook ? <Link href={`/cook/${slug}`}>{copy('Start Cook Mode →')}</Link> : null}
      {/* The browser's print dialog also offers "Save as PDF"; print styles live with the recipe page. */}
      {print ? <button type="button" onClick={() => window.print()}>{copy('Print or save as PDF')}</button> : null}
    </div>
    {planning ? <form onSubmit={e => {e.preventDefault();void act('plan');}}>
      {cloud.session ? <><label>{copy('Day')}<select value={day} disabled={busy} onChange={e => setDay(e.target.value)}>{kitchenDays.map(d => <option value={d} key={d}>{copy(d)}</option>)}</select></label><label>{copy('Meal')}<select value={meal} disabled={busy} onChange={e => setMeal(e.target.value)}>{kitchenMeals.map(m => <option value={m} key={m}>{copy(m)}</option>)}</select></label></> : <p>{copy('Save the prep list on this device.')}</p>}
      <button disabled={busy} type="submit">{copy('Confirm plan')}</button><button disabled={busy} type="button" onClick={() => setPlanning(false)}>{copy('Cancel')}</button>
    </form> : null}
    <p role="status">{copy(message || (loaded ? '' : cloud.message))}</p>
    {message ? <Link href="/recipe-box">{copy('My Kitchen →')}</Link> : null}
  </div>;
}
