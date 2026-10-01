import { useLang } from "@/contexts/LanguageContext";
import { useCallback } from "react";
import { enGB, fr } from "date-fns/locale";
import type { Lang } from "@/i18n/translations";

export function getActiveLanguage(): Lang {
  try {
    return typeof window !== "undefined" && localStorage.getItem("somiren:lang") === "en" ? "en" : "fr";
  } catch {
    return "fr";
  }
}

export function getUserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function formatLocalDate(
  value: string | number | Date,
  lang: Lang,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "fr-FR", options).format(date);
}

export function useWorkspaceLocale() {
  const { lang, setLang } = useLang();
  const w = useCallback((french: string, english: string) => lang === "en" ? english : french, [lang]);
  const formatDate = useCallback((value: string | number | Date, options?: Intl.DateTimeFormatOptions) =>
    formatLocalDate(value, lang, options), [lang]);
  const formatDateTime = useCallback((value: string | number | Date, options: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" }) =>
    formatLocalDate(value, lang, options), [lang]);
  const formatNumber = useCallback((value: number | bigint, options?: Intl.NumberFormatOptions) =>
    typeof value === "number" && !Number.isFinite(value) ? "—" :
      new Intl.NumberFormat(lang === "en" ? "en-GB" : "fr-FR", options).format(value), [lang]);
  const formatMoney = useCallback((value: number | bigint, currency: string) => {
    if (typeof value === "number" && !Number.isFinite(value)) return "—";
    const code = currency.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(code)) return `${formatNumber(value)} ${currency}`.trim();
    return new Intl.NumberFormat(lang === "en" ? "en-GB" : "fr-FR", { style: "currency", currency: code }).format(value);
  }, [lang, formatNumber]);
  return {
    lang,
    setLang,
    w,
    dateLocale: lang === "en" ? enGB : fr,
    locale: lang === "en" ? "en-GB" : "fr-FR",
    timeZone: getUserTimeZone(),
    formatDate,
    formatDateTime,
    formatNumber,
    formatMoney,
  };
}