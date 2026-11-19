# Weather Watch V0.3 — Smooth Radar Playback: implementation, audit response and isolated deployment

## Decision and usable result

**CONDITIONAL OWNER QA — deployed and verified on actual HTTPS. Not full Smooth Playback acceptance and not production acceptance.**

The isolated application now targets 2.5 seconds between historical frames instead of five seconds. Play gives immediate feedback, the first selected advance occurs around 1.6–1.7 seconds in the measured runs, and changed radar pixels were sampled around 1.9–2.0 seconds in the accepted production-build test. Pause, manual scrub, looping, sheet transitions and visibility cleanup retain their existing contracts.

A remaining **WebKit LAB pixel-readiness flake** prevents claiming that all P1 concerns are fully closed: one attempt saw zero changed pixels within the bounded 750ms check after qualified transport; retry passed. Real-provider HTTPS pixel/cadence checks passed on all three profiles, but that does not erase the LAB failure or establish complete viewport pixels. A bounded render-after-source-readiness barrier was proposed at the end; **it was NOT implemented or deployed**, because the workspace execution service disconnected before creating the process. Do not assume the deployed build includes that barrier.

Owner QA URL: https://weather-watch-v03-p0-owner-qa-ton.tonnutkit.chatgpt.site/

## Source integrity and protected boundaries

Repository: https://github.com/tonnutkit-dev/Weather-watch

- Starting verified handoff: `97d700346783590d4c75f7e7bb6a972447c2d627`.
- Previously deployed application: `b17c5a5e1af4900cd9aba80cb1488f6447bf450f`.
- New branch: `work/radar-smooth-playback-v03`, created from the verified handoff.
- Deployed application source: **`8f137edc921d677cd3693229b670506495057cd2`**.
- Shipping application bytes at that ref are identical to `ea77b92490ad35788215772ae0f0129990bdb336`; later changes through 8f137ed refined diagnostics/tests, not application code.
- Hosting/package source SHA: `41d9d93de39c19c3af4074201b1a838d4c73d7bb` (separate Sites source repository, containing approved application files plus deployment-only packaging).
- Protected main independently rechecked: `2036e2ac788cb31d25fd387cb40520ad95c408a6`.
- Prior P0 branch rechecked unchanged at 97d7003.
- Approved Design C exploration rechecked unchanged: `19ec27ce5abc338a65cf368d17f6d3abbf884840`.
- No merge, force-push, v0.2 Pages replacement, new hosting project, Design C integration or unrelated provider change occurred.

The hosting manifest retains project `appgprj_6acb7faa5b3c8191b7a76763de6a5ce2`. All 60 approved source/config/test files were checked against the exact GitHub source; zero mismatches. Vite remains configured for /Weather-watch/ in the repository; the isolated root hosting build uses CLI --base / only. The hosting build adds the Owner QA title and release/integrity metadata; no diagnostic fixtures enter dist.

GitHub Pages v0.2: https://tonnutkit-dev.github.io/Weather-watch/ — anonymous deployment verification checked its release commit against protected main.

## Investigation and confirmed bottleneck

**INSPECTED:** the previous hotfix already used a 1500ms first deadline and 5000ms subsequent deadline, one 500ms foreground readiness timer, matching-generation guards and the shared image budget/cache.

**OBSERVED (Lead-supplied physical iPhone recording, not retested by Work):** selected source times advanced every five video seconds and imagery changed. This was an experience correction, not another repair of the original 15-second timer.

**MEASURED:** baseline run 38155775590 executed real HTTPS, real providers, Chromium, WebKit and forced Leaflet/Reduced Motion. Each profile sampled six advances and five subsequent intervals. Subsequent medians were 4997/5034/4999ms. All six map-image comparisons per profile changed pixels; the radar-hidden control changed zero pixels. Thus the regular five-second scheduler, rather than universally blocked Play, was a confirmed bottleneck in loaded conditions. Slow rendering remains a separate concern.

## Exact shipping changes

1. **src/radar/playback.ts** — 2500ms subsequent target; existing 1500ms first deadline retained. A separate readiness epoch requires at least 750ms of qualified current-frame readiness before moving past a late frame. Superseded keys/viewport readiness reset that epoch; there is no catch-up. A qualified cached frame can advance at zero remaining network capacity; missing imagery then waits honestly. One existing foreground timer, no continuous animation.
2. **src/components/RadarControls.tsx** — compact immediate start/playing/buffering/budget/background/failed/paused messages plus detailed explanations. Selected time remains explicitly qualified. No claim of confirmed viewport pixels.
3. **src/radar/decode.ts** — validate genuine image bytes before successful cache admission. Close temporary ImageBitmaps; revoke fallback image URLs on success/error/abort; reject obsolete completions.
4. **src/radar/budget.ts** — decode successful response bytes before cache admission and reject an already-aborted cache request. Existing 80 starts/rolling 60s, five-minute expiry, 90-entry bound, provider security checks and timeout remain intact.
5. **src/maps/GLCanvas.tsx** — reject the current radar gate on later MapLibre raster decode/render errors. Map instance and single raster source remain intact.
6. **src/maps/BoundedRadarLayer.ts** / **src/maps/RasterCanvas.tsx** — extract the existing bounded Leaflet layer and own blob URLs separately from img.src. Release on tileabort, tileunload and layer removal; cancel obsolete work and ignore late completion.

No weather/AQ adapters, freshness policy, App orchestration, approved design tokens, package dependencies, provenance, renderer generation contract or RainViewer history contract was replaced.

No prefetch was introduced. Existing concurrent identical misses are not coalesced before first cache fill. Adding a lookahead consumer could duplicate requests and needs correct viewport bookkeeping in both renderers. Normal loaded cadence improved without it. The recommended one-next-frame preparation remains a focused follow-up for slow-network cases; uncached selections can temporarily lack imagery.

## Explicit response to the independent Codex P1 audit

The independent audit did not rerun the complete suites; its hypotheses were checked against source and new executable tests.

| P1 finding | Result | Evidence / tests | Remaining risk |
|---|---|---|---|
| Selected time does not prove visible imagery | **CONFIRMED; MITIGATED, not fully closed** | Qualified selected-time label; displayedTime:null; real map-only PNG comparisons; distinct-frame LAB images and radar-hidden control | Public renderer events do not establish complete coverage. WebKit LAB pixel check was flaky once even after transport qualified. |
| Dwell may expire during buffering | **CONFIRMED; timing contract CORRECTED** | Separate readiness clock in playback.ts; fake-timer delayed/obsolete/refresh tests; LAB records actual status/time transitions and enforces >=750ms dwell | Readiness dwell is not an atomic GPU-visible frame commit; render-after-readiness barrier remains proposed, unimplemented. |
| MapLibre transport success before PNG decoding failure | **CONFIRMED; CORRECTED at admission, MITIGATED at renderer** | decode.ts; budget.ts admits only decoded data; GL late error rejects gate; corrupt PNG browser test; bitmap/URL cleanup and corrupt-cache unit tests | MapLibre still performs its own decode/upload; complete viewport pixels remain unverified. Extra decode has CPU cost. |
| Leaflet zoom cancellation may leak requests/blob URLs | **CONFIRMED; CORRECTED** | Leaflet tileabort differs from tileunload and can replace src first. Owned URL resource table releases both paths and layer removal. Unit tests cover late completion/replaced src/idempotency; LAB zoom/hide checks zero remaining URLs. | Sustained GPU/renderer memory behavior is not established by URL cleanup alone. |
| Zero network capacity blocks cached playback | **CONFIRMED; CORRECTED** | Playback allows qualified frame progress at zero capacity; cache-hit unit test starts no new fetch; missing-frame budget wait and 81st-request admission remain tested. | No prefetch-all; a cache miss may wait until capacity returns. Budget is per app context, not coordination across all clients sharing an IP. |

No artificial weather interpolation, morphing, crossfade, nowcast or pixel-complete confirmation was added.

## Timing, requests and performance evidence

Environment: Linux GitHub Actions, Node 24, Playwright-installed Chromium/WebKit, mobile emulation 390×844 with touch. Fresh contexts, unthrottled runner network and CPU. Forced WebGL failure selects Leaflet; that profile also uses Reduced Motion. Not a physical iPhone. One baseline run/profile and one accepted candidate run/profile; five subsequent interval samples/profile. These counts do not support field p95 cadence or device FPS claims.

Accepted candidate run: https://github.com/tonnutkit-dev/Weather-watch/actions/runs/38157833087

| Profile | First selected before / after, ms | First changed-image sample after, ms | Subsequent median before / after, ms (n=5) | Radar starts before / after | rAF p95 before / after, ms |
|---|---:|---:|---:|---:|---:|
| Chromium / MapLibre | 1696 / 1690 | 1983 | 4997 / 2503 | 42 / 42 | 16.8 / 33.3 |
| WebKit / MapLibre | 1634 / 1636 | 1978 | 5034 / 2515 | 42 / 42 | 18 / 23 |
| Chromium / Leaflet + Reduced Motion | 1615 / 1600 | 1862 | 4999 / 2505 | 24 / 24 | 16.8 / 16.8 |

First changed-image sample is an upper-bound sampled observation, not exact pixel-onset time. Before image-sample timing was not recorded; baseline screenshots nevertheless demonstrate six actual changes/profile. Selected time and sampled visible imagery are reported separately.

PNG comparisons use a map-only clip excluding timeline/status UI. RGB channel difference threshold >8, multiple distinct changed-image samples, and a radar-hidden stable-basemap control. They demonstrate sampled visible changes, not full viewport coverage or no-rain conclusions.

Observed peak starts in each sampled rolling-minute window were 42 for GL and 24 for Leaflet, below 80. These sessions are shorter than a sustained multi-minute playback test. Deterministic tests establish that the 81st start waits, cached hits consume no start, abort cancels a budget wait, cache expiry is five minutes and only 90 successful entries remain.

The same GL canvas object was retained, with one active canvas. Leaflet uses no canvas. Source inspection confirms no extra MapLibre construction or map lifecycle reset. This is not a GPU allocation count.

**Performance caveat:** higher GL rAF p95 is an observed risk. Measurements include startup/network variability and screenshot overhead; screenshot work occurs twice as frequently per playback second after the cadence change, and different CI runners/real frames prevent causal attribution. Do NOT describe this as improved map FPS or proven absence of performance regression. Coarse short-session JS heap stayed 26→26MB (Chromium) and 10→10MB (Leaflet) in the accepted candidate; WebKit heap unavailable. No physical battery/thermal percentages, GPU memory, field INP or 10–20 minute leak claim.

## Build and executable QA results

Executed locally before runner loss, in CI, and for the isolated root hosting build:

- npm ci in GitHub Actions (reproducible lockfile); existing local dependencies reused without adding a dependency.
- npm run typecheck — PASS.
- npm test — **93/93 PASS**, nine files, including existing R01/R02 expiry/provenance tests, new fake-timer playback/readiness tests, 80/min/cache tests, decoder and Leaflet resource tests.
- npm run build — PASS.
- npm run verify:pages — PASS, /Weather-watch/ base, entry assets, worker and Thai font.
- npm run test:e2e — original nine browser cases; includes 375×667, 390×844, 430×932, tablet 820×1180, desktop, both themes, sheet geometry/gestures, location selection, map interaction, attribution, offline/provider failure.
- qa-playback-v03 regression — Play/Pause, scrub, sheet/theme, retained canvas and request bound.
- qa-smooth-v03 — genuine pixels/cadence and distinct LAB images, delayed dwell, corrupt PNG, viewport change and resource release.
- Root hosting build: exact approved source checks, --base /, no diagnostic fixture paths in production assets.

**Accepted candidate 38157833087: SUCCESS with retained flakes.** 93 units passed; LAB 3/3 passed; original regressions seven passed first attempt +two flaky (all nine final successes); hotfix regression passed; real radar two first-attempt passes +one flaky (all three final successes). Flakes were initial weather loading. No timeout/retry limits or assertions were relaxed.

**Actual deployed HTTPS 38158557257: SUCCESS with retained flakes.** Anonymous release/source check, all 36 asset SHA-256 hashes, worker/fonts/lazy chunks and protected Pages release passed. 93 units passed. Original regressions six first-attempt passes +three flaky, all nine final successes. Hotfix regression passed. Real radar two first-attempt passes +one WebKit initial-weather flake, all three final successes. Successful pixel/cadence cases observed no page errors. Do not relabel retried cases as clean first-attempt passes.

**Standalone LAB evidence 38158793640: SUCCESS with one WebKit pixel flake.** Chromium and Leaflet first attempts passed; WebKit's first attempt saw zero changed pixels within the 750ms bound after qualification and retry passed. This is a renderer-readiness concern, not a provider-network flake, and remains explicitly open.

Physical iPhone Safari/Chrome, keyboard appearance on actual iOS, battery/thermal and sustained GPU/heap validation remain NOT TESTED by Work.

## Failed earlier runs and diagnostic corrections

- 38154899305: initial harness selector/scrub issues; not acceptance evidence.
- 38155066201: baseline success with a weather flake, but doubled output path meant no artifact uploaded. Corrected baseline 38155775590 provides accessible evidence.
- 38156014152: real WebKit weather load failed both attempts; other radar cases and hotfix regression passed.
- 38156537839: original live-weather regression failed twice, another case flaky; WebKit LAB immediate screenshot showed old pixels. Real radar cases completed successfully on all profiles, Leaflet on retry.
- 38157013380: reproduced WebKit LAB pixel failure; original suite skipped due prior failed step; real WebKit weather load flaky.
- 38157391634: provider-sized 512px PNGs and bounded pixel polling reached the viewport test; mobile WebKit mouse.wheel unsupported. Harness changed to supported keyboard zoom while retaining a real zoom-change assertion. No pixel threshold was weakened.
- LAB evidence initially shared report output with subsequent real tests; a standalone evidence workflow now retains LAB PNGs/traces separately.
- Workspace execution later disconnected: process creation rejected with exec-server transport disconnected / recovery timeout; repeated minimal commands could not resume it. The proposed additional render barrier was not applied. Final local working-tree status cannot be certified after that failure; remote refs/source are independently verified.

## Deployment record

Provider: ChatGPT Sites / Cloudflare, existing isolated project only.
Project: `appgprj_6acb7faa5b3c8191b7a76763de6a5ce2`.
Public URL: https://weather-watch-v03-p0-owner-qa-ton.tonnutkit.chatgpt.site/
Saved version: 3, `appgprj_6acb7faa5b3c8191b7a76763de6a5ce2~appgver_783d9380fe1081918ffe21b8da2b8316`.
Deployment: `appgdep_6acbc2b70160819188155fbb6a668f0e`, succeeded.
Application source: 8f137edc921d677cd3693229b670506495057cd2.
Packaging source: 41d9d93de39c19c3af4074201b1a838d4c73d7bb.
Archive SHA-256: 352ad614e15056ce685a947e4607295418ef87bd91870a70d167470e99a1900f.
Archive contains 38 deployment files; native saved-version metadata records it.

Public machine-readable verification:
- https://weather-watch-v03-p0-owner-qa-ton.tonnutkit.chatgpt.site/release.json
- https://weather-watch-v03-p0-owner-qa-ton.tonnutkit.chatgpt.site/asset-integrity.json

The anonymous integrity test normalizes only the identified Cloudflare JS-detection suffix in served HTML, then hashes every remaining application byte. It does not ignore application mismatches.

## GitHub evidence access — no owner download/re-upload needed

Large screenshots/traces and HTML reports are Actions artifacts (90-day retention). The Lead can retrieve them using GitHub independently.

| Evidence | Run URL | Artifact name | Artifact ID |
|---|---|---|---:|
| Real HTTPS baseline | https://github.com/tonnutkit-dev/Weather-watch/actions/runs/38155775590 | radar-smooth-v03-38155775590 | 11708288298 |
| Earlier failures / partial corrected measurements | https://github.com/tonnutkit-dev/Weather-watch/actions/runs/38156537839 | radar-smooth-v03-38156537839 | 11708736466 |
| Accepted candidate production build | https://github.com/tonnutkit-dev/Weather-watch/actions/runs/38157833087 | radar-smooth-v03-38157833087 | 11709537232 |
| Actual deployed HTTPS, desktop/mobile screenshots and real radar | https://github.com/tonnutkit-dev/Weather-watch/actions/runs/38158557257 | radar-smooth-deployed-v03-38158557257 | 11708654493 |
| Separate LAB frame images/resource evidence, including WebKit flake | https://github.com/tonnutkit-dev/Weather-watch/actions/runs/38158793640 | radar-audit-lab-v03-38158793640 | 11708778422 |

Report path: docs/SMOOTH_RADAR_PLAYBACK_V03.md.
Small results/index: docs/qa/smooth-v03/MEASURED_SUMMARY.json and docs/qa/smooth-v03/EVIDENCE_INDEX.json.
Raw per-profile JSON attachments in HTML reports: smooth-playback-measurements, cadence-and-pixels-before-assertions, LAB-audit-P1-evidence. PNGs include actual-radar-frame-N, LAB initial/delayed/next imagery, desktop/mobile Light/Dark and sheet-state screenshots. Failed attempts retain traces.
Artifacts require GitHub access and expire around 2027-01-09; no public unauthenticated artifact guarantee. The website itself is public without login.
After runtime loss, additional local parsing/visual inspection of the deployed artifact could not complete. Browser screenshots were actually captured by external Playwright, not generated artwork.

## Owner iPhone retest and narrowly scoped next work

On both physical Safari and Chrome: wait for available radar, tap Play once, verify immediate Pause/start feedback and watch at least six genuine images. Normal loaded target is 2–3s; buffering/budget may wait longer. Check Pause stops progression, scrub manually, open/collapse the sheet, change theme/location, background for 20s and resume. Observe image movement as well as selected time. The final historical frame should loop to the first. Blank imagery must not be read as no rain.

Lead follow-up: reproduce the remaining WebKit LAB pixel delay with retained traces and a physical iPhone. Implement and benchmark a bounded post-source render barrier before readiness dwell, or a one-next-frame preparation/commit contract if justified by measured slow-network benefit. Preserve displayedTime:null unless complete pixel evidence genuinely exists; retain the single-source/budget/cache protections and avoid extra continuous repaint. Repeat matched paint/cadence and interaction measurements, including a sustained session. Keep this work isolated; no Design C or main merge yet.

**Final recommendation: CONDITIONAL OWNER QA. The deployed loaded-condition experience is more responsive and actual HTTPS verification passed, but the WebKit LAB pixel flake and physical-device performance remain open. NOT full P1 closure, NOT main/production acceptance.**
