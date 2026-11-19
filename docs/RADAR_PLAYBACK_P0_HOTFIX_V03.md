# Weather Watch V0.3 P0 — Radar playback hotfix

Owner: TON. Scope: isolated playback correction and existing isolated Owner QA update. No main merge, Pages replacement, Design C integration, provider change or paid service.

## Source integrity and deployment

- Repository: https://github.com/tonnutkit-dev/Weather-watch
- Branch: `work/p0-reliability-correction-v03`
- Starting handoff: `acab1e4e56cd2ec935144d0ad180973c6c30113c`.
- Previously deployed candidate: `4b3548fa49abd9475547fc6e8336a1b854ad6952`.
- Hotfix executable source commit: `c5862c6fac08b16313a4be5cd71df15dc9d008a2`.
- Tested/deployed candidate: `b17c5a5e1af4900cd9aba80cb1488f6447bf450f`; its only difference from c586 is the browser test's distinct-frame keyboard scrubbing correction and terminal newline.
- Subsequent commits e9f5225, 611afe1 and 124eb6d change only the isolated HTTPS verification workflow. They do not change application source.
- Protected main: `2036e2ac788cb31d25fd387cb40520ad95c408a6`.
- Existing Pages: https://tonnutkit-dev.github.io/Weather-watch/ — remains v0.2.
- Updated isolated Owner QA: https://weather-watch-v03-p0-owner-qa-ton.tonnutkit.chatgpt.site/
- Hosting: ChatGPT Sites / Cloudflare. Same project `appgprj_6acb7faa5b3c8191b7a76763de6a5ce2`, public audience retained.
- Saved version 2: `appgprj_6acb7faa5b3c8191b7a76763de6a5ce2~appgver_5434a5a67fb08191ac2701c3e6868bfa`.
- Deployment: `appgdep_6acbaa4be8bc8191b5b0e05bea9bbb52`, native result **succeeded**, 2026-10-11 15:25:26 UTC.
- Hosting source/package commit: `d4c5d90b1948f9bc8cc81551d4c672d0dd29c916`. This is the Site packaging repository commit, distinct from the GitHub application candidate.
- Build manifest checks SHA-256 of 53 application/config/package files. Base override is build-only `/`; retained GitHub Vite configuration stays `/Weather-watch/`. No credentials or fixtures in the public bundle. `release.json` identifies b17c5a5. `applicationSourceUnchanged` means unchanged from that approved hotfix candidate, not unchanged from v0.2.

## Root cause: evidence and limits

**OBSERVED by owner on physical iPhone Safari:** Play did not visibly autoplay; manual scrubbing worked. Other seven QA checks passed. This work does not claim independent physical iPhone testing.

**VERIFIED source mechanisms:** App used a 15,000 ms interval with no early frame step. Mobile sheet expansion stopped play. Metadata refresh reset selection to the newest frame and stopped play. Combined, these made the first visible progression slow and easy to interrupt. A deterministic legacy scheduling reproduction produced zero advances at two seconds and its first advance at 15 seconds.

**INFERRED:** These mechanisms explain the reported perception. A separate Safari timer/renderer engine defect was not reproduced or proven. The hotfix addresses the verified scheduling and reset behavior rather than claiming an unverified browser bug.

## Exact correction and state contract

`src/radar/playback.ts` implements a small controller with one foreground timeout and an external-store snapshot. `src/radar/usePlayback.ts` owns React integration and visibility listener cleanup. App keeps its map lifecycle.

- Play changes the button to Pause and announces play intent immediately.
- First step is due after **1,500 ms** under qualified loaded conditions. Subsequent steps are due no faster than **5,000 ms** apart. The final historical frame wraps to the first.
- While playing, a **500 ms** readiness check waits without changing the selected frame when loading, refreshing, superseded generation or insufficient evidence prevents progress. Stable status snapshots do not notify subscribers repeatedly.
- No all-frame preload, interpolation or future imagery.
- Readiness requires the presentation key to match the current frame/location/theme/layer generation and transport state to be qualified. It explicitly rejects `no-current-frame-tiles-confirmed`. This is **not** viewport pixel confirmation; selected timestamps remain qualified as “เลือก” and imagery remains “ภาพยังไม่ยืนยัน”. `displayedTime` remains null.
- Explicit states: paused, buffering, playing, budget, suspended, failed and unavailable. They are diagnostic playback states, not precipitation observations.
- Pause clears the timer. Manual scrubbing selects a bounded frame and pauses. Location change or hiding the radar layer deliberately stops playback.
- Sheet changes retain play intent. Controls may temporarily hide in enlarged sheet states according to the existing layout, then return without an accidental stop.
- Metadata refresh preserves the selected historical timestamp if still available and preserves play intent. If that time rolls out of history, the selection clamps to an available historical frame. Loading is still qualified.
- Hidden tabs suspend timers without catching up missed frames. Resume waits 1.5 seconds and rechecks readiness. Unmount removes the visibility listener and timer.
- Metadata errors or failed selected tiles stop playback; no false success is claimed. Exhausted remaining request capacity waits. Actual admissions remain enforced by the existing budget adapter.

## Preserved boundaries and request impact

Provider adapters, `src/radar/budget.ts`, MapLibre/Leaflet renderers, style tokens, DESIGN.md, weather/AQ freshness logic, dependencies/lockfile, Vite config and the Pages workflow are byte-identical to the starting handoff. The added HTTPS workflow has read-only GitHub permissions and **no deployment job**.

- RainViewer historical frames only, single-source strategy, attribution and China/coverage warnings retained.
- Existing **80 request starts per rolling 60 seconds**, five-minute image cache, bounded 90 entries, abort behavior and 12-second image timeout retained.
- Faster stepping can consume that unchanged budget sooner than the old 15-second interval. Playback is readiness-gated and stops/waits honestly on failures or exhausted capacity; it does not guarantee uninterrupted animation on a slow or heavily panned viewport.
- Predeployment real-network Chromium test: first selected-frame advance **1,649 ms**, **20 tile requests**, peak rolling minute **20**, same MapLibre canvas before/after theme/sheet interactions, **zero page errors**. One live playback sample; no population p95 for first-frame latency.
- RequestAnimationFrame samples in that test: n=940, interval p95 **33.4 ms**, zero intervals excluded above one second. This measures browser callback spacing, not physical iPhone FPS or GPU throughput.
- Root-base entry JS: 419.92 kB / gzip 134.32 kB, approximately +4.16 kB raw / +1.43 kB gzip versus prior P0. No new dependency or continuous animation.

## Automated checks actually executed

| Check | Result / evidence |
|---|---|
| Reproducible npm ci | GitHub Actions PASS |
| Production TypeScript | PASS |
| Unit suite | **80/80 PASS**, 7 files; existing 69 retained plus 11 playback/App tests |
| Production build | PASS |
| `/Weather-watch/` verification | PASS; worker/font and entry asset paths verified |
| Root-base Site typecheck, units, build | PASS, 80/80; 36 deployed assets |
| Original live browser regressions | **9/9 PASS** in hotfix run 38150871753 |
| Real Play/Pause browser test | **1/1 PASS** in 38150871753; no fixture routes |
| Existing deterministic R01/R02 laboratory | **23/23 PASS** in 38144354075 |
| Protected source/main checks | PASS |

New fake-timer coverage includes immediate play intent, first/subsequent steps, pause, wrap, scrubbing, delayed/unverified/failed tiles, generation mismatch, quota exhaustion, hidden/resume without catch-up, metadata refresh, sheet rerenders, listener/timer cleanup and actual App sheet transitions. Existing six budget tests continue to exercise 80/min admission, expiration, bounded cache and abort behavior.

Original browser checks exercise 375×667, 390×844 and 430×932 layouts, themes, sheet geometry, location switching, attribution and offline states. Real automatic progression test uses Linux Chromium 156 with a 390×844 touch/mobile profile. This is not Safari or physical hardware.

### Failures retained; no hidden weakening

1. First hotfix run **38144354129 failed**: after successful automatic steps and Pause, the new test scrubbed to frame index 1, which was already selected. The assertion correctly failed. The retry separately failed initial weather loading at the unchanged 45-second limit. The fix chooses a distinct frame using native keyboard `End`; assertions/timeouts remained intact.
2. P0 run 38144354075 passed overall, but some original live-network cases passed on retry. Their first-attempt screenshots and traces remain in its artifact. This is not a claim that public providers never fail.
3. Initial deployed checks **38151298680** and **38151495225 failed exact HTML hashing**. Captured response proved Cloudflare appended request-specific JS detection (`window.__CF$cv$params`, `/cdn-cgi/challenge-platform/scripts/jsd/main.js`). Local response was byte-identical; external runner received the extra suffix. The verification now strips only that identified trailing host suffix, then requires the remaining HTML's exact build hash. JS, CSS, fonts, worker, release and all other assets retain full SHA-256 checks. Original response is retained as evidence. No application assertion or network timeout was relaxed. Initial failed run also tried Playwright after an earlier dependency step was skipped; later workflow explicitly requires successful browser installation.

## Matched performance / regression evidence

Small machine-readable extract: `docs/qa/radar-playback-v03/measurements.json`. Full raw JSON, screenshots and traces are Actions artifacts.

The reused diagnostic compares protected **main v0.2** against hotfix **c586**, not just pre-hotfix P0 against hotfix. Thus R01/R02 and playback differences are confounded. It is a bounded regression signal, not proof of a pure hotfix performance improvement. Laboratory uses recorded weather/AQ, synthetic radar PNGs, minimal basemap and software GPU. These assets never ship.

- 36 load samples: three cold and three warm samples per build/profile (desktop, mobile, CPU-throttled profile).
- Mobile load medians: LCP cold **176 → 176 ms**, warm **112 → 120 ms**; CLS approximately zero. localhost/fixtures, not public-site Core Web Vitals.
- Three short interaction runs/build: median rAF interval **16.7 → 16.7 ms**; per-run p95 **50/50/50 → 50/50/50.1 ms**.
- All six interaction runs retain one MapLibre instance, identical before/after global listener inventories, one weather request, one AQ request and 20 radar requests.
- Post-GC JavaScript heap approximately **9.27–9.29 MB → 9.37–9.39 MB**. Short samples do not establish leak freedom or GPU memory stability.
- Desktop warm CLS in this lab was higher (**median 0.13** after vs 0.075 before). Do not dismiss this as a proven fix or pursue unrelated layout changes in this playback-only scope; preserve it for later performance investigation.
- No claimed field INP, physical 60 FPS, battery drain, thermal or long-session memory result.

## Fallback, reduced motion and limitations

MapLibre and Leaflet source remain unchanged. Existing deterministic before/after tests exercise fallback readiness, failed tiles, cancellation and data-truth semantics in both renderers. Playback gating controller tests are renderer-neutral. **Dedicated end-to-end autoplay on physical Safari/Leaflet is not tested**. Reduced-motion and accessibility/layout regressions use the existing suite; no added looping CSS animation. Button `aria-pressed`, native range keyboard input and polite playback status remain usable.

A fully confirmed visible radar pixel timestamp remains unavailable from these renderer contracts; transport readiness is not proof of complete viewport coverage. Real provider outages, China radar gaps, quota exhaustion and slow tiles may delay or stop progression. Map/weather functionality remains independent.

## Evidence references

- Successful source hotfix QA: https://github.com/tonnutkit-dev/Weather-watch/actions/runs/38150871753
  - artifact `radar-playback-v03-38150871753`, ID **11706663931**, 4,680,502 bytes.
  - real Play mobile and paused Dark screenshots plus embedded JSON measurements, original regression screenshots.
- Original failed hotfix QA: https://github.com/tonnutkit-dev/Weather-watch/actions/runs/38144354129
  - artifact `radar-playback-v03-38144354129`, ID **11703723981**.
- Existing P0/matched QA: https://github.com/tonnutkit-dev/Weather-watch/actions/runs/38144354075
  - artifact `p0-reliability-v03-38144354075`, ID **11704525981**, 27,052,850 bytes.
- Hosting response diagnostic: https://github.com/tonnutkit-dev/Weather-watch/actions/runs/38151495225
  - artifact `radar-playback-deployed-v03-38151495225`, ID **11705564600**.
- Final actual HTTPS verification: https://github.com/tonnutkit-dev/Weather-watch/actions/runs/38151629900 — final results appended below after completion.
- Artifacts retained 90 days; GitHub sign-in/repository access may be required to download Actions evidence. Public Owner QA itself requires no sign-in.

## Owner iPhone acceptance

Reload the isolated QA, tap Play, confirm immediate Pause icon/status and first selected time change around 1–2 seconds when tiles are loaded. Wait for subsequent steps; Pause must hold time. Scrub manually, play again, expand/collapse sheet, switch theme, background Safari and resume. Confirm buffering/unverified/failure messages remain honest. Repeat on iPhone Chrome if available. Physical owner retest is required before declaring the reported Safari symptom accepted. No main merge or final production acceptance is implied.

## Final actual HTTPS result and decision

**PASS** — run **38151629900**, job 114506105599, completed successfully. Anonymous requests verified b17c5a5 release provenance, all **36 assets**, fonts, worker and lazy chunks (application HTML exact after the identified hosting suffix), protected Pages release and unchanged main. Original browser tests **9/9**, real autoplay test **1/1**. No retry needed in this deployed run.

Actual public-site playback: first selected-frame advance **1,653 ms**; 20 radar tile requests / peak 20 per rolling minute; same MapLibre canvas; zero page errors. rAF n=1,721, p95 **33.3 ms**, no samples excluded above one second. One real-site scenario, not a physical-device benchmark. Play changes intent immediately; visible radar pixels remain qualified/unverified rather than falsely confirmed.

Artifact **`radar-playback-deployed-v03-38151629900`**, ID **11705879530**, 4,760,123 bytes:
https://github.com/tonnutkit-dev/Weather-watch/actions/runs/38151629900/artifacts/11705879530

Includes actual deployed Light-playing / Dark-paused screenshots, original mobile/desktop QA screenshots, embedded JSON measurements and the Cloudflare-transformed HTML evidence. Full details are in the Playwright HTML report; small measurement/provenance files are committed for direct GitHub review.

### Files changed in this hotfix (relative to acab handoff)

| Path | Purpose |
|---|---|
| `src/app/App.tsx` | Use playback controller; remove 15-second scheduler and accidental sheet/refresh resets |
| `src/radar/playback.ts` | Bounded readiness-aware scheduling and state contract |
| `src/radar/usePlayback.ts` | React/visibility integration and cleanup |
| `src/components/RadarControls.tsx` | Immediate Play/Pause intent/status; qualified selected timestamps retained |
| `src/tests/radar-playback.test.tsx` | Ten deterministic controller/hook tests |
| `src/tests/app.test.tsx` | Actual App sheet regression; isolated test renderer evidence |
| `qa-playback-v03/playback.spec.ts` | Real automatic progression/Pause/scrub/theme/sheet/request checks |
| `qa-playback-v03/playwright.config.ts` | Mobile real-network local/deployed QA configuration |
| `.github/workflows/radar-playback-hotfix-v03.yml` | Type/unit/build/Pages and original/new browser checks |
| `.github/workflows/radar-playback-deployed-v03.yml` | Anonymous source integrity and actual HTTPS browser checks, never deployment |
| `.gitignore` | Exclude local QA outputs |
| `docs/RADAR_PLAYBACK_P0_HOTFIX_V03.md` | Complete handoff, failures and limitations |
| `docs/qa/radar-playback-v03/measurements.json` | Compact actual measurements/check statuses |
| `docs/qa/radar-playback-v03/approved-source.json` | 53 approved source hashes |
| `docs/qa/radar-playback-v03/deployed-release.json` | Exact deployed public release metadata |

The hosting repository has only deployment packaging/provenance changes plus byte-identical copies of the hotfix application/test files. No new hosting project was created; only the existing isolated Owner QA was updated. Main and the v0.2 Pages deployment were not modified. No force-push, merge or production website replacement.

**PLAYBACK HOTFIX READY FOR OWNER RETEST / LEAD REVIEW.** Independent physical iPhone Safari/Chrome confirmation remains outstanding. Suggested next action is the narrowly scoped owner Play/Pause/background/sheet retest above, then Lead acceptance. No P1 or Design C implementation is authorized by this report.
