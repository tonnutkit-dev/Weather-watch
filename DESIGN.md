# Weather Watch — visual source of truth
Derived from TON’s approved 11 October 2026 reference (98BBBF19-B3AB-4BDA-B7EF-0501E6DD797D.jpeg). The image is a direction, not authority for values, map labels, unsafe claims or layout artifacts.

## Personality
Premium Minimal Weather Intelligence: calm, spacious, refined consumer software. Primary blue, restrained glass for floating map controls. No photographic scenic background, giant sidebar, fake safety badges or heavy neon.

## Tokens
| Token | Light | Dark |
|---|---|---|
| background | #f3f7fc | #08121f |
| surface | #ffffff | #101e30 |
| raised | #f6f9fd | #17273d |
| text | #12233e | #eef5ff |
| secondary | #60728c | #a8bad0 |
| border | #e1e9f3 | #263b53 |
| accent | #1769ee | #68a9ff |
| accent soft | #e9f2ff | #173353 |
| warning | #99620b | #ffd087 |
| danger | #b43d3d | #ffaaaa |
All actual colors use CSS variables. Warning colors only for actual interpreted conditions or uncertainty. Typography: locally bundled Noto Sans Thai (SIL OFL); system Latin fallbacks. Display 64px desktop / 48px mobile, headings 20–24px, body 14–16px, product metadata 12px; standard map attribution/technical provider tags can be smaller. Tabular numerical values. Weight 400/500/600/700.

Spacing 4/8/12/16/20/24/32/40px. Radius 10px controls, 16px subcards, 24px panels. Shadow light 0 12px 40px rgba(22,48,82,.09); dark minimal. Lucide outline icons (ISC) at 18–22px; custom SVG weather symbols with sun/cloud/rain shape, accessible textual conditions alongside.

## Responsive rules
>=1000px: full-height map with a 370px right situation rail; slim top header and inline country/China shortcuts. 760–999px: 330px rail with wrapping header. <=759px: compact two-row header, full map, compact top-left selected location; bottom situation sheet overlay. No bottom tab bar. Sheet heights 200px + safe area / 52dvh / 82dvh, bounded by available map. Safe-area insets; 44px buttons. A draggable handle uses pointer capture; explicit buttons and keyboard arrow controls are equivalent. Scroll only sheet content, never capture map drags. Radar strip moves above current sheet; can hide strip without disabling map.

## Components
Brand: 38px blue icon and two-line wordmark. Search: pill-shaped button opens accessible modal with local province results and debounced remote Thai-place search, explicit limitations, secondary China row. Weather: location, large temperature, weather SVG, high/low, model/time label, three compact metrics. Forecast: next 2h/24h/3d/7d controls, actual temperature line and accessible values, horizontal hourly cards; 16-day optional list. Environmental cards: PM/US AQI and honest flood/alert unavailable states with official links. Map: Positron / Dark OpenFreeMap, actual radar rasters under labels where possible, functional layers, opacity slider, intensity legend (RainViewer scheme 2), zoom/location controls and always visible attribution. Radar labels say historical frame-generation time, not forecast or exact station measurement time.

## Motion and accessibility
150–220ms opacity/transform transitions, sheet 240ms, map location move ~700ms; no ambient animation. prefers-reduced-motion removes transitions and map flights; radar never auto-plays. Theme follows matchMedia and updates on OS change, manual choice persists. Inline pre-paint theme script prevents flash. Keyboard focus rings, semantic buttons/dialogs, aria-expanded/pressed, Escape closes modals, focus returned to opener, field labels, non-color-only status, chart text/table, readable source links. Zoom allowed, native browser scrolling preserved.

## Implemented compatibility adaptation
WebGL-unavailable devices use Leaflet/OpenTopoMap 2D tiles. The relief basemap is busier than the approved image; this is an explicit compatibility fallback, not a substitute claim for primary MapLibre visual QA. Themes transform only this fallback basemap; real radar colors remain unchanged. Primary OpenFreeMap cartography still needs WebGL/device visual validation. Smaller technical map credit remains always available; product forecast/current metadata stays readable.
