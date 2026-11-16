"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type FocusEvent, type KeyboardEvent, type MouseEvent, type PointerEvent } from "react";
import { WALL_ART } from "./kitchen-wall-art";
import { CARDS, ICONS, LANES, NODES, STEP_ART, TIERS, TOOL_ORDER, TOOLS, type SkillNode, type ToolId } from "./skills-data";
import styles from "./skills.module.css";
import { useSkillsCopy as useWebsiteCopy } from "./skills-copy";

const STORAGE_KEY = "savora-kitchen-skills";
const BY_ID = Object.fromEntries(NODES.map((node) => [node.id, node])) as Record<string, SkillNode>;
// Two rails on the wall: four tickets on the first, three on the second.
const RAILS = [LANES.slice(0, 4), LANES.slice(4)];

type Done = Record<string, true>;

function toolOf(target: EventTarget | null) {
  const element = (target as Element | null)?.closest?.("[data-tool]");
  return (element?.getAttribute("data-tool") ?? null) as ToolId | null;
}

function Icon({ name, className }: { name: string; className?: string }) {
  return <svg className={`${styles.ic} ${className ?? ""}`} viewBox="0 0 40 40" aria-hidden="true" dangerouslySetInnerHTML={{ __html: ICONS[name] }} />;
}

function tierName(tier: SkillNode["tier"]) {
  return tier < 0 ? "Before you start" : TIERS[tier as 0 | 1 | 2];
}

function laneTone(node: SkillNode) {
  const lane = LANES.find((item) => item.id === node.lane);
  return lane ? `var(--t-${lane.tone})` : "var(--linen)";
}

export function SkillsExperience() {
  const copy = useWebsiteCopy();
  const [tool, setTool] = useState<ToolId>("knife");
  const [hover, setHover] = useState<ToolId | null>(null);
  const [nodeId, setNodeId] = useState("dice");
  const [done, setDone] = useState<Done>({});
  const wall = useRef<SVGGElement>(null);
  const card = useRef<HTMLElement>(null);
  const tag = useRef<HTMLDivElement>(null);

  // Progress lives on this device only; read it after hydration so server and client agree.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as unknown;
        if (Array.isArray(saved)) setDone(Object.fromEntries(saved.filter((id): id is string => typeof id === "string" && id in BY_ID).map((id) => [id, true])));
      } catch { /* storage unavailable: start empty */ }
      const hash = window.location.hash.slice(1);
      if (hash in BY_ID) setNodeId(hash);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  // The artwork is static markup, so the selected tool is marked on it directly.
  useEffect(() => {
    wall.current?.querySelectorAll<SVGGElement>("[data-tool]").forEach((element) => {
      const on = element.getAttribute("data-tool") === tool;
      element.classList.toggle("is-on", on);
      element.setAttribute("aria-pressed", on ? "true" : "false");
      const id = element.getAttribute("data-tool") as ToolId;
      if (TOOLS[id]) element.setAttribute("aria-label", copy(TOOLS[id].name));
    });
  }, [tool, copy]);

  function save(next: Done) {
    setDone(next);
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.keys(next))); } catch { /* storage unavailable */ }
  }

  function openNode(id: string) {
    setNodeId(id);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.requestAnimationFrame(() => {
      card.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      card.current?.focus({ preventScroll: true });
    });
  }

  function pickTool(id: ToolId, scrollToTag = false) {
    setTool(id);
    if (scrollToTag) window.requestAnimationFrame(() => tag.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
  }

  const status = (node: SkillNode) => done[node.id] ? "done" : node.needs.every((id) => done[id]) ? "ready" : "later";
  const usesTool = (node: SkillNode) => node.tools.includes(tool);
  const count = Object.keys(done).length;
  const node = BY_ID[nodeId];
  const content = CARDS[node.id];
  const selected = TOOLS[tool];
  const labelFor = [hover, tool].filter((id, index, list): id is ToolId => Boolean(id) && list.indexOf(id) === index);

  const nodeButton = (item: SkillNode) => {
    const state = status(item);
    const missing = item.needs.filter((id) => !done[id]).map((id) => copy(BY_ID[id].title));
    return (
      <button type="button" className={styles.node} data-state={state} data-uses={usesTool(item) ? "true" : "false"}
        aria-current={item.id === nodeId ? "true" : undefined} onClick={() => openNode(item.id)}
        aria-label={`${copy(item.title)}. ${state === "done" ? copy("Practised.") : state === "ready" ? copy("Ready to learn.") : copy(`Learn first: ${missing.join(", ")}.`)}`}>
        <span className={styles.disc}><Icon name={item.icon} /></span>
        <span className={styles.nText}><span className={styles.nTier}>{copy(tierName(item.tier))}</span><span className={styles.nTitle}>{copy(item.title)}</span></span>
      </button>
    );
  };

  return (
    <div className={styles.page} data-website-page data-website-localized>
      <div className={styles.inner}>
        <header className={styles.mast}>
          <div>
            <p className={styles.eyebrow}>{copy("Savora · Kitchen skills")}</p>
            <h1>{copy("The Kitchen Wall")}</h1>
            <p className={styles.lead}>{copy("Every tool on this wall opens the skills that use it. Start at the top of a ticket and work down; each skill builds on the one before.")}</p>
          </div>
          <aside className={styles.safety} aria-labelledby="safety-title">
            <h2 id="safety-title">{copy("Safety first")}</h2>
            <ul>
              <li>{copy("Small oil fire: cover with a metal lid and switch off the heat only if safe. Never use water or move the pan.")}</li>
              <li>{copy("A falling knife: step back, don't catch it.")}</li>
              <li>{copy("Steam can scald; steam wands and induction-hob glass can stay hot after use.")}</li>
            </ul>
          </aside>
        </header>

        <section className={styles.wallZone} aria-label={copy("Kitchen wall")}>
          <figure className={styles.wallFrame}>
            <svg className={styles.wall} viewBox="0 0 1200 660" role="group" aria-label={copy("A modern kitchen wall with knives, pans, a hob, an oven, shelves and a drinks corner. Each tool is a button.")}
              onClick={(event: MouseEvent) => { const id = toolOf(event.target); if (id) pickTool(id); }}
              onKeyDown={(event: KeyboardEvent) => { const id = toolOf(event.target); if (id && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); pickTool(id); } }}
              onPointerOver={(event: PointerEvent) => setHover(toolOf(event.target))}
              onPointerLeave={() => setHover(null)}
              onFocus={(event: FocusEvent) => setHover(toolOf(event.target))}
              onBlur={() => setHover(null)}>
              <g ref={wall} dangerouslySetInnerHTML={{ __html: WALL_ART }} />
              <g aria-hidden="true">
                {TOOL_ORDER.filter((id) => id !== tool).map((id) => (
                  <g className={styles.spot} key={id}>
                    <circle className={styles.ring} cx={TOOLS[id].spot[0]} cy={TOOLS[id].spot[1]} r={7} />
                    <circle className={styles.dot} cx={TOOLS[id].spot[0]} cy={TOOLS[id].spot[1]} r={5.5} />
                  </g>
                ))}
                {labelFor.map((id) => {
                  const [x, y] = TOOLS[id].spot;
                  const label = copy(TOOLS[id].name);
                  // CJK glyphs are wider than Latin glyphs in the existing wall font.
                  const width = Math.min(1180, Math.round(Array.from(label).reduce((sum, ch) => sum + (/[\u3040-\u30ff\u3400-\u9fff]/.test(ch) ? 15 : 8), 28)));
                  const left = Math.max(6, Math.min(1194 - width, x - width / 2));
                  return (
                    <g className={styles.label} data-on={id === tool ? "true" : "false"} key={id}>
                      <rect x={left} y={y - 46} width={width} height={28} rx={14} />
                      <text x={left + width / 2} y={y - 27} textAnchor="middle">{label}</text>
                    </g>
                  );
                })}
              </g>
            </svg>
            <figcaption className={styles.hint}><i aria-hidden="true" />{copy("Tap a tool to see what it teaches")}</figcaption>
          </figure>

          <div className={styles.chips} role="group" aria-label={copy("Tools on the wall")}>
            {TOOL_ORDER.map((id) => <button type="button" className={styles.chip} aria-pressed={id === tool} onClick={() => pickTool(id)} key={id}>{copy(TOOLS[id].name)}</button>)}
          </div>

          <div className={styles.tag} ref={tag} aria-live="polite">
            <div>
              <p className={styles.eyebrow}>{copy(selected.kind)}</p>
              <h2>{copy(selected.name)}</h2>
              <p className={styles.good}>{copy(selected.good)}</p>
            </div>
            <dl className={styles.facts}>
              <div><dt>{copy("Care")}</dt><dd>{copy(selected.care)}</dd></div>
              {selected.induction ? <div><dt>{copy("Induction")}</dt><dd><span className={styles.ind} data-ok={selected.induction.ok ? "true" : "false"}>{copy(selected.induction.text)}</span></dd></div> : null}
            </dl>
            <div className={styles.skillLinks}>
              <span>{copy("Skills that use it")}</span>
              {NODES.filter(usesTool).map((item) => <button type="button" className={styles.skillButton} onClick={() => openNode(item.id)} key={item.id}><Icon name={item.icon} />{copy(item.title)}</button>)}
            </div>
          </div>
        </section>

        <section className={styles.tree} aria-labelledby="tree-title">
          <div className={styles.treeHead}>
            <div>
              <p className={styles.eyebrow}>{copy("Skill tree")}</p>
              <h2 id="tree-title">{copy("Seven tickets, three steps each")}</h2>
              <div className={styles.legend} aria-hidden="true">
                <span><i />{copy("Ready to learn")}</span>
                <span><i data-k="later" />{copy("Learn the step above first")}</span>
                <span><i data-k="done" />{copy("Practised")}</span>
                <span><i data-k="uses" />{copy("Uses the selected tool")}</span>
              </div>
            </div>
            <div className={styles.progress}>
              <p><span>{copy(`${count} of ${NODES.length} practised`)}</span>{count ? <button type="button" className={styles.linkButton} onClick={() => save({})}>{copy("Reset")}</button> : null}</p>
              <div className={styles.bar} aria-hidden="true"><i style={{ width: `${(count / NODES.length) * 100}%` }} /></div>
            </div>
          </div>
          <div className={styles.rootWrap}>{nodeButton(BY_ID.station)}</div>
          {RAILS.map((lanes, index) => (
            <div className={styles.lanes} data-count={lanes.length} data-first={index === 0 ? "true" : "false"} key={lanes[0].id}>
              <span className={styles.rail} aria-hidden="true"><i /><i /></span>
              {lanes.map((lane) => (
                <div className={styles.ticket} style={{ "--lane": `var(--t-${lane.tone})` } as CSSProperties} key={lane.id}>
                  <span className={styles.clip} aria-hidden="true" />
                  <div className={styles.lane}>
                    <h3>{copy(lane.name)}</h3>
                    <p>{copy(lane.blurb)}</p>
                    <ol>{NODES.filter((item) => item.lane === lane.id).sort((a, b) => a.tier - b.tier).map((item) => <li key={item.id}>{nodeButton(item)}</li>)}</ol>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </section>

        <article className={styles.card} ref={card} tabIndex={-1} aria-live="polite" style={{ "--lane": laneTone(node) } as CSSProperties}>
          <header className={styles.cardHead}>
            <p className={styles.eyebrow}>{copy((node.lane ? LANES.find((lane) => lane.id === node.lane)?.name : "Kitchen basics") ?? "Kitchen basics")} · {copy(tierName(node.tier))}</p>
            <h2>{copy(node.title)}</h2>
            <p className={styles.summary}>{copy(content.summary)}</p>
            <div className={styles.needs}>
              <span className={styles.needsLabel}>{copy("Tools from this wall")}</span>
              {node.tools.map((id) => <button type="button" className={styles.toolChip} onClick={() => pickTool(id, true)} key={id}>{copy(TOOLS[id].name)}</button>)}
              {node.needs.length ? <><span className={styles.needsLabel}>{copy("Learn first")}</span>{node.needs.map((id) => <button type="button" className={styles.toolChip} data-done={done[id] ? "true" : "false"} onClick={() => openNode(id)} key={id}>{done[id] ? "✓ " : ""}{copy(BY_ID[id].title)}</button>)}</> : null}
            </div>
          </header>
          <div className={styles.cardBody}>
            <section className={styles.cardMain} aria-label={copy("Steps")}>
              <ol className={styles.steps}>
                {content.steps.map(([title, text, art], index) => (
                  <li key={title}>
                    <span className={styles.stepNo} aria-hidden="true">{index + 1}</span>
                    <div className={styles.stepText}><h3>{copy(title)}</h3><p>{copy(text)}</p></div>
                    {art ? <svg className={styles.art} viewBox="0 0 160 110" aria-hidden="true" dangerouslySetInnerHTML={{ __html: STEP_ART[art] }} /> : null}
                  </li>
                ))}
              </ol>
            </section>
            <aside className={styles.reference}>
              {content.tables.map((table) => (
                <section className={styles.glance} key={table.caption} aria-label={copy(table.caption)}>
                  <h3>{copy(table.caption)}</h3>
                  <dl>
                    {table.rows.map((row) => (
                      <div className={styles.glanceItem} key={row[0]}>
                        <dt>{copy(row[0])}</dt>
                        {row.slice(1).map((cell, index) => <dd key={index}>{row.length > 2 && table.head ? <span>{copy(table.head[index + 1])}</span> : null}{copy(cell)}</dd>)}
                      </div>
                    ))}
                  </dl>
                </section>
              ))}
              {content.tips.map((tip) => <p className={styles.tip} data-safety={/safety/i.test(tip.title) ? "true" : "false"} key={tip.title}><b>{copy(tip.title)}</b>{copy(tip.text)}</p>)}
            </aside>
          </div>
          <section className={styles.fixes} aria-label={copy("Common mistakes")}>
            <h3>{copy("If it goes wrong")}</h3>
            <ul>{content.mistakes.map(([problem, fix]) => <li key={problem}><p className={styles.problem}><i aria-hidden="true">✕</i>{copy(problem)}</p><p className={styles.fix}><i aria-hidden="true">✓</i>{copy(fix)}</p></li>)}</ul>
          </section>
          <footer className={styles.cardFoot}>
            {node.practice
              ? <Link href={`/explore?q=${encodeURIComponent(node.practice)}`}>{copy(`Find recipes to practise on: “${node.practice}” in Explore`)}</Link>
              : <span />}
            <button type="button" className={styles.practise} aria-pressed={Boolean(done[node.id])}
              onClick={() => { const next = { ...done }; if (next[node.id]) delete next[node.id]; else next[node.id] = true; save(next); }}>
              {copy(done[node.id] ? "✓ Practised" : "Mark as practised")}
            </button>
          </footer>
        </article>

        <p className={styles.foot}>{copy("Progress is saved in this browser only. Techniques here are general kitchen practice; always follow your appliance manuals.")}</p>
      </div>
    </div>
  );
}
