"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

// On a new page (not Back/Forward, not an in-page #anchor) start at the top instantly, then
// move focus to the main-content anchor for screen readers. Back/Forward keeps the browser's
// own scroll restoration. Without this, a page whose height settles after load (the recipe
// sheet scales itself) could finish a smooth scroll part-way down or at the bottom.
export function RouteFocusManager() {
  const pathname = usePathname();
  const initialPath = useRef(pathname);
  const historyNavigation = useRef(false);

  useEffect(() => {
    const markHistory = () => { historyNavigation.current = true; };
    window.addEventListener("popstate", markHistory);
    return () => window.removeEventListener("popstate", markHistory);
  }, []);

  useEffect(() => {
    if (initialPath.current === pathname) return;
    initialPath.current = pathname;
    const fromHistory = historyNavigation.current;
    historyNavigation.current = false;
    if (!fromHistory && !window.location.hash) window.scrollTo({ top: 0, left: 0, behavior: "instant" });

    const frame = window.requestAnimationFrame(() => {
      document.getElementById("main-content")?.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  return null;
}
