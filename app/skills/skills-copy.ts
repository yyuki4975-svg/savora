"use client";
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "../i18n";
import { createWebsiteCopy, formatWebsiteHeading } from "../website-copy";

const identity = (value: string) => value;
const loaders = {
  zh: () => import("../locales/skills/zh.json"),
  ja: () => import("../locales/skills/ja.json"),
  fr: () => import("../locales/skills/fr.json"),
  it: () => import("../locales/skills/it.json"),
  es: () => import("../locales/skills/es.json"),
};
const pending = new Map<string, Promise<(value: string) => string>>();

// One lazy, reviewed skills-only bundle per selected language. No runtime model call.
function loadCopy(locale: keyof typeof loaders) {
  let work = pending.get(locale);
  if (!work) {
    work = loaders[locale]().then(module => createWebsiteCopy(module.default));
    pending.set(locale, work);
    void work.catch(() => { pending.delete(locale); });
  }
  return work;
}

export function useSkillsCopy() {
  const { locale } = useI18n();
  const [loaded, setLoaded] = useState<{ locale: string; copy: (value: string) => string } | null>(null);
  useEffect(() => {
    let active = true;
    if (locale !== "en") {
      void loadCopy(locale).then(copy => { if (active) setLoaded({ locale, copy }); })
        .catch(() => { if (active) setLoaded({ locale, copy: identity }); });
    }
    return () => { active = false; };
  }, [locale]);
  const copy = locale !== "en" && loaded?.locale === locale ? loaded.copy : identity;
  return useMemo(() => (value: string, options?: { heading?: boolean }) => {
    const translated = copy(value);
    return options?.heading ? formatWebsiteHeading(translated, locale) : translated;
  }, [copy, locale]);
}
