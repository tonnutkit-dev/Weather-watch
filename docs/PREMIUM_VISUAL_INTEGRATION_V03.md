# Weather Watch V0.3 — Premium Visual Integration

Owner: TON. Scope: approved Design C, isolated implementation and new Owner QA only. No main merge or replacement of either existing QA application.

## Decision and review links

**READY FOR ISOLATED OWNER QA / CONDITIONAL PASS. Integrated Design C, public deployment and all requested browser scenarios have passing evidence. The full deployed run remains FAIL because WebKit initially stopped at weather loading; one separate unchanged WebKit run passed on its first attempt. Intermittent live loading and inherited radar-readiness risks remain open. No main merge or production acceptance is implied.**

- Repository: https://github.com/tonnutkit-dev/Weather-watch
- Branch: `work/premium-visual-integration-v03`
- Functional starting point: `d7791d88c8de70793d76d5a53565ab46eb245204`
- Approved visual reference: `19ec27ce5abc338a65cf368d17f6d3abbf884840`
- Integrated application source: `a695711dab58caca660657ab83564b3a59f9fccb`
- Final gesture regression source: `61deaf487bce1151e0bbd8974c326791c58b26a0` (application source unchanged after a695711).
- Final QA workflow source: `5f561b364e0aef0e38888a66bd5bda86b5af79f9` (tests/workflows only).
- Protected main/Pages source: `2036e2ac788cb31d25fd387cb40520ad95c408a6`
- Protected smooth-radar Owner QA source: `8f137edc921d677cd3693229b670506495057cd2`
- New project: `appgprj_6acbe84dbfa48191a9279d9cf244e021`, Weather Watch — Design C Owner QA.
- Sites packaging source: `75c038a073ea3124a0ab162758f88e8e9eaf80c2`. Distinct hosting repository SHA; application `src/` and `public/` verified byte-identical across 59 files to the candidate. Only hosting manifest, root base-path build command and release/integrity metadata differ.

## What changed

The working application now uses the approved **70% Premium Editorial / 30% Atmospheric Map** composition. The current weather is a single editorial summary above the map on mobile and above the outlook in the left desktop column. It retains live modeled weather, the original source time and freshness states. Temperature remains visible in every sheet state. The lower situation sheet prioritizes a concise outlook, with the existing metrics, real hourly/daily forecasts, point US AQI, provenance and unavailable environmental modules beneath it.

The approved sun-and-current mark, warm paper/deep teal tokens, large tabular temperature, quieter borders, Thai typography, compact toolbar and restrained elevation establish a consistent identity. Light and dark basemaps receive a one-shot presentation decorator on the existing `style.load` event. It changes land/water/labels only; it does not modify radar colors, sources, camera or map creation. Leaflet remains the original fallback. No illustrative rain, demo weather arrays or prototype map lifecycle were ported.

`DESIGN.md` is the revised visual source of truth. No new runtime dependency, font family, animation loop or backdrop blur was added.

### File responsibilities

- `src/app/App.tsx`: composition and branding only; existing queries, timers, playback and renderer props retained.
- `src/components/WeatherOverview.tsx`: extracted current conditions, loading/error/retry, favorite and freshness display.
- `src/components/SituationPanel.tsx`: outlook/detail hierarchy; existing verdict and detail data retained.
- `src/components/BrandMark.tsx`, `WeatherIcon.tsx`: brand and SVG styling only; weather-condition mapping unchanged.
- `src/design-system/styles.css`: coherent desktop/tablet/mobile rules and tokens replacing conflicting overrides.
- `src/maps/editorialStyle.ts`, two added lines in `GLCanvas.tsx`: presentation decorator only.
- `src/tests/editorial-style.test.ts`: three light/dark/sparse-style safeguards.
- `tests/mobile-layout.spec.ts`, `tests/prototype.spec.ts`: real interaction assertions adapted to the approved composition and location-selector navigation.
- `qa-smooth-v03/{playback,renderer}.spec.ts`: map-only screenshot crop derives from actual map bounds; original pixel thresholds retained.
- `qa-visual-v03/`: isolated matched UI benchmark and live screenshot tests; not imported by production.
- `.github/workflows/premium-visual*.yml`: branch-specific QA/evidence only, no Pages deployment job.

## Architecture and source integrity

CI compares the protected radar, provider, freshness and fallback files to the exact functional baseline. It also removes exactly the decorator import/call from GLCanvas and asserts that the entire remaining file is identical. The entire source diff is limited to the listed presentation components and decorator. Source hash evidence is in `docs/qa/premium-visual-v03/PRESERVED_FUNCTIONAL_SOURCE.json` (18 explicitly enumerated critical files). Weather/AQ fetches, validity rules, abort/retry policy, location cache keys, 80 request starts per rolling minute, five-minute bounded image cache, truthful selected-frame labels and `displayedTime:null` are unchanged.

The map instance and canvas are retained through theme, sheet and location interactions. Existing theme-driven style reload behavior remains; this work does not claim to eliminate it. No provider endpoint or provenance logic was changed. Existing main and Pages workflow remain untouched.

## Layout verification and explicit tradeoff

Tested viewports: 375×667, 390×844, 430×932, 820×1180 and 1440×1000. Both appearance modes; mobile collapsed, half and expanded states; scroll, search/modal, location changes, attribution, temperature/condition visibility and control bounds.

The current weather moves above the map as approved Design C. At 375×667 the map begins at y=240, collapsed sheet is 148px, radar dock 76px, and the unobstructed vertical corridor between toolbar and radar is 101px. At 390×844 it is 248px; at 430×932 it is 336px. Expanded sheet leaves at least 130px of actual map. This is a deliberate tradeoff on short phones: immediate temperature visibility uses space previously occupied by a taller map. The old >=220px corridor assertion assumed the prior full-height map and was explicitly replaced by >=100px for this composition, not silently removed. Owner short-screen usability approval remains necessary.

A latest test refinement probes both fingertip paths for an unobstructed canvas lane. The earlier midpoint-only check could place one finger on a map overlay. The zoom-change assertion and real CDP two-finger input are retained. Pan now uses real single-finger CDP input with current path hit-testing, followed by the original keyboard/recenter checks. This is test-coordinate adaptation, not an application gesture workaround; final rerun results below determine its outcome.

## Measured before/after UI performance

Run 38193784916: Linux GitHub Actions Chromium; 390×844 touch profile; production builds, same runner and dependencies, no CPU/network throttle, three runs per version with a fresh session and a returning session each. Recorded weather/AQ responses and a fixed simple LAB basemap isolate UI/layout cost; radar disabled for this benchmark. Routing disables HTTP caching, so these are **not** cold/warm HTTP-cache measurements. No INP, physical iPhone FPS, GPU or battery claim is made. Small n=3: medians are useful comparisons, not statistical proof of improvement.

| Metric (median) | Baseline fresh | Design C fresh | Baseline returning | Design C returning |
| --- | ---: | ---: | ---: | ---: |
| FCP | 100ms | 80ms | 64ms | 68ms |
| LCP | 148ms | 144ms | 108ms | 112ms |
| CLS | 0 | 0 | 0 | 0 |
| rAF interval p95 during interactions | 16.7ms | 16.8ms | 16.7ms | 16.7ms |
| JS heap snapshot | 18.2MB | 19.3MB | 18.2MB | 19.3MB |
| DOM nodes | 827 | 929 | 827 | 929 |

Observed overhead: +1.1MB JS heap snapshot and +102 DOM nodes in this short exercise. Not a sustained-leak test. No long tasks were recorded in the six UI-only samples per version. No significant frame-time change is evident in this limited matched test. Do not describe the lower fresh FCP as a proven speedup.

Fresh-output bundle comparison (same lockfile/toolchain): all emitted JS/CSS/worker bytes 2,268,909 → 2,270,924 (+2,015); gzip sum 632,870 → 633,669 (+799, about 0.13%). This includes lazy map/fallback/worker assets, not initial payload. Fonts/dependencies unchanged. Full per-asset values: `BUNDLE_COMPARISON.json`.

## Real radar and rendering evidence

Run 38193784916 used actual provider frames in local production builds with real map resources. Six consecutive samples per browser, fixed map-only crop, and a no-radar basemap control showed zero control pixel change. Candidate visible radar pixels changed in all six samples. This establishes sampled visual change, **not complete viewport pixel readiness**.

| Browser profile | First selected advance | First changed-pixel sample | Subsequent selected intervals | Peak request starts / rolling 60s | Map lifecycle |
| --- | ---: | ---: | --- | ---: | --- |
| Chromium MapLibre | 1604ms | 1932ms | 2491–2517ms | 28 | Same host/canvas; 1 canvas |
| WebKit MapLibre | 1592ms | 1910ms | 2503–2529ms | 28 | Same host/canvas; 1 canvas |
| Chromium Leaflet + Reduced Motion | 1582ms | 1817ms | 2482–2516ms | 16 | Same host; fallback active |

Chromium rAF p95 16.7ms, WebKit17ms, Leaflet16.7ms during this short playback exercise. Chromium heap snapshot 29.4MB→29.4MB; Leaflet10MB→10MB; WebKit unavailable. Chromium recorded long tasks101ms and159ms. No page errors in completed radar cases. These are short observations, not GPU/thermal/leak acceptance. Existing playback logic is byte-identical; no speedup is claimed.

## Test history — failures retained

- Run38192710716: first source, TypeScript/unit/build/benchmark passed; original browser test file had a syntax typo. Fixed before acceptance. Screenshots exposed zoom toolbar overlap; corrected specificity and placement.
- Run38192811183: mobile layout cases passed; tablet/desktop tests still targeted removed permanent region chips. Updated to the retained location-selector workflow. Provider timeout retries remain recorded.
- Run38193520724: integrated regression steps passed; original desktop and Chromium radar each needed the existing retry after real weather did not appear within45s. Not a zero-flake claim.
- Run38193784916: unit96/96, build, source guards, matched benchmark and desktop/tablet screenshot checks passed. Original regression:7 passed,1 flaky,1 failed. 375px pinch did not change zoom; retry then failed weather loading. Hotfix playback passed; real-radar3 profiles ultimately passed, Chromium needed a weather retry. No timeouts/assertions were lengthened.
- Run38214289596: pinch assertions passed after probing both fingertips; later pan assertions failed on375/390 because the test reused a lower gesture lane and sent compatibility mouse input after touch. Cause is a test-input hypothesis, not a proven browser bug.430 failed real weather loading. Six original regressions passed; hotfix and Chromium real-radar required weather retries. Artifact11732295947 retains all failures.
- Follow-up61deaf487bce1151e0bbd8974c326791c58b26a0 uses a newly probed horizontal lane and real single-finger touch pan; center-change, keyboard zoom and recenter assertions remain. Separate recorded-weather geometry diagnostics isolate UI from public provider outages; public QA remains real-data-only. Recorded-weather geometry run38215364157 passed4/4 without retries, including real touch pinch/pan, all sheet states, themes and tablet. Prior recorded-weather run38215195855 reproduced3 pan failures before the touch-input correction; artifact11731542005 remains available. Application code did not change.

Large screenshots, traces and HTML reports are retained in Actions artifacts; small extracted measurements are committed. `MEASUREMENTS_RUN_38193784916.json` explicitly carries the failed whole-run status alongside successful subtest measurements.

## Deployment and public verification

Native publication succeeded on2026-10-12 at07:03UTC. Public URL: https://weather-watch-v03-design-c-owner-qa-ton.tonnutkit.chatgpt.site/ . Sites version1, deployment`appgdep_6acc86095bf881918c13a89912b3995c`. Anonymous HTTPS verification passed all36 asset hashes, including fonts, map worker and lazy chunks; root release identifies the exact candidate. The verifier also confirmed the existing Pages and smooth-radar QA release SHAs unchanged. Only the identified Cloudflare JS-detection suffix is removed from served HTML before exact hash comparison; no application byte mismatch is permitted. New project only; root base `/` plus release and per-asset SHA256 manifests. The existing GitHub Pages base `/Weather-watch/` still passes its build verification. No application route rewrite or provider change is needed.

## Remaining limitations and owner checklist

1. No physical iPhone Safari/Chrome testing was performed here. Owner should check portrait/landscape, browser chrome/safe areas, keyboard/search, two-finger zoom and sheet drag on the new URL.
2. At375×667 the clear map corridor is approximately101px; editorial hierarchy is improved but map area is smaller. Owner should explicitly accept this composition on short phones.
3. Public Open-Meteo connectivity is intermittent in Actions; original45s test thresholds and existing single retry are retained. Failures are not hidden by fixtures in deployed verification.
4. Inherited smooth-radar WebKit LAB readiness flake remains open fromd779. This visual work does not correct transport-versus-pixels readiness or close independent P1 audit items. Timestamp remains qualified and displayedTime remains null.
5. Leaflet uses its existing fallback basemap rather than copying the MapLibre palette. This is a graceful visual difference, with attribution intact.
6. No10–20minute sustained memory/GPU/battery run, real iOS low-power test, assistive-technology audit or field Core Web Vitals claim. Existing Reduced Motion branch and keyboard/modal behavior are checked by regression, not full accessibility certification.
7. GISTDA/TMD/ThaiWater integrations and Design C prototype source remain untouched. No new official warnings or flood conclusions are introduced.

Owner retest: compare Light/Dark; search a Thai province and each permitted China city; Play at least30seconds, Pause and scrub; pinch/pan; drag all sheet states; inspect hourly/AQ detail and source time; background/resume. Blank radar never establishes no rain. Report device/browser and a short recording for any issue.

## Evidence index

- Application candidate: https://github.com/tonnutkit-dev/Weather-watch/tree/a695711dab58caca660657ab83564b3a59f9fccb
- Matched metrics and all original failures: https://github.com/tonnutkit-dev/Weather-watch/actions/runs/38193784916
- Artifact: `premium-visual-v03-38193784916`, ID11722737018, https://github.com/tonnutkit-dev/Weather-watch/actions/runs/38193784916/artifacts/11722737018
- Prior successful regression run: https://github.com/tonnutkit-dev/Weather-watch/actions/runs/38193520724
- Artifact: `premium-visual-v03-38193520724`, ID11722577029.
- Failed source rerun: https://github.com/tonnutkit-dev/Weather-watch/actions/runs/38214289596 (artifact`premium-visual-v03-38214289596`, ID11732295947).
- Final source regression: https://github.com/tonnutkit-dev/Weather-watch/actions/runs/38215364759
- Geometry isolation PASS: https://github.com/tonnutkit-dev/Weather-watch/actions/runs/38215364157 — artifact`premium-geometry-v03-38215364157`, ID11731881889.
- Artifact contents: `baseline-visual-report/`, `qa-visual-v03/browser-report/`, `playwright-report/`, `qa-playback-v03/browser-report/`, `qa-smooth-v03/browser-report/` plus trace directories. HTML report attachments contain named Light/Dark mobile/tablet/desktop screenshots and JSON results.
- Retention90days; GitHub authentication may be required for Actions artifacts. Complete Markdown and small JSON remain directly readable in the public branch. No owner re-upload is required.


## Final deployed verification (2026-10-12)

Actual public URL: https://weather-watch-v03-design-c-owner-qa-ton.tonnutkit.chatgpt.site/

- Run: https://github.com/tonnutkit-dev/Weather-watch/actions/runs/38215698304 . Overall **FAIL**, accurately retained.
- Reproducible install, TypeScript,96 unit tests, production build and Pages subdirectory verification: PASS.
- Anonymous release/source/all36 static assets and protected existing deployments: PASS.
- Original browser regressions:9/9 ultimately passed (8 first attempt,1 weather-loading retry). Includes all three mobile sizes, touch pinch/pan, sheet states, Light/Dark/System, selected location, map attribution, provider-failure isolation and offline error handling.
- Existing real automatic Play/Pause/scrub/sheet/theme test:1/1 PASS.
- Real visible radar frames: Chromium and Leaflet/Reduced Motion PASS; WebKit **FAIL before radar testing**, temperature element absent after45s on both attempts. Trace shows Open-Meteo requests without a completed HTTP response (status/time -1); the snapshot retains loading and honest unavailable freshness, with a working map. This does not establish a provider outage, a radar renderer defect, or a new visual regression. Underlying browser/network cause remains unverified.
- Desktop1440×1000 and tablet820×1180 live Light/Dark screenshots/control geometry: PASS.
- Source run38215364759 also ultimately passed9/9 original regressions (3 weather retries), unit96/96 and all matched benchmarks; it failed the same WebKit weather-loading prerequisite. No relevant timeout or assertion was loosened.
- One separate, bounded WebKit rerun with unchanged real-provider test,45s prerequisite and pixel assertions: run38223362351; **PASS first attempt**,34.3s. This verifies real visible playback in Linux WebKit but does not erase the earlier weather-loading failures or establish physical iPhone acceptance. No fixture responses are used on public QA.

| Deployed observation | Chromium MapLibre | Leaflet + Reduced Motion |
| --- | ---: | ---: |
| First selected-frame advance | 1676ms | 1610ms |
| First changed-pixel sample | 1915ms | 1865ms |
| Subsequent selected intervals | 2471–2520ms | 2492–2523ms |
| Peak starts in rolling60s | 28 | 16 |
| rAF interval p95 | 16.8ms | 16.7ms |
| Page errors in completed radar test | 0 | 0 |

Same MapLibre canvas retained. Genuine frame samples visibly differ; this is not full-viewport pixel confirmation. Existing80/min guard remains unchanged. Full deployed measurements and failed test records are committed in `docs/qa/premium-visual-v03/DEPLOYED_VERIFICATION.json`.

Deployed artifact: **premium-visual-deployed-v03-38215698304**, ID **11731508302**.
https://github.com/tonnutkit-dev/Weather-watch/actions/runs/38215698304/artifacts/11731508302

Open `playwright-report/index.html` for mobileLight/Dark/all sheet-state screenshots, `qa-visual-v03/browser-report/index.html` for desktop/tabletLight/Dark, and `qa-smooth-v03/browser-report/index.html` for real frame PNGs and failing WebKit traces. Artifact retention ends2027-01-10. Source final-run artifact: **premium-visual-v03-38215364759**, ID **11732278019**.

## Targeted WebKit result

- SUCCESS run: https://github.com/tonnutkit-dev/Weather-watch/actions/runs/38223362351
- Artifact: **premium-webkit-deployed-v03-38223362351**, ID **11735497022**.
- One test, first attempt,34.3s; real public deployment and real provider frames; no timeout/assertion/fixture changes.
- Full values: `docs/qa/premium-visual-v03/WEBKIT_TARGETED_VERIFICATION.json`.
- Earlier aggregate run stays FAIL; this is passing evidence of the previously blocked scenario, with intermittent loading cause still unverified.

## Next-stage recommendation

Owner may inspect the new visual QA now. Keep main, existing smooth QA and Pages unchanged. Before any merge request for acceptance, complete physical iPhone Safari/Chrome checks, explicitly accept the375px map-space tradeoff, and resolve or independently characterize the repeated live WebKit weather-loading gate. The inherited WebKit radar readiness risk remains a separate technical issue; do not silently close it through visual QA. No new provider integration or P1 refactor is part of this delivery.


Targeted deployed WebKit measured first selected advance **1650ms**, first changed-pixel sample **2013ms**, subsequent selected intervals **2495–2531ms**, peak rolling60s requests **28**, same canvas **True**, no page errors. This remains sampled imagery evidence, not pixel-complete viewport confirmation.

**FINAL RECOMMENDATION: READY FOR ISOLATED OWNER QA — CONDITIONAL PASS; NO MAIN MERGE OR PRODUCTION ACCEPTANCE.**
