import type { Hour } from "../weather/types";
import { useI18n } from "../i18n/i18n";
/** Labeled temperature line over rain-chance bars (Direction B). Pure SVG, scales with width. */
export function HourlyChart({ hours, timezone }: { hours: Hour[]; timezone: string }) {
  const { t, hour } = useI18n();
  const pts = hours.filter((h) => h.temperature !== null);
  if (pts.length < 2) return <p className="ww-muted">{t("sheet.noForecast")}</p>;
  const W = 340, H = 64, top = 22, n = hours.length - 1, BAR = 34;
  const temps = pts.map((h) => h.temperature!);
  const lo = Math.min(...temps) - 1, hi = Math.max(...temps) + 1;
  const x = (i: number) => 12 + (i / n) * (W - 24);
  const y = (v: number) => top + H - ((v - lo) / (hi - lo)) * H;
  const line = hours
    .map((h, i) => (h.temperature === null ? null : `${x(i).toFixed(1)},${y(h.temperature).toFixed(1)}`))
    .filter(Boolean)
    .join(" L");
  // Separate bands: temperature line on top, rain bars below, so labels never collide.
  const barBase = top + H + 16 + BAR + 14;
  return (
    <svg className="ww-chart" viewBox={`0 0 ${W} ${barBase + 22}`} role="img" aria-label={t("sheet.hourlyLegend")}>
      {hours.map((h, i) => {
        const p = h.probability ?? 0, bh = Math.max(2, (p / 100) * BAR);
        return <rect key={`b${h.time}`} x={x(i) - 7} y={barBase - bh} width="14" height={bh} rx="3" className="ww-bar" style={{ opacity: 0.25 + (p / 100) * 0.65 }} />;
      })}
      <path d={`M${line}`} className="ww-line" />
      {hours.map((h, i) =>
        i % 3 === 0 && h.temperature !== null ? (
          <g key={`p${h.time}`}>
            <circle cx={x(i)} cy={y(h.temperature)} r="3.5" className="ww-pt" />
            <text x={x(i)} y={y(h.temperature) - 9} textAnchor="middle" className="ww-pt-label num">{Math.round(h.temperature)}°</text>
            {(h.probability ?? 0) >= 20 && <text x={x(i)} y={barBase - (h.probability! / 100) * BAR - 4} textAnchor="middle" className="ww-bar-label num">{h.probability}%</text>}
            <text x={x(i)} y={barBase + 16} textAnchor="middle" className="ww-axis num">{i ? `${hour(h.time, timezone)}:00` : t("sheet.now")}</text>
          </g>
        ) : null,
      )}
    </svg>
  );
}
