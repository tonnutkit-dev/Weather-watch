import { useState, lazy, Suspense } from "react";
import type { Location } from "../locations/types";
import type { Radar, RadarFrame } from "../radar/types";
export interface MapLayers {
  radar: boolean;
  weather: boolean;
  air: boolean;
  coverage: boolean;
}
import type { RadarPresentation } from "../radar/presentation";
export interface MapProps {
  onRadarPresentation?: (state: RadarPresentation) => void;
  location: Location;
  theme: "light" | "dark";
  layers: MapLayers;
  radar?: Radar;
  frame?: RadarFrame;
  opacity: number;
  temperature: number | null;
  aqi: number | null;
  onSelect: (lat: number, lon: number) => void;
  onLocate: () => void;
  mapAction: number;
}
const GLCanvas = lazy(() => import("./GLCanvas"));

const RasterCanvas = lazy(() => import("./RasterCanvas"));
export default function MapCanvas(props: MapProps) {
  const [capable] = useState(() => {
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl2");
      if (!gl) return false;
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      return true;
    } catch {
      return false;
    }
  });
  return (
    <Suspense fallback={<div className="map-status">กำลังเตรียมแผนที่…</div>}>
      {capable ? <GLCanvas {...props} /> : <RasterCanvas {...props} />}
    </Suspense>
  );
}
