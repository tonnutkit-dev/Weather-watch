import geometry from "./thailand.json";
import { chinaCities } from "./types";
import type { Location } from "./types";
import { provinces } from "./provinces";
function inRing(lat: number, lon: number, ring: number[][]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i]!,
      b = ring[j]!;
    if (
      a[1]! > lat !== b[1]! > lat &&
      lon < ((b[0]! - a[0]!) * (lat - a[1]!)) / (b[1]! - a[1]!) + a[0]!
    )
      inside = !inside;
  }
  return inside;
}
export function isThailand(lat: number, lon: number) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;
  return geometry.coordinates.some(
    (poly) =>
      inRing(lat, lon, poly[0]!) &&
      !poly.slice(1).some((h) => inRing(lat, lon, h)),
  );
}
export function nearestProvince(lat: number, lon: number) {
  return [...provinces].sort(
    (a, b) =>
      Math.hypot(a.latitude - lat, a.longitude - lon) -
      Math.hypot(b.latitude - lat, b.longitude - lon),
  )[0]!;
}
export function locationFromCoordinates(
  lat: number,
  lon: number,
  kind: "coordinates" | "geolocation" = "coordinates",
): Location | null {
  if (isThailand(lat, lon)) {
    return {
      id: `point-${lat.toFixed(4)}-${lon.toFixed(4)}`,
      name: kind === "geolocation" ? "ตำแหน่งของฉัน" : "จุดที่เลือกบนแผนที่",
      english: `${lat.toFixed(3)}, ${lon.toFixed(3)}`,
      latitude: lat,
      longitude: lon,
      country: "TH",
      timezone: "Asia/Bangkok",
      kind,
    };
  }
  if (kind === "geolocation") {
    const city = chinaCities.find(
      (c) => Math.hypot(c.latitude - lat, c.longitude - lon) < 0.35,
    );
    if (city) return city;
  }
  return null;
}
export function isSupportedLocation(l: Location) {
  return l.country === "TH"
    ? isThailand(l.latitude, l.longitude) ||
        provinces.some(
          (p) =>
            p.id === l.id &&
            p.latitude === l.latitude &&
            p.longitude === l.longitude,
        )
    : chinaCities.some(
        (c) =>
          c.id === l.id &&
          c.latitude === l.latitude &&
          c.longitude === l.longitude,
      );
}
export function localSearch(query: string) {
  const q = query
    .trim()
    .toLocaleLowerCase()
    .replace(/จังหวัด/g, "")
    .replace(/\s/g, "");
  return provinces.filter(
    (p) =>
      !q ||
      p.name.includes(q) ||
      (p.english || "").toLowerCase().replace(/\s/g, "").includes(q),
  );
}
