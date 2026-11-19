import type { Weather } from "../weather/types";
import type { AirQuality } from "../air-quality/types";
import type { Key } from "../i18n/strings";

export type Tone = "calm" | "rain" | "dust" | "heat" | "wind" | "unknown";
export interface Headline {
  key: Key;
  /** The accented keyword, substituted for {kw}. */
  keyword: string;
  tone: Tone;
}
/**
 * One-line "what to look at first". Presentation only: built from already
 * validated model data (caller passes data only when freshness allows assessment).
 * Hourly data limits rain timing to the hour; never claims minute precision.
 */
export function headline(
  weather: Weather | undefined,
  air: AirQuality | undefined,
  formatTime: (epoch: number) => string,
  now = Date.now() / 1000,
): Headline {
  const c = weather?.current;
  if (!weather || !c || c.temperature === null) return { key: "h.unknown", keyword: "", tone: "unknown" };
  const aqi = air?.aqi ?? null;
  if (aqi !== null && aqi > 150) return { key: "h.dust", keyword: `AQI ${Math.round(aqi)}`, tone: "dust" };
  if (c.apparent !== null && c.apparent >= 40) return { key: "h.heat", keyword: `${Math.round(c.apparent)}°`, tone: "heat" };
  if (c.wind !== null && c.wind >= 50) return { key: "h.wind", keyword: `${Math.round(c.wind)} km/h`, tone: "wind" };
  // Hours are stamped at their start; include the hour that is in progress.
  const next = weather.hourly.filter((h) => h.time > now - 3600 && h.time < now + 6 * 3600);
  const wet = next.find((h) => (h.probability ?? 0) >= 60 || (h.precipitation ?? 0) >= 0.5);
  if (wet) {
    return wet.time <= now
      ? { key: "h.rainNow", keyword: `${wet.probability ?? "—"}%`, tone: "rain" }
      : { key: "h.rainAt", keyword: formatTime(wet.time), tone: "rain" };
  }
  if (aqi !== null && aqi > 100) return { key: "h.dustModerate", keyword: `AQI ${Math.round(aqi)}`, tone: "dust" };
  if (next.length < 2) return { key: "h.unknown", keyword: "", tone: "unknown" };
  return { key: "h.calm", keyword: "", tone: "calm" };
}
export function maxRainChance(weather: Weather | undefined, now = Date.now() / 1000) {
  const next = weather?.hourly.filter((h) => h.time > now - 3600 && h.time < now + 6 * 3600 && h.probability !== null) ?? [];
  return next.length ? Math.max(...next.map((h) => h.probability!)) : null;
}
export type AqiBand = { key: Key; color: string; index: number };
export function aqiBand(v: number | null): AqiBand | null {
  if (v === null) return null;
  if (v <= 50) return { key: "aqi.good", color: "#3ddc84", index: 0 };
  if (v <= 100) return { key: "aqi.moderate", color: "#ffd84a", index: 1 };
  if (v <= 150) return { key: "aqi.sensitive", color: "#ff9f43", index: 2 };
  if (v <= 200) return { key: "aqi.unhealthy", color: "#ff5b6b", index: 3 };
  if (v <= 300) return { key: "aqi.very", color: "#a66cff", index: 4 };
  return { key: "aqi.hazard", color: "#9b2d4a", index: 5 };
}
