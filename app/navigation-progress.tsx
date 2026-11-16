"use client";

import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// A thin honey bar at the top while the next page loads: it starts on an internal link click
// and completes once the URL has changed. Purely visual; it never delays navigation.
export function NavigationProgress() {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const routeKey = `${pathname}?${search.toString()}`;
  // The route a click left from; while it is still the current route, the next page is loading.
  const [leaving, setLeaving] = useState<string | null>(null);

  useEffect(() => {
    // Prepare a public destination after deliberate hover or keyboard focus.
    // A dense grid still downloads nothing merely because its links are visible.
    const prepared = new Map<string, number>();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const cancel = () => { clearTimeout(timer); };
    const prepare = (event: Event) => {
      const link = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      if (event instanceof PointerEvent && link.contains(event.relatedTarget as Node | null)) return;
      const url = new URL(link.href);
      if (url.origin !== location.origin || url.search.length > 500 ||
          !/^(?:\/(?:explore|world-map|skills)?|\/(?:recipes|dishes|places|stories)\/[a-z0-9-]+)$/.test(url.pathname)) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      cancel();
      timer = setTimeout(() => {
        const now = Date.now();
        for (const [key, expiry] of prepared) if (expiry <= now) prepared.delete(key);
        const key = url.pathname + url.search;
        if (prepared.has(key) || prepared.size >= 12) return;
        prepared.set(key, now + 60_000);
        router.prefetch(key);
      }, event.type === "focusin" ? 0 : 150);
    };
    document.addEventListener("pointerover", prepare);
    document.addEventListener("pointerout", cancel);
    document.addEventListener("focusin", prepare);
    document.addEventListener("focusout", cancel);
    return () => {
      cancel();
      document.removeEventListener("pointerover", prepare);
      document.removeEventListener("pointerout", cancel);
      document.removeEventListener("focusin", prepare);
      document.removeEventListener("focusout", cancel);
    };
  }, [router]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      setLeaving(`${window.location.pathname}?${new URLSearchParams(window.location.search).toString()}`);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  const state = leaving === null ? "idle" : leaving === routeKey ? "loading" : "done";
  return <div className="nav-progress" data-state={state} aria-hidden="true"><i /></div>;
}
