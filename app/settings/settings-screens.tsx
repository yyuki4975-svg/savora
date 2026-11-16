"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { AccountControls } from "../account/account-controls";
import { useI18n, type Locale } from "../i18n";
import { useWebsiteCopy } from "../use-website-copy";
import type { SettingsSection } from "./settings-sections";
import styles from "./settings.module.css";
import { clearTaste, setTasteEnabled, tasteEnabled, tasteSize } from "../../lib/search/taste-profile";
import { downloadMyData, type DataExport } from "../../lib/data-export";


const languageOptions: Array<[Locale, string]> = [["en", "English"], ["zh", "中文"], ["ja", "日本語"], ["fr", "Français"], ["it", "Italiano"], ["es", "Español"]];
type ThemeChoice = "light" | "dark" | "system";
const themeLabels: Record<ThemeChoice, string> = { light: "Light", dark: "Dark", system: "Match this device" };

const icons = {
  account: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0",
  language: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm-9 9h18M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9s1-6.5 3.5-9Z",
  appearance: "M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9Z",
  notifications: "M6 16V11a6 6 0 0 1 12 0v5l2 2H4l2-2Zm4 4h4",
  data: "M7 3h10v18H7zM11 18h2",
  trust: "M12 3 5 6v6c0 4 3 7.5 7 9 4-1.5 7-5 7-9V6l-7-3Z",
} as const;

// Device-only kitchen records. Language and theme preferences are deliberately not included.
function deviceKitchenKeys() {
  const keys: string[] = [];
  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key && (["savora-recipe-status", "savora-recipe-notes", "savora-recipe-draft", "savora-kitchen-plans-v1"].includes(key) || key.startsWith("savora-grocery-") || key.startsWith("savora-cook-"))) keys.push(key);
    }
  } catch { /* Storage can be blocked; nothing to list. */ }
  return keys;
}

// Same switch the header toggle performs: the bootstrap script in layout.tsx reads savora-theme on load.
function applyTheme(dark: boolean) {
  const root = document.documentElement;
  root.setAttribute("data-theme", dark ? "dark" : "light");
  root.style.setProperty("color-scheme", dark ? "dark" : "light");
}

function readTheme(): ThemeChoice {
  try { const saved = window.localStorage.getItem("savora-theme"); return saved === "light" || saved === "dark" ? saved : "system"; } catch { return "system"; }
}

/** Reads browser-only state after hydration so the server and client render the same first frame. */
function useAfterMount<T>(read: () => T, fallback: T) {
  const [value, setValue] = useState<T>(fallback);
  useEffect(() => { const timer = window.setTimeout(() => setValue(read()), 0); return () => window.clearTimeout(timer); }, [read]);
  return [value, setValue] as const;
}

function Icon({ path }: { path: string }) {
  return <span className={styles.icon} aria-hidden="true"><svg viewBox="0 0 24 24"><path d={path} /></svg></span>;
}

function Screen({ title, back, children }: { title: string; back: string; children: ReactNode }) {
  const copy = useWebsiteCopy();
  return (
    <div className={styles.page} data-website-page>
      <div className={styles.bar}>
        <Link className={styles.back} href={back} aria-label={copy("Back")}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
        </Link>
        <h1>{copy(title)}</h1>
      </div>
      {children}
    </div>
  );
}

function Row({ href, icon, label, value }: { href: string; icon?: string; label: string; value?: string }) {
  const copy = useWebsiteCopy();
  return (
    <li>
      <Link className={styles.row} href={href}>
        {icon ? <Icon path={icon} /> : null}
        <span className={styles.label}>{copy(label)}</span>
        {value ? <span className={styles.value}>{value}</span> : null}
        <span className={styles.chevron} aria-hidden="true">›</span>
      </Link>
    </li>
  );
}

function Choice({ label, selected, onSelect }: { label: string; selected: boolean; onSelect: () => void }) {
  return (
    <li>
      <button type="button" className={styles.row} aria-pressed={selected} onClick={onSelect}>
        <span className={styles.label}>{label}</span>
        {selected ? <span className={styles.check} aria-hidden="true">✓</span> : null}
      </button>
    </li>
  );
}

export function SettingsHome() {
  const copy = useWebsiteCopy();
  const { locale } = useI18n();
  const [theme] = useAfterMount(readTheme, "system");
  const languageName = languageOptions.find(([value]) => value === locale)?.[1] ?? "English";
  return (
    <Screen title="Settings" back="/profile">
      <ul className={styles.list}>
        <Row href="/settings/account" icon={icons.account} label="Account" />
        <Row href="/settings/language" icon={icons.language} label="Language" value={languageName} />
        <Row href="/settings/appearance" icon={icons.appearance} label="Appearance" value={copy(themeLabels[theme])} />
      </ul>
      <ul className={styles.list}>
        <Row href="/settings/notifications" icon={icons.notifications} label="Notifications" />
        <Row href="/settings/data" icon={icons.data} label="Data on this device" />
      </ul>
      <ul className={styles.list}>
        <Row href="/trust" icon={icons.trust} label="Trust & safety" />
      </ul>
    </Screen>
  );
}

function AccountScreen() {
  return (
    <Screen title="Account" back="/settings">
      <div className={styles.panel}><AccountControls /></div>
      <ul className={styles.list}>
        <Row href="/account/forgot-password" label="Reset password" />
        <Row href="/recipe-box" label="Open my kitchen" />
      </ul>
    </Screen>
  );
}

function LanguageScreen() {
  const { locale, setLocale } = useI18n();
  return (
    <Screen title="Language" back="/settings">
      <ul className={styles.list}>
        {languageOptions.map(([value, label]) => <Choice key={value} label={label} selected={locale === value} onSelect={() => setLocale(value)} />)}
      </ul>
    </Screen>
  );
}

function AppearanceScreen() {
  const copy = useWebsiteCopy();
  const [theme, setTheme] = useAfterMount(readTheme, "system");
  function choose(next: ThemeChoice) {
    setTheme(next);
    applyTheme(next === "system" ? window.matchMedia("(prefers-color-scheme: dark)").matches : next === "dark");
    try { if (next === "system") window.localStorage.removeItem("savora-theme"); else window.localStorage.setItem("savora-theme", next); } catch { /* Applies for this visit only. */ }
  }
  return (
    <Screen title="Appearance" back="/settings">
      <ul className={styles.list}>
        {(["light", "dark", "system"] as const).map((value) => <Choice key={value} label={copy(themeLabels[value])} selected={theme === value} onSelect={() => choose(value)} />)}
      </ul>
    </Screen>
  );
}

function NotificationsScreen() {
  const copy = useWebsiteCopy();
  return (
    <Screen title="Notifications" back="/settings">
      <p className={styles.empty}>{copy("No notifications yet.")}</p>
    </Screen>
  );
}

function DataScreen() {
  const copy = useWebsiteCopy();
  const [keys, setKeys] = useAfterMount(deviceKitchenKeys, []);
  const [cleared, setCleared] = useState(false);
  // On-device taste profile for "Picked for you" (lib/search/taste-profile.ts).
  const [tasteOn, setTasteOn] = useAfterMount(tasteEnabled, true);
  const [tasteCount, setTasteCount] = useAfterMount(tasteSize, 0);
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState<DataExport["account"] | "failed" | null>(null);
  async function exportData() {
    setExporting(true);
    try { setExported((await downloadMyData()).account); } catch { setExported("failed"); }
    finally { setExporting(false); }
  }
  const exportMessages = {
    "included": "Download started: this browser plus your account kitchen, meal plan and recipe drafts.",
    "signed-out": "Download started with this browser's data. Sign in first to include your account kitchen.",
    "unavailable": "Download started with this browser's data only; the account service could not be reached.",
    "failed": "The file could not be created. Nothing was changed.",
  } as const;
  function clear() {
    if (!window.confirm(copy("Remove recipe statuses, notes, the Share draft and prep plans stored in this browser? Your account is not affected."))) return;
    try { deviceKitchenKeys().forEach((key) => window.localStorage.removeItem(key)); } catch { /* Nothing removed. */ }
    setKeys(deviceKitchenKeys());
    setCleared(true);
  }
  return (
    <Screen title="Data on this device" back="/settings">
      <ul className={styles.list} data-private>
        <li><button type="button" className={styles.row} disabled={exporting} onClick={() => void exportData()}><span className={styles.label}>{copy(exporting ? "Preparing your file…" : "Download my data")}</span><span className={styles.value}>JSON</span></button></li>
      </ul>
      <p role="status" className={styles.empty}>{exported ? copy(exportMessages[exported]) : copy("One file with the recipes, notes, plans and grocery lists saved in this browser, and your account kitchen and recipe drafts when you are signed in.")}</p>
      <ul className={styles.list} data-private>
        <li className={styles.static}><span className={styles.label}>{copy("Kitchen records")}</span><span className={styles.value}>{keys.length}</span></li>
        <li><button type="button" className={`${styles.row} ${styles.danger}`} disabled={!keys.length} onClick={clear}><span className={styles.label}>{copy("Clear device kitchen")}</span></button></li>
      </ul>
      {cleared ? <p role="status" className={styles.empty}>{copy("Device kitchen cleared.")}</p> : null}
      <ul className={styles.list} data-private>
        <li><button type="button" className={styles.row} role="switch" aria-checked={tasteOn} onClick={() => { setTasteEnabled(!tasteOn); setTasteOn(!tasteOn); setTasteCount(tasteSize()); }}><span className={styles.label}>{copy("Personalized recommendations")}</span><span className={styles.value}>{copy(tasteOn ? "On" : "Off")}</span></button></li>
        <li className={styles.static}><span className={styles.label}>{copy("Taste signals on this device")}</span><span className={styles.value}>{tasteCount}</span></li>
        <li><button type="button" className={`${styles.row} ${styles.danger}`} disabled={!tasteCount} onClick={() => { clearTaste(); setTasteCount(0); }}><span className={styles.label}>{copy("Clear taste history")}</span></button></li>
      </ul>
      <p className={styles.empty}>{copy("Recommendations learn only from what you search and open in this browser. Nothing is sent to Savora, and half of every list is kept for something different.")}</p>
    </Screen>
  );
}

export function SettingsSectionScreen({ section }: { section: SettingsSection }) {
  if (section === "account") return <AccountScreen />;
  if (section === "language") return <LanguageScreen />;
  if (section === "appearance") return <AppearanceScreen />;
  if (section === "notifications") return <NotificationsScreen />;
  return <DataScreen />;
}
