import { useRef, type CSSProperties, type PointerEvent as RPointerEvent } from "react";
import { Star, ChevronUp, ChevronDown, ExternalLink } from "lucide-react";
import type { Weather } from "../weather/types";
import type { AirQuality } from "../air-quality/types";
import type { Location } from "../locations/types";
import { alertFoundation } from "../alerts/types";
import { useI18n } from "../i18n/i18n";
import { aqiBand, headline } from "../app/headline";
import { value } from "../shared/time";
import { WeatherIcon } from "./WeatherIcon";
import { HourlyChart } from "./HourlyChart";
import { HeadlineText } from "./NowChip";
import { AqiScale } from "./ModeStrips";

export function DetailSheet(p: {
  open: boolean;
  onOpen: (open: boolean) => void;
  location: Location;
  weather?: Weather;
  air?: AirQuality;
  now: number;
  favorite: boolean;
  onFavorite: () => void;
}) {
  const { t, time, weekday } = useI18n();
  const drag = useRef<{ y: number; moved: boolean } | null>(null);
  const w = p.weather, a = p.air;
  const nowS = p.now / 1000;
  const hours = w?.hourly.filter((h) => h.time > nowS - 3600).slice(0, 12) ?? [];
  const days = w?.daily ?? [];
  const lows = days.map((d) => d.low).filter((v): v is number => v !== null);
  const highs = days.map((d) => d.high).filter((v): v is number => v !== null);
  const lo = Math.min(...lows), hi = Math.max(...highs), span = Math.max(1, hi - lo);
  const band = aqiBand(a?.aqi ?? null);
  const alert = alertFoundation(p.location.country);
  const h = headline(w, a, (e) => time(e, p.location.timezone), nowS);
  // Swipe on the handle: up opens, down closes. Tap toggles. Keyboard uses the same button.
  const down = (e: RPointerEvent) => { drag.current = { y: e.clientY, moved: false }; (e.target as Element).setPointerCapture?.(e.pointerId); };
  const move = (e: RPointerEvent) => {
    const d = drag.current; if (!d) return;
    const dy = e.clientY - d.y;
    if (Math.abs(dy) > 36 && !d.moved) { d.moved = true; p.onOpen(dy < 0); }
  };
  const up = () => { const d = drag.current; drag.current = null; if (d && !d.moved) p.onOpen(!p.open); };
  return (
    <section className={`ww-sheet glass ${p.open ? "is-open" : ""}`} aria-label={t("sheet.label")} data-open={p.open} data-selected-location={p.location.id}>
      <button
        className="ww-handle"
        aria-label={p.open ? t("sheet.close") : t("sheet.open")}
        aria-expanded={p.open}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={() => (drag.current = null)}
        onClick={(e) => { if (e.detail === 0) p.onOpen(!p.open); }}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp") { e.preventDefault(); p.onOpen(true); }
          if (e.key === "ArrowDown" || e.key === "Escape") { e.preventDefault(); p.onOpen(false); }
        }}
      >
        <span className="ww-grab" aria-hidden="true" />
        <span className="ww-peek">{p.open ? <ChevronDown size={14} /> : <ChevronUp size={14} />}{t("sheet.peek")}</span>
      </button>
      <div className="ww-sheet-body" hidden={!p.open} aria-hidden={!p.open}>
        <header className="ww-sheet-head">
          <div className="ww-sheet-temp num">{value(w?.current.temperature)}°</div>
          <div className="ww-sheet-title">
            <h2>{p.location.name} {p.location.english && <small>{p.location.english}</small>}</h2>
            <HeadlineText h={h} />
          </div>
          <button className={`ww-icon-btn ${p.favorite ? "is-on" : ""}`} aria-label={p.favorite ? t("fav.remove") : t("fav.add")} aria-pressed={p.favorite} onClick={p.onFavorite}>
            <Star size={18} />
          </button>
        </header>

        <div className="ww-card">
          <div className="ww-card-t"><span>{t("sheet.hourly")}</span><span>{t("sheet.hourlyLegend")}</span></div>
          <HourlyChart hours={hours} timezone={p.location.timezone} />
        </div>

        <div className="ww-card">
          <div className="ww-card-t"><span>{t("sheet.air")} (US AQI)</span><span>CAMS</span></div>
          {a && band ? (
            <>
              <div className="ww-air-row num">
                <b className="ww-air-v" style={{ color: band.color }}>{value(a.aqi)}</b>
                <span className="ww-pill" style={{ "--pill": band.color } as CSSProperties}>{t(band.key)}</span>
                <span className="ww-air-pm">PM2.5 <b>{value(a.pm25, 1)}</b> · PM10 <b>{value(a.pm10, 1)}</b></span>
              </div>
              <AqiScale aqi={a.aqi} />
            </>
          ) : <p className="ww-muted">{t("air.noData")}</p>}
        </div>

        <div className="ww-card">
          <div className="ww-card-t"><span>{t("sheet.daily")}</span></div>
          {days.length ? days.map((d, i) => (
            <div className="ww-day num" key={d.time}>
              <span className="ww-day-d">{i ? weekday(d.time, w!.utcOffsetSeconds) : t("sheet.today")}</span>
              <WeatherIcon code={d.code} size={24} />
              <span className="ww-day-p">{(d.probability ?? 0) >= 20 ? `${d.probability}%` : ""}</span>
              <span className="ww-day-lo">{value(d.low)}°</span>
              <span className="ww-range-bar">
                {d.low !== null && d.high !== null && <i style={{ left: `${((d.low - lo) / span) * 100}%`, right: `${((hi - d.high) / span) * 100}%` }} />}
              </span>
              <span className="ww-day-hi">{value(d.high)}°</span>
            </div>
          )) : <p className="ww-muted">{t("sheet.noForecast")}</p>}
        </div>

        <div className="ww-card">
          <div className="ww-card-t"><span>{t("sheet.official")}</span></div>
          <p className="ww-small">{alert.reason}</p>
          <a className="ww-link" href={alert.url} target="_blank" rel="noreferrer">{alert.authority} <ExternalLink size={13} /></a>
          <p className="ww-small">{p.location.country === "TH" ? t("sheet.floodTH") : t("sheet.floodCN")}</p>
        </div>
        <p className="ww-micro ww-sources"><strong>{t("sheet.sources")}:</strong> {t("sheet.sourcesText")}</p>
      </div>
    </section>
  );
}
