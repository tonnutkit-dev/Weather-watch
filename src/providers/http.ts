export class ProviderError extends Error {
  constructor(
    message: string,
    public status = 0,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}
/** Approved logical deadline for a single provider call. Callers may pass a longer first-attempt budget. */
export const PROVIDER_DEADLINE_MS = 12_000;
function deadlineBudget(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : PROVIDER_DEADLINE_MS;
}
export async function fetchJson(
  url: string,
  signal?: AbortSignal,
  deadlineMs?: number,
): Promise<unknown> {
  if (signal?.aborted) throw signal.reason;
  const request = new AbortController();
  let timedOut = false;
  let rejectAbort!: (reason: unknown) => void;
  const aborted = new Promise<never>((_resolve, reject) => {
    rejectAbort = reject;
  });
  const cancel = (reason: unknown) => {
    request.abort(reason);
    rejectAbort(reason);
  };
  const onCallerAbort = () => cancel(signal?.reason);
  signal?.addEventListener("abort", onCallerAbort, { once: true });
  const deadline = setTimeout(() => {
    timedOut = true;
    cancel(new DOMException("Provider deadline exceeded", "TimeoutError"));
  }, deadlineBudget(deadlineMs));
  try {
    const response = async () => {
      const res = await fetch(url, { signal: request.signal });
      if (!res.ok)
        throw new ProviderError(`แหล่งข้อมูลตอบกลับ ${res.status}`, res.status);
      return await res.json();
    };
    // Settle the whole fetch/body operation even if native transport abort stalls.
    return await Promise.race([response(), aborted]);
  } catch (e) {
    if (signal?.aborted) throw e;
    if (e instanceof ProviderError) throw e;
    throw new ProviderError(
      timedOut
        ? "แหล่งข้อมูลตอบช้าเกินไป กรุณาลองใหม่"
        : "เชื่อมต่อแหล่งข้อมูลไม่ได้ ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่",
    );
  } finally {
    clearTimeout(deadline);
    signal?.removeEventListener("abort", onCallerAbort);
  }
}
export const object = (v: unknown): Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
export const finite = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;
export const bounded = (
  v: unknown,
  min: number,
  max: number,
): number | null => {
  const n = finite(v);
  return n !== null && n >= min && n <= max ? n : null;
};
export const series = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
export function assertCoordinates(lat: number, lon: number) {
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    lat < -90 ||
    lat > 90 ||
    lon < -180 ||
    lon > 180
  )
    throw new ProviderError("พิกัดไม่ถูกต้อง");
}
export function endpoint(env: string | undefined, fallback: string) {
  const url = new URL(env || fallback);
  if (!["https:", "http:"].includes(url.protocol))
    throw new ProviderError("URL แหล่งข้อมูลไม่ถูกต้อง");
  return url;
}
