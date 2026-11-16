"use client";
import { useEffect, useState } from 'react';
import { kitchenEntries, sameKitchenAccount } from '../lib/auth/kitchen-client';
import { productError } from '../lib/auth/product-client';
import type { AccountSession } from '../lib/auth/account-client';
import type { RecipeDetail } from '../lib/api/savora-client';
import type { KitchenPlan } from './kitchen-plan-storage';
import { equipmentLabel, recipeEquipment } from './recipe-presentation';
import { curatedRecipeDetails } from './curated-recipe-details';
import { publicRecipeMedia } from '../lib/api/media-reference';
const emptyPlans:KitchenPlan[]=[];
export function useKitchenPrep(session:AccountSession|null, plan:Record<string,string>) {
  const [result,setResult]=useState<{key:string;plans:KitchenPlan[];error:string}>({key:'',plans:[],error:''});
  const slugs=JSON.stringify([...new Set(Object.values(plan))]);
  const key=`${session?.account.id ?? ''}:${slugs}`;
  useEffect(() => {
    let active=true;const controller=new AbortController();
    if(!session) return;
    (async () => {
      try {
        await sameKitchenAccount(session);
        const entries=await kitchenEntries(), results:KitchenPlan[]=[];
        // Bounded to 21 weekly slots; sequential public reads, no third-party/model calls.
        for (const slug of JSON.parse(slugs) as string[]) {
          const response=await fetch(`/api/catalog/recipes/${encodeURIComponent(slug)}?locale=en`,{signal:controller.signal,cache:'no-store'});
          if(!response.ok) throw new Error('PrepUnavailable');
          const recipe=await response.json() as RecipeDetail;
          const servings=entries.find(r => r.recipeSlug===slug)?.servings ?? 1;
          const ratio=servings/Number(recipe.servings);
          const image=publicRecipeMedia(recipe.primaryMedia);
          results.push({slug,dish:recipe.title,image:image ?? '',servings,
            ingredients:recipe.ingredients.map(i => ({amount:i.quantity===null ? null : Number(i.quantity)*ratio,unit:i.unit ?? '',name:i.preparationNote ? `${i.name}, ${i.preparationNote}` : i.name})),
            equipment:curatedRecipeDetails[slug]?.equipment ?? recipeEquipment(recipe.steps.map(s => s.instruction),recipe.ingredients.map(i => i.preparationNote ?? '')).map(i => equipmentLabel(i,'en')),
            updatedAt:new Date().toISOString(),
          });
        }
        if(active) {
          await sameKitchenAccount(session);
          if(active) setResult({key,plans:results,error:''});
        }
      } catch(e) {if(active) setResult({key,plans:[],error:e instanceof Error && e.message==='PrepUnavailable' ? 'A planned recipe is unavailable. No partial prep list is shown; reload to retry.' : productError(e)});}
    })();
    return () => {active=false;controller.abort();};
  },[session,slugs,key]);
  return result.key===key && session ? {plans:result.plans,error:result.error} : {plans:emptyPlans,error:''};
}
