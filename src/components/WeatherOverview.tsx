import { MapPin, Star, ChevronDown, RefreshCw } from "lucide-react";
import { WeatherIcon, condition } from "./WeatherIcon";
import { freshness, freshnessLabel } from "../reliability/freshness";
import { timeLabel, value } from "../shared/time";
import type { SituationProps } from "./SituationPanel";
export function WeatherOverview(p: Pick<SituationProps, "location" | "weather" | "now" | "favorite" | "onFavorite" | "onRefresh"> & {onSearch:()=>void}) {
 const w=p.weather.data;
 const wf=freshness(w?.current.time,w?.currentMeta.fetchedAt,'weather',p.weather.isFetching,p.weather.isError,p.now);
 return (
        <section className="current-section weather-overview" aria-label="อากาศ ณ ตำแหน่งที่เลือก">
          <div className="editorial-meta"><span>THE WEATHER EDIT</span><span>OWNER QA · 03</span></div>
          <div className="location-title">
            <MapPin size={18} />
            <div>
              <h1><button className="location-heading" onClick={p.onSearch}>{p.location.name}<ChevronDown size={15}/></button></h1>
              <span>
                แบบจำลอง Open-Meteo ·{" "}
                {timeLabel(w?.current.time, p.location.timezone)}
              </span>
            </div>
            <button
              className={`icon-button favorite-button ${p.favorite ? "saved" : ""}`}
              aria-label={p.favorite ? "ลบตำแหน่งโปรด" : "บันทึกตำแหน่งโปรด"}
              aria-pressed={p.favorite}
              onClick={p.onFavorite}
            >
              <Star size={19} fill={p.favorite ? "currentColor" : "none"} />
            </button>
          </div>
          <p className="overview-freshness">{freshnessLabel[wf.state]}{wf.failed ? " · อัปเดตไม่สำเร็จ" : ""}</p>
          {p.weather.isPending ? (
            <div className="weather-loading" role="status">
              <div className="skeleton temperature-skeleton" />
              <p>กำลังโหลดอากาศสำหรับตำแหน่งนี้…</p>
            </div>
          ) : p.weather.isError && !w ? (
            <div className="data-error" role="alert">
              <strong>โหลดข้อมูลอากาศไม่ได้</strong>
              <p>{p.weather.error.message}</p>
              <button className="text-button" onClick={p.onRefresh}>
                <RefreshCw size={15} /> ลองใหม่
              </button>
            </div>
          ) : (
            w && (
              <>
                <div className="current-weather">
                  <WeatherIcon
                    code={w.current.code}
                    isDay={w.current.isDay}
                    size={120}
                  />
                  <div>
                    <div className="temperature" data-testid="temperature">
                      {value(w.current.temperature)}
                      <span>°C</span>
                    </div>
                    <p data-testid="weather-condition">
                      {condition(w.current.code)}
                    </p>
                    <small>
                      รู้สึกเหมือน {value(w.current.apparent)}° · สูง{" "}
                      {value(w.daily[0]?.high)}° / ต่ำ {value(w.daily[0]?.low)}°
                    </small>
                  </div>
                </div>
              </>
            )
          )}
        </section>
);
}
