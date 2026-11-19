import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { LANGS, translate, type Key, type Lang } from "./strings";
import type { Location } from "../locations/types";
import type { FreshnessKind } from "../reliability/freshness";
import { nearestProvince } from "../locations/region";

const LANG_KEY = "ww-lang";
export function readLang(): Lang {
  try {
    const v = localStorage.getItem(LANG_KEY);
    return v === "en" || v === "zh" ? v : "th";
  } catch {
    return "th";
  }
}
function makeApi(lang: Lang, setLang: (l: Lang) => void) {
  const locale = LANGS.find((l) => l.id === lang)!.locale;
  const t = (key: Key, params?: Record<string, string | number>) => translate(lang, key, params);
  const time = (epoch: number | null | undefined, timeZone: string) =>
    epoch == null || !Number.isFinite(epoch)
      ? "—"
      : new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone }).format(new Date(epoch * 1000));
  const hour = (epoch: number, timeZone: string) =>
    new Intl.DateTimeFormat(locale, { hour: "2-digit", hourCycle: "h23", timeZone }).format(new Date(epoch * 1000)).replace(/\D/g, "");
  const weekday = (epoch: number, offset: number) =>
    new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }).format(new Date((epoch + offset) * 1000));
  const fullTime = (epoch: number | null | undefined, timeZone: string) =>
    epoch == null || !Number.isFinite(epoch)
      ? "—"
      : new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone }).format(new Date(epoch * 1000));
  /** Location name in the UI language. Province/city data has Thai + English (+ Chinese for CN cities). */
  const placeName = (l: Location): string => {
    if (l.kind === "coordinates") return t("loc.near", { name: placeName(nearestProvince(l.latitude, l.longitude)) });
    if (l.kind === "geolocation") return t("loc.myLocation");
    if (lang === "th" || !l.english || l.kind === "place") return l.name;
    const [latin, chinese] = l.english.split(/\s*·\s*/);
    return lang === "zh" && chinese ? chinese : latin ?? l.name;
  };
  /** Secondary line under a name: the other-script name where it helps. */
  const placeSub = (l: Location): string => (lang === "th" || (lang === "en" && l.kind === "place") ? l.english ?? "" : "");
  const fresh = (k: FreshnessKind) => t(`fresh.${k}` as Key);
  /** Provider messages are Thai (kept data layer); other languages get a translated generic reason. */
  const errorText = (e: unknown) => {
    const m = e instanceof Error ? e.message : "";
    if (lang === "th") return m;
    return t(/ช้า|timeout/i.test(m) ? "err.timeout" : /ตอบกลับ|\d{3}/.test(m) ? "err.status" : "err.connection");
  };
  return { lang, setLang, locale, t, time, hour, weekday, fullTime, placeName, placeSub, fresh, errorText };
}
export type I18n = ReturnType<typeof makeApi>;
// Default (no provider) is Thai, so components render correctly in isolation and in tests.
const Ctx = createContext<I18n>(makeApi("th", () => {}));
export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(readLang);
  useEffect(() => {
    document.documentElement.lang = lang === "zh" ? "zh-CN" : lang;
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {
      /* optional preference */
    }
  }, [lang]);
  const api = useMemo(() => makeApi(lang, setLang), [lang]);
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}
export const useI18n = () => useContext(Ctx);
