import { describe, it, expect } from "vitest";
import { normalizeWeather, weatherUrl } from "../providers/weather";
import { normalizeAir, airQualityUrl, aqiLabel } from "../providers/airQuality";
import {
  normalizeRadar,
  radarTiles,
  nextFrame,
  isRadarStale,
} from "../providers/radar";
import { normalizePlaces } from "../providers/geocoding";
import { defaultLocation, provinces } from "../locations/provinces";
import { chinaCities } from "../locations/types";
import {
  isThailand,
  localSearch,
  locationFromCoordinates,
  isSupportedLocation,
} from "../locations/region";
import { timeLabel, dayLabel, value, windDirection } from "../shared/time";
import { situation } from "../shared/situation";
import { unavailableFlood, provinceFloodRegistry } from "../flood/foundation";
import { activeAlerts, alertFoundation } from "../alerts/types";
import type { OfficialAlert } from "../alerts/types";
import weatherFixture from "../../evidence/weather-bangkok.json";
import airFixture from "../../evidence/air-bangkok.json";
import radarFixture from "../../evidence/radar.json";
// Captured real responses are TEST INPUTS only; production imports no evidence files.
const now = weatherFixture.current.time + 10;
describe("Weather adapter and trust", () => {
  it("normalizes actual response, 16 days, model current and forecast distinct", () => {
    const w = normalizeWeather(weatherFixture, defaultLocation, now);
    expect(w.daily).toHaveLength(16);
    expect(w.current.temperature).toBe(weatherFixture.current.temperature_2m);
    expect(w.currentMeta.dataType).toBe("MODELED");
    expect(w.forecastMeta.dataType).toBe("FORECAST");
    expect(w.currentMeta.observedAt).toBeNull();
    expect(w.currentMeta.issuedAt).toBeNull();
    expect(w.grid.latitude).toBe(weatherFixture.latitude);
  });
  it("preserves nulls and zeroes, rejects nonfinite/out of range fields", () => {
    const w = normalizeWeather(
      {
        current: {
          time: now,
          temperature_2m: null,
          precipitation: 0,
          relative_humidity_2m: 101,
          wind_speed_10m: Infinity,
          weather_code: NaN,
        },
        hourly: {
          time: [now, now + 3600],
          temperature_2m: [0, null],
          precipitation_probability: [100, 999],
        },
      },
      defaultLocation,
      now,
    );
    expect(w.current.temperature).toBeNull();
    expect(w.current.precipitation).toBe(0);
    expect(w.current.humidity).toBeNull();
    expect(w.current.wind).toBeNull();
    expect(w.hourly[0]?.temperature).toBe(0);
    expect(w.hourly[1]?.temperature).toBeNull();
    expect(w.hourly[1]?.probability).toBeNull();
    expect(w.daily).toEqual([]);
  });
  it("missing response is an error, not fake weather", () =>
    expect(() => normalizeWeather({}, defaultLocation)).toThrow());
  it("tracks stale current without inventing issue/observation times", () => {
    const w = normalizeWeather(weatherFixture, defaultLocation, now + 8000);
    expect(w.currentMeta.status).toBe("stale");
    expect(w.current.time).toBe(weatherFixture.current.time);
  });
  it("coordinate URL supports China independently and rejects invalid coords", () => {
    const l = chinaCities[0]!;
    const u = new URL(weatherUrl(l));
    expect(u.searchParams.get("latitude")).toBe(String(l.latitude));
    expect(u.searchParams.get("timezone")).toBe("Asia/Shanghai");
    expect(u.searchParams.get("timeformat")).toBe("unixtime");
    expect(u.searchParams.get("forecast_days")).toBe("16");
    expect(() => weatherUrl({ ...l, latitude: 91 })).toThrow();
  });
});
describe("Air-quality adapter", () => {
  it("normalizes actual CAMS response and names US AQI explicitly", () => {
    const a = normalizeAir(airFixture, defaultLocation, now);
    expect(a.aqi).toBe(airFixture.current.us_aqi);
    expect(a.standard).toBe("US AQI");
    expect(a.meta.dataType).toBe("MODELED");
    expect(a.forecastMeta.dataType).toBe("FORECAST");
    expect(a.meta.observedAt).toBeNull();
    expect(a.meta.units.pm25).toBe("µg/m³");
  });
  it("missing/negative pollutants stay unknown, never zero", () => {
    const a = normalizeAir(
      { current: { time: now, pm2_5: -1, pm10: null, us_aqi: 0 } },
      defaultLocation,
      now,
    );
    expect(a.pm25).toBeNull();
    expect(a.pm10).toBeNull();
    expect(a.aqi).toBe(0);
    expect(() => normalizeAir({}, defaultLocation)).toThrow();
  });
  it("requests global model for Thailand and China", () =>
    expect(
      new URL(airQualityUrl(chinaCities[1]!)).searchParams.get("domains"),
    ).toBe("cams_global"));
  it.each([
    [0, "ดี"],
    [50, "ดี"],
    [51, "ปานกลาง"],
    [100, "ปานกลาง"],
    [101, "กระทบกลุ่มอ่อนไหว"],
    [151, "ไม่ดีต่อสุขภาพ"],
    [201, "ไม่ดีมาก"],
    [301, "อันตราย"],
    [null, "ไม่มีข้อมูล"],
  ])("labels provider US AQI %s", (n, label) =>
    expect(aqiLabel(n as number | null)).toBe(label),
  );
});
describe("Radar history", () => {
  const r = normalizeRadar(radarFixture, now + 1000);
  it("accepts actual hashed frame paths, source timestamps intact", () => {
    expect(r.frames).toHaveLength(13);
    expect(r.frames[12]?.path).toBe(radarFixture.radar.past[12]?.path);
    expect(r.meta.observedAt).toBeNull();
    expect(r.meta.issuedAt).toBe(r.frames[12]?.time);
    expect(r.meta.dataType).toBe("OBSERVED");
  });
  it("rejects future frames, ignores nowcast, orders and deduplicates", () => {
    const n = normalizeRadar(
      {
        host: r.host,
        generated: now,
        radar: {
          past: [
            { time: now + 100, path: "/v2/radar/future" },
            { time: now - 600, path: "/v2/radar/a" },
            { time: now - 1200, path: "/v2/radar/b" },
            { time: now - 600, path: "/v2/radar/a" },
          ],
          nowcast: [{ time: now + 500, path: "/v2/radar/n" }],
        },
      },
      now,
    );
    expect(n.frames.map((f) => f.time)).toEqual([now - 1200, now - 600]);
    expect(() =>
      normalizeRadar({ host: r.host, radar: { past: [] } }, now),
    ).toThrow();
  });
  it("enforces trusted host and path", () => {
    expect(() =>
      normalizeRadar({
        host: "https://evil.example",
        radar: radarFixture.radar,
      }),
    ).toThrow();
    expect(() =>
      normalizeRadar(
        {
          host: r.host,
          radar: { past: [{ time: now - 600, path: "/../../secret" }] },
        },
        now,
      ),
    ).toThrow();
  });
  it("builds real scheme2 512px tiles, cycles without modifying weather", () => {
    const before = JSON.stringify(weatherFixture);
    expect(radarTiles(r, r.frames[0]!)).toContain("/512/{z}/{x}/{y}/2/1_0.png");
    expect(nextFrame(12, 13)).toBe(0);
    expect(nextFrame(0, 0)).toBe(0);
    expect(JSON.stringify(weatherFixture)).toBe(before);
  });
  it("flags stale and absent frames", () => {
    expect(isRadarStale(now - 1801, now)).toBe(true);
    expect(isRadarStale(now - 60, now)).toBe(false);
    expect(isRadarStale(undefined, now)).toBe(true);
  });
});
describe("Regions / time", () => {
  it("all 77 provinces independent of flood registry", () => {
    expect(provinces).toHaveLength(77);
    expect(new Set(provinces.map((p) => p.id)).size).toBe(77);
    expect(Object.keys(provinceFloodRegistry)).toHaveLength(77);
    expect(
      provinces.every(
        (p) => p.country === "TH" && p.timezone === "Asia/Bangkok",
      ),
    ).toBe(true);
  });
  it("Thai/English local search and only three Chinese presets", () => {
    expect(localSearch("เชียงใหม่")[0]?.english).toBe("Chiang Mai");
    expect(localSearch("phuket")[0]?.name).toBe("ภูเก็ต");
    expect(chinaCities).toHaveLength(3);
  });
  it("country polygon accepts Thai mainland/islands, rejects neighbors", () => {
    expect(isThailand(13.7563, 100.5018)).toBe(true);
    expect(isThailand(7.8804, 98.3923)).toBe(true);
    expect(isThailand(11.55, 104.92)).toBe(false);
    expect(isThailand(21.02, 105.85)).toBe(false);
    expect(locationFromCoordinates(13.7, 100.5)?.kind).toBe("coordinates");
    expect(locationFromCoordinates(34.2658, 108.9541, "geolocation")?.id).toBe(
      "cn-xian",
    );
    expect(locationFromCoordinates(39.9, 116.4, "geolocation")).toBeNull();
    expect(isSupportedLocation({ ...chinaCities[0]!, longitude: 116.4 })).toBe(
      false,
    );
  });
  it("filters remote results to valid Thailand coordinates", () => {
    expect(
      normalizePlaces({
        results: [
          {
            id: 1,
            name: "บางละมุง",
            country_code: "TH",
            latitude: 12.9,
            longitude: 100.9,
          },
          {
            id: 2,
            name: "Beijing",
            country_code: "CN",
            latitude: 39.9,
            longitude: 116.4,
          },
          {
            id: 3,
            name: "bad",
            country_code: "TH",
            latitude: null,
            longitude: 100,
          },
        ],
      }),
    ).toHaveLength(1);
  });
  it("same epoch displays Bangkok vs Shanghai correctly", () => {
    const e = Date.UTC(2026, 9, 10, 18, 0) / 1000;
    expect(timeLabel(e, "Asia/Bangkok")).toBe("01:00");
    expect(timeLabel(e, "Asia/Shanghai")).toBe("02:00");
    expect(timeLabel(null, "Asia/Bangkok")).toBe("ไม่ระบุเวลา");
  });
  it("daily local boundaries retain correct date across timezone", () => {
    expect(
      dayLabel(1791651600, 25200, {
        day: "numeric",
        month: "numeric",
        year: "numeric",
      }),
    ).toBe("11/10/2026");
    expect(
      dayLabel(Date.UTC(2026, 9, 10, 16) / 1000, 28800, { day: "numeric" }),
    ).toBe("11");
  });
  it("formats missing values without misleading zero", () => {
    expect(value(null)).toBe("—");
    expect(value(0)).toBe("0");
    expect(windDirection(45)).toBe("NE");
  });
});
describe("Conservative interpretations and P1 containment", () => {
  const w = normalizeWeather(weatherFixture, defaultLocation, now),
    a = normalizeAir(airFixture, defaultLocation, now);
  const complete = () => ({
    ...w,
    hourly: Array.from({ length: 8 }, (_, i) => ({
      time: now + i * 3600,
      temperature: 28,
      probability: 20,
      precipitation: 0,
      wind: 5,
      direction: 90,
      code: 1,
    })),
    current: { ...w.current, temperature: 28, apparent: 30, wind: 5 },
  });
  it("unknown for absent/missing/stale inputs", () => {
    expect(situation(undefined, a, now).verdict).toBe("Unknown");
    expect(situation(w, { ...a, aqi: null }, now).verdict).toBe("Unknown");
    expect(situation(w, a, now + 12000).verdict).toBe("Unknown");
    expect(situation({ ...w, hourly: [] }, a, now).verdict).toBe("Unknown");
  });
  it("thresholds produce auditable separate verdicts", () => {
    expect(situation(complete(), { ...a, aqi: 40 }, now).verdict).toBe("Calm");
    expect(situation(complete(), { ...a, aqi: 120 }, now).verdict).toBe(
      "Notable",
    );
    expect(situation(complete(), { ...a, aqi: 160 }, now).verdict).toBe(
      "Attention",
    );
    expect(
      situation(
        { ...complete(), current: { ...complete().current, apparent: 40 } },
        a,
        now,
      ).verdict,
    ).toBe("Attention");
  });
  it("flood unavailable never implies flood-free", () =>
    expect(unavailableFlood("th-01").status).toBe("data-unavailable"));
  it("China official fallback never selects Thai authority", () => {
    expect(alertFoundation("CN").url).toContain("cma.gov.cn");
    expect(alertFoundation("TH").url).toContain("tmd.go.th");
  });
  it("expires official notices and retains original severity", () => {
    const alert = {
      id: "test-only",
      validFrom: now - 600,
      validTo: now + 600,
      severity: "Severe",
    } as OfficialAlert;
    expect(activeAlerts([alert], now)[0]?.severity).toBe("Severe");
    expect(activeAlerts([alert], now + 601)).toHaveLength(0);
    expect(activeAlerts([{ ...alert, validTo: null }], now)).toHaveLength(0);
  });
});
