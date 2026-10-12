import { useRef, useEffect } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import {
  Droplets,
  Wind,
  Gauge,
  ChevronUp,
  ChevronDown,
  Leaf,
  Waves,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import type { Location } from "../locations/types";
import type { Weather } from "../weather/types";
import type { AirQuality } from "../air-quality/types";
import { Forecast } from "./Forecast";
import { aqiLabel } from "../providers/airQuality";
import { freshness, freshnessLabel } from "../reliability/freshness";
import { situation } from "../shared/situation";
import { timeLabel, value, windDirection } from "../shared/time";
import { alertFoundation } from "../alerts/types";
export type SheetState = "collapsed" | "half" | "expanded";
export interface SituationProps {
  now?: number;
  location: Location;
  weather: UseQueryResult<Weather, Error>;
  air: UseQueryResult<AirQuality, Error>;
  sheet: SheetState;
  onSheet: (s: SheetState) => void;
  favorite: boolean;
  onFavorite: () => void;
  onRefresh: () => void;
  view: "overview" | "forecast" | "environment";
  onView: (v: "overview" | "forecast" | "environment") => void;
}
export function SituationPanel(p: SituationProps) {
  const w = p.weather.data, a = p.air.data;
  const wf = freshness(w?.current.time, w?.currentMeta.fetchedAt, 'weather', p.weather.isFetching, p.weather.isError, p.now);
  const af = freshness(a?.time, a?.meta.fetchedAt, 'air', p.air.isFetching, p.air.isError, p.now);
  const v = situation(wf.assessmentAllowed ? w : undefined, af.assessmentAllowed ? a : undefined, (p.now ?? Date.now()) / 1000);
  const alert = alertFoundation(p.location.country);
  const drag = useRef<{ y: number; state: SheetState } | null>(null);
  const dragged = useRef(false);
  const scroll = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (p.sheet === "collapsed" && scroll.current) {
      scroll.current.scrollTop = 0;
      scroll.current.scrollLeft = 0;
    }
  }, [p.sheet]);
  const cycle = (direction: number) => {
    const states: SheetState[] = ["collapsed", "half", "expanded"];
    p.onSheet(
      states[Math.max(0, Math.min(2, states.indexOf(p.sheet) + direction))]!,
    );
  };
  return (
    <aside
      className={`situation-panel sheet-${p.sheet}`}
      aria-label="สถานการณ์อากาศ"
      data-selected-location={p.location.id}
      data-weather-freshness={wf.state}
      data-air-freshness={af.state}
      data-verdict={v.verdict}
    >
      <div
        className="sheet-handle"
        onPointerDown={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest(".sheet-state-controls")) return;
          dragged.current = false;
          drag.current = { y: e.clientY, state: p.sheet };
          (target.closest("button") ?? e.currentTarget).setPointerCapture(
            e.pointerId,
          );
        }}
        onPointerUp={(e) => {
          const d = drag.current;
          if (d && Math.abs(e.clientY - d.y) > 30) {
            dragged.current = true;
            cycle(e.clientY < d.y ? 1 : -1);
          }
          drag.current = null;
        }}
        onPointerCancel={() => (drag.current = null)}
      >
        <button
          className="handle-button"
          aria-label="ปรับความสูงแผงสถานการณ์"
          aria-expanded={p.sheet !== "collapsed"}
          onClick={() => {
            if (dragged.current) {
              dragged.current = false;
              return;
            }
            cycle(p.sheet === "expanded" ? -2 : 1);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp") {
              e.preventDefault();
              cycle(1);
            }
            if (e.key === "ArrowDown") {
              e.preventDefault();
              cycle(-1);
            }
          }}
        >
          <span />
        </button>
        <div className="sheet-state-controls">
          <button
            aria-label="ยุบแผง"
            onClick={() => cycle(-1)}
            disabled={p.sheet === "collapsed"}
          >
            <ChevronDown size={16} />
          </button>
          <button
            aria-label="ขยายแผง"
            onClick={() => cycle(1)}
            disabled={p.sheet === "expanded"}
          >
            <ChevronUp size={16} />
          </button>
        </div>
      </div>
      <div className="panel-scroll" ref={scroll}>
        <div className="outlook-heading"><span className="eyebrow">A LITTLE PERSPECTIVE</span><h2>มองไปข้างหน้า</h2></div>
        <p className={`summary-message verdict-${v.verdict.toLowerCase()}`}>
          <span className="verdict-dot" />
          <span>{!wf.assessmentAllowed || !af.assessmentAllowed ?
            wf.failed || af.failed ? 'อัปเดตไม่สำเร็จ · ยังประเมินไม่ได้' :
              wf.state === 'expired' || af.state === 'expired' ? 'ข้อมูลหมดอายุ · ยังประเมินไม่ได้' : v.title : `แบบจำลอง · ${v.title}`}</span>
        </p>
        <div className={`verdict verdict-${v.verdict.toLowerCase()}`}>
          <span className="verdict-dot" />
          <div>
            <strong>{v.title}</strong>
            <p>{v.reason}</p>
          </div>
          <span className="data-tag">WW</span>
        </div>
        {w && <div className="detail-metrics">
                <div className="current-metadata">
                  <span role="status" data-testid="weather-freshness">{freshnessLabel[wf.state]}{wf.failed && wf.state !== 'refresh-failed' ? ' · อัปเดตไม่สำเร็จ' : ''} · เวลาแหล่งข้อมูล {timeLabel(w.current.time, p.location.timezone, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  <span className="data-tag">MODELED</span>
                  <span>ค่าจากแบบจำลอง ไม่ใช่สถานีตรวจวัด</span>
                  <span>
                    ฝนช่วงข้อมูลปัจจุบัน {value(w.current.precipitation, 1)} mm
                  </span>
                </div>
                <div className="weather-metrics">
                  <div>
                    <Droplets size={16} />
                    <span>
                      ความชื้น
                      <strong>
                        {value(w.current.humidity)}
                        <small>%</small>
                      </strong>
                    </span>
                  </div>
                  <div>
                    <Wind size={16} />
                    <span>
                      ลม {windDirection(w.current.direction)}
                      <strong>
                        {value(w.current.wind)}
                        <small>km/h</small>
                      </strong>
                    </span>
                  </div>
                  <div>
                    <Gauge size={16} />
                    <span>
                      ความกดอากาศ
                      <strong>
                        {value(w.current.pressure)}
                        <small>hPa</small>
                      </strong>
                    </span>
                  </div>
                </div>
        </div>}
        <div className="panel-tabs" aria-label="รายละเอียดสถานการณ์">
          {(
            [
              ["overview", "ภาพรวม"],
              ["forecast", "พยากรณ์"],
              ["environment", "สิ่งแวดล้อม"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              aria-pressed={p.view === id}
              onClick={() => p.onView(id)}
            >
              {label}
            </button>
          ))}
        </div>
        {(p.view === "overview" || p.view === "forecast") && w && (
          <Forecast weather={w} />
        )}
        {(p.view === "overview" || p.view === "environment") && (
          <section className="environment-section">
            <div className="section-title">
              <h2>สิ่งแวดล้อมรอบตัว</h2>
            </div>
            <div className="air-card">
              <div className="section-title">
                <h3>
                  <Leaf size={17} /> คุณภาพอากาศ
                </h3>
                <span className="data-tag">MODELED</span>
              </div>
              {p.air.isPending ? (
                <p role="status" className="muted">
                  กำลังโหลดคุณภาพอากาศ…
                </p>
              ) : p.air.isError && !a ? (
                <div className="data-error" role="status">
                  เชื่อมต่อข้อมูลอากาศไม่ได้{" "}
                  <button onClick={p.onRefresh}>ลองใหม่</button>
                </div>
              ) : (
                a && (
                  <>
                    <p className="micro" role="status" data-testid="air-freshness">{freshnessLabel[af.state]}{af.failed && af.state !== 'refresh-failed' ? ' · อัปเดตไม่สำเร็จ' : ''}</p>
                    <div className="air-values">
                      <div>
                        <span>PM2.5</span>
                        <strong>{value(a.pm25, 1)}</strong>
                        <small>µg/m³</small>
                      </div>
                      <div>
                        <span>PM10</span>
                        <strong>{value(a.pm10, 1)}</strong>
                        <small>µg/m³</small>
                      </div>
                      <div>
                        <span>US AQI</span>
                        <strong>{value(a.aqi)}</strong>
                        <small>{aqiLabel(a.aqi)}</small>
                      </div>
                    </div>
                    <p className="micro">
                      ไม่ใช่ AQI ไทย · CAMS แบบจำลอง ~45 กม. ·{" "}
                      {timeLabel(a.time, p.location.timezone)}
                    </p>
                    <div className="aq-trend">
                      <span>US AQI แนวโน้มพยากรณ์</span>
                      {a.hourly
                        .filter(
                          (h) =>
                            h.time >= Math.floor(Date.now() / 3600000) * 3600,
                        )
                        .filter((_, i) => i % 6 === 0)
                        .slice(0, 4)
                        .map((h) => (
                          <span key={h.time}>
                            {timeLabel(h.time, p.location.timezone)}
                            <strong>{value(h.aqi)}</strong>
                          </span>
                        ))}
                    </div>
                  </>
                )
              )}
            </div>
            <div className="blocked-card">
              <div className="section-title">
                <h3>
                  <Waves size={17} /> Flood Watch
                </h3>
                <span className="data-tag">ไม่มีข้อมูล</span>
              </div>
              <p>
                {p.location.country === "TH"
                  ? "ยังไม่เชื่อมต่อข้อมูลน้ำท่วมที่ตรวจสอบแล้ว ไม่สามารถสรุปว่าไม่มีน้ำท่วมในพื้นที่"
                  : "ยังไม่มีข้อมูลน้ำท่วมสำหรับเมืองนี้"}
              </p>
              {p.location.country === "TH" && (
                <a
                  href="https://disaster.gistda.or.th/"
                  target="_blank"
                  rel="noreferrer"
                >
                  ดูข้อมูล GISTDA <ExternalLink size={13} />
                </a>
              )}
            </div>
            <div className="blocked-card official-alert">
              <div className="section-title">
                <h3>
                  <ShieldAlert size={17} /> ประกาศทางการ
                </h3>
                <span className="data-tag">ยังไม่เชื่อมต่อ</span>
              </div>
              <p>{alert.reason}</p>
              <a href={alert.url} target="_blank" rel="noreferrer">
                {alert.authority} <ExternalLink size={13} />
              </a>
            </div>
            <div className="blocked-card">
              <h3>ระดับน้ำและแม่น้ำ</h3>
              <p>
                ยังไม่มีข้อมูลสถานีตรวจวัด
                อัตราการไหลจากแบบจำลองไม่เท่ากับระดับน้ำหรือน้ำท่วมถนน
              </p>
              {p.location.country === "TH" && (
                <a
                  href="https://www.thaiwater.net/"
                  target="_blank"
                  rel="noreferrer"
                >
                  ThaiWater <ExternalLink size={13} />
                </a>
              )}
            </div>
          </section>
        )}
        <footer className="data-footer">
          <p>
            ตำแหน่ง WGS84 {p.location.latitude.toFixed(4)},{" "}
            {p.location.longitude.toFixed(4)}
            {w && (
              <>
                {" "}
                · กริด {value(w.grid.latitude, 3)}, {value(w.grid.longitude, 3)}
              </>
            )}
          </p>
          <p>
            ดึงข้อมูล {timeLabel(w?.currentMeta.fetchedAt, p.location.timezone)}{" "}
            · {p.location.timezone}
          </p>
          <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
            Weather by Open-Meteo
          </a>{" "}
          ·{" "}
          <a
            href="https://atmosphere.copernicus.eu/"
            target="_blank"
            rel="noreferrer"
          >
            CAMS
          </a>
        </footer>
      </div>
    </aside>
  );
}
