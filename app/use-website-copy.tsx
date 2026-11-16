"use client";
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "./i18n";
import { formatWebsiteHeading, getWebsiteCopy } from "./website-copy";
const identity = (value: string) => value;

// React-owned dynamic labels avoid mutating form values or private preview fields.
export function useWebsiteCopy() {
  const { locale } = useI18n();
  const [loaded, setLoaded] = useState<{ locale: string; copy: (value: string) => string } | null>(null);
  useEffect(() => {
    let active = true;
    void getWebsiteCopy(locale).then(copy => { if (active) setLoaded({ locale, copy }); });
    return () => { active = false; };
  }, [locale]);
  const copy = loaded?.locale === locale ? loaded.copy : identity;
  return useMemo(() => (value: string, options?: { heading?: boolean }) => {
    const translated = copy(value);
    return options?.heading ? formatWebsiteHeading(translated, locale) : translated;
  }, [copy, locale]);
}
