"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { dishes } from "../data";
import { Footer, Header } from "../ui";
import styles from "./share-passed-bowl.module.css";
import { useWebsiteCopy } from "../use-website-copy";
import Link from "next/link";
import { productCall, productSession, productError } from "../../lib/auth/product-client";
import { toSubmission, fromSubmission } from "../../lib/auth/submission-draft.mjs";
import type { SubmissionResponse } from "../../server/node/src/contracts/submissions";

const chapters = ["Your dish", "Place and story", "Recipe", "Photos and safety", "Review"];

type Draft = {
  locale: string;
  servings: number;
  name: string;
  localName: string;
  country: string;
  region: string;
  city: string;
  kind: string;
  story: string;
  ingredients: string;
  steps: string;
  allergens: string;
  dietary: string;
  sources: string;
  rights: boolean;
};

const emptyDraft: Draft = { locale:'en',servings:1,name: "", localName: "", country: "", region: "", city: "", kind: "Traditional recipe", story: "", ingredients: "", steps: "", allergens: "", dietary: "", sources: "", rights: false };

export default function ShareRecipePage() {
  const copy = useWebsiteCopy();
  const [chapter, setChapter] = useState(0);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [hydrated, setHydrated] = useState(false);
  const [saveState, setSaveState] = useState("Saved locally");
  const [submitted, setSubmitted] = useState(false);
  const [preview, setPreview] = useState("");
  const [cloud, setCloud] = useState<SubmissionResponse | null>(null);
  const [cloudDrafts, setCloudDrafts] = useState<SubmissionResponse[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [owner, setOwner] = useState('');
  const [draftCursor, setDraftCursor] = useState<string | null>(null);
  async function listDrafts(after?: string) {
    setBusy(true); setError('');
    try {
      const session = await productSession(); if (!session) { setCloud(null); setCloudDrafts([]); setOwner(''); throw new Error('SignIn'); }
      if (owner && owner !== session.account.id) { setCloud(null); setCloudDrafts([]); setDraft(emptyDraft); setOwner(session.account.id); throw new Error('ChangedAccount'); }
      setOwner(session.account.id);
      const data = await productCall<{items:SubmissionResponse[];nextCursor:string|null}>(`submissions${after ? `?after=${after}` : ''}`);
      setCloudDrafts(current => after ? [...current,...data.items] : data.items); setDraftCursor(data.nextCursor);
    } catch(e) { setError(productError(e)); } finally { setBusy(false); }
  }
  async function saveCloud(submit = false) {
    if (busy) return; setBusy(true); setError('');
    try {
      const session = await productSession(); if (!session) throw new Error('SignIn');
      if (owner && owner !== session.account.id) throw new Error('ChangedAccount');
      setOwner(session.account.id);
      const content = toSubmission(draft);
      let saved = await productCall<SubmissionResponse>(cloud ? `submissions/${cloud.id}` : 'submissions', cloud ? 'PUT' : 'POST', {content,...(cloud ? {expectedRevision:cloud.revision} : {})},session);
      setCloud(saved); setSaveState('Saved to your account');
      if (submit) { saved = await productCall<SubmissionResponse>(`submissions/${saved.id}/submit`,'POST',{expectedRevision:saved.revision},session); setCloud(saved); setSubmitted(true); }
    } catch(e) { setError(e instanceof Error && ['Write each','Each source','Source URLs'].some(v => e.message.startsWith(v)) ? e.message : productError(e)); }
    finally { setBusy(false); }
  }
  async function readCloud(id: string) {
    const session = await productSession();
    if (!session || session.account.id !== owner) throw new Error('ChangedAccount');
    const data = await productCall<{submission:SubmissionResponse;events:{reason:string|null}[]}>(`submissions/${id}`);
    setCloud(data.submission); setDraft(fromSubmission(data.submission.content) as Draft);
    setSubmitted(!['Draft','NeedsChanges'].includes(data.submission.state)); setError(data.events.at(-1)?.reason ?? '');
    setSaveState('Saved to your account');
  }
  async function withdrawCloud() {
    if (!cloud || busy) return;
    setBusy(true); setError('');
    try {
      const session = await productSession(); if (session?.account.id !== owner) throw new Error('ChangedAccount');
      await productCall(`submissions/${cloud.id}/withdraw`,'POST',{expectedRevision:cloud.revision,reason:'Withdrawn by the author'},session);
      await readCloud(cloud.id);
    } catch(e) {setError(productError(e));} finally {setBusy(false);}
  }
  async function resumeCloud(id: string) {
    if (busy) return; setBusy(true); setError('');
    try { await readCloud(id); }
    catch(e) { setError(productError(e)); } finally { setBusy(false); }
  }
  const studioImage = dishes.find((dish) => dish.slug === "carbonara")?.image ?? dishes[0].image;
  const heroDishes = ["mapo-tofu", "paella", "bibimbap"]
    .map((slug) => dishes.find((dish) => dish.slug === slug))
    .filter((dish): dish is (typeof dishes)[number] => Boolean(dish));

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = window.localStorage.getItem("savora-recipe-draft");
        if (stored) setDraft({...emptyDraft,...JSON.parse(stored)} as Draft);
      } catch { /* Device draft is optional. */ }
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hydrated || cloud) return;
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem("savora-recipe-draft", JSON.stringify(draft));
        setSaveState("Saved locally");
      } catch {
        setSaveState("Local save unavailable");
      }
    }, 550);
    return () => window.clearTimeout(timer);
  }, [draft, hydrated, cloud]);

  useEffect(() => () => { if (preview.startsWith("blob:")) URL.revokeObjectURL(preview); }, [preview]);

  const validity = useMemo(() => [
    Boolean(draft.name.trim() && draft.kind),
    Boolean(draft.country.trim() && draft.region.trim()),
    // Same line rules toSubmission enforces, so a chapter is not marked complete only to fail on save.
    checkIngredients(draft.ingredients).items.length >= 3 && !checkIngredients(draft.ingredients).problems.length && lines(draft.steps).length >= 2,
    draft.sources.trim().length >= 10 && !checkSources(draft.sources).problems.length,
    draft.rights,
  ], [draft]);

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    if (hydrated) setSaveState(cloud ? 'Unsaved changes' : 'Saving locally');
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function onFile(file?: File) {
    if (!file) return;
    if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) { setError('Choose a JPG, PNG or WebP under 10 MB.'); return; }
    if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
  }

  function move(next: number) {
    setChapter(Math.min(chapters.length - 1, Math.max(0, next)));
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById("recipe-workspace")?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }

  function showPreview() {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById("draft-preview")?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }

  const ingredientCheck = checkIngredients(draft.ingredients);
  const stepCount = lines(draft.steps).length;
  const sourceCheck = checkSources(draft.sources);
  const cloudState = cloud ? stateLabel(cloud) : null;
  const complete = validity.filter(Boolean).length;

  return (
    <main className={styles.page} data-website-page>
      <Header />

      <section className={styles.shareHero} aria-labelledby="share-title">
        <div className={styles.heroCopy}>
          <h1 id="share-title">Pass your recipe on.</h1>
          <p>Record the dish, where it comes from, and the method that makes it work.</p>
          <a href="#recipe-workspace">Begin recipe</a>
          <dl className={styles.promises}>
            <div><dt>Saved on this device as you write</dt><dd>Nothing leaves this browser until you choose Save to account.</dd></div>
            <div><dt>Reviewed before publishing</dt><dd>Submitting sends a fixed copy to Savora’s editors. Approval is not publication, and you can withdraw it.</dd></div>
            <div><dt>Photos stay on your device</dt><dd>A photo here is a preview only. An editor selects a verified image before publication.</dd></div>
          </dl>
        </div>
        <div className={styles.heroTable} aria-label="Recipes shared across different food cultures">
          {heroDishes.map((dish, index) => (
            <figure key={dish.slug} className={index === 0 ? styles.heroLead : styles.heroTile}>
              <Image src={dish.image} alt={dish.name} fill preload={index === 0} sizes={index === 0 ? "(max-width: 820px) 100vw, 42vw" : "(max-width: 820px) 50vw, 20vw"} />
              <figcaption>{dish.name}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className={styles.workspace} id="recipe-workspace" aria-labelledby="share-workspace-title" data-private>
        <header className={styles.studioBar}>
          <div className={styles.studioTitle}>
            <h2 id="share-workspace-title">{copy("Your recipe")}</h2>
            <p className={styles.saveBadge} data-state={cloud ? "account" : "device"}><span aria-hidden="true" />{copy(cloud ? "Account draft" : "Device draft")}{cloudState ? ` · ${copy(cloudState)}` : null}</p>
          </div>
          <div className={styles.studioActions}>
            <button type="button" onClick={showPreview}><PreviewIcon /> {copy("Preview")}</button>
            <button type="button" onClick={() => move(4)}>{copy("Review draft")}</button>
            <button disabled={busy || (cloud !== null && !['Draft','NeedsChanges'].includes(cloud.state))} type="button" onClick={() => void saveCloud()}>{copy("Save to account")}</button>
          </div>
        </header>

        <div className={styles.accountPanel}>
          <div className={styles.accountActions}>
            <button disabled={busy} type="button" onClick={() => void listDrafts()}>{copy("My submissions")}</button>
            <Link href="/account/login?returnTo=%2Fshare">{copy("Sign in")}</Link>
            {cloud ? <button disabled={busy} type="button" onClick={() => { setCloud(null); setDraft(emptyDraft); setSubmitted(false); setError(''); }}>{copy("New recipe")}</button> : null}
            {busy ? <span role="status" className={styles.busy}>{copy("Saving…")}</span> : null}
          </div>
          {cloudDrafts.length ? (
            <ul className={styles.submissionList} aria-label={copy("My submissions")}>
              {cloudDrafts.map(item => (
                <li key={item.id}>
                  <button disabled={busy} type="button" aria-current={cloud?.id === item.id ? "true" : undefined} onClick={() => void resumeCloud(item.id)}>
                    <strong>{item.content.title}</strong>
                    <span className={styles.stateBadge} data-state={stateLabel(item)}>{copy(stateLabel(item))}</span>
                  </button>
                </li>
              ))}
              {draftCursor ? <li><button className={styles.more} disabled={busy} type="button" onClick={() => void listDrafts(draftCursor)}>{copy("More submissions")}</button></li> : null}
            </ul>
          ) : null}
          {error ? <p className={styles.error} role="alert">{error}</p> : null}
        </div>

        <div className={styles.studioShell}>
          <nav className={styles.chapterNav} data-website-localized aria-label={copy("Recipe contribution chapters")}>
            {chapters.map((item, index) => (
              <button type="button" key={item} aria-label={`${copy(item)}${validity[index] ? copy(", complete") : ""}`} aria-current={chapter === index ? "step" : undefined} onClick={() => move(index)}>
                <span aria-hidden="true">{validity[index] ? "✓" : index + 1}</span><strong>{copy(item)}</strong>
              </button>
            ))}
          </nav>

          <section className={styles.canvas}>
            {submitted ? (
              <section className={styles.success} role="status">
                <h2>{copy(cloudState ?? 'Submitted')}.</h2>
                <p>{copy("Your submitted version is saved to your account.")}</p>
                <div>
                  {cloud?.publication && !cloud.publication.withdrawn ? <Link href={`/recipes/${cloud.publication.recipeSlug}`}>{copy("Open recipe")}</Link> : null}
                  <button disabled={busy} type="button" onClick={() => cloud && void resumeCloud(cloud.id)}>{copy("Refresh status")}</button>
                  {cloud && (['Submitted','InReview'].includes(cloud.state) || (cloud.publication && !cloud.publication.withdrawn)) ? <button disabled={busy} type="button" onClick={() => void withdrawCloud()}>{copy("Withdraw submission")}</button> : null}
                </div>
              </section>
            ) : (
              <section className={styles.editor} aria-live="polite" key={chapter}>
                <fieldset disabled={busy} style={{border:0,padding:0,margin:0,minWidth:0}}><ChapterContent chapter={chapter} draft={draft} update={update} preview={preview} onFile={onFile} copy={copy} ingredientCheck={ingredientCheck} stepCount={stepCount} sourceCheck={sourceCheck} /></fieldset>
                {!validity[chapter] ? <p className={styles.validation} role="status">{copy("Complete the required details before continuing.")}</p> : null}
                <footer>
                  <button type="button" disabled={chapter === 0} onClick={() => move(chapter - 1)}>{copy("Previous")}</button>
                  <span role="status">{copy(saveState)}</span>
                  {chapter < chapters.length - 1
                    ? <button type="button" disabled={!validity[chapter]} onClick={() => move(chapter + 1)}>{copy("Continue")}</button>
                    : <button type="button" disabled={busy || !validity.every(Boolean)} onClick={() => void saveCloud(true)}>{copy("Submit for review")}</button>}
                </footer>
              </section>
            )}
          </section>

          <aside className={styles.preview} id="draft-preview" aria-label={copy("Recipe draft settings and live preview")}>
            <div className={styles.progressRow}>
              <span>{copy(`${complete} of ${chapters.length} chapters complete`)}</span>
              <div className={styles.progress} aria-hidden="true"><span style={{ width: `${(complete / chapters.length) * 100}%` }} /></div>
            </div>

            <section className={styles.previewCard} aria-labelledby="preview-title">
              <div className={styles.previewImage}>
                <Image src={preview || studioImage} alt={preview ? "Selected recipe preview" : "Placeholder dish for the recipe draft"} fill unoptimized={Boolean(preview)} sizes="(max-width: 900px) 100vw, 340px" />
                {!preview ? <span className={styles.placeholderNote}>{copy("Example photo")}</span> : null}
              </div>
              <p className={styles.previewMeta}><span translate="no">{copy(draft.kind)}</span><span data-private>{draft.city || draft.region || draft.country ? ` · ${[draft.city, draft.region, draft.country].filter(Boolean).join(", ")}` : ""}</span></p>
              <h2 id="preview-title" data-private>{draft.name || copy("Your dish title")}</h2>
              {draft.localName ? <h3 data-private>{draft.localName}</h3> : null}
              {draft.story ? <blockquote data-private>{draft.story}</blockquote> : null}
              {ingredientCheck.items.length ? (
                <div className={styles.previewBlock}>
                  <h4>{copy(`Ingredients for ${Number(draft.servings) || 1}`)}</h4>
                  <ul data-private>{ingredientCheck.items.map((item, index) => <li key={index}><b>{item.quantity}</b><span>{item.name}</span></li>)}</ul>
                </div>
              ) : null}
              {stepCount ? (
                <div className={styles.previewBlock}>
                  <h4>{copy("Method")}</h4>
                  <ol data-private>{lines(draft.steps).map((step, index) => <li key={index}>{step}</li>)}</ol>
                </div>
              ) : null}
            </section>
          </aside>
        </div>
      </section>
      <Footer />
    </main>
  );
}

type Copy = (value: string) => string;
type IngredientCheck = { items: { quantity: string; name: string }[]; problems: number[] };
type SourceCheck = { count: number; problems: number[] };

const lines = (value: string) => value.split("\n").map((line) => line.trim()).filter(Boolean);

// The same rules toSubmission applies on save, shown while the cook is still typing.
function checkIngredients(value: string): IngredientCheck {
  const items: IngredientCheck["items"] = [];
  const problems: number[] = [];
  lines(value).forEach((line, index) => {
    const split = line.indexOf("|");
    if (split < 1 || !line.slice(split + 1).trim()) problems.push(index + 1);
    else items.push({ quantity: line.slice(0, split).trim(), name: line.slice(split + 1).trim() });
  });
  return { items, problems };
}

function checkSources(value: string): SourceCheck {
  const all = lines(value);
  const problems = all.flatMap((line, index) => {
    const urls = line.match(/https:\/\/[^\s<>]+/g);
    if (!urls || urls.length !== 1) return [index + 1];
    try { const url = new URL(urls[0]); return url.username || url.password ? [index + 1] : []; } catch { return [index + 1]; }
  });
  return { count: all.length, problems };
}

function stateLabel(item: SubmissionResponse) {
  if (item.publication) return item.publication.withdrawn ? "Withdrawn" : "Published";
  return ({ Draft: "Draft", NeedsChanges: "Needs changes", Submitted: "Submitted", InReview: "In review", Approved: "Approved", Rejected: "Rejected", Withdrawn: "Withdrawn" } as Record<string, string>)[item.state] ?? item.state;
}

function PreviewIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2.8 12s3.2-5.2 9.2-5.2 9.2 5.2 9.2 5.2-3.2 5.2-9.2 5.2S2.8 12 2.8 12Z" /><circle cx="12" cy="12" r="2.4" /></svg>;
}

function ChapterContent({ chapter, draft, update, preview, onFile, copy, ingredientCheck, stepCount, sourceCheck }: { chapter: number; draft: Draft; update: <K extends keyof Draft>(key: K, value: Draft[K]) => void; preview: string; onFile: (file?: File) => void; copy: Copy; ingredientCheck: IngredientCheck; stepCount: number; sourceCheck: SourceCheck }) {
  if (chapter === 0) return <Chapter t={copy} title="Name the dish"><div className={styles.fieldGrid}><Field t={copy} label="Dish name" required><input value={draft.name} onChange={(event) => update("name", event.target.value)} autoComplete="off" placeholder="Mapo tofu" required /></Field><Field t={copy} label="Local name"><input value={draft.localName} onChange={(event) => update("localName", event.target.value)} autoComplete="off" placeholder="麻婆豆腐" /></Field><Field t={copy} label="Recipe type" required><select value={draft.kind} onChange={(event) => update("kind", event.target.value)} required><option value="Traditional recipe">{copy("Traditional recipe")}</option><option value="Regional variation">{copy("Regional variation")}</option><option value="Family recipe">{copy("Family recipe")}</option><option value="Modern adaptation">{copy("Modern adaptation")}</option></select></Field></div></Chapter>;
  if (chapter === 1) return <Chapter t={copy} title="Place it in context" copy="Tell readers where this version comes from."><div className={styles.fieldGrid}><Field t={copy} label="Country" required><input value={draft.country} onChange={(event) => update("country", event.target.value)} autoComplete="country-name" required /></Field><Field t={copy} label="Region" required><input value={draft.region} onChange={(event) => update("region", event.target.value)} required /></Field><Field t={copy} label="City"><input value={draft.city} onChange={(event) => update("city", event.target.value)} /></Field></div><Field t={copy} label="Story"><textarea value={draft.story} onChange={(event) => update("story", event.target.value)} placeholder="Who taught you? When is it eaten? What do readers often misunderstand?" /></Field></Chapter>;
  if (chapter === 2) return <Chapter t={copy} title="Write for the cook" copy="Ingredients: quantity | ingredient, one per line. Add one instruction per line."><div className={styles.fieldGrid}><Field t={copy} label="Servings"><input type="number" min={1} max={100} value={draft.servings} onChange={e => update('servings',Number(e.target.value))} /></Field><Field t={copy} label="Recipe language"><select value={draft.locale} onChange={e => update('locale',e.target.value)}>{[['en','English'],['zh','中文'],['ja','日本語'],['fr','Français'],['it','Italiano'],['es','Español']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field></div><div className={styles.recipeFields}><Field t={copy} label="Ingredients" required hint={<Hint ok={ingredientCheck.items.length >= 3 && !ingredientCheck.problems.length}>{copy(`${ingredientCheck.items.length} ingredients ready`)}{ingredientCheck.problems.length ? ` · ${copy(`Check line ${ingredientCheck.problems.join(", ")}: write quantity | ingredient`)}` : ingredientCheck.items.length < 3 ? ` · ${copy("At least 3 needed")}` : null}</Hint>}><textarea value={draft.ingredients} onChange={(event) => update("ingredients", event.target.value)} placeholder={'400 g | soft tofu\n2 tbsp | doubanjiang\n1 tsp | Sichuan pepper'} required /></Field><Field t={copy} label="Method" required hint={<Hint ok={stepCount >= 2}>{copy(stepCount >= 2 ? `${stepCount} steps` : `${stepCount} of 2 steps needed`)}</Hint>}><textarea value={draft.steps} onChange={(event) => update("steps", event.target.value)} placeholder={'Toast peppercorns until fragrant.\nBuild the sauce over medium heat.\nSimmer the tofu gently for 6 minutes.'} required /></Field></div></Chapter>;
  if (chapter === 3) return <Chapter t={copy} title="Show your sources" copy="Photos are device previews only. An editor selects a verified image before publication."><label className={styles.upload}><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => onFile(event.target.files?.[0])} /><span aria-hidden="true">+</span><strong>{copy(preview ? "Choose another photo" : "Preview a cooking photo")}</strong><small>{copy("JPG, PNG or WebP · 10 MB max")}</small></label><div className={styles.fieldGrid}><Field t={copy} label="Dietary labels"><input value={draft.dietary} onChange={(event) => update("dietary", event.target.value)} placeholder="Vegan adaptation" /></Field><Field t={copy} label="Allergens"><input value={draft.allergens} onChange={(event) => update("allergens", event.target.value)} placeholder="Soy, sesame" /></Field></div><Field t={copy} label="Sources" required hint={sourceCheck.count ? <Hint ok={!sourceCheck.problems.length}>{copy(`${sourceCheck.count - sourceCheck.problems.length} sources ready`)}{sourceCheck.problems.length ? ` · ${copy(`Check line ${sourceCheck.problems.join(", ")}: one full HTTPS link per line`)}` : null}</Hint> : null}><textarea value={draft.sources} onChange={(event) => update("sources", event.target.value)} placeholder="One HTTPS URL per line, with optional title and author" required /></Field></Chapter>;
  return <Chapter t={copy} title="Review the recipe"><div className={styles.reviewSummary}><div><span>{copy("Dish")}</span><strong data-private={Boolean(draft.name) || undefined}>{draft.name || copy("Missing")}</strong></div><div><span>{copy("Place")}</span><strong data-private={Boolean(draft.region || draft.country) || undefined}>{[draft.region, draft.country].filter(Boolean).join(", ") || copy("Missing")}</strong></div><div><span>{copy("Recipe")}</span><strong>{copy(`${ingredientCheck.items.length} ingredients · ${stepCount} steps`)}</strong></div><div><span>{copy("Sources")}</span><strong>{copy(draft.sources ? "Added" : "Missing")}</strong></div></div><label className={styles.rights}><input type="checkbox" checked={draft.rights} onChange={(event) => update("rights", event.target.checked)} /><span>{copy("I have permission to share this content and have clearly marked adaptations and uncertain claims.")}</span></label></Chapter>;
}

function Hint({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return <small className={styles.hint} data-ok={ok ? "true" : "false"}><span aria-hidden="true">{ok ? "✓" : "•"}</span>{children}</small>;
}

function Chapter({ title, copy, t, children }: { title: string; copy?: string; t: Copy; children: React.ReactNode }) {
  return <div className={styles.chapter}><h2 className={styles.chapterTitle}>{t(title)}</h2>{copy ? <p className={styles.chapterLead}>{t(copy)}</p> : null}{children}</div>;
}

function Field({ label, required, hint, t, children }: { label: string; required?: boolean; hint?: React.ReactNode; t: Copy; children: React.ReactNode }) {
  return <label className={styles.field}><span>{t(label)}{required ? <em aria-label="required">*</em> : null}</span>{children}{hint}</label>;
}
