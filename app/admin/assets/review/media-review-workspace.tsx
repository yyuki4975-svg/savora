"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import styles from "./media-review.module.css";

type CandidateAsset = {
  sourceType: "External" | "Generated";
  title: string;
  provider: string;
  providerId: string;
  creator: string;
  licenseCode: string;
  rightsStatus: "Pending";
  licenseUrl: string;
  landingPageUrl: string | null;
  originalUrl: string;
  width: number;
  height: number;
  sha256: string | null;
  generatedAt: string | null;
  generationPromptSummary: string | null;
  altTextDraft: string;
};

type ReviewRecordCommon = {
  recipeSlug: string;
  recipeTitle: string;
  summary: string;
  sourceUrl: string;
  servings: number;
  preparationMinutes: number | null;
  cookingMinutes: number | null;
  ingredients: string[];
  steps: string[];
  searchQuery: string;
  visualReviewState: "Accepted" | "AwaitingReview";
};

export type MediaReviewRecord = ReviewRecordCommon & (
  | {
    status: "Candidate";
    confidence: string;
    matchRationale: string;
    warnings: string[];
    candidate: CandidateAsset;
  }
  | {
    status: "NoSuitableMatch";
    reviewNote: string;
    candidate: null;
  }
);

type CheckKey = "recipe" | "visual" | "rights" | "quality";
type Decision = "VisuallyAccepted" | "Rejected" | "ConfirmedNoMatch" | "NeedsReplacement";
type Filter = "All" | "Candidates" | "No match" | "Unreviewed" | "Completed";

type ReviewBatchLink = {
  href: string;
  label: string;
  active: boolean;
};

type ReviewState = {
  checks: Record<CheckKey, boolean>;
  decision?: Decision;
  note: string;
};

const emptyChecks: ReviewState["checks"] = {
  recipe: false,
  visual: false,
  rights: false,
  quality: false,
};

const decisions: Decision[] = ["VisuallyAccepted", "Rejected", "ConfirmedNoMatch", "NeedsReplacement"];

function ExternalArrow() {
  return <svg aria-hidden="true" viewBox="0 0 20 20"><path d="M7 4h9v9M16 4 8.5 11.5M14 11v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4" /></svg>;
}

function DownloadIcon() {
  return <svg aria-hidden="true" viewBox="0 0 20 20"><path d="M10 3v9m0 0 3.5-3.5M10 12 6.5 8.5M4 15.5h12" /></svg>;
}

function storedReviews(batchId: string, recipeSlugs: Set<string>): Record<string, ReviewState> {
  try {
    const raw = window.localStorage.getItem(`savora-media-review:${batchId}`);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    const safe: Record<string, ReviewState> = {};
    for (const [slug, value] of Object.entries(parsed)) {
      if (!recipeSlugs.has(slug) || !value || typeof value !== "object" || Array.isArray(value)) continue;
      const item = value as Partial<ReviewState>;
      const checks = item.checks;
      if (!checks || typeof checks !== "object") continue;
      const decision = decisions.includes(item.decision as Decision) ? item.decision : undefined;
      safe[slug] = {
        checks: {
          recipe: checks.recipe === true,
          visual: checks.visual === true,
          rights: checks.rights === true,
          quality: checks.quality === true,
        },
        decision,
        note: typeof item.note === "string" ? item.note.slice(0, 2000) : "",
      };
    }
    return safe;
  } catch {
    return {};
  }
}

function decisionLabel(decision?: Decision) {
  switch (decision) {
    case "VisuallyAccepted": return "Visual match accepted";
    case "Rejected": return "Candidate rejected";
    case "ConfirmedNoMatch": return "No match confirmed";
    case "NeedsReplacement": return "Replacement needed";
    default: return "Awaiting review";
  }
}

function recordStateLabel(record: MediaReviewRecord, decision?: Decision) {
  if (decision) return decisionLabel(decision);
  return record.visualReviewState === "Accepted"
    ? "Visual accepted · rights pending"
    : "New image awaiting review";
}

export function MediaReviewWorkspace({
  batchId,
  batchLabel,
  batchLinks,
  records,
}: {
  batchId: string;
  batchLabel: string;
  batchLinks: ReviewBatchLink[];
  records: MediaReviewRecord[];
}) {
  const [filter, setFilter] = useState<Filter>("All");
  const [activeSlug, setActiveSlug] = useState(records[0]?.recipeSlug ?? "");
  const [reviews, setReviews] = useState<Record<string, ReviewState>>({});
  const [hydrated, setHydrated] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const recipeSlugs = useMemo(() => new Set(records.map((record) => record.recipeSlug)), [records]);

  useEffect(() => {
    // This is the client-only hydration boundary for non-sensitive local review state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReviews(storedReviews(batchId, recipeSlugs));
    setHydrated(true);
  }, [batchId, recipeSlugs]);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(`savora-media-review:${batchId}`, JSON.stringify(reviews));
  }, [batchId, hydrated, reviews]);

  const visibleRecords = records.filter((record) => {
    const decision = reviews[record.recipeSlug]?.decision;
    if (filter === "Candidates") return record.status === "Candidate";
    if (filter === "No match") return record.status === "NoSuitableMatch";
    if (filter === "Unreviewed") return !decision;
    if (filter === "Completed") return Boolean(decision);
    return true;
  });
  const activeRecord = visibleRecords.find((record) => record.recipeSlug === activeSlug) ?? visibleRecords[0];
  const completed = records.filter((record) => reviews[record.recipeSlug]?.decision).length;
  const candidateCount = records.filter((record) => record.status === "Candidate").length;

  function currentState(slug: string): ReviewState {
    return reviews[slug] ?? { checks: { ...emptyChecks }, note: "" };
  }

  function updateCheck(slug: string, key: CheckKey, checked: boolean) {
    setReviews((current) => {
      const previous = current[slug] ?? { checks: { ...emptyChecks }, note: "" };
      return { ...current, [slug]: { ...previous, checks: { ...previous.checks, [key]: checked } } };
    });
  }

  function updateNote(slug: string, note: string) {
    setReviews((current) => {
      const previous = current[slug] ?? { checks: { ...emptyChecks }, note: "" };
      return { ...current, [slug]: { ...previous, note: note.slice(0, 2000) } };
    });
  }

  function setDecision(record: MediaReviewRecord, decision: Decision) {
    setReviews((current) => {
      const previous = current[record.recipeSlug] ?? { checks: { ...emptyChecks }, note: "" };
      return { ...current, [record.recipeSlug]: { ...previous, decision } };
    });
    setAnnouncement(`${record.recipeTitle}: ${decisionLabel(decision)}. Saved in this browser only.`);
  }

  function exportReview() {
    const payload = {
      schemaVersion: 1,
      batchId,
      exportedAt: new Date().toISOString(),
      scope: "LocalEditorialReviewOnly",
      decisions: records.map((record) => ({
        recipeSlug: record.recipeSlug,
        candidateProviderId: record.candidate?.providerId ?? null,
        ...(reviews[record.recipeSlug] ?? { checks: { ...emptyChecks }, note: "" }),
      })),
    };
    const href = URL.createObjectURL(new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `${batchId}-review.json`;
    anchor.click();
    URL.revokeObjectURL(href);
    setAnnouncement("Review JSON exported. No database record was changed.");
  }

  const review = activeRecord ? currentState(activeRecord.recipeSlug) : null;
  const requiredChecks = activeRecord?.status === "Candidate"
    ? [review?.checks.recipe, review?.checks.visual, review?.checks.rights, review?.checks.quality]
    : [review?.checks.recipe, review?.checks.visual];
  const canComplete = requiredChecks.every(Boolean);

  return <>
    <section className={`section-shell ${styles.hero}`}>
      <div>
        <span className="kicker"><i /> Editorial media desk</span>
        <h1>Review the image, then review the evidence.</h1>
        <p>Recipe content, visual fit, attribution, and technical quality stay together so a plausible photograph is never mistaken for an approved asset.</p>
      </div>
      <aside className={styles.guardrail} aria-label="Review scope">
        <span>Local review only</span>
        <strong>Nothing here can publish a recipe or write to PostgreSQL.</strong>
        <p>Decisions remain in this browser until you export them.</p>
      </aside>
    </section>

    <section className={`section-shell ${styles.batchSwitcher}`} aria-labelledby="review-batch-title">
      <div>
        <span id="review-batch-title">Review batch</span>
        <p>Each batch keeps a separate browser-only review draft.</p>
      </div>
      <nav aria-label="Available media review batches">
        {batchLinks.map((batch) => (
          <Link
            key={batch.href}
            href={batch.href}
            scroll={false}
            aria-current={batch.active ? "page" : undefined}
          >
            {batch.label}
          </Link>
        ))}
      </nav>
    </section>

    <section className={`section-shell ${styles.shell}`}>
      <div className={styles.summary} aria-label="Batch summary">
        <div><strong>{records.length}</strong><span>Recipes</span></div>
        <div><strong>{candidateCount}</strong><span>Candidates</span></div>
        <div><strong>{records.length - candidateCount}</strong><span>No match</span></div>
        <div><strong>{completed}/{records.length}</strong><span>Reviewed</span></div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.filters} aria-label="Filter review queue">
          {(["All", "Candidates", "No match", "Unreviewed", "Completed"] as Filter[]).map((item) => (
            <button key={item} type="button" aria-pressed={filter === item} className={filter === item ? styles.active : ""} onClick={() => setFilter(item)}>{item}</button>
          ))}
        </div>
        <button className={styles.exportButton} type="button" onClick={exportReview}><DownloadIcon /> Export review JSON</button>
      </div>

      <div className={styles.workspace}>
        <nav className={styles.queue} aria-label="Recipe review queue">
          <div className={styles.queueHeading}><span>{batchLabel}</span><strong>{visibleRecords.length} shown</strong></div>
          {visibleRecords.map((record, index) => {
            const decision = reviews[record.recipeSlug]?.decision;
            return <button
              className={record.recipeSlug === activeRecord?.recipeSlug ? styles.current : ""}
              type="button"
              key={record.recipeSlug}
              onClick={() => setActiveSlug(record.recipeSlug)}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <span><strong>{record.recipeTitle}</strong><small>{recordStateLabel(record, decision)}</small></span>
              <i data-complete={Boolean(decision)} aria-hidden="true" />
            </button>;
          })}
        </nav>

        {activeRecord && review ? <article className={styles.reviewPanel}>
          <header className={styles.recordHeader}>
            <div>
              <span className={styles.eyebrow}>{activeRecord.status === "Candidate" ? `${activeRecord.confidence} confidence` : "Search exhausted"}</span>
              <h2>{activeRecord.recipeTitle}</h2>
              <p>{activeRecord.summary}</p>
            </div>
            <span className={styles.state} data-decided={Boolean(review.decision) || activeRecord.visualReviewState === "Accepted"}>{recordStateLabel(activeRecord, review.decision)}</span>
          </header>

          <div className={styles.comparison}>
            <section className={styles.recipeEvidence} aria-labelledby="recipe-evidence-title">
              <div className={styles.panelLabel}><span>01</span><h3 id="recipe-evidence-title">Recipe evidence</h3></div>
              <dl className={styles.recipeFacts}>
                <div><dt>Serves</dt><dd>{activeRecord.servings}</dd></div>
                <div><dt>Preparation</dt><dd>{activeRecord.preparationMinutes === null ? "—" : `${activeRecord.preparationMinutes} min`}</dd></div>
                <div><dt>Cooking</dt><dd>{activeRecord.cookingMinutes === null ? "—" : `${activeRecord.cookingMinutes} min`}</dd></div>
              </dl>
              <h4>Ingredients</h4>
              <ul>{activeRecord.ingredients.map((ingredient, index) => <li key={`${ingredient}-${index}`}>{ingredient}</li>)}</ul>
              <details>
                <summary>Read preparation steps</summary>
                <ol>{activeRecord.steps.map((step, index) => <li key={`${step}-${index}`}>{step}</li>)}</ol>
              </details>
              <a className={styles.textLink} href={activeRecord.sourceUrl} target="_blank" rel="noreferrer">Open official NHLBI recipe <ExternalArrow /></a>
            </section>

            <section className={styles.mediaEvidence} aria-labelledby="media-evidence-title">
              <div className={styles.panelLabel}><span>02</span><h3 id="media-evidence-title">Media evidence</h3></div>
              {activeRecord.candidate ? <>
                <a className={styles.imageFrame} href={activeRecord.candidate.originalUrl} target="_blank" rel="noreferrer" aria-label={`Open full image for ${activeRecord.recipeTitle}`}>
                  {/* External URLs and generated local paths are server-validated; referrer data is suppressed. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={activeRecord.candidate.originalUrl} alt={activeRecord.candidate.altTextDraft} loading="lazy" referrerPolicy="no-referrer" />
                  <span>{activeRecord.candidate.sourceType === "Generated" ? "Open generated asset" : "Open original"} <ExternalArrow /></span>
                </a>
                <div className={styles.matchNote}><strong>Why it matched</strong><p>{activeRecord.matchRationale}</p></div>
                {activeRecord.warnings.length ? <div className={styles.warningBlock}><strong>Review discrepancies</strong><ul>{activeRecord.warnings.map((warning) => <li key={warning}>{warning.replaceAll("_", " ").toLowerCase()}</li>)}</ul></div> : null}
                <dl className={styles.rightsGrid}>
                  <div><dt>Creator</dt><dd>{activeRecord.candidate.creator}</dd></div>
                  <div><dt>License</dt><dd><a href={activeRecord.candidate.licenseUrl} target="_blank" rel="noreferrer">{activeRecord.candidate.licenseCode} <ExternalArrow /></a></dd></div>
                  <div><dt>Source type</dt><dd>{activeRecord.candidate.sourceType}</dd></div>
                  <div><dt>Provider</dt><dd>{activeRecord.candidate.provider}</dd></div>
                  <div><dt>Dimensions</dt><dd>{activeRecord.candidate.width} × {activeRecord.candidate.height}</dd></div>
                  <div><dt>Rights state</dt><dd>{activeRecord.candidate.rightsStatus}</dd></div>
                </dl>
                {activeRecord.candidate.sourceType === "Generated" ? <div className={styles.generatedProvenance}>
                  <strong>AI-generated candidate</strong>
                  <p>{activeRecord.candidate.generationPromptSummary}</p>
                  <dl>
                    <div><dt>Generated</dt><dd>{activeRecord.candidate.generatedAt}</dd></div>
                    <div><dt>SHA-256</dt><dd>{activeRecord.candidate.sha256}</dd></div>
                  </dl>
                </div> : <a className={styles.textLink} href={activeRecord.candidate.landingPageUrl!} target="_blank" rel="noreferrer">Verify creator and license on source page <ExternalArrow /></a>}
              </> : <div className={styles.noMatch}>
                <span>No candidate retained</span>
                <h4>An inaccurate image is worse than an empty frame.</h4>
                <p>{activeRecord.reviewNote}</p>
                <dl><dt>Search query reviewed</dt><dd>{activeRecord.searchQuery}</dd></dl>
              </div>}
            </section>
          </div>

          <section className={styles.decisionPanel} aria-labelledby="decision-title">
            <div className={styles.panelLabel}><span>03</span><h3 id="decision-title">Record your review</h3></div>
            <p className={styles.helper}>Complete the required checks before accepting a visual match or confirming that no suitable match exists.</p>
            <div className={styles.checklist}>
              <label><input type="checkbox" checked={review.checks.recipe} onChange={(event) => updateCheck(activeRecord.recipeSlug, "recipe", event.target.checked)} /><span><strong>Recipe content checked</strong><small>Ingredients and preparation were read.</small></span></label>
              <label><input type="checkbox" checked={review.checks.visual} onChange={(event) => updateCheck(activeRecord.recipeSlug, "visual", event.target.checked)} /><span><strong>{activeRecord.candidate ? "Dish visually matches" : "Rejected matches reviewed"}</strong><small>{activeRecord.candidate ? "No key ingredient or technique is misrepresented." : "The documented rejection reason is accurate."}</small></span></label>
              {activeRecord.candidate ? <>
                <label><input type="checkbox" checked={review.checks.rights} onChange={(event) => updateCheck(activeRecord.recipeSlug, "rights", event.target.checked)} /><span><strong>{activeRecord.candidate.sourceType === "Generated" ? "Generation provenance checked" : "Source and license checked"}</strong><small>{activeRecord.candidate.sourceType === "Generated" ? "Provider record, prompt summary, local checksum, and AI disclosure agree." : "Creator, license version, and original page agree."}</small></span></label>
                <label><input type="checkbox" checked={review.checks.quality} onChange={(event) => updateCheck(activeRecord.recipeSlug, "quality", event.target.checked)} /><span><strong>Quality is usable</strong><small>Resolution, crop, and editorial presentation are acceptable.</small></span></label>
              </> : null}
            </div>
            <label className={styles.noteField}><span>Editor note <small>optional, 2,000 characters maximum</small></span><textarea maxLength={2000} value={review.note} onChange={(event) => updateNote(activeRecord.recipeSlug, event.target.value)} placeholder="Record visual discrepancies, attribution wording, or a better search direction." /></label>
            <div className={styles.actions}>
              {activeRecord.candidate
                ? <button type="button" className={styles.primaryAction} disabled={!canComplete} onClick={() => setDecision(activeRecord, "VisuallyAccepted")}>Accept visual candidate</button>
                : <button type="button" className={styles.primaryAction} disabled={!canComplete} onClick={() => setDecision(activeRecord, "ConfirmedNoMatch")}>Confirm no suitable match</button>}
              {activeRecord.candidate ? <button type="button" onClick={() => setDecision(activeRecord, "Rejected")}>Reject candidate</button> : null}
              <button type="button" onClick={() => setDecision(activeRecord, "NeedsReplacement")}>Needs another search</button>
            </div>
            {!canComplete ? <p className={styles.requiredHint}>Complete the checklist to enable the primary decision.</p> : null}
          </section>
        </article> : <div className={styles.emptyFilter}><strong>No records in this view.</strong><button type="button" onClick={() => setFilter("All")}>Show the full batch</button></div>}
      </div>
      <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
      <div className={styles.backLink}><Link href="/admin/assets">Back to asset library</Link><span>Batch: {batchId}</span></div>
    </section>
  </>;
}
