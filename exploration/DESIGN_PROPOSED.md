# Weather Watch — proposed design system (UNAPPROVED)

Exploration only. This file does not supersede the production DESIGN.md. Adopt a winner only after TON approves a direction; implementation must retain original provider provenance, real radar color interpretation and warning semantics.

## C — recommended foundation, 70% editorial / 30% atmospheric

| Token | Light | Dark |
| --- | --- | --- |
| paper | #f0f2ed | #13272b |
| surface | #fbfcf8 | #1b3236 |
| raised | #e8ede8 | #263e41 |
| ink | #203d3e | #f0f2e9 |
| secondary | #607674 | #adc0bb |
| border | #d5dfd9 | #3a5151 |
| accent | #235f75 | #a2ccd0 |
| accent soft | #dce9e9 | #324f55 |
| on accent | #ffffff | #153035 |
| illustrative water | #d3e1e8 | #152732 |
| illustrative land | #ecede7 | #25343a |
| warning | #936821 | #e2bf7a |

A uses paper #f6f5f1 / #142129, surface #fffefb / #1b2b34, ink #172d37 / #eef1eb and accent #246785 / #9cc6d7. B uses paper #edf4f5 / #0e202f, surface #f5f9f9 / #163247, ink #173d54 / #eef7fa and accent #23668e / #9dcbe6. All live warning/radar colors must remain provider-validated: the rain-color study is not a license to recolor numerical radar intensities without a validated legend.

## Typography and rhythm

Bundled Noto Sans Thai 300/400/500/600 (SIL OFL); Latin/numerical display uses system Arial, tabular values, tight large numeral kerning. Mobile display 91–99px, short screen 81px; desktop 125–167px. Thai location 17px mobile / 21–25px desktop; section heading 15–22px; primary condition 13–14px; body 13–15px; contextual disclosure 11–12px. Tiny Latin edition labels are decorative hierarchy only; never use them as the sole indication of data type/status. Source attribution remains a provider-readable technical exception and is always available.

Scale 4/8/12/16/20/24/32/40/64px. A: rules and 5–9px corner treatment. B: 22–24px islands and round radar dock. C: 17–22px primary surface, 12–14px controls, 10–12px forecast/PM grouping. Avoid a card for every metric. Use one subtle 8px/26px shadow where separation is necessary; C map/radar borders often replace shadow.

## Map and controls

Real WGS84 vector map. Local regional context near selected coordinates, secondary road lines muted, buildings/POIs and unnecessary tertiary labels hidden; major roads, borders and meaningful places retained. MapLibre gestures and keyboard remain functional. Navy/teal water in dark, desaturated blue water in light; map and UI share contrast and hue. Do not flatten provider radar intensities into decorative color blobs in production.

One layers capsule and one recenter target, each ≥44px. Prototype rain layer changes real map visibility; its illustrative nature is persistent. Attribution moves with the sheet and must not be hidden. Future official flood/warning layers retain their own legends and provenance.

## Mobile and sheet

≤759px: one 56px header plus safe top inset, 25px demo disclosure (exploration only), weather overview around 172–190px, genuinely interactive map in the middle, 128–140px outlook sheet. At 375×667, hero reduces to 157px and radar to 64px. C has one temperature at the top, no duplicate temperature marker. Map uses a 12px side inset, preserving broad usable space and a quiet surface boundary.

Sheet: collapsed / half / expanded. Expanded height derives from viewport minus header, weather hero and at least 105px of map/control space; it cannot cover the weather summary or essential map controls. Half remains distinct, using 43dvh capped at expanded minus 40px. Bottom safe area is applied once. Gesture handle, explicit up/down buttons, modal focus return and scrolling are required. Expanding pauses/hides radar and lifts map credit above the sheet. Controls never share the sheet drag surface.

≥760px: actual desktop/tablet compositions, not mobile stretched. A/C: roughly 285–380px editorial weather column with map/outlook on the right, no giant navigation sidebar. B: map is the background; separate floating weather and detail islands, expanded detail relocates to a non-overlapping right position. Tablet preserves independent map and readable weather hierarchy. At very short desktop heights, page scrolling is preferable to clipping content.

## Forecast, AQ and trust

Use fine temperature line plus a clearly differentiated rain-probability channel; chart summary and visible hourly values. Native hourly/daily switch. Point AQI carries the named US standard; PM2.5 has µg/m³. Display a real modeled/forecast/observed badge after integration. No demo labels may disappear while fixtures remain in use. No flood-free verdict or official warnings are generated in exploration.

## Motion, accessibility, performance

No ambient or continuous decorative animation. Buttons 150ms; modal 160ms; sheet 200ms; map recenter ≤350ms. prefers-reduced-motion removes transitions, modal animation and camera easing. Radar/illustration playback starts only after user action and stops when the mobile sheet opens.

Semantic headings, native dialogs, Escape and focus return, visible 3px focus outline, labeled 44px icon buttons, accessible chart summary, preserved native map keyboard/touch interaction and sufficient foreground contrast. Manual theme persists in its isolated key; System follows OS events, with a pre-paint script. Test Light and Dark independently rather than color-inverting.

One MapLibre canvas per full-screen prototype, locally served worker/font assets, no new dependency, no backdrop blur, no per-frame atmospheric effect, no API polling. The comparison gallery mounts three maps for owner review only; it is not a proposed product route. Real-device FPS, Safari font metrics and VoiceOver remain owner checks. Choosing C must not delay the upcoming Data Reliability and Performance milestone.

## Safe integration after owner selection

1. Freeze selected tokens/typography and baseline screenshots in a dedicated implementation PR.
2. Apply shell/current-summary styling while retaining exact weather/provenance/provider data flow.
3. Introduce supported basemap cartography and compact radar skin using real frame times and validated color legend.
4. Apply forecast/AQI hierarchy and sheet-derived control insets; remove demo fixtures/routes from the product build.
5. Execute original integration regression suite plus the mobile collision matrix, real radar/API/offline checks and owner iPhone QA before merging to main.
