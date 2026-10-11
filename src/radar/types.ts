import type { Provenance } from "../shared/provenance";
export interface RadarFrame {
  time: number;
  path: string;
}
export interface Radar {
  host: string;
  generated: number | null;
  frames: RadarFrame[];
  meta: Provenance;
}
