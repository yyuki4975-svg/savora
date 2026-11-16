"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "./i18n";
import type { SocialRecipeSeed } from "./social-recipe-data";

type SavedState = "Want to cook" | "Cooking" | "Cooked" | "Favorite";

function readLocalStatuses() {
  try {
    return JSON.parse(window.localStorage.getItem("savora-recipe-status") ?? "{}") as Record<string, SavedState>;
  } catch {
    return {};
  }
}

export function CommunityNoteView({ note }: { note: SocialRecipeSeed }) {
  const { t } = useI18n();
  const [saved, setSaved] = useState(false);
  const comparisonKey = note.category === "Dessert"
    ? "note.compareDessert"
    : note.category === "Soup & stew"
      ? "note.compareSoup"
      : note.category === "Seafood"
        ? "note.compareSeafood"
        : "note.compareGeneral";

  useEffect(() => {
    const timer = window.setTimeout(() => setSaved(Boolean(readLocalStatuses()[note.id])), 0);
    return () => window.clearTimeout(timer);
  }, [note.id]);

  async function saveNote() {
    const local = { ...readLocalStatuses(), [note.id]: "Want to cook" as SavedState };
    try { window.localStorage.setItem("savora-recipe-status", JSON.stringify(local)); } catch { /* Local persistence is optional. */ }
    setSaved(true);

    try {
      const response = await fetch("/api/user-state");
      const data = response.ok ? await response.json() as { state?: { recipeStatus?: Record<string, SavedState> } } : null;
      const recipeStatus = { ...(data?.state?.recipeStatus ?? {}), ...local };
      await fetch("/api/user-state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipeStatus }),
      });
    } catch { /* The local save remains available when signed-out or offline. */ }
  }

  return (
    <article className="community-note-page section-shell">
      <header className="community-note-hero">
        <div className="community-note-photo">
          <img src={note.image} alt={`${note.name} food context`} />
          <span>{note.flag} {note.area}</span>
        </div>
        <div>
          <span className="kicker"><i /> {t("note.kicker")}</span>
          <h1>{note.name}</h1>
          <p>{t("note.deck")}</p>
          <div className="community-note-actions">
            <button type="button" onClick={saveNote} disabled={saved}>{saved ? t("note.saved") : t("note.save")}</button>
            <Link href={`/explore?q=${encodeURIComponent(note.name)}#global-explore`}>{t("note.back")} →</Link>
          </div>
        </div>
      </header>

      <div className="community-note-grid">
        <section>
          <p className="community-note-label">{t("note.lookFor")}</p>
          <h2>{note.name}</h2>
          <p>{t("note.summary", { dish: note.name, area: note.area })}</p>
          <blockquote>{t(comparisonKey)}</blockquote>
          <div className="community-discussion-digest">
            <div><p className="community-note-label">{t("note.discussion")}</p><small>{t("note.synthesis")}</small></div>
            {note.discussion.map((item) => <article key={item.title}><h3>{item.title}</h3><p>{item.body}</p></article>)}
          </div>
          <dl>
            <div><dt>{t("library.taste")}</dt><dd>{note.taste}</dd></div>
            <div><dt>{t("library.texture")}</dt><dd>{note.texture}</dd></div>
            <div><dt>{t("library.origin")}</dt><dd>{note.origin}</dd></div>
          </dl>
        </section>
        <aside>
          <p className="community-note-label">{t("note.context")}</p>
          <p>{t("note.contextCopy")}</p>
          <a href={note.sourceUrl} target="_blank" rel="noreferrer">{t("note.source")} · {note.platform} ↗</a>
        </aside>
      </div>
    </article>
  );
}
