export type DataType =
  | "OBSERVED"
  | "FORECAST"
  | "MODELED"
  | "OFFICIAL_ALERT"
  | "INTERPRETATION";
export type DataStatus = "available" | "partial" | "stale" | "unavailable";
export interface Provenance {
  sourceId: string;
  sourceName: string;
  dataType: DataType;
  observedAt: number | null;
  issuedAt: number | null;
  validFrom: number | null;
  validTo: number | null;
  fetchedAt: number;
  latitude: number;
  longitude: number;
  units: Record<string, string>;
  status: DataStatus;
  attributionUrl: string;
}
export interface Provider<T> {
  fetch(signal?: AbortSignal): Promise<T>;
}
