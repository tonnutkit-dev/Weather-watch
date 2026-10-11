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
