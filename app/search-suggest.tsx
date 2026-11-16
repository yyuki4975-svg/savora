"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { useI18n } from "./i18n";

type Suggestion = { kind: "intent" | "recipe" | "country"; label: string; href: string };

// Search input with as-you-type suggestions (WAI-ARIA combobox with a listbox popup).
// https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-autocomplete-list/
// Typing still submits the surrounding GET form as before; choosing a suggestion navigates directly.
export function SearchSuggestInput({ id, defaultValue = "", placeholder, autoFocus = false, maxLength = 100 }: { id: string; defaultValue?: string; placeholder?: string; autoFocus?: boolean; maxLength?: number }) {
  const { locale } = useI18n();
  const router = useRouter();
  const listId = useId();
  const [value, setValue] = useState(defaultValue);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const query = value.trim();
    if (!query) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetch(`/api/search/suggest?q=${encodeURIComponent(query)}&locale=${locale}`, { signal: controller.signal })
        .then((response) => (response.ok ? response.json() : { suggestions: [] }))
        .then((data: { suggestions?: Suggestion[] }) => { setItems(Array.isArray(data.suggestions) ? data.suggestions.slice(0, 8) : []); setActive(-1); })
        .catch(() => { /* aborted or offline: keep the plain search box */ });
    }, 160);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [value, locale]);

  useEffect(() => {
    const close = (event: PointerEvent) => { if (!box.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  const visible = open && value.trim().length > 0 && items.length > 0;
  const go = (item: Suggestion) => { setOpen(false); router.push(item.href); };

  return <div className="search-suggest" ref={box}>
    <input id={id} name="q" type="search" autoComplete="off" value={value} maxLength={maxLength} placeholder={placeholder} autoFocus={autoFocus}
      role="combobox" aria-expanded={visible} aria-controls={listId} aria-autocomplete="list" aria-activedescendant={visible && active >= 0 ? `${listId}-${active}` : undefined}
      onChange={(event) => { setValue(event.target.value); setOpen(true); if (!event.target.value.trim()) setItems([]); }}
      onFocus={() => setOpen(true)}
      onKeyDown={(event) => {
        if (!visible) return;
        if (event.key === "ArrowDown") { event.preventDefault(); setActive((index) => (index + 1) % items.length); }
        else if (event.key === "ArrowUp") { event.preventDefault(); setActive((index) => (index <= 0 ? items.length - 1 : index - 1)); }
        else if (event.key === "Enter" && active >= 0) { event.preventDefault(); go(items[active]); }
        else if (event.key === "Escape") { setOpen(false); }
      }} />
    {visible ? <ul className="search-suggest-list" id={listId} role="listbox">
      {items.map((item, index) => <li key={`${item.kind}-${item.href}`} id={`${listId}-${index}`} role="option" aria-selected={index === active} data-kind={item.kind}
        onPointerDown={(event) => { event.preventDefault(); go(item); }} onPointerEnter={() => setActive(index)}>
        <i aria-hidden="true" />{item.label}
      </li>)}
    </ul> : null}
  </div>;
}
