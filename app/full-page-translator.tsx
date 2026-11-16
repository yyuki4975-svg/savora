"use client";

import { useEffect } from "react";
import { useI18n } from "./i18n";
import { translateCatalogTexts, translateTexts } from "./translation-client";
import { formatWebsiteHeading, getWebsiteCopy, isWebsiteCopyPage } from "./website-copy";

const sourceText = new WeakMap<Text, string>();
const lastAppliedText = new WeakMap<Text, string>();
const sourceAttributes = new WeakMap<Element, Map<string, string>>();
const translatedAttributes = new WeakMap<Element, Map<string, string>>();
const attributes = ["placeholder", "aria-label", "title", "alt"] as const;

// Never export private kitchen notes, account data, drafts or moderation content.
function isPublicTranslationPage() {
  return /^\/(?:$|explore\/?$|world-map\/?$|recipes\/|dishes\/|places\/|stories\/|exhibitions\/|videos\/?$)/.test(window.location.pathname);
}

function publicCatalogPage() {
  return /^\/(?:explore|world-map|videos|library)\/?$/.test(window.location.pathname) || /^\/stories\//.test(window.location.pathname);
}

function usesLocalCopy(node: Node) {
  return isWebsiteCopyPage(window.location.pathname) || Boolean((node instanceof Element ? node : node.parentElement)?.closest("[data-website-copy]"));
}

function shouldTranslate(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 1 && /[A-Za-zÀ-ž\u3040-\u30ff\u3400-\u9fff]/.test(trimmed) && !/^https?:\/\//i.test(trimmed);
}

function isExcluded(node: Node) {
  const parent = node.parentElement;
  return !parent || Boolean(parent.closest("script, style, code, pre, textarea, [translate='no'], [data-private], [data-website-localized], [data-catalog-field], [data-catalog-localized], .site-header, .brand, .dish-local"));
}

function collect(root: Node) {
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();
  while (current) {
    const node = current as Text;
    if (!isExcluded(node) && shouldTranslate(node.nodeValue ?? "")) nodes.push(node);
    current = walker.nextNode();
  }
  return nodes;
}

export function FullPageTranslator() {
  const { locale } = useI18n();

  useEffect(() => {
    let disposed = false;
    let timer = 0;

    async function translateRoot(root: Node) {
      if (!isPublicTranslationPage() && !isWebsiteCopyPage(window.location.pathname)) return;
      const pathname = window.location.pathname;
      const localCopy = isWebsiteCopyPage(pathname) || document.querySelector("[data-website-copy]")
        ? await getWebsiteCopy(locale) : (value: string) => value;
      if (disposed || pathname !== window.location.pathname) return;
      const nodes = collect(root);
      const entries = nodes.map((node) => {
        const current = node.nodeValue ?? "";
        if (!sourceText.has(node) || current !== lastAppliedText.get(node)) sourceText.set(node, current);
        return { node, current, source: sourceText.get(node) ?? current };
      });

      if (locale === "en") {
        entries.forEach(({ node, source }) => { node.nodeValue = source; lastAppliedText.set(node, source); });
      } else {
        for (let index = 0; index < entries.length && !disposed; index += 80) {
          if (pathname !== window.location.pathname) return;
          const batch = entries.slice(index, index + 80);
          const remote = batch.filter(entry => !usesLocalCopy(entry.node));
          // Community and Share NEVER call the translation endpoint, including misses.
          const translated = remote.length ? await translateTexts(remote.map(entry => entry.source.trim()), locale) : [];
          const remoteCopy = new Map(remote.map((entry, i) => [entry, translated[i]]));
          const translations = batch.map(entry => usesLocalCopy(entry.node) ? localCopy(entry.source.trim()) : remoteCopy.get(entry) ?? entry.source.trim());
          // Public website-copy pages (Explore, World Map ...) still show recipe names; those come from the reviewed
          // catalog translations when the local copy has no entry. Private pages never reach this call.
          if (publicCatalogPage()) {
            const unresolved = batch.map((entry, i) => ({ entry, i })).filter(({ entry, i }) => usesLocalCopy(entry.node) && translations[i] === entry.source.trim());
            if (unresolved.length) {
              const catalog = await translateCatalogTexts(unresolved.map(({ entry }) => entry.source.trim()), locale);
              unresolved.forEach(({ i }, k) => { translations[i] = catalog[k]; });
            }
          }
          if (disposed || pathname !== window.location.pathname) return;
          batch.forEach((entry, itemIndex) => {
            // A React update/private-state change may have happened during await.
            if (!entry.node.isConnected || entry.node.nodeValue !== entry.current || isExcluded(entry.node)) return;
            const leading = entry.source.match(/^\s*/)?.[0] ?? "";
            const trailing = entry.source.match(/\s*$/)?.[0] ?? "";
            const heading = entry.node.parentElement?.closest("h1, h2, h3, h4, h5, h6");
            const isHeadingEnd = heading?.textContent?.trim().endsWith(entry.current.trim());
            const text = isHeadingEnd ? formatWebsiteHeading(translations[itemIndex], locale) : translations[itemIndex];
            const next = `${leading}${text}${trailing}`;
            if (entry.node.nodeValue !== next) entry.node.nodeValue = next;
            lastAppliedText.set(entry.node, next);
          });
        }
      }

      const elements = root instanceof Element ? [root, ...Array.from(root.querySelectorAll("*"))] : Array.from(document.body.querySelectorAll("*"));
      const candidates: Array<{ element: Element; name: string; current: string; source: string }> = [];
      elements.forEach((element) => {
        if (element.closest("[translate='no'], [data-private], [data-website-localized], [data-catalog-field], [data-catalog-localized], .site-header")) return;
        attributes.forEach((name) => {
          const current = element.getAttribute(name);
          if (!current || !shouldTranslate(current)) return;
          const originals = sourceAttributes.get(element) ?? new Map<string, string>();
          const applied = translatedAttributes.get(element);
          if (!originals.has(name) || current !== applied?.get(name)) originals.set(name, current);
          sourceAttributes.set(element, originals);
          candidates.push({ element, name, current, source: originals.get(name) ?? current });
        });
      });
      for (let index = 0; index < candidates.length && !disposed; index += 80) {
        if (pathname !== window.location.pathname) return;
        const batch = candidates.slice(index, index + 80);
        const remote = locale === "en" ? [] : batch.filter(item => !usesLocalCopy(item.element));
        const translated = remote.length ? await translateTexts(remote.map(item => item.source), locale) : [];
        const remoteCopy = new Map(remote.map((item, i) => [item, translated[i]]));
        const translations = batch.map(item => locale === "en" ? item.source : usesLocalCopy(item.element) ? localCopy(item.source) : remoteCopy.get(item) ?? item.source);
        if (disposed || pathname !== window.location.pathname) return;
        batch.forEach((item, itemIndex) => {
          if (!item.element.isConnected || item.element.getAttribute(item.name) !== item.current) return;
          if (item.element.closest("[translate='no'], [data-private], [data-website-localized]")) return;
          item.element.setAttribute(item.name, translations[itemIndex]);
          const applied = translatedAttributes.get(item.element) ?? new Map<string, string>();
          applied.set(item.name, translations[itemIndex]);
          translatedAttributes.set(item.element, applied);
        });
      }
    }

    function schedule(root: Node = document.body) {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => { void translateRoot(root); }, 120);
    }

    schedule();
    const observer = new MutationObserver((mutations) => {
      // Ignore our own character-data edits, but translate React-updated statuses.
      const external = mutations.some(mutation => mutation.type === "childList"
        || mutation.type === "characterData" && mutation.target.nodeValue !== lastAppliedText.get(mutation.target as Text));
      if (external) schedule();
    });
    observer.observe(document.body, { childList: true, characterData: true, subtree: true });

    return () => {
      disposed = true;
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [locale]);

  return null;
}
