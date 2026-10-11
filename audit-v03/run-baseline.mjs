import { chromium } from '@playwright/test';
import { spawn, execFileSync } from 'node:child_process';
import { mkdir, writeFile, readdir, readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import os from 'node:os';
import { installObserver } from './browser-observer.mjs';

const out='audit-v03/raw';await mkdir(out,{recursive:true});
const baseline=execFileSync('git',['rev-parse','origin/main'],{encoding:'utf8'}).trim();
const auditCommit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const base='http://127.0.0.1:4173/Weather-watch/';
const diagnostic='http://127.0.0.1:4175/Weather-watch/';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const save=async(name,data)=>writeFile(`${out}/${name}.json`,JSON.stringify(data,null,2)+'\n');
const servers=[spawn('node',['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4173'],{stdio:'ignore'}),spawn('node',['node_modules/vite/bin/vite.js','preview','--config','audit-v03/vite.diagnostic.config.ts','--host','127.0.0.1','--port','4175'],{stdio:'ignore'})];
for(const url of [base,diagnostic]){let okay=false;for(let i=0;i<30;i++){try{if((await fetch(url)).ok){okay=true;break;}}catch{}await sleep(500);}if(!okay)throw new Error('Preview server unavailable: '+url);}
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});
const environment={baseline,auditCommit,startedAt:new Date().toISOString(),browser:browser.version(),node:process.version,platform:os.platform(),osRelease:os.release(),cpu:os.cpus()[0]?.model,logicalCpus:os.cpus().length,totalMemory:os.totalmem(),runner:process.env.GITHUB_ACTIONS?'GitHub Actions ubuntu-latest':'local',softwareGPU:true,physicalIphone:false,notes:['CDP virtual network and CPU throttling; not a physical iPhone','Network transfer is CDP encodedDataLength, not decompressed bundle size','INP not certified: automated interactions are not field RUM','Diagnostic builds expose observation hooks; startup uses unchanged production dist']};
await save('environment',environment);
const allRequests=[],fixtures={};
function group(url){if(url.includes('air-quality-api.open-meteo'))return'air';if(url.includes('api.open-meteo.com/v1/forecast'))return'weather';if(url.includes('rainviewer.com')&&url.includes('/radar/'))return'radar-tile';if(url.includes('rainviewer.com'))return'radar-meta-or-coverage';if(url.includes('openfreemap'))return'basemap';if(url.includes('opentopomap'))return'fallback-basemap';if(url.startsWith('http://127.0.0.1'))return'app';return'other';}
async function session({viewport={width:390,height:844},cpu=1,mobile=true,fallback=false,trace=false}={}){
  const context=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile,colorScheme:'light',deviceScaleFactor:1});
  await context.addInitScript(installObserver);
  if(fallback)await context.addInitScript(()=>{const old=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/.test(type)?null:old.call(this,type,...args);};});
  if(trace)await context.tracing.start({screenshots:true,snapshots:true,sources:true});
  const page=await context.newPage(),cdp=await context.newCDPSession(page);
  await cdp.send('Network.enable');await cdp.send('Performance.enable');await cdp.send('Emulation.setCPUThrottlingRate',{rate:cpu});
  const network=[],pending=new Map(),errors=[];
  cdp.on('Network.requestWillBeSent',e=>{const row={id:e.requestId,url:e.request.url,group:group(e.request.url),start:e.timestamp,wallTime:e.wallTime,type:e.type};pending.set(e.requestId,row);network.push(row);allRequests.push(row);});
  cdp.on('Network.responseReceived',e=>{Object.assign(pending.get(e.requestId)||{}, {status:e.response.status,fromDiskCache:e.response.fromDiskCache||false,fromServiceWorker:e.response.fromServiceWorker||false,responseAt:e.timestamp,timing:e.response.timing,protocol:e.response.protocol});});
  cdp.on('Network.requestServedFromCache',e=>{const row=pending.get(e.requestId);if(row)row.servedFromCache=true;});
  cdp.on('Network.loadingFinished',e=>{Object.assign(pending.get(e.requestId)||{},{end:e.timestamp,encodedBytes:e.encodedDataLength});});
  cdp.on('Network.loadingFailed',e=>{Object.assign(pending.get(e.requestId)||{},{end:e.timestamp,error:e.errorText,canceled:e.canceled});});
  page.on('pageerror',e=>errors.push({kind:'page',message:e.message}));
  page.on('console',m=>{if(m.type()==='error')errors.push({kind:'console',message:m.text()});});
  page.on('response',async response=>{const key=group(response.url());if(['weather','air','radar-meta-or-coverage'].includes(key)&&response.ok()&&response.url().endsWith('.json')||(['weather','air'].includes(key)&&response.ok())){try{const raw=await response.json();if(!fixtures[key]&&raw&&typeof raw==='object')fixtures[key]={url:response.url(),capturedAt:new Date().toISOString(),body:raw};}catch{}}});
  page.setDefaultTimeout(10000);
  return{context,page,cdp,network,errors};
}
async function snapshot(s){const [dom,metrics,heap]=await Promise.all([s.cdp.send('Memory.getDOMCounters'),s.cdp.send('Performance.getMetrics'),s.page.evaluate(()=>({engine:document.querySelector('.map-canvas')?.dataset.mapEngine,status:document.querySelector('.map-canvas')?.dataset.mapStatus,temperature:document.querySelector('[data-testid="temperature"]')?.textContent,condition:document.querySelector('[data-testid="weather-condition"]')?.textContent,location:document.querySelector('.situation-panel')?.dataset.selectedLocation,summary:document.querySelector('.summary-message')?.textContent,radarFrame:document.querySelector('.map-canvas')?.dataset.radarFrame,radarLabel:document.querySelector('[data-testid="radar-time"]')?.getAttribute('datetime'),radarNotice:document.querySelector('.radar-freshness')?.textContent,canvasCount:document.querySelectorAll('canvas').length,overflow:document.documentElement.scrollWidth>innerWidth,visibility:document.visibilityState,theme:document.documentElement.dataset.theme,mapInstances:window.__WW_AUDIT?.mapInstances,mapCalls:window.__WW_AUDIT?.mapCalls,query:window.__WW_QUERY?.getQueryCache().getAll().map(q=>({key:q.queryKey,dataUpdatedAt:q.state.dataUpdatedAt,errorUpdatedAt:q.state.errorUpdatedAt,status:q.state.status,fetchStatus:q.state.fetchStatus,staleByTime:q.isStaleByTime(q.options.staleTime||0),dataType:q.state.data?.currentMeta?.dataType||q.state.data?.meta?.dataType,sourceTime:q.state.data?.current?.time||q.state.data?.time}))}))]);return{at:new Date().toISOString(),dom,performance:Object.fromEntries(metrics.metrics.map(m=>[m.name,m.value])),...heap};}
function quantile(values,q){if(!values.length)return null;const a=[...values].sort((x,y)=>x-y);return a[Math.max(0,Math.ceil(q*a.length)-1)];}
function frameStats(frames){const a=frames.map(f=>f.dt).filter(n=>n>0);return{samples:a.length,medianMs:quantile(a,.5),p95Ms:quantile(a,.95),maxMs:a.length?Math.max(...a):null,intervalsOver33Ms:a.filter(n=>n>33.34).length,intervalsOver50Ms:a.filter(n=>n>50).length,estimatedMissedVsync:a.reduce((s,n)=>s+Math.max(0,Math.round(n/16.667)-1),0),note:'rAF intervals / 16.667ms heuristic, not measured screen presentation or physical-device FPS'};}
function cls(shifts){let max=0,total=0,start=0,last=0;for(const s of shifts.filter(s=>!s.hadRecentInput)){if(s.startTime-last>1000||s.startTime-start>5000){total=0;start=s.startTime;}total+=s.value;last=s.startTime;max=Math.max(max,total);}return max;}
async function goto(s,url=diagnostic){await s.page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});await s.page.waitForSelector('.situation-panel');}
async function ready(s){await s.page.locator('[data-map-status="ready"]').waitFor({timeout:45000});}
async function close(s,name){await save(name,{network:s.network,errors:s.errors,observer:await s.page.evaluate(()=>window.__WW_AUDIT),snapshot:await snapshot(s)});await s.context.close();}
async function phase(s,name,action,settle=700){const start=await s.page.evaluate(()=>performance.now());const before=await s.cdp.send('Performance.getMetrics');await action();await sleep(settle);const end=await s.page.evaluate(()=>performance.now());const frames=await s.page.evaluate(({start,end})=>window.__WW_AUDIT.frames.filter(f=>f.at>=start&&f.at<=end),{start,end});const after=await s.cdp.send('Performance.getMetrics');const b=Object.fromEntries(before.metrics.map(m=>[m.name,m.value])),a=Object.fromEntries(after.metrics.map(m=>[m.name,m.value]));return{name,start,end,wallMs:end-start,frameStats:frameStats(frames),mainThread:{taskDurationMs:(a.TaskDuration-b.TaskDuration)*1000,scriptDurationMs:(a.ScriptDuration-b.ScriptDuration)*1000,layoutCount:a.LayoutCount-b.LayoutCount,layoutDurationMs:(a.LayoutDuration-b.LayoutDuration)*1000,recalcStyleCount:a.RecalcStyleCount-b.RecalcStyleCount}};}
async function theme(s,dark){await s.page.getByRole('button',{name:'การแสดงผลและตั้งค่า',exact:true}).click();await s.page.getByRole('button',{name:dark?'มืด':'สว่าง',exact:true}).click();await s.page.getByRole('button',{name:'ปิด',exact:true}).click();}
async function city(s,name){await s.page.getByRole('button',{name:'ค้นหาตำแหน่ง',exact:true}).click();const details=s.page.locator('.secondary-locations');if(await details.count())await details.locator('summary').click();await s.page.locator('.china-options').getByRole('button').filter({hasText:name}).click();}
async function pan(s,reverse=false){const box=await s.page.locator('.map-canvas').boundingBox();const x=box.x+box.width*.45,y=box.y+Math.min(160,box.height*.25);await s.page.mouse.move(x,y);await s.page.mouse.down();await s.page.mouse.move(x+(reverse?-65:65),y+25,{steps:25});await s.page.mouse.up();}
async function range(s,index){await s.page.locator('.radar-controls input[type="range"]').evaluate((el,value)=>{const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;setter.call(el,String(value));el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));},index);}
const results={loads:[],interactions:[],reliability:[],sustained:null,stages:[],failures:[]};
async function stage(name,fn){console.log('START',name,new Date().toISOString());const at=Date.now();try{await fn();results.stages.push({name,status:'completed',durationMs:Date.now()-at});}catch(e){results.failures.push({stage:name,error:e.stack});results.stages.push({name,status:'failed',durationMs:Date.now()-at});console.error('AUDIT STAGE FAILED',name,e.message);}await save('results',results);console.log('END',name,Math.round((Date.now()-at)/1000)+'s');}

await stage('production-loads',async()=>{
  const profiles=[{name:'desktop-normal',viewport:{width:1440,height:1000},mobile:false,cpu:1},{name:'mobile-normal',cpu:1},{name:'mobile-4g-cpu4',cpu:4,throttle:{offline:false,latency:150,downloadThroughput:200000,uploadThroughput:93750,connectionType:'cellular4g'}}];
  for(const profile of profiles)for(let run=1;run<=3;run++){
    const s=await session(profile);
    if(profile.throttle)await s.cdp.send('Network.emulateNetworkConditions',profile.throttle);
    for(const cache of ['cold','warm']){
      if(cache==='cold')await s.cdp.send('Network.clearBrowserCache');
      const networkStart=s.network.length;
      if(cache==='warm')await s.page.evaluate(()=>localStorage.setItem('ww-appearance','light'));
      await goto(s,base);await sleep(12000);
      const state=await snapshot(s),obs=await s.page.evaluate(()=>window.__WW_AUDIT),net=s.network.slice(networkStart);
      const nav=await s.page.evaluate(()=>performance.getEntriesByType('navigation')[0].toJSON());
      const row={profile:profile.name,viewport:profile.viewport||{width:390,height:844},cpu:profile.cpu,network:profile.throttle||'unthrottled runner network',run,cache,session:cache==='cold'?'fresh browser context':'returning local preferences; same context HTTP cache; React Query restarts',observationMs:12000,FCP:obs.paint.find(e=>e.name==='first-contentful-paint')?.startTime??null,LCP:obs.lcp.at(-1)?.startTime??null,CLS:cls(obs.shifts),INP:null,INPReason:'No representative field interactions; automated lab sample insufficient for certified INP',windowedBlockingMs:obs.longTasks.filter(e=>e.startTime>= (obs.paint.find(e=>e.name==='first-contentful-paint')?.startTime||0)).reduce((n,e)=>n+Math.max(0,e.duration-50),0),TBTMethod:'sum(max(longtask.duration-50,0)) after FCP in 12s window; not Lighthouse TBT / TTI',longTaskCount:obs.longTasks.length,transferredBytes:net.reduce((n,e)=>n+(e.encodedBytes||0),0),jsTransferBytes:net.filter(e=>e.type==='Script').reduce((n,e)=>n+(e.encodedBytes||0),0),requestCount:net.length,cacheHits:net.filter(e=>e.servedFromCache||e.fromDiskCache).length,providerResponses:net.filter(e=>['weather','air','radar-meta-or-coverage'].includes(e.group)).map(e=>({group:e.group,status:e.status,durationMs:e.end?(e.end-e.start)*1000:null,ttfbMs:e.responseAt?(e.responseAt-e.start)*1000:null,error:e.error})),navigation:nav,initialState:state,errors:s.errors,paint:obs.paint,lcpCandidates:obs.lcp,shifts:obs.shifts,longTasks:obs.longTasks};
      row.weatherVisibleMs=obs.stateEvents.find(e=>/\d/.test(e.temperature||''))?.at??null;
      row.mapReadyMs=obs.stateEvents.find(e=>e.map==='ready')?.at??null;
      row.stateEvents=obs.stateEvents;
      results.loads.push(row);await save(`load-${profile.name}-${run}-${cache}`,{...row,network:net});
      console.log('LOAD',profile.name,run,cache,'LCP',row.LCP,'weather',state.temperature,'map',state.engine,state.status);
      if(run===1)await s.page.screenshot({path:`${out}/${profile.name}-${cache}.png`});
    }await s.context.close();
  }
  const payload=[];for(const file of await readdir('dist/assets')){if(/\.(js|mjs|css)$/.test(file)){const bytes=await readFile('dist/assets/'+file);payload.push({file,rawBytes:bytes.length,gzipBytes:gzipSync(bytes).length,sha256:createHash('sha256').update(bytes).digest('hex')});}}
  await save('payload',payload);await save('captured-live-fixtures',fixtures);
});

await stage('map-radar-sheet-interactions',async()=>{
  const s=await session({trace:true});await goto(s);await ready(s);await sleep(4000);
  const initial=await snapshot(s);await save('interaction-initial',initial);
  const phases=[];
  phases.push(await phase(s,'continuous-pan',async()=>{for(let i=0;i<6;i++)await pan(s,i%2===1);},1200));
  phases.push(await phase(s,'wheel-repeated-zoom',async()=>{const b=await s.page.locator('.map-canvas').boundingBox();await s.page.mouse.move(b.x+b.width*.4,b.y+140);for(const dy of [-120,120,-120,120]){await s.page.mouse.wheel(0,dy);await sleep(400);}},1200));
  phases.push(await phase(s,'touch-pinch',async()=>{const b=await s.page.locator('.map-canvas').boundingBox();await s.cdp.send('Input.synthesizePinchGesture',{x:b.x+b.width*.5,y:b.y+150,scaleFactor:1.25,relativeSpeed:250,gestureSourceType:'touch'});},1200));
  for(let i=0;i<2;i++){phases.push(await phase(s,`theme-dark-${i}`,()=>theme(s,true),2000));phases.push(await phase(s,`theme-light-${i}`,()=>theme(s,false),2000));}
  for(let i=0;i<6;i++)phases.push(await phase(s,`sheet-cycle-${i}`,async()=>{await s.page.getByRole('button',{name:'ขยายแผง',exact:true}).click();await sleep(270);await s.page.getByRole('button',{name:'ขยายแผง',exact:true}).click();await sleep(270);await s.page.getByRole('button',{name:'ยุบแผง',exact:true}).click();await sleep(270);await s.page.getByRole('button',{name:'ยุบแผง',exact:true}).click();},300));
  phases.push(await phase(s,'sheet-real-touch-drag',async()=>{const b=await s.page.locator('.sheet-handle').boundingBox();const x=b.x+b.width*.45,y=b.y+15;await s.cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let n=1;n<=12;n++)await s.cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-n*4}]});await s.cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});},500));
  while(await s.page.locator('.sheet-collapsed').count()===0)await s.page.getByRole('button',{name:'ยุบแผง',exact:true}).click();
  const slider=s.page.locator('.radar-controls input[type="range"]');
  if(await slider.isEnabled()){
    const max=Number(await slider.getAttribute('max'));
    for(let i=0;i<3;i++)phases.push(await phase(s,`radar-manual-${i}`,()=>range(s,Math.max(0,max-1-i)),1500));
    phases.push(await phase(s,'radar-rapid-frames',async()=>{for(let i=0;i<10;i++){await range(s,i%(max+1));await sleep(100);}},1000));
    await s.page.getByRole('button',{name:'เล่นเรดาร์ย้อนหลัง',exact:true}).click();
    phases.push(await phase(s,'radar-real-playback-pan',async()=>{await pan(s);await sleep(32000);},500));
    if(await s.page.getByRole('button',{name:'หยุดเรดาร์',exact:true}).count())await s.page.getByRole('button',{name:'หยุดเรดาร์',exact:true}).click();
  }
  phases.push(await phase(s,'location-Xian',()=>city(s,'ซีอาน'),2500));
  const xian=await snapshot(s);
  await s.page.screenshot({path:`${out}/china-coverage.png`});
  // Test recovery after freeze; OS suspension and native visibility are separate limits.
  await s.cdp.send('Page.setWebLifecycleState',{state:'frozen'});await sleep(2000);await s.cdp.send('Page.setWebLifecycleState',{state:'active'});await sleep(1000);
  const resumed=await snapshot(s);
  await s.page.setViewportSize({width:844,height:390});await sleep(500);await s.page.setViewportSize({width:390,height:844});
  await s.page.emulateMedia({reducedMotion:'reduce'});phases.push(await phase(s,'reduced-motion-sheet',async()=>{await s.page.getByRole('button',{name:'ขยายแผง',exact:true}).click();await s.page.getByRole('button',{name:'ยุบแผง',exact:true}).click();},500));
  await s.page.getByRole('button',{name:'ค้นหาตำแหน่ง',exact:true}).click();await s.page.getByRole('textbox',{name:'ค้นหาตำแหน่ง',exact:true}).fill('เชียงใหม่');await sleep(500);await s.page.keyboard.press('Escape');
  const final=await snapshot(s);
  results.interactions.push({initial,phases,xian,resumed,final});await save('map-radar-sheet',{initial,phases,xian,resumed,final});
  await s.page.screenshot({path:`${out}/mobile-dark.png`});
  await s.context.tracing.stop({path:`${out}/map-interactions-trace.zip`});await close(s,'map-interactions-raw');
});

async function replay(s,{weather='success',air='success',radar='success',delay=0}={}){
  for(const [key,pattern,mode] of [['weather','https://api.open-meteo.com/v1/forecast**',weather],['air','https://air-quality-api.open-meteo.com/**',air],['radar-meta-or-coverage','https://api.rainviewer.com/public/weather-maps.json',radar]]){
    await s.page.route(pattern,async route=>{
      if(mode==='abort')return route.abort('internetdisconnected');
      if(mode==='timeout')await sleep(13500);else if(key==='weather'&&delay)await sleep(delay);
      if(mode==='503')return route.fulfill({status:503,body:'controlled audit 503'});
      if(mode==='timeout'){try{return await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixtures[key].body)});}catch{return;}}
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixtures[key].body)});
    });
  }
}
await stage('api-reliability-controlled',async()=>{
  if(!fixtures.weather||!fixtures.air||!fixtures['radar-meta-or-coverage'])throw new Error('Live fixture capture unavailable; no fabricated replacement allowed');
  // Real captured payloads replayed ONLY in isolated diagnostic test contexts.
  for(const [name,options,wait] of [['success',{},2500],['slow-weather',{delay:4000},5500],['timeout-weather',{weather:'timeout'},28000],['503-weather',{weather:'503'},4500],['disconnected-provider',{weather:'abort'},4500],['partial-air-failure',{air:'503'},4000],['radar-metadata-failure',{radar:'503'},4500]]){
    const s=await session();await replay(s,options);const t=Date.now();await goto(s);await sleep(wait);const state=await snapshot(s);
    const ui=await s.page.locator('.situation-panel').innerText();const row={name,mode:'CONTROLLED replay of live captured payloads/failure injection, not live availability statistics',elapsedMs:Date.now()-t,...state,ui,requestAttempts:s.network.filter(r=>r.group==='weather').length};results.reliability.push(row);await s.page.screenshot({path:`${out}/reliability-${name}.png`});await close(s,`reliability-${name}`);
  }
  for(let repeat=1;repeat<=2;repeat++){
    const s=await session();await replay(s);await goto(s);await sleep(2000);await s.page.clock.install();
    const initial=await snapshot(s),count=s.network.filter(r=>r.group==='weather').length;
    await s.page.clock.fastForward(3*3600*1000+1000);await sleep(500);const aged=await snapshot(s);
    const afterCount=s.network.filter(r=>r.group==='weather').length;
    // Explicit visibility input: app handler is tested; not an actual OS background claim.
    await s.page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});await sleep(500);
    const restored=await snapshot(s),restoredCount=s.network.filter(r=>r.group==='weather').length;
    await s.page.screenshot({path:`${out}/long-session-clock-${repeat}.png`});
    await s.page.getByRole('button',{name:'การแสดงผลและตั้งค่า',exact:true}).click();await s.page.getByRole('button',{name:'รีเฟรชอากาศและคุณภาพอากาศ',exact:true}).click();await s.page.clock.runFor(1200);await sleep(300);
    const refreshed=await snapshot(s);results.reliability.push({name:'long-open-clock-'+repeat,clockSimulationMs:10801000,initial,aged,restored,refreshed,weatherRequests:{initial:count,aged:afterCount,restored:restoredCount,refreshed:s.network.filter(r=>r.group==='weather').length}});await close(s,`long-session-${repeat}`);
  }
  const s=await session({trace:true});await replay(s);await goto(s);await sleep(1800);await s.context.setOffline(true);await sleep(500);const offline=await snapshot(s);await s.page.screenshot({path:`${out}/offline.png`});await s.context.setOffline(false);await sleep(2500);const recovery=await snapshot(s);
  // Refresh failure with existing cache; inspect whether stale cached readings are distinguished.
  await s.page.unroute('https://api.open-meteo.com/v1/forecast**');await s.page.route('https://api.open-meteo.com/v1/forecast**',route=>route.fulfill({status:503,body:'controlled refresh 503'}));
  await s.page.getByRole('button',{name:'การแสดงผลและตั้งค่า',exact:true}).click();await s.page.getByRole('button',{name:'รีเฟรชอากาศและคุณภาพอากาศ',exact:true}).click();await sleep(3500);const failedRefresh=await snapshot(s);await s.page.screenshot({path:`${out}/failed-refresh.png`});
  results.reliability.push({name:'offline-recovery-failed-refresh',offline,recovery,failedRefresh});await s.context.tracing.stop({path:`${out}/reliability-trace.zip`});await close(s,'offline-recovery-raw');
  const switcher=await session();await replay(switcher,{delay:1800});await goto(switcher);await sleep(500);for(const name of ['ซีอาน','เฉิงตู','ฉงชิ่ง'])await city(switcher,name);await sleep(3000);results.reliability.push({name:'rapid-city-switch',final:await snapshot(switcher),requests:switcher.network.filter(r=>r.group==='weather')});await close(switcher,'rapid-city-switch');
});

await stage('radar-render-truth-failures',async()=>{
  for(let repeat=1;repeat<=2;repeat++){
    const s=await session({trace:repeat===1});await goto(s);await ready(s);await sleep(4000);
    let released=false;const held=[];
    await s.page.route(/https:\/\/[^/]+\.rainviewer\.com\/v2\/radar\/.+\.png/,async route=>{held.push({url:route.request().url(),at:Date.now()});await sleep(4000);try{await route.continue();}catch{} });
    const slider=s.page.locator('.radar-controls input[type="range"]');if(!await slider.isEnabled())throw new Error('No real radar history available for truth check');
    const max=Number(await slider.getAttribute('max'));const before=await snapshot(s);
    await range(s,Math.max(0,max-1));await sleep(500);const pending=await snapshot(s);
    await s.page.screenshot({path:`${out}/radar-pending-${repeat}.png`});await sleep(5500);const after=await snapshot(s);
    await s.page.unroute(/https:\/\/[^/]+\.rainviewer\.com\/v2\/radar\/.+\.png/);
    await s.page.route(/https:\/\/[^/]+\.rainviewer\.com\/v2\/radar\/.+\.png/,r=>r.fulfill({status:503,body:'controlled tile failure'}));await range(s,Math.max(0,max-3));await sleep(1800);const failed=await snapshot(s);await s.page.screenshot({path:`${out}/radar-failed-${repeat}.png`});
    // Hidden playback handler test with synthetic visibility input, then real lifecycle freeze.
    await s.page.getByRole('button',{name:'เล่นเรดาร์ย้อนหลัง',exact:true}).click();await s.page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});const pauseVerified=await s.page.getByRole('button',{name:'เล่นเรดาร์ย้อนหลัง',exact:true}).count()===1;
    results.reliability.push({name:'radar-truth-'+repeat,before,pending,after,failed,heldRequests:held,pauseVerified,visibilityMethod:'synthetic hidden property + actual app visibilitychange listener, not OS tab suspension'});
    if(repeat===1)await s.context.tracing.stop({path:`${out}/radar-truth-trace.zip`});await close(s,`radar-truth-${repeat}`);
  }
});

await stage('webgl-failure-fallback',async()=>{
  const s=await session({fallback:true});await goto(s);await sleep(12000);const before=await snapshot(s);await theme(s,true);await pan(s);const after=await snapshot(s);await s.page.screenshot({path:`${out}/leaflet-fallback.png`});results.reliability.push({name:'forced-webgl-unavailable',before,after,webglMethod:'getContext returns null for webgl only; real Leaflet renderer and external raster requests'});await close(s,'fallback-raw');
});

await stage('sustained-10-minute-real-time',async()=>{
  const s=await session();await goto(s);await ready(s);await sleep(3000);
  const duration=Number(process.env.WW_AUDIT_SUSTAIN_MS||600000),start=Date.now(),samples=[],phases=[];let i=0;
  const playing=s.page.getByRole('button',{name:'เล่นเรดาร์ย้อนหลัง',exact:true});if(await playing.isEnabled())await playing.click();
  while(Date.now()-start<duration){
    phases.push(await phase(s,`sustain-pan-${i}`,()=>pan(s,i%2===1),300));
    if(i%4===1){await theme(s,true);await sleep(1300);await theme(s,false);}
    if(i%4===2){await s.page.getByRole('button',{name:'ขยายแผง',exact:true}).click();await sleep(350);await s.page.getByRole('button',{name:'ยุบแผง',exact:true}).click();if(await playing.isEnabled())await playing.click();}
    if(i%6===3)await city(s,i%12===3?'ซีอาน':'เฉิงตู');
    if(i===12){await s.cdp.send('Page.setWebLifecycleState',{state:'frozen'});await sleep(1500);await s.cdp.send('Page.setWebLifecycleState',{state:'active'});}
    const before=await snapshot(s);await s.cdp.send('HeapProfiler.collectGarbage');const after=await snapshot(s);samples.push({elapsedMs:Date.now()-start,beforeGC:before,afterGC:after,networkRequests:s.network.length,radarRequests:s.network.filter(r=>r.group==='radar-tile').length});
    console.log('SUSTAIN',Math.round((Date.now()-start)/1000),'seconds','heap',after.performance.JSHeapUsedSize,'nodes',after.dom.nodes,'listeners',after.dom.jsEventListeners);
    i++;await sleep(Math.min(14000,Math.max(0,duration-(Date.now()-start))));
  }
  const observer=await s.page.evaluate(()=>window.__WW_AUDIT);results.sustained={elapsedMs:Date.now()-start,requestedMs:duration,samples,phases,frameStats:frameStats(observer.frames),frameTotals:observer.frameTotals,note:'Mixed headless software-GPU scenario, includes pauses/idle; per-pan phase timings separate. frameStats uses bounded last <=6000 intervals, frameTotals covers complete session. Instrumentation buffers bound at 6000 frames/15000 events. Forced GC samples cannot prove GPU or battery stability.'};
  await s.page.screenshot({path:`${out}/sustained-final.png`});await save('sustained',results.sustained);await close(s,'sustained-raw');
});

await save('all-network',allRequests);
await save('results',results);
environment.finishedAt=new Date().toISOString();await save('environment',environment);
await browser.close();for(const server of servers)server.kill();
console.log('AUDIT COMPLETE',JSON.stringify({loadSamples:results.loads.length,reliabilityCases:results.reliability.length,sustainedMs:results.sustained?.elapsedMs,stageFailures:results.failures.map(f=>f.stage)}));
// Findings are not test failures. Infrastructure gaps remain explicit in results.
if(results.loads.length===0)process.exitCode=1;
