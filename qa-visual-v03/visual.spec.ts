import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const fixture=JSON.parse(readFileSync('diagnostics-p0/provider-fixtures.json','utf8'));
for(let run=0;run<3;run++) test(`matched UI benchmark ${run+1}`,async({page,context},info)=>{
 test.skip(!!process.env.WW_E2E_BASE_URL,'Recorded fixture benchmark never routes deployed QA');
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://api.open-meteo.com/v1/forecast**',r=>r.fulfill({json:fixture.weather.body}));
 await page.route('https://air-quality-api.open-meteo.com/v1/air-quality**',r=>r.fulfill({json:fixture.air.body}));
 await page.route('https://api.rainviewer.com/public/weather-maps.json',r=>r.fulfill({json:{host:'https://tilecache.rainviewer.com',radar:{past:[]}}}));
 // Provider weather recordings; no radar, fixed simple basemap for matched UI-only CPU/layout comparison.
 await page.route('https://tiles.openfreemap.org/**',r=>r.fulfill({json:{version:8,sources:{},layers:[{id:'benchmark',type:'background',paint:{'background-color':'#cfdfe1'}}]}}));
 await page.addInitScript(()=>{
  const m={fcp:null as number|null,lcp:null as number|null,cls:0,long:[] as number[],frames:[] as number[]};(window as any).__UI_METRICS=m;
  for(const type of ['paint','largest-contentful-paint','layout-shift','longtask'])if(PerformanceObserver.supportedEntryTypes.includes(type))new PerformanceObserver(l=>{for(const e of l.getEntries() as any){if(e.name==='first-contentful-paint')m.fcp=e.startTime;if(type==='largest-contentful-paint')m.lcp=e.startTime;if(type==='layout-shift'&&!e.hadRecentInput)m.cls+=e.value;if(type==='longtask')m.long.push(e.duration);}}).observe({type,buffered:true});
 });
 const results=[];
 for(const cache of ['fresh-session','returning-session']){
  const session=await context.newCDPSession(page);if(cache==='fresh-session')await session.send('Network.clearBrowserCache');
  await page.goto('./');await expect(page.getByTestId('temperature')).toHaveText(/\d+°C/);await expect(page.locator('.map-canvas')).toHaveAttribute('data-map-status','ready');
  const canvas=await page.locator('.maplibregl-canvas').elementHandle();
  await page.evaluate(()=>{const m=(window as any).__UI_METRICS;let last=performance.now();m.active=true;function tick(t:number){if(!m.active)return;m.frames.push(t-last);last=t;requestAnimationFrame(tick);}requestAnimationFrame(tick);});
  for(let i=0;i<3;i++){await page.getByRole('button',{name:'ขยายแผง',exact:true}).click();await page.waitForTimeout(250);await page.getByRole('button',{name:'ยุบแผง',exact:true}).click();await page.waitForTimeout(250);}
  await page.getByRole('button',{name:'การแสดงผลและตั้งค่า'}).click();await page.getByRole('button',{name:'มืด',exact:true}).click();await page.getByRole('button',{name:'ปิด',exact:true}).click();
  expect(await page.evaluate(n=>n===document.querySelector('.maplibregl-canvas'),canvas)).toBe(true);
  const metrics=await page.evaluate(()=>{const m=(window as any).__UI_METRICS;m.active=false;const f=m.frames.sort((a:number,b:number)=>a-b);return {...m,rafP95:f[Math.floor(f.length*.95)],heap:(performance as any).memory?.usedJSHeapSize,nodes:document.querySelectorAll('*').length,resources:performance.getEntriesByType('resource').map((r:any)=>({name:r.name,transfer:r.transferSize,encoded:r.encodedBodySize}))};});
  results.push({phase:process.env.WW_VISUAL_PHASE||'candidate',cache,run,...metrics});await session.detach();
 }
 await info.attach('matched-ui-metrics',{body:Buffer.from(JSON.stringify({results,errors,scope:'Linux Chromium UI-only benchmark, recorded weather/AQ, no radar, fixed LAB basemap. Routing disables HTTP cache: returning-session is not an HTTP warm-cache claim. No iPhone/GPU claim.'},null,2)),contentType:'application/json'});expect(errors).toEqual([]);
});
test('live integrated desktop/tablet light and dark screenshots',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 for(const size of [{width:1440,height:1000},{width:820,height:1180}]){
  await page.setViewportSize(size);await page.goto('./');await expect(page.getByTestId('temperature')).toHaveText(/\d+°C/,{timeout:45000});await expect(page.locator('.map-canvas')).toHaveAttribute('data-map-status','ready',{timeout:30000});
  const canvas=await page.locator('.maplibregl-canvas').elementHandle();
  for(const theme of ['สว่าง','มืด']){
   await page.getByRole('button',{name:'การแสดงผลและตั้งค่า'}).click();await page.getByRole('button',{name:theme,exact:true}).click();await page.getByRole('button',{name:'ปิด',exact:true}).click();await expect(page.locator('.map-canvas')).toHaveAttribute('data-theme',theme==='มืด'?'dark':'light',{timeout:30000});
   await expect(page.getByTestId('temperature')).toBeInViewport({ratio:1});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   expect(await page.evaluate(n=>n===document.querySelector('.maplibregl-canvas'),canvas)).toBe(true);
   await info.attach(`${size.width}-${theme==='มืด'?'dark':'light'}-live`,{body:await page.screenshot(),contentType:'image/png'});
  }
 }expect(errors).toEqual([]);
});
