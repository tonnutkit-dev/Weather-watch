import {test} from '@playwright/test';
import {readFileSync} from 'node:fs';
import '../tests/mobile-layout.spec';
const fixture=JSON.parse(readFileSync('diagnostics-p0/provider-fixtures.json','utf8'));
test.beforeEach(async({page},info)=>{
 if(process.env.WW_E2E_BASE_URL)throw Error('Recorded provider geometry diagnostics must never run against deployed QA');
 await page.route('https://api.open-meteo.com/v1/forecast**',r=>r.fulfill({json:fixture.weather.body}));
 await page.route('https://air-quality-api.open-meteo.com/v1/air-quality**',r=>r.fulfill({json:fixture.air.body}));
 await info.attach('diagnostic-scope',{body:Buffer.from('LAB ONLY: recorded weather/AQ inputs isolate geometry from public API outages. Real map/radar resources. Original geometry/gesture assertions imported unchanged. Not live weather evidence.'),contentType:'text/plain'});
});
