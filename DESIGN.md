# Weather Watch — Design C / The Weather Edit

Approved by TON for isolated V0.3 integration. Visual source: exploration commit 19ec27ce5abc338a65cf368d17f6d3abbf884840. Functional baseline: d7791d88c8de70793d76d5a53565ab46eb245204. No main acceptance is implied.

## Identity and composition

70% Premium Editorial / 30% Atmospheric Map. Quiet warm paper, deep teal surfaces, generous typography, precise hairlines and a single weather summary. Weather Watch keeps its name; the sun-and-current mark comes from approved C. THE WEATHER EDIT is secondary identity, never a substitute for Thai labels or provenance.

Desktop: a 350px editorial column (300px tablet, 390px wide desktop) holds current weather above independently scrolling outlook. The map occupies the broad right column. Mobile: compact 56px header, one 202px weather overview (176px on short phones), central interactive map with 10px side insets, and a 148px collapsed situation sheet. The current temperature stays visible above the map in every sheet state.

## Tokens

| Token | Light | Dark |
| --- | --- | --- |
| background | #f0f2ed | #13272b |
| surface | #fbfcf8 | #1b3236 |
| raised | #e8ede8 | #263e41 |
| text | #203d3e | #f0f2e9 |
| secondary | #586e6c | #adc0bb |
| border | #d5dfd9 | #3a5151 |
| accent | #235f75 | #a2ccd0 |
| accent soft | #dce9e9 | #324f55 |
| on accent | #ffffff | #153035 |
| warning | #936821 | #e2bf7a |

Thai: locally bundled Noto Sans Thai 400/500/600/700, SIL OFL. Temperature: system Arial with tabular figures; 114px desktop, 100px tablet, 83px mobile, 70px short mobile. Temperature source remains real modeled data, with full condition and original source time. Thai body 13–15px; provider metadata 11–12px; technical map credits may be smaller. Focus 3px accent. Spacing 4/8/12/16/20/24/28/36px. Surface radius 18–22px, controls 12–14px. One soft 8px/26px shadow where separation is needed. No backdrop blur or ambient animation.

## Map, radar and sheet

Preserve existing OpenFreeMap Positron/Dark style sources, with an isolated one-shot basemap decorator: muted land/water and legible labels; hide building/minor-road labels only and primary MapLibre lifecycle, genuine historical radar palette and Leaflet/OpenTopoMap fallback. Approved prototype illustrative rain, map constructor and demo values must never enter this application. Atmospheric quality comes from framing, palette and uncluttered controls; no color filter is applied to radar.

One 44px layer selector and recenter control. Existing keyboard/pinch gestures remain. Desktop zoom is positioned below the unified toolbar; current-location access stays in search. Radar strip remains 76px, selected time explicitly qualified, displayedTime:null, existing loading/unverified/failure states unchanged. No faster timer or truthfulness correction is included in this visual work.

Mobile sheet: collapsed148px plus safe bottom, half bounded43dvh, expanded leaves130px of actual map below the top summary. The two expanded states remain distinct where screen height permits. The map, radar and attribution use existing actual-height camera layout observation. Header/overview never remount the map. Expanded sheet hides the radar dock while preserving existing playback policy. Drag and44px expand/collapse buttons remain equivalent. Scroll is confined to panel; collapsing resets it. At very short landscape heights hide the radar dock and reduce summary geometry rather than cover essential controls. Real iOS keyboard/safe-area/landscape acceptance remains owner QA.

## Trust and detail hierarchy

Source freshness is visible beside the primary summary. Original source timestamps, MODELED tags, measured variables, full verdict rationale, forecast resolution, point US AQI and unavailable official/flood data remain accessible in the detail panel. No safety verdict is invented. Forecast uses the existing real-data SVG, line breaks for missing samples and readable hourly/daily values. No prototype chart arrays or weather fixtures enter dist.

## Motion, performance and accessibility

Buttons150ms; sheet200ms; no continuous visual effect. Existing Reduced Motion removes CSS transitions and camera easing. System/light/dark preference behavior unchanged. Theme changes may reload the existing basemap style but must retain the same map instance/canvas. Semantic headings, labeled controls, existing modal focus/Escape behavior, readable Thai and44px controls remain mandatory. No new runtime dependency, font family, provider or polling loop.

## Regression contracts

Test375×667,390×844,430×932,820×1180 and1440×1000 in both themes. Current temperature/condition always visible, no horizontal overflow, attribution visible, no overlay collision, gestures actually land on the map, same canvas through sheet/theme/location transitions. The old220px clear-map gap assumed no top weather summary; Design C replaces it with>=100px clear gesture corridor at the shortest supported phone, plus130px of map in expanded state. This is an explicit composition change, not relaxation of a renderer test. Pixel tests retain original thresholds using a fixed340×200 map-only crop derived from actual map bounds.

Known inherited technical risk: WebKit transport readiness can precede sampled pixels; the baseline LAB flake remains open. Visual integration must not claim it was corrected. Physical iPhone and sustained GPU/battery acceptance are not established by CI.

Cartography API reference: https://maplibre.org/maplibre-gl-js/docs/API/classes/Map/#setpaintproperty. The decorator is invoked by the existing style.load event; CI removes exactly that import/call and byte-compares the entire remaining GLCanvas with baseline. No lifecycle behavior is copied from exploration.
