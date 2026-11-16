"use client";
import { useRef, useState } from 'react';
import { productSession, productError } from '../lib/auth/product-client';
import { saveKitchenEntry } from '../lib/auth/kitchen-client';
import { guestStatuses } from '../lib/auth/kitchen-model.mjs';
import { useWebsiteCopy } from './use-website-copy';
export function RecipeSaveButton({slug,name}: {slug:string;name:string}) {
  const copy = useWebsiteCopy();
  const [saved,setSaved]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const lock=useRef(false);
  async function save() {
    if(lock.current) return;lock.current=true;setBusy(true);
    try {
      const session=await productSession();
      if(session) await saveKitchenEntry(session,slug,undefined);
      else {const statuses=guestStatuses(localStorage);localStorage.setItem('savora-recipe-status',JSON.stringify({...statuses,[slug]:statuses[slug] ?? 'Want to cook'}));}
      setSaved(true);setMessage(session ? 'Saved to your account kitchen.' : 'Saved on this device only.');
    } catch(e) {setMessage(productError(e));}finally{lock.current=false;setBusy(false);}
  }
  return <span data-private><button className={saved ? 'save-button is-saved' : 'save-button'} type="button" disabled={busy} aria-label={copy(`Save ${name} to My Kitchen`)} aria-busy={busy} onClick={() => void save()}>{saved ? '♥' : '♡'}</button><span role="status" className="sr-only">{copy(message)}</span>{message && !saved ? <span role="alert">{copy(message)}</span> : null}</span>;
}
