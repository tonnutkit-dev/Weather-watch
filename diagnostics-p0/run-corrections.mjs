// Isolated deterministic browser lab. Fixture pixels are TEST IMAGES, not live radar observations.
import { chromium } from '@playwright/test';
import { spawn, execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { installObserver } from './browser-observer.mjs';
import assert from 'node:assert/strict';
import os from 'node:os';
import { gzipSync } from 'node:zlib';
const out='diagnostics-p0/raw'; await mkdir(out,{recursive:true});
const fixture=JSON.parse(await readFile('diagnostics-p0/provider-fixtures.json','utf8'));
const now=fixture.weather.body.current.time*1000+60000;
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64');
const results={environment:{baseline:'2036e2ac788cb31d25fd387cb40520ad95c408a6',correction:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),node:process.version,platform:os.platform(),cpu:os.cpus()[0]?.model,physicalIphone:false,softwareGPU:true,fixtureClock:new Date(now).toISOString(),notes:['Screenshots with fixture/test tiles are laboratory evidence, not live weather observations. Original live E2E screenshot evidence is retained separately.','Deterministic recorded provider responses, synthetic test PNG tiles and minimal LAB basemap. Never exposed by production.','No representative field INP, physical display FPS, GPU memory, battery or thermal measurement.','Matched lab measurements constrain UI/raster overhead; do not replace real-world basemap performance acceptance.']},checks:[],loads:[],interactions:[],failures:[]};
const servers=[]; const sessions = new Set();
for(const [port,root,diagnostic] of [[4173,'.',false],[4175,'.',true],[4174,'diagnostics-p0/baseline',false],[4176,'diagnostics-p0/baseline',true]]) {
  servers.push(spawn('node',[`${process.cwd()}/node_modules/vite/bin/vite.js`,'preview',...(diagnostic?['--config','diagnostics-p0/vite.diagnostic.config.ts']:[]),'--host','127.0.0.1','--port',String(port)],{cwd:root,stdio:'ignore'}));
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
for(const port of [4173,4174,4175,4176]){let ready=false;for(let i=0;i<30;i++){try{if((await fetch(`http://127.0.0.1:${port}/Weather-watch/`)).ok){ready=true;break;}}catch{}await sleep(200);}assert(ready,`server ${port}`);}
const browser=await chromium.launch({args:['--enable-unsafe-swiftshader']}); results.environment.browser=browser.version();
const base=(after=true,diagnostic=true)=>`http://127.0.0.1:${after?(diagnostic?4175:4173):(diagnostic?4176:4174)}/Weather-watch/`;
async function context({after=true,size={width:390,height:844},fallback=false,cpu=1,slow=false,clock=true,reduced=false}={}) {
  const c=await browser.newContext({viewport:size,isMobile:size.width<760,hasTouch:size.width<760,colorScheme:'light',reducedMotion:reduced?'reduce':'no-preference'});
  await c.addInitScript(installObserver);
  if(fallback)await c.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...rest){return /webgl/.test(kind)?null:original.call(this,kind,...rest);};});
  sessions.add(c);
  const page=await c.newPage(), cdp=await c.newCDPSession(page);
  await cdp.send('Performance.enable'); await cdp.send('Network.enable'); await cdp.send('Emulation.setCPUThrottlingRate',{rate:cpu});
  if(slow)await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:200000,uploadThroughput:93750});
  if(clock)await page.clock.install({time:now});
  const state={weather:'ok',air:'ok',tiles:'ok',delay:0,weatherCalls:0,airCalls:0,tileCalls:[],errors:[],responseDelay:0};
  page.on('pageerror',e=>state.errors.push(e.message));
  await page.route('https://tiles.openfreemap.org/**',r=>r.fulfill({json:{version:8,sources:{},layers:[{id:'lab-basemap',type:'background',paint:{'background-color':'#dee8ed'}}]}}));
  await page.route(/https:\/\/[^/]*tile\.opentopomap\.org\//,r=>r.fulfill({body:png,contentType:'image/png'}));
  await page.route('https://api.rainviewer.com/public/weather-maps.json',r=>r.fulfill({json:fixture['radar-meta-or-coverage'].body}));
  await page.route('https://tilecache.rainviewer.com/**',async r=>{state.tileCalls.push({at:Date.now(),url:r.request().url()});if(state.delay)await sleep(state.delay);if(state.tiles==='failed')await r.fulfill({status:503,body:'LAB failure'});else if(state.tiles==='missing')await r.fulfill({status:404,body:'LAB missing'});else await r.fulfill({body:png,contentType:'image/png'});});
  for(const key of ['weather','air'])await page.route(key==='weather'?'https://api.open-meteo.com/v1/forecast**':'https://air-quality-api.open-meteo.com/v1/air-quality**',async r=>{
    state[`${key}Calls`]++; const mode=state[key]; if(state.responseDelay)await sleep(state.responseDelay);
    if(mode==='offline'){await r.abort('internetdisconnected');return;}
    if(mode==='timeout'){await sleep(13000);}
    if(mode==='503'){await r.fulfill({status:503,body:'LAB unavailable'});return;}
    await r.fulfill({json:fixture[key].body});
  });
  const net=[];cdp.on('Network.loadingFinished',e=>net.push({bytes:e.encodedDataLength,at:e.timestamp}));
  return {c,page,cdp,state,net,after};
}
async function open(s,diagnostic=true){await s.page.goto(base(s.after,diagnostic));await s.page.getByTestId('temperature').waitFor();await s.page.locator('[data-map-status="ready"]').waitFor();await sleep(300);}
async function snapshot(s){return s.page.evaluate(()=>({summary:document.querySelector('.summary-message')?.textContent,temperature:document.querySelector('[data-testid="temperature"]')?.textContent,weatherFreshness:document.querySelector('.situation-panel')?.dataset.weatherFreshness,airFreshness:document.querySelector('.situation-panel')?.dataset.airFreshness,verdict:document.querySelector('.situation-panel')?.dataset.verdict,label:document.querySelector('[data-testid="radar-time"]')?.textContent,radarStatus:document.querySelector('[data-testid="radar-presentation"]')?.dataset.status,frame:document.querySelector('.map-canvas')?.dataset.radarFrame,displayedFrame:document.querySelector('.map-canvas')?.dataset.radarDisplayedFrame,mapInstances:window.__WW_AUDIT.mapInstances,canvases:document.querySelectorAll('canvas').length,heap:performance.memory?.usedJSHeapSize}));}
async function select(s,index){await s.page.locator('.radar-controls input[type=range]').evaluate((el,value)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,String(value));el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));},index);}
async function theme(s,dark){await s.page.getByRole('button',{name:'การแสดงผลและตั้งค่า',exact:true}).click();await s.page.getByRole('button',{name:dark?'มืด':'สว่าง',exact:true}).click();await s.page.getByRole('button',{name:'ปิด',exact:true}).click();}
async function city(s,name){await s.page.getByRole('button',{name:'ค้นหาตำแหน่ง',exact:true}).click();await s.page.locator('.secondary-locations summary').click();await s.page.locator('.china-options button').filter({hasText:name}).click();}
async function save(name,value){await writeFile(`${out}/${name}.json`,JSON.stringify(value,null,2)+'\n');}
async function check(name,fn){console.log('CHECK',name);try{const evidence=await fn();results.checks.push({name,status:'passed',evidence});}catch(e){results.failures.push({name,error:e.stack});console.error('FAILED',name,e.message);}await save('results',results);for (const c of sessions) { await c.close(); sessions.delete(c); }}
try {
  results.payload=[];
  for(const [after,path] of [[false,'diagnostics-p0/baseline/dist/assets'],[true,'dist/assets']])for(const file of await readdir(path)){if(/\.(js|mjs)$/.test(file)){const bytes=await readFile(`${path}/${file}`);results.payload.push({after,file,rawBytes:bytes.length,gzipBytes:gzipSync(bytes).length});}}
  for(const after of [false,true])for(const fallback of [false,true])await check(`${after?'after':'before'}-radar-${fallback?'leaflet':'maplibre'}`,async()=>{
    const s=await context({after,fallback});await s.c.tracing.start({screenshots:true,snapshots:true});await open(s);
    const initial=await snapshot(s);s.state.delay=4250;await select(s,0);await sleep(150);const pending=await snapshot(s);
    await s.page.evaluate(()=>{const m=window.__WW_MAP;m.panBy([20,10],{animate:false,duration:0});if(m.zoomTo)m.zoomTo(m.getZoom()+.25,{duration:0});else m.setZoom(m.getZoom()+1,{animate:false});});
    if(after){assert.equal(pending.radarStatus,'pending');assert.match(pending.label,/เลือก/);assert.equal(pending.displayedFrame,'');}
    await sleep(4700);const complete=await snapshot(s);if(after)assert.equal(complete.radarStatus,'unverified');
    s.state.delay=0;s.state.tiles='failed';await select(s,1);await sleep(1000);const failed=await snapshot(s);
    if(after)assert.equal(failed.radarStatus,'failed');
    s.state.tiles='ok';s.state.delay=1000;await select(s,2);await select(s,3);await select(s,4);await sleep(1500);
    const scrubbed=await snapshot(s);if(after){assert.equal(scrubbed.frame,String(fixture['radar-meta-or-coverage'].body.radar.past[4].time));assert.notEqual(scrubbed.radarStatus,'failed');}
    await theme(s,true);await sleep(1500);await city(s,'ซีอาน');await sleep(1500);
    await s.page.evaluate(()=>window.__WW_MAP?.[window.__WW_MAP.panBy?'panBy':'panTo']?.([20,10],{animate:false}));
    await s.page.getByRole('button',{name:'เล่นเรดาร์ย้อนหลัง',exact:true}).click();await s.page.clock.fastForward(15001);
    await s.page.getByRole('button',{name:'หยุดเรดาร์',exact:true}).click();
    await s.page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
    if(after)assert.equal((await snapshot(s)).radarStatus,'cancelled');
    await s.page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});await sleep(1600);
    const end=await snapshot(s);assert.equal(end.mapInstances,1);assert.equal(s.state.errors.length,0);
    await s.page.screenshot({path:`${out}/${after?'after':'before'}-${fallback?'leaflet':'maplibre'}-radar.png`});
    await s.c.tracing.stop({path:`${out}/${after?'after':'before'}-${fallback?'leaflet':'maplibre'}-radar-trace.zip`});
    const requests=s.state.tileCalls;await s.c.close();return {initial,pending,complete,failed,scrubbed,end,tileRequests:requests};
  });
  for(const after of [false,true])await check(`${after?'after':'before'}-three-hour-idle`,async()=>{
    const s=await context({after});await open(s);const initial=await snapshot(s);
    await s.page.clock.fastForward(10800001);await sleep(500);const aged=await snapshot(s);
    if(after){assert.equal(aged.weatherFreshness,'expired');assert.equal(aged.airFreshness,'expired');assert.equal(aged.verdict,'Unknown');}
    else assert.equal(aged.summary,initial.summary);
    const counts={weather:s.state.weatherCalls,air:s.state.airCalls};
    await s.page.evaluate(()=>{document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new Event('focus'));window.dispatchEvent(new Event('online'));});await sleep(400);
    if(after){assert.equal(s.state.weatherCalls,counts.weather);assert.equal(s.state.airCalls,counts.air);}
    const end=await snapshot(s);await s.page.screenshot({path:`${out}/${after?'after':'before'}-expired.png`});await s.c.close();return {initial,aged,end,counts,noBurstCounts:{weather:s.state.weatherCalls,air:s.state.airCalls}};
  });
  await check('after-refresh-failure-recovery-and-China-isolation',async()=>{
    const s=await context();await open(s);s.state.weather='503';await s.page.clock.fastForward(600001);await sleep(300);await s.page.clock.fastForward(1100);await sleep(300);
    const failed=await snapshot(s);assert.equal(failed.weatherFreshness,'refresh-failed');assert.equal(failed.verdict,'Unknown');assert.match(failed.temperature,/\d/);
    const failedCounts={weather:s.state.weatherCalls,air:s.state.airCalls};
    await s.page.clock.fastForward(30001);
    await s.page.getByRole('button',{name:'การแสดงผลและตั้งค่า',exact:true}).click();await s.page.getByRole('button',{name:'รีเฟรชอากาศและคุณภาพอากาศ',exact:true}).click();await sleep(300);await s.page.clock.fastForward(1100);await sleep(300);
    assert.match((await snapshot(s)).temperature,/\d/);assert.equal((await snapshot(s)).weatherFreshness,'refresh-failed');
    s.state.weather='ok';await s.page.clock.fastForward(600001);await sleep(300);const recovered=await snapshot(s);assert.equal(recovered.weatherFreshness,'fresh');
    for(const name of ['ซีอาน','เฉิงตู','ฉงชิ่ง'])await city(s,name);await sleep(400);
    const final=await snapshot(s);assert.equal(final.mapInstances,1);assert.equal(s.state.errors.length,0);
    await s.c.close();return {failed,failedCounts,recovered,final,counts:{weather:s.state.weatherCalls,air:s.state.airCalls}};
  });
  await check('after-offline-online-resume-and-timeout',async()=>{
    const s=await context();await open(s);await s.c.setOffline(true);await s.page.clock.fastForward(7200001);await sleep(300);
    const offline=await snapshot(s);assert.equal(offline.verdict,'Unknown');const before=s.state.weatherCalls;
    await s.c.setOffline(false);await s.page.evaluate(()=>window.dispatchEvent(new Event('online')));await sleep(500);assert.equal(s.state.weatherCalls,before+1);
    s.state.weather='timeout';await s.page.clock.fastForward(600001);await sleep(13000);await s.page.clock.fastForward(1100);await sleep(13000);
    const timeout=await snapshot(s);assert.equal(timeout.verdict,'Unknown');assert.equal(timeout.weatherFreshness,'expired');
    await s.c.close();return {offline,timeout,counts:{weather:s.state.weatherCalls,air:s.state.airCalls}};
  });
  await check('after-partial-AQ-failure-slow-load-and-missing-tiles',async()=>{
    const s=await context();s.state.responseDelay=700;await open(s);const initial=await snapshot(s);
    assert.equal(initial.verdict,'Notable');s.state.responseDelay=0;s.state.air='503';
    await s.page.clock.fastForward(600001);await sleep(300);await s.page.clock.fastForward(1100);await sleep(300);
    const partial=await snapshot(s);assert.equal(partial.airFreshness,'refresh-failed');assert.equal(partial.verdict,'Unknown');assert.equal(partial.weatherFreshness,'fresh');
    s.state.tiles='missing';await select(s,0);await sleep(500);assert.equal((await snapshot(s)).radarStatus,'failed');
    await s.page.clock.fastForward(7200001);await sleep(300);const expired=await snapshot(s);assert.equal(expired.verdict,'Unknown');
    const count=s.state.airCalls;await s.page.evaluate(()=>{for(let i=0;i<10;i++){window.dispatchEvent(new Event('online'));window.dispatchEvent(new Event('focus'));}});await sleep(300);
    assert.equal(s.state.airCalls,count);await s.c.close();return {initial,partial,expired,counts:{weather:s.state.weatherCalls,air:s.state.airCalls}};
  });
  for(const size of [{width:375,height:667},{width:390,height:844},{width:430,height:932}])for(const dark of [false,true])await check(`after-geometry-${size.width}-${dark?'dark':'light'}`,async()=>{
    const s=await context({size,reduced:true});await open(s);if(dark)await theme(s,true);const rows=[];
    for(const sheet of ['collapsed','half','expanded']){
      if(sheet!=='collapsed')await s.page.getByRole('button',{name:'ขยายแผง',exact:true}).click();await sleep(400);
      const g=await s.page.evaluate(()=>{const rect=sel=>{const el=document.querySelector(sel);if(!el||getComputedStyle(el).display==='none')return null;return el.getBoundingClientRect().toJSON();};return {overflow:document.documentElement.scrollWidth>innerWidth,temperature:rect('[data-testid="temperature"]'),sheet:rect('.situation-panel'),radar:rect('.radar-controls'),attribution:rect('.maplibregl-ctrl-attrib')};});
      assert.equal(g.overflow,false);assert(g.temperature&&g.attribution);assert(g.temperature.y+g.temperature.height<=size.height);
      if(sheet==='collapsed'){assert(g.radar);assert(g.radar.y+g.radar.height<=g.sheet.y+1);}else assert.equal(g.radar,null);
      rows.push({sheet,...g});await s.page.screenshot({path:`${out}/${size.width}-${dark?'dark':'light'}-${sheet}.png`});
    }
    assert.equal(s.state.errors.length,0);await s.c.close();return rows;
  });
  for(const after of [false,true])for(const profile of [{name:'desktop',size:{width:1440,height:1000},cpu:1},{name:'mobile',size:{width:390,height:844},cpu:1},{name:'mobile-throttled',size:{width:390,height:844},cpu:4,slow:true}])for(let run=1;run<=3;run++){
    const s=await context({after,...profile,clock:false});
    for(const cache of ['cold','warm']){
      if(cache==='cold')await s.cdp.send('Network.clearBrowserCache');
      await s.page.goto(base(after,false));await sleep(2500);
      const obs=await s.page.evaluate(()=>window.__WW_AUDIT), nav=await s.page.evaluate(()=>performance.getEntriesByType('navigation')[0].toJSON());
      results.loads.push({after,profile:profile.name,run,cache,FCP:obs.paint.find(x=>x.name==='first-contentful-paint')?.startTime,LCP:obs.lcp.at(-1)?.startTime,CLS:obs.shifts.filter(x=>!x.hadRecentInput).reduce((n,x)=>n+x.value,0),INP:null,blockingWindowMs:obs.longTasks.reduce((n,x)=>n+Math.max(0,x.duration-50),0),longTasks:obs.longTasks.length,transferredBytes:s.net.reduce((n,x)=>n+x.bytes,0),nav});s.net.length=0;
    }await s.c.close();await save('results',results);
  }
  for(const after of [false,true])for(let run=1;run<=3;run++)await check(`${after?'after':'before'}-matched-interaction-${run}`,async()=>{
    const s=await context({after,clock:false,cpu:4});await open(s);const before=await s.cdp.send('Performance.getMetrics');const start=await s.page.evaluate(()=>performance.now());
    for(let i=0;i<4;i++){await s.page.getByRole('button',{name:'ขยายแผง',exact:true}).click();await sleep(250);await s.page.getByRole('button',{name:'ยุบแผง',exact:true}).click();await sleep(250);}
    await s.page.evaluate(()=>window.__WW_MAP.panBy([40,20],{duration:300}));await sleep(400);await select(s,0);await sleep(400);await theme(s,true);await sleep(600);await theme(s,false);await sleep(600);
    const obs=await s.page.evaluate(start=>({frames:window.__WW_AUDIT.frames.filter(x=>x.at>=start),renders:window.__WW_AUDIT.renders,mapCalls:window.__WW_AUDIT.mapCalls}),start),metrics=await s.cdp.send('Performance.getMetrics');
    const end=await snapshot(s);assert.equal(end.mapInstances,1);await s.c.close();const row={after,run,start,obs,beforeMetrics:before.metrics,afterMetrics:metrics.metrics,end,counts:{weather:s.state.weatherCalls,air:s.state.airCalls,tiles:s.state.tileCalls.length}};results.interactions.push(row);return row;
  });
} finally {await save('results',results);await browser.close();servers.forEach(s=>s.kill());}
console.log('LAB RESULT',results.checks.length,'passed',results.failures.length,'failed');
if(results.failures.length)process.exitCode=1;
