# Deployed V0.3 P0 Owner QA evidence

Run: https://github.com/tonnutkit-dev/Weather-watch/actions/runs/38140590946

Artifact: `weather-watch-v03-p0-owner-qa-38140590946`, ID **11703515333**, expires2027-01-09T12:47:09Z. Large PNGs/traces are in this Actions artifact; no owner re-upload needed. Authentication may be required to retrieve artifact ZIPs; the application URL is public.

Final QA source: `c66647b9e70a861a6ef370e0d2dc7ad98c697925`; deployed application: `4b3548fa49abd9475547fc6e8336a1b854ad6952`.

Small permanent evidence: [browser summary](final-browser-summary.json), [real-provider state and simulated-clock expiry](live-state-final.json), [HTTP asset hashes/Pages protection](deployed-http-final.json), [prior live network failures](failures-run38139983630.json), [51 source hashes](packaging/approved-source.json), [packaging script](packaging/build-owner-qa.mjs).

## Screenshot and trace lookup

| Label | Artifact-relative path |
|---|---|
| desktop-light | `playwright-report/data/ac64ca6ba308f537ce533d62d0d8ebfa85948e90.png` |
| desktop-dark | `playwright-report/data/8d5f4222cd4e94c8cfd6d2cdc7fc6670d64291d2.png` |
| screenshot | `playwright-report/data/c4e7f0ee450274475bf8dc1d944a38b1fb70f866.png` |
| error-context | `playwright-report/data/6f727757bdded0ecdcc16eea2a2a6ebf410b47bc.md` |
| trace | `playwright-report/data/edb39e8a6496c12df128ff40bd5cd737e39dd65d.zip` |
| mobile-light | `playwright-report/data/d4be619d85ac1810d60b08fae4697cc01c3f9e71.png` |
| mobile-dark | `playwright-report/data/3b56a5d277e0987a4614c981bbbb3223977dced6.png` |
| radar-map | `playwright-report/data/ac79ebfc2dd167c4898f181ecbf5c2d0b1436133.png` |
| mobile-375-light-collapsed | `playwright-report/data/dfc4ed3437e92a3ed386dc04c8799c8688abeb06.png` |
| mobile-375-light-half | `playwright-report/data/c2a5986aeb54a6b77a88a8e7c8597ff0e9ab9288.png` |
| mobile-375-light-expanded | `playwright-report/data/588eddfffe003f86a5acca8f3e23a556924e290d.png` |
| mobile-375-dark-collapsed | `playwright-report/data/68f9517cac127f154bc06eb4ac82dab7d1218a4d.png` |
| mobile-375-dark-half | `playwright-report/data/13729117889af1a6ba67ddfac2da9a9841011a3b.png` |
| mobile-375-dark-expanded | `playwright-report/data/b71276ce2b8ed69763a909e6146a655d015460bb.png` |
| mobile-390-light-collapsed | `playwright-report/data/453a2c12737881ccd9a2725d8c610c982ac8dfe7.png` |
| mobile-390-light-half | `playwright-report/data/a087c3fb20abfa0163a40c4f15522ef7d51f0b99.png` |
| mobile-390-light-expanded | `playwright-report/data/a1d29408a8081cfa77be40007819e0e4c8f0defd.png` |
| mobile-390-dark-collapsed | `playwright-report/data/aa25a079a20f086eb52b45beb0682e7fab3b7171.png` |
| mobile-390-dark-half | `playwright-report/data/dae6384320b919fd187ea3c49c58a5347ce068ff.png` |
| mobile-390-dark-expanded | `playwright-report/data/9c4567a50219b2ed948cd91e7f4bccd7a2a3b7e8.png` |
| mobile-430-light-collapsed | `playwright-report/data/0646e77e492454e061013ec0416c598631885b54.png` |
| mobile-430-light-half | `playwright-report/data/b5ca9ae3e9b71f336f49eaf2b3930dc424d95921.png` |
| mobile-430-light-expanded | `playwright-report/data/15cb43c538e7e821aabc156a73ebb5a42aa72798.png` |
| mobile-430-dark-collapsed | `playwright-report/data/2a7d28c9d8a26814a568481577cfe828e6566cce.png` |
| mobile-430-dark-half | `playwright-report/data/1b6c596ae205245617fc321d1301594c8fabce10.png` |
| mobile-430-dark-expanded | `playwright-report/data/14f83572e7346eb0b3513a825a96479a1a48c902.png` |
| tablet-light | `playwright-report/data/58d16f88a7c81db19bda51d68b9135b1e352726e.png` |
| tablet-dark | `playwright-report/data/9c6fc5510d98813e205d3b87b7c1c3758048cc35.png` |
| tablet-forecast | `playwright-report/data/04f3f76b6e5c543092135ad33f3876305f679cdf.png` |
| 390-light | `qa-owner-v03/browser-report/data/4a46576f89331527e0fdbe342c8aa8ac0129ec45.png` |
| 390-dark | `qa-owner-v03/browser-report/data/ccbdf0bc59ec5b3647fd2d5a26e594ed66bce88b.png` |
| 1440-light | `qa-owner-v03/browser-report/data/3280f8854710b6ab522a7ceca632ba9a5ef4764a.png` |
| 1440-dark | `qa-owner-v03/browser-report/data/d4021bd86602c1d26292b2cdd6ae1863b8946b0d.png` |
| expired-offline-mobile | `qa-owner-v03/browser-report/data/b58aa0c02f8108985118e1cae0f634da239e101a.png` |

The expiry screenshot uses a test-only clock advance and offline context after loading real provider readings; it is not a screenshot of fabricated production weather. Light/Dark screenshots use real radar tiles and weather. Physical iPhone remains NOT TESTED.

Earlier unsuccessful run38139983630 artifact ID11702736328 preserves selector/edge-HTML and provider failures. Initial infrastructure cascade run38139727596 artifact ID11702555535 also retained. Reports disclose these failures rather than counting retries as first-pass.
