# Weather Watch V0.3 P0 reliability correction

**P0 CORRECTIONS READY FOR LEAD REVIEW — isolated implementation candidate, not owner acceptance. No merge or deployment.**

## 1. Exact starting Git baseline

Repository: https://github.com/tonnutkit-dev/Weather-watch. Main verified before implementation: `2036e2ac788cb31d25fd387cb40520ad95c408a6`. Dedicated branch `work/p0-reliability-correction-v03` was created from that main, not from the audit or prototype. Complete audit and proposed work order reviewed at `d4280133a31305656114961709d1710a26bd0872`. Approved Design C remains `19ec27ce5abc338a65cf368d17f6d3abbf884840`, untouched. Git history is preserved; pushes use non-forced updates with an expected-head lease. Local Git CLI lacked an HTTPS credential, so the authorized GitHub connection wrote the same Git trees and ancestry. Tree equality was verified locally. No secrets or dependencies added.

## 2. R01 root cause and correction

**OBSERVED/MEASURED in prior audit:** selected frame time appeared before imagery had loaded; approximately 4.25 seconds of mismatch under held tiles, including misleading time after failure. **INFERRED from pinned renderer source:** generic source readiness includes errored tiles and reload may retain prior textures.

The correction presents a request-intent timestamp explicitly labeled **เลือก** (selected), plus pending, unverified, failed or cancelled state. Each frame/location/theme/layer context gets a generation; late success/failure cannot mutate a newer generation. Background/teardown cancels it; viewport changes invalidate readiness. Local generation fragments are stripped before the unchanged provider/cache transport. The single radar source and persistent renderer instances remain. A stable external store delivers status updates to radar controls alone (`useSyncExternalStore`); it does not rerender App, forecast or map for every radar gate event. A unit regression asserts parent renders stay at one while pending/failed/superseded snapshots update the child. HTTP/decode failures do not attach a requested time to retained imagery.

**Important engineering limit:** `displayedTime` remains null. MapLibre idle plus successful current-generation transport is qualified evidence only; Leaflet decode/load/paint opportunity likewise cannot prove complete viewport pixels or coverage. The UI continues saying imagery is unverified rather than claiming a confirmed displayed timestamp. This is a deliberately conservative contract, not a faster renderer or a complete REA Truthful Timeline implementation. Lead must review this disclosure; a stricter exact-viewport/pixel acknowledgement is future separately approved work. See [full readiness contract](docs/RADAR_FRESHNESS_CONTRACT_V03.md).

## 3. R02 root cause and correction

`staleTime` previously only classified cache entries; no scheduled refresh or expiry-driven render reevaluated the situation verdict. A three-hour-old unattended view could keep its earlier situation text.

Source validity now uses original provider timestamps: current modeled weather <2h, modeled AQ <3h, with missing/invalid/implausibly future timestamps unavailable. New fetch time cannot renew an old source. Fresh, cached, expired, refreshing, refresh-failed and unavailable are explicit. Failure flags coexist with expired state. Retained readings and forecasts stay inspectable, labeled with source time and status; failed/expired inputs support only Unknown, never Calm/Notable/Attention. Current map numerical markers exclude unusable inputs. Map failure and API failure remain independent.

One deadline timer reevaluates the next source/cache boundary, plus resume/connectivity events. Timeout delays are clamped to the browser limit; malformed far-future timestamps cannot overflow into a one-millisecond reevaluation loop. Wall time is read during existing query/UI renders; data arrival does not force a duplicate global render. No per-second render loop. Ten-minute foreground refresh checks and gated focus/resume/online events operate only on active exact location keys. Hidden/offline/inflight queries are skipped. Automatic admission cooldown is ten minutes; manual is thirty seconds, including failed attempts. Key history is bounded to 128 entries. Returning failed/stale city queries cannot bypass admission via automatic remount/reconnect. Initial loading, abort signals, location cache isolation, the existing one retry, twelve-second HTTP timeout and thirty-minute Query garbage collection are retained.

Scheduled stable-location cadence is at most six starts/provider/hour, up to twelve with the existing retry; it is not a promise of a new provider model every ten minutes. Manual user requests are separately bounded. This is well below current Open-Meteo free non-commercial limits and avoids hidden-tab polling traffic. No new provider or credentials.

## 4. Files changed

Production: `src/app/App.tsx`; `src/components/RadarControls.tsx`; `src/components/SituationPanel.tsx`; `src/maps/MapCanvas.tsx`, `GLCanvas.tsx`, `RasterCanvas.tsx`; `src/radar/presentation.ts`; `src/reliability/freshness.ts`, `useFreshness.ts`, `useRefresh.ts`; boundary alignment in `src/shared/situation.ts`.

Tests/evidence: `src/tests/p0-reliability.test.tsx`, `src/tests/radar-budget.test.ts`; `diagnostics-p0/` scripts/recorded provider fixtures; `.github/workflows/p0-reliability-v03.yml`; diagnostic-only `.gitignore` entries; this report, `docs/RADAR_FRESHNESS_CONTRACT_V03.md`, and seven small files under `docs/qa-p0/` (summary, two CSVs, integrity, Actions history, live runtime evidence, screenshot/trace index).

Unchanged: all provider adapters, radar transport budget/cache, CSS/design system, Design C assets, geography, dependencies/lockfile, Vite production config and existing Pages workflow. No P1 optimization or visual integration.



## 5. Before/after radar timeline tests

**MEASURED:** paired tests against exact main and correction, both MapLibre and forced-WebGL-unavailable Leaflet. Transport was held 4250 ms. At 150 ms after selecting12:40, main already displayed an unqualified 12:40; correction displayed **เลือก12:40** and `pending`, with displayed-frame field empty. After held transport completed, correction became `unverified`, still qualifying the requested time. Injected503 left main's new 12:50 unqualified; correction showed `failed` and never assigned that time to retained pixels. This removes the false display claim; it does NOT reduce the4250 ms delay or establish a rendered-frame latency SLA.

Rapid scrubbing to the last selection, play/pause, delayed pan/zoom, theme/location changes, layer/background cancellation and resume pass. Late completion rejection is deterministic in the gate unit tests. Map instance count remains1 in every paired radar scenario. Missing404 tiles are `failed`, never interpreted as no rain. `displayedTime:null` is deliberate in all completed cases. Exact snapshots, counts and traces are indexed in [evidence](docs/qa-p0/EVIDENCE_INDEX.md).

## 6. Before/after source expiry and stale-data tests

**MEASURED:** a virtual three-hour idle advance on recorded source timestamps leaves main's initial “มีสภาพอากาศที่ควรติดตาม” summary unchanged and provider requests at weather 1/AQ 1. Correction reevaluates both source inputs to `expired`, situation `Unknown`, and “ข้อมูลหมดอายุ · ยังประเมินไม่ได้”; original30°C remains inspectable as old data. Weather2/AQ2 requests occur. Returning the same unchanged source in a successful fetch does not renew source validity. Repeated focus/online/resume immediately afterward adds **zero** requests.

This clock test coalesces missed intervals during `fastForward`;2/2 is not a claim that a literal three-hour foreground session makes only two requests. Exact source/cache deadline timers, manual30s and automatic10m admission boundaries are separately covered by fake-clock unit tests.

**MEASURED:** weather503 (one retry), failed manual refresh with retained values, then recovery; offline→weather expiry→online; two12s timeout attempts; slow initial700ms response; partial AQ503 while weather remains fresh; expired weather with failed AQ; all give conservative Unknown where inputs cannot support an assessment. China city switches keep distinct keys and do not create Thailand-only alerts. Hidden/resume and repeated foreground events do not bypass admission. Successful recovery restores usable source status, not a fabricated new source time.

## 7. API request-count evidence

Each row is one isolated LAB context. Shared-IP/per-multiple-tab provider traffic is not measured. Counts include failure/retry/context switches rather than only successful images.

| Scenario | Main requests | Correction requests | Correction peak in rolling60s |
|---|---:|---:|---:|
| Matched ordinary sheet/pan/frame/theme interaction, each of3runs | radar20; weather 1/AQ 1 | radar20; weather 1/AQ 1 | radar20 |
| MapLibre delayed/failure/scrub/location/theme/background scenario |54 |51 |51 |
| Leaflet same failure/context scenario |48 |60 |60 |
| Three-hour simulated idle | weather 1/AQ 1 | weather 2/AQ 2 | not a real-time cadence sample |

Leaflet's broad failure/context sequence has12additional requests, including repeated URLs (48unique before and after). This is a bounded adverse-case cost; no reduction is claimed. New generation contexts can restart cancelled/incomplete tiles; unchanged concurrent same-URL misses are not deduplicated. Exact transport/cancellation cause for every repeat has not been proven. No advance fetch of every historical frame exists. The unchanged rolling80/min cap, five-minute image cache and90-entry bound pass six deterministic transport tests, including queuing/abort/cache expiry. Rapid ten-event focus/online sequence after failure starts no additional AQ request. The full weather-failure/manual-retry/recovery/three-China-city scenario totals weather9/AQ7; offline/online/timeout totals4/3; partial-AQ failure totals3/4.

## 8. Matched mobile performance regression results

**MEASURED environment:** Linux Actions runner, Intel Xeon Platinum8573C, Node24.21.0, Playwright1.64.0, Chromium156.0.8078.4, software GPU. Mobile390×844 with touch; desktop1440×1000. CPU4× plus150ms latency,200,000bytes/s download and93,750bytes/s upload for throttled startup. Normal profiles use unthrottled runner network/CPU. Deterministic failure/expiry scenarios fix the browser clock at 07:46 UTC; startup and interaction samples use actual wall time with the same recorded provider source timestamps, so retained sources can already be expired. Main/correction inputs remain matched. Recorded provider JSON and artificial TEST PNG radar/minimal LAB basemap are isolated test utilities, never shipped. Original live-network suite is separate. No physical iPhone equivalence is asserted.

36startup samples: main/correction ×3profiles ×cold/same-context-repeat ×3runs. The raw label `warm` means same-context repeat/returning session. **Playwright routing disables HTTP cache**, so these are not certified populated-HTTP-cache results. Main and correction use identical observer overhead and production builds for startup; diagnostic-only map hooks are used for matched interactions. Browser source/build code is identical apart from isolated observer injection.

All startup values below are **medians**, n=3 per side/profile/cache. Ranges are preserved in summary.json/loads.csv; population p95 is not defensible atn=3. `blockingWindowMs` is Σ(max(long-task duration−50ms,0)) over the startup observation, not LighthouseTBT or a TTI-derived metric. INP remains null; no representative INP measurement exists.


| Profile/cache | FCP main→fix ms | LCP main→fix ms | CLS main→fix | Blocking window main→fix ms | Transferred main→fix bytes |
|---|---:|---:|---:|---:|---:|

| desktop/empty session | 116→120 | 116→120 | 0.07521→0.07926 | 89→90 | 530996→533905 |

| desktop/repeat (HTTP cache unverified) | 68→92 | 68→92 | 0.12275→0.07882 | 74→78 | 530996→533905 |

| mobile/empty session | 88→88 | 164→164 | 0.00000→0.00008 | 6→7 | 518964→521873 |

| mobile/repeat (HTTP cache unverified) | 68→72 | 100→116 | 0.00000→0.00008 | 0→1 | 518964→521873 |

| mobile-throttled/empty session | 1248→1252 | 1248→1424 | 0.00055→0.00053 | 167→160 | 518964→521873 |

| mobile-throttled/repeat (HTTP cache unverified) | 1104→1152 | 1104→1224 | 0.00056→0.00052 | 18→22 | 518964→521873 |


Entry JavaScript raw407,447→415,774bytes (+8,327); gzip130,333→132,901 (+2,568; +1.97%). Throttled cold LCP1,248→1,424ms (+176ms), repeat1,104→1,224ms (+120ms), under2.5s in this constrained lab. Baseline desktop repeat CLSapproximately0.123 exceeds0.1 while correction median0.0793; this small fixture sample does not prove a field CLS improvement. No startup speed improvement is claimed.

Three matched interaction runs per build, CPU4×,390×844. Each has4sheet expand/collapse cycles, pan, frame selection, two theme changes. Values below are medians over runs; ranges/each row are committed. No statistical claim of equivalence is made.

| Metric | Main | Correction | Interpretation |
|---|---:|---:|---|
| Main-thread task duration |5389.6ms |5432.6ms |+0.8%; ranges overlap5361.7–5460.3 /5291.2–5644.2ms |
| Script duration |1106.0ms |1175.9ms |+6.3%; modest new state/admission logic cost |
| Layout duration |119.5ms |122.9ms |+2.8% |
| Style recalculation |153.8ms |160.1ms |+4.1% |
| Within-run rAF p95 |50ms |50ms |285–295frame intervals/run; not physical display FPS |
| App/SituationPanel/mapSync renders/calls |22/18/7 |22/18/7 |No new root/forecast broadcast loop |
| Map instances |1 |1 |No theme/location-triggered map recreation |
| Ordinary radar/weather/AQ requests |20/1/1 |20/1/1 |No matched ordinary request burst |

**MEASURED:** post-GC heap at start/end approximately7.53→8.86–8.87MiB main and7.59→8.95–8.96MiB correction. DOM1260→1271 vs1268→1279 (same+11); CDP event listeners248→248 vs255→255. Window/document active-handler counts balance before/after in all6runs. The fixed+7 listeners include explicit freshness/refresh lifecycle observers. These short scenarios show no additional trend versus main; they do not prove absence of a long-session leak, GPU retention or battery/thermal cost. No new10-minute endurance acceptance was run; original audit remains reference evidence. Forced renderer-constructor failure/repeated-retry cleanup is not comprehensively measured.

The intermediate candidate's approximately 22% main-thread cost was not accepted. Final scoped radar subscriptions and nonduplicating clock renders contain only cost introduced by these P0 fixes. Final measured total cost is approximately 0.8%, with equal root/forecast renders and rAF p95; this supports Lead review under the matched lab gate, not production/device performance acceptance.

## 9. MapLibre / Leaflet fallback results

**MEASURED:** primary MapLibre and forced canvas-WebGL-unavailable Leaflet both pass normal/delayed/failed/superseded frame, play/pause, city/theme, movement, background/resume tests. Renderer instance count remains1. The existing fallback, layer count strategy, attribution and region handling remain. Theme changes may still reload MapLibre styles; that preexisting behavior is not optimized here. Actual DOM pinch changes zoom in both main and correction; measured4.60→4.02 main and4.60→5.02 correction in this run. Only zoom responsiveness, not matched pinch direction/physical gesture fidelity, is established; real iPhone gesture behavior remains owner QA. No map lifecycle architecture from Design C was imported.

## 10. Reduced Motion and accessibility checks

**MEASURED:**375×667,390×844,430×932 ×Light/Dark ×collapsed/half/expanded =18geometry screenshots under Reduced Motion. No horizontal overflow; primary temperature within viewport; collapsed radar below unobstructed map and above sheet; half/expanded radar hidden; attribution present. Existing live mobile assertions also pass for these sizes, including condition/summary visibility, non-overlap, accessible modal/expand controls, normal map touch targeting, appearance persistence/System behavior and sheet dragging. Screenshots visually inspected at375Light/390Dark plus actual desktopDark and the weather-timeout error state. Production CSS/tokens and sheet mechanics are unchanged. New radar state uses semantic status messaging and an explicit selected-time aria label. No formal full accessibility audit or assistive-technology/physical Safari acceptance is claimed.

## 11. Unit and browser test results

**Final execution:** `6e0fc36f5554c3fa49578c79e35ef017a7c47e3e`, [run 38136782887](https://github.com/tonnutkit-dev/Weather-watch/actions/runs/38136782887), workflow **success**.

| Command/check | Result |
|---|---|
| `npm ci` |PASS in Actions; dependencies/lock unchanged |
| `npm run typecheck` |PASS locally and Actions |
| `npm test` |69/69PASS; original 49 +14freshness/readiness/store +6budget/cache |
| `npm run build` |PASS locally and Actions |
| `npm run verify:pages` |PASS; `/Weather-watch/`,3entry assets, worker/fonts present |
| isolated diagnostic/main builds |PASS; not deployed |
| `node diagnostics-p0/run-corrections.mjs` |23PASS /0FAIL;36startup samples and6interaction samples |
| `npm run test:e2e` |8first-pass +1retry-pass flaky;0remaining failed; original retry policy unchanged |

**Final live failure retained:** `live map/weather and appearance/location integrity` first attempt waits45s for absent temperature. Trace shows two weather requests with status−1 and durations11996.6/11999.6ms, consistent with the unchanged12s request abort, while AQ responds200 and the map/radar remain usable. Retry passes4.6s. This is a **MEASURED provider/network flake**, not a deterministic P0 state-contract failure; upstream server cause is **UNVERIFIED**. No timeout/assertion/retry policy was relaxed. The failed screenshot shows honest weather-error/Unknown alongside a usable real map. The original live radar test captures32successful radar PNGs, zero local asset failures, zero page errors and zero console errors in that scenario; this is not a claim that all sessions are error free. Requests are public APIs, no API credentials.

### Investigation failures retained, not hidden


1. Initial execution `fccfaa906782bb7d333a7eb0e4194e6225f6952b`, run 38133507333: 66 unit tests and20 deterministic scenarios passed; live suite6 passed/3 failed. Renaming the radar detail heading broke its exact existing visibility assertion. It was corrected by keeping the original heading and qualifying the requested time in the value/status. There was also a live weather load timeout on one attempt and a compositor pinch that did not alter zoom. Both attempts/traces remain in artifact 11699882928.
2. Run38133932958 at `14cc36341200ec8341fb52b0b889dbf9e4b47b94`: 67 unit tests and21 deterministic scenarios passed; live6 passed/3 failed on the still-renamed heading. The heading correction was queued; no test assertion was removed.
3. Run38134444159 at `f98a9aad7ac37fab19b2bb03301f18367bf3de7a`: 67 unit,23 deterministic and9 live browser tests passed. However, repeated matched interaction measurements showed main-thread overhead approximately 22% versus main in this run (earlier run approximately 8%), with unnecessary App/forecast renders. This intermediate candidate was not treated as satisfying the performance gate. The final P0 candidate scopes radar status subscriptions to the controls and avoids duplicate expiry-hook data-arrival renders, then repeats matched measurements. This is containment of the newly introduced R01/R02 cost, not a P1 map/style/forecast optimization.
4. The listener diagnostic initially compared before the first input, then after Playwright lazily installed its own input handlers (`__playwright_global_listeners_check__`, click/touch/pointer handlers), producing false-positive accumulation on BOTH main and correction. Empty event-type sets also needed normalization. The diagnostic now primes Playwright input through a read-only main-world locator evaluation BEFORE measurement (a brand click alone initializes the separate utility world, so it was insufficient), and compares active handler counts with the same balanced-count assertion. No app listener or failed assertion was removed. Run38134693181 retained17 lab passes/6 diagnostic failures and live7 first-pass/2 retry-pass flakes; it is not counted as an all-pass run.
5. Queued intermediate Actions runs superseded by newer commits were automatically cancelled by Actions concurrency. They did not execute and are not counted as passes. No completed failing result was erased or quietly retried into a pass. Original49 unit tests remain unchanged. The final candidate has 69 unit tests: original 49 + fourteen freshness/readiness/store tests + six unchanged transport budget/cache contracts. New tests include source-null/future/expiry boundaries, deterministic idle/resume/cache transitions, superseded/failed/cancelled radar generations, canonical transport URLs and six unchanged transport budget/cache contracts. Typecheck and production build pass locally. Local browser installation failed due to truncated Playwright Chromium CDN downloads; actual Chromium QA runs on Actions, not a physical iPhone.

Deterministic browser lab is isolated from production: recorded real provider JSON, fixed source clock, artificial TEST PNG tiles and a minimal lab basemap. These values/pixels are never included in production product views. Matched before/after startup and interaction samples use identical instrumentation, Chromium/software GPU, network/CPU profiles and baseline main. Cache labels in raw results are retained: `cold` clears native cache; `warm` is a same-context repeat/returning session. Playwright routing disables HTTP cache, so these fixture-based repeat samples are NOT a certified populated-HTTP-cache baseline. The original audit's genuine live cold/warm observations remain a reference, not new P0 measurements. This measures constrained frontend/raster overhead, not full basemap field performance. Original live-network E2E tests run separately with their original assertions/retry policy. The existing mobile pinch test now sends real two-finger DOM touch input instead of compositor-only `synthesizePinchGesture`, and adds a map hit-target assertion. Its zoom-change assertion and ten-second limit are unchanged. A matched main/correction lab verifies the same DOM pinch input on both builds. Large screenshots/traces/reports live in a ninety-day Actions artifact; small permanent summaries are committed.


6. Runs38135487545 and38136032953 also failed the same six listener diagnostic comparisons on both builds. The latter had69unit tests and9live first-pass tests, but was still correctly marked workflowfailure. Read-only main-world locator initialization fixes the diagnostic in the final run; the balanced-count assertion passes unchanged. All11run SHAs/results, including4cancelled pending runs, are committed in `docs/qa-p0/actions-history.json`. Final live flake is separately disclosed above. Full failed artifacts remain in their run pages for their retention periods.

## 12. Remaining risks and limitations

- R01 full-viewport radar pixels are NOT confirmed; `displayedTime:null` and **เลือก**/unverified remain deliberate. Single-source reload may temporarily retain partial/prior tiles. Generic readiness/decode errors do not prove coverage or no rain. This is a conservative truthful intent/buffering contract; richer exact-pixel acknowledgement needs separate review.
- Leaflet adverse-context requests48→60 stay within80/min but carry extra bounded network cost. Concurrent same-URL misses and cross-tab/shared-IP budgets remain unchanged; no P1 deduplication was implemented.
- Live weather connectivity has one final flaky retry-pass; the upstream cause is not proven. Expiry/failure stays conservative and the map remains independent.
- Manual requests inside30s cooldown are ignored without a countdown. Returning failed keys honor10m automatic cooldown; prompt user retry is still bounded. Hidden/offline/resume behavior is tested through browser fixtures, not real iPhone suspension.
- Missing provider source timestamp stays unavailable, not renewed by fetch time. No fabricated data, alerts, flood-free inference or model→observation relabeling.
- Lab cache routing prevents a certified populated-HTTP-cache comparison. Smalln=3performance samples do not establish field reliability, physical60FPS or statistical equivalence. Script cost+6.3%, startupLCP+176ms underthrottle are disclosed.
- Physical iPhone Safari/Chrome, assistive technology, GPU memory, battery, thermal, field INP and new10-minute device endurance are **NOT TESTED**. Existing P1 sheet resize/padding/camera issues remain out of scope. Forced MapLibre constructor/retry failure resource behavior is not fully measured.
- Large Actions artifacts expire2027-01-09; small machine summaries and report remain committed. GitHub authentication may be needed to retrieve ZIPs; actual connector retrieval succeeded. No separate preview or public deployment was created.

## 13. Git branch, source SHA and integrity

Repository: https://github.com/tonnutkit-dev/Weather-watch

Branch: `work/p0-reliability-correction-v03`

Exact tested source: `6e0fc36f5554c3fa49578c79e35ef017a7c47e3e`. Final handoff adds report/QA summaries only; the containing report commit/permalink is supplied in the final owner handoff. Source equality against the execution SHA is checked before publication. No main merge, no force-push. Complete history preserved.

Main and public `/release.json` remain `2036e2ac788cb31d25fd387cb40520ad95c408a6`. Design C branch remains `19ec27ce5abc338a65cf368d17f6d3abbf884840`. Protected-path diff is empty for provider adapters, radar transport budget/cache, CSS/design tokens, DESIGN.md, dependencies/lock, Vite production config and existing Pages workflow. See [source integrity](docs/qa-p0/source-integrity.json). No unrelated repository modified. Local working tree is reconciled to the connector-created commit after publication; docs-only final commit does not rerun source-path-triggered QA.

## 14. GitHub Actions and artifact references

- [Executed workflow](https://github.com/tonnutkit-dev/Weather-watch/actions/runs/38136782887):success, exact tested sourceSHA above;69unit/23lab;8first-pass+1retry-pass live.
- Artifact **`p0-reliability-v03-38136782887`**, ID **11701846095**,16,749,560bytes. [Artifact page](https://github.com/tonnutkit-dev/Weather-watch/actions/runs/38136782887/artifacts/11701846095).
- SHA256 `a0b378cc4094cbef5c87000771f9f88704af8765763eb78fdf4e93b1aa4f32af`; expiry2027-01-09T11:46:20Z.
- [Complete evidence index](docs/qa-p0/EVIDENCE_INDEX.md):large screenshot/trace paths, live-provider screenshot lookup, rawresults.json, failure trace, download/API-access limitations.
- [Permanent machine summary](docs/qa-p0/summary.json), [36load samples](docs/qa-p0/loads.csv), [6interaction samples](docs/qa-p0/interactions.csv), [run history](docs/qa-p0/actions-history.json), [live runtime evidence](docs/qa-p0/live-runtime-errors.json).

The isolated workflow has read-only repository permission, no merge or deployment job, and only the correction branch as its push trigger. Existing public QA is untouched. Lead can inspect source/report/permanent evidence directly through GitHub and retrieve larger evidence through the existing connection; no owner download/re-upload is needed.

## 15. Draft PR

No Draft PR created. The complete isolated branch is ready for review through its immutable source/report links. No review-request messages, main merge or public deployment occurred.

## 16. Clear next-stage recommendation

Review R01's conservative unverified-image contract, R02's source deadlines/admission policy, final live flake and Leaflet adverse-case request increase. Deterministic P0 contracts pass; matched main-thread cost is approximately+0.8%, with equal root/forecast renders, rAFp95 and ordinary request counts. This supports the candidate being sent to Lead, not automatic merge or acceptance.

After Lead review and owner authorization, merge/deploy P0 as a separately validated release if its disclosure is accepted. Obtain physical iPhone Safari/Chrome checks for pinch direction, sheet gestures, location/theme switches, offline→online, resume after2h/3h, rapidmanualrefresh, Reduced Motion, map attribution and10–20minute use. Then authorize narrowly scoped P1 fixes and subsequently Design C integration; do not silently combine these phases or copy the prototype's map lifecycle.

**P0 CORRECTIONS READY FOR LEAD REVIEW**
