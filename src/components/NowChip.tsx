import type { UseQueryResult } from "@tanstack/react-query";
import { MapPin, RefreshCw, ChevronDown, CloudOff, Clock } from "lucide-react";
import { StateBlock } from "./StateBlock";
import type { Weather } from "../weather/types";
import type { AirQuality } from "../air-quality/types";
import type { Location } from "../locations/types";
import { useI18n } from "../i18n/i18n";
import { headline, maxRainChance, type Headline } from "../app/headline";
import { value } from "../shared/time";
import type { FreshnessKind } from "../reliability/freshness";

export type WeatherState = Pick<UseQueryResult<Weather>, "data" | "isError" | "isPending" | "isFetching" | "error">;
const toneColor: Record<Headline["tone"], string> = {
  calm: "var(--ok)", rain: "var(--rain)", dust: "var(--bad)", heat: "var(--warn)", wind: "var(--warn)", unknown: "var(--sub)",
};
/** Headline text with its keyword in the accent color (from Direction B). */
export function HeadlineText({ h }: { h: Headline }) {
  const { t } = useI18n();
  const kw = h.key === "h.calm" ? t("h.calm.kw") : h.keyword;
  const [before, after] = t(h.key).split("{kw}");
  return (
    <span className="ww-headline" data-tone={h.tone}>
      {before}
      {after !== undefined && <em>{kw}</em>}
      {after}
    </span>
  );
}
export function NowChip(p: {
  location: Location;
  weather: WeatherState;
  /** Only pass assessment-allowed data; undefined hides the dust rule rather than guessing. */
  air?: AirQuality;
  /** Freshness of the current weather; expired/unavailable data is labeled and never assessed. */
  freshness?: FreshnessKind;
  now: number;
  onSearch: () => void;
  /** Cached data present: refresh (30 s cooldown applies). */
  onRefresh: () => void;
  /** No data yet: immediate retry (~3 s anti-spam guard). Falls back to onRefresh. */
  onRetry?: () => void;
}) {
  const { t, time, placeName, fresh, errorText } = useI18n();
  const w = p.weather.data;
  const name = placeName(p.location);
  // Device and location can be in different zones (e.g. phone in China, location in Thailand): tag the clock.
  const zoneTag = w && w.utcOffsetSeconds / 60 !== -new Date().getTimezoneOffset()
    ? ` ${p.location.timezone === "Asia/Shanghai" ? t("tz.cnShort") : t("tz.thShort")}` : "";
  const assessable = p.freshness === "expired" || p.freshness === "unavailable" ? undefined : w;
  const h = headline(assessable, p.air, (e) => time(e, p.location.timezone), p.now / 1000);
  const rain = maxRainChance(assessable, p.now / 1000);
  return (
    <section className="ww-now glass" aria-label={name} data-map-inset="top" data-selected-location={p.location.id}>
      <button className="ww-now-loc" onClick={p.onSearch} aria-label={`${t("now.change")}: ${name}`}>
        <MapPin size={15} aria-hidden="true" />
        <strong>{name}</strong>
        {w && <span className="ww-now-time">· {time(w.current.time, p.location.timezone)}{zoneTag}</span>}
        <ChevronDown size={15} aria-hidden="true" className="ww-now-chev" />
      </button>
      {w ? (
        <div className="ww-now-main">
          <div className="ww-temp num" data-testid="temperature">
            {value(w.current.temperature)}
            <span className="ww-deg">°</span>
            <span className="ww-unit">C</span>
          </div>
          <div className="ww-now-text">
            <div className="ww-now-line">
              <span className="ww-dot" style={{ background: toneColor[h.tone] }} aria-hidden="true" />
              <HeadlineText h={h} />
            </div>
            <div className="ww-now-sub num">
              {[
                w.current.apparent !== null && t("now.feels", { v: value(w.current.apparent) }),
                rain !== null && t("now.rain", { v: rain }),
                p.air?.aqi != null && `AQI ${value(p.air.aqi)}`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </div>
          </div>
          {p.weather.isError && (
            <button className="ww-icon-btn ww-now-retry" aria-label={t("now.retry")} disabled={p.weather.isFetching} onClick={p.onRefresh}>
              <RefreshCw size={17} />
            </button>
          )}
        </div>
      ) : p.weather.isError ? (
        <StateBlock icon={CloudOff} tone="bad" role="alert" title={t("now.error")} body={errorText(p.weather.error)}
          action={<button className="ww-btn" onClick={p.onRetry ?? p.onRefresh} disabled={p.weather.isFetching}>
            <RefreshCw size={16} className={p.weather.isFetching ? "ww-spinning" : ""} /> {t("now.retry")}</button>} />
      ) : (
        <div className="ww-now-loading" role="status">
          <span className="ww-skeleton ww-sk-temp" aria-hidden="true" />
          <span className="ww-sk-lines" aria-hidden="true"><i /><i /></span>
          <span className="ww-sr">{t("now.loading")}</span>
        </div>
      )}
      {w && p.weather.isError && <p className="ww-now-warn" role="status"><Clock size={13} aria-hidden="true" /> {t("now.refreshFailed")}</p>}
      {w && !p.weather.isError && !assessable && p.freshness && <p className="ww-now-warn" role="status"><Clock size={13} aria-hidden="true" /> {fresh(p.freshness)}</p>}
    </section>
  );
}
