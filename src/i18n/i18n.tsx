import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { LANGS, translate, type Key, type Lang } from "./strings";

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
  return { lang, setLang, locale, t, time, hour, weekday, fullTime };
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
