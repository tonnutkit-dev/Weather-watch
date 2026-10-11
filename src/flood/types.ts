import type { Provenance } from "../shared/provenance";
export type FloodStatus =
  | "reported-flooding"
  | "extent-detected"
  | "monitoring"
  | "no-recent-detection"
  | "data-unavailable";
export interface SatelliteFloodExtent {
  kind: "satellite-extent";
  provinceId: string;
  windowDays: 1 | 3 | 7 | 30;
  geometry: GeoJSON.Geometry | null;
  meta: Provenance;
}
export interface ReportedFloodIncident {
  kind: "reported-incident";
  provinceIds: string[];
  authority: string;
  description: string;
  sourceUrl: string;
  meta: Provenance;
}
export interface RiverLevel {
  kind: "measured-level";
  stationId: string;
  datum: string;
  levelMeters: number | null;
  meta: Provenance;
}
export interface RiverDischarge {
  kind: "forecast-discharge";
  riverId: string;
  daily: { time: number; dischargeM3s: number | null }[];
  meta: Provenance;
}
export interface FloodWatch {
  provinceId: string;
  status: FloodStatus;
  satellite: SatelliteFloodExtent | null;
  incidents: ReportedFloodIncident[];
  levels: RiverLevel[];
  discharge: RiverDischarge | null;
  reason: string;
}
