import { useCallback, useEffect, useRef, useState } from "react";
const EXIT_MS = 180;
/** Plays a short exit animation before unmounting; instant when Reduced Motion is on. */
export function useExit(onDone: () => void): [boolean, () => void] {
  const [closing, setClosing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const close = useCallback(() => {
    if (timer.current) return;
    const reduced = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) { done.current(); return; }
    setClosing(true);
    timer.current = setTimeout(() => done.current(), EXIT_MS);
  }, []);
  return [closing, close];
}
