"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "./i18n";

const icons: Record<string, string> = {
  home: '<path d="M4 11.2 12 4.5l8 6.7V19a1 1 0 0 1-1 1h-4.5v-5.2h-5V20H5a1 1 0 0 1-1-1Z" />',
  explore: '<circle cx="12" cy="12" r="8.6" /><path d="m15.4 8.6-2 4.8-4.8 2 2-4.8Z" />',
  map: '<circle cx="12" cy="12" r="8.6" /><path d="M3.6 12h16.8M12 3.4c2.4 2.4 3.5 5.3 3.5 8.6s-1.1 6.2-3.5 8.6c-2.4-2.4-3.5-5.3-3.5-8.6s1.1-6.2 3.5-8.6Z" />',
  community: '<circle cx="8.6" cy="8.4" r="2.9" /><circle cx="16.2" cy="9.4" r="2.4" /><path d="M3.6 19c.5-3.4 2.3-5.1 5-5.1s4.5 1.7 5 5.1M14 14.4c2.9-.4 5.3 1 6 4.6" />',
  kitchen: '<path d="M3.5 11.5h17a8.5 8.5 0 0 1-17 0Z" /><path d="M9 20h6M9.5 4.5c-1 1.6 1 2.4 0 4M14 4.5c-1 1.6 1 2.4 0 4" />',
};

// Phones only (CSS hides it from 760 px): five thumb-reachable destinations. Hidden in Cook Mode
// (its own step bar sits at the bottom) and on sign-in pages.
export function MobileTabBar() {
  const { t } = useI18n();
  const pathname = usePathname();
  if (/^\/(?:cook|account)\//.test(pathname)) return null;
  const items = [
    { href: "/", key: "home", label: t("tab.home"), active: pathname === "/" },
    { href: "/explore", key: "explore", label: t("tab.explore"), active: pathname.startsWith("/explore") || pathname.startsWith("/recipes/") || pathname.startsWith("/dishes/") },
    { href: "/world-map", key: "map", label: t("tab.map"), active: pathname.startsWith("/world-map") || pathname.startsWith("/places/") || pathname.startsWith("/stories/") },
    { href: "/community", key: "community", label: t("tab.community"), active: pathname.startsWith("/community") },
    { href: "/recipe-box", key: "kitchen", label: t("tab.kitchen"), active: ["/recipe-box", "/meal-planner", "/grocery-list", "/pantry", "/profile", "/settings"].some((path) => pathname === path || pathname.startsWith(path + "/")) },
  ];
  return <nav className="mobile-tabs" aria-label={t("tab.label")} translate="no">
    {items.map((item) => <Link prefetch={false} href={item.href} key={item.key} aria-current={item.active ? "page" : undefined}>
      <svg viewBox="0 0 24 24" aria-hidden="true" dangerouslySetInnerHTML={{ __html: icons[item.key] }} />
      <span>{item.label}</span>
    </Link>)}
  </nav>;
}
