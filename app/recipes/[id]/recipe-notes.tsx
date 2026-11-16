"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import type { AccountSession } from "../../../lib/auth/account-client";
import { productCall, productError, productSession } from "../../../lib/auth/product-client";
import { useI18n } from "../../i18n";
import { useWebsiteCopy } from "../../use-website-copy";
import styles from "./recipe-notes.module.css";

type Note = { id: string; author: string; text: string; createdAt: string; helpful: number; replyCount: number };

/**
 * Cooks' notes: Community posts that people linked to this recipe, newest first.
 * Only what signed-in cooks wrote is shown; an empty recipe says so plainly.
 */
export function RecipeNotes({ slug }: { slug: string }) {
  const copy = useWebsiteCopy();
  const { locale } = useI18n();
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [session, setSession] = useState<AccountSession | null | undefined>(undefined);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    productCall<{ items: Note[]; nextCursor: string | null }>(`community/posts?recipe=${slug}&limit=10`)
      .then((data) => { if (active) { setNotes(data.items); setCursor(data.nextCursor); } })
      .catch(() => { if (active) setFailed(true); });
    productSession().then((value) => { if (active) setSession(value); }).catch(() => { if (active) setSession(null); });
    return () => { active = false; };
  }, [slug]);

  async function more() {
    if (!cursor || busy) return;
    setBusy(true);
    try {
      const data = await productCall<{ items: Note[]; nextCursor: string | null }>(`community/posts?recipe=${slug}&limit=10&after=${cursor}`);
      setNotes((items) => [...(items ?? []), ...data.items.filter((note) => !items?.some((item) => item.id === note.id))]);
      setCursor(data.nextCursor);
    } catch { setMessage(copy("Notes could not be loaded right now.")); }
    finally { setBusy(false); }
  }

  async function publish(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;
    setBusy(true); setMessage("");
    try {
      const current = await productSession();
      if (!current) { setSession(null); setMessage(copy("Sign in to add a note.")); return; }
      const created = await productCall<Note>("community/posts", "POST", { space: "The shared table", text, recipeSlug: slug }, current);
      setNotes((items) => [created, ...(items ?? [])]);
      setDraft("");
      setMessage(copy("Your note is posted."));
    } catch (error) { setMessage(copy(productError(error))); }
    finally { setBusy(false); }
  }

  const date = (value: string) => new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric" }).format(new Date(value));
  const returnTo = encodeURIComponent(`/recipes/${slug}#recipe-notes`);

  return (
    <section className={styles.notes} id="recipe-notes" aria-labelledby="recipe-notes-title" data-website-localized>
      <div className={styles.inner}>
        <header>
          <h2 id="recipe-notes-title">{copy("Cooks’ notes")}</h2>
          <p>{copy("Tips, changes and questions from people who cooked this recipe.")}</p>
        </header>
        <div className={styles.body}>
          {failed ? <p className={styles.quiet}>{copy("Notes could not be loaded right now.")}</p> : null}
          {notes && !notes.length ? <p className={styles.quiet}>{copy("No notes yet. If you cook it, tell the next cook what worked.")}</p> : null}
          {notes?.length ? <ol className={styles.list}>
            {notes.map((note) => <li key={note.id}>
              <p className={styles.text} data-private>{note.text}</p>
              <p className={styles.by}><strong data-private>{note.author}</strong> · <time dateTime={note.createdAt}>{date(note.createdAt)}</time>{note.helpful ? <> · {copy(`${note.helpful} found this helpful`)}</> : null}</p>
            </li>)}
          </ol> : null}
          {cursor ? <button className={styles.more} type="button" disabled={busy} onClick={() => void more()}>{copy("More notes")}</button> : null}
          {session ? <form className={styles.form} onSubmit={(event) => void publish(event)}>
            <label><span>{copy("Add your note")}</span><textarea data-private maxLength={4000} rows={3} value={draft} disabled={busy} onChange={(event) => setDraft(event.target.value)} placeholder={copy("What worked, what you changed, or a question for other cooks")} /></label>
            <div><button type="submit" disabled={busy || !draft.trim()}>{copy("Post note")}</button><small>{copy("Notes are public and also appear in Community under your display name.")}</small></div>
          </form> : session === null && !failed ? <p className={styles.signIn}><Link href={`/account/login?returnTo=${returnTo}`}>{copy("Sign in to add a note")}</Link></p> : null}
          <p className={styles.status} role="status">{message}</p>
        </div>
      </div>
    </section>
  );
}
