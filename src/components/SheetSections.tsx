import { useState, type CSSProperties } from "react";
import { ChevronDown } from "lucide-react";
import type { Weather } from "../weather/types";
import type { AirQuality } from "../air-quality/types";
import type { Radar } from "../radar/types";
import type { Location } from "../locations/types";
import type { DataType } from "../shared/provenance";
import { freshnessLabel, type FreshnessKind } from "../reliability/freshness";
import { useI18n } from "../i18n/i18n";
import type { Key } from "../i18n/strings";
import { aqiBand } from "../app/headline";
import { value } from "../shared/time";
import { WeatherIcon } from "./WeatherIcon";
import { AqiScale } from "./ModeStrips";
import { Panel } from "./Panel";

const ADVICE: Key[] = ["aq.a0", "aq.a1", "aq.a2", "aq.a3", "aq.a4", "aq.a4"];
/** AQ breakdown: AQI + band + plain advice, PM values with units, 12-hour AQI forecast strip. */
export function AirCard({ air, timezone, now }: { air?: AirQuality; timezone: string; now: number }) {
  const { t, hour } = useI18n();
  const band = aqiBand(air?.aqi ?? null);
  if (!air || !band) return <p className="ww-muted">{t("air.noData")}</p>;
  const next = air.hourly.filter((h) => h.time > now / 1000 - 3600 && h.aqi !== null).slice(0, 12);
  const top = Math.max(150, ...next.map((h) => h.aqi!));
  return (
    <>
      <div className="ww-air-row num">
        <b className="ww-air-v" style={{ color: band.color }}>{value(air.aqi)}</b>
        <span className="ww-pill" style={{ "--pill": band.color } as CSSProperties}>{t(band.key)}</span>
      </div>
      <p className="ww-advice">{t(ADVICE[band.index]!)}</p>
      <AqiScale aqi={air.aqi} />
      <div className="ww-pm num">
        <div><span>PM2.5</span><b>{value(air.pm25, 1)}</b><small>µg/m³</small></div>
        <div><span>PM10</span><b>{value(air.pm10, 1)}</b><small>µg/m³</small></div>
      </div>
      {next.length > 1 && (
        <div className="ww-aq-trend" aria-label={t("aq.trend")}>
          <div className="ww-aq-cap">{t("aq.trend")}</div>
          <div className="ww-aq-bars num">
            {next.map((h, i) => {
              const b = aqiBand(h.aqi)!;
              return (
                <div key={h.time}>
                  <i style={{ height: `${Math.max(8, (h.aqi! / top) * 100)}%`, background: b.color }} title={`AQI ${h.aqi}`} />
                  <span>{i % 3 === 0 ? (i ? hour(h.time, timezone) : t("sheet.now")) : ""}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <p className="ww-micro">{t("aq.note")}</p>
    </>
  );
}

/** 16 days: weekday + date, rain chance, low–high range; a row expands to rain total and max wind. */
export function DailyList({ weather }: { weather?: Weather }) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState<number | null>(null);
  const days = weather?.daily ?? [];
  if (!days.length) return <p className="ww-muted">{t("sheet.noForecast")}</p>;
  const lows = days.map((d) => d.low).filter((v): v is number => v !== null);
  const highs = days.map((d) => d.high).filter((v): v is number => v !== null);
  const lo = Math.min(...lows), hi = Math.max(...highs), span = Math.max(1, hi - lo);
  const fmt = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", timeZone: "UTC" });
  return (
    <div className="ww-days">
      {days.map((d, i) => {
        const expanded = open === i;
        return (
          <div key={d.time} className={`ww-day-wrap ${expanded ? "is-open" : ""}`}>
            <button className="ww-day num" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : i)}>
              <span className="ww-day-d">{i ? fmt.format(new Date((d.time + weather!.utcOffsetSeconds) * 1000)) : t("sheet.today")}</span>
              <WeatherIcon code={d.code} size={24} />
              <span className="ww-day-p">{(d.probability ?? 0) >= 20 ? `${d.probability}%` : ""}</span>
              <span className="ww-day-lo">{value(d.low)}°</span>
              <span className="ww-range-bar">
                {d.low !== null && d.high !== null && <i style={{ left: `${((d.low - lo) / span) * 100}%`, right: `${((hi - d.high) / span) * 100}%` }} />}
              </span>
              <span className="ww-day-hi">{value(d.high)}°</span>
              <ChevronDown size={14} className="ww-day-chev" aria-hidden="true" />
            </button>
            {expanded && (
              <div className="ww-day-more num">
                {t("day.rain", { mm: value(d.precipitation, 1), p: value(d.probability) })} · {t("day.wind", { v: value(d.wind) })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const TYPE: Record<DataType, Key> = {
  MODELED: "src.modeled", FORECAST: "src.forecast", OBSERVED: "src.observed", OFFICIAL_ALERT: "src.official", INTERPRETATION: "src.interp",
};
/** ⓘ Sources: who provides each value, what kind of data it is, and how fresh it is. */
export function SourcesPanel(p: {
  onClose: () => void; location: Location; weather?: Weather; air?: AirQuality; radar?: Radar;
  weatherFreshness?: FreshnessKind; airFreshness?: FreshnessKind; now: number;
}) {
  const { t } = useI18n();
  const ago = (epoch?: number | null) => {
    if (epoch == null) return t("src.unknown");
    const m = Math.max(0, Math.round((p.now / 1000 - epoch) / 60));
    return m < 1 ? t("src.justNow") : m < 60 ? t("src.minAgo", { m }) : t("src.hourAgo", { h: Math.floor(m / 60) });
  };
  const rows: { title: Key; name: string; url: string; type: DataType; time?: number | null; fresh?: FreshnessKind; note?: Key }[] = [
    { title: "src.current", name: "Open-Meteo", url: "https://open-meteo.com/", type: p.weather?.currentMeta.dataType ?? "MODELED", time: p.weather?.current.time, fresh: p.weatherFreshness },
    { title: "src.forecastT", name: "Open-Meteo", url: "https://open-meteo.com/", type: p.weather?.forecastMeta.dataType ?? "FORECAST", time: p.weather?.forecastMeta.fetchedAt, note: "src.forecastNote" },
    { title: "src.air", name: "CAMS · Open-Meteo", url: "https://atmosphere.copernicus.eu/", type: p.air?.meta.dataType ?? "MODELED", time: p.air?.time, fresh: p.airFreshness, note: "aq.note" },
    { title: "src.radar", name: "RainViewer", url: "https://www.rainviewer.com/", type: p.radar?.meta.dataType ?? "OBSERVED", time: p.radar?.frames.at(-1)?.time, note: "src.radarNote" },
  ];
  return (
    <Panel title={t("src.title")} onClose={p.onClose} compact>
      <div className="ww-sources-list">
        {rows.map((r) => (
          <div key={r.title} className="ww-src">
            <div className="ww-src-top">
              <b>{t(r.title)}</b>
              <span className="ww-tag">{t(TYPE[r.type])}</span>
            </div>
            <div className="ww-src-meta">
              <a href={r.url} target="_blank" rel="noreferrer">{r.name}</a> · {t("src.updated", { ago: ago(r.time) })}
              {r.fresh && <> · {freshnessLabel[r.fresh]}</>}
            </div>
            {r.note && <p className="ww-micro">{t(r.note)}</p>}
          </div>
        ))}
        <p className="ww-micro">{t("src.map")}</p>
      </div>
    </Panel>
  );
}
