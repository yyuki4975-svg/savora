"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useWebsiteCopy } from "../use-website-copy";
import styles from "./explore-passed-bowl.module.css";

export type FilterOption = { label: string; count?: number; href: string; active: boolean; tone?: string };
export type FilterGroup = { id: string; label: string; current: string; active: boolean; options: FilterOption[]; searchable?: boolean };
export type ActiveChip = { label: string; href: string; ariaLabel: string };

/**
 * Explore's filter bar: one pill per filter opening a small panel of links. Every option is
 * an ordinary link to the same URL scheme as before (q, category, ingredient, country, time,
 * sort), so it works without JavaScript and existing links keep working. Native <details>
 * with a shared name keeps one panel open at a time; JavaScript only adds outside-click and
 * Escape closing and the country filter box.
 */
export function ExploreFilters({ groups, sort, total, chips, clearHref }: {
  groups: FilterGroup[];
  sort: { label: string; href: string; active: boolean }[];
  total: string;
  chips: ActiveChip[];
  clearHref: string;
}) {
  const copy = useWebsiteCopy();
  const bar = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const element = bar.current;
    if (!element) return;
    const closeAll = () => element.querySelectorAll("details[open]").forEach((details) => details.removeAttribute("open"));
    const onPointer = (event: PointerEvent) => { if (!element.contains(event.target as Node)) closeAll(); };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const open = element.querySelector("details[open]");
      if (!open) return;
      open.removeAttribute("open");
      open.querySelector("summary")?.focus();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onPointer); document.removeEventListener("keydown", onKey); };
  }, []);

  const needle = query.trim().toLocaleLowerCase();

  return (
    <div className={styles.filterBar} ref={bar}>
      <div className={styles.filterRow}>
        <p className={styles.filterTotal}>{total}</p>
        <div className={styles.pills}>
          {groups.map((group) => {
            const options = group.searchable && needle ? group.options.filter((option) => option.label.toLocaleLowerCase().includes(needle)) : group.options;
            return (
              <details className={styles.pill} name="explore-filter" data-active={group.active ? "true" : "false"} key={group.id}>
                <summary>
                  <span className={styles.pillLabel}>{group.label}</span>
                  <strong>{group.current}</strong>
                  <svg aria-hidden="true" viewBox="0 0 12 12"><path d="M2.5 4.5 6 8l3.5-3.5" /></svg>
                </summary>
                <div className={styles.panel} data-wide={group.options.length > 12 ? "true" : "false"}>
                  {group.searchable ? (
                    <label className={styles.panelSearch}>
                      <span className="sr-only">{copy("Filter countries")}</span>
                      <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy("Filter countries")} autoComplete="off" />
                    </label>
                  ) : null}
                  <ul>
                    {options.map((option, index) => (
                      <li key={option.href} style={{ "--i": Math.min(index, 14) } as CSSProperties}>
                        <Link href={option.href} aria-current={option.active ? "true" : undefined} style={option.tone ? { "--tone": option.tone } as CSSProperties : undefined} data-tone={option.tone ? "true" : undefined}>
                          <span>{option.label}</span>{option.count !== undefined ? <small>{option.count}</small> : null}
                        </Link>
                      </li>
                    ))}
                  </ul>
                  {group.searchable && needle && !options.length ? <p className={styles.panelEmpty}>{copy("No country matches.")}</p> : null}
                </div>
              </details>
            );
          })}
        </div>
        <nav className={styles.sortSwitch} aria-label={copy("Sort")}>
          {sort.map((order) => <Link href={order.href} aria-current={order.active ? "true" : undefined} key={order.href}>{order.label}</Link>)}
        </nav>
      </div>
      {chips.length ? (
        <div className={styles.activeFilters} aria-label="Active filters">
          {chips.map((chip) => <Link href={chip.href} aria-label={chip.ariaLabel} key={chip.href}><span>{chip.label}</span><b aria-hidden="true">×</b></Link>)}
          <Link className={styles.clearFilters} href={clearHref}>Clear all</Link>
        </div>
      ) : null}
    </div>
  );
}
