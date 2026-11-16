"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { seeds } from "./savora-logo";
import { SearchSuggestInput } from "./search-suggest";
import { useWebsiteCopy } from "./use-website-copy";
import styles from "./error-scene.module.css";

export type ErrorKind = "not-found" | "unavailable" | "error";

const defaults: Record<ErrorKind, { kicker: string; title: string; message: string }> = {
  "not-found": {
    kicker: "Error 404",
    title: "This page isn’t on the table.",
    message: "The link may be old, or the page has moved. Search for a dish, or pick up from one of these.",
  },
  unavailable: {
    kicker: "Temporarily unavailable",
    title: "The kitchen is resetting the table.",
    message: "The recipe archive didn’t answer just now. Please try again in a moment.",
  },
  error: {
    kicker: "Unexpected error",
    title: "Something spilled in the kitchen.",
    message: "This page hit a problem we didn’t expect. Nothing you saved was lost.",
  },
};

// The Seed Circle logo is a plate seen from above. Each state unsets it differently:
// a missing page leaves an empty place, a paused archive waits seed by seed, an error spills it.
const scattered = [[-62, -38, -30], [36, -66, 64], [74, 8, 112], [-24, 60, -84], [-92, 34, 16], [22, 26, 200]] as const;
function seedTransform(kind: ErrorKind, index: number) {
  const seed = seeds[index]!;
  if (kind === "error") { const [x, y, turn] = scattered[index]!; return `translate(${x} ${y}) rotate(${turn}) scale(2)`; }
  if (kind === "not-found" && index === 2) return "translate(78 92) rotate(64) scale(2)";
  return `rotate(${seed.at}) translate(0 -46) rotate(${seed.tilt}) scale(2)`;
}

function SceneArt({ kind }: { kind: ErrorKind }) {
  return (
    <svg className={styles.art} viewBox="-112 -112 224 224" aria-hidden="true">
      <g transform={kind === "error" ? "translate(-10 6) rotate(-12) scale(1 .88)" : undefined}>
        <circle className={styles.rim} r="86" />
        <circle className={styles.well} r="66" />
      </g>
      {kind === "not-found" ? <g transform={`rotate(${seeds[2].at}) translate(0 -46)`}><circle className={styles.gap} r="15" /></g> : null}
      {seeds.map((seed, index) => (
        <g key={seed.name} transform={seedTransform(kind, index)}>
          <g className={styles.seed} data-fallen={kind === "not-found" && index === 2 ? "true" : undefined} style={{ "--seed": index } as CSSProperties}>
            <path d={seed.d} fill={seed.color} />
          </g>
        </g>
      ))}
    </svg>
  );
}

/** One design for every failure: 404, a catalogue that did not answer, and unexpected errors. */
export function ErrorScene({ kind, title, message, back, reference, onRetry }: {
  kind: ErrorKind;
  title?: ReactNode;
  message?: ReactNode;
  back?: { href: string; label: string };
  reference?: string;
  onRetry?: () => void;
}) {
  const copy = useWebsiteCopy();
  const text = (value: ReactNode | undefined, fallback: string) => value === undefined ? copy(fallback) : typeof value === "string" ? copy(value) : value;
  const paths = [["/explore", "Explore recipes"], ["/world-map", "World food map"], ["/skills", "Kitchen skills"], ["/", "Home"]] as const;
  return (
    <section className={styles.scene} data-kind={kind} aria-labelledby="error-scene-title" data-website-localized>
      <div className={styles.inner}>
        <SceneArt kind={kind} />
        <div className={styles.copy}>
          <p className={styles.kicker}>{copy(defaults[kind].kicker)}</p>
          <h1 id="error-scene-title">{text(title, defaults[kind].title)}</h1>
          <p className={styles.message}>{text(message, defaults[kind].message)}</p>
          {kind === "unavailable" ? <p className={styles.note}>{copy("Recipes and notes saved on this device are safe.")}</p> : null}
          {kind === "not-found" ? (
            <>
              <form className={styles.search} action="/explore" method="get" role="search">
                <label className="sr-only" htmlFor="not-found-search">{copy("Search recipes")}</label>
                <SearchSuggestInput id="not-found-search" placeholder={copy("Search a dish, place or ingredient")} maxLength={60} />
                <button type="submit">{copy("Search")}</button>
              </form>
              <nav className={styles.paths} aria-label={copy("Places to start")}>
                {paths.map(([href, label]) => <Link key={href} href={href}>{copy(label)}</Link>)}
              </nav>
            </>
          ) : (
            <div className={styles.actions}>
              <button type="button" className={styles.primary} onClick={() => (onRetry ? onRetry() : window.location.reload())}>{copy("Try again")}</button>
              <Link className={styles.secondary} href={back?.href ?? "/"}>{copy(back?.label ?? "Back to home")}</Link>
            </div>
          )}
          {reference ? <p className={styles.reference}>{copy("Reference")} <code>{reference}</code></p> : null}
        </div>
      </div>
    </section>
  );
}
