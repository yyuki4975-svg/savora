"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState, type CSSProperties } from "react";
import { catalogDishes } from "../product-data";
import { productCall, productError, productSession } from "../../lib/auth/product-client";
import styles from "./community-passed-bowl.module.css";
import { SavoraLogoMark } from "../savora-logo";
import { useWebsiteCopy } from "../use-website-copy";
import { localImage } from "../../lib/media/local-media";

type FeedPost = { id: string; author: string; space: string; text: string; recipeSlug: string | null; createdAt: string; helpful: number; replyCount: number; mine: boolean; liked: boolean; saved: boolean };
type Reply = { id: string; author: string; text: string };

// Space names are stored with each post; descriptions are presentation only.
const spaces = [
  { name: "The shared table", description: "Everyday cooking notes, questions and small wins." },
  { name: "Technique exchange", description: "Methods, tools and fixes, compared kitchen to kitchen." },
  { name: "Family recipe circle", description: "Recipes passed down, and the people behind them." },
  { name: "Cookbook club", description: "What you cooked from a book, and how it went." },
];

const imageByDish = new Map(catalogDishes.map((dish) => [dish.slug, dish]));

// Page-specific photography: do not replace approved recipe-detail media.
const communityPhotos: Record<string, { src: string; alt: string }> = {
  rendang: { src: "/images/community/rendang-vina.png", alt: "Beef rendang coated in coconut and spice paste, served in a white bowl with lime leaves." },
  "mapo-tofu": { src: "/images/community/mapo-tofu-zhengzhou.jpg", alt: "Mapo tofu with minced meat and scallions in a black serving bowl at Chen Mapo Tofu." },
};

function Icon({ name }: { name: "heart" | "comment" | "bookmark" | "more" | "pen" }) {
  const paths = {
    heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.7-7.5 1.1-1.1a5.5 5.5 0 0 0 0-7.8Z" />,
    comment: <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />,
    bookmark: <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z" />,
    more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
    pen: <><path d="m15 5 4 4" /><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z" /></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export function CommunityExperience() {
  const copy = useWebsiteCopy();
  const [tab, setTab] = useState("All notes");
  const [space, setSpace] = useState(spaces[0].name);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [cursor, setCursor] = useState<string | null>(null);
  const [recipe, setRecipe] = useState("");
  const [replies, setReplies] = useState<Reply[]>([]);
  const [reply, setReply] = useState("");
  const [reportReason, setReportReason] = useState("");
  const [replyFor, setReplyFor] = useState("");
  const [replyCursor,setReplyCursor] = useState<string | null>(null);
  const [reported, setReported] = useState("");
  const [draft, setDraft] = useState("");
  useEffect(() => {
    let active = true;
    productCall<{items: FeedPost[]; nextCursor: string | null}>(`community/posts?space=${encodeURIComponent(space)}${tab === 'Saved' ? '&saved=true' : ''}`)
      .then(data => { if (active) { setPosts(data.items); setCursor(data.nextCursor); setError(''); } })
      .catch(e => { if (active) { setPosts([]); setCursor(null); setError(productError(e)); } });
    return () => { active = false; };
  }, [space, tab, refresh]);

  const featured = useMemo(() => ["ramen", "butter-chicken", "tacos-al-pastor"].flatMap((slug) => {
    const dish = catalogDishes.find((item) => item.slug === slug);
    return dish ? [dish] : [];
  }), []);

  async function mutate(path: string, method: string, body: unknown) {
    const session = await productSession();
    if (!session) throw new Error('SignIn');
    return productCall(path,method,body,session);
  }
  async function action(operation: () => Promise<unknown>, reload = true) {
    if (busy) return;
    setBusy(true); setError('');
    try { await operation(); if (reload) setRefresh(v => v + 1); }
    catch (e) { setError(productError(e)); }
    finally { setBusy(false); }
  }
  async function loadReplies(id: string, after?: string) {
    const result = await productCall<{items:Reply[];nextCursor:string|null}>(`community/posts/${id}/replies?limit=50${after ? `&after=${after}` : ''}`);
    setReplies(current => after ? [...new Map([...current,...result.items].map(r => [r.id,r])).values()].sort((a,b) => a.id.localeCompare(b.id)) : result.items);
    setReplyCursor(result.nextCursor);setReplyFor(id);
  }
  function publish(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    void action(async () => { await mutate('community/posts','POST',{space,text,recipeSlug:recipe || null}); setDraft(''); });
  }

  const starters = ["Question", "Tip", "Adapted from"];
  function takeSeat(name: string) {
    setSpace(name); setReplyFor('');
    document.getElementById("conversation")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  }
  const activeSpace = spaces.find((item) => item.name === space) ?? spaces[0];

  return (
    <div className={styles.page} data-website-page>
      <section className={styles.hero} aria-labelledby="community-title">
        <div className={styles.heroCopy}>
          <h1 id="community-title" translate="no">{copy("Pull up a chair.", { heading: true })}</h1>
          <p>Ask a cook, compare a technique, or add the detail that turns a recipe into something another kitchen can truly use.</p>
          <div className={styles.heroActions}>
            <a href="#conversation">Join the conversation</a>
            <Link href="/share">Share a full recipe</Link>
          </div>
        </div>
        {/* A long table: the community spaces are the seats, the dishes are what is being discussed. */}
        <div className={styles.longTable}>
          <div className={styles.seats}>
            {spaces.slice(0, 2).map((item) => (
              <button type="button" className={styles.seat} key={item.name} aria-pressed={space === item.name} onClick={() => takeSeat(item.name)}>
                <strong>{item.name}</strong>
                <span>{item.description}</span>
              </button>
            ))}
          </div>
          <div className={styles.tableTop} aria-label="Recipes discussed by the Savora community">
            {featured.map((dish, index) => (
              <Link href={`/dishes/${dish.slug}`} key={dish.slug} className={styles.tablePlate} style={{ "--i": index } as CSSProperties}>
                <span><Image src={dish.image} alt={dish.name} fill preload={index === 0} sizes="(max-width: 760px) 34vw, 15vw" /></span>
              </Link>
            ))}
          </div>
          <div className={styles.seats}>
            {spaces.slice(2).map((item) => (
              <button type="button" className={styles.seat} key={item.name} aria-pressed={space === item.name} onClick={() => takeSeat(item.name)}>
                <strong>{item.name}</strong>
                <span>{item.description}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.community} id="conversation" aria-label="Community conversations">
        <aside className={styles.spaceRail} aria-label="Community spaces">
          <h2 className={styles.railTitle}>Spaces</h2>
          <nav>
            {spaces.map((item) => (
              <button type="button" key={item.name} aria-pressed={space === item.name} onClick={() => { setSpace(item.name); setReplyFor(''); }}>
                <strong>{item.name}</strong>
                <span>{item.description}</span>
              </button>
            ))}
          </nav>
          <div className={styles.spaceNote}>
            <p>Credit the cook. Describe adaptations. Challenge ideas without dismissing people.</p>
            <Link href="/trust#community">Read the guidelines</Link>
          </div>
        </aside>

        <div className={styles.feed}>
          <header className={styles.feedHeader}>
            <div>
              <h2>{space}</h2>
              <p>{activeSpace.description}</p>
            </div>
            <div role="tablist" aria-label="Community feed">
              {["All notes", "Saved"].map((item) => <button role="tab" aria-selected={tab === item} type="button" key={item} onClick={() => {setTab(item);setReplyFor('');}}>{item}</button>)}
            </div>
          </header>

          <form className={styles.composer} onSubmit={publish}>
            <label className={styles.composerText}><span className="sr-only">Write a community note</span><textarea maxLength={4000} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="What did you learn in the kitchen today?" rows={draft ? 4 : 2} data-private /></label>
            <div className={styles.starters} aria-label="Start a note">
              {starters.map((starter) => <button type="button" key={starter} onClick={() => setDraft((current) => current.trim() ? current : `${copy(starter)}: `)}>{starter}</button>)}
            </div>
            <div className={styles.composerRow}>
              <label className={styles.recipePick}><span>Recipe (optional)</span><select value={recipe} onChange={e => setRecipe(e.target.value)}><option value="">No recipe</option>{catalogDishes.map(d => <option key={d.slug} value={d.slug}>{d.name}</option>)}</select></label>
              <small className={styles.count} aria-live="polite">{`${draft.length} / 4000`}</small>
              <button type="submit" disabled={busy || !draft.trim()}><Icon name="pen" /> {busy ? 'Saving…' : 'Post'}</button>
            </div>
          </form>
          {error ? (
            <div className={styles.notice} role="alert">
              <p>{error}</p>
              <div><Link href="/account/login?returnTo=%2Fcommunity">Sign in</Link><button type="button" onClick={() => setRefresh(v => v + 1)}>Reload</button></div>
            </div>
          ) : null}
          {!posts.length && !error ? (
            <div className={styles.empty} role="status">
              <SavoraLogoMark className={styles.emptyMark} />
              <p>No notes in this space yet. Start the conversation.</p>
            </div>
          ) : null}

          <div className={styles.feedList} role="tabpanel" aria-label={`${tab} posts`}>
            {posts.map((post, index) => {
              const key = post.id;
              const dish = post.recipeSlug ? imageByDish.get(post.recipeSlug) : undefined;
              const photo = dish ? communityPhotos[dish.slug] : undefined;
              return (
                <article className={styles.post} key={key} style={{ "--i": Math.min(index, 8) } as CSSProperties}>
                  <header>
                    <span className={styles.avatar} aria-hidden="true">{post.author.slice(0,2).toUpperCase()}</span>
                    <div><h3>{post.author}</h3><p>{new Date(post.createdAt).toLocaleDateString()}</p></div>
                    <button className={styles.iconButton} type="button" aria-label={`More options for ${post.author}`} aria-expanded={reported === key} onClick={() => setReported(reported === key ? "" : key)}><Icon name="more" /></button>
                  </header>
                  {reported === key ? <div className={styles.reportMenu}><label>Report reason<input maxLength={1000} value={reportReason} onChange={e => setReportReason(e.target.value)} /></label><button disabled={busy || !reportReason.trim()} type="button" onClick={() => void action(async () => { await mutate(`community/posts/${key}/reports`,'POST',{reason:reportReason}); setReported(''); setReportReason(''); })}>Send report</button>{post.mine ? <button disabled={busy} type="button" onClick={() => void action(async () => { await mutate(`community/posts/${key}`,'DELETE',{}); setReported(''); })}>Remove my note</button> : null}</div> : null}
                  {post.recipeSlug ? <div className={styles.postMeta}><Link href={`/recipes/${post.recipeSlug}`}>{dish?.name ?? post.recipeSlug.replaceAll('-',' ')}</Link></div> : null}
                  <p className={styles.postText} data-private>{post.text}</p>
                  {dish ? <Link className={styles.postImage} href={`/dishes/${dish.slug}`}><Image src={localImage(photo?.src ?? dish.image)} alt={photo?.alt ?? dish.name} fill sizes="(max-width: 700px) 100vw, 760px" /></Link> : null}
                  <footer>
                    <button disabled={busy} type="button" aria-pressed={post.liked} onClick={() => void action(() => mutate(`community/posts/${key}/marks`,'PUT',{kind:'Helpful',active:!post.liked}))}><Icon name="heart" /> Helpful <span>{post.helpful}</span></button>
                    <button disabled={busy} type="button" aria-expanded={replyFor === key} onClick={() => void action(async () => { if (replyFor === key) { setReplyFor(''); return; } await loadReplies(key); setReply(''); },false)}><Icon name="comment" /> Reply ({post.replyCount})</button>
                    <button disabled={busy} type="button" aria-pressed={post.saved} onClick={() => void action(() => mutate(`community/posts/${key}/marks`,'PUT',{kind:'Saved',active:!post.saved}))}><Icon name="bookmark" /> {post.saved ? "Saved" : "Save"}</button>
                  </footer>
                  {replyFor === key ? <div className={styles.thread}><div>{replies.map(r => <p key={r.id} data-private><strong>{r.author}</strong> {r.text}</p>)}</div>{replyCursor ? <button className={styles.moreReplies} disabled={busy} type="button" onClick={() => void action(() => loadReplies(key,replyCursor),false)}>More replies</button> : null}<form className={styles.reply} onSubmit={event => { event.preventDefault(); void action(async () => { const created = await mutate(`community/posts/${key}/replies`,'POST',{text:reply}) as Reply; setReplies(current => [...new Map([...current,created].map(r => [r.id,r])).values()].sort((a,b) => a.id.localeCompare(b.id))); setReply(''); }); }}><label><span className="sr-only">Reply to {post.author}</span><input maxLength={2000} value={reply} onChange={e => setReply(e.target.value)} placeholder={`Reply to ${post.author}`} data-private /></label><button disabled={busy || !reply.trim()} type="submit">Reply</button></form></div> : null}
                </article>
              );
            })}
          </div>
          {cursor ? <button className={styles.moreNotes} disabled={busy} type="button" onClick={() => void action(async () => { const data = await productCall<{items:FeedPost[];nextCursor:string|null}>(`community/posts?space=${encodeURIComponent(space)}&after=${cursor}${tab === 'Saved' ? '&saved=true' : ''}`); setPosts(current => [...current,...data.items]); setCursor(data.nextCursor); },false)}>More notes</button> : null}
        </div>

      </section>

      <aside className={styles.contextRail} aria-label="Community programs">
          <section className={styles.challenge}>
            <h2>Cook across the Silk Roads</h2>
            <p>Compare how one ingredient changes as it moves between regional kitchens. Share what changed and cite where you learned it.</p>
            <button type="button" onClick={() => { setSpace('Family recipe circle'); document.getElementById('conversation')?.scrollIntoView({block:'start'}); }}>Open the circle</button>
          </section>
          <section className={styles.poll}>
            <h2>What should the next technique clinic cover?</h2>
            <p>Suggest a topic in Technique exchange.</p>
            <button type="button" onClick={() => { setSpace('Technique exchange'); document.getElementById('conversation')?.scrollIntoView({block:'start'}); }}>Open discussion</button>
          </section>
          <section className={styles.trustLegend}>
            <h3>Know what you are reading</h3>
            <dl><div><dt>Editor verified</dt><dd>Method and sources reviewed</dd></div><div><dt>Community note</dt><dd>A cook&apos;s attributed experience</dd></div><div><dt>Adaptation</dt><dd>Changes from a referenced recipe are visible</dd></div></dl>
          </section>
      </aside>
      <details className={styles.photoCredits}>
        <summary>Photo credits</summary>
        <p>Editorial photographs, not uploads by the cooks shown above.</p>
        <ul>
          <li><span translate="no">Rendang — Vina Iasha.</span> <a href="https://commons.wikimedia.org/wiki/File:Rendang.png" target="_blank" rel="noreferrer">Original photograph</a>. <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer" translate="no">CC BY-SA 4.0</a>.</li>
          <li><span translate="no">Mapo tofu — ZhengZhou.</span> <a href="https://commons.wikimedia.org/wiki/File:Chen_Mapo_Tofu.jpg" target="_blank" rel="noreferrer">Original photograph</a>. <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer" translate="no">CC BY-SA 4.0</a>.</li>
        </ul>
        <p>Displayed with responsive crops; source files are unmodified.</p>
      </details>
    </div>
  );
}
