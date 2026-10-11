import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import type { Map, GeoJSONSource, RasterTileSource } from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import "maplibre-gl/dist/maplibre-gl.css";
import type { MapProps } from "./MapCanvas";
import { radarTiles } from "../providers/radar";
import { radarImage } from "../radar/budget";
import { value } from "../shared/time";
maplibregl.setWorkerUrl(workerUrl);
maplibregl.addProtocol("wwradar", async (params, controller) => ({
  data: await radarImage(
    params.url.replace(/^wwradar:/, "https:"),
    controller.signal,
  ),
}));
export default function GLCanvas(props: MapProps) {
  const host = useRef<HTMLDivElement>(null),
    map = useRef<Map | null>(null),
    current = useRef(props);
  current.current = props;
  const styleReady = useRef(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
      "loading",
    ),
    [radarError, setRadarError] = useState(false),
    [retry, setRetry] = useState(0);
  const sync = useRef<() => void>(() => {});
  sync.current = () => {
    const m = map.current,
      p = current.current;
    if (!m || !styleReady.current) return;
    const point: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {
            label: `${value(p.temperature)}°`,
            aqi: p.aqi === null ? "US AQI —" : `US AQI ${value(p.aqi)}`,
            color:
              p.aqi === null
                ? "#8696aa"
                : p.aqi <= 50
                  ? "#247b65"
                  : p.aqi <= 100
                    ? "#a56b12"
                    : "#bd4c4c",
          },
          geometry: {
            type: "Point",
            coordinates: [p.location.longitude, p.location.latitude],
          },
        },
      ],
    };
    if (m.getSource("ww-point"))
      (m.getSource("ww-point") as GeoJSONSource).setData(point);
    else {
      m.addSource("ww-point", { type: "geojson", data: point });
      m.addLayer({
        id: "ww-point-dot",
        type: "circle",
        source: "ww-point",
        paint: {
          "circle-radius": 7,
          "circle-color": "#277ef5",
          "circle-stroke-color": p.theme === "dark" ? "#101e30" : "#fff",
          "circle-stroke-width": 4,
        },
      });
      m.addLayer({
        id: "ww-weather",
        type: "symbol",
        source: "ww-point",
        layout: {
          "text-field": ["get", "label"],
          "text-font": ["Noto Sans Regular"],
          "text-size": 18,
          "text-offset": [0, -1.8],
          "text-allow-overlap": true,
        },
        paint: {
          "text-color": p.theme === "dark" ? "#e8f1ff" : "#12314b",
          "text-halo-color": p.theme === "dark" ? "#122136" : "#fff",
          "text-halo-width": 3,
        },
      });
      m.addLayer({
        id: "ww-air",
        type: "circle",
        source: "ww-point",
        paint: {
          "circle-radius": 36,
          "circle-color": ["get", "color"],
          "circle-opacity": 0.18,
          "circle-stroke-color": ["get", "color"],
          "circle-stroke-width": 2,
        },
      });
      m.addLayer({
        id: "ww-air-label",
        type: "symbol",
        source: "ww-point",
        layout: {
          "text-field": ["get", "aqi"],
          "text-font": ["Noto Sans Regular"],
          "text-size": 13,
          "text-offset": [0, 2.8],
          "text-allow-overlap": true,
        },
        paint: {
          "text-color": p.theme === "dark" ? "#e8f1ff" : "#12314b",
          "text-halo-color": p.theme === "dark" ? "#122136" : "#fff",
          "text-halo-width": 2,
        },
      });
    }
    for (const [id, show] of [
      ["ww-weather", p.layers.weather],
      ["ww-air", p.layers.air],
      ["ww-air-label", p.layers.air],
    ] as const)
      m.setLayoutProperty(id, "visibility", show ? "visible" : "none");
    if (p.radar && p.frame) {
      const tile = radarTiles(p.radar, p.frame).replace(/^https:/, "wwradar:");
      if (!m.getSource("ww-radar")) {
        m.addSource("ww-radar", {
          type: "raster",
          tiles: [tile],
          tileSize: 512,
          maxzoom: 7,
          attribution:
            'Weather data by <a href="https://www.rainviewer.com/">RainViewer</a>',
        });
        const before = m.getStyle().layers.find((l) => l.type === "symbol")?.id;
        m.addLayer(
          {
            id: "ww-radar",
            type: "raster",
            source: "ww-radar",
            paint: { "raster-opacity": p.opacity, "raster-fade-duration": 0 },
            layout: { visibility: p.layers.radar ? "visible" : "none" },
          },
          before,
        );
      } else {
        const source = m.getSource("ww-radar") as RasterTileSource;
        if (source.tiles?.[0] !== tile) {
          source.setTiles([tile]);
          setRadarError(false);
        }
        m.setPaintProperty("ww-radar", "raster-opacity", p.opacity);
        m.setLayoutProperty(
          "ww-radar",
          "visibility",
          p.layers.radar ? "visible" : "none",
        );
      }
      if (!m.getSource("ww-coverage")) {
        m.addSource("ww-coverage", {
          type: "raster",
          tiles: [
            `${p.radar.host}/v2/coverage/0/512/{z}/{x}/{y}/0/0_0.png`.replace(
              /^https:/,
              "wwradar:",
            ),
          ],
          tileSize: 512,
          maxzoom: 7,
        });
        m.addLayer({
          id: "ww-coverage",
          type: "raster",
          source: "ww-coverage",
          paint: { "raster-opacity": 0.24 },
          layout: { visibility: p.layers.coverage ? "visible" : "none" },
        });
      } else
        m.setLayoutProperty(
          "ww-coverage",
          "visibility",
          p.layers.coverage ? "visible" : "none",
        );
    }
  };
  useEffect(() => {
    if (!host.current) return;
    const p = current.current;
    try {
      const m = new maplibregl.Map({
        container: host.current,
        style: `https://tiles.openfreemap.org/styles/${p.theme === "dark" ? "dark" : "positron"}`,
        center: [100.8, 14.1],
        zoom: 4.6,
        minZoom: 3,
        maxZoom: 16,
        attributionControl: { compact: false },
        renderWorldCopies: false,
      });
      map.current = m;
      const recordView = () => {
        if (!host.current) return;
        host.current.dataset.mapZoom = m.getZoom().toFixed(2);
        const c = m.getCenter();
        host.current.dataset.mapCenter = `${c.lat.toFixed(4)},${c.lng.toFixed(4)}`;
      };
      recordView();
      m.on("moveend", recordView);
      m.setPadding({
        top: 0,
        left: 0,
        right: 0,
        bottom: host.current.clientWidth < 760 ? 240 : 0,
      });
      m.addControl(
        new maplibregl.NavigationControl({ showCompass: false }),
        "top-right",
      );
      m.on("load", () => {
        setStatus("ready");
        sync.current();
      });
      m.on("style.load", () => {
        styleReady.current = true;
        sync.current();
      });
      m.on("click", (e) =>
        current.current.onSelect(e.lngLat.lat, e.lngLat.lng),
      );
      m.on("error", (e) => {
        const sourceId = (e as typeof e & { sourceId?: string }).sourceId;
        if (
          sourceId === "ww-radar" ||
          sourceId === "ww-coverage" ||
          e.error?.message?.includes("Radar")
        )
          setRadarError(true);
        else if (!m.isStyleLoaded()) setStatus("error");
      });
      const obs = new ResizeObserver(() => {
        m.resize();
        m.setPadding({
          top: 0,
          left: 0,
          right: 0,
          bottom: (host.current?.clientWidth ?? 0) < 760 ? 240 : 0,
        });
      });
      obs.observe(host.current);
      return () => {
        obs.disconnect();
        m.remove();
        map.current = null;
      };
    } catch (error) {
      console.error("Map initialization failed", error);
      setStatus("error");
    }
  }, [retry]);
  useEffect(() => {
    const m = map.current;
    if (m) {
      styleReady.current = false;
      m.setStyle(
        `https://tiles.openfreemap.org/styles/${props.theme === "dark" ? "dark" : "positron"}`,
      );
    }
  }, [props.theme]);
  useEffect(() => {
    sync.current();
  }, [
    props.layers,
    props.frame,
    props.radar,
    props.opacity,
    props.temperature,
    props.aqi,
    props.location,
  ]);
  const initialLocation = useRef(props.location.id);
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (
      props.location.id !== initialLocation.current ||
      props.location.country === "CN"
    ) {
      m.flyTo({
        center: [props.location.longitude, props.location.latitude],
        zoom: 8,
        essential: false,
        duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? 0
          : 700,
      });
      initialLocation.current = props.location.id;
    }
  }, [props.location]);
  useEffect(() => {
    if (props.mapAction > 0)
      map.current?.flyTo({
        center: [props.location.longitude, props.location.latitude],
        zoom: 9,
        duration: 400,
        essential: false,
      });
  }, [props.mapAction, props.location]);
  return (
    <>
      <div
        ref={host}
        className="map-canvas"
        aria-label="แผนที่อากาศแบบโต้ตอบ"
        data-map-engine="maplibre"
        data-map-status={status}
        data-radar-frame={props.frame?.time}
        data-weather-layer={props.layers.weather}
        data-air-layer={props.layers.air}
      />
      {status !== "ready" && (
        <div className="map-status" role="status">
          {status === "loading" ? (
            "กำลังโหลดแผนที่…"
          ) : (
            <>
              โหลดแผนที่ไม่ได้{" "}
              <button
                onClick={() => {
                  setStatus("loading");
                  setRetry((v) => v + 1);
                }}
              >
                ลองใหม่
              </button>
            </>
          )}
        </div>
      )}
      {radarError && props.layers.radar && (
        <div className="tile-error" role="status">
          โหลดภาพเรดาร์บางส่วนไม่สำเร็จ ภาพว่างไม่ยืนยันว่าไม่มีฝน
        </div>
      )}
      <button
        className="map-locate icon-button"
        title="ใช้ตำแหน่งของฉัน"
        aria-label="ใช้ตำแหน่งของฉัน"
        onClick={props.onLocate}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="m3 10 18-7-7 18-3-8z" />
        </svg>
      </button>
    </>
  );
}
