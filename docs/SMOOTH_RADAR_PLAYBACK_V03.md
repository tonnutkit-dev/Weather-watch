# Weather Watch V0.3 — Smooth radar flipbook

Scope: isolated experience correction, preserving the verified P0 application. No main merge or v0.2 Pages update. Evidence and final deployment results will be added after execution.

## Verified starting refs

- Repository: https://github.com/tonnutkit-dev/Weather-watch
- Protected main: `2036e2ac788cb31d25fd387cb40520ad95c408a6`.
- P0 branch handoff: `97d700346783590d4c75f7e7bb6a972447c2d627`.
- Current deployed application before this work: `b17c5a5e1af4900cd9aba80cb1488f6447bf450f`.
- New isolated branch: `work/radar-smooth-playback-v03`, based on 97d7003.
- Owner QA: https://weather-watch-v03-p0-owner-qa-ton.tonnutkit.chatgpt.site/

## Investigation before production changes

VERIFIED source: current controller has a 1,500 ms first step and 5,000 ms subsequent deadline. It polls readiness only while foreground play intent exists, every 500 ms. Progress requires matching current generation, qualified transport evidence and remaining request capacity. It never establishes complete visible pixels.

OBSERVED owner video evidence supplied by Lead: selected timestamps advance by ten historical minutes approximately every five playback seconds over six consecutive selections; Play changes to Pause and imagery changes. This is an experience issue, not a repeat of the old 15-second scheduling failure.

VERIFIED renderers: MapLibre keeps its instance and single raster source, updates `setTiles`, and uses `raster-fade-duration: 0`. Leaflet reuses its layer and decodes genuine PNGs, aborts unloaded tiles and revokes object URLs. No weather-frame interpolation or crossfade exists. Presentation gate tracks pending, failure, supersession and viewport changes, with `displayedTime: null`.

VERIFIED cache constraints: successful images reuse a five-minute, 90-entry URL cache. Concurrent identical requests before the first cache fill are not coalesced (existing budget test documents this). Introducing prefetch would add another request consumer and could duplicate in-flight work. Safe next-frame preparation also requires exact viewport tiles in both renderers. This scope will first benchmark existing demand-loading and cache reuse. **No prefetch is justified solely by an assumed benefit.** Keep the request/security/cache contract and renderer lifecycle intact unless measurements prove a narrowly scoped change necessary.

Baseline diagnostics are isolated from production: actual public HTTPS, real providers, Chromium, WebKit and forced Leaflet + Reduced Motion. PNGs from map-only clips exclude timeline/status controls. They compare actual RGB pixel changes (>8 channel levels), require multiple distinct visible image changes, and use a radar-hidden stable-basemap control. This establishes sampled perceptible changes, not pixel-complete coverage or no-rain conclusions. Requests, intervals, rAF spacing, browser errors, active canvas/map-host retention and available heap metrics are recorded. GitHub Actions does not deploy.

## Independent audit amendment (P1)

The Lead supplied a later independent source audit of b17c5a5. That audit did not rerun the complete suites. Findings are verified below, not accepted as blanket claims.

1. Timestamp vs pixels: CONFIRMED limitation, MITIGATED by qualified selected-time labels and null displayedTime; real map-only PNG comparisons now demonstrate sampled visible changes. They never assert complete coverage.
2. Dwell expiry during buffering: CONFIRMED by fake-clock reproduction; MITIGATED by a separate readiness epoch. A late decoded/qualified frame must remain qualified >=750ms before advancing. Viewport/key changes reset this epoch; no catch-up. This is readiness dwell, not a claim of GPU/viewport pixel commit.
3. GL transport before decoding: CONFIRMED by protocol inspection; CORRECTED by decoding genuine bytes before successful cache/transport qualification. Bitmap resources close; fallback URLs revoke. Corrupt bytes cannot enter successful cache. A later MapLibre raster decode/render error rejects the current gate; viewport pixels remain unverified.
4. Leaflet zoom cleanup: CONFIRMED Leaflet tileabort path differs from tileunload and can replace src first; CORRECTED by separately owned resources, tileabort+tileunload+layer-remove cleanup. Cancellation rejects obsolete transport. Tests cover replaced src and late completions.
5. Cached playback at zero network budget: CONFIRMED controller precheck; CORRECTED by allowing qualified cached frames to advance. Missing imagery then waits in budget state; the shared transport still prevents the 81st request. Cache hits decode once on admission and consume no new start.

The recommended one-next-frame preparation is not ported automatically: it adds an extra request consumer, current in-flight duplication and viewport bookkeeping. This revision preserves the single-source demand-loading architecture, fixes the separate dwell clock and measures whether it sustains the requested cadence. Old imagery may temporarily be absent while an uncached selection loads. Preparing one frame while retaining the previous image is a focused follow-up if measured slow-network buffering warrants it; no synthetic interpolation/crossfade is introduced.
