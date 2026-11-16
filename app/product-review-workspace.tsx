"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { SubmissionResponse, SubmissionEvent } from '../server/node/src/contracts/submissions';
import type { AccountSession } from '../lib/auth/account-client';
import { productCall, productError, productSession } from '../lib/auth/product-client';
import type {CommunityReport as Report} from '../server/node/src/application/community/community';
import { useWebsiteCopy } from './use-website-copy';
const checkNames = ['recipeContent','sourceAttribution','culturalClaims','mediaRights','visualQuality'] as const;
export function ProductReviewWorkspace() {
  const copy = useWebsiteCopy();
  const stateLabel = (state: string) => copy(state === 'InReview' ? 'In review' : state === 'NeedsChanges' ? 'Changes requested' : state);
  const [session,setSession] = useState<AccountSession | null>(null);
  const [submissions,setSubmissions] = useState<SubmissionResponse[]>([]);
  const [reports,setReports] = useState<Report[]>([]);
  const [submissionCursor,setSubmissionCursor] = useState<string | null>(null), [reportCursor,setReportCursor] = useState<string | null>(null);
  const [detail,setDetail] = useState<{submission:SubmissionResponse;events:SubmissionEvent[]} | null>(null);
  const [reason,setReason] = useState(''), [recipeSlug,setRecipeSlug] = useState(''), [placeSlug,setPlaceSlug] = useState(''), [mediaAssetId,setMedia] = useState('');
  const [checks,setChecks] = useState<Record<string,boolean>>({});
  const [busy,setBusy] = useState(false), [message,setMessage] = useState('Loading review queues…');
  const editor = session && ['Editor','Admin'].includes(session.account.role), moderator = session && ['Moderator','Admin'].includes(session.account.role);
  async function refresh(after?: string, kind: 'submissions' | 'reports' = 'submissions') {
    setBusy(true);
    try {
      const current = await productSession();
      if (!current) {setSession(null);setSubmissions([]);setReports([]);setDetail(null);throw new Error('SignIn');}
      if (session && current.account.id !== session.account.id) {setDetail(null);setChecks({});setSubmissions([]);setReports([]);}
      setSession(current);
      if (['Editor','Admin'].includes(current.account.role) && (!after || kind === 'submissions')) {
        const data = await productCall<{items:SubmissionResponse[];nextCursor:string|null}>(`submissions/review-queue${after ? `?after=${after}` : ''}`);
        setSubmissions(rows => after ? [...rows,...data.items] : data.items); setSubmissionCursor(data.nextCursor);
      }
      if (['Moderator','Admin'].includes(current.account.role) && (!after || kind === 'reports')) {
        const data = await productCall<{items:Report[];nextCursor:string|null}>(`community/reports${after ? `?after=${after}` : ''}`);
        setReports(rows => after ? [...rows,...data.items] : data.items); setReportCursor(data.nextCursor);
      }
      setMessage(['Editor','Moderator','Admin'].includes(current.account.role) ? 'Queues loaded.' : 'An editor or moderator role is required. No role is assigned automatically.');
    } catch(e) {setMessage(productError(e));} finally {setBusy(false);}
  }
  useEffect(() => {const timer=window.setTimeout(() => void refresh(),0);return () => window.clearTimeout(timer);},[]);
  async function select(id: string) {
    setBusy(true);
    try {setDetail(await productCall(`submissions/${id}/review`));setChecks({});setReason('');setRecipeSlug('');setPlaceSlug('');setMedia('');}
    catch(e) {setMessage(productError(e));} finally {setBusy(false);}
  }
  async function act(path: string, body: unknown) {
    if (busy) return; setBusy(true);
    try {
      const current = await productSession(); if (!current || current.account.id !== session?.account.id) throw new Error('ChangedAccount');
      await productCall(path,'POST',body,current);
      if (detail) setDetail(await productCall(`submissions/${detail.submission.id}/review`));
      setMessage('Action recorded. Reload the queue to see current work.');
    } catch(e) {setMessage(productError(e));} finally {setBusy(false);}
  }
  return <section className="section-shell moderation-shell" data-private>
    <div className="settings-intro"><h1>{copy('Recipe and community review')}</h1><p>{copy('Review the method, attribution and cultural context before publication.')}</p></div>
    <p role="status">{copy(message)} <button disabled={busy} type="button" onClick={() => void refresh()}>{copy('Reload queues')}</button> <Link href="/account/login?returnTo=%2Fmoderation">{copy('Sign in')}</Link></p>
    {editor ? <section><h2>{copy('Recipe submissions')}</h2>{submissions.length ? submissions.map(item => <button disabled={busy} type="button" key={item.id} onClick={() => void select(item.id)}>{item.content.title} · {stateLabel(item.state)}</button>) : <p>{copy('No submissions waiting.')}</p>}{submissionCursor ? <button disabled={busy} type="button" onClick={() => void refresh(submissionCursor)}>{copy('More submissions')}</button> : null}</section> : null}
    {detail && editor ? <article data-private><h2>{detail.submission.content.title}</h2><p>{detail.submission.content.place} · {stateLabel(detail.submission.state)} {copy('· serves')} {detail.submission.content.servings}</p><p>{detail.submission.content.story}</p>
      {detail.submission.content.details ? <dl>{Object.entries(detail.submission.content.details).filter(([,v]) => v).map(([key,value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl> : null}
      <h3>{copy('Ingredients')}</h3><ul>{detail.submission.content.ingredients.map((i,index) => <li key={index}>{i.quantity} · {i.name}</li>)}</ul><h3>{copy('Method')}</h3><ol>{detail.submission.content.steps.map((s,index) => <li key={index}>{s}</li>)}</ol>
      <h3>{copy('Sources')}</h3><ul>{detail.submission.content.sources.map(source => <li key={source}><a href={source} target="_blank" rel="noreferrer">{source}</a></li>)}</ul>
      <details><summary>{copy('Review history')}</summary>{detail.events.map(e => <p key={e.revision}>{stateLabel(e.to)} · {e.reason ?? copy('Draft saved')}</p>)}</details>
      <label>{copy('Review reason')}<textarea value={reason} maxLength={2000} onChange={e => setReason(e.target.value)} /></label>
      {detail.submission.state === 'Submitted' ? <button disabled={busy} type="button" onClick={() => void act(`submissions/${detail.submission.id}/review`,{action:'claim',reason:null,expectedRevision:detail.submission.revision})}>{copy('Claim review')}</button> : null}
      {detail.submission.state === 'InReview' ? ['request-changes','approve','reject'].map(action => <button disabled={busy || !reason.trim()} key={action} type="button" onClick={() => void act(`submissions/${detail.submission.id}/review`,{action,reason,expectedRevision:detail.submission.revision})}>{copy(action === 'request-changes' ? 'Request changes' : action === 'approve' ? 'Approve' : 'Reject')}</button>) : null}
      {detail.submission.state === 'Approved' && !detail.submission.publication ? <fieldset><legend>{copy('Publish reviewed recipe')}</legend><p>{copy('Use a matching, existing rights-verified asset. Uploads are not enabled.')}</p>
        <label>{copy('Public recipe slug')}<input maxLength={120} value={recipeSlug} onChange={e => setRecipeSlug(e.target.value)} /></label><label>{copy('Existing place slug')}<input maxLength={120} value={placeSlug} onChange={e => setPlaceSlug(e.target.value)} /></label><label>{copy('Verified media asset ID')}<input value={mediaAssetId} onChange={e => setMedia(e.target.value)} /></label>
        {checkNames.map(name => <label key={name}><input type="checkbox" checked={!!checks[name]} onChange={e => setChecks(c => ({...c,[name]:e.target.checked}))} />{copy(({recipeContent:'Method, quantities, equipment and food safety checked',sourceAttribution:'Authorship, permission and source attribution checked',culturalClaims:'Place and cultural claims checked',mediaRights:'Image rights and attribution checked',visualQuality:'Image matches the recipe and is suitable for publication'})[name])}</label>)}
        <button disabled={busy || !recipeSlug || !placeSlug || !mediaAssetId || !reason.trim() || !checkNames.every(n => checks[n])} type="button" onClick={() => void act(`submissions/${detail.submission.id}/publish`,{recipeSlug,placeSlug,mediaAssetId,expectedRevision:detail.submission.revision,reason,checks})}>{copy('Publish recipe')}</button></fieldset> : null}
      {detail.submission.publication ? <Link href={`/recipes/${detail.submission.publication.recipeSlug}`}>{copy('Open published recipe')}</Link> : null}
    </article> : null}
    {moderator ? <section><h2>{copy('Community reports')}</h2><label>{copy('Moderation reason')}<input value={reason} maxLength={1000} onChange={e => setReason(e.target.value)} /></label>{reports.length ? reports.map(report => <article key={report.id} data-private><p>{copy('Reported:')} {report.reason}</p><blockquote>{report.post.text}</blockquote><p>{report.post.author} · {report.post.space}{report.post.hidden ? ` · ${copy('already hidden')}` : ''}</p>{['hide','dismiss'].map(action => <button disabled={busy || !reason.trim()} type="button" key={action} onClick={() => void act(`community/reports/${report.id}`,{action,reason})}>{copy(action === 'hide' ? 'Hide' : 'Dismiss')}</button>)}</article>) : <p>{copy('No unresolved reports.')}</p>}{reportCursor ? <button disabled={busy} type="button" onClick={() => void refresh(reportCursor,'reports')}>{copy('More reports')}</button> : null}</section> : null}
  </section>;
}
