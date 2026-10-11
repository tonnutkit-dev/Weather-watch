import { useState } from "react";
import type { Weather } from "../weather/types";
import { timeLabel, dayLabel, value } from "../shared/time";
import { WeatherIcon, condition } from "./WeatherIcon";
import { Droplets, Wind, ChevronDown, TrendingUp } from "lucide-react";
type Range = "2h" | "24h" | "3d" | "7d";
export function Forecast({ weather }: { weather: Weather }) {
  const [range, setRange] = useState<Range>("24h"),
    [allDays, setAllDays] = useState(false);
  const now = Date.now() / 1000,
    start = Math.floor(now / 3600) * 3600;
  const hours = weather.hourly
    .filter((h) => h.time >= start)
    .slice(0, range === "2h" ? 3 : 24);
  const days = weather.daily.slice(0, range === "3d" ? 3 : 7);
  const hourly = range === "2h" || range === "24h";
  const rows = hourly
    ? hours.map((h) => ({ time: h.time, temp: h.temperature }))
    : days.map((d) => ({ time: d.time, temp: d.high }));
  const numbers = rows.flatMap((r) => (r.temp === null ? [] : [r.temp]));
  const min = numbers.length ? Math.min(...numbers) - 2 : 0,
    max = numbers.length ? Math.max(...numbers) + 2 : 1;
  const x = (i: number) => 12 + (i * 296) / Math.max(1, rows.length - 1),
    y = (t: number) => 75 - ((t - min) / (max - min)) * 59;
  // Break line at missing values; never interpolate unavailable provider samples.
  const path = rows
    .map((r, i) =>
      r.temp === null
        ? ""
        : `${i === 0 || rows[i - 1]?.temp === null ? "M" : "L"}${x(i).toFixed(1)},${y(r.temp).toFixed(1)}`,
    )
    .join(" ");
  return (
    <section className="forecast-section" id="forecast-view">
      <div className="section-title">
        <h2>
          <TrendingUp size={17} /> พยากรณ์อากาศ
        </h2>
        <span className="data-tag">FORECAST</span>
      </div>
      <div className="segments" aria-label="ช่วงพยากรณ์">
        {(
          [
            ["2h", "2 ชม."],
            ["24h", "24 ชม."],
            ["3d", "3 วัน"],
            ["7d", "7 วัน"],
          ] as const
        ).map(([r, t]) => (
          <button
            key={r}
            aria-pressed={range === r}
            onClick={() => setRange(r)}
          >
            {t}
          </button>
        ))}
      </div>
      <p className="resolution">
        {range === "2h"
          ? "แบบจำลองรายชั่วโมง · ไม่ใช่ radar nowcast"
          : hourly
            ? "อุณหภูมิรายชั่วโมง · 24 ชั่วโมงถัดไป"
            : "อุณหภูมิสูงสุดรายวัน · ลมสูงสุด km/h"}
      </p>
      <div className="temperature-chart">
        <span className="chart-unit">°C</span>
        <svg
          viewBox="0 0 320 90"
          role="img"
          aria-label={`แนวโน้มอุณหภูมิ ${numbers.length ? `${value(Math.min(...numbers))} ถึง ${value(Math.max(...numbers))} องศาเซลเซียส` : "ไม่มีข้อมูล"}`}
        >
          <path d="M12 75H308M12 42H308M12 9H308" className="chart-grid" />
          <path d={path} className="chart-line" />
          {rows
            .filter((_, i) => i === 0 || i === rows.length - 1)
            .map(
              (r) =>
                r.temp !== null && (
                  <circle
                    key={r.time}
                    cx={x(rows.indexOf(r))}
                    cy={y(r.temp)}
                    r="3"
                    className="chart-dot"
                  />
                ),
            )}
        </svg>
        <div className="chart-labels">
          <span>
            {hourly
              ? timeLabel(rows[0]?.time, weather.timezone)
              : rows[0]
                ? dayLabel(rows[0].time, weather.utcOffsetSeconds)
                : "—"}
          </span>
          <span>
            {hourly
              ? timeLabel(rows.at(-1)?.time, weather.timezone)
              : rows.at(-1)
                ? dayLabel(rows.at(-1)!.time, weather.utcOffsetSeconds)
                : "—"}
          </span>
        </div>
      </div>
      {hourly ? (
        <div
          className="hourly-scroll"
          tabIndex={0}
          aria-label="พยากรณ์รายชั่วโมง เลื่อนเพื่อดูเพิ่มเติม"
        >
          {hours.map((h, i) => (
            <div className="hour-card" key={h.time}>
              <span>
                {i === 0 ? "ชั่วโมงนี้" : timeLabel(h.time, weather.timezone)}
              </span>
              <WeatherIcon
                code={h.code}
                isDay={
                  Number(timeLabel(h.time, weather.timezone).split(":")[0]) >=
                    6 &&
                  Number(timeLabel(h.time, weather.timezone).split(":")[0]) < 18
                }
                size={38}
              />
              <strong>{value(h.temperature)}°</strong>
              <small>
                <Droplets size={11} />
                {value(h.probability)}%
              </small>
              <small>{value(h.precipitation, 1)} mm</small>
              <small>
                <Wind size={11} />
                {value(h.wind)} km/h
              </small>
              <span className="sr-only">{condition(h.code)}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="daily-list">
          {days.map((d) => (
            <div
              key={d.time}
              className="daily-row"
              aria-label={`${dayLabel(d.time, weather.utcOffsetSeconds, { day: "numeric", month: "short" })} ${condition(d.code)} ต่ำ ${value(d.low)} สูง ${value(d.high)} องศา โอกาสฝน ${value(d.probability)}%`}
            >
              <span>{dayLabel(d.time, weather.utcOffsetSeconds)}</span>
              <WeatherIcon code={d.code} size={32} />
              <small>
                <Droplets size={12} />
                {value(d.probability)}%
              </small>
              <span>
                {value(d.low)}° <strong>{value(d.high)}°</strong>
              </span>
              <small>
                <Wind size={12} />
                {value(d.wind)}
              </small>
            </div>
          ))}
        </div>
      )}
      <button
        className="text-button full"
        aria-expanded={allDays}
        onClick={() => setAllDays((v) => !v)}
      >
        ดูพยากรณ์รายวัน {weather.daily.length} วัน{" "}
        <ChevronDown size={15} className={allDays ? "rotate" : ""} />
      </button>
      {allDays && (
        <div className="daily-list all-days">
          {weather.daily.map((d) => (
            <div
              key={d.time}
              className="daily-row"
              aria-label={`${dayLabel(d.time, weather.utcOffsetSeconds, { day: "numeric", month: "short" })} ${condition(d.code)} ต่ำ ${value(d.low)} สูง ${value(d.high)} องศา โอกาสฝน ${value(d.probability)}%`}
            >
              <span>
                {dayLabel(d.time, weather.utcOffsetSeconds, {
                  day: "numeric",
                  month: "short",
                })}
              </span>
              <WeatherIcon code={d.code} size={32} />
              <small>{value(d.probability)}%</small>
              <span>
                {value(d.low)}° <strong>{value(d.high)}°</strong>
              </span>
              <small>{value(d.precipitation, 1)} mm</small>
            </div>
          ))}
        </div>
      )}
      <p className="micro">ความแม่นยำลดลงเมื่อพยากรณ์ไกลขึ้น • Open-Meteo</p>
    </section>
  );
}
