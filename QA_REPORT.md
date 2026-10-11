# QA report — Foundation 0.1 / Functional Prototype 0.1

Outcome: Foundation PASS. Functional prototype CONDITIONAL PASS. Real weather, forecasts, radar and AQ operate with a real interactive 2D fallback map. Primary MapLibre/WebGL device rendering and physical iPhone/Safari are not certified by this environment. No public deployment.

## Executed engineering checks
| Command/check | Result | Evidence / scope |
|---|---|---|
| npm install + lockfile | PASS | Pinned resolved dependency lock |
| npm ci | PASS | Reproducible 196-package install, no paid service |
| npm run typecheck | PASS | Strict TS, noUnused/noUncheckedIndexedAccess; evidence/typecheck.log |
| npm test | PASS: 45/45, 3 files | evidence/unit-tests.log |
| npm run build | PASS | evidence/production-build.log; lazy map engines + worker built |
| npm run verify:data | PASS for recorded requests | 23 HTTP200 responses, 13 frames in initial audit; website vs dataset distinction in data report |
| Prettier 3.6.2 | Executed | Source formatted for maintenance; no formatting runtime dependency |
| Playwright CLI spec | NOT RUN | Runnable specs/config provided; cloud CUA browser used instead |

Tests cover real captured adapter envelopes (test-only inputs), missing/null/invalid values, zero preservation, epoch/Bangkok/Shanghai formatting, Open-Meteo daily offset, modeled vs observed vs forecast classification, radar past-only/dedup/path/frame advance/staleness, 77 regions/China boundaries, flood unknown and expired alerts, conservative thresholds, theme persistence/system matchMedia events, location changes/query coordinates, independent failure containment, simulated offline events, three sheet states and opt-in geolocation denial. Component tests mock the renderer and do not claim WebGL rendering.

## Browser QA actually executed
Remote Chrome via CUA/CDP on the managed internal Vite preview. Desktop viewport 1363×936. Mobile CSS behavior inspected in same-origin iframes 390×844 and 320×740; these are responsive viewport checks, not iPhone device emulation or Safari.

| Regression | Result | Observed evidence |
|---|---|---|
| Live current data and forecasts render | PASS | Bangkok and Chiang Mai; provider grid/request coordinates visible |
| Xi’an, Chengdu, Chongqing switch data | PASS | Live temperature and location/timezone changed; supplementary presets only |
| Theme retains location; reload retains preference | PASS | Xi’an + Dark reload remained selected; later Bangkok Light/Dark captures |
| Interactive map initialization | PASS for fallback | data-map-status ready; actual tiles and actual radar displayed |
| Pan and zoom | PASS for fallback | Zoom 8→9 then 5; center changed 13.7527,100.5084→13.9661,99.8492, selected location unchanged |
| Map coordinate selection | PASS for fallback | Click 15.1782,101.9531 fetched grid 15.149,101.955 independently of preset/flood data |
| Layer switches modify content | PASS for fallback | Weather marker removed/restored; AQ point removed/restored; real checked inputs |
| Radar slider/playback/pause | PASS | Frame changed 1791679800→1791672600 while temperature stayed 25°C; past metadata only |
| Radar opacity | PASS for fallback | 65%→60% changed actual overlay; modal and DOM layer evidence |
| Forecast range / 16-day list | PASS | 3 rows spanning 2h, model-not-nowcast label; 3/7 daily rows and expanded 16-row list |
| Sheet collapsed/half/expanded | PASS in Chrome | Buttons, ArrowDown and actual drag verified; no double transition after drag |
| Mobile layout | PASS in checked viewports | 320 app width/scrollWidth both 320; 390 screenshots; safe-area CSS included |
| Flood/alerts failure independence | PASS architectural/unit | No attempted restricted provider fetch; honest unavailable UI; app stays functional |
| China uses separate official source | PASS unit/browser | CMA fallback, no Thai warning inference |
| Offline/error state | PASS simulated unit | offline event + rejected weather request show clear message without map controls crashing |
| Initial GPS request | PASS unit + browser startup observation | No automatic request; unit denial preserves default |

## Defects found and fixed
RainViewer actual hash paths, daily timezone offset, map worker path, WebGL-unavailable fallback, theme updates overwriting Leaflet runtime classes, pointer capture suppressing sheet buttons, root scrolling after range keyboard focus, tiny product metadata, mobile marker hidden behind radar controls. The final version has readable product metadata, larger mobile targets and camera padding to show the selected point above controls.

## NOT TESTED / remaining risks
- Primary MapLibre runtime (cloud Chrome reports WebGL disabled). Primary source/style/worker typechecked/built and style JSON fetched, but runtime visual parity remains pending.
- Physical iPhone Safari/Chrome, native touch, notch safe-area rendering, keyboard/browser chrome, WebKit.
- Real device geolocation grant/denial/outside-country and physical network disconnect; only simulated permission/network unit behavior tested.
- CLI Playwright suite, browser OS appearance change end-to-end (matchMedia hook tested), low-end FPS, Lighthouse, formal screen-reader/contrast audit.
- GISTDA/RID/ThaiWater/TMD/QWeather authenticated live data and reuse rights.
- OpenTopoMap fallback is busier than the approved map concept. No public portfolio clearance for API use.

## Owner device checklist
Run npm ci && npm run dev on a computer accessible to the device. Check Safari light/dark/system and OS theme changes, notch safe areas, map GL styles/labels/worker/radar, pan/pinch/map click, geolocation denial, three sheet states by touch, visible focus/VoiceOver, network loss and China selection. Execute npm run test:e2e after installing Playwright Chromium/WebKit as appropriate. No production hosting has been created.

## Repository handoff
Existing main e380a0b6fc6ecbb2a3d57e870c2cbf70ee2d9a7b contains the owner's Initial commit and README. Work is prepared on work/weather-watch-foundation-01, preserving that commit as ancestor. Exact final/pushed SHA, remote verification, bundle verification and clean status are supplied in the external HANDOFF.md so a commit does not self-reference its own hash.
