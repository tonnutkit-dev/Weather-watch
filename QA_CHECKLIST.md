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
- [ ] Mobile 375×667, 390×844, 430×932, tablet 820×1180 and desktop; no horizontal scroll or covered controls.
- [ ] Three sheet states with touch dragging, keyboard and button alternative; map usable.
- [ ] Geolocation not prompted at startup; denied/unavailable/outside-region handling.
- [ ] Offline/500/timeout weather and AQ show readable errors; blocked P1 does not break map.
- [ ] China has no Thai official alert logic; unknown != no warnings or flood-free.
- [ ] Keyboard/focus/Escape/dialog return; contrast, 44px controls, accessible chart values.
- [ ] Reduced-motion no map flight/transitions, radar no autoplay; no unbounded polling.
- [ ] Visible provider/source/map/font license attribution; no private credentials.
- [ ] Required actual implementation screenshots: desktop/mobile light/dark, radar, forecast.
- [ ] Physical iPhone Safari and Chrome (NOT TESTED until owner device verification).

## V0.2 composition regression

- [ ] All three mobile sheet states in Light/Dark: temperature and condition fully visible, controls do not intersect, attribution above sheet.
- [ ] Collapsed sheet 130–160px before safe area, compact radar 64–88px; unobstructed central map band >220px at required short viewport.
- [ ] Actual touch pinch, keyboard +/- zoom, pan and recenter; gestures do not fight sheet.
- [ ] Radar detail dialog, refresh and coverage/staleness notices; hidden strip pauses when mobile sheet expands.
- [ ] Location search keeps opt-in GPS prominent and all 77 Thai provinces plus 3 China cities available.
- [ ] Expanded content scrolls; collapse resets inner scroll and restores primary summary.
- [ ] Exact deployed release SHA and real HTTPS browser suite; screenshots labeled preview versus deployed.
