import { useEffect, useState } from "react";
/**
 * Glass surfaces use backdrop blur. "solid" swaps them for opaque-ish fills with no blur:
 * - user choice in Settings, or
 * - automatic when the browser lacks backdrop-filter, Save-Data is on, or the device reports very low resources.
 * prefers-reduced-transparency is handled in CSS so it also applies before JS runs.
 * Heuristics are deliberately conservative so current iPhones keep glass by default.
 */
export type GlassPref = "auto" | "solid";
const KEY = "ww-glass";
export function readGlass(): GlassPref {
  try { return localStorage.getItem(KEY) === "solid" ? "solid" : "auto"; } catch { return "auto"; }
}
export function lowPowerDevice(): boolean {
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  const blur = typeof CSS !== "undefined" && typeof CSS.supports === "function" &&
    (CSS.supports("backdrop-filter", "blur(1px)") || CSS.supports("-webkit-backdrop-filter", "blur(1px)"));
  return !blur || !!nav.connection?.saveData || (nav.deviceMemory !== undefined && nav.deviceMemory <= 2) ||
    (nav.hardwareConcurrency !== undefined && nav.hardwareConcurrency > 0 && nav.hardwareConcurrency <= 2);
}
export function useGlass() {
  const [pref, setPref] = useState<GlassPref>(readGlass);
  const solid = pref === "solid" || lowPowerDevice();
  useEffect(() => {
    document.documentElement.dataset.glass = solid ? "solid" : "glass";
    try { localStorage.setItem(KEY, pref); } catch { /* optional */ }
  }, [pref, solid]);
  return { pref, setPref, solid };
}
