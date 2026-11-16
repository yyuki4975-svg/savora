"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import type { Dish, Video } from "./data";
import { type Locale, useI18n } from "./i18n";
import { SavoraLogoMark } from "./savora-logo";
import shell from "./shell.module.css";
import { RecipeSaveButton } from './recipe-save-button';
import { SearchSuggestInput } from "./search-suggest";

type HeaderIconName = "menu" | "close" | "sun" | "moon" | "profile" | "search" | "compass" | "globe" | "people" | "knife" | "leaf" | "bowl" | "language";

const iconPaths: Record<HeaderIconName, string> = {
  close: '<path d="m6 6 12 12M18 6 6 18" />',
  sun: '<circle cx="12" cy="12" r="3.7" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4" />',
  moon: '<path d="M20 15.1A8.3 8.3 0 0 1 8.9 4a8.3 8.3 0 1 0 11.1 11.1Z" />',
  profile: '<circle cx="12" cy="8" r="3.4" /><path d="M5.5 20c.6-4 2.8-6 6.5-6s5.9 2 6.5 6" />',
  menu: '<path d="M4 7h16M4 12h16M4 17h16" />',
  search: '<circle cx="10.8" cy="10.8" r="6.3" /><path d="m15.6 15.6 4.9 4.9" />',
  compass: '<circle cx="12" cy="12" r="8.6" /><path d="m15.4 8.6-2 4.8-4.8 2 2-4.8Z" />',
  globe: '<circle cx="12" cy="12" r="8.6" /><path d="M3.6 12h16.8M12 3.4c2.4 2.4 3.5 5.3 3.5 8.6s-1.1 6.2-3.5 8.6c-2.4-2.4-3.5-5.3-3.5-8.6s1.1-6.2 3.5-8.6Z" />',
  people: '<circle cx="8.6" cy="8.4" r="2.9" /><circle cx="16.2" cy="9.4" r="2.4" /><path d="M3.6 19c.5-3.4 2.3-5.1 5-5.1s4.5 1.7 5 5.1M14 14.4c2.9-.4 5.3 1 6 4.6" />',
  knife: '<path d="M4 20 15.6 8.4l2.5-4.4 1.9 1.9-4.4 2.5L4 20Z" /><path d="m13 11 2 2" />',
  leaf: '<path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14Z" /><path d="M5 19 13 11" />',
  bowl: '<path d="M3.5 11.5h17a8.5 8.5 0 0 1-17 0Z" /><path d="M9 20h6M9.5 4.5c-1 1.6 1 2.4 0 4M14 4.5c-1 1.6 1 2.4 0 4" />',
  language: '<circle cx="12" cy="12" r="8.6" /><path d="M3.6 12h16.8M12 3.4c2.4 2.4 3.5 5.3 3.5 8.6s-1.1 6.2-3.5 8.6c-2.4-2.4-3.5-5.3-3.5-8.6s1.1-6.2 3.5-8.6Z" />',
};

function HeaderIcon({ name }: { name: HeaderIconName }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" dangerouslySetInnerHTML={{ __html: iconPaths[name] }} />;
}

function subscribeTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

const languages: Array<[Locale, string]> = [["en", "English"], ["zh", "中文"], ["ja", "日本語"], ["fr", "Français"], ["it", "Italiano"], ["es", "Español"]];

export function Header() {
  const { locale, setLocale, t } = useI18n();
  const pathname = usePathname();
  // The bootstrap script in layout.tsx owns the initial theme; the header only mirrors it.
  const dark = useSyncExternalStore(subscribeTheme, () => document.documentElement.dataset.theme === "dark", () => false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    // The seed-circle launch animation runs once per browser session (flag set in layout.tsx).
    const timer = window.setTimeout(() => { delete document.documentElement.dataset.launch; }, 1600);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the menu and search when the route changes (state adjusted during render, not in an effect).
  const [openedOn, setOpenedOn] = useState(pathname);
  if (openedOn !== pathname) { setOpenedOn(pathname); setMenuOpen(false); setSearchOpen(false); }

  useEffect(() => {
    if (!menuOpen && !searchOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") { setMenuOpen(false); setSearchOpen(false); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen, searchOpen]);

  function toggleTheme() {
    const next = dark ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    document.documentElement.style.colorScheme = next;
    window.localStorage.setItem("savora-theme", next);
  }

  const current = (href: string) => (pathname === href || pathname.startsWith(`${href}/`) ? "page" as const : undefined);
  const discover: Array<{ href: string; label: string; icon: HeaderIconName }> = [
    { href: "/explore", label: t("nav.explore"), icon: "compass" },
    { href: "/world-map", label: t("nav.map"), icon: "globe" },
    { href: "/community", label: t("nav.community"), icon: "people" },
    { href: "/skills", label: t("nav.skills"), icon: "knife" },
    { href: "/stories/autumn-table", label: t("nav.autumn"), icon: "leaf" },
  ];
  const languageSelect = (id: string) => (
    <label className={shell.language} htmlFor={id}>
      <HeaderIcon name="language" />
      <span className="sr-only">{t("header.language")}</span>
      <select id={id} value={locale} onChange={(event) => setLocale(event.target.value as Locale)}>
        {languages.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
      </select>
    </label>
  );
  const themeButton = (
    <button className={shell.iconButton} type="button" aria-label={dark ? t("header.light") : t("header.dark")} aria-pressed={dark} onClick={toggleTheme}>
      <HeaderIcon name={dark ? "sun" : "moon"} />
    </button>
  );
  const searchForm = (id: string, autoFocus: boolean) => (
    <form className={shell.searchForm} action="/explore" method="get" role="search">
      <HeaderIcon name="search" />
      <label className="sr-only" htmlFor={id}>{t("header.search")}</label>
      <SearchSuggestInput id={id} placeholder={t("header.searchPlaceholder")} autoFocus={autoFocus} maxLength={60} />
    </form>
  );

  return <>
    <header className={shell.header} data-shell="header" data-scrolled={scrolled ? "true" : "false"} translate="no">
      <span className={shell.ribbon} aria-hidden="true" />
      <div className={shell.bar}>
        <Link prefetch={false} className={shell.brand} href="/" aria-label="Savora home">
          <SavoraLogoMark className={shell.mark} />
          <span className={shell.wordmark}>Savora</span>
        </Link>

        <nav id="primary-navigation" className={shell.nav} aria-label={t("header.navigation")}>
          {discover.map((item) => <Link prefetch={false} href={item.href} aria-current={current(item.href)} key={item.href}><HeaderIcon name={item.icon} /><span>{item.label}</span></Link>)}
        </nav>

        <div className={shell.actions}>
          <button className={shell.iconButton} type="button" aria-label={searchOpen ? t("header.searchClose") : t("header.search")} aria-expanded={searchOpen} aria-controls="site-search" onClick={() => { setSearchOpen((value) => !value); setMenuOpen(false); }}>
            <HeaderIcon name={searchOpen ? "close" : "search"} />
          </button>
          <Link prefetch={false} className={shell.share} href="/share">
            <span className={shell.shareLong}>{t("nav.share")}</span>
            <span className={shell.shareShort}>{t("nav.shareShort")}</span>
          </Link>
          <Link className={`${shell.kitchen} ${shell.full}`} href="/recipe-box" prefetch={false} aria-current={current("/recipe-box")}><HeaderIcon name="bowl" /><span>{t("nav.kitchen")}</span></Link>
          <span className={shell.full}>{languageSelect("language-desktop")}</span>
          <span className={shell.full}>{themeButton}</span>
          <Link className={`${shell.avatar} ${shell.full}`} href="/profile" prefetch={false} aria-label={t("header.profile")} aria-current={current("/profile")}>
            <HeaderIcon name="profile" />
          </Link>
          <button
            className={`${shell.iconButton} ${shell.menuButton}`}
            type="button"
            aria-label={t("header.toggle")}
            aria-expanded={menuOpen}
            aria-controls="site-menu"
            onClick={() => { setMenuOpen((value) => !value); setSearchOpen(false); }}
          >
            <HeaderIcon name={menuOpen ? "close" : "menu"} />
          </button>
        </div>
      </div>

      {searchOpen ? <div className={shell.searchBand} id="site-search">{searchForm("site-search-input", true)}</div> : null}

      {menuOpen ? (
        <div className={shell.drawer} id="site-menu">
          {searchForm("menu-search-input", false)}
          <nav aria-label={t("header.navigation")} onClick={() => setMenuOpen(false)}>
            {discover.map((item) => <Link prefetch={false} href={item.href} aria-current={current(item.href)} key={item.href}><HeaderIcon name={item.icon} /><span>{item.label}</span></Link>)}
            <Link prefetch={false} href="/share" aria-current={current("/share")}><HeaderIcon name="leaf" /><span>{t("nav.share")}</span></Link>
            <Link href="/recipe-box" prefetch={false} aria-current={current("/recipe-box")}><HeaderIcon name="bowl" /><span>{t("nav.kitchen")}</span></Link>
            <Link href="/profile" prefetch={false} aria-current={current("/profile")}><HeaderIcon name="profile" /><span>{t("header.profile")}</span></Link>
            <Link href="/meal-planner" prefetch={false} aria-current={current("/meal-planner")}><HeaderIcon name="bowl" /><span>{t("footer.planner")}</span></Link>
            <Link href="/grocery-list" prefetch={false} aria-current={current("/grocery-list")}><HeaderIcon name="bowl" /><span>{t("footer.grocery")}</span></Link>
            <Link href="/pantry" prefetch={false} aria-current={current("/pantry")}><HeaderIcon name="bowl" /><span>{t("footer.pantry")}</span></Link>
            <Link href="/settings" prefetch={false} aria-current={current("/settings")}><HeaderIcon name="profile" /><span>{t("footer.settings")}</span></Link>
          </nav>
          <div className={shell.drawerTools}>
            {languageSelect("language-menu")}
            {themeButton}
          </div>
        </div>
      ) : null}
    </header>
    <span className="main-content-anchor" id="main-content" tabIndex={-1}><span className="sr-only">Main content</span></span>
  </>;
}

export function DishCard({ dish, compact = false }: { dish: Dish; compact?: boolean }) {

  return (
    <article className={compact ? "dish-card compact" : "dish-card"}>
      <Link prefetch={false} href={`/dishes/${dish.slug}`}>
        <div className="dish-image-wrap" style={{ backgroundColor: dish.color }}>
          <img
            className="dish-image"
            src={dish.image}
            alt={`${dish.name} from ${dish.country}`}
            width={1200}
            height={900}
            loading="lazy"
            decoding="async"
          />
          <span className="country-tag">
            {dish.flag} {dish.country}
          </span>
          {dish.video ? <span className="video-dot">▶ Video</span> : null}
        </div>
      </Link>
      <div className="dish-card-body">
        <div>
          <p className="eyebrow">{dish.localName}</p>
          <Link prefetch={false} className="dish-title-link" href={`/dishes/${dish.slug}`}>
            <h3>{dish.name}</h3>
          </Link>
        </div>
        <RecipeSaveButton slug={dish.slug} name={dish.name} />
      </div>
      <div className="dish-meta">
        <span>★ {dish.rating} <small>({dish.reviews})</small></span>
        <span>{dish.time}</span>
        <span>{dish.difficulty}</span>
      </div>
      <div className="dish-sensory">
        <span><small>Taste</small>{dish.taste}</span>
        <span><small>Texture</small>{dish.texture}</span>
        <span><small>Origin</small>{dish.origin}</span>
      </div>
    </article>
  );
}

export function VideoCard({ video }: { video: Video }) {
  const [playing, setPlaying] = useState(false);

  return (
    <article className="video-card">
      {playing ? (
        <div className="video-thumb is-playing">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
          <span className="external-label">Playing from YouTube</span>
        </div>
      ) : (
        <button
          className="video-thumb"
          type="button"
          aria-label={`Play ${video.title} on this page`}
          onClick={() => setPlaying(true)}
        >
          <img
            src={`https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`}
            alt={`Official YouTube thumbnail for ${video.title}`}
            width={480}
            height={360}
            loading="lazy"
            decoding="async"
          />
          <span className="external-label">Third-party video</span>
          <span className="shorts-badge">Shorts</span>
          <span className="play-button" aria-hidden="true">▶</span>
        </button>
      )}
      <div className="video-card-body">
        <p className="video-dish">{video.dish}</p>
        <h3>{video.title}</h3>
        <div className="creator-line">
          <span className="creator-avatar">{video.creator.slice(0, 1).toUpperCase()}</span>
          <span>
            <strong>{video.creator}</strong>
            {video.trusted ? <em title="Verified or established creator">✓</em> : null}
            <small>{video.followers ?? "Cooking creator"}</small>
          </span>
        </div>
        <div className="video-stats">
          <span>{video.views}</span>
          <span>{video.likes}</span>
          <span>{video.published}</span>
        </div>
        <details>
          <summary>Why we selected this video</summary>
          <p>{video.reason}</p>
        </details>
        <a
          className="youtube-link"
          href={`https://www.youtube.com/watch?v=${video.id}`}
          target="_blank"
          rel="noreferrer"
        >
          Watch on YouTube ↗
        </a>
      </div>
    </article>
  );
}

export function Footer() {
  const { t } = useI18n();
  return (
    <footer className={shell.footer} data-shell="footer" translate="no">
      <div className={shell.footerInner}>
        <div className={shell.footerLead}>
          <Link prefetch={false} className={shell.brand} href="/" aria-label="Savora home">
            <SavoraLogoMark className={shell.mark} />
            <span className={shell.wordmark}>Savora</span>
          </Link>
          <p>{t("footer.tagline")}</p>
        </div>
        <nav aria-labelledby="footer-discover">
          <h2 id="footer-discover">{t("footer.discover")}</h2>
          <Link prefetch={false} href="/explore">{t("footer.cuisines")}</Link>
          <Link prefetch={false} href="/world-map">{t("footer.foodMap")}</Link>
          <Link prefetch={false} href="/community">{t("nav.community")}</Link>
          <Link prefetch={false} href="/stories/autumn-table">{t("nav.autumn")}</Link>
        </nav>
        <nav aria-labelledby="footer-kitchen">
          <h2 id="footer-kitchen">{t("footer.kitchen")}</h2>
          <Link prefetch={false} href="/skills">{t("nav.skills")}</Link>
          <Link href="/recipe-box" prefetch={false}>{t("footer.recipeBox")}</Link>
          <Link href="/meal-planner" prefetch={false}>{t("footer.planner")}</Link>
          <Link href="/grocery-list" prefetch={false}>{t("footer.grocery")}</Link>
          <Link href="/pantry" prefetch={false}>{t("footer.pantry")}</Link>
        </nav>
        <nav aria-labelledby="footer-contribute">
          <h2 id="footer-contribute">{t("footer.contribute")}</h2>
          <Link prefetch={false} href="/share">{t("nav.share")}</Link>
          {import.meta.env.DEV ? <Link prefetch={false} href="/library">{t("footer.assets")}</Link> : null}
          <Link prefetch={false} href="/trust">{t("footer.trust")}</Link>
          <Link href="/settings" prefetch={false}>{t("footer.settings")}</Link>
          <a href="/images/ATTRIBUTIONS.md">{t("footer.credits")}</a>
        </nav>
        <p className={shell.footerBottom}>© 2026 Savora · {t("footer.credit")}</p>
      </div>
    </footer>
  );
}
