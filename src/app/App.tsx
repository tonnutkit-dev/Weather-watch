import { lazy, Suspense, useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, LocateFixed, Globe } from "lucide-react";
import type { Location } from "../locations/types";
import { chinaCities } from "../locations/types";
import { provinces, defaultLocation } from "../locations/provinces";
import { locationFromCoordinates, isSupportedLocation } from "../locations/region";
import type { MapLayers } from "../maps/MapCanvas";
import { getAirQuality } from "../providers/airQuality";
import { getRadar } from "../providers/radar";
import { useTheme } from "../shared/theme";
import { readFavorites, saveFavorites } from "../shared/preferences";
import { freshness } from "../reliability/freshness";
import { useSourceClock } from "../reliability/useFreshness";
import { recordRefresh, useBoundedRefresh, automaticRefreshAllowed } from "../reliability/useRefresh";
import { weatherQueryOptions } from "../reliability/weatherLoad";
import { radarRequestKey, RadarPresentationStore } from "../radar/presentation";
import { useRadarPlayback } from "../radar/usePlayback";
import { useI18n } from "../i18n/i18n";
import { useGlass } from "./glass";
import { createRetryGuard } from "./retryGuard";
import { MapBoundary } from "../components/MapBoundary";
import { NowChip } from "../components/NowChip";
import { LayerSwitcher, type Mode } from "../components/LayerSwitcher";
import { RadarTimeline } from "../components/RadarTimeline";
import { TempStrip, AirStrip } from "../components/ModeStrips";
import { DetailSheet } from "../components/DetailSheet";
import { SearchPanel } from "../components/SearchPanel";
import { SettingsPanel } from "../components/SettingsPanel";
const MapCanvas = lazy(() => import("../maps/MapCanvas"));

function initialLocation() {
  try {
    const id = localStorage.getItem("ww-last-preset");
    return [...provinces, ...chinaCities].find((p) => p.id === id) || defaultLocation;
  } catch {
    return defaultLocation;
  }
}
const layersFor = (mode: Mode): MapLayers => ({ radar: mode === "radar", weather: mode === "temp", air: mode === "air", coverage: false });
const RADAR_OPACITY = 0.72;

export default function App() {
  const queryClient = useQueryClient();
  const theme = useTheme();
  const glass = useGlass();
  const { t } = useI18n();
  const [radarPresentationStore] = useState(() => new RadarPresentationStore());
  const [location, setLocation] = useState<Location>(initialLocation);
  const [favorites, setFavorites] = useState(() => readFavorites().filter(isSupportedLocation));
  const [overlay, setOverlay] = useState<"search" | "settings" | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("radar");
  const layers = useMemo(() => layersFor(mode), [mode]);
  const [message, setMessage] = useState(""), [geoLoading, setGeoLoading] = useState(false);
  const [mapAction, setMapAction] = useState(0), [online, setOnline] = useState(navigator.onLine);

  const weatherKey = ["weather", location.country, location.latitude, location.longitude, location.timezone];
  const airKey = ["air", location.country, location.latitude, location.longitude, location.timezone];
  const weather = useQuery(weatherQueryOptions(queryClient, location, weatherKey));
  const air = useQuery({
    queryKey: airKey,
    queryFn: ({ signal }) => { recordRefresh(airKey); return getAirQuality(location, signal); },
    staleTime: 600000, refetchOnReconnect: false, refetchOnWindowFocus: false,
    retryOnMount: false, refetchOnMount: (query) => automaticRefreshAllowed(query.queryKey),
  });
  const refresh = useBoundedRefresh(weatherKey, airKey);
  const [retryGuard] = useState(() => createRetryGuard());
  // No data yet: bypass the 30 s manual cooldown, keep only the ~3 s anti-spam guard.
  const retryInitial = () => {
    if (!navigator.onLine || !retryGuard()) return;
    for (const [key, q] of [[weatherKey, weather], [airKey, air]] as const)
      if (q.isError && q.data === undefined && q.fetchStatus !== "fetching")
        void queryClient.refetchQueries({ queryKey: key, exact: true, type: "active" }, { cancelRefetch: false });
  };
  const now = useSourceClock(weather.data?.current.time, air.data?.time, weather.data?.currentMeta.fetchedAt, air.data?.meta.fetchedAt);
  const weatherFresh = freshness(weather.data?.current.time, weather.data?.currentMeta.fetchedAt, "weather", weather.isFetching, weather.isError, now);
  const airFresh = freshness(air.data?.time, air.data?.meta.fetchedAt, "air", air.isFetching, air.isError, now);
  const w = weatherFresh.assessmentAllowed ? weather.data : undefined;
  const a = airFresh.assessmentAllowed ? air.data : undefined;
  const radar = useQuery({ queryKey: ["radar"], queryFn: ({ signal }) => getRadar(signal), staleTime: 300000, enabled: layers.radar });
  const { index, playing, controller: playback } = useRadarPlayback(radar.data, layers.radar, radar.isFetching, radar.isError,
    (i) => radarRequestKey({ frame: radar.data?.frames[i], location, theme: theme.theme, layers }), radarPresentationStore);

  useEffect(() => {
    const yes = () => setOnline(true), no = () => setOnline(false);
    window.addEventListener("online", yes); window.addEventListener("offline", no);
    return () => { window.removeEventListener("online", yes); window.removeEventListener("offline", no); };
  }, []);
  useEffect(() => {
    if (!message) return;
    const id = setTimeout(() => setMessage(""), 6000);
    return () => clearTimeout(id);
  }, [message]);

  const select = useCallback((l: Location) => {
    if (!isSupportedLocation(l)) { setMessage(t("loc.unsupported")); return; }
    setLocation(l);
    playback.stop("location-changed");
    try {
      if (l.kind === "province" || l.kind === "city") localStorage.setItem("ww-last-preset", l.id);
      else localStorage.removeItem("ww-last-preset");
    } catch { /* optional preference */ }
  }, [playback, t]);
  const locate = useCallback(() => {
    if (!navigator.geolocation) { setMessage(t("loc.noGeo")); return; }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLoading(false);
        const l = locationFromCoordinates(pos.coords.latitude, pos.coords.longitude, "geolocation");
        if (l) { select(l); setMapAction((v) => v + 1); } else setMessage(t("loc.region"));
      },
      (err) => { setGeoLoading(false); setMessage(err.code === 1 ? t("loc.denied") : t("loc.failed")); },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }, [select, t]);
  const changeMode = (m: Mode) => { if (m !== "radar") playback.stop("layer-changed"); setMode(m); };
  const favorite = favorites.some((f) => f.id === location.id);
  const toggleFavorite = () => {
    const list = favorite ? favorites.filter((f) => f.id !== location.id) : [...favorites, location].slice(-20);
    setFavorites(list); saveFavorites(list);
    setMessage(favorite ? t("fav.removed") : t("fav.added"));
  };
  useEffect(() => {
    const dock = document.querySelector<HTMLElement>(".ww-dock");
    if (!dock || typeof ResizeObserver === "undefined") return;
    const set = () => document.documentElement.style.setProperty("--dock-h", `${dock.offsetHeight}px`);
    const ro = new ResizeObserver(set); ro.observe(dock); set();
    return () => ro.disconnect();
  }, []);
  const presentationKey = radarRequestKey({ frame: radar.data?.frames[index], location, theme: theme.theme, layers });

  return (
    <div className={`ww-app ${sheetOpen ? "sheet-open" : ""}`} data-mode={mode}>
      <main className="ww-map" aria-label={t("map.label")}>
        <MapBoundary>
          <Suspense fallback={<div className="map-status">…</div>}>
            <MapCanvas
              location={location}
              onRadarPresentation={radarPresentationStore.report}
              theme={theme.theme}
              layers={layers}
              radar={radar.data}
              frame={radar.data?.frames[index]}
              opacity={RADAR_OPACITY}
              temperature={w?.current.temperature ?? null}
              aqi={a?.aqi ?? null}
              onLocate={locate}
              mapAction={mapAction}
              onSelect={(lat, lon) => {
                const l = locationFromCoordinates(lat, lon);
                if (l) select(l); else setMessage(t("map.outside"));
              }}
            />
          </Suspense>
        </MapBoundary>
      </main>

      <div className="ww-top">
      <NowChip location={location} weather={weather} air={a} freshness={weatherFresh.state} now={now} onSearch={() => setOverlay("search")} onRefresh={() => refresh()} onRetry={retryInitial} />
      <div className="ww-fabs">
        <button className="ww-fab glass" aria-label={t("search.open")} onClick={() => setOverlay("search")}><Search size={19} /></button>
        <button className="ww-fab glass" aria-label={t("map.recenter")} onClick={() => setMapAction((v) => v + 1)}><LocateFixed size={19} /></button>
        <button className="ww-fab glass" aria-label={t("settings.open")} onClick={() => setOverlay("settings")}><Globe size={19} /></button>
      </div>
      </div>

      <div className="ww-dock" data-map-inset="bottom">
        {mode === "radar" && (
          <RadarTimeline
            radar={radar.data}
            presentationStore={radarPresentationStore}
            requestKey={presentationKey}
            index={index}
            playing={playing}
            playback={playback}
            onIndex={playback.scrub}
            onPlay={playback.toggle}
            onRefresh={() => { void radar.refetch(); }}
            timezone={location.timezone}
            loading={radar.isFetching}
            error={radar.isError}
            country={location.country}
          />
        )}
        {mode === "temp" && <TempStrip weather={w} timezone={location.timezone} now={now} />}
        {mode === "air" && <AirStrip air={a} />}
        <LayerSwitcher mode={mode} onMode={changeMode} />
      </div>

      <DetailSheet open={sheetOpen} onOpen={setSheetOpen} location={location} weather={w} air={a} now={now} favorite={favorite} onFavorite={toggleFavorite} />

      {!online && (
        <div className="ww-banner glass" role="status">
          {t("offline")} <button className="ww-btn" onClick={() => refresh()}>{t("now.retry")}</button>
        </div>
      )}
      {(message || geoLoading) && <div className="ww-toast glass" role="status">{geoLoading ? t("loc.locating") : message}</div>}
      {overlay === "search" && <SearchPanel onClose={() => setOverlay(null)} onSelect={select} favorites={favorites} onLocate={locate} />}
      {overlay === "settings" && (
        <SettingsPanel onClose={() => setOverlay(null)} appearance={theme.appearance} onAppearance={theme.setAppearance}
          glass={glass.pref} onGlass={glass.setPref} onRefresh={() => refresh()} />
      )}
    </div>
  );
}
