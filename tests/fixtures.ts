// LAB fixtures for deterministic UI tests: real captured provider responses from evidence/,
// time-shifted so "now" is current. Not used by the live smoke test.
import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";
const root = new URL("../", import.meta.url);
const json = (p: string) => JSON.parse(readFileSync(new URL(p, root), "utf8"));
const thailand = json("src/locations/thailand.json");
function shift(value: unknown, delta: number): unknown {
  if (Array.isArray(value)) return value.map((v) => shift(v, delta));
  if (value && typeof value === "object")
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, k === "time" || k === "generated" ? shift2(v, delta) : shift(v, delta)]));
  return value;
}
const shift2 = (v: unknown, delta: number) => (typeof v === "number" ? v + delta : Array.isArray(v) ? v.map((x) => (typeof x === "number" ? x + delta : x)) : v);
export async function labProviders(page: Page, opts: { weather?: "ok" | "fail" } = {}) {
  const now = Math.floor(Date.now() / 1000 / 900) * 900;
  const city = (url: string) => (new URL(url).searchParams.get("latitude")?.startsWith("34.") ? "xian" : "bangkok");
  let weatherCalls = 0;
  await page.route("https://api.open-meteo.com/**", (r) => {
    weatherCalls++;
    if (opts.weather === "fail" && weatherCalls <= 3) return r.fulfill({ status: 503, body: "LAB" });
    const body = json(`evidence/weather-${city(r.request().url())}.json`);
    return r.fulfill({ json: shift(body, now - body.current.time) });
  });
  await page.route("https://air-quality-api.open-meteo.com/**", (r) => {
    const body = json(`evidence/air-${city(r.request().url())}.json`);
    return r.fulfill({ json: shift(body, now - body.current.time) });
  });
  await page.route("https://api.rainviewer.com/**", (r) => {
    const body = json("evidence/radar.json");
    return r.fulfill({ json: shift(body, now - body.radar.past.at(-1).time) });
  });
  await page.route("https://tilecache.rainviewer.com/**", (r) =>
    r.fulfill({ contentType: "image/png", body: readFileSync(new URL("evidence/radar-tile-bangkok.bin", root)) }));
  await page.route("https://tiles.openfreemap.org/**", (r) => {
    const url = r.request().url();
    if (url.includes("/styles/")) {
      const dark = url.includes("dark");
      return r.fulfill({ json: {
        version: 8, glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
        sources: { th: { type: "geojson", data: { type: "Feature", properties: {}, geometry: thailand } } },
        layers: [
          { id: "background", type: "background", paint: { "background-color": dark ? "#070d19" : "#d9e4ef" } },
          { id: "water", type: "fill", source: "th", paint: { "fill-color": dark ? "#0f1829" : "#f4f6f9", "fill-outline-color": dark ? "#22335a" : "#b8c6d8" } },
        ],
      } });
    }
    return r.fulfill({ status: 200, body: "" });
  });
  return { weatherCalls: () => weatherCalls };
}
