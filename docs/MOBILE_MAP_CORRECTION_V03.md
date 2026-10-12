# Weather Watch V0.3 — Mobile Map Correction

Owner: TON. Isolated Design C Owner QA update only. Physical iPhone acceptance remains pending. No main merge or production release.

## Identity and result

- Repository: https://github.com/tonnutkit-dev/Weather-watch
- Branch: work/mobile-map-correction-v03
- Verified integration parent: 2b7e11caf7d104484cd9c058c2936f42a652a0f4
- Executable correction source: 0ed053acdcf1b4e477e9f988d257902de4c081e3
- Subsequent commits add QA workflows and this report only; application bytes remain unchanged.
- Updated Owner QA: https://weather-watch-v03-design-c-owner-qa-ton.tonnutkit.chatgpt.site/
- Sites version 2: appgprj_6acbe84dbfa48191a9279d9cf244e021~appgver_0cd469d4cfec81919a03392825ed8692
- Deployment: appgdep_6acd0252c9b08191b8e9202348d28445, succeeded 2026-10-12 15:53:17 UTC.
- Deployment-specific source/package SHA: 6c58eeac1160e7a5007dee4d38d1967fa04993ae (separate Sites repository, not GitHub main).
- Public release identifies the executable GitHub source, root base / and diagnosticFixturesIncluded:false.
- Anonymous verification passed all 36 asset hashes, including fonts, map worker and lazy renderer chunks.

## Geometry correction

Mobile overview: 110px instead of 210px (184px on short phones). Location, temperature, condition and original source freshness remain visible. Temperature is 40px; apparent/high/low values remain in opened details. Normal desktop/tablet declarations remain byte-identical except a hidden mobile-only detail class.

Collapsed sheet: 92px plus safe bottom, with verdict and 44px handle/expand controls. The separate outlook heading is hidden only while collapsed. Portrait retains three distinct sheet heights; expanded leaves 130px of map. Forecast, AQI, provenance, source metadata and unavailable warnings remain accessible.

Radar: starts at 64px instead of 76px, preserving 44px Play/Pause, scrub and details targets. Historical selected time and qualified states remain unchanged. Long states can grow rather than clip. The 40px bottom clearance is retained because attribution wraps to 32px on narrow phones. The first candidate's 32px clearance caused a 4px collision; it was rejected and corrected.

Short landscape: weather/details use a side rail; map/radar stay on the right. Three sheet states remain available with one shared side-rail height. Camera padding measures actual map/overlay intersections, excluding a non-overlapping rail. No map instance or playback scheduler is replaced.

## Measured unobstructed map space

Exact corridor below toolbar and above radar, sheet, attribution or other overlapping surfaces. Covered map pixels do not count. Separate free-area estimates use an 8px DOM hit-test grid.

| CSS viewport / simulation | Before corridor | After corridor | Before free area | After free area |
| --- | ---: | ---: | ---: | ---: |
| 375×667 | 100px | 242px | 56,064px² | 106,368px² |
| 390×844 | 247px | 415px | 117,312px² | 176,000px² |
| 430×932 | 335px | 503px | 172,864px² | 237,952px² |
| 667×375 landscape | 0px | 160px | 40,448px² | 85,504px² |
| 844×390 landscape | 113.89px | 175px | 97,600px² | 134,848px² |
| 390×844, top24/bottom34 safe insets | 189px | 357px | 93,760px² | 155,520px² |
| 844×390, left/right44 + bottom21 safe insets | 113.89px | 154px | 97,600px² | 110,784px² |
| 375×567, shorter browser viewport | 0px | 142px | 21,888px² | 69,760px² |
| 390×720, dynamic-height simulation | 153px | 295px | 78,912px² | 131,904px² |

Both themes and both Chromium/WebKit reproduce the listed minimum corrected corridor. Primary 240/300px targets pass. The 142px corridor at 375×567 is an explicit tradeoff preserving source freshness, 44px targets and attribution. The table describes the default ready radar dock; longer fault/coverage labels can enlarge it. Simulated browser-content viewports are not physical Safari chrome.

Full-viewport matched screenshots use recorded weather/AQ in LAB only and real map/radar resources. No fixture enters dist. No physical iPhone claim.

## Validation and failures retained

- TypeScript, 101/101 unit tests, production build and protected Pages build verification: PASS.
- Geometry: 18/18 tests, 9 viewports × 2 engines, 108 corrected theme/sheet states: PASS.
- Leaflet/Reduced Motion portrait/landscape checks in both engines: PASS.
- Chromium real landscape touch pan, pinch, recenter and same-canvas checks: PASS. WebKit CDP touch case is explicitly skipped because CDP is Chromium-only.
- Existing source regressions: 9/9 ultimately PASS; 390px mobile and tablet each had a 45s weather-loading failure before the original retry passed.
- Source Play/Pause/scrub/sheet/theme/budget: PASS.
- Source radar pixels: Chromium/Leaflet PASS; WebKit failed twice waiting for weather before radar testing.
- Independent unchanged WebKit live source test: PASS, original 45s threshold, zero retries.
- Actual HTTPS: release/36 assets PASS; Chromium mobile geometry PASS; Play/Pause/scrub PASS; desktop/tablet themes PASS.
- Actual HTTPS radar pixels/cadence: all three engines ultimately PASS; WebKit used the original retry after a weather-loading failure.
- First public WebKit mobile test failed waiting for Open-Meteo; original public regression step was skipped after it. Supplemental public workflow completes those checks independently, result appended below.
- Whole source and first whole public verification runs remain FAIL; successful subtests/confirmations do not relabel them.

No thresholds were weakened to hide renderer/provider failures. The obsolete 130–160px sheet expectation was replaced with the owner's requested 80–100px contract; free-map requirements strengthened from >100px to ≥240/300px. Original gesture, identity, provider-failure and content assertions remain.

## Matched mobile performance

Three runs per session condition on the same Linux Chromium runner, recorded weather/AQ, no radar, fixed LAB basemap. Routing disables HTTP cache: returning-session is not a warm-cache claim.

| Median metric | Before fresh | After fresh | Before returning | After returning |
| --- | ---: | ---: | ---: | ---: |
| FCP | 160ms | 136ms | 108ms | 108ms |
| LCP | 276ms | 136ms | 148ms | 108ms |
| RAF p95 | 16.8ms | 16.7ms | 16.8ms | 16.8ms |
| CLS | 0.00270 | 0.00252 | 0.00378 | 0.00252 |
| Long-task count | 2 | 1 | 1 | 1 |

JS/CSS grows 5,024 raw / 704 gzip bytes total. Fonts and map worker are byte-identical. Smaller hero changes the LCP candidate; this small benchmark is not a statistical speedup or field-CWV claim. No physical GPU/battery or sustained-memory test.

Public playback: first selected-frame advance 1,600ms, peak16 starts per rolling60s (limit80), same canvas and zero page exceptions. Selected time remains qualified, not confirmed pixels.

## Evidence

- First rejected candidate: https://github.com/tonnutkit-dev/Weather-watch/actions/runs/38269473715
- Final source matrix/performance/core regressions: https://github.com/tonnutkit-dev/Weather-watch/actions/runs/38271462391
- Full source artifact ID11757543627, SHA256 17a1cb22a2bf09fec054cb4b6e885288023b14ac6287dfb8eadd0e2cc7f622ce.
- Independent WebKit source confirmation: https://github.com/tonnutkit-dev/Weather-watch/actions/runs/38273059977
- Public verification: https://github.com/tonnutkit-dev/Weather-watch/actions/runs/38273685432
- Public artifact ID11759030499, SHA256 056a3d7b3e04869b87c7601f40e3704aff1c042c6244a7eae11e5b4f6e2a9fd0.
- Supplemental original public regressions: https://github.com/tonnutkit-dev/Weather-watch/actions/runs/38274781473
- Full screenshots/traces/HTML reports retain 90-day Actions availability. Owner delivery includes comparisons, geometry/performance JSON and complete failure outcomes.

## Protected state and remaining issues

GitHub main/Pages remain 2036e2ac788cb31d25fd387cb40520ad95c408a6. Separate Radar QA release remains 8f137edc921d677cd3693229b670506495057cd2. Anonymous deployed verification checked both. No other Site deployed, force push, merge or Pages production release.

Open-Meteo connectivity remains intermittent. Inherited radar transport-versus-pixels readiness remains open despite successful samples here. Historical-only RainViewer, 80 rolling-minute starts, Unknown/provenance, Thai, Reduced Motion, APIs and MapLibre/Leaflet remain unchanged.

Physical iPhone Safari/Chrome, actual chrome/safe areas, VoiceOver and sustained GPU/battery acceptance remain unverified. Owner should retest map size, pan/pinch, sheet drag, recenter, Play/Pause and both themes on the updated URL.

## Supplemental public regression result

Run38274781473 completed with overall FAIL. Original public regressions: 9/9 ultimately PASS (7 first-attempt passes, tablet and mobile-overflow each passed the original retry after a 45s weather-load timeout). The separate zero-retry WebKit mobile live case failed before geometry because temperature was absent after45s. No assertions or provider behavior were changed. The earlier unchanged WebKit source confirmation passed, and actual HTTPS WebKit radar pixels passed on the original retry. This variability remains an open provider-loading issue, not a full technical PASS.

Decision: mobile composition/gesture correction PASS; updated isolated Owner QA is live and verified. Technical acceptance remains conditional on the inherited provider/readiness risks and physical iPhone owner retest. NO main merge or production release.
