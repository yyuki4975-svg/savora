"use client";
import { useRef, useState } from 'react';
import Link from 'next/link';
import { useKitchenWorkspace } from '../lib/auth/use-kitchen-workspace';
import { sameKitchenAccount, saveKitchenEntry } from '../lib/auth/kitchen-client';
import { cookProgress } from '../lib/auth/kitchen-model.mjs';
import { productError } from '../lib/auth/product-client';
import { useWebsiteCopy } from './use-website-copy';
export function CookKitchenControls({slug,step,completed,note,stepCount,onResume,className}: {
  slug:string;className?:string;step:number;completed:boolean;note:string;stepCount:number;
  onResume:(saved:{step:number;completed:boolean}) => void;
}) {
  const copy = useWebsiteCopy();
  const cloud=useKitchenWorkspace(), lock=useRef(false);
  const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const saved=cloud.workspace.content.cookSessions.find(s => s.recipeSlug===slug);
  async function save() {
    if (lock.current || cloud.busy || !['guest','account'].includes(cloud.mode)) return;lock.current=true;setBusy(true);
    try {
      const account=await sameKitchenAccount(cloud.session);
      if (!account) {
        localStorage.setItem(`savora-cook-${slug}`,JSON.stringify({step,completed}));
        setMessage('Progress saved on this device only. Notes are not stored.');return;
      }
      // Persist step/status only on an explicit action, never with every timer tick.
      await saveKitchenEntry(account,slug,undefined,completed ? 'Cooked' : 'Cooking',note || undefined);
      const ok=await cloud.save({cookSessions:cookProgress(cloud.workspace.content.cookSessions,slug,step,completed,stepCount)});
      setMessage(ok ? 'Cooking progress saved to your account.' : 'Recipe status saved, but progress was not confirmed. Reload before retrying.');
    } catch(e) {setMessage(productError(e));} finally {lock.current=false;setBusy(false);}
  }
  async function resume() {
    if (cloud.busy || busy || !['guest','account'].includes(cloud.mode)) return;
    setBusy(true);
    try {
      await sameKitchenAccount(cloud.session);
      const progress=cloud.session ? saved : JSON.parse(localStorage.getItem(`savora-cook-${slug}`) ?? 'null');
      if (!progress || !Number.isInteger(progress.step) || progress.step<0 || progress.step>=stepCount || typeof progress.completed!=='boolean') {setMessage('No valid saved progress for this recipe.');return;}
      onResume(progress);setMessage('Saved progress loaded.');
    } catch(e) {setMessage(productError(e));} finally {setBusy(false);}
  }
  return <section className={className} data-private aria-label={copy('Kitchen cooking progress')} aria-busy={busy || cloud.busy}>
    <button disabled={busy || cloud.busy || !['guest','account'].includes(cloud.mode)} type="button" onClick={() => void save()}>{copy('Save cooking progress')}</button>
    <button disabled={busy || cloud.busy || !['guest','account'].includes(cloud.mode)} type="button" onClick={() => void resume()}>{copy('Resume saved progress')}</button>
    <Link href="/recipe-box">{copy('My Kitchen')}</Link><p role="status">{copy(message || cloud.message)}</p>
  </section>;
}
