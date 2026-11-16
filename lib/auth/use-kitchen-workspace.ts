"use client";
import { useEffect, useRef, useState } from 'react';
import type { KitchenWorkspace, WorkspaceResponse } from '../../server/node/src/application/personal-kitchen/workspace';
import type { AccountSession } from './account-client';
import { productCall, productError, productSession } from './product-client';
const empty = (): KitchenWorkspace => ({mealPlan:{},groceryChecked:[],pantry:[],collections:[],cookSessions:[]});
export function useKitchenWorkspace() {
  const [workspace,setWorkspace] = useState<WorkspaceResponse>({content:empty(),revision:0});
  const [session,setSession] = useState<AccountSession | null>(null);
  const [mode,setMode] = useState<'loading'|'guest'|'account'|'unavailable'>('loading');
  const lock = useRef(false);
  const [busy,setBusy] = useState(true), [message,setMessage] = useState('Loading kitchen…');
  useEffect(() => {
    let active = true;
    productSession().then(async account => {
      if (!account) { if (active) {setMode('guest');setMessage('Sign in to save this kitchen to your account.');} return; }
      const result = await productCall<WorkspaceResponse>('me/kitchen/workspace');
      const current = await productSession();
      if (!current || current.account.id !== account.account.id) throw new Error('ChangedAccount');
      if (active) { setWorkspace(result); setSession(account);setMode('account'); setMessage('Account kitchen loaded.'); }
    }).catch(e => {if (active) {setMode('unavailable');setMessage(productError(e));}}).finally(() => {if (active) setBusy(false);});
    return () => {active=false;};
  },[]);
  async function save(patch: Partial<KitchenWorkspace>) {
    if (busy || lock.current || mode!=='account') return false;
    lock.current=true;
    setBusy(true);
    try {
      const account = await productSession();
      if (!account || !session || account.account.id !== session.account.id) throw new Error('ChangedAccount');
      const result = await productCall<WorkspaceResponse>('me/kitchen/workspace','POST',{content:{...workspace.content,...patch},expectedRevision:workspace.revision},account);
      setWorkspace(result); setMessage('Saved to your account.'); return true;
    } catch(e) {setMessage(productError(e)); return false;} finally {lock.current=false;setBusy(false);}
  }
  async function reload() {
    if (busy || lock.current) return;
    lock.current=true;
    setBusy(true);
    try {
      const account = await productSession();
      if (!account && !session) {setMode('guest');setMessage('Device kitchen — sign in to save to an account.');return;}
      if (!account || (session && account.account.id !== session.account.id)) {
        setMode('unavailable');
        setMessage('The signed-in account changed. Reload the page before using another account kitchen.'); return;
      }
      const result = await productCall<WorkspaceResponse>('me/kitchen/workspace');
      const current = await productSession();
      if (!current || current.account.id !== account.account.id) throw new Error('ChangedAccount');
      setWorkspace(result); setSession(account);setMode('account'); setMessage('Current account state loaded. Unsaved planner or pantry edits remain available.');
    } catch(e) {setMessage(productError(e));setMode('unavailable');} finally {lock.current=false;setBusy(false);}
  }
  return {workspace,session,mode,busy,message,save,reload};
}
