# WEATHER WATCH — proposed controlled V0.3 corrections

**PROPOSAL ONLY. Implementation, main merge and deployment are not authorized.**

Owner: TON. Production baseline: 2036e2ac788cb31d25fd387cb40520ad95c408a6.
Audit execution: 9933e4383e899be752667021fa3dd24e6f067a1d.
Evidence: PERFORMANCE_BASELINE_V03.md and Actions run38122422039.

## Phase 1 — P0 Reliability Corrections

After Lead/owner authorization, create a separate correction branch. Preserve providers, provenance, historical single RainViewer source, rolling80/min cap, cache, attribution and Leaflet fallback.

R01: separate requested/pending/rendered/failed frame state. Bind acknowledgement to frame plus viewport/style generation and successful visible tile lifecycle; ignore superseded work. Retain last verified imagery time while loading. Handle partial coverage, failures and both renderers. isSourceLoaded alone is not pixel proof. No nowcast, extra raster source or unsolicited prefetch.

R02: explicit source-age deadlines and cache/refresh status; reevaluate conservative situation when inputs expire without requiring interaction. Fetch time must never relabel original provider times. Review bounded foreground/resume refresh against provider terms, shared-IP budgets and energy cost. R02/P03 may share one reviewed status PR: cached readings only with unmistakable age/failed-refresh labels and conservative verdicts.

P02: measure connection/TLS stalls separately from response/render delay. Preserve bounded retry, cancellation and independent map. Do not blindly lengthen timeout, multiply retries or increase polling.

Acceptance: repeat4s-delayed historical radar and503 cases twice; pending/failed imagery never labeled verified. Clock-aging tests at source2h/3h deadlines and resume show expiry without interaction; manual refresh preserves original timestamps. Offline/timeout/partial failures preserve map. Original49 tests,6 contracts and E2E; deterministic failure assertions separate from live flakes. Record before/after time/status/request/frame measures. No Design C.

## Phase 2 — P1 Performance Optimizations

Benchmark P01 actual host resize separately from sheet occlusion. Avoid unconditional map resize when only sheet height changes; deduplicate/coalesce inset work while preserving camera continuity, credits and markers. REA B remains Conditional GO and needs review. P04 marker sync deduplication only with measured benefit. P05 in-flight cache coalescing requires real duplicate workload evidence and subscriber-safe cancellation.

Acceptance: matched source/data/network/cache/browser profiles. Measure method counts, rAF distribution, task/layout deltas, instance count, budgets and geometry. Improvement must be measured afterward; no60FPS claim from CI softwareGPU. Verify375/390/430 mobile, tablet/desktop, themes, three sheet states, fallback and reduced motion. No visual redesign.

## Phase 3 — Design C Integration

Requires explicit owner integration authorization after reliability/performance review. Adopt selected Signature Hybrid/The Weather Edit tokens/hierarchy into production lifecycle. Never port prototype map recreation on direction/theme/location, demonstration values/rain or three-map gallery. Shell/typography first, then sheet/controls, then cartography/charts; benchmark each geometry/style step. REA C remains HOLD: static inexpensive surfaces first.

Acceptance: preserved real data/history, truthful timeline, one persistent map, unchanged budget, visible credits, mobile/accessibility regression matrix and matched performance measures. PR only until merge/deploy authorized.

## Phase 4 — Real-Device Acceptance

Physical iPhone Safari/Chrome, device/iOS/browser recorded: cold/warm load, pinch/pan/radar, sheet touch/scroll, keyboard/safe areas, reduced motion, actual offline/online and background/resume,10–20min comparable-state soak. Capture available console/network/render evidence and battery/thermal observations; never invent quantitative battery or GPU metrics. Owner visual/product acceptance follows.

## Gate and phase isolation

Do not combine automatically. R01/R02/P03 can share approved freshness semantics; map geometry optimization and visual integration remain separate to attribute regressions. Preserve main2036 and exploration19ec. This proposal does not authorize its own execution.
