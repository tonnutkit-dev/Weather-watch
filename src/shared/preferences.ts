import type { Location } from "../locations/types";
export type Appearance = "system" | "light" | "dark";
export const THEME_KEY = "ww-appearance";
export function readAppearance(): Appearance {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}
export function saveAppearance(v: Appearance) {
  try {
    localStorage.setItem(THEME_KEY, v);
  } catch {
    /*private mode: state still works*/
  }
}
export const resolveTheme = (pref: Appearance, dark: boolean) =>
  pref === "system" ? (dark ? "dark" : "light") : pref;
export function readFavorites(): Location[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem("ww-favorites") || "[]");
    return Array.isArray(v)
      ? v
          .filter(
            (l): l is Location =>
              l &&
              typeof l === "object" &&
              typeof l.id === "string" &&
              typeof l.name === "string" &&
              typeof l.latitude === "number" &&
              typeof l.longitude === "number" &&
              Number.isFinite(l.latitude) &&
              Number.isFinite(l.longitude) &&
              l.latitude >= -90 &&
              l.latitude <= 90 &&
              l.longitude >= -180 &&
              l.longitude <= 180 &&
              ["TH", "CN"].includes(l.country) &&
              ["Asia/Bangkok", "Asia/Shanghai"].includes(l.timezone),
          )
          .slice(0, 20)
      : [];
  } catch {
    return [];
  }
}
export function saveFavorites(list: Location[]) {
  try {
    localStorage.setItem("ww-favorites", JSON.stringify(list.slice(0, 20)));
  } catch {
    /*no automatic precise location storage*/
  }
}
