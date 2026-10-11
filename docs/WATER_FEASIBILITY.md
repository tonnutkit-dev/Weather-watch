# Flood / river / alerts feasibility
## GISTDA
Fresh official public API portal search identifies `/maps/flood/1day/wmts`, `/maps/flood/3days/wmts`, `/maps/flood/30days/wmts` and API key registration. Full portal is JS-only in retrieved text; exact 7-day endpoint, features, service host, update timestamp fields, quota and portfolio redistribution terms were not verified. Public portal HTTP200 is not proof of flood API success. No account/signup/credential bypass done. Implement FloodWatch keyed by all77 province IDs; separate satellite windows1/3/7/30, official incidents, measured levels and modeled discharge. Every current registry status = data-unavailable. Next: owner-provided key and official terms, then server proxy, envelope timestamps, polygon/province intersections with authoritative boundaries; no province-wide safety inference.

## ThaiWater
Official ThaiWater standard documents Observation structures and exchange service formats. They do not establish a selected public endpoint and reusable portfolio license. No undocumented private dashboard scraping. Verify HII dataset access, observation time, unit, station datum, coordinates, cadence and redistribution permission before live display. Link official public portal now.

## RID
Official https://bigdata-api.rid.go.th/api/v1/openapi explicitly requires registration/access token, Bearer header, 1,000 requests/day. No credential available. Reservoir amount is not river water level. Need a documented station-level dataset and reuse terms. Live river data NOT TESTED; public documentation read only.

## GloFAS
Actual Open-Meteo Flood request returned7 days of river_discharge (m³/s), see evidence/flood-discharge.json. This validates API reachability, not skill or river selection at Bangkok. v4 ~5km daily modeled discharge, nearest river selection can be wrong; seasonal horizon not a precise local flood prediction. Do not expose as observed river height, street depth or province flood status. Integration deferred to narrow river-specific validation with known gauging stations and datum.

## TMD official alerts
Official TMD API index exposes WeatherWarningNews v2 with public demo URL. Web retrieval returned XML unsupported by search reader; public CAP page exists. Machine-readable validity/affected-area/expiry, reuse rights and browser CORS have not been validated. Safe UI links official warning page and says unconnected, never says no alerts. Typed alert preserves issuer/type/severity/affectedAreas/issued/validity/source/original content; expired or unknown-expiry items are not active. China fallback links CMA, never TMD.

## Future architecture
Prefer static Pages + narrow Worker proxy (official Cloudflare Pages guides reviewed; no deployment executed). Store GISTDA/QWeather JWT/RID token as Worker secrets, allowed origins and explicit upstream allowlist, server cache, quota/token rotation, read-only narrow endpoints. No secrets in browser/commits. Do not add accounts or DB. Permission to publish remains outside this work order.
