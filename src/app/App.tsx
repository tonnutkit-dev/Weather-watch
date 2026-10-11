import { lazy, Suspense, useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CloudSun,
  Search,
  Settings2,
  ChevronDown,
  MapPin,
  Layers,
  CloudRain,
  Leaf,
  LocateFixed,
  Star,
  Info,
  RefreshCw,
  Sun,
  Moon,
  Monitor,
  Check,
} from "lucide-react";
import type { Location } from "../locations/types";
import { chinaCities } from "../locations/types";
import { provinces, defaultLocation } from "../locations/provinces";
import {
  locationFromCoordinates,
  isSupportedLocation,
} from "../locations/region";
import type { MapLayers } from "../maps/MapCanvas";
import { getWeather } from "../providers/weather";
import { getAirQuality } from "../providers/airQuality";
import { getRadar, nextFrame } from "../providers/radar";
import { useTheme } from "../shared/theme";
import { readFavorites, saveFavorites } from "../shared/preferences";
import { LocationSearch } from "../components/LocationSearch";
import { SituationPanel } from "../components/SituationPanel";
import type { SheetState } from "../components/SituationPanel";
import { RadarControls } from "../components/RadarControls";
import { Modal } from "../components/Modal";
import { MapBoundary } from "../components/MapBoundary";
import { freshness } from "../reliability/freshness";
import { useSourceClock } from "../reliability/useFreshness";
import { recordRefresh, useBoundedRefresh } from "../reliability/useRefresh";
import { radarRequestKey, type RadarPresentation } from "../radar/presentation";
import { value } from "../shared/time";
const MapCanvas = lazy(() => import("../maps/MapCanvas"));
function initialLocation() {
  try {
    const id = localStorage.getItem("ww-last-preset");
    return (
      [...provinces, ...chinaCities].find((p) => p.id === id) || defaultLocation
    );
  } catch {
    return defaultLocation;
  }
}
export default function App() {
  const theme = useTheme();
  const [radarPresentation, setRadarPresentation] = useState<RadarPresentation>();
  const reportRadar = useCallback((state: RadarPresentation) => setRadarPresentation(state), []);
  const [location, setLocation] = useState<Location>(initialLocation),
    [favorites, setFavorites] = useState(() =>
      readFavorites().filter(isSupportedLocation),
    );
  const [modal, setModal] = useState<
      "search" | "settings" | "layers" | "info" | null
    >(null),
    [sheet, setSheet] = useState<SheetState>("collapsed");
  const [view, setView] = useState<"overview" | "forecast" | "environment">(
      "overview",
    ),
    [layers, setLayers] = useState<MapLayers>({
      radar: true,
      weather: !window.matchMedia("(max-width: 759px)").matches,
      air: false,
      coverage: false,
    });
  const [opacity, setOpacity] = useState(0.65),
    [index, setIndex] = useState(0),
    [playing, setPlaying] = useState(false),
    [message, setMessage] = useState(""),
    [geoLoading, setGeoLoading] = useState(false),
    [mapAction, setMapAction] = useState(0),
    [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    if (
      sheet !== "collapsed" &&
      window.matchMedia("(max-width: 759px)").matches
    )
      setPlaying(false);
  }, [sheet]);
  const weatherKey = ["weather", location.country, location.latitude, location.longitude, location.timezone];
  const airKey = ["air", location.country, location.latitude, location.longitude, location.timezone];
  const weather = useQuery({
    queryKey: weatherKey,
    queryFn: ({ signal }) => { recordRefresh(weatherKey); return getWeather(location, signal); },
    staleTime: 600000, refetchOnReconnect: false, refetchOnWindowFocus: false,
  });
  const air = useQuery({
    queryKey: airKey,
    queryFn: ({ signal }) => { recordRefresh(airKey); return getAirQuality(location, signal); },
    staleTime: 600000, refetchOnReconnect: false, refetchOnWindowFocus: false,
  });
  const refresh = useBoundedRefresh(weatherKey, airKey);
  const now = useSourceClock(weather.data?.current.time, air.data?.time);
  const weatherFreshness = freshness(weather.data?.current.time, weather.data?.currentMeta.fetchedAt,
    'weather', weather.isFetching, weather.isError, now);
  const airFreshness = freshness(air.data?.time, air.data?.meta.fetchedAt,
    'air', air.isFetching, air.isError, now);
  const radar = useQuery({
    queryKey: ["radar"],
    queryFn: ({ signal }) => getRadar(signal),
    staleTime: 300000,
    enabled: layers.radar || layers.coverage,
  });
  useEffect(() => {
    setIndex(Math.max(0, (radar.data?.frames.length || 1) - 1));
    setPlaying(false);
  }, [radar.dataUpdatedAt, radar.data?.frames.length]);
  useEffect(() => {
    if (!playing || !layers.radar || !radar.data?.frames.length) return;
    const id = setInterval(() => {
      if (!document.hidden)
        setIndex((i) => nextFrame(i, radar.data!.frames.length));
    }, 15000);
    const hidden = () => {
      if (document.hidden) setPlaying(false);
    };
    document.addEventListener("visibilitychange", hidden);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [playing, layers.radar, radar.data]);
  useEffect(() => {
    const yes = () => setOnline(true),
      no = () => setOnline(false);
    window.addEventListener("online", yes);
    window.addEventListener("offline", no);
    return () => {
      window.removeEventListener("online", yes);
      window.removeEventListener("offline", no);
    };
  }, []);
  useEffect(() => {
    if (!message) return;
    const id = setTimeout(() => setMessage(""), 7000);
    return () => clearTimeout(id);
  }, [message]);
  const select = useCallback((l: Location) => {
    if (!isSupportedLocation(l)) {
      setMessage("ตำแหน่งนี้อยู่นอกพื้นที่ที่รองรับ");
      return;
    }
    setLocation(l);
    setPlaying(false);
    try {
      if (l.kind === "province" || l.kind === "city")
        localStorage.setItem("ww-last-preset", l.id);
      else localStorage.removeItem("ww-last-preset");
    } catch {
      /*optional preference*/
    }
  }, []);
  const locate = useCallback(() => {
    if (!navigator.geolocation) {
      setMessage(
        "เบราว์เซอร์นี้ไม่รองรับตำแหน่ง กรุณาค้นหาหรือเลือกจุดบนแผนที่",
      );
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLoading(false);
        const l = locationFromCoordinates(
          pos.coords.latitude,
          pos.coords.longitude,
          "geolocation",
        );
        if (l) {
          select(l);
          setMapAction((v) => v + 1);
        } else
          setMessage(
            "รองรับประเทศไทยและสามเมืองจีนเท่านั้น กรุณาเลือกจากรายการ",
          );
      },
      (err) => {
        setGeoLoading(false);
        setMessage(
          err.code === 1
            ? "ไม่ได้รับอนุญาตให้ใช้ตำแหน่ง เลือกจังหวัดหรือเมืองแทนได้"
            : "รับตำแหน่งไม่ได้ กรุณาค้นหาหรือเลือกจุดบนแผนที่",
        );
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }, [select]);
  const toggle = (key: keyof MapLayers) => {
    setLayers((v) => ({ ...v, [key]: !v[key] }));
    if (key === "radar") setPlaying(false);
  };
  const favorite = favorites.some((f) => f.id === location.id);
  const save = () => {
    const list = favorite
      ? favorites.filter((f) => f.id !== location.id)
      : [...favorites, location].slice(-20);
    setFavorites(list);
    saveFavorites(list);
    setMessage(
      favorite ? "ลบตำแหน่งโปรดแล้ว" : "บันทึกตำแหน่งนี้ไว้ในอุปกรณ์แล้ว",
    );
  };
  const onView = (v: typeof view) => {
    setView(v);
    if (window.innerWidth < 760) setSheet("expanded");
  };
  const w = weatherFreshness.assessmentAllowed ? weather.data : undefined,
    a = airFreshness.assessmentAllowed ? air.data : undefined;
  const presentationKey = radarRequestKey({ frame: radar.data?.frames[index], location, theme: theme.theme, layers });
  const presentation = radarPresentation?.key === presentationKey ? radarPresentation : undefined;
  return (
    <div className={`app sheet-state-${sheet}`}>
      <header className="app-header">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setView("overview");
          }}
          aria-label="Weather Watch หน้าแรก"
        >
          <span className="brand-icon">
            <CloudSun size={27} strokeWidth={1.7} />
          </span>
          <span>
            <strong>Weather Watch</strong>
            <small>รู้ทันอากาศรอบตัว</small>
          </span>
        </a>
        <nav className="header-nav" aria-label="มุมมอง">
          {(
            [
              ["overview", "แผนที่อากาศ"],
              ["forecast", "พยากรณ์"],
              ["environment", "สิ่งแวดล้อม"],
            ] as const
          ).map(([id, text]) => (
            <button
              key={id}
              className={view === id ? "active" : ""}
              onClick={() => onView(id)}
            >
              {text}
            </button>
          ))}
        </nav>
        <div className="header-actions">
          <button
            className="search-button"
            aria-label="ค้นหาตำแหน่ง"
            onClick={() => setModal("search")}
          >
            <Search size={17} />
            <span>ค้นหาจังหวัดหรือสถานที่</span>
            <kbd>⌕</kbd>
          </button>
          <button
            className="icon-button"
            title="ตำแหน่งโปรด"
            aria-label="ตำแหน่งโปรด"
            onClick={() => setModal("search")}
          >
            <Star size={19} />
          </button>
          <button
            className="icon-button"
            title="การแสดงผลและตั้งค่า"
            aria-label="การแสดงผลและตั้งค่า"
            onClick={() => setModal("settings")}
          >
            <Settings2 size={20} />
          </button>
        </div>
      </header>
      <div className="region-bar">
        <button
          className={`region-chip ${location.country === "TH" ? "selected" : ""}`}
          onClick={() => {
            if (location.country !== "TH") select(defaultLocation);
            else setModal("search");
          }}
        >
          <span>🇹🇭</span> ประเทศไทย <small>77 จังหวัด</small>
          <ChevronDown size={14} />
        </button>
        <span className="region-divider" />
        <span className="secondary-label">เมืองเสริม</span>
        {chinaCities.map((c) => (
          <button
            key={c.id}
            className={`city-chip ${location.id === c.id ? "selected" : ""}`}
            onClick={() => select(c)}
          >
            <span>🇨🇳</span>
            {c.name}
          </button>
        ))}
        <span className="region-note">
          <span className="live-dot" /> ข้อมูลจากแหล่งจริง{" "}
          <button
            className="icon-button"
            aria-label="เกี่ยวกับข้อมูล"
            onClick={() => setModal("info")}
          >
            <Info size={15} />
          </button>
        </span>
      </div>
      <main className="workspace">
        <section className="map-section" aria-label="แผนที่และเรดาร์ฝน">
          <MapBoundary>
            <Suspense
              fallback={<div className="map-status">กำลังเตรียมแผนที่…</div>}
            >
              <MapCanvas
                location={location}
                onRadarPresentation={reportRadar}
                theme={theme.theme}
                layers={layers}
                radar={radar.data}
                frame={radar.data?.frames[index]}
                opacity={opacity}
                temperature={w?.current.temperature ?? null}
                aqi={a?.aqi ?? null}
                onLocate={locate}
                mapAction={mapAction}
                onSelect={(lat, lon) => {
                  const l = locationFromCoordinates(lat, lon);
                  if (l) select(l);
                  else
                    setMessage(
                      "แตะตำแหน่งในประเทศไทย หรือเลือกสามเมืองจีนจากด้านบน",
                    );
                }}
              />
            </Suspense>
          </MapBoundary>
          <div className="map-heading">
            <span className="eyebrow">YOUR WEATHER, IN CONTEXT</span>
            <button className="map-location" onClick={() => setModal("search")}>
              <MapPin size={18} />
              <span>{location.name}</span>
              <ChevronDown size={16} />
            </button>
            <small>
              {location.country === "TH" ? "ประเทศไทย" : "ประเทศจีน"} ·
              เลือกจุดบนแผนที่เพื่อดูอากาศ
            </small>
          </div>
          <div className="map-layer-chips" aria-label="ชั้นข้อมูลแผนที่">
            <button
              className={layers.radar ? "selected" : ""}
              aria-pressed={layers.radar}
              onClick={() => toggle("radar")}
            >
              <CloudRain size={16} /> เรดาร์ฝน
            </button>
            <button
              className={layers.air ? "selected" : ""}
              aria-pressed={layers.air}
              onClick={() => toggle("air")}
            >
              <Leaf size={16} /> AQI จุดนี้
            </button>
            <button
              aria-label="ชั้นข้อมูลเพิ่มเติม"
              onClick={() => setModal("layers")}
            >
              <Layers size={17} />
            </button>
          </div>
          <div
            className="map-toolbar"
            role="group"
            aria-label="เครื่องมือแผนที่"
          >
            <button
              className="mobile-layer-button icon-button"
              aria-label="เลือกชั้นข้อมูล"
              onClick={() => setModal("layers")}
            >
              <Layers size={20} />
            </button>
            <button
              className="map-recenter icon-button"
              title="กลับไปยังตำแหน่งที่เลือก"
              aria-label="กลับไปยังตำแหน่งที่เลือก"
              onClick={() => setMapAction((v) => v + 1)}
            >
              <LocateFixed size={20} />
            </button>
          </div>
          {layers.radar && (
            <>
              <RadarControls
                radar={radar.data}
                presentation={presentation}
                index={index}
                playing={playing}
                onIndex={(n) => {
                  setPlaying(false);
                  setIndex(n);
                }}
                onPlay={() => setPlaying((v) => !v)}
                onRefresh={() => {
                  setPlaying(false);
                  void radar.refetch();
                }}
                onHide={() => {
                  setPlaying(false);
                  setLayers((v) => ({ ...v, radar: false }));
                }}
                timezone={location.timezone}
                loading={radar.isFetching}
                error={radar.isError}
                country={location.country}
              />
            </>
          )}
          {layers.air && (
            <div className="point-notice">
              US AQI {value(a?.aqi)} · ค่าจากแบบจำลองที่จุดเลือก
              ไม่ใช่แผนที่ความเข้มข้น
            </div>
          )}
          {location.country === "CN" && layers.radar && (
            <div className="china-radar-note">
              เรดาร์จีนอาจไม่มีข้อมูลครอบคลุม
            </div>
          )}
        </section>
        <SituationPanel
          location={location}
          now={now}
          weather={weather}
          air={air}
          sheet={sheet}
          onSheet={setSheet}
          favorite={favorite}
          onFavorite={save}
          onRefresh={() => refresh()}
          view={view}
          onView={onView}
        />
      </main>
      {!online && (
        <div className="offline-banner" role="status">
          ไม่มีการเชื่อมต่ออินเทอร์เน็ต ข้อมูลที่ดึงแล้วอาจไม่เป็นปัจจุบัน{" "}
          <button onClick={() => refresh()}>ลองใหม่</button>
        </div>
      )}
      {(message || geoLoading) && (
        <div className="toast" role="status">
          {geoLoading ? "กำลังขอตำแหน่งของคุณ…" : message}
        </div>
      )}
      {modal === "search" && (
        <LocationSearch
          onClose={() => setModal(null)}
          onSelect={select}
          favorites={favorites}
          onLocate={locate}
        />
      )}
      {modal === "settings" && (
        <Modal title="การแสดงผล" onClose={() => setModal(null)}>
          <p className="muted">เลือกโหมดที่สบายตาสำหรับคุณ</p>
          <div className="appearance-options">
            {(
              [
                ["system", "ตามอุปกรณ์", Monitor],
                ["light", "สว่าง", Sun],
                ["dark", "มืด", Moon],
              ] as const
            ).map(([pref, label, Icon]) => (
              <button
                key={pref}
                aria-pressed={theme.appearance === pref}
                className={theme.appearance === pref ? "selected" : ""}
                onClick={() => theme.setAppearance(pref)}
              >
                <Icon size={23} />
                {label}
                {theme.appearance === pref && <Check size={15} />}
              </button>
            ))}
          </div>
          <p className="settings-note">
            โหมดตามอุปกรณ์จะติดตามการเปลี่ยนธีมของระบบ
            ไม่มีการเปลี่ยนตามเวลาที่แอปกำหนดเอง
          </p>
          <button
            className="location-use"
            onClick={() => {
              refresh();
              setModal(null);
            }}
          >
            <RefreshCw size={16} /> รีเฟรชอากาศและคุณภาพอากาศ
          </button>
          <button className="text-button" onClick={() => setModal("info")}>
            <Info size={16} /> แหล่งข้อมูลและข้อจำกัด
          </button>
        </Modal>
      )}
      {modal === "layers" && (
        <Modal title="ชั้นข้อมูลแผนที่" onClose={() => setModal(null)}>
          <div className="layer-list">
            {(
              [
                [
                  "radar",
                  "เรดาร์ย้อนหลัง",
                  "RainViewer · ภาพจริงที่มีให้ ไม่ใช่พยากรณ์",
                ],
                [
                  "weather",
                  "อุณหภูมิที่จุดเลือก",
                  "Open-Meteo · ค่าจากแบบจำลอง",
                ],
                [
                  "air",
                  "AQI จุดนี้",
                  "CAMS · US AQI จากแบบจำลอง ไม่ใช่ heatmap",
                ],
                [
                  "coverage",
                  "พื้นที่ครอบคลุมเรดาร์",
                  "บริเวณสีเข้มคือพื้นที่นอก coverage ที่ผู้ให้บริการระบุ",
                ],
              ] as const
            ).map(([key, label, desc]) => (
              <label key={key}>
                <span>
                  <strong>{label}</strong>
                  <small>{desc}</small>
                </span>
                <input
                  type="checkbox"
                  checked={layers[key]}
                  onChange={() => toggle(key)}
                />
              </label>
            ))}
            <label className="disabled-layer">
              <span>
                <strong>พื้นที่น้ำท่วม</strong>
                <small>ยังไม่เชื่อมต่อข้อมูลที่ตรวจสอบแล้ว</small>
              </span>
              <input type="checkbox" disabled />
            </label>
          </div>
          <label className="opacity-control">
            ความทึบเรดาร์ <strong>{Math.round(opacity * 100)}%</strong>
            <input
              aria-label="ความทึบเรดาร์"
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
            />
          </label>
          <p className="micro">
            จีบนิ้วเพื่อซูม · คีย์บอร์ด + / − ซูมแผนที่ได้
          </p>
          <p className="micro">
            ไทล์เรดาร์ละเอียดสูงสุด zoom 7 · ขยายแผนที่ได้
            แต่ไม่ได้เพิ่มความละเอียดข้อมูล
          </p>
        </Modal>
      )}
      {modal === "info" && (
        <Modal title="ข้อมูลที่ไว้วางใจได้" onClose={() => setModal(null)}>
          <div className="trust-info">
            <p>
              Weather Watch แยกข้อมูลจากแบบจำลอง ภาพเรดาร์ย้อนหลัง
              และประกาศทางการอย่างชัดเจน
            </p>
            <h3>อากาศ / พยากรณ์</h3>
            <p>
              <a
                href="https://open-meteo.com/"
                target="_blank"
                rel="noreferrer"
              >
                Open-Meteo
              </a>{" "}
              · CC BY 4.0 · ค่าปัจจุบันเป็นแบบจำลอง พยากรณ์อาจเปลี่ยนแปลง
            </p>
            <h3>คุณภาพอากาศ</h3>
            <p>
              <a
                href="https://atmosphere.copernicus.eu/"
                target="_blank"
                rel="noreferrer"
              >
                CAMS
              </a>{" "}
              ผ่าน Open-Meteo · กริดประมาณ 45 กม. · US AQI ไม่ใช่ AQI
              ไทยหรือสถานีตรวจวัด
            </p>
            <h3>เรดาร์</h3>
            <p>
              <a
                href="https://www.rainviewer.com/"
                target="_blank"
                rel="noreferrer"
              >
                RainViewer
              </a>{" "}
              · ย้อนหลังราว 2 ชั่วโมง · เวลาบนแถบคือเวลาสร้างภาพรวม
              สถานีแต่ละแห่งอาจวัดคนละเวลา ภาพว่างไม่ยืนยันว่าไม่มีฝน
            </p>
            <h3>น้ำท่วม / ประกาศ</h3>
            <p>
              ยังไม่ได้เชื่อมต่อข้อมูลอัตโนมัติ
              การประเมินของแอปไม่ยืนยันความปลอดภัย และไม่ทดแทนประกาศทางการ
            </p>
            <h3>แผนที่และตำแหน่ง</h3>
            <p>
              OpenFreeMap · OpenMapTiles · OpenStreetMap contributors ·
              แผนที่สำรอง OpenTopoMap/SRTM (CC BY-SA 3.0, ปรับสีตามธีม) · WGS84
              · ค้นหาสถานที่จาก <a href="https://www.geonames.org/">GeoNames</a>{" "}
              อาจไม่ครบทุกอำเภอ
            </p>
            <p className="micro">
              Prototype 0.2 · ใช้ส่วนตัว · ไม่มีบัญชีผู้ใช้และไม่มีการบันทึก GPS
              อัตโนมัติ
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
