"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useKitchenWorkspace } from '../lib/auth/use-kitchen-workspace';
import { kitchenEntries } from '../lib/auth/kitchen-client';
import { productError } from '../lib/auth/product-client';
import { collectionRecipes } from '../lib/auth/kitchen-model.mjs';
import type { KitchenEntryResponse } from '../server/node/src/contracts/kitchen';
import { slugTitle, useRecipeSummaries } from './kitchen-shell';
import { useWebsiteCopy } from './use-website-copy';
import k from './kitchen-passed-bowl.module.css';
export function KitchenCollections() {
  const copy=useWebsiteCopy();
  const cloud=useKitchenWorkspace();
  const [name,setName]=useState(''), [entries,setEntries]=useState<KitchenEntryResponse[]>([]), [message,setMessage]=useState('');
  const summaries=useRecipeSummaries(cloud.workspace.content.collections.flatMap(c => c.recipes));
  useEffect(() => {
    let active=true;
    if (cloud.session) kitchenEntries().then(rows => {if(active)setEntries(rows);}).catch(e => {if(active)setMessage(productError(e));});
    return () => {active=false;};
  },[cloud.session]);
  async function create() {
    const title=name.trim();
    if (!title || cloud.workspace.content.collections.some(c => c.name===title)) {setMessage('Use a unique collection name.');return;}
    if(await cloud.save({collections:[...cloud.workspace.content.collections,{name:title,recipes:[]}]})) setName('');
  }
  return <div className={k.page}><section className={k.collections} data-private aria-labelledby="kitchen-collections">
    <header><h2 id="kitchen-collections">{copy('Collections')}</h2><p role="status" className={k.meta}>{copy(message || cloud.message)}</p></header>
    {cloud.mode==='account' ? <>
      <form className={k.addRow} onSubmit={e => {e.preventDefault();void create();}}><label><span>{copy('Collection name')}</span><input maxLength={80} value={name} disabled={cloud.busy} onChange={e => setName(e.target.value)} placeholder={copy('Weeknight dinners')} /></label><button className={k.primary} disabled={cloud.busy || cloud.workspace.content.collections.length>=20} type="submit">{copy('Create collection')}</button></form>
      {cloud.workspace.content.collections.length ? <div className={k.collectionGrid}>{cloud.workspace.content.collections.map(c => <article key={c.name}>
        <h3>{c.name}<small>{copy(`${c.recipes.length} recipes`)}</small></h3>
        {c.recipes.length ? <ul>{c.recipes.map(slug => <li key={slug}><Link href={`/recipes/${slug}`}>{summaries[slug]?.title ?? slugTitle(slug)}</Link><button className={k.quiet} disabled={cloud.busy} type="button" onClick={() => void cloud.save({collections:collectionRecipes(cloud.workspace.content.collections,c.name,slug,false)})}>{copy('Remove from collection')}</button></li>)}</ul> : <p className={k.meta}>{copy('Add recipes you have saved to your account kitchen.')}</p>}
        <label className={k.field}><span>{copy('Add a saved recipe')}</span><select disabled={cloud.busy || c.recipes.length>=100} value="" onChange={e => {if(e.target.value)void cloud.save({collections:collectionRecipes(cloud.workspace.content.collections,c.name,e.target.value,true)});}}><option value="">{copy('Choose a recipe')}</option>{entries.filter(r => !c.recipes.includes(r.recipeSlug)).map(r => <option value={r.recipeSlug} key={r.recipeSlug}>{r.recipeSlug.replaceAll('-',' ')}</option>)}</select></label>
        <button className={k.quietDanger} disabled={cloud.busy} type="button" onClick={() => {if(window.confirm(`Delete the collection “${c.name}”? Saved recipes will be kept.`))void cloud.save({collections:cloud.workspace.content.collections.filter(item => item.name!==c.name)});}}>{copy('Delete collection')}</button>
      </article>)}</div> : null}
    </> : <div className={k.empty}><p>{copy('Collections group saved recipes in your account kitchen.')}</p><Link className={k.primary} href="/account/login?returnTo=%2Frecipe-box">{copy('Sign in to use collections')}</Link></div>}
  </section></div>;
}
