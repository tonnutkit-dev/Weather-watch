# Weather Watch — isolated visual exploration

Design exploration only. Starts from production `2036e2ac788cb31d25fd387cb40520ad95c408a6`; main and the public QA app are preserved. No original application source, providers, package dependencies or production DESIGN.md are changed.

## Run

From the repository root (Node 24):

```sh
npm ci
npx tsc -p tsconfig.exploration.json --pretty false
npx vite build --config vite.exploration.config.ts
npx vite preview --config vite.exploration.config.ts --host 127.0.0.1 --port 4174
```

Open `http://127.0.0.1:4174/` for the comparison gallery. Full-size prototypes:

- `/prototype.html?direction=a&theme=light` — A Premium Editorial Calm
- `/prototype.html?direction=b&theme=light` — B Atmospheric Map Premium
- `/prototype.html?direction=c&theme=light` — C Signature Hybrid

Change `theme=dark` for Dark or `theme=system` to follow OS appearance. Preferences use an exploration-specific storage key; they cannot overwrite production appearance preferences. URL overrides are intentional for reproducible owner review. The gallery toggles all three previews together and can open each prototype at full browser size. Relative asset paths work when this build is hosted in an isolated subdirectory. These routes do not exist on the current public QA website.

## Truth boundary

**Weather, forecasts, AQI, rain shapes and playback times are demonstration data**, explicitly labeled throughout the UI. No weather API or RainViewer API is called. Aqi 62 is a demo of a point-based US AQI presentation; it is not a regional heatmap or actual measurement. No safety verdict, flood claim or official warning is fabricated. The date/time is a fixed design study fixture, not a current timestamp.

The map is genuinely interactive MapLibre, using OpenFreeMap's Positron vector style and source attribution. Style adaptation changes only this prototype's visual palette and label hierarchy. The blue polygons are explicitly illustrative. The play button changes illustration opacity, not real radar frames. Production RainViewer, forecast, AQI, Thailand-wide selection and provenance code remain unchanged.

The prototype selector exposes five cities for layout testing; this is not a replacement for the application's 77-province selector. Selecting a location changes the real map coordinates, while demo weather values remain labeled examples. No precise user location is requested or stored.

## Controls

- Search opens an accessible native dialog with five demo locations.
- Settings offers System / Light / Dark, persistence and OS-change handling.
- Layers actually toggles the illustrative rain polygon layer.
- Recenter returns the map to the selected coordinates.
- Pan, pinch zoom, keyboard arrows and +/- are native MapLibre controls.
- Sheet has collapsed/half/expanded states, drag handle and accessible buttons; details scroll.
- Playback pauses and disappears when the mobile sheet grows; map attribution is repositioned above it.
- Forecast tabs switch hourly/daily views; graphs have text summaries.
- Radar details disclose the exact demonstration boundary. Escape closes dialogs and focus returns.

## QA

```sh
npm run typecheck
npm test
npm run build
npm run verify:pages
npx playwright test --config exploration/playwright.config.ts
```

The dedicated `design-exploration.yml` runs on this exploration branch only. It has read-only repository permissions and **no deployment job**. Browser screenshots are actual Chromium renderings of the built prototypes, with real basemap requests; metadata records rectangles and runtime errors. Matrix: 375×667, 390×844, 430×932, 820×1180 and 1440×1000, all directions and both themes. Physical iPhone, Safari, VoiceOver and sustained real-device FPS remain owner QA. See QA_RESULTS.md after the browser run and DESIGN_PROPOSED.md for unapproved tokens.
