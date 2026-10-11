import type { Provenance } from "../shared/provenance";
export interface CurrentWeather {
  time: number | null;
  temperature: number | null;
  apparent: number | null;
  humidity: number | null;
  wind: number | null;
  direction: number | null;
  precipitation: number | null;
  code: number | null;
  isDay: boolean | null;
  pressure: number | null;
}
export interface Hour {
  time: number;
  temperature: number | null;
  probability: number | null;
  precipitation: number | null;
  wind: number | null;
  direction: number | null;
  code: number | null;
}
export interface Day {
  time: number;
  high: number | null;
  low: number | null;
  probability: number | null;
  precipitation: number | null;
  wind: number | null;
  code: number | null;
}
export interface Weather {
  current: CurrentWeather;
  hourly: Hour[];
  daily: Day[];
  timezone: string;
  utcOffsetSeconds: number;
  grid: { latitude: number | null; longitude: number | null };
  currentMeta: Provenance;
  forecastMeta: Provenance;
}
