import type { Radar, RadarFrame } from "../radar/types";
import { fetchJson, object, series, finite, ProviderError } from "./http";
export function normalizeRadar(raw: unknown, now = Date.now() / 1000): Radar {
  const r = object(raw);
  const host = typeof r.host === "string" ? r.host : "";
  let u: URL;
  try {
    u = new URL(host);
  } catch {
    throw new ProviderError("รูปแบบโฮสต์เรดาร์ไม่ถูกต้อง");
  }
  if (
    u.protocol !== "https:" ||
    !(u.hostname === "rainviewer.com" || u.hostname.endsWith(".rainviewer.com"))
  )
    throw new ProviderError("โฮสต์เรดาร์ไม่อยู่ในรายการที่อนุญาต");
  const frames: RadarFrame[] = series(object(r.radar).past)
    .flatMap((v) => {
      const f = object(v),
        time = finite(f.time);
      return time !== null &&
        time <= now &&
        typeof f.path === "string" &&
        /^\/v2\/radar\/[a-zA-Z0-9_-]+$/.test(f.path)
        ? [{ time, path: f.path }]
        : [];
    })
    .sort((a, b) => a.time - b.time)
    .filter((f, i, a) => i === 0 || a[i - 1]?.time !== f.time);
  if (!frames.length)
    throw new ProviderError("ยังไม่มีภาพเรดาร์ย้อนหลังจากผู้ให้บริการ");
  return {
    host: u.origin,
    generated: finite(r.generated),
    frames,
    meta: {
      sourceId: "rainviewer",
      sourceName: "RainViewer",
      dataType: "OBSERVED",
      observedAt: null,
      issuedAt: frames.at(-1)!.time,
      validFrom: frames[0]!.time,
      validTo: frames.at(-1)!.time,
      fetchedAt: now,
      latitude: 0,
      longitude: 0,
      units: { reflectivity: "dBZ" },
      status: now - frames.at(-1)!.time > 1800 ? "stale" : "available",
      attributionUrl: "https://www.rainviewer.com/",
    },
  };
}
export const getRadar = async (signal?: AbortSignal) =>
  normalizeRadar(
    await fetchJson(
      import.meta.env.VITE_RADAR_URL ||
        "https://api.rainviewer.com/public/weather-maps.json",
      signal,
    ),
  );
export const radarTiles = (radar: Radar, frame: RadarFrame) =>
  `${radar.host}${frame.path}/512/{z}/{x}/{y}/2/1_0.png`;
export const nextFrame = (index: number, length: number) =>
  length > 0 ? (index + 1) % length : 0;
export const isRadarStale = (
  time: number | undefined,
  now = Date.now() / 1000,
) => time === undefined || now - time > 1800;
