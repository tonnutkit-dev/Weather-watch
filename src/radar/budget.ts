import { decodeRadarImage } from "./decode";
// Per-app rolling request cap below RainViewer's documented 100/IP/min.
const starts: number[] = [];
const cache = new Map<string, { at: number; data: ArrayBuffer }>();
export const RADAR_BUDGET = 80;
export function remainingBudget(now = Date.now()) {
  while (starts[0] !== undefined && starts[0] <= now - 60000) starts.shift();
  return RADAR_BUDGET - starts.length;
}
export async function radarImage(
  url: string,
  signal: AbortSignal,
): Promise<ArrayBuffer> {
  const parsed = new URL(url);
  if (
    parsed.protocol !== "https:" ||
    !parsed.hostname.endsWith(".rainviewer.com")
  )
    throw new Error("Untrusted radar URL");
  signal.throwIfAborted();
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < 300000) return hit.data.slice(0);
  // Timed waits are abortable and bounded by queue; do not start network calls past budget.
  while (remainingBudget() === 0) {
    await new Promise<void>((resolve, reject) => {
      if (signal.aborted) {
        reject(new DOMException("Aborted", "AbortError"));
        return;
      }
      const abort = () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      };
      const timer = window.setTimeout(
        () => {
          signal.removeEventListener("abort", abort);
          resolve();
        },
        Math.max(50, (starts[0] ?? Date.now()) + 60050 - Date.now()),
      );
      signal.addEventListener("abort", abort, { once: true });
    });
  }
  if (signal.aborted) throw new DOMException("Aborted", "AbortError");
  starts.push(Date.now());
  const r = await fetch(url, {
    signal: AbortSignal.any([signal, AbortSignal.timeout(12000)]),
  });
  if (!r.ok) throw new Error(`Radar tiles ${r.status}`);
  const data = await r.arrayBuffer();
  await decodeRadarImage(data, signal);
  cache.set(url, { at: Date.now(), data });
  if (cache.size > 90) cache.delete(cache.keys().next().value!);
  return data.slice(0);
}
