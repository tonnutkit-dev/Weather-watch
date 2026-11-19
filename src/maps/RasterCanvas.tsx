import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { MapProps } from "./MapCanvas";
import { radarTiles } from "../providers/radar";
import { RadarPresentationGate, radarRequestKey, registerRadarGate, taggedRadarUrl } from "../radar/presentation";
import { value } from "../shared/time";
import { mapInsets, observeMapLayout } from "./layout";
// Net vertical camera offset: bottom dock pushes the point up, the top chip pushes it down.
const netInset = (host: HTMLElement) => { const i = mapInsets(host); return i.bottom - i.top; };
import { BoundedRadarLayer } from "./BoundedRadarLayer";
import { useI18n } from "../i18n/i18n";
import { MapPinOff, TriangleAlert } from "lucide-react";
import { StateBlock } from "../components/StateBlock";
export default function RasterCanvas(p: MapProps) {
  const { t } = useI18n();
  const host = useRef<HTMLDivElement>(null),
    map = useRef<L.Map | null>(null),
    latest = useRef(p);
  latest.current = p;
  const gate = useRef<RadarPresentationGate | null>(null);
  if (!gate.current) gate.current = new RadarPresentationGate(state => {
    latest.current.onRadarPresentation?.(state);
    if (host.current) { host.current.dataset.radarPresentation = state.status; host.current.dataset.radarDisplayedFrame = ''; }
  });
  const registration = useRef<ReturnType<typeof registerRadarGate> | null>(null);
  const base = useRef<L.TileLayer | null>(null),
    radar = useRef<BoundedRadarLayer | null>(null),
    coverage = useRef<BoundedRadarLayer | null>(null);
  const point = useRef<L.CircleMarker | null>(null),
    weather = useRef<L.Marker | null>(null),
    air = useRef<L.CircleMarker | null>(null),
    airLabel = useRef<L.Marker | null>(null);
  const radarFailed = useRef(false);
  const [status, setStatus] = useState("loading"),
    [radarStatus, setRadarStatus] = useState("loading"),
    [tileError, setTileError] = useState(false);
  const initial = useRef(p.location.id);
  useEffect(() => {
    if (!host.current) return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const m = L.map(host.current, {
      center: [p.location.latitude, p.location.longitude],
      zoom: 6,
      minZoom: 3,
      maxZoom: 14,
      zoomControl: false,
      attributionControl: true,
      zoomAnimation: !reduced,
      fadeAnimation: false,
      markerZoomAnimation: !reduced,
      scrollWheelZoom: true,
    });
    map.current = m;
    registration.current = registerRadarGate(gate.current!);
    m.on('movestart zoomstart resize', () => gate.current!.viewport());
    m.on('moveend zoomend', () => { if (!radar.current?.isLoading() && !document.hidden)
      gate.current!.settle('leaflet-load;current-generation-image-decode;viewport-pixels-unverified'); });
    const visibility = () => {
      gate.current!.suspend();
      if (!document.hidden) {
        const p = latest.current;
        gate.current!.begin(radarRequestKey(p), p.frame?.time ?? null, p.layers.radar && !!p.frame);
        if (p.radar && p.frame && radar.current) radar.current.setUrl(taggedRadarUrl(radarTiles(p.radar, p.frame), registration.current!.id, gate.current!.generation));
      }
    };
    document.addEventListener('visibilitychange', visibility);

    m.attributionControl.setPrefix(false);
    base.current = L.tileLayer(
      "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
      {
        maxNativeZoom: 14,
        maxZoom: 14,
        subdomains: "abc",
        className: "ww-basemap",
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, SRTM · <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC BY-SA</a>, styled)',
      },
    ).addTo(m);
    base.current.on("tileload", () => setStatus("ready"));
    base.current.on("tileerror", () => setTileError(true));
    m.createPane("radar");
    m.getPane("radar")!.style.zIndex = "350";
    m.getPane("radar")!.style.pointerEvents = "none";
    m.createPane("coverage");
    m.getPane("coverage")!.style.zIndex = "360";
    m.getPane("coverage")!.style.pointerEvents = "none";
    m.on("click", (e: L.LeafletMouseEvent) =>
      latest.current.onSelect(e.latlng.lat, e.latlng.lng),
    );
    m.on("moveend", () => {
      const h = host.current;
      if (h) {
        h.dataset.zoom = String(m.getZoom());
        h.dataset.center = `${m.getCenter().lat.toFixed(4)},${m.getCenter().lng.toFixed(4)}`;
      }
    });
    let previousInset = 0;
    const disconnectLayout = observeMapLayout(host.current, () => {
      m.invalidateSize({ pan: false });
      const inset = host.current ? netInset(host.current) : 0;
      if (inset !== previousInset)
        m.panBy([0, (inset - previousInset) / 2], { animate: false });
      previousInset = inset;
    });
    const deadline = setTimeout(
      () => setStatus((s) => (s === "loading" ? "error" : s)),
      15000,
    );
    return () => {
      document.removeEventListener('visibilitychange', visibility);
      gate.current!.suspend(); registration.current?.dispose(); registration.current = null;
      clearTimeout(deadline);
      disconnectLayout();
      m.remove();
      map.current = null;
      radar.current = null;
      coverage.current = null;
      weather.current = null;
      air.current = null;
      airLabel.current = null;
      point.current = null;
    };
  }, []);
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const latlng: L.LatLngExpression = [
      p.location.latitude,
      p.location.longitude,
    ];
    if (!point.current)
      point.current = L.circleMarker(latlng, {
        radius: 7,
        color: "#fff",
        weight: 3,
        fillColor: "#1769ee",
        fillOpacity: 1,
      }).addTo(m);
    else point.current.setLatLng(latlng);
    const weatherIcon = L.divIcon({
      className: "point-weather",
      html: `<span>${value(p.temperature)}°</span>`,
      iconSize: [65, 35],
      iconAnchor: [32, 55],
    });
    if (!weather.current)
      weather.current = L.marker(latlng, {
        icon: weatherIcon,
        interactive: false,
      });
    else weather.current.setLatLng(latlng).setIcon(weatherIcon);
    if (p.layers.weather) weather.current.addTo(m);
    else weather.current.remove();
    const color =
      p.aqi === null
        ? "#8696aa"
        : p.aqi <= 50
          ? "#247b65"
          : p.aqi <= 100
            ? "#a56b12"
            : "#bd4c4c";
    if (!air.current)
      air.current = L.circleMarker(latlng, {
        radius: 36,
        color,
        weight: 2,
        fillColor: color,
        fillOpacity: 0.15,
        interactive: false,
      });
    else air.current.setLatLng(latlng).setStyle({ color, fillColor: color });
    const airIcon = L.divIcon({
      className: "point-air",
      html: `<span>US AQI ${value(p.aqi)}</span>`,
      iconSize: [100, 25],
      iconAnchor: [50, -28],
    });
    if (!airLabel.current)
      airLabel.current = L.marker(latlng, {
        icon: airIcon,
        interactive: false,
      });
    else airLabel.current.setLatLng(latlng).setIcon(airIcon);
    if (p.layers.air) {
      air.current.addTo(m);
      airLabel.current.addTo(m);
    } else {
      air.current.remove();
      airLabel.current.remove();
    }
  }, [p.location, p.temperature, p.aqi, p.layers.weather, p.layers.air]);
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (initial.current !== p.location.id) {
      m.setView([p.location.latitude, p.location.longitude], Math.max(m.getZoom(), 7), {
        animate:
          !window.matchMedia("(max-width: 759px)").matches &&
          !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      });
      if (host.current)
        m.panBy([0, netInset(host.current) / 2], { animate: false });
      initial.current = p.location.id;
    }
  }, [p.location]);
  useEffect(() => {
    if (p.mapAction > 0) {
      map.current?.setView([p.location.latitude, p.location.longitude], 8, {
        animate:
          !window.matchMedia("(max-width: 759px)").matches &&
          !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      });
      if (host.current)
        map.current?.panBy([0, netInset(host.current) / 2], {
          animate: false,
        });
    }
  }, [p.mapAction, p.location]);
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    gate.current!.begin(radarRequestKey(p), p.frame?.time ?? null, p.layers.radar && !!p.frame && !document.hidden);
    if (!p.radar || !p.frame) return;
    const frameUrl = taggedRadarUrl(radarTiles(p.radar, p.frame), registration.current!.id, gate.current!.generation);
    if (!radar.current) {
      radar.current = new BoundedRadarLayer(frameUrl, {
        pane: "radar",
        tileSize: 512,
        zoomOffset: -1,
        minZoom: 3,
        maxNativeZoom: 8,
        maxZoom: 14,
        opacity: p.opacity,
        keepBuffer: 0,
        className: "ww-radar-tile",
        attribution:
          'Weather data by <a href="https://www.rainviewer.com/">RainViewer</a>',
      });
      radar.current.on("loading", () => {
        radarFailed.current = false;
        setRadarStatus("loading");
      });
      radar.current.on("load", () => {
        setRadarStatus(radarFailed.current ? "error" : "ready");
        requestAnimationFrame(() => { if (!document.hidden) gate.current!.settle('leaflet-load;current-generation-image-decode;viewport-pixels-unverified'); });
      });
      radar.current.on("tileerror", () => {
        radarFailed.current = true;
        setRadarStatus("error");
      });
    } else if (radar.current.getTileUrl({ x: 0, y: 0, z: 8 } as L.Coords) !==
      frameUrl.replace('{z}', '7').replace('{x}', '0').replace('{y}', '0')) {
      radar.current.setUrl(frameUrl);
      setRadarStatus("loading");
    }
    radar.current.setOpacity(p.opacity);
    if (p.layers.radar) radar.current.addTo(m);
    else radar.current.remove();
    if (!coverage.current)
      coverage.current = new BoundedRadarLayer(
        `${p.radar.host}/v2/coverage/0/512/{z}/{x}/{y}/0/0_0.png`,
        {
          pane: "coverage",
          tileSize: 512,
          zoomOffset: -1,
          maxNativeZoom: 8,
          maxZoom: 14,
          opacity: 0.24,
          keepBuffer: 0,
          className: "ww-coverage-tile",
        },
      );
    if (p.layers.coverage) coverage.current.addTo(m);
    else coverage.current.remove();
  }, [p.radar, p.frame, p.opacity, p.layers.radar, p.layers.coverage, p.location, p.theme]);
  return (
    <>
      <div
        ref={host}
        className="map-canvas raster-map"
        data-theme={p.theme}
        aria-label={`${t("map.label")} 2D`}
        data-map-engine="leaflet-fallback"
        data-map-status={status}
        data-radar-status={radarStatus}
        data-radar-frame={p.frame?.time}
        data-weather-layer={p.layers.weather}
        data-air-layer={p.layers.air}
      />
      {status === "error" && (
        <div className="map-status">
          <StateBlock icon={MapPinOff} tone="bad" compact role="alert" title={t("map.error")} body={t("map.errorBody")}
            action={<button className="ww-btn" onClick={() => window.location.reload()}>{t("map.reload")}</button>} />
        </div>
      )}
      {tileError && <div className="basemap-note" role="status"><TriangleAlert size={14} aria-hidden="true" /> {t("map.tileError")}</div>}
      {radarStatus === "error" && p.layers.radar && (
        <div className="tile-error"><TriangleAlert size={14} aria-hidden="true" /> {t("map.radarTileError")}</div>
      )}
      <span className="fallback-note">{t("map.fallback")}</span>
    </>
  );
}
