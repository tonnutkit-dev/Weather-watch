# Conservative situation rules 0.1
This is INTERPRETATION, not an official alert, medical assessment, prediction of inundation, or safety certificate. Official severity is separate and must not be overwritten. Calm deliberately means model values below these display thresholds; it never means an area is safe or flood-free. Missing official alerts always remain independently unknown.

## Inputs
Current modeled temperature, apparent temperature and wind; modeled provider US AQI; next six hours hourly precipitation probability and amount. Current weather older than 2h, AQ older than 3h, missing critical values or fewer than two forecast rows / any missing rain variables ⇒ Unknown. No radar blank-image inference. Conservative display thresholds are product heuristics, not validated official Thai warning thresholds.

| Condition | Verdict |
|---|---|
| US AQI >150, apparent >=40°C, wind >=50km/h, or max hourly precip >=10mm in next6h | Attention |
| Otherwise US AQI >100, apparent >=35°C, rain probability >=60%, or hourly precip >=2.5mm | Notable |
| All required inputs available and none above | Calm |
| Data incomplete or stale | Unknown |

US AQI labels are provider standard: <=50 Good; <=100 Moderate; <=150 Unhealthy for sensitive groups; <=200 Unhealthy; <=300 Very unhealthy; >300 Hazardous. PM2.5/PM10 are µg/m³ from model, not recalculated AQI. App threshold logic is intentionally auditable; owner/lead can revise thresholds after expert review. Unit tests cover boundary behavior and stale/null inputs.
