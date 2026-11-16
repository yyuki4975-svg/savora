"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import styles from "./themealdb-review.module.css";

export type TheMealDbReviewRecord = {
  recipeId: string;
  recipeSlug: string;
  recipeTitle: string;
  category: string | null;
  area: string | null;
  imageUrl: string;
  sourceUrl: string;
  ingredients: Array<{ name: string; measure: string | null }>;
  imageKind?: "Inherited" | "Generated";
};

type Decision = "VisuallyAccepted" | "Rejected" | "NeedsReplacement";
type Filter = "All" | "Unreviewed" | "Accepted" | "Rejected" | "Replacement";
type ReviewState = { decision: Decision; note: string; reviewedAt: string };

const pageSize = 24;
const decisions = new Set<Decision>(["VisuallyAccepted", "Rejected", "NeedsReplacement"]);

function ExternalArrow() {
  return <svg aria-hidden="true" viewBox="0 0 20 20"><path d="M7 4h9v9M16 4 8.5 11.5M14 11v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4" /></svg>;
}

function DownloadIcon() {
  return <svg aria-hidden="true" viewBox="0 0 20 20"><path d="M10 3v9m0 0 3.5-3.5M10 12 6.5 8.5M4 15.5h12" /></svg>;
}

function storedReviews(batchId: string, allowedIds: Set<string>) {
  try {
    const raw = window.localStorage.getItem(`savora-themealdb-review:${batchId}`);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const safe: Record<string, ReviewState> = {};
    for (const [id, value] of Object.entries(parsed)) {
      if (!allowedIds.has(id) || !value || typeof value !== "object" || Array.isArray(value)) continue;
      const item = value as Partial<ReviewState>;
      if (!decisions.has(item.decision as Decision)) continue;
      safe[id] = {
        decision: item.decision as Decision,
        note: typeof item.note === "string" ? item.note.slice(0, 1000) : "",
        reviewedAt: typeof item.reviewedAt === "string" && !Number.isNaN(Date.parse(item.reviewedAt))
          ? item.reviewedAt
          : new Date(0).toISOString(),
      };
    }
    return safe;
  } catch {
    return {};
  }
}

function decisionLabel(decision?: Decision) {
  if (decision === "VisuallyAccepted") return "Visual fit accepted";
  if (decision === "Rejected") return "Rejected";
  if (decision === "NeedsReplacement") return "Needs replacement";
  return "Awaiting review";
}

export function TheMealDbReviewWorkspace({
  batchId,
  sourceRevision,
  records,
  mode = "catalog",
}: {
  batchId: string;
  sourceRevision: string;
  records: TheMealDbReviewRecord[];
  mode?: "catalog" | "replacement";
}) {
  const isReplacementReview = mode === "replacement";
  const [filter, setFilter] = useState<Filter>("Unreviewed");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [reviews, setReviews] = useState<Record<string, ReviewState>>({});
  const [hydrated, setHydrated] = useState(false);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [announcement, setAnnouncement] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLocaleLowerCase());
  const allowedIds = useMemo(() => new Set(records.map((record) => record.recipeId)), [records]);

  useEffect(() => {
    // Client-only boundary: non-sensitive visual review decisions stay in this browser.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReviews(storedReviews(batchId, allowedIds));
    setHydrated(true);
  }, [allowedIds, batchId]);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(`savora-themealdb-review:${batchId}`, JSON.stringify(reviews));
  }, [batchId, hydrated, reviews]);

  const counts = useMemo(() => ({
    accepted: records.filter((record) => reviews[record.recipeId]?.decision === "VisuallyAccepted").length,
    rejected: records.filter((record) => reviews[record.recipeId]?.decision === "Rejected").length,
    replacement: records.filter((record) => reviews[record.recipeId]?.decision === "NeedsReplacement").length,
  }), [records, reviews]);
  const completed = counts.accepted + counts.rejected + counts.replacement;

  const filteredRecords = useMemo(() => records.filter((record) => {
    const decision = reviews[record.recipeId]?.decision;
    if (filter === "Unreviewed" && decision) return false;
    if (filter === "Accepted" && decision !== "VisuallyAccepted") return false;
    if (filter === "Rejected" && decision !== "Rejected") return false;
    if (filter === "Replacement" && decision !== "NeedsReplacement") return false;
    if (!deferredQuery) return true;
    return [record.recipeId, record.recipeTitle, record.category, record.area, ...record.ingredients.map((item) => item.name)]
      .filter(Boolean)
      .some((value) => value!.toLocaleLowerCase().includes(deferredQuery));
  }), [deferredQuery, filter, records, reviews]);

  const pageCount = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleRecords = filteredRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function choose(record: TheMealDbReviewRecord, decision: Decision) {
    setReviews((current) => ({
      ...current,
      [record.recipeId]: {
        decision,
        note: current[record.recipeId]?.note ?? "",
        reviewedAt: new Date().toISOString(),
      },
    }));
    setAnnouncement(`${record.recipeTitle}: ${decisionLabel(decision)}. Saved in this browser only.`);
  }

  function updateNote(record: TheMealDbReviewRecord, note: string) {
    setReviews((current) => {
      const previous = current[record.recipeId];
      if (!previous) return current;
      return { ...current, [record.recipeId]: { ...previous, note: note.slice(0, 1000) } };
    });
  }

  function clearDecision(record: TheMealDbReviewRecord) {
    setReviews((current) => {
      const next = { ...current };
      delete next[record.recipeId];
      return next;
    });
    setAnnouncement(`${record.recipeTitle}: returned to awaiting review.`);
  }

  function exportReview() {
    const reviewedRecords = records.flatMap((record) => {
      const review = reviews[record.recipeId];
      return review ? [{
        recipeId: record.recipeId,
        recipeSlug: record.recipeSlug,
        mediaExternalId: `themealdb:${record.recipeId}:primary`,
        imageUrl: record.imageUrl,
        ...review,
      }] : [];
    });
    const payload = {
      schemaVersion: 1,
      batchId,
      sourceRevision,
      exportedAt: new Date().toISOString(),
      scope: "VisualFitOnly",
      rightsStatus: "Pending",
      summary: { total: records.length, reviewed: reviewedRecords.length, ...counts },
      decisions: reviewedRecords,
    };
    const href = URL.createObjectURL(new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `${batchId}-visual-review.json`;
    anchor.click();
    URL.revokeObjectURL(href);
    setAnnouncement(`Exported ${reviewedRecords.length} visual decisions. PostgreSQL was not changed.`);
  }

  function showFilter(nextFilter: Filter) {
    setFilter(nextFilter);
    setPage(1);
  }

  return <>
    <section className={`section-shell ${styles.hero}`}>
      <div>
        <span className="kicker"><i /> {isReplacementReview ? "ImageGen replacement review" : "TheMealDB visual review"}</span>
        <h1>{isReplacementReview ? "Review the new image, not the old compromise." : "Judge the image against the food."}</h1>
        <p>{isReplacementReview
          ? "Review the 21 gpt-image-2 replacements generated from each recipe's ingredients and method. This queue has its own decisions and does not alter the original 790-image review."
          : "Review all 790 inherited recipe images in manageable pages. A visual acceptance confirms only that the photograph plausibly matches the recipe—not that publishing rights are cleared."}</p>
      </div>
      <aside className={styles.guardrail} aria-label="Review guardrails">
        <span>Visual fit only</span>
        <strong>{isReplacementReview ? "Generated does not mean approved." : "Images remain rights-pending."}</strong>
        <p>{isReplacementReview
          ? "Accept only clear, appetizing images that accurately represent the named dish. Decisions stay in this browser until exported."
          : "Decisions are stored in this browser and can be exported. This page cannot publish or write to PostgreSQL."}</p>
      </aside>
    </section>

    <section className={`section-shell ${styles.shell}`}>
      <div className={styles.summary} aria-label="Review progress">
        <div><strong>{records.length}</strong><span>Total images</span></div>
        <div><strong>{completed}</strong><span>Reviewed</span></div>
        <div><strong>{counts.accepted}</strong><span>Accepted</span></div>
        <div><strong>{records.length - completed}</strong><span>Remaining</span></div>
      </div>

      <div className={styles.toolbar}>
        <label className={styles.search}>
          <span>Search recipes or ingredients</span>
          <input
            type="search"
            value={query}
            onChange={(event) => { setQuery(event.target.value); setPage(1); }}
            placeholder="e.g. chicken, Japanese, 52772"
          />
        </label>
        <button className={styles.exportButton} type="button" onClick={exportReview}><DownloadIcon /> Export reviewed JSON</button>
      </div>

      <div className={styles.filters} aria-label="Filter image review queue">
        {(["All", "Unreviewed", "Accepted", "Rejected", "Replacement"] as Filter[]).map((item) => (
          <button key={item} type="button" aria-pressed={filter === item} onClick={() => showFilter(item)}>{item}</button>
        ))}
        <span>{filteredRecords.length} shown · {Math.min(pageSize, records.length)} images per page</span>
      </div>

      {visibleRecords.length > 0 ? <div className={styles.grid}>
        {visibleRecords.map((record) => {
          const review = reviews[record.recipeId];
          const imageFailed = failedImages.has(record.recipeId);
          return <article className={styles.card} key={record.recipeId} data-decision={review?.decision ?? "AwaitingReview"}>
            <a className={styles.imageLink} href={record.imageUrl} target="_blank" rel="noreferrer" aria-label={`Open full image for ${record.recipeTitle}`}>
              {imageFailed ? <span className={styles.imageFailure}>Image could not be loaded.<small>Open the original to retry.</small></span> :
                // Image paths are validated on the server; the current page is bounded to 24 images.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={record.imageUrl}
                  alt={`${record.recipeTitle} ${record.imageKind === "Generated" ? "generated replacement" : "candidate from TheMealDB"}`}
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  onError={() => setFailedImages((current) => new Set(current).add(record.recipeId))}
                />}
              <span>{record.imageKind === "Generated" ? "Open generated" : "Open original"} <ExternalArrow /></span>
            </a>
            <div className={styles.cardBody}>
              <div className={styles.cardMeta}><span>{record.area || "Area unspecified"}</span><span>{record.category || "Category unspecified"}</span><span>ID {record.recipeId}</span></div>
              <h2>{record.recipeTitle}</h2>
              <p><strong>Key ingredients</strong>{record.ingredients.slice(0, 5).map((ingredient) => ingredient.name).join(", ")}</p>
              <a className={styles.sourceLink} href={record.sourceUrl} target="_blank" rel="noreferrer">Open recipe source <ExternalArrow /></a>
              <div className={styles.status}><span>{decisionLabel(review?.decision)}</span><small>Rights pending</small></div>
              <div className={styles.actions} aria-label={`Review ${record.recipeTitle}`}>
                <button type="button" aria-pressed={review?.decision === "VisuallyAccepted"} onClick={() => choose(record, "VisuallyAccepted")}>Accept visual</button>
                <button type="button" aria-pressed={review?.decision === "Rejected"} onClick={() => choose(record, "Rejected")}>Reject</button>
                <button type="button" aria-pressed={review?.decision === "NeedsReplacement"} onClick={() => choose(record, "NeedsReplacement")}>Replace</button>
              </div>
              {review ? <details className={styles.notes}>
                <summary>Add note or revise decision</summary>
                <label><span>Review note</span><textarea value={review.note} maxLength={1000} onChange={(event) => updateNote(record, event.target.value)} /></label>
                <button type="button" onClick={() => clearDecision(record)}>Return to unreviewed</button>
              </details> : null}
            </div>
          </article>;
        })}
      </div> : <div className={styles.empty}><strong>No images match this view.</strong><button type="button" onClick={() => { setQuery(""); showFilter("All"); }}>Show all images</button></div>}

      <nav className={styles.pagination} aria-label="Image review pages">
        <button type="button" disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button>
        <span>Page <strong>{currentPage}</strong> of {pageCount}</span>
        <button type="button" disabled={currentPage >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>Next</button>
      </nav>

      <div className={styles.footerNote}><Link href="/admin/assets">Back to asset library</Link><span>Snapshot: {sourceRevision}</span></div>
      <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
    </section>
  </>;
}
