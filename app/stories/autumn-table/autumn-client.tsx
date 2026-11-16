"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./autumn-table.module.css";

/** Sticky chapter rail: marks the chapter currently on screen and keeps its link in view. */
export function ChapterRail({ items, label }: { items: { id: string; label: string }[]; label: string }) {
  const [active, setActive] = useState(items[0]?.id ?? "");
  const rail = useRef<HTMLElement>(null);

  useEffect(() => {
    const sections = items.map((item) => document.getElementById(item.id)).filter((element): element is HTMLElement => Boolean(element));
    let frame = 0;
    // The current chapter is the last one whose top has passed 40% of the viewport.
    const update = () => {
      frame = 0;
      const line = window.innerHeight * .4;
      const current = sections.filter((section) => section.getBoundingClientRect().top <= line).pop() ?? sections[0];
      if (current) setActive(current.id);
    };
    const schedule = () => { if (!frame) frame = window.requestAnimationFrame(update); };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => { window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule); if (frame) window.cancelAnimationFrame(frame); };
  }, [items]);

  useEffect(() => {
    const link = rail.current?.querySelector<HTMLElement>(`[data-target="${active}"]`);
    const container = rail.current;
    if (!link || !container) return;
    container.scrollTo({ left: link.offsetLeft - container.clientWidth / 2 + link.clientWidth / 2, behavior: "smooth" });
  }, [active]);

  return (
    <nav className={styles.rail} aria-label={label} ref={rail}>
      <span className={styles.progress} aria-hidden="true" />
      {items.map((item) => (
        <a href={`#${item.id}`} data-target={item.id} aria-current={item.id === active ? "true" : undefined} key={item.id}>{item.label}</a>
      ))}
    </nav>
  );
}

/** Horizontal gallery with previous / next buttons; the track itself stays a native scroller. */
export function Gallery({ children, previous, next }: { children: ReactNode; previous: string; next: string }) {
  const track = useRef<HTMLDivElement>(null);
  const move = (direction: number) => {
    const element = track.current;
    if (!element) return;
    const card = element.querySelector<HTMLElement>(":scope > *");
    element.scrollBy({ left: direction * ((card?.offsetWidth ?? 320) + 24), behavior: "smooth" });
  };
  return (
    <div className={styles.gallery}>
      <div className={styles.galleryTrack} ref={track}>{children}</div>
      <div className={styles.galleryButtons}>
        <button type="button" onClick={() => move(-1)} aria-label={previous}><span aria-hidden="true">←</span></button>
        <button type="button" onClick={() => move(1)} aria-label={next}><span aria-hidden="true">→</span></button>
      </div>
    </div>
  );
}

export function SeasonQuiz({ title, question, options, answer, right, wrong, retry }: { title: string; question: string; options: string[]; answer: string; right: string; wrong: string; retry: string }) {
  const [choice, setChoice] = useState<string | null>(null);
  const correct = choice === answer;
  return (
    <div className={styles.quiz}>
      <p className={styles.kicker}>{title}</p>
      <h3>{question}</h3>
      <div className={styles.quizOptions} role="group" aria-label={question}>
        {options.map((option) => (
          <button type="button" key={option} disabled={choice !== null} onClick={() => setChoice(option)}
            data-state={choice === null ? "idle" : option === answer ? "answer" : option === choice ? "wrong" : "idle"}>
            {option}
          </button>
        ))}
      </div>
      <p className={styles.quizResult} aria-live="polite">{choice === null ? "" : correct ? right : wrong}</p>
      {choice !== null ? <button type="button" className={styles.quizRetry} onClick={() => setChoice(null)}>{retry}</button> : null}
    </div>
  );
}
