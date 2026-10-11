import type { Provenance } from "../shared/provenance";
export interface AirQuality {
  time: number | null;
  pm25: number | null;
  pm10: number | null;
  aqi: number | null;
  standard: "US AQI";
  hourly: { time: number; pm25: number | null; aqi: number | null }[];
  meta: Provenance;
  forecastMeta: Provenance;
}
