# Visual audit — baseline 2036e2a

Inspected production DESIGN.md, source layout/styles, actual deployed mobile light/dark and desktop screenshots from the V0.2 release, and TON's supplied IMG_4515.jpeg reference. Remote main was verified as 2036e2a before creating this branch. The owner reference is inspiration, not an image of the current Weather Watch app and not authority for weather values.

| Area | Retain | Redesign / remove |
| --- | --- | --- |
| Typography | Thai-capable bundled Noto Sans Thai; tabular values | Temperature should anchor the view, with quieter supporting metrics; currently many medium/bold rows have similar prominence |
| Brand | Weather Watch name; blue as the key accent | Explore an ownable compact weather/wave mark and deliberate typography, avoiding generic app-icon/card combinations |
| Color | Light/Dark/System and semantic warnings | Replace cold white/blue accumulation with a disciplined paper/sage/atmospheric family; reserve accent for action and data |
| Map | Real MapLibre, responsive camera, provenance and attribution | Roads and country labels currently dominate; simplify local context, mute tertiary labels and harmonize water/land with the UI |
| Mobile summary | Immediately legible once; uncertainty wording | Explore a weather-first header section so users do not need to look to the bottom for the primary temperature |
| Situation sheet | Three states, drag, accessible buttons, scrolling | Use outlook hierarchy and grouped details rather than visually equivalent cards; manage map/control insets together |
| Radar | Compact real playback and full disclosure in production details | Integrate a quieter 64–70px dock; keep timestamps distinct from forecast times and expand explanations only when asked |
| Forecast | Real hourly/daily controls, chart summaries | Fine line chart and rhythmical hourly columns, fewer nested surfaces; clearly separate temp trends from rain probabilities |
| Air quality | Point-based modeled US AQI label | Give the index one clear numerical anchor and PM values subordinate hierarchy; no continuous heatmap suggestion |
| Controls | Contextual layers and recenter; touch/keyboard zoom | One consistent control capsule, restrained shadow, no new navigation bar or permanent second-region row on phones |
| Dark | Complete token system and system following | Actual existing dark map is near charcoal while UI is blue; use a cohesive low-chroma navy/teal map and layered surfaces |
| Desktop | Map plus contextual weather panel | More intentional editorial proportions; weather, spatial context and outlook need distinct hierarchy rather than evenly weighted dashboard cards |

## Three deliberately different compositions

**A — Premium Editorial Calm.** Paper-like neutral canvas, serif display numerals and a reversed mobile weather-art composition, low-radius map, thin rule divisions and linear modules. Desktop is an editorial left column paired with a restrained map; mobile feels like a weather edition before entering the map. Strength: calm, very readable, inexpensive. Tradeoff: restrained brand memory and less immersive spatial personality.

**B — Atmospheric Map Premium.** Map fills the desktop composition; a weather island floats on the left and expanded contextual detail relocates to the right. Mobile uses edge-to-edge map, atmospheric blues and a rounded radar dock. Strength: spatial immersion and unmistakable weather context. Tradeoff: more floating surfaces and greater collision/contrast complexity on small phones; map focus can compete with editorial hierarchy.

**C — Signature Hybrid / The Weather Edit.** Off-white/sage surfaces, a blue-teal action accent, distinctive large numerals, an airy framed map and quiet segmented outlook. Desktop places a composed weather edition beside the map rather than a navigation sidebar; phone puts one temperature above the map and uses the sheet for what comes next. Intended ratio: 70% editorial / 30% atmospheric. Provisional recommendation: C, subject to actual screenshot inspection and owner choice.

No third-party product has been copied. References inform scale, hierarchy and atmosphere; illustrations are lightweight source SVG, not generated concept art or copied weather product assets.
