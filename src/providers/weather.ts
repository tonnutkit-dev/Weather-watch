import type { Location } from "../locations/types";
import type { Weather } from "../weather/types";
import type { Provenance } from "../shared/provenance";
import {
  fetchJson,
  object,
  series,
  finite,
  bounded,
  assertCoordinates,
  endpoint,
  ProviderError,
} from "./http";
export const CURRENT_VARS =
  "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_direction_10m,pressure_msl";
export const HOURLY_VARS =
  "temperature_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m,wind_direction_10m";
export const DAILY_VARS =
  "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max";
export function weatherUrl(l: Location): string {
  assertCoordinates(l.latitude, l.longitude);
  const u = endpoint(
    import.meta.env.VITE_WEATHER_URL,
    "https://api.open-meteo.com/v1/forecast",
  );
  u.search = new URLSearchParams({
    latitude: String(l.latitude),
    longitude: String(l.longitude),
    current: CURRENT_VARS,
    hourly: HOURLY_VARS,
    daily: DAILY_VARS,
    forecast_days: "16",
    timezone: l.timezone,
    timeformat: "unixtime",
    wind_speed_unit: "kmh",
  }).toString();
  return u.href;
}
export function normalizeWeather(
  raw: unknown,
  l: Location,
  now = Date.now() / 1000,
): Weather {
  const r = object(raw);
  if (r.error) throw new ProviderError("แหล่งข้อมูลไม่สามารถให้พยากรณ์นี้ได้");
  const c = object(r.current),
    h = object(r.hourly),
    d = object(r.daily);
  const at = (o: Record<string, unknown>, key: string, i: number) =>
    series(o[key])[i];
  const hourly = series(h.time).flatMap((t, i) => {
    const time = finite(t);
    return time === null
      ? []
      : [
          {
            time,
            temperature: bounded(at(h, "temperature_2m", i), -100, 70),
            probability: bounded(at(h, "precipitation_probability", i), 0, 100),
            precipitation: bounded(at(h, "precipitation", i), 0, 1000),
            wind: bounded(at(h, "wind_speed_10m", i), 0, 500),
            direction: bounded(at(h, "wind_direction_10m", i), 0, 360),
            code: bounded(at(h, "weather_code", i), 0, 99),
          },
        ];
  });
  const daily = series(d.time).flatMap((t, i) => {
    const time = finite(t);
    return time === null
      ? []
      : [
          {
            time,
            high: bounded(at(d, "temperature_2m_max", i), -100, 70),
            low: bounded(at(d, "temperature_2m_min", i), -100, 70),
            probability: bounded(
              at(d, "precipitation_probability_max", i),
              0,
              100,
            ),
            precipitation: bounded(at(d, "precipitation_sum", i), 0, 5000),
            wind: bounded(at(d, "wind_speed_10m_max", i), 0, 500),
            code: bounded(at(d, "weather_code", i), 0, 99),
          },
        ];
  });
  if (Object.keys(c).length === 0 && hourly.length === 0)
    throw new ProviderError("แหล่งข้อมูลไม่ส่งข้อมูลอากาศกลับมา");
  const time = finite(c.time);
  const base: Provenance = {
    sourceId: "open-meteo",
    sourceName: "Open-Meteo",
    dataType: "MODELED",
    observedAt: null,
    issuedAt: null,
    validFrom: time,
    validTo: time === null ? null : time + (finite(c.interval) ?? 900),
    fetchedAt: now,
    latitude: l.latitude,
    longitude: l.longitude,
    units: {
      temperature: "°C",
      humidity: "%",
      wind: "km/h",
      precipitation: "mm",
      pressure: "hPa",
    },
    status:
      time === null ? "partial" : now - time > 7200 ? "stale" : "available",
    attributionUrl: "https://open-meteo.com/",
  };
  return {
    current: {
      time,
      temperature: bounded(c.temperature_2m, -100, 70),
      apparent: bounded(c.apparent_temperature, -100, 90),
      humidity: bounded(c.relative_humidity_2m, 0, 100),
      wind: bounded(c.wind_speed_10m, 0, 500),
      direction: bounded(c.wind_direction_10m, 0, 360),
      precipitation: bounded(c.precipitation, 0, 1000),
      code: bounded(c.weather_code, 0, 99),
      isDay: c.is_day === 1 ? true : c.is_day === 0 ? false : null,
      pressure: bounded(c.pressure_msl, 500, 1200),
    },
    hourly,
    daily,
    timezone: typeof r.timezone === "string" ? r.timezone : l.timezone,
    utcOffsetSeconds:
      finite(r.utc_offset_seconds) ?? (l.country === "TH" ? 25200 : 28800),
    grid: { latitude: finite(r.latitude), longitude: finite(r.longitude) },
    currentMeta: base,
    forecastMeta: {
      ...base,
      dataType: "FORECAST",
      validFrom: hourly[0]?.time ?? null,
      validTo: hourly.at(-1)?.time ?? null,
      status: hourly.length ? "available" : "unavailable",
    },
  };
}
export const getWeather = async (l: Location, signal?: AbortSignal) =>
  normalizeWeather(await fetchJson(weatherUrl(l), signal), l);
