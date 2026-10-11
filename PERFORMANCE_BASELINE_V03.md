# WEATHER WATCH — PERFORMANCE BASELINE V0.3

Owner: TON · investigation only · 11 October 2026. Decision: **NOT READY — CORRECTIONS REQUIRED**.

## 1. Executive Summary

The current v0.2 production source was measured, not redesigned. All six profiling stages completed; 18 cold/warm production loads, 14 reliability/fallback cases, and a **600,444 ms real-time sustained run** produced network ledgers, screenshots and traces. Two independently repeated P0 truth defects block Design C integration: the radar time names a requested frame before imagery is ready, and an aged weather/AQ situation remains displayed without expiry-driven reevaluation. No production correction, merge or deployment was performed.

The persistent map lifecycle is worth preserving: one map instance and one canvas remained after theme/location/sheet/radar exercises. Normal mobile lab startup was fast, but this is not iPhone acceptance: throttled cold loading had a 12.352 s LCP outlier, and all three throttled cold runs had not reached the app's map-ready status inside the capture window. Sheet/map layout amplification and real HTTPS connection stalls need controlled follow-up. CI success includes **7 first-attempt E2E passes and 2 flaky tests that passed retry**, not nine consistent first-attempt passes.

Evidence labels throughout: **MEASURED** = instrumented actual browser/test evidence; **OBSERVED** = reproduced visible behavior; **INFERRED** = inspection-supported explanation; **UNVERIFIED** = needs more testing. Proposed benefits are hypotheses, never claimed improvements.

## 2. Source Integrity Verification

| Item | Verified value |
| --- | --- |
| Repository | https://github.com/tonnutkit-dev/Weather-watch |
| Latest remote main and tested production source | `2036e2ac788cb31d25fd387cb40520ad95c408a6` |
| Approved Design C exploration | `19ec27ce5abc338a65cf368d17f6d3abbf884840` |
| Audit execution commit | `9933e4383e899be752667021fa3dd24e6f067a1d` |
| Isolated investigation branch | `work/performance-reliability-baseline-v03` |
| Successful profiling run | https://github.com/tonnutkit-dev/Weather-watch/actions/runs/38122422039 |
| Existing public QA | https://tonnutkit-dev.github.io/Weather-watch/ |

MEASURED: `git diff --exit-code origin/main HEAD -- src package.json package-lock.json vite.config.ts DESIGN.md .github/workflows/pages.yml` passed locally and in CI. Protected production files are unchanged. Exploration assets were read from their approved commit and were not edited or merged. The investigation workflow has read-only repository permissions, is audit-branch-specific and has **no deployment job**. Main/Design C heads were independently checked with `git ls-remote` after profiling. Final report commits are descendants of the audit execution commit; the handoff records their separately verified SHA.

## 3. Performance Scorecard

Environment: GitHub Actions ubuntu-latest, Linux 6.17.0-1022-azure, AMD EPYC 7763, four logical CPUs, 16.77 GB RAM; Node v24.21.0; headless Chromium **156.0.8078.4**, SwiftShader software GPU. Production startup used unchanged `dist`; interaction tests used an isolated diagnostic build exposing existing map/query objects and observation hooks. Those hooks and tracing add overhead.

| Indicator | Actual result | Interpretation |
| --- | --- | --- |
| Normal mobile cold LCP | median 0.684 s, range 0.680–1.020 s, n=3 | Lab paint target met in these samples; canvas content/data completeness excluded |
| Throttled mobile cold LCP | median 1.904 s, range 1.260–12.352 s, n=3 | Tail unreliable; one sample painted only loading/secondary UI |
| CLS | all 18 samples ≤0.0754 | Within 0.1 target in captured windows |
| INP | null / UNVERIFIED | No representative field interaction sample; not invented |
| Standard Lighthouse TBT | NOT MEASURED | Available long-task blocking sum is a windowed diagnostic, not TTI-bounded TBT |
| Normal mobile cold blocking sum | median 269 ms, n=3 | After-FCP long-task excess in capture window |
| Throttled mobile cold blocking sum | median 926 ms, n=3 | CPU/network simulation; requires isolated cause measurements |
| Map instances after sustained use | 1 | Lifecycle retained; not proof of GPU stability |
| Radar per-session peak rolling minute | 78 observed interaction / 30 sustained | App 80/min cap preserved in tested sessions |
| Data truth | 2 P0 issues repeated twice | Gate corrections before visuals |

No aggregate synthetic performance score is assigned. Load n=3 supports median/range, not a credible population p95. Frame p95 below uses actual interval samples and is not physical-device screen FPS.

## 4. Cold/Warm Load Results

Desktop: 1440×1000, unthrottled runner network/CPU×1. Mobile: 390×844, touch/mobile emulation, DPR1. Throttled mobile: CDP 150 ms latency, 200,000 B/s download (1.6 Mbps), 93,750 B/s upload (750 kbps), CPU×4. Three repetitions/profile/cache; **18 total**. Cold clears HTTP cache in a fresh context. Warm revisits in the same context, preserving HTTP cache/local preference; QueryClient is recreated and weather cache is not disk-persisted. Capture waits 12 s after DOMContentLoaded, so wall time can exceed 12 s after navigation.

Time columns are seconds, median (min–max). Weather/map counts show visibility/app-ready **within the actual capture window**, not a permanent failure.

| Profile | Cache | FCP s | LCP s | CLS median | Blocking sum ms | Weather visible | Map ready |
| --- | --- | --- | --- | --- | --- | --- | --- |
| desktop-normal | cold | 0.140 (0.124–0.176) | 0.140 (0.124–0.176) | 0.0689 | 845 | 2/3 | 3/3 |
| desktop-normal | warm | 0.072 (0.068–0.080) | 0.072 (0.068–0.080) | 0.0635 | 673 | 2/3 | 3/3 |
| mobile-normal | cold | 0.096 (0.092–0.104) | 0.684 (0.680–1.020) | 0.0115 | 269 | 3/3 | 3/3 |
| mobile-normal | warm | 0.052 (0.044–0.056) | 0.196 (0.192–0.288) | 0.0000 | 236 | 3/3 | 3/3 |
| mobile-4g-cpu4 | cold | 1.260 (1.248–1.268) | 1.904 (1.260–12.352) | 0.0114 | 926 | 2/3 | 0/3 |
| mobile-4g-cpu4 | warm | 0.584 (0.580–0.588) | 0.896 (0.580–0.904) | 0.0115 | 598 | 2/3 | 3/3 |

MEASURED: normal mobile cold map-ready median **1.326 s**, warm **1.018 s**; throttled warm **4.082 s**. Throttled cold map-ready is censored (0/3), not a zero/estimated duration. Desktop weather missing in one cold/warm pair and throttled weather missing in one pair; successful-only weather medians must not conceal them.

Payload: entry `index` JS **407,447 raw / 130,333 theoretical gzip bytes**; MapLibre chunk **1,042,633 / 284,484**; worker **508,314 / 144,769**; lazy Leaflet fallback **156,734 / 46,092**. Initial CDP Script transfer median **418,300 bytes** cold, distinct from raw/gzip and excluding worker request types. All-resource cold transfer medians: desktop **2,353,302 B**, normal mobile **1,972,589 B**. Warm normal mobile cache hits and transfer are recorded per sample in CSV/JSON; transferred totals cover completed requests in the window, not eventual page bytes.

MEASURED network separation: throttled cold run2 weather took **10.941 s** request-to-finish, response first byte **10.650 s**; CDP connectEnd was **10.401 s**, sendStart **10.401 s**, headersStart **10.502 s**. Most delay was connection/TLS setup in this environment; not evidence that Open-Meteo computation took ten seconds. Separate scratch HTTPS probes returned public QA HTTP200 three times with TTFB 7.08–7.28 s, TLS completed 6.81–7.06 s: environment transport overhead, not frontend LCP. Do not compare those probes directly with loopback startup.

## 5. Map Performance Findings

MEASURED: MapLibre initialized and interactive; six pans, repeated wheel zoom, synthesized touch pinch, four theme changes, real Xi’an switch, sheet cycles, radar activity, lifecycle freeze/restore, orientation resize and reduced-motion exercise completed. Map remained instance1/canvas1. Themes caused one `setStyle` each (five total including initial effect); location used `flyTo`, not recreation. Layers/sources were reintroduced after style changes as expected.

| Diagnostic phase | Intervals n | Median ms | p95 ms | Max ms |
| --- | --- | --- | --- | --- |
| Continuous pan | 558 | 33.4 | 50.1 | 83.3 |
| Repeated wheel zoom | 121 | 16.7 | 50.0 | 50.1 |
| Synthesized touch pinch | 30 | 50.0 | 133.3 | 149.9 |
| Theme dark, repeat1 | 104 | 16.7 | 100.0 | 183.3 |
| Theme dark, repeat2 | 94 | 16.7 | 116.6 | 166.7 |

These are rAF scheduling intervals on a traced software-GPU runner, not a measured 60 FPS iPhone result. Continuous pan main-thread task delta 18.814 s in a 20.215 s phase, but script delta only 0.636 s and one layout: INFERRED substantial native map/render work rather than React/layout alone. CDP task counters can straddle phase boundaries; do not treat them as exact exclusive CPU percentages.

OBSERVED: radar/style/location activity did not permanently lock the map; dark/light and selected location survived tests. INFERRED: initial constructor style plus mount theme-effect `setStyle` may duplicate initialization work; this audit did not establish duplicate completed tile transfers caused by it. Camera continuity (REA B) needs a later center/projection test: resize/padding calls are measured, unintended camera movement is not quantified here.

## 6. Radar Performance Findings

Historical RainViewer frames only; single source, max tile zoom7, attribution, 15 s playback interval, 5 min image cache, 90 successful URL entries and 80 requests/app/rolling-minute remain unchanged. No Nowcast or future frames were generated.

MEASURED truth test: in **two independent sessions**, hold new historical-frame tile traffic for 4 s, change slider, inspect label after 500 ms, then release. Time label changed immediately to requested14:40 Bangkok; source-complete render candidates arrived **4,247.3 ms / 4,249.2 ms** after label mutation. Screenshot shows old visible imagery under the new requested time during the hold. `render` + `isSourceLoaded` is only a **candidate**, not pixel proof. No claim is made that every tile was confirmed rendered at that instant. Initial latest-frame candidates took 1,006.6 / 838.1 ms after label mutation. Failed frame14:20 (eight tile errors/session, injected503) still received its requested time. This is **P0 R01**; the existing general blank-imagery disclaimer does not establish requested/rendered identity.

MEASURED interaction ledger: 86 radar requests, peak78/60 s, 82 complete-success/4 aborted, no repeated URLs; sustained130 requests, peak30/60 s, 99 complete-success/31 aborted, seven browser cache hits/eight repeated URLs. Status200 followed by aborted body is counted as aborted, not complete success. Many cancels align with style/frame/location changes; they are not all missing tiles/provider failures. App-memory cache hits bypass network entirely, so CDP cache-hit counts cannot measure all image-cache effectiveness. Six isolated Vitest contract tests verify cap, abort, clone, TTL, entry cap and URL restriction; concurrent same-URL calls before cache fill use **two network calls**, a bounded P2 opportunity, not a proven real-browser request flood.

MEASURED 38.972 s playback+pan phase advanced two frames (expected15 s cadence), rAF n1996 median16.7/p9516.8/max100.1 ms; this interval contains idle time, not a guarantee that every frame transition is smooth. Ten rapid changes generated ten `setTiles` and ten unchanged-point `setData` calls; candidate signal appeared for eight. China selection displayed coverage limitation. Synthetic hidden state paused playback in both truth sessions; CDP freeze/restore separately preserved the map. Native iOS backgrounding is unverified.

Aggregate audit contexts shared one runner IP: 556 radar requests overall and **112 in the busiest aggregate minute**, while individual recorded sessions remained below80. This must not be misreported as an application budget breach; independent contexts/IP sharing can exceed RainViewer100/IP/min. Future benchmark harnesses should pace across contexts/IPs as well as preserve the app limit. No429 response was established in these ledgers.

## 7. API & Data Reliability Findings

INSPECTED configuration (unchanged): weather/AQ staleTime600,000 ms, radar300,000 ms, gcTime1,800,000 ms, retry at most once for network/5xx, initial retry delay1,000 ms, timeout12,000 ms, window-focus refetch disabled, **no periodic refetchInterval**. `staleTime` marks a cache stale; it does not schedule requests. Provider and original timestamps remain MODELED / FORECAST / OBSERVED, not physical station claims.

| Case | Evidence / actual outcome |
| --- | --- |
| Captured real JSON success | MEASURED one weather attempt; 30°C modeled condition; map ready |
| Weather delayed4 s | MEASURED eventual30°C, one attempt; map independent |
| Weather beyond12 s | MEASURED two attempts; snapshot28.175 s after start had honest error/Unknown, ready map |
| Weather503 | MEASURED two attempts; error/Unknown, ready map |
| Provider abort | MEASURED two attempts; error/Unknown, ready map |
| AQ only fails | MEASURED weather remains; Unknown situation, map ready |
| Radar metadata fails | MEASURED weather remains; radar unavailable, map ready |
| Offline/reconnect after success | OBSERVED retained readings; map remains; online recovery works, detailed query/network records retained |
| Manual refresh fails503 | MEASURED cached Query data retained internally but UI suppresses it via isError; error/Unknown shown; map ready |
| Rapid Xi’an→Chengdu→Chongqing | MEASURED final key/location Chongqing; one persistent map; old query work cancels/settles independently |
| Aging3 h, two contexts | MEASURED queries stale, requests remain1, same displayed situation until another relevant render |
| Restore after aging | MEASURED synthetic visibility: weather request count still1; radar stale notice appears; weather verdict unchanged |
| Manual refresh after aging | MEASURED weather count1→2; reevaluation gives Unknown because replay timestamps intentionally unchanged |

Controlled cases replay JSON **captured from actual provider calls** and inject delay/errors, separate from live uptime. The rapid-city fixture reuses the captured Bangkok grid to test query keys/cancellation only; its values do **not** validate Chinese geographic weather accuracy. The independent live Xi’an interaction did receive20°C. The 3 h test advances Playwright clock, not three actual hours. Source `situation()` rejects weather>2h/AQ>3h, but no parent/sheet expiry clock triggers reevaluation. Two repeated aged sessions still show original30°C/Notable message despite stale queries: **P0 R02**. An old timestamp is available in details; the persistent summary is the misleading part. Do not call cached data freshly observed.

Live instability is reproduced separately: final original E2E two first attempts each had weather/AQ initial+retry requests aborted at **11.995–12.004 s** (eight trace records); both tests passed retry. Earlier run had the same430×932 failure then retry pass. This proves timeout/recovery UX matters; it does not identify provider downtime versus runner transport as the cause. Initial error states are honest. Failed refresh hides otherwise usable cached readings; no distinct cached+refresh-failed presentation exists. Long-open refresh policy and truthful status need approval, not blind faster polling.

## 8. Sheet Interaction Findings

MEASURED six cycles through collapsed/half/expanded/collapsed: each cycle has **33 layout counts**, **22–23 resize +22–23 setPadding** calls, script83–97 ms, measured layout4.0–7.9 ms, rAF medians66.6–66.7/p95≈100 ms (48–51 intervals/cycle). The actual touch-drag exercise n27 median16.7/p95100 ms; reduced-motion two-button exercise n38 median49.9/p9566.7 ms and only two resize/padding pairs. No gesture lockup or control collision was reproduced in the tested geometry.

INFERRED: height transition → ResizeObserver(sheet) → `m.resize()` despite unchanged host size → `mapBottomInset()` layout reads → `setPadding()` causes repeated expensive map work. Small measured layout time alone cannot explain rendering cost; software-GPU overhead is substantial. **P1 P01** proposes separating host resize from sheet occlusion/padding updates, deduplicating unchanged insets and benchmarking bounded updates. Do not redesign the sheet now or implement REA B without approval.

OBSERVED original regression screenshots/geometry: mobile375×667,390×844,430×932, Light/Dark, all three states; no horizontal overflow, primary temperature fully visible, radar hidden outside collapsed, attribution above sheet and no measured overlay collisions.375 collapsed sheet148 px/radar76 px. Tablet/desktop also passed.430 and a separate390 spec reached these checks only on retry because weather load failed initially. Orientation844×390/revert and search focus/Escape completed; native iOS on-screen keyboard, rapid gesture stress beyond this sequence and scroll-vs-map performance on physical touch hardware remain UNVERIFIED.

## 9. Memory / GPU Observations

MEASURED sustained real wall time **600.444 s**,31 forced-GC samples,212 total network requests/130 radar; one canvas, map instance1. Post-GC JS heap **10,935,360→16,097,572 B** (+5,162,212 B≈4.92 MiB). DOM356→1241 initially includes loading-to-forecast expansion; listeners247→251. Final five heaps15.83,16.33,16.50,15.62,16.10 MB fluctuate, while content/locations/themes also change. This is not enough to assert a leak or full stabilization. A comparable-state longer soak and heap-retainer analysis remain needed.

Cumulative rAF29,820 intervals:2,456>33.34 ms (8.24%),1,237>50 ms (4.15%),max200 ms. Last bounded buffer n5820 median16.7/p9550/max133.3 ms; **not the entire-run quantile**. First three per-pan p95 33.4/50.0/50.1 ms; last three66.7/66.6/50.1 ms. Mixed cities/styles/tile state prevent interpreting that as proven time-dependent degradation. Estimated missed-vsync6454 is a60 Hz heuristic, not presented frames.

UNVERIFIED GPU memory/resource-retainer trend. JS heap/CDP DOM do not measure GPU memory. No iPhone battery-drain percentage or thermal result exists. INFERRED risks: expensive software rendering, style reloads, resize bursts and repeated fetch cancellations can cost energy; benefits of proposed corrections must be measured afterward.

## 10. Fallback & Accessibility Findings

MEASURED forced initial WebGL unavailability: getContext returns null only for WebGL, real Leaflet fallback initializes/pans, dark theme works; map instance1/canvas0. External OpenTopoMap and RainViewer requests occur; screenshot includes real rendered tiles and credits. Weather timeout independently leaves Unknown rather than breaking map. Some requests aborted; fallback-ready is not all-tile completeness. Runtime errors absent in map/fallback/sustained diagnostics; original successful radar regression recorded40 successful images, no page/console/asset failures.

OBSERVED keyboard-accessible expand/collapse buttons, search Escape, labeled controls, Thai text, themes and attribution retained in screenshots/tests. System-theme/media updates and manual preference persistence are checked by original regression; mobile touch drag is CDP-generated. No full screen-reader/contrast audit is claimed. Reduced Motion tested through actual media setting and sheet buttons; no native-device motion acceptance.

UNVERIFIED: WebGL capability succeeds but later constructor/GPU initialization fails, context loss mid-session, fallback performance under identical workload, VoiceOver, physical Safari/Chrome, safe-area hardware and native keyboard. Source catches MapLibre constructor error into retry UI; it does not automatically transition to Leaflet in that path. This is an integration regression risk, not a reproduced failure here. Official warning/flood blocked states remain honest; absent feeds are not evidence of safety or no warnings.

## 11. Design C Integration Risk Matrix

Approved exploration commit was read as a reference. Its file still says UNAPPROVED from authoring time; owner approval now selects **C**, not permission to integrate its code.

| Design C decision | Class | Required engineering treatment |
| --- | --- | --- |
| Paper/ink/teal Light/Dark tokens, borders | Safe to adopt directly after authorization | Preserve warning/provenance colors; verify contrast |
| Thai typography / large temperature | Requires adaptation | Existing bundled Noto license retained; iOS font metrics, tabular numbers and no layout shift |
| Editorial grouping / fine forecast chart | Requires adaptation | Bind actual forecast arrays/nulls; semantic chart summary, no demo values |
| Revised hero and sheet geometry | Requires benchmarking | Derived single safe-area/inset contract; avoid resize-on-every-frame loop |
| Atmospheric surfaces | Requires benchmarking | Static low-cost colors/shadows first; no continuous blur/parallax; REA C HOLD |
| Muted map roads/water/labels | Requires adaptation and benchmarking | Licensed style manipulation once per theme; preserve persistent map/fallback and radar legend |
| Floating controls / compact radar skin | Requires adaptation | Requested vs rendered timestamps corrected first; touch/attribution collision matrix |
| Desktop editorial column | Requires adaptation | No three-map gallery; tablet/short-height independently tested |
| Prototype effect `[direction,theme,location]` | **Should not be ported** | Recreates MapLibre; retain production mount lifecycle |
| Prototype illustrative rain/demo fixtures | **Should not be ported** | Historical real radar/provider adapters stay canonical |
| Review gallery / three simultaneous maps | **Should not be ported** | Owner review-only resource cost |

Start with production lifecycle and data boundaries, never prototype map lifecycle. Integrate CSS/shell in small steps only after truth fixes; measure identical profiles after each geometry/style milestone. Large typography is not inherently expensive; lifecycle/resize/raster work are higher-risk. No source modification to C was made.

## 12. Prioritized P0/P1/P2 Issues

Every correction below is **proposed only**. Expected benefit is unproven until an approved implementation and before/after measurement.

### P0 R01 — Requested radar time lacks rendered-frame identity

Reproduce: load real history; delay uncached selected tiles4 s; move slider; compare time/tiles after500 ms; repeat with tile503. Evidence: two sessions,4.247/4.249 s label-to-source-complete gaps; eight tile errors/session still label new frame; `radar-pending-*`, `radar-failed-*`, truth JSON/trace. Root cause INFERRED: App drives label and raster URL from same requested frame; no render acknowledgement. Impact: imagery can be read against the wrong time. Correction: minimal requested/pending/rendered/failed contract; renderer reports readiness tied to frame+viewport generation, ignore superseded requests, retain last verified imagery time and coverage caveat; do not treat isSourceLoaded alone as pixel proof. Expected benefit: honest time/imagery interpretation; no promised speed gain. Risk: errors/cancellations/viewport movement/cache/style switches and Leaflet acknowledgement semantics. Dependencies: Lead review/REA A Conditional GO; unchanged80/min/history/cache/attribution.

### P0 R02 — Stale readings retain an expired situation summary

Reproduce: successful captured real payload; install clock; advance3h+1s without interaction; inspect query stale state and summary; synthetic hide/restore; repeat. Evidence: twice requests1→1→1, original Notable message remains; manual refresh1→2 causes Unknown with original timestamps. Root cause INFERRED: no periodic fetch/focus policy and no render-triggering expiry clock; stale tracked properties unused. Impact: stale modeled inputs support an apparently current situation. Correction: explicit source-age/cache/refresh-failed/unavailable states and expiry reevaluation, bounded foreground/resume refresh after terms/budget review; preserve provider timestamps even when fetchedAt changes. Expected benefit: uncertainty displayed by deadline; fresher data when available. Risk: new render/polling/battery load and accidental timestamp relabeling. Dependencies: approved freshness contract; no provider switch or blind rapid polling.

### P1 P01 — Sheet changes amplify map layout work

Reproduce: six four-step sheet cycles with diagnostic method counters/phase metrics. Evidence:22–23 resize/padding pairs/cycle,33 layouts,p95≈100 ms; one map instance; reduced-motion2 pairs. Root cause INFERRED: observer tied to sheet height transition invokes host resize and padding every observed change. Impact: mobile map/sheet responsiveness risk. Correction: distinguish actual host resize from occlusion changes, dedupe inset, coalesce bounded updates, benchmark camera continuity separately. Expected benefit: fewer unnecessary redraw/layout calls; unproven frame improvement. Risk: covered center/marker/credits or jitter if updates too sparse. Dependencies: REA B review, before/after matched hardware, all sheet states/geometry tests.

### P1 P02 — Connection stalls cause repeated initial-load failure

Reproduce: final live suite430 and390 initial loads; both request attempts timeout12 s; repeat earlier CI430. Evidence: eight final trace aborts≈12 s, two test retries pass; separate slow-loadTLS timings. Root cause UNVERIFIED: runner/network/TLS versus provider path; frontend12 s cap/retry correctly bounds waits. Impact: visible weather unavailable despite independent map. Correction: instrument transport and age/status, review timeout/retry/recovery UX with controlled outages, preserve cancellation and caps; do not increase timeout blindly. Expected benefit: intelligible/recoverable failure, not claimed provider uptime improvement. Risk: prolonged loading or request bursts; cached values mislabeled. Dependencies: source-age contract R02, comparable network tests. No backend or provider change authorized.

### P2 P03 — Failed refresh discards cached display context

Reproduce: successful load; manual refresh503. Evidence: Query retains data but `isError` suppresses it, Unknown/error shown; screenshot `failed-refresh.png`. Root cause INSPECTED: UI selects undefined whenever query isError. Impact: user cannot distinguish retained-but-old data from never-available data. Correction: optional cached values with explicit age and failed-refresh label; verdict remains conservative. Expected benefit: usable context without false freshness. Risk: cached readings presented as live; dependencies R02 source/status semantics.

### P2 P04 — Redundant marker sync on radar-only updates

Reproduce: change ten radar frames rapidly without location/weather changes. Evidence: ten setTiles plus ten ww-point.setData,28 map sync/88App/68SituationPanel counters across mixed interactions (not pan-only React storm). Root cause INSPECTED: common sync reconstructs point every frame change. Impact: avoidable worker/render work. Correction: separate/dedupe point update from raster frame; retain active layer visibility. Expected benefit: fewer unnecessary point-source updates; cost reduction unmeasured. Risk: stale point/AQI/theme halo. Dependencies: approved narrowly scoped performance correction and matched profiling.

### P2 P05 — Concurrent image requests are not coalesced

Reproduce: isolated contract test starts two identical URLs before first settles. Evidence: fetch called twice; cache90/5min/cap80 intact, real interaction ledger had no repeated URLs. Root cause INSPECTED: cache stores only completed bodies, no in-flight map. Impact: possible bounded budget pressure; not established in real map traffic. Correction: consider only after real duplicate workload measurement; subscriber-aware cancellation must preserve per-request signals. Expected benefit: budget/cache efficiency if duplicates exist. Risk: aborted consumer cancels others, rejected promises retained. Dependencies: targeted evidence; lower priority than P0.

UNVERIFIED watch items, not confirmed bugs: startup duplicate style work, constructor/context-loss fallback gap, GPU retention, prolonged same-state heap growth, camera movement due padding. Investigate; do not label them proven leaks/regressions.

## 13. Proposed Correction Work Order

Separate proposed file: `docs/PROPOSED_CORRECTION_WORK_ORDER_V03.md`. Four explicit gates:

1. **Phase1 P0 reliability**: R01 truthful radar contract + R02 expiry/status, P03 as part of same status contract if approved. Keep historical tiles/single source/80 cap and existing providers; benchmark before/after. P02 transport diagnosis/recovery addressed within these data boundaries.
2. **Phase2 P1 performance**: P01 sheet/occlusion/resize and any demonstrated camera issue; P04 marker sync only if benefit established; investigateP05 with actual duplicate workload. Matched data/network/cache/software-or-hardware configuration.
3. **Phase3 Design C**: selected CSS/shell/typography/map cartography on persistent production renderer and reliable timeline; no illustrative rain or gallery. Requires owner integration authorization.
4. **Phase4 real-device acceptance**: physical iPhoneSafari/Chrome, reduced motion, keyboard/safe areas, connection transitions, native background/resume and10–20 min soak; battery/thermal observation without invented percentages.

Do not automatically combine phases. R01/R02/P03 share a freshness contract and can share one reviewed reliability PR; sheet/map performance and visual geometry need separate measurements so regressions remain attributable. No correction has been implemented here.

## 14. Test Evidence and Artifacts

Commands actually executed locally and again in successful CI: `npm ci`, `npm run typecheck`, `npm test` (**49/49**), `npm run build` (CI4.75 s), `npm run verify:pages`, diagnostic Vite build (4.77 s), Playwright installChromium, `WW_AUDIT_SUSTAIN_MS=600000 node audit-v03/run-baseline.mjs`, `npm run test:e2e` (**7 passed +2 flaky/retry pass**, nine unique tests). Six extra audit contract tests executed locally via `npx vitest run --config vitest.audit.config.ts`; **6/6 pass**, separate from original49. Node syntax checks and analyzer execution passed. Local browser install failed (invalid CDN archive); successful browser execution is in CI, not local.

| Artifact | Contents / integrity |
| --- | --- |
| `evidence/performance-v03/measurement-summary.json` | Environment,load medians/ranges,14 cases,frame/memory/network summaries; stage failures empty |
| `evidence/performance-v03/load-samples.csv` | All18 raw load rows |
| `evidence/performance-v03/regression-test-results.json` | Nine unique outcomes, flaky explicitly retained |
| `evidence/performance-v03/regression-provider-trace-results.json` | Eight actual finalE2E provider abort records |
| `evidence/performance-v03/radar-contract-tests.json` | Six additional tests |
| `evidence/performance-v03/public-http-probes.json` | Three publicHTTP200 probes and unchanged releaseSHA |
| Actions artifact `performance-baseline-v03-38122422039` |126 entries,73,752,671 bytes,ZIP integrity checked |
| Artifact SHA256 | `9a92178eae193acb52d705fb7b7862cfe7ddb0c979e44e893eee87f0864a3012` |

Full artifact contains `audit-v03/raw/` actual network ledgers, environment/results, live-captured fixture provenance, all load observations,31 memory samples, screenshot cases and traces (`map-interactions-trace.zip`, `radar-truth-trace.zip`, `reliability-trace.zip`), plus original Playwright HTML report/failure traces. Download from successful workflow run; Actions retention30 days. A durable owner evidence ZIP is separately supplied. Screenshots are rendered implementation, never generated concept art. No live public website was changed.

Known naming caveat: raw `mobile-dark.png` was taken after the interaction sequence returned to **light**; do not use it as dark evidence. Use `regression/mobile-390-dark-collapsed.png` or original desktop-dark attachment instead. Selected owner screenshot files are labeled correctly.

Initial audit run38122215165 failed before profiling because shallow history prevented merge-base; fixed only audit workflow/script. Its original E2E had8 first passes+1 flaky retry pass and is retained separately. Do not count it as a second full profiling dataset or hide its setup failure. Final run has all six stages completed and no infrastructure stage failures. Harness catches per-stage errors; success was checked against raw `results.failures=[]`, not inferred solely from green CI.

## 15. Git Branch and Commit SHA

Investigation branch: `work/performance-reliability-baseline-v03`. Exact executed diagnostic source SHA: **9933e4383e899be752667021fa3dd24e6f067a1d**, production source **2036e2ac788cb31d25fd387cb40520ad95c408a6**. Evidence/report additions use a subsequent fast-forward commit on this branch; final handoff records its exact verified remote SHA. No force push, main merge, Pages deployment or exploration rewrite. Reports, scripts, tests and small machine-readable evidence are Git-backed; large raw traces/screenshots remain downloadable artifacts.

## 16. Explicit Remaining Limitations

No physical iPhoneSafari/Chrome, WebKit run, VoiceOver, real battery/thermal/GPU-memory proof, native keyboard/background/low-memory/context-loss test. HeadlesssoftwareGPU/DPR1/CDP throttling/traces add overhead and do not represent hardware FPS. No certified fieldINP or standardizedLighthouseTBT; LCP excludes canvas completeness; load observation is bounded and n3 small. Realnetwork availability sample is too small/environment-dependent for SLA claims. Clock-aging,syntheticvisibility and captured-fixture replay are controlled reliability tests, not real three-hour uptime. Two liveE2E flakes remain.10min heap growth is measured but leak/stabilization unresolved; comparable20min hardware soak is needed. Missing-frame and failure notices need R01 contract; no officialalerts/flood dataset integrated by this audit.

**NOT READY — CORRECTIONS REQUIRED**
