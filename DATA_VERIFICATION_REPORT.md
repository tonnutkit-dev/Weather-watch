# Data verification report — 11 October 2026

Fresh documentation + actual bounded network requests. Raw dated responses and provider-results.json are evidence, not a product data cache. Browser renders independently fetched live APIs. HTTP success does not validate physical accuracy, flood absence or official warning status.

## Executed requests

| Check | HTTP | Retrieved at UTC | Evidence classification |
|---|---|---|---|
| weather-bangkok | 200 | 2026-10-11T00:32:31.632351+00:00 | VERIFIED request/response |
| air-bangkok | 200 | 2026-10-11T00:32:31.633210+00:00 | VERIFIED request/response |
| weather-chiang-mai | 200 | 2026-10-11T00:32:31.633656+00:00 | VERIFIED request/response |
| air-chiang-mai | 200 | 2026-10-11T00:32:31.634044+00:00 | VERIFIED request/response |
| weather-phuket | 200 | 2026-10-11T00:32:36.318204+00:00 | VERIFIED request/response |
| air-phuket | 200 | 2026-10-11T00:32:36.559288+00:00 | VERIFIED request/response |
| weather-xian | 200 | 2026-10-11T00:32:40.107613+00:00 | VERIFIED request/response |
| air-xian | 200 | 2026-10-11T00:32:40.382004+00:00 | VERIFIED request/response |
| weather-chengdu | 200 | 2026-10-11T00:32:40.404336+00:00 | VERIFIED request/response |
| air-chengdu | 200 | 2026-10-11T00:32:42.249835+00:00 | VERIFIED request/response |
| weather-chongqing | 200 | 2026-10-11T00:32:42.431554+00:00 | VERIFIED request/response |
| air-chongqing | 200 | 2026-10-11T00:32:49.397889+00:00 | VERIFIED request/response |
| radar | 200 | 2026-10-11T00:32:49.541825+00:00 | VERIFIED request/response |
| map-light | 200 | 2026-10-11T00:32:49.596188+00:00 | VERIFIED style JSON — primary GPU rendering NOT TESTED |
| map-dark | 200 | 2026-10-11T00:32:49.649661+00:00 | VERIFIED style JSON — primary GPU rendering NOT TESTED |
| geocode-thai | 200 | 2026-10-11T00:32:53.570755+00:00 | VERIFIED request/response |
| geocode-district | 200 | 2026-10-11T00:32:53.656476+00:00 | VERIFIED request/response |
| flood-discharge | 200 | 2026-10-11T00:32:55.536492+00:00 | VERIFIED API — feasibility only, not integrated |
| gistda-public | 200 | 2026-10-11T00:32:58.293256+00:00 | Website/documentation only — dataset NOT TESTED |
| thaiwater-public | 200 | 2026-10-11T00:32:58.544275+00:00 | Website/documentation only — dataset NOT TESTED |
| tmd-docs | 200 | 2026-10-11T00:32:58.769424+00:00 | Website/documentation only — dataset NOT TESTED |
| radar-tile-bangkok | 200 | 2026-10-11T00:33:11.872258+00:00 | VERIFIED request/response |
| radar-coverage-bangkok | 200 | 2026-10-11T00:33:21.009168+00:00 | VERIFIED request/response |

## Successfully integrated

- Open-Meteo current MODELED conditions, actual hourly and 16 daily rows in all six checked locations; no hardcoded values. API supported nation-wide coordinate requests, not limited by flood or radar access.
- Open-Meteo AQ/CAMS MODELED current PM2.5, PM10 and US AQI with separate FORECAST trends. Six Thai/China response checks passed; approximately 45km global grids are not roadside measurements.
- RainViewer real historical metadata and PNG tiles/coverage. Audit had 13 historical frames; subsequent browser refresh had 12. Only available past timestamps are consumed. Hash frame paths were verified in actual responses.
- OpenFreeMap Positron and Dark style JSON retrieved successfully. Cloud Chrome disabled WebGL; actual primary vector style/worker rendering remains NOT TESTED. Lazy Leaflet fallback rendered OpenTopoMap and the same real radar over it. Its map PNG returned HTTP200 (35,624 bytes).
- Local 77-province gazetteer tested for uniqueness/country/timezone; GeoNames Thai and district requests returned results. Coordinate selection uses generalized Natural Earth 1:10m Thailand geometry, not authoritative border or province polygons.

## Blocked / conditional datasets

GISTDA flood feature/WMTS integration is BLOCKED without an API key, explicit data license and validated update envelope. Public portal accessibility is not dataset access. Exact seven-day flood service remains unverified. RID requires Bearer token; no token supplied. ThaiWater station dataset endpoint and reuse rights remain PROVISIONAL. TMD validity, affected area normalization, feed licensing and CORS remain PROVISIONAL: app links the official site and never generates notices. QWeather is BLOCKED by account/credential requirements; Open-Meteo keeps the three China cities functional. See docs/WATER_FEASIBILITY.md.

## Rights and service restrictions

Detailed URLs, authentication, limits, attribution, cadence/resolution and statuses are in DATA_SOURCES.md and NOTICE.md. Free Open-Meteo API is for personal noncommercial use; promotional portfolio use may be classified commercial under provider terms. Do not assume public portfolio clearance. RainViewer transition docs restrict historical coverage, tile z<=7, Universal Blue scheme and 100 requests/IP/min; general FAQ conflicts were documented. App has an 80/min per-page upstream cap, cache/abort controls and 15-second playback; multiple tabs or unrelated traffic can still share an IP quota. No paid resources or credentials were created. OpenTopoMap fallback imagery is CC BY-SA 3.0 and visibly credited as styled. No public OSM tile server dependency.

## Accuracy and geographic gaps

No comparison with physical stations or independent radar/flood ground truth was performed. Provider retrieval success is not meteorological accuracy certification. Province shortcuts are administrative-city points, not area averages. Not all 77 weather requests were exhaustively exercised; registry + six representative live requests + global provider documentation establish support architecture. Radar may be missing/stale, especially in China; blank imagery never implies no rain. AQ/model resolution and confidence limits remain visible. China Great Firewall/access/device behavior was NOT TESTED.
