# Weather Watch 0.1
Thai-first personal weather intelligence, nationwide Thailand + Xi’an/Chengdu/Chongqing. Work Order 001 + owner amendment: GitHub push authorized only to tonnutkit-dev/Weather-watch. No public deployment.

## Run
Node >=22.12 (verified with Node 24), npm.
```
npm ci
npm run dev
```
Open the Vite local URL on your own computer. A localhost URL in the Work container is not reachable from an iPhone; no public preview is authorized here.
```
npm run typecheck
npm test
npm run build
npm run verify:data
npm run test:e2e
```
Browser spec requires Playwright browsers (`npx playwright install chromium`) on your own machine. Provider audit makes bounded live requests and writes evidence. Tests use explicitly labeled fixtures and never inject them into live views.

## Architecture / capabilities
React/TypeScript/Vite, Query adapters, lazy MapLibre, Leaflet fallback when WebGL is unavailable, CSS tokens/local Thai font. Current model weather, hourly/16-day forecast, separate radar history, modeled PM/US AQI, 77 province shortcuts, remote Thai search, three China cities, local favorites, optional geolocation, system/light/dark, mobile situation sheet. Read PRODUCT, DESIGN, ARCHITECTURE, DATA_SOURCES, REGIONS and QA_REPORT.

## Trust and limitations
No guaranteed station observation; model fields labeled. RainViewer coverage varies, blank is not dry, max raster zoom7. Flood/official alerts/river levels display honest unavailable states and official links pending credentials/rights/schema validation. AQ ~45km model, not roadside sensor. Thai remote search may omit places. No public portfolio licensing assumption: Open-Meteo terms consider promotional use commercial. No secrets/database/accounts. Future authenticated adapters need a server-side Worker; no secret in VITE_*. Actual verification evidence and known gaps are reported in DATA_VERIFICATION_REPORT.md and QA_REPORT.md.

## Map compatibility
MapLibre + OpenFreeMap is the primary renderer. Devices without WebGL use a lazy Leaflet 2D map with OpenTopoMap raster tiles and the same real radar/point overlays. Dark fallback basemap uses CSS color transformation; radar colors are preserved. OpenTopoMap credit and CC BY-SA 3.0 license remain visible. Public services have no SLA. The cloud Chrome used for QA disabled WebGL: fallback rendering was tested; primary MapLibre runtime and iPhone/Safari remain NOT TESTED.
