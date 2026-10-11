# Weather Watch — visual source of truth

Derived from TON’s approved 11 October 2026 reference (98BBBF19-B3AB-4BDA-B7EF-0501E6DD797D.jpeg). The image is a direction, not authority for values, map labels, unsafe claims or layout artifacts.

## Personality

Premium Minimal Weather Intelligence: calm, spacious, refined consumer software. Primary blue, restrained glass for floating map controls. No photographic scenic background, giant sidebar, fake safety badges or heavy neon.

## Tokens

| Token       | Light   | Dark    |
| ----------- | ------- | ------- |
| background  | #f3f7fc | #08121f |
| surface     | #ffffff | #101e30 |
| raised      | #f6f9fd | #17273d |
| text        | #12233e | #eef5ff |
| secondary   | #60728c | #a8bad0 |
| border      | #e1e9f3 | #263b53 |
| accent      | #1769ee | #68a9ff |
| accent soft | #e9f2ff | #173353 |
| warning     | #99620b | #ffd087 |
| danger      | #b43d3d | #ffaaaa |

All actual colors use CSS variables. Warning colors only for actual interpreted conditions or uncertainty. Typography: locally bundled Noto Sans Thai (SIL OFL); system Latin fallbacks. Display 64px desktop / 48px mobile, headings 20–24px, body 14–16px, product metadata 12px; standard map attribution/technical provider tags can be smaller. Tabular numerical values. Weight 400/500/600/700.

Spacing 4/8/12/16/20/24/32/40px. Radius 10px controls, 16px subcards, 24px panels. Shadow light 0 12px 40px rgba(22,48,82,.09); dark minimal. Lucide outline icons (ISC) at 18–22px; custom SVG weather symbols with sun/cloud/rain shape, accessible textual conditions alongside.

## Responsive rules

> =1000px: full-height map with a 370px right situation rail; slim top header and inline country/China shortcuts. 760–999px: 330px rail. <=759px: one 56px header plus top safe area, no permanent region bar or duplicate map location chip. Selected location appears in the primary summary; header search opens all 77 provinces, explicit current-location access, favorites and an expandable secondary three-city China menu. No bottom tab bar.

The mobile sheet is 148px plus bottom safe area when collapsed, 52dvh half, and 82dvh expanded. Half/expanded heights are bounded to leave at least 130px of map below the header for controls and attribution. Collapsed shows location, one prominent temperature, full condition and one conservative situation/uncertainty sentence. Metrics, provider timestamps, forecasts and environmental content scroll inside the half/expanded sheet. Collapsing resets inner scrolling so the summary cannot disappear. Drag handle, explicit 44px buttons and keyboard arrows are equivalent.

One compact two-button map toolbar provides contextual layers and recenter. Mobile default hides the optional temperature marker. Pinch/pan and native keyboard +/- remain available; desktop zoom buttons remain. Primary MapLibre and fallback camera insets track rendered sheet/radar heights, using the viewport breakpoint rather than a narrow desktop map column's width.

Radar is a 76px compact strip above attribution and the collapsed sheet: play/pause, slider, selected local frame time, details. Details open a scrollable accessible dialog with full dates, refresh, history/coverage/freshness explanation, RainViewer attribution and intensity legend. Latest-frame freshness uses real UTC age (>30 minutes), independently of selected historical frame and display timezone. A UI clock updates every minute without polling the API. Half/expanded hide the strip and pause mobile playback; controls and attribution stay accessible. Legends never float over the mobile map.

One canonical mobile CSS block owns layout variables and state rules, followed only by narrow-width and short-height adjustments. Do not append conflicting emergency overrides. Product text remains readable, controls are at least 44px, surfaces are opaque enough over map labels, safe areas are added to header/sheet once, and Reduced Motion removes sheet transitions.

## Components

Brand: 38px blue icon and two-line wordmark. Search: pill-shaped button opens accessible modal with local province results and debounced remote Thai-place search, explicit limitations, secondary China row. Weather: location, large temperature, weather SVG, high/low, model/time label, three compact metrics. Forecast: next 2h/24h/3d/7d controls, actual temperature line and accessible values, horizontal hourly cards; 16-day optional list. Environmental cards: PM/US AQI and honest flood/alert unavailable states with official links. Map: Positron / Dark OpenFreeMap, actual radar rasters under labels where possible, functional layers, opacity slider, intensity legend (RainViewer scheme 2), zoom/location controls and always visible attribution. Radar labels say historical frame-generation time, not forecast or exact station measurement time.

## Motion and accessibility

150–220ms opacity/transform transitions, sheet 240ms, map location move ~700ms; no ambient animation. prefers-reduced-motion removes transitions and map flights; radar never auto-plays. Theme follows matchMedia and updates on OS change, manual choice persists. Inline pre-paint theme script prevents flash. Keyboard focus rings, semantic buttons/dialogs, aria-expanded/pressed, Escape closes modals, focus returned to opener, field labels, non-color-only status, chart text/table, readable source links. Zoom allowed, native browser scrolling preserved.

## Implemented compatibility adaptation

WebGL-unavailable devices use Leaflet/OpenTopoMap 2D tiles. The relief basemap is busier than the approved image; this is an explicit compatibility fallback, not a substitute claim for primary MapLibre visual QA. Themes transform only this fallback basemap; real radar colors remain unchanged. Primary OpenFreeMap cartography was verified in Chromium CI at baseline 702e2d9; physical iPhone/Safari review remains owner QA. Smaller technical map credit remains always available; product forecast/current metadata stays readable.

## V0.2 correction evidence

Owner iPhone screenshot IMG_4505.png (11 October 2026) shows competing region/location/layer/legend/playback controls. This correction retains the approved brand palette and typography, changing the composition rather than merely spacing. The AQ overlay is labeled “AQI จุดนี้”: CAMS modeled US AQI at a selected point, never a regional heatmap. Acceptance checks use 375×667, 390×844, 430×932, tablet and desktop: all mobile sheet states in light/dark, unobstructed map space, visible default temperature/condition, overlay intersections, attribution and actual touch/keyboard map interaction.
