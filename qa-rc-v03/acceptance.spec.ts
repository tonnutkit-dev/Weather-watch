import {test,expect,type Page} from '@playwright/test';
import {readFileSync,writeFileSync} from 'node:fs';
const fixture=JSON.parse(readFileSync('diagnostics-p0/provider-fixtures.json','utf8'));
const root=process.env.WW_RC_ROOT==='1';
function recorded(kind:'weather'|'air') {const b=structuredClone(fixture[kind].body);const delta=Math.floor(Date.now()/1000)-b.current.time;b.current.time+=delta;for(const part of ['hourly','daily'])if(b[part]?.time)b[part].time=b[part].time.map((v:number)=>v+delta);return b;}
async function lab(page:Page,fixedMap=true){
 await page.route('https://api.open-meteo.com/**',r=>r.fulfill({json:recorded('weather')}));
 await page.route('https://air-quality-api.open-meteo.com/**',r=>r.fulfill({json:recorded('air')}));
 if(fixedMap){await page.route('https://tiles.openfreemap.org/**',r=>r.fulfill({json:{version:8,sources:{},layers:[{id:'RC-LAB-background',type:'background',paint:{'background-color':'#cfdfe1'}}]}}));await page.route('https://api.rainviewer.com/public/weather-maps.json',r=>r.fulfill({json:{host:'https://tilecache.rainviewer.com',radar:{past:[]}}}));}
}
async function appearance(page:Page,name:string){await page.getByRole('button',{name:'การแสดงผลและตั้งค่า',exact:true}).click();await page.getByRole('button',{name,exact:true}).click();await page.getByRole('button',{name:'ปิด',exact:true}).click();}
for(const size of [{width:375,height:667},{width:820,height:1180},{width:1440,height:1000}])test(`RC System theme geometry ${size.width}x${size.height}`,async({page},info)=>{
 await lab(page);await page.setViewportSize(size);await page.emulateMedia({colorScheme:'light'});await page.goto('./');
 await expect(page.getByTestId('temperature')).toHaveText(/\d+°C/);await expect(page.locator('.map-canvas')).toHaveAttribute('data-map-status','ready');
 const canvas=await page.locator('.maplibregl-canvas').elementHandle();await appearance(page,'ตามอุปกรณ์');
 for(const colorScheme of ['light','dark'] as const){await page.emulateMedia({colorScheme});await expect(page.locator('html')).toHaveAttribute('data-theme',colorScheme);await expect(page.locator('.map-canvas')).toHaveAttribute('data-theme',colorScheme);
  expect(await page.evaluate(n=>n===document.querySelector('.maplibregl-canvas'),canvas)).toBe(true);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:info.outputPath(`system-${size.width}-${colorScheme}-full-viewport.png`)});
 }
 await info.attach('system-theme',{body:JSON.stringify({browser:info.project.name,size,sameCanvas:true,scope:'LAB recorded weather/AQI, fixed basemap; OS media emulation, not physical device.'}),contentType:'application/json'});
});
for(const unavailable of ['weather','air'] as const)test(`RC independent ${unavailable} failure remains truthful`,async({page},info)=>{
 await lab(page);const pattern=unavailable==='weather'?'https://api.open-meteo.com/**':'https://air-quality-api.open-meteo.com/**';await page.unroute(pattern);await page.route(pattern,r=>r.abort('failed'));
 await page.goto('./');await page.getByRole('button',{name:'ขยายแผง',exact:true}).click();
 if(unavailable==='weather')await expect(page.getByText('โหลดข้อมูลอากาศไม่ได้',{exact:true})).toBeVisible({timeout:30000});
 else {await expect(page.getByTestId('temperature')).toHaveText(/\d+°C/);await expect(page.locator('.air-card')).toContainText('เชื่อมต่อข้อมูลอากาศไม่ได้',{timeout:30000});}
 await expect(page.locator('.situation-panel')).toHaveAttribute('data-verdict','Unknown');await expect(page.locator('.situation-panel')).toHaveAttribute(unavailable==='weather'?'data-weather-freshness':'data-air-freshness','unavailable');
 await page.screenshot({path:info.outputPath(`independent-${unavailable}-full-viewport.png`)});
});
for(let sample=1;sample<=3;sample++)test(`RC LIVE independent provider terminal outcomes ${sample}`,async({page},info)=>{
 test.skip(root);const events:any[]=[];const started=Date.now();
 page.on('request',r=>{if(/open-meteo\.com/.test(r.url()))events.push({event:'start',at:Date.now()-started,url:r.url()});});
 page.on('response',r=>{if(/open-meteo\.com/.test(r.url()))events.push({event:'response',at:Date.now()-started,url:r.url(),status:r.status()});});
 page.on('requestfailed',r=>{if(/open-meteo\.com/.test(r.url()))events.push({event:'failed',at:Date.now()-started,url:r.url(),failure:r.failure()});});
 try {await page.goto('./');await page.getByRole('button',{name:'ขยายแผง',exact:true}).click();
  await expect.poll(async()=>{const t=await page.getByTestId('temperature').count();const e=await page.getByText('โหลดข้อมูลอากาศไม่ได้',{exact:true}).count();return !!(t||e);},{timeout:30000}).toBe(true);
  await expect.poll(async()=>{const data=await page.getByTestId('air-freshness').count();const error=(await page.locator('.air-card').innerText()).includes('เชื่อมต่อข้อมูลอากาศไม่ได้');return !!(data||error);},{timeout:30000}).toBe(true);
  const state=await page.locator('.situation-panel').evaluate(e=>({weather:e.getAttribute('data-weather-freshness'),air:e.getAttribute('data-air-freshness'),verdict:e.getAttribute('data-verdict')}));
  const temperature=await page.getByTestId('temperature').count();const air=await page.getByTestId('air-freshness').count();if(!temperature||!air)expect(state.verdict).toBe('Unknown');
  await info.attach('independent-live-outcomes',{body:JSON.stringify({sample,browser:info.project.name,elapsed:Date.now()-started,temperatureAvailable:!!temperature,airDataAvailable:!!air,state,events,scope:'Unrouted ordinary build; terminal truth gate, distinct from original temperature success gate; no SLA claim.'},null,2),contentType:'application/json'});
 }finally{writeFileSync(info.outputPath('provider-events.json'),JSON.stringify(events,null,2));await page.screenshot({path:info.outputPath('independent-live-full-viewport.png')});}
});
test('RC long session 30 minutes real map radar theme location continuity',async({page,context},info)=>{
 test.skip(info.project.name!=='chromium'||root);test.setTimeout(2000000);
 await lab(page,false);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));const requests:number[]=[];page.on('request',r=>{if(/rainviewer\.com\/.*\.png/.test(r.url()))requests.push(Date.now());});
 await page.goto('./');await expect(page.locator('.map-canvas')).toHaveAttribute('data-map-status','ready',{timeout:30000});
 const canvas=await page.locator('.maplibregl-canvas').elementHandle(),cdp=await context.newCDPSession(page);await cdp.send('Performance.enable');const started=Date.now(),rows:any[]=[];
 async function capture(cycle:number){const m=await cdp.send('Performance.getMetrics');const row={cycle,elapsed:Date.now()-started,metrics:Object.fromEntries(m.metrics.filter(x=>['JSHeapUsedSize','JSHeapTotalSize','Nodes','Documents','JSEventListeners'].includes(x.name)).map(x=>[x.name,x.value])),canvasCount:await page.locator('.maplibregl-canvas').count(),sameCanvas:await page.evaluate(n=>n===document.querySelector('.maplibregl-canvas'),canvas),errors:[...errors],radarRequestCount:requests.length};rows.push(row);writeFileSync(info.outputPath('long-session.json'),JSON.stringify({scope:'30 minute Linux Chromium real basemap/radar + recorded LAB weather/AQI; no physical/GC/leak proof.',rows},null,2));console.log('RC long session sample',cycle,'elapsed',row.elapsed,'heap',row.metrics.JSHeapUsedSize);expect(row.sameCanvas).toBe(true);expect(row.canvasCount).toBe(1);}
 await capture(0);
 for(let cycle=1;Date.now()-started<1800000;cycle++){
  await appearance(page,cycle%2?'มืด':'สว่าง');
  await page.getByRole('button',{name:'ค้นหาตำแหน่ง',exact:true}).click();await page.locator('.secondary-locations summary').click();await page.locator('.china-options').getByRole('button',{name:cycle%2?/ซีอาน/:/เฉิงตู/}).click();
  const play=page.getByRole('button',{name:'เล่นเรดาร์ย้อนหลัง',exact:true});if(await play.isEnabled()) {await play.click();await page.waitForTimeout(6000);const pause=page.getByRole('button',{name:'หยุดเรดาร์',exact:true});if(await pause.isVisible())await pause.click();}
  const slider=page.getByRole('slider',{name:'เฟรมเรดาร์ย้อนหลัง',exact:true});if(await slider.isEnabled()){await slider.focus();await slider.press(cycle%2?'Home':'End');}
  await page.getByRole('button',{name:'ขยายแผง',exact:true}).click();await page.getByRole('button',{name:'ยุบแผง',exact:true}).click();
  await page.waitForTimeout(20000);await capture(cycle);
 }
 const peak=Math.max(0,...requests.map(t=>requests.filter(x=>x>t-60000&&x<=t).length));expect(peak).toBeLessThanOrEqual(80);expect(errors).toEqual([]);await cdp.detach();
 await info.attach('long-session',{body:JSON.stringify({rows,peakRolling60s:peak,errors,minutes:(Date.now()-started)/60000,scope:'No forced GC; heap trend is observational, not proof of no leak.'}),contentType:'application/json'});await page.screenshot({path:info.outputPath('long-session-final-full-viewport.png')});
});
