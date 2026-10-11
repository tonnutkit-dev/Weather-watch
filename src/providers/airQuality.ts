import type { Location } from "../locations/types";
import type { AirQuality } from "../air-quality/types";
import {
  fetchJson,
  object,
  series,
  finite,
  bounded,
  endpoint,
  assertCoordinates,
  ProviderError,
} from "./http";
export function airQualityUrl(l: Location) {
  assertCoordinates(l.latitude, l.longitude);
  const u = endpoint(
    import.meta.env.VITE_AIR_QUALITY_URL,
    "https://air-quality-api.open-meteo.com/v1/air-quality",
  );
  u.search = new URLSearchParams({
    latitude: String(l.latitude),
    longitude: String(l.longitude),
    current: "pm2_5,pm10,us_aqi",
    hourly: "pm2_5,pm10,us_aqi",
    forecast_days: "5",
    domains: "cams_global",
    timezone: l.timezone,
    timeformat: "unixtime",
  }).toString();
  return u.href;
}
export function normalizeAir(
  raw: unknown,
  l: Location,
  now = Date.now() / 1000,
): AirQuality {
  const r = object(raw),
    c = object(r.current),
    h = object(r.hourly);
  if (r.error || Object.keys(c).length === 0)
    throw new ProviderError("แหล่งข้อมูลไม่มีคุณภาพอากาศสำหรับจุดนี้");
  const time = finite(c.time);
  const meta = {
    sourceId: "open-meteo-cams",
    sourceName: "Open-Meteo / CAMS",
    dataType: "MODELED" as const,
    observedAt: null,
    issuedAt: null,
    validFrom: time,
    validTo: time === null ? null : time + 3600,
    fetchedAt: now,
    latitude: l.latitude,
    longitude: l.longitude,
    units: { pm25: "µg/m³", pm10: "µg/m³", aqi: "US AQI" },
    status:
      time === null
        ? ("partial" as const)
        : now - time > 10800
          ? ("stale" as const)
          : ("available" as const),
    attributionUrl: "https://open-meteo.com/en/docs/air-quality-api",
  };
  const hourly = series(h.time).flatMap((t, i) => {
    const time = finite(t);
    return time === null
      ? []
      : [
          {
            time,
            pm25: bounded(series(h.pm2_5)[i], 0, 10000),
            aqi: bounded(series(h.us_aqi)[i], 0, 1000),
          },
        ];
  });
  return {
    time,
    pm25: bounded(c.pm2_5, 0, 10000),
    pm10: bounded(c.pm10, 0, 10000),
    aqi: bounded(c.us_aqi, 0, 1000),
    standard: "US AQI",
    hourly,
    meta,
    forecastMeta: {
      ...meta,
      dataType: "FORECAST",
      validFrom: hourly[0]?.time ?? null,
      validTo: hourly.at(-1)?.time ?? null,
    },
  };
}
export const getAirQuality = async (l: Location, signal?: AbortSignal) =>
  normalizeAir(await fetchJson(airQualityUrl(l), signal), l);
export function aqiLabel(value: number | null) {
  if (value === null) return "ไม่มีข้อมูล";
  if (value <= 50) return "ดี";
  if (value <= 100) return "ปานกลาง";
  if (value <= 150) return "กระทบกลุ่มอ่อนไหว";
  if (value <= 200) return "ไม่ดีต่อสุขภาพ";
  if (value <= 300) return "ไม่ดีมาก";
  return "อันตราย";
}
