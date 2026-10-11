import { useEffect, useState } from "react";
import { readAppearance, saveAppearance, resolveTheme } from "./preferences";
import type { Appearance } from "./preferences";
export function useTheme() {
  const [appearance, set] = useState<Appearance>(readAppearance);
  const [systemDark, setDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
  useEffect(() => {
    const m = window.matchMedia("(prefers-color-scheme: dark)");
    const handle = () => setDark(m.matches);
    m.addEventListener("change", handle);
    return () => m.removeEventListener("change", handle);
  }, []);
  const theme = resolveTheme(appearance, systemDark);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    saveAppearance(appearance);
  }, [appearance, theme]);
  return { appearance, setAppearance: set, theme };
}
