import { useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { Star, ChevronUp, ChevronDown, ExternalLink, Info } from "lucide-react";
import type { Weather } from "../weather/types";
import type { AirQuality } from "../air-quality/types";
import type { Location } from "../locations/types";
import type { Radar } from "../radar/types";
import type { FreshnessKind } from "../reliability/freshness";
import { alertFoundation } from "../alerts/types";
import { useI18n } from "../i18n/i18n";
import { headline } from "../app/headline";
import { value } from "../shared/time";
import { HourlyChart } from "./HourlyChart";
import { HeadlineText } from "./NowChip";
import { AirCard, DailyList, SourcesPanel } from "./SheetSections";

export function DetailSheet(p: {
  open: boolean;
  onOpen: (open: boolean) => void;
  location: Location;
  weather?: Weather;
  air?: AirQuality;
  now: number;
  favorite: boolean;
  onFavorite: () => void;
  radar?: Radar;
  weatherFreshness?: FreshnessKind;
  airFreshness?: FreshnessKind;
}) {
  const { t, time } = useI18n();
  const [sources, setSources] = useState(false);
  const drag = useRef<{ y: number; moved: boolean } | null>(null);
  const w = p.weather, a = p.air;
  const nowS = p.now / 1000;
  const hours = w?.hourly.filter((h) => h.time > nowS - 3600).slice(0, 24) ?? [];
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
          <button className="ww-icon-btn" aria-label={t("src.title")} onClick={() => setSources(true)}>
            <Info size={18} />
          </button>
          <button className={`ww-icon-btn ${p.favorite ? "is-on" : ""}`} aria-label={p.favorite ? t("fav.remove") : t("fav.add")} aria-pressed={p.favorite} onClick={p.onFavorite}>
            <Star size={18} />
          </button>
        </header>

        <div className="ww-card ww-card-flush">
          <div className="ww-card-t"><span>{t("sheet.hourly")}</span><span>{t("sheet.hourlyLegend")}</span></div>
          <HourlyChart hours={hours} timezone={p.location.timezone} />
        </div>

        <div className="ww-card">
          <div className="ww-card-t"><span>{t("sheet.air")} (US AQI)</span></div>
          <AirCard air={a} timezone={p.location.timezone} now={p.now} />
        </div>

        <div className="ww-card">
          <div className="ww-card-t"><span>{t("sheet.daily")}</span><span>{t("day.tap")}</span></div>
          <DailyList weather={w} />
        </div>

        <div className="ww-card">
          <div className="ww-card-t"><span>{t("sheet.official")}</span></div>
          <p className="ww-small">{alert.reason}</p>
          <a className="ww-link" href={alert.url} target="_blank" rel="noreferrer">{alert.authority} <ExternalLink size={13} /></a>
          <p className="ww-small">{p.location.country === "TH" ? t("sheet.floodTH") : t("sheet.floodCN")}</p>
        </div>
        <button className="ww-src-btn" onClick={() => setSources(true)}><Info size={15} /> {t("src.title")}</button>
      </div>
      {sources && (
        <SourcesPanel onClose={() => setSources(false)} location={p.location} weather={w} air={a} radar={p.radar}
          weatherFreshness={p.weatherFreshness} airFreshness={p.airFreshness} now={p.now} />
      )}
    </section>
  );
}
