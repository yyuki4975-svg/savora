"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ProfileRecipe, ProfileGalleryResult } from "../../lib/api/profile-gallery";
import { Footer, Header } from "../ui";
import { AccountControls } from "../account/account-controls";
import { useWebsiteCopy } from "../use-website-copy";
import styles from "./profile.module.css";

// Settings live on their own page (/settings); the profile only links to it.
function SettingsList() {
  const copy = useWebsiteCopy();
  return (
    <nav className={styles.settingsSection} aria-label={copy("Settings")}>
      <Link className={styles.settingsLink} href="/settings" prefetch={false}>
        <span className={styles.settingIcon} aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-2-1.2L14.5 3h-4l-.4 2.6a7.6 7.6 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.6 7.6 0 0 0 2 1.2l.4 2.6h4l.4-2.6a7.6 7.6 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z" /></svg></span>
        <strong>{copy("Settings")}</strong>
        <b aria-hidden="true">›</b>
      </Link>
    </nav>
  );
}

type SavedState = "Favorite" | "Want to cook" | "Cooking" | "Cooked";
type SavedItem = { slug: string; status: SavedState };
type ProfileState =
  | { kind: "loading" | "guest" | "error" }
  | { kind: "ready"; displayName: string; items: SavedItem[]; noteCount: number; plannedCount: number };
type ProfileTab = "saved" | "gallery";

const collections: SavedState[] = ["Favorite", "Want to cook", "Cooking", "Cooked"];
const collectionNames: Record<SavedState, string> = {
  Favorite: "Favorites",
  "Want to cook": "Want to cook",
  Cooking: "Cooking now",
  Cooked: "Cooked",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readProfile(value: unknown): ProfileState {
  if (!isRecord(value) || !isRecord(value.user) || !isRecord(value.state)) return { kind: "error" };
  const displayName = value.user.displayName;
  if (typeof displayName !== "string" || displayName.length > 160) return { kind: "error" };

  const recipeStatus = isRecord(value.state.recipeStatus) ? value.state.recipeStatus : {};
  const notes = isRecord(value.state.notes) ? value.state.notes : {};
  const mealPlan = isRecord(value.state.mealPlan) ? value.state.mealPlan : {};
  const items = Object.entries(recipeStatus)
    .filter(([slug, status]) => /^[a-z0-9][a-z0-9-]{0,119}$/.test(slug) && collections.includes(status as SavedState))
    .slice(0, 500)
    .map(([slug, status]) => ({ slug, status: status as SavedState }));

  return {
    kind: "ready",
    displayName: displayName.trim(),
    items,
    noteCount: Object.values(notes).filter((entry) => typeof entry === "string" && entry.trim()).length,
    plannedCount: Object.values(mealPlan).filter((entry) => typeof entry === "string" && entry.trim()).length,
  };
}

function ProfileMark({ name }: { name: string | null }) {
  if (name) return <span className={styles.profileMark} aria-hidden="true">{name.slice(0, 1).toLocaleUpperCase()}</span>;
  return (
    <span className={styles.profileMark} aria-hidden="true">
      <svg viewBox="0 0 32 32" fill="none"><circle cx="16" cy="11" r="5" /><path d="M6.5 27c.7-6 4-9 9.5-9s8.8 3 9.5 9" /></svg>
    </span>
  );
}

function RecipeTile({ recipe }: { recipe: ProfileRecipe }) {
  const copy = useWebsiteCopy();
  return (
    <Link className={styles.recipeTile} href={`/recipes/${recipe.slug}`} aria-label={copy(`Open ${recipe.title}`)}>
      <Image src={recipe.image} alt={recipe.alt} fill sizes="(max-width: 520px) 44vw, 206px" />
      <span className={styles.tileCaption}>
        <small>{copy(recipe.place ?? recipe.category)}</small>
        <strong>{recipe.title}</strong>
      </span>
    </Link>
  );
}

function CollectionHeading({ title, count }: { title: string; count?: number }) {
  const copy = useWebsiteCopy();
  return <h2 className={styles.collectionHeading}>{copy(title)}{count !== undefined ? <small>{count}</small> : null}</h2>;
}

function IntroState({ copy, href, action, prefetch }: { copy: string; href: string; action: string; prefetch?: false }) {
  const localize = useWebsiteCopy();
  return (
    <div className={styles.introState}>
      <p>{localize(copy)}</p>
      <Link href={href} prefetch={prefetch}>{localize(action)}<span aria-hidden="true">↗</span></Link>
    </div>
  );
}

export function ProfileExperience({ catalog: initialCatalog }: { catalog: ProfileGalleryResult }) {
  const copy = useWebsiteCopy();
  const [profile, setProfile] = useState<ProfileState>({ kind: "loading" });
  const [catalog, setCatalog] = useState(initialCatalog);
  const [tab, setTab] = useState<ProfileTab>("saved");

  useEffect(() => {
    const syncTab = () => setTab(window.location.hash === "#gallery" ? "gallery" : "saved");
    syncTab();
    window.addEventListener("hashchange", syncTab);
    return () => window.removeEventListener("hashchange", syncTab);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    // Keep private state on the existing authenticated endpoint and ignore stale responses.
    // https://react.dev/reference/react/useEffect#fetching-data-with-effects
    fetch("/api/user-state", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (response.status === 401) return { kind: "guest" } as ProfileState;
        if (!response.ok) return { kind: "error" } as ProfileState;
        return readProfile(await response.json() as unknown);
      })
      .then(async (next) => {
        if (controller.signal.aborted) return;
        if (next.kind === "ready" && next.items.length) {
          try {
            const response = await fetch("/api/catalog/profile-tiles", {
              method: "POST", signal: controller.signal, cache: "no-store",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ slugs: next.items.map(item => item.slug) }),
            });
            const result = response.ok ? await response.json() as ProfileGalleryResult : null;
            if (!controller.signal.aborted) setCatalog(result?.status === "ok" && Array.isArray(result.recipes)
              ? result : { status: "error", message: "Published archive unavailable" });
          } catch {
            if (!controller.signal.aborted) setCatalog({ status: "error", message: "Published archive unavailable" });
          }
        }
        if (!controller.signal.aborted) setProfile(next);
      })
      .catch(() => { if (!controller.signal.aborted) setProfile({ kind: "error" }); });
    return () => controller.abort();
  }, []);

  const recipeMap = useMemo(() => new Map(catalog.status === "ok" ? catalog.recipes.map((recipe) => [recipe.slug, recipe]) : []), [catalog]);
  const savedGroups = collections.map((status) => ({
    status,
    recipes: profile.kind === "ready" ? profile.items.flatMap((item) => item.status === status && recipeMap.has(item.slug) ? [recipeMap.get(item.slug)!] : []) : [],
  })).filter((group) => group.recipes.length > 0);
  const visibleCount = savedGroups.reduce((count, group) => count + group.recipes.length, 0);
  const otherCount = profile.kind === "ready" ? Math.max(0, profile.items.length - visibleCount) : 0;
  const featured = catalog.status === "ok"
    ? ["paella", "bibimbap", "ramen"].flatMap((slug) => recipeMap.has(slug) ? [recipeMap.get(slug)!] : []).concat(catalog.recipes.filter((recipe) => !["paella", "bibimbap", "ramen"].includes(recipe.slug))).slice(0, 3)
    : [];
  const displayName = profile.kind === "ready" && profile.displayName && !profile.displayName.includes("@") ? profile.displayName : null;

  return (
    <main className={styles.page} data-website-page>
      <Header />
      <header className={styles.identity}>
        <ProfileMark name={displayName} />
        <h1>{displayName ?? copy("Your profile")}</h1>
      </header>
      <AccountControls />
      <nav className={styles.profileNav} aria-label={copy("Profile views")}>
        <a href="#saved" className={tab === "saved" ? styles.activeTab : ""} aria-current={tab === "saved" ? "location" : undefined}>{copy("Saved")}</a>
        <a href="#gallery" className={tab === "gallery" ? styles.activeTab : ""} aria-current={tab === "gallery" ? "location" : undefined}>{copy("Gallery")}</a>
      </nav>

      <div className={styles.content}>
        {tab === "saved" ? (
          <div id="saved" className={styles.savedView}>
            {profile.kind === "loading" ? <IntroState copy="Opening your collection…" href="/explore" action="Explore recipes" /> : null}
            {profile.kind === "error" ? <IntroState copy="Your personal collection is temporarily unavailable." href="/profile" action="Try again" /> : null}

            {(profile.kind === "guest" || (profile.kind === "ready" && profile.items.length === 0)) && featured.length > 0 ? (
              <section className={styles.collectionSection} aria-label={copy("From the published archive")}>
                <CollectionHeading title="From the archive" />
                <p className={styles.archiveNote}>{copy("A few published dishes to explore — not personal saves.")}</p>
                <div className={styles.tileGrid}>{featured.map((recipe) => <RecipeTile key={recipe.slug} recipe={recipe} />)}</div>
              </section>
            ) : null}
            {profile.kind === "guest" ? <IntroState copy="Account-saved recipes appear here when you're signed in." href="/recipe-box" prefetch={false} action="Open recipe box" /> : null}
            {profile.kind === "ready" && profile.items.length === 0 ? <IntroState copy="No recipes saved yet. Keep the dishes you want to revisit." href="/explore" action="Explore recipes" /> : null}

            {savedGroups.map(({ status, recipes }) => (
              <section className={styles.collectionSection} key={status} aria-label={copy(collectionNames[status])}>
                <CollectionHeading title={collectionNames[status]} count={recipes.length} />
                <div className={styles.tileGrid}>{recipes.map((recipe) => <RecipeTile key={recipe.slug} recipe={recipe} />)}</div>
              </section>
            ))}
            {otherCount > 0 ? <IntroState copy={`${otherCount} saved ${otherCount === 1 ? "item is" : "items are"} not in the published recipe gallery.`} href="/recipe-box" prefetch={false} action="View all saved items" /> : null}
            {profile.kind === "ready" && profile.items.length > 0 && catalog.status !== "ok" ? <IntroState copy="Recipe images are temporarily unavailable, but your saved items remain in the recipe box." href="/recipe-box" prefetch={false} action="Open recipe box" /> : null}

            {catalog.status === "error" && profile.kind === "guest" ? <IntroState copy="The published archive is temporarily unavailable." href="/explore" action="Explore later" /> : null}
          </div>
        ) : (
          <div id="gallery" className={styles.galleryView}>
            <section className={styles.collectionSection} aria-label={copy("Your galleries")}>
              <CollectionHeading title="Your galleries" count={savedGroups.length || undefined} />
              {savedGroups.length > 0 ? (
                <div className={styles.tileGrid}>
                  {savedGroups.map(({ status, recipes }) => (
                    <Link className={styles.recipeTile} href="/recipe-box" prefetch={false} key={status} aria-label={copy(`Open ${collectionNames[status]} in your recipe box`)}>
                      <Image src={recipes[0].image} alt="" fill sizes="(max-width: 520px) 44vw, 206px" />
                      <span className={styles.tileCaption}><small>{recipes.length === 1 ? copy("1 recipe") : copy(`${recipes.length} recipes`)}</small><strong>{copy(collectionNames[status])}</strong></span>
                    </Link>
                  ))}
                </div>
              ) : <IntroState copy={profile.kind === "loading" ? "Opening your galleries…" : "Your galleries will take shape as you save recipes."} href="/explore" action="Explore recipes" />}
            </section>
            <section className={styles.toolSection} aria-label={copy("Kitchen tools")}>
              <CollectionHeading title="Your kitchen" />
              <div className={styles.toolLinks}>
                <Link href="/recipe-box" prefetch={false}>{copy("Recipe box")}{profile.kind === "ready" && profile.noteCount > 0 ? <small>{copy(`${profile.noteCount} private notes`)}</small> : null}</Link>
                <Link href="/meal-planner" prefetch={false}>{copy("Meal planner")}{profile.kind === "ready" && profile.plannedCount > 0 ? <small>{copy(`${profile.plannedCount} planned meals`)}</small> : null}</Link>
                <Link href="/grocery-list" prefetch={false}>{copy("Grocery list")}</Link>
                <Link href="/pantry" prefetch={false}>{copy("Pantry matcher")}</Link>
                <Link href="/share">{copy("Share a recipe")}</Link>
                <Link href="/settings" prefetch={false}>{copy("Preferences")}</Link>
              </div>
            </section>
          </div>
        )}
        <SettingsList />
      </div>
      <Footer />
    </main>
  );
}
