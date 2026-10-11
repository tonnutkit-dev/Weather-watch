# Public QA deployment — owner amendment, 11 October 2026

Authorized repository: tonnutkit-dev/Weather-watch only.
Target: https://tonnutkit-dev.github.io/Weather-watch/ . This is public QA, not final production acceptance.

Vite base is /Weather-watch/. Fonts, lazy map chunks, worker and favicon are packaged under that path. App views are local state, without server routes; refresh at the project root preserves saved theme/preset. There is no backend, private credential or paid API. Authenticated flood/gauge/alert providers remain blocked. Public QA uses the public Open-Meteo/RainViewer/map services with visible provenance and attribution; commercial/promotional rights are not assumed.

Source changes stay on a feature branch and enter main through a normal merge PR preserving existing ancestors. The workflow checks PRs without deploying them. Only main pushes (or a manually selected main run) can deploy; an if guard also excludes unrelated branch dispatches. Build job runs npm ci, typecheck, 45 unit/component tests, build, asset verification and real-provider Chromium production tests, including offline behavior. Tests can fail on upstream availability and deliberately do not fabricate fallback weather. Browser reports/traces are retained for 7 days. Deployment requires successful build and least-privilege Pages/id-token permissions; action references are pinned to verified official release SHAs.

Pages settings must use GitHub Actions. The connector available during preparation has no Pages settings operation. If browser authentication or repository administration prevents setup, the owner can open https://github.com/tonnutkit-dev/Weather-watch/settings/pages and choose Build and deployment → Source → GitHub Actions. Then Actions → Weather Watch Pages QA → Run workflow → main. No PAT is needed in source or workflow. Configure Pages enablement cannot use the normal GITHUB_TOKEN to create a disabled site; do not work around that with a committed credential.

Commands:

```sh
npm ci
npm run typecheck
npm test
npm run build
npm run verify:pages
npm run test:e2e
# Against the actual deployed URL, after it exists:
WW_E2E_BASE_URL=https://tonnutkit-dev.github.io/Weather-watch/ npm run test:e2e
```

dist/release.json records the actual GITHUB_SHA, build time and QA channel. Verify it against the workflow and remote main; HTTP200 alone does not establish a working application. Owner review still requires physical iPhone Safari/Chrome, primary MapLibre and data coverage checks. Existing Foundation handoff reports are historical evidence; the Pages delivery report supplies subsequent results.
