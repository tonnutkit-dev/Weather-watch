# QA checklist
Actual execution results belong in QA_REPORT.md, this file is not a PASS report.

- [ ] npm install / npm ci and lockfile, typecheck, build.
- [ ] Adapter real-response/null/missing/invalid-value tests; model vs observation classification.
- [ ] Bangkok→Thai province→Xi’an→Chengdu→Chongqing changes weather and query keys.
- [ ] Thai 77-province search works without remote provider; district result limits disclosed.
- [ ] Epoch formatting correct in Bangkok/Shanghai, daily local dates preserve provider offset.
- [ ] Map style and tiles render, zoom/pan/click work; markers are real current selected-point values.
- [ ] Radar real raster renders, past frames only, play/pause/slider/opacity/refresh correct; no weather-query mutation.
- [ ] Stale/missing/blank imagery caveat; latest frame generation time visible; no future nowcast.
- [ ] Layer switches change actual map content; unavailable flood layer is honestly disabled.
- [ ] System appearance reacts to OS change; light/dark choice survives reload, location unchanged.
- [ ] Mobile 390×844 and narrow 320px, desktop 1440×900; no horizontal scroll or covered controls.
- [ ] Three sheet states with touch dragging, keyboard and button alternative; map usable.
- [ ] Geolocation not prompted at startup; denied/unavailable/outside-region handling.
- [ ] Offline/500/timeout weather and AQ show readable errors; blocked P1 does not break map.
- [ ] China has no Thai official alert logic; unknown != no warnings or flood-free.
- [ ] Keyboard/focus/Escape/dialog return; contrast, 44px controls, accessible chart values.
- [ ] Reduced-motion no map flight/transitions, radar no autoplay; no unbounded polling.
- [ ] Visible provider/source/map/font license attribution; no private credentials.
- [ ] Required actual implementation screenshots: desktop/mobile light/dark, radar, forecast.
- [ ] Physical iPhone Safari and Chrome (NOT TESTED until owner device verification).
