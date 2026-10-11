# V0.3 performance / reliability audit — investigation only

Owner: TON. Production baseline: `2036e2ac788cb31d25fd387cb40520ad95c408a6`.
Approved Design C reference: `19ec27ce5abc338a65cf368d17f6d3abbf884840`.
Branch: `work/performance-reliability-baseline-v03`. No merge or deployment.

## Reproduce

Node 24, Chromium via Playwright, Internet access to the existing public providers.

```sh
npm ci
npm run typecheck
npm test
npm run build
npm run verify:pages
npx vite build --config audit-v03/vite.diagnostic.config.ts
npx playwright install --with-deps chromium
WW_AUDIT_SUSTAIN_MS=600000 node audit-v03/run-baseline.mjs
npm run test:e2e
```

The script starts loopback-only preview servers on 4173 (unchanged production
build) and 4175 (non-shipping diagnostic build). It writes JSON, screenshots and
Playwright traces under ignored `audit-v03/raw/`. The dedicated Actions workflow
has read-only repository permissions and no Pages/deploy job.

## Evidence boundaries

* Startup uses the exact unchanged production source and configuration. Browser
  PerformanceObservers collect paint, LCP candidates, layout-shift session windows,
  long tasks and Event Timing. Three repetitions per profile/cache combination:
  desktop normal, 390×844 mobile normal, and simulated 150ms/1.6Mbps down/750kbps
  up with 4× CPU throttling. Cold cache is cleared in a fresh browser context;
  warm is a reload in the same context with HTTP cache/local preferences retained.
  React Query has no disk persistence: warm navigation still creates a new client.
* Each startup observes 12 seconds after DOMContentLoaded. Late/pending requests
  are retained; missing values remain null. LCP here is lab paint, not iPhone RUM.
  Load n=3 supports median and min/max, not a meaningful population p95. Report
  frame p95 only for actual interval samples and state the sample count.
* `windowedBlockingMs` is a 12-second windowed long-task calculation after FCP,
  **not standardized Lighthouse TBT/TTI**. INP stays null: representative field
  interaction data is absent. CDP encoded transfer bytes are distinct from raw
  and theoretical gzip bundle sizes.
* Diagnostic Vite transform exposes the existing MapLibre/Leaflet instance and
  QueryClient; adds render counters and observational method/event hooks. It
  does not replace provider logic, timeout, retry, cache, budget, camera or map
  implementation. These hooks add overhead: interaction numbers are an
  instrumented baseline, not an uninstrumented-device guarantee.
* rAF intervals approximate scheduling, not actual screen/GPU presentation.
  The 60Hz missed-vsync calculation is a heuristic. Frame buffers are bounded to
  6000 entries and map-event buffers to 15000; cumulative counters cover the whole
  session. Forced-GC heap samples also include telemetry and test tool overhead.
* MapLibre `render` + `isSourceLoaded` is a source-complete candidate signal,
  **not pixel-level proof that every selected-frame tile is visible**. Error events,
  tile network records and screenshots must be inspected together. Incomplete,
  failed or rate-waiting frames must never be counted as verified imagery.
* Controlled reliability cases replay actual captured Open-Meteo/CAMS/RainViewer
  JSON in isolated browser contexts. No fabricated weather is inserted into a
  shipping view. Slow/timeout/503/offline results are failure-injection evidence,
  not provider uptime estimates. Captured timestamps remain original.
* Three-hour session aging uses Playwright clock; it is separate from the actual
  10-minute sustained real-time run. Synthetic visibility inputs test handlers;
  CDP freeze/restore tests lifecycle recovery, not physical iOS suspension.
* JavaScript heap, DOM/listeners and canvas counts are measurable. GPU memory,
  iPhone battery, thermal behavior, Safari, VoiceOver and on-screen iOS keyboard
  remain unverified without physical-device evidence.

## Official reference checks

* https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults
* https://tanstack.com/query/latest/docs/framework/react/guides/window-focus-refetching
* https://www.rainviewer.com/api/weather-maps-api.html
* https://www.rainviewer.com/api/transition-faq.html
* https://open-meteo.com/en/terms

Fresh audit confirmed staleTime and refetchInterval are separate controls;
RainViewer historical-only access and 100/IP/min restriction; Open-Meteo free
non-commercial limits 600/min, 5000/hour, 10000/day. The app's stricter rolling
80/min radar budget and cache are preserved. No polling correction is authorized.

## Analyze retained evidence

Download the successful Actions artifact, extract audit-v03/raw, then run:

```sh
python3 diagnostics-v03/analyze-results.py /absolute/path/to/raw /absolute/path/to/summary
npx vitest run --config vitest.audit.config.ts
```

Analyzer writes JSON/18-rowCSV without changing inputs. Extra contracts are audit-only. Summary comes from run38122422039 at diagnostic9933e4383e899be752667021fa3dd24e6f067a1d. Earlier run38122215165 failed before profiling due shallow history. Final E2E7 first passes+2 retry passes remains flaky. Inspect results.failures because the harness catches stage errors.

Contexts share runner IP: aggregate radar peak112/min despite individual sessions below80. Pace future contexts globally below provider IP guidance; do not infer application budget failure or uptime from aggregate traffic.
