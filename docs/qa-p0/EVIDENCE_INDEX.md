# P0 V0.3 evidence index

All large files are in the successful isolated [Actions run](https://github.com/tonnutkit-dev/Weather-watch/actions/runs/38136782887). No deployment job exists.

**Artifact:** `p0-reliability-v03-38136782887`, ID **11701846095**. [Artifact page](https://github.com/tonnutkit-dev/Weather-watch/actions/runs/38136782887/artifacts/11701846095). SHA256 `a0b378cc4094cbef5c87000771f9f88704af8765763eb78fdf4e93b1aa4f32af`. Expires2027-01-09T11:46:20Z. Authenticated GitHub access may be required for ZIP/API retrieval; download access was actually verified through the GitHub connection. Small summaries remain committed after expiry. The Lead can retrieve through GitHub independently; owner re-upload is unnecessary.

## Permanent evidence

- `summary.json`: environment, checks, bounded request counts, paired measurements, failures/limitations.
- `loads.csv`: all36 startup samples; raw `warm` means same-context repeat, NOT certified HTTP cache.
- `interactions.csv`: all6 matched interaction samples.
- `source-integrity.json`: exact source baselines and unchanged public release.
- `actions-history.json`: every executed and cancelled intermediate run.
- `live-runtime-errors.json`: live radar32 successful responses, zero page/console/local asset errors in that scenario.

## Paths inside the artifact

- `diagnostics-p0/raw/results.json`: complete machine record.
- `diagnostics-p0/raw/before-maplibre-radar.png`, `after-maplibre-radar.png`, `before-leaflet-radar.png`, `after-leaflet-radar.png`: paired LAB screenshots, TEST tiles/recorded weather, not live observations.
- `diagnostics-p0/raw/before-expired.png`, `after-expired.png`: paired LAB source-expiry snapshots.
- `diagnostics-p0/raw/{375,390,430}-{light,dark}-{collapsed,half,expanded}.png`:18 LAB geometry screenshots.
- `diagnostics-p0/raw/{before,after}-{maplibre,leaflet}-radar-trace.zip`:4 LAB traces.
- `playwright-report/index.html`: complete live-network browser report, eight first-pass plus one retry-pass.
- `test-results/prototype-live-map-weather-and-appearance-location-integrity/trace.zip`, `test-failed-1.png`, `error-context.md`: final live weather-timeout failure retained.

## Live-provider screenshot lookup

The following screenshots are from the actual running production build, not LAB synthetic tiles or generated art. Desktop successful screenshots are from the retry attempt. They demonstrate rendering, not source accuracy or complete radar pixel acknowledgement.

| Attachment | Artifact path |
|---|---|
| mobile-375-light-collapsed | `playwright-report/data/cca94f9346c2547309a531fa0a07ed6a70e1a032.png` |
| mobile-375-light-half | `playwright-report/data/02f201291e775a37300dcba4f3e86b730f3ce584.png` |
| mobile-375-light-expanded | `playwright-report/data/8a29fd2f3bb6610a85fd1159c413aded448fca83.png` |
| mobile-375-dark-collapsed | `playwright-report/data/3130cad2dc86cf75d775bb888a3bcfbe1b1746cb.png` |
| mobile-375-dark-half | `playwright-report/data/ab57fc36dabb087027a5f6223b9e91e822aa222f.png` |
| mobile-375-dark-expanded | `playwright-report/data/3d34396825d4d6ccaabb5703a53bdf43974ca38c.png` |
| mobile-390-light-collapsed | `playwright-report/data/43781538211c3119816d2a47bc5412e2ca78edb6.png` |
| mobile-390-light-half | `playwright-report/data/0f1b0f2994eedc8a10906bf06e458701db15efa0.png` |
| mobile-390-light-expanded | `playwright-report/data/8771748c17b2904b69c72eb8bdf9237f9f388eab.png` |
| mobile-390-dark-collapsed | `playwright-report/data/1bd5faabe5254d1f2837fe902d04ba3928256cc8.png` |
| mobile-390-dark-half | `playwright-report/data/bda850924688d3bc6af02cef2f45b33615cdd1d2.png` |
| mobile-390-dark-expanded | `playwright-report/data/cf10d1de43b6f7b2ca7fbb15d4c1f8f6737940f6.png` |
| mobile-430-light-collapsed | `playwright-report/data/f94ba541c02119574c4c8e4bf058e6c497b0621d.png` |
| mobile-430-light-half | `playwright-report/data/e15db22bca075d3db2aac01eb6e5bafb1dedae42.png` |
| mobile-430-light-expanded | `playwright-report/data/a3d63fd93af2422e8a8fc8c8b1f1b7f452d42aa2.png` |
| mobile-430-dark-collapsed | `playwright-report/data/a296b5962b3b09487587a7862341cd9a18d736f5.png` |
| mobile-430-dark-half | `playwright-report/data/d4b3dcd696ebe85a7189ee3247f328fda0474758.png` |
| mobile-430-dark-expanded | `playwright-report/data/fc8d8b643b842a26a55f3558b0ab6e3379066fca.png` |
| desktop-light | `playwright-report/data/2aa26d923c323347cf2b0198be179e0341bb4e75.png` |
| desktop-dark | `playwright-report/data/c9e9fc2f3a12b9586bfa21b1fdd278d1640a0312.png` |
| mobile-light | `playwright-report/data/43781538211c3119816d2a47bc5412e2ca78edb6.png` |
| mobile-dark | `playwright-report/data/b13032bd5f20b05e78d787e647a56a3994a657ca.png` |
| radar-map | `playwright-report/data/d315814a78550e1a63a5fd7ceaa6e6c23e175c6f.png` |
