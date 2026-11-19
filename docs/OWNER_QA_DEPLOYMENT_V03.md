# Weather Watch V0.3 P0 — isolated public Owner QA deployment

**Public HTTPS Owner QA:** https://weather-watch-v03-p0-owner-qa-ton.tonnutkit.chatgpt.site/

This is a new independent QA project, not a main release or final owner acceptance. The original GitHub Pages site remains https://tonnutkit-dev.github.io/Weather-watch/.

## 1. Exact source and integrity

Repository: https://github.com/tonnutkit-dev/Weather-watch

Working branch: `work/p0-reliability-correction-v03`.

- Approved deployed application candidate: `4b3548fa49abd9475547fc6e8336a1b854ad6952`.
- Previously tested executable source: `6e0fc36f5554c3fa49578c79e35ef017a7c47e3e`.
- Protected main: `2036e2ac788cb31d25fd387cb40520ad95c408a6`.
- Design C exploration remains `19ec27ce5abc338a65cf368d17f6d3abbf884840`; no prototype was integrated.

**MEASURED:** the approved candidate differs from the tested executable only in reports and small QA evidence. Its ancestry includes protected main. The isolated hosting checkout verifies 51 executable/configuration/dependency source files by SHA256 against the exact approved candidate. Production `src/`, provider adapters, dependencies/lockfile, Vite configuration and original browser tests are unchanged. The later branch commits add non-shipping Owner QA utilities, a read-only workflow and this handoff only. They are not a different deployed application candidate.

See [deployment integrity](qa-owner-v03/deployment-integrity.json) and [51-file source manifest](qa-owner-v03/packaging/approved-source.json). The workflow independently asserts an empty protected-path diff against the approved candidate and unchanged remote main before external browser QA.

## 2. Hosting project, build and public access

Provider: **ChatGPT Sites / Cloudflare static hosting**. New project: **weather-watch-v03-p0-owner-qa-ton**. Access: **public, no viewer login required**. Project ID `appgprj_6acb7faa5b3c8191b7a76763de6a5ce2`; version 1; deployment ID `appgdep_6acb807b465c81918ecb5b6750df5017`.

Native deployment reached `succeeded`, then anonymous HTTP and external Chromium opened the actual HTTPS URL. No hosting password, API key, private credential or authenticated weather proxy was added. All weather/AQ/radar resources use the approved public browser adapters. Diagnostic fixtures, artificial lab PNGs and Design C pages are absent from the deployed static files.

**Deployment-only packaging:** Vite CLI `build --base /` for this new root-domain site; the approved source config remains `/Weather-watch/`. The output HTML title is `Weather Watch V0.3 P0 · Isolated Owner QA`, making the tab distinguishable from v0.2. Output `release.json` records the approved candidate, previously tested source, channel and root base. No application logic changed to deploy. Original `/Weather-watch/` build verification passed separately.

The new Sites source repository uses package commit `a445b13bd5d3a92b5d7f1fc7dadfb4043fd69452`; it is not a replacement GitHub application SHA. It includes the same approved application files plus hosting-only scaffolding. The source archive SHA256 is `2a50cb7f94908d25db1cdd3284914aef40f7ba97b48fa3f45c28ceedd586adf4`, 2,539,520 bytes. All 38 archive entries are production static output. Reproducible packaging code is [build-owner-qa.mjs](qa-owner-v03/packaging/build-owner-qa.mjs); no private Site credential is published.

## 3. Build and QA results

Local before deployment: reproducible dependency installation, `npm run typecheck`, `npm test` (69 tests), `npm run build`, and `GITHUB_SHA=4b3548fa49abd9475547fc6e8336a1b854ad6952 npm run verify:pages` passed. Root-domain packaging verified fonts, the MapLibre worker and lazy-loaded chunks. The same type/unit/build/Pages checks were repeated on the application-identical working branch. No new dependency was added; npm emitted the existing environment proxy-config warning.

Prior P0 implementation evidence remains [run38136782887](https://github.com/tonnutkit-dev/Weather-watch/actions/runs/38136782887) and [P0_RELIABILITY_CORRECTION_V03.md](../P0_RELIABILITY_CORRECTION_V03.md). Its deterministic fixture lab is separate from this deployment's live-provider browser testing.

### Actual deployed-site checks

**MEASURED:** anonymous HTTPS returned 200, release candidate/base matched, all 36 static entries matched from Work, including JS/CSS, Thai fonts, worker and lazy chunks. Original Pages release metadata remained the protected main. See [anonymous evidence](qa-owner-v03/anonymous-http-assets.json).

**MEASURED on external Linux Chromium, not a physical iPhone:** mobile390×844 with touch/mobile emulation and desktop1440×1000 opened the actual new URL. Real Bangkok weather appeared (25°C at the captured source time); after selecting Xi'an, real weather appeared (17°C). Both sessions loaded MapLibre, received real RainViewer PNGs (16 mobile /28 desktop in run38139983630), advanced real historical frames, retained qualified `เลือก` timestamps and an empty confirmed-display field, opened/closed the mobile sheet, switched Light/Dark and location, displayed attribution, and had no horizontal overflow. These are captured provider values for those sessions, not hardcoded values or current weather claims. No page errors, console errors or same-origin asset errors occurred in these two measured sessions. See [machine snapshots](qa-owner-v03/live-state-run38139983630.json).

Actual deployed Light/Dark screenshots at both sizes were visually inspected: current temperature/condition readable, map and real radar present, compact playback qualified, sheet not clipped, attribution visible. The approved v0.2 layout remains; this phase does not implement Design C.

Final [Actions run38140590946](https://github.com/tonnutkit-dev/Weather-watch/actions/runs/38140590946): **SUCCESS**, execution SHA `c66647b9e70a861a6ef370e0d2dc7ad98c697925` (QA-only commit; deployed application remains approved4b). Linux Chromium156.0.8078.4, unthrottled runner network. Original unchanged live suite: **8 first-pass +1 retry-pass flaky, 0 remaining failures**. New Owner QA suite: **3/3 first-pass**, including real-source offline browser-clock expiry: weather/AQ expired, verdict Unknown, exact visible compact stale message, original temperature retained and map independently ready. HTTP check:36 static entries verified; binary/code/font/CSS resources byte-exact, HTML exact after the recognized host wrapper when present. Protected main/Pages checks passed.

Final Owner QA sessions received17 mobile/28 desktop real radar PNGs, with zero page/console/static-asset errors. The source-expiry capture changed real26°C readings from fresh/Notable to expired/Unknown while retaining26°C as stale context; the map remained ready.

The original mobile-state live test's first attempt could not see the temperature within its unchanged45s limit; retry passed4.7s. This remains disclosed as a live provider/network flake, not an all-first-pass result. No app logic, timeout, assertions or retry policy was relaxed. The previous failure history remains above/below; final success does not erase it.

Final artifact: **`weather-watch-v03-p0-owner-qa-38140590946`**, ID **11703515333**, [artifact page](https://github.com/tonnutkit-dev/Weather-watch/actions/runs/38140590946/artifacts/11703515333), 11,068,585 bytes, SHA256 `b5a2de8dd3c992a9ca0257ad882c2b160b205afe271fa5bccbad9a73d9bbce24`, expiry2027-01-09T12:47:09Z. Contains the actual deployed screenshots, final3-test Owner QA report, original9-test regression report and its failure trace, HTTP asset record and source-expiry evidence. The final machine evidence and attachment lookup are in [evidence index](qa-owner-v03/EVIDENCE_INDEX.md).

### Investigation failures retained

1. Run [38139727596](https://github.com/tonnutkit-dev/Weather-watch/actions/runs/38139727596), commit `7ea9823421dc4b639a844624d0482f0989028961`, failed raw index-HTML SHA comparison. Browser installation was skipped by that failure; the targeted always-run tests consequently could not launch Chromium. These were infrastructure/test-pipeline failures, not evidence of application test passes. Artifact `weather-watch-v03-p0-owner-qa-38139727596`, ID11702555535, preserves failures.
2. Run [38139983630](https://github.com/tonnutkit-dev/Weather-watch/actions/runs/38139983630), commit `4032fd4e343ef31bb26c5c4cd0ee5b32c7ebb776`, installed Chromium independently. Original live suite: **8 first-pass, 1 retry-pass flaky, 0 remaining failures**. Two new mobile/desktop live checks passed. Source-expiry test: first attempt could not obtain fresh AQ in45s; retry reached weather/AQ `expired` and `Unknown`, but its broad text selector picked the hidden detailed-status element instead of the visible compact summary. The failure screenshot/accessible snapshot show the correct compact stale message. The workflow remained failure, and its evidence is retained.
3. The HTML mismatch is **MEASURED**, not an unexplained app/source change: Cloudflare added its JSD iframe/script wrapper at the edge. The captured HTML differs only by that wrapper; its dynamic ray/time makes raw hash variable. The diagnostic now permits only the exact captured Cloudflare wrapper template with bounded dynamic ray/time fields, then requires the remaining HTML SHA256 to equal the build manifest. Modified application paths, a modified wrapper URL, an unexpected extra script, or multiple wrappers are still rejected. All executable/static asset byte hashes remain strict. Raw edge HTML is preserved in artifacts. Six local normalizer assertions passed, including adversarial differences; reproduce with `node docs/qa-owner-v03/verify-html-integrity.mjs`. This corrects an invalid raw-byte assumption about host-added markup; it does not skip source integrity checks.
4. The expiry test now asserts the exact text and visibility of `.summary-message`, preserving its expired weather, expired AQ, Unknown, retained temperature and independent map assertions. Timeouts and retry limits were not extended, provider data was not fabricated, and production source/deployment was not changed. The HTTP and selector correction is isolated test commit `c66647b9e70a861a6ef370e0d2dc7ad98c697925`.

Artifact for run38139983630: `weather-watch-v03-p0-owner-qa-38139983630`, ID11702736328, 23,047,691 bytes, SHA256 `1f6e31c9c9ae153c85c9bd95b9788c40fd30fb6baaebbafad1b52707d2589bd5`, expiry2027-01-09T12:37:42Z. Contains actual mobile/desktop screenshots, trace ZIPs, both browser reports, raw HTTP records and mismatching HTML. GitHub login/connected access may be required to retrieve Actions artifact ZIPs; the application itself is public. Artifacts were retrieved through the authorized GitHub connector; owner download/re-upload is unnecessary.

## 4. Radar and data-truth limits

The approved R01 contract remains deliberately conservative: selected-time means requested frame, not pixel-confirmed display time. Pending/unverified/failed/cancelled states qualify imagery; `displayedTime:null` remains intentional. Successful PNG transport or MapLibre readiness does not prove complete exact-viewport radar coverage. Blank imagery is not a no-rain conclusion. Historical radar only; no nowcast/interpolation added. Existing80/min budget and5min bounded cache are unchanged.

R02 retains provider original timestamps,2h weather/3h AQ assessment limits, bounded foreground refresh and Unknown for invalid inputs. The deployed expiry test advances only its browser clock after real provider readings load and disconnects that test context; the public site serves no simulated values. Network/API failures remain possible, with original12s timeout/one retry. Run38139983630 failure traces record provider status−1 after approximately12s; see [failure evidence](qa-owner-v03/failures-run38139983630.json). The upstream cause is UNVERIFIED. The site does not guarantee fresh provider results every visit. A source-expiry pass is not evidence of literal three-hour physical iPhone suspension.

## 5. Protected deployments and Git history

- **Main was not modified or merged.** It remains `2036e2ac788cb31d25fd387cb40520ad95c408a6`.
- **Existing GitHub Pages v0.2 is unchanged.** Its actual public `release.json` remains that SHA.
- **No existing production project or deployment was replaced.** One new Site project/version was created; the Sites audience is public. Any provider-internal production classification applies only to this independent QA project.
- No force-push/history rewrite, unrelated repo change, Design C integration, paid service purchase or app-provider modification occurred.
- QA-only commits use preserved branch ancestry and expected-head leases. The new Actions workflow has read-only repository permissions and no deployment/merge step. Original Pages workflow was not changed or triggered by main push.

## 6. Owner iPhone checks and decision

**Physical iPhone Safari and Chrome: NOT TESTED.** Owner should open the new URL directly (no login), confirm the distinct V0.3 P0 tab title, then check weather/map/radar, selected-time qualifier and unverified/loading messages, pinch/pan, all sheet states, Light/Dark/System, Thai province +three China cities, Reduced Motion, offline/online, background/resume, source time/Unknown after expiry and10–20minute use. Weather/AQ values may update or differ from captured screenshots because providers are live.

Browser emulation does not establish iOS WebGL/battery/thermal behavior. Field INP/GPU memory and literal long background suspension are not measured in this deployment phase. Leaflet fallback is covered by prior deterministic P0 tests; no real iPhone fallback claim. No new performance improvement or final production acceptance is claimed.

**Decision: GO — ISOLATED OWNER QA DEPLOYMENT VERIFIED; physical iPhone acceptance pending.** No main merge or replacement of Pages is authorized by this handoff. Retain this isolated URL for owner review; any subsequent merge or public v0.2 replacement requires the separate owner/Lead authorization.
