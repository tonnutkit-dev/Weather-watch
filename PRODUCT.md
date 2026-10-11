# Weather Watch — Foundation 0.1
Owner: TON. Work Order 001, 11 October 2026. Personal use and portfolio prototype.

## Vision and audience
Thai-language, map-first environmental situation awareness for people in Thailand and Thai residents/students/travelers in Xi’an, Chengdu and Chongqing. Answer what is happening at a selected point and what the coming hours/days may bring. Thailand is the primary, nationwide market, all 77 provinces.

## Experience
Compact header/search → interactive map as evidence → current weather and conservative situation summary → separate historical radar and weather forecast timelines. On mobile the situation panel has collapsed, half and expanded states with dragging and buttons; desktop uses a compact side panel. Optional geolocation only after a deliberate action. Persist theme and explicitly saved favorites; do not persist current precise GPS position automatically.

## P0 acceptance
Real Open-Meteo current modeled weather, hourly and up to 16 daily forecasts; MapLibre basemap; RainViewer real available historical frames subject to access; PM2.5/PM10/US AQI labeled modeled; coordinate weather independent of province flood availability; 77 province shortcuts; three China shortcuts; system/light/dark including basemap; meaningful loading/failure/null states; provenance and visible attribution; executable tests and truthful QA.

## P1 foundation
Typed separate satellite flood extent, reported incidents, measured river level, forecast discharge, official alerts. No authenticated integration without credentials and verified reuse rights. Unavailable means unavailable, never flood-free/no warnings. China never receives Thai alert logic.

## Non-goals
Accounts, database, payment, commercial service, subscriptions, final production acceptance, custom AQI, street flood prediction, fabricated nowcast, province safety certification. Owner amendments authorize source push and public GitHub Pages QA only to tonnutkit-dev/Weather-watch; inspect and preserve remote history, use a feature branch and normal reviewed merge, never force-push. Official warning severity must precede any app interpretation when integrated.

## Release gates
Foundation: docs, audited claims, tokens, coherent architecture, passing build. Functional prototype: real weather visible, location switching, interactive rendered map, real radar if accessible, theme/responsive QA, screenshots and attribution. Any missing mandatory evidence = CONDITIONAL PASS or NO-GO, never full completion.
