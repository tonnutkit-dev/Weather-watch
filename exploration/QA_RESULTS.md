# Design exploration — executed QA

## Verified source and preservation

The first full successful visual run tested exploration source `5d9fea9a2611865592097cd4b35a9173ab31d689`:
https://github.com/tonnutkit-dev/Weather-watch/actions/runs/38118064146

It passed **20/20 Chromium browser tests on the first attempt, zero failures and zero retries**, plus all original **49/49 unit tests**, production and exploration strict TypeScript checks, both production builds and Pages asset verification. The final follow-up adds a named accessible dialog, a temperature Celsius label, stricter theme-persistence verification without a URL override, quieter administrative borders, and removes a redundant map-helper caption identified in actual screenshot review. Its push triggers the same complete isolated workflow; use that exact commit's Actions result for final handoff.

Main and public QA remain at `2036e2ac788cb31d25fd387cb40520ad95c408a6`. Original application source, weather/radar/location/forecast/AQ adapters, package.json/lockfile, production DESIGN.md and Pages workflow are unchanged. Main has not been merged, force-pushed or deployed by this work. Public release.json responded HTTP 200 and reported the same approved baseline.

## Actual browser coverage

| Coverage | Result in successful visual run |
| --- | --- |
| 375×667, 390×844, 430×932 | A/B/C × Light/Dark × collapsed/half/expanded: 54 geometry states passed |
| Tablet 820×1180 | A/B/C × both themes, forecast tabs, expanded detail and AQI: passed |
| Desktop 1440×1000 | A/B/C × both themes, readable detail and forecast: passed |
| Side-by-side gallery 1390×1310 | Three actual independently running prototypes, Light/Dark: passed |
| Document horizontal overflow | None in checked views |
| Primary temperature / condition | Visible and not clipped |
| Control / sheet / radar / marker collisions | No intersections in checked compositions; separate weather-art collision regression |
| Map attribution | Remains visible above the sheet |
| Radar-style demo slider | Within its 64–70px dock; play/pause and demo disclosure verified |
| Actual MapLibre interaction | Keyboard zoom, recenter and CDP touch pinch passed |
| Sheet interaction | Accessible up/down controls, real CDP touch drag, scrolling and radar hiding passed |
| Dialog | Escape and focus return; layers remain reachable in expanded sheet |
| Location | Xi’an selection changes real map coordinates; fixture values remain labeled demo |
| Theme | Manual/system behavior, stored preference and Reduced Motion checks passed |
| Contrast | Ink/secondary versus paper/surface ≥4.5:1 in every tested direction/theme |
| Runtime | Zero page exceptions and zero console errors in healthy matrix views |
| Offline map | Honest unavailable state; demo summary and settings stay reachable |

**80 named screenshots** are produced: 54 mobile sheet-state captures, 24 tablet/desktop default/detail captures, and 2 comparison captures. Screenshots are real rendered browser views, not generated concept art. JSON attachments preserve geometry, contrast ratios and interaction checks.

## Defects identified and corrected during work

1. Initial QA server used the config directory as cwd; fixed explicit root/config/report paths. First run never opened a browser page and is not counted as visual QA.
2. Broad rain-button selector matched the detail button as well; changed to an anchored layer-button selector. Second run had 17 passes / 3 test-selector failures.
3. Actual screenshot review found B weather illustration encroaching on high/low; corrected its position/size and added a collision assertion.
4. Dark roads were too bright because highway layer IDs were not covered; expanded thematic rules, quieted country labels and administrative borders.
5. Short-screen marker labels could compete with the radar dock; moved camera center and added a marker/dock collision regression.
6. Expanded mobile layer menu could sit behind the sheet; it now uses an accessible modal.
7. Secondary C text on paper needed higher contrast; refined the token and added ratio tests.
8. Final tablet detail screenshot review found B/C hero icon rules bleeding into forecast icons and B temperature wrapping its degree symbol. Scoped hero rules, constrained tablet hero proportions, kept numerals unbroken and added icon-size, temperature/art and internal scroll-overflow regressions. A final follow-up run verifies these fixes; inspect the latest branch commit Actions result.

## Limits and owner checks

Physical iPhone Safari/Chrome, VoiceOver, tablet Safari and sustained real-device FPS: **NOT TESTED**. Chromium touch emulation is not a physical-device claim. No axe audit or broad assistive-technology certification is claimed. Map color hierarchy should be checked under real rain raster intensity before adopting a winner; this exploration deliberately uses illustrative shapes and cannot certify live radar performance or data accuracy. Original weather/radar browser integration suite was not rerun by this workflow because production source is untouched; the baseline release's actual live integration QA remains separate evidence.

Owner review: choose A/B/C; check Thai readability at normal phone scale, browser chrome/safe areas, enlarged text/zoom, sheet gestures, dark screen brightness and map/rain readability. Only then authorize a focused implementation PR. Exploration is ready for review, not production acceptance.
