export class ProviderError extends Error {
  constructor(
    message: string,
    public status = 0,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}
export async function fetchJson(
  url: string,
  signal?: AbortSignal,
): Promise<unknown> {
  const timeout = AbortSignal.timeout(12000);
  try {
    const res = await fetch(url, {
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
    if (!res.ok)
      throw new ProviderError(`แหล่งข้อมูลตอบกลับ ${res.status}`, res.status);
    return await res.json();
  } catch (e) {
    if (signal?.aborted) throw e;
    if (e instanceof ProviderError) throw e;
    throw new ProviderError(
      timeout.aborted
        ? "แหล่งข้อมูลตอบช้าเกินไป กรุณาลองใหม่"
        : "เชื่อมต่อแหล่งข้อมูลไม่ได้ ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่",
    );
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
