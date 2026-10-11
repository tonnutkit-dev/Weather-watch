import type { Location } from "../locations/types";
import { object, series, finite, fetchJson, endpoint } from "./http";
import { isThailand } from "../locations/region";
export function normalizePlaces(raw: unknown): Location[] {
  return series(object(raw).results).flatMap((v) => {
    const r = object(v),
      latitude = finite(r.latitude),
      longitude = finite(r.longitude);
    if (
      r.country_code !== "TH" ||
      latitude === null ||
      longitude === null ||
      typeof r.name !== "string" ||
      !isThailand(latitude, longitude)
    )
      return [];
    return [
      {
        id: `geo-${String(r.id ?? `${latitude}-${longitude}`)}`,
        name: r.name,
        english: [r.admin2, r.admin1]
          .filter((x) => typeof x === "string")
          .join(" · "),
        latitude,
        longitude,
        country: "TH" as const,
        timezone: "Asia/Bangkok" as const,
        kind: "place" as const,
      },
    ];
  });
}
export async function searchPlaces(query: string, signal?: AbortSignal) {
  if (query.trim().length < 2) return [];
  const u = endpoint(
    import.meta.env.VITE_GEOCODING_URL,
    "https://geocoding-api.open-meteo.com/v1/search",
  );
  u.search = new URLSearchParams({
    name: query.trim(),
    countryCode: "TH",
    language: "th",
    count: "10",
  }).toString();
  return normalizePlaces(await fetchJson(u.href, signal));
}
