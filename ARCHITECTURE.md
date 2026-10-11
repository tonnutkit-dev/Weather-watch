# Architecture
React 19 + strict TypeScript + Vite. MapLibre GL JS lazy-loaded. A WebGL2 capability check selects lazy Leaflet 2D fallback without changing provider/data state. TanStack Query bounded in-memory cache; no DB or accounts. CSS token system. WGS84 canonical [longitude, latitude], never GCJ-02.

## Domain boundaries
app: orchestration, location/layers/view. components: weather panel, forecast, search, theme/dialogs. design-system: tokens/fonts. maps: lifetime of MapLibre, style changes, GeoJSON point layers and raster radar. providers: HTTP adapters and schema guards. weather/air-quality/radar: typed normalized outputs and provenance. locations: all-province gazetteer and Thai-only remote search, China presets. flood/alerts: separate future contracts and explicit unavailable results. shared: time, preferences, finite/null format and interpretation. tests: logic/component regressions.

## Data and concurrency
Independent query keys include region + latitude/longitude + timezone. Clear previous-location data while loading; no placeholder from another city. Pass AbortSignal through requests; 12s timeout, one retry only for retryable network/5xx errors with bounded exponential backoff. Weather/AQ 10m stale time, radar 5m, geocoding 24h; no polling. Explicit refresh invalidates relevant queries. Radar frame selection/animation state never enters weather query. Pause on hidden page. Only one current radar source; maxzoom=7 raster overzoom, no prefetching all frames.

## Provenance
MODELED current weather and AQ; FORECAST hourly/daily; OBSERVED radar imagery with frame generation `issuedAt` and `observedAt=null` because individual radars have mixed times; OFFICIAL_ALERT only from official notices; INTERPRETATION separate. Preserve timestamps and nullable fields/values. Requested point and provider grid point both retained. Epoch UTC requested (`timeformat=unixtime`); Intl uses selected location timezone. Daily epoch represents local calendar boundaries as supplied; format dates using provider offset added to epoch for Open-Meteo daily unixtime (see tests). Never invent a model run timestamp.

## Security and future hosting
No secrets. Public endpoints configurable using .env.example; VITE_* never contains private credentials. Future GISTDA/QWeather JWT keys belong only in a Cloudflare Worker secret with explicit upstream allowlist, rate limiting, caching, timeout and coordinate validation. Static Vite build suitable for Pages; authenticated Worker deployment is not part of 001. Provider origin/coordinate validation at adapters, Radar response host restricted to rainviewer.com and frame path validated. No raw HTML from providers. localStorage exceptions tolerated; current GPS transient; favorites only after explicit save.

## Error containment
Weather/AQ/radar/map fail independently. A weather failure has retry and retains selected location without stale numbers. No radar metadata, stale frame or tile fetch failure = explicit limitation. P1 returns unavailable (no HTTP polling) so it cannot break map. Unknown verdict when critical modeled inputs missing/stale; never declares safety. Official alerts unknown independently even when weather model complete.

## Testing
Vitest normalization/nulls/time/provenance/thresholds/radar/regions/cache/theme. Testing Library state/error regressions. Playwright spec provided for local integration/browser checks when supported. Live audit Python script writes evidence only, never feeds production UI. Build type checks. Physical iPhone/Safari QA must be owner-run if unavailable here.

## Map fallback / tile budget
OpenFreeMap vector styles are the primary light/dark basemap. The fallback uses OpenTopoMap CC BY-SA 3.0 (attribution includes styling), with basemap-only CSS light/dark transformation. Radar is not filtered. RainViewer custom GL protocol and Leaflet TileLayer both use the same bounded fetch/cache: 80 upstream tile requests per rolling minute, 90 cached tiles for 5m, abortable queues and 12s fetch timeout. No persistent/offline tile download. Radar tiles 512px; Leaflet zoomOffset=-1 and maxNativeZoom=8 correspond to upstream z<=7. World overzoom changes display scale, never data resolution. MapBoundary isolates renderer errors. Cloud QA limitation: WebGL unavailable; primary engine remains device-validation pending.

Map engine chunks load only after capability detection; the 2D fallback does not download MapLibre/worker assets. Mobile camera focus is shifted up 120px (GL uses 240px bottom padding) so the selected point remains above collapsed sheet/radar controls.
