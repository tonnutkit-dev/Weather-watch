import type { CSSProperties } from "react";
import { CalendarX2, Wind } from "lucide-react";
import { StateBlock } from "./StateBlock";
import type { Weather } from "../weather/types";
import type { AirQuality } from "../air-quality/types";
import { useI18n } from "../i18n/i18n";
import { aqiBand } from "../app/headline";
import { value } from "../shared/time";
import { WeatherIcon } from "./WeatherIcon";

/** Temp layer companion: the next 12 hours at the selected point (no gridded temperature source exists). */
export function TempStrip({ weather, timezone, now }: { weather?: Weather; timezone: string; now: number }) {
  const { t, hour } = useI18n();
  const hours = weather?.hourly.filter((h) => h.time > now / 1000 - 3600).slice(0, 12) ?? [];
  return (
    <div className="ww-strip glass" aria-label={t("temp.caption")}>
      <div className="ww-strip-cap">{t("temp.caption")}</div>
      {hours.length ? (
        <div className="ww-temps num">
          {hours.map((h, i) => (
            <div key={h.time}>
              <span>{i ? hour(h.time, timezone) : t("sheet.now")}</span>
              <WeatherIcon code={h.code} size={22} />
              <b>{value(h.temperature)}°</b>
            </div>
          ))}
        </div>
      ) : (
        <StateBlock compact icon={CalendarX2} title={t("sheet.noForecast")} />
      )}
    </div>
  );
}
export function AqiScale({ aqi }: { aqi: number | null }) {
  return (
    <div className="ww-aqbar" aria-hidden="true">
      {aqi !== null && <i style={{ left: `${Math.min(aqi / 300, 0.99) * 100}%` }} />}
    </div>
  );
}
/** Air layer companion: US AQI and PM values at the selected point. */
export function AirStrip({ air }: { air?: AirQuality }) {
  const { t } = useI18n();
  const band = aqiBand(air?.aqi ?? null);
  return (
    <div className="ww-strip glass" aria-label={t("air.caption")}>
      <div className="ww-strip-cap">{t("air.caption")}</div>
      {air && band ? (
        <>
          <div className="ww-air-row num">
            <b className="ww-air-v">{value(air.aqi)}</b>
            <span className="ww-pill" style={{ "--pill": band.color } as CSSProperties}>
              {t(band.key)}
            </span>
            <span className="ww-air-pm">
              PM2.5 <b>{value(air.pm25, 1)}</b> · PM10 <b>{value(air.pm10, 1)}</b>
            </span>
          </div>
          <AqiScale aqi={air.aqi} />
        </>
      ) : (
        <StateBlock compact icon={Wind} title={t("air.noData")} />
      )}
    </div>
  );
}
