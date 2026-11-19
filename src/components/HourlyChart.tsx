import type { Hour } from "../weather/types";
import { useI18n } from "../i18n/i18n";
import { WeatherIcon } from "./WeatherIcon";
const COL = 48, LINE_TOP = 22, LINE_H = 52, BAR_H = 30;
/**
 * Labeled hourly chart (Direction B): every hour has its time, icon and temperature label;
 * the temperature line sits in its own band above rain-chance bars, so labels never collide.
 * Scrolls horizontally on narrow screens.
 */
export function HourlyChart({ hours, timezone }: { hours: Hour[]; timezone: string }) {
  const { t, hour } = useI18n();
  const temps = hours.map((h) => h.temperature).filter((v): v is number => v !== null);
  if (temps.length < 2) return <p className="ww-muted">{t("sheet.noForecast")}</p>;
  const W = hours.length * COL;
  const lo = Math.min(...temps) - 1, hi = Math.max(...temps) + 1;
  const x = (i: number) => i * COL + COL / 2;
  const y = (v: number) => LINE_TOP + LINE_H - ((v - lo) / (hi - lo)) * LINE_H;
  const line = hours
    .map((h, i) => (h.temperature === null ? null : `${x(i).toFixed(1)},${y(h.temperature).toFixed(1)}`))
    .filter(Boolean)
    .join(" L");
  const barBase = LINE_TOP + LINE_H + 14 + BAR_H + 4;
  const H = barBase + 4;
  return (
    <div className="ww-hourly" role="img" aria-label={t("sheet.hourlyLegend")} tabIndex={0}>
      <div className="ww-hourly-inner" style={{ width: W }}>
        <div className="ww-hourly-heads num">
          {hours.map((h, i) => (
            <div key={h.time} style={{ width: COL }}>
              <span>{i ? `${hour(h.time, timezone)}:00` : t("sheet.now")}</span>
              <WeatherIcon code={h.code} size={22} />
            </div>
          ))}
        </div>
        <svg className="ww-chart" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
          {hours.map((h, i) => {
            const p = h.probability ?? 0, bh = Math.max(2, (p / 100) * BAR_H);
            return (
              <g key={`b${h.time}`}>
                <rect x={x(i) - 8} y={barBase - bh} width="16" height={bh} rx="3" className="ww-bar" style={{ opacity: 0.25 + (p / 100) * 0.65 }} />
                {p >= 20 && <text x={x(i)} y={barBase - bh - 4} textAnchor="middle" className="ww-bar-label num">{p}%</text>}
              </g>
            );
          })}
          <path d={`M${line}`} className="ww-line" />
          {hours.map((h, i) =>
            h.temperature === null ? null : (
              <g key={`p${h.time}`}>
                <circle cx={x(i)} cy={y(h.temperature)} r="3" className="ww-pt" />
                <text x={x(i)} y={y(h.temperature) - 8} textAnchor="middle" className="ww-pt-label num">{Math.round(h.temperature)}°</text>
              </g>
            ),
          )}
        </svg>
      </div>
    </div>
  );
}
