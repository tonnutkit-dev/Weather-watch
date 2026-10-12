import {test,expect,type Page,type TestInfo} from '@playwright/test';
import {readFileSync,writeFileSync} from 'node:fs';
const fixture=JSON.parse(readFileSync('diagnostics-p0/provider-fixtures.json','utf8'));
const publicURL=process.env.WW_DIAG_PUBLIC_URL;
const control=process.env.WW_DIAG_CONTROL==='1';
const instrument=process.env.WW_DIAG_SIGNALS==='1';
const provider=(url:string)=>/https:\/\/(api|air-quality-api)\.open-meteo\.com\//.test(url);
async function observe(page:Page,info:TestInfo){
 const network:any[]=[];const errors:any[]=[];const origin=Date.now();
 page.on('request',r=>{if(provider(r.url()))network.push({event:'request',at:Date.now()-origin,url:r.url(),method:r.method()});});
 page.on('response',async r=>{if(provider(r.url())){try{network.push({event:'response',at:Date.now()-origin,url:r.url(),status:r.status(),headers:await r.allHeaders(),fromSW:r.fromServiceWorker()});}catch(e){errors.push(String(e));}}});
 page.on('requestfinished',r=>{if(provider(r.url()))network.push({event:'finished',at:Date.now()-origin,url:r.url(),timing:r.timing()});});
 page.on('requestfailed',r=>{if(provider(r.url()))network.push({event:'failed',at:Date.now()-origin,url:r.url(),failure:r.failure(),timing:r.timing()});});
 page.on('pageerror',e=>errors.push({event:'pageerror',at:Date.now()-origin,message:e.message}));
 page.on('console',m=>{if(m.type()==='error'||m.type()==='warning')errors.push({event:'console',type:m.type(),at:Date.now()-origin,text:m.text()});});
 if(instrument)await page.addInitScript(()=>{
  const w=window as any;w.__WW_FETCH_EVENTS=[];
  const log=(event:string,detail:any={})=>w.__WW_FETCH_EVENTS.push({event,at:performance.now(),visibility:document.visibilityState,...detail});
  const nativeTimeout=AbortSignal.timeout;const nativeAny=AbortSignal.any;
  AbortSignal.timeout=function(ms:number){const signal=nativeTimeout.call(AbortSignal,ms);log('timeout-created',{ms});signal.addEventListener('abort',()=>log('timeout-aborted',{ms,reason:signal.reason?.name}),{once:true});return signal;};
  AbortSignal.any=function(signals:AbortSignal[]){const signal=nativeAny.call(AbortSignal,signals);log('any-created',{inputs:signals.length});signal.addEventListener('abort',()=>log('any-aborted',{reason:signal.reason?.name}),{once:true});return signal;};
  const nativeFetch=window.fetch;
  window.fetch=function(input:RequestInfo|URL,init?:RequestInit){
   const url=String(input instanceof Request?input.url:input);const p=nativeFetch.call(window,input,init);
   if(url.includes('open-meteo.com')){log('fetch-start',{url,aborted:init?.signal?.aborted});init?.signal?.addEventListener('abort',()=>log('fetch-signal-aborted',{url,reason:init.signal?.reason?.name}),{once:true});p.then(r=>log('fetch-response',{url,status:r.status}),e=>log('fetch-rejected',{url,name:e.name,message:e.message}));}
   return p;
  };
  document.addEventListener('visibilitychange',()=>log('visibility'));
 });
 return async()=>{
  const state=await page.evaluate(()=>{const w=window as any;const panel=document.querySelector('.situation-panel');return {wallTime:Date.now(),visibility:document.visibilityState,userAgent:navigator.userAgent,support:{timeout:typeof AbortSignal.timeout,any:typeof AbortSignal.any},fetchEvents:w.__WW_FETCH_EVENTS||[],queryEvents:w.__WW_QUERY_EVENTS||[],queryStates:w.__WW_QUERY_CLIENT?.getQueryCache().getAll().map((q:any)=>({key:q.queryKey,status:q.state.status,fetchStatus:q.state.fetchStatus,failures:q.state.fetchFailureCount,error:q.state.error?.message})),body:document.body.innerText,verdict:panel?.getAttribute('data-verdict'),freshness:panel?.getAttribute('data-weather-freshness'),resources:performance.getEntriesByType('resource').filter((x:any)=>x.name.includes('open-meteo')).map(x=>x.toJSON())};}).catch(e=>({captureError:String(e)}));
  const result={scope:publicURL?'LIVE deployed original':'source: '+(control?'unmodified production build':'TEST-ONLY query-observer build'),instrumentedSignals:instrument,observationEffect:'Signal listeners may affect GC/lifetime; compare uninstrumented controls. Routes disable HTTP cache in LAB.',test:info.title,browser:info.project.name,network,errors,state};
  const path=info.outputPath('provider-events.json');writeFileSync(path,JSON.stringify(result,null,2));await info.attach('provider-events',{path,contentType:'application/json'});await page.screenshot({path:info.outputPath('full-viewport.png')});
 };
}
function currentBody(kind:'weather'|'air',expired=false){
 const b=structuredClone(fixture[kind].body);const now=Math.floor(Date.now()/1000);const delta=now-b.current.time-(expired?14400:0);
 b.current.time+=delta;for(const section of ['hourly','daily'])if(b[section]?.time)b[section].time=b[section].time.map((t:number)=>t+delta);
 return b; // Explicit LAB timestamp shift of recorded content, never shipped/live.
}
async function labData(page:Page,mode:string){
 await page.route('https://air-quality-api.open-meteo.com/**',r=>r.fulfill({json:currentBody('air')}));
 if(mode==='hang'){
  await page.addInitScript(()=>{const original=window.fetch;window.fetch=function(input:RequestInfo|URL,init?:RequestInit){if(String(input).includes('https://api.open-meteo.com/'))return new Promise<Response>((_resolve,reject)=>{const fail=()=>reject(init?.signal?.reason||new DOMException('LAB aborted','AbortError'));if(init?.signal?.aborted)fail();else init?.signal?.addEventListener('abort',fail,{once:true});});return original.call(window,input,init);};});
 }else await page.route('https://api.open-meteo.com/**',async r=>{
  if(mode==='reject'){await r.abort('failed');return;}
  if(mode==='delayed')await new Promise(resolve=>setTimeout(resolve,1500));
  if(mode==='late')await new Promise(resolve=>setTimeout(resolve,14000));
  const b=mode==='empty'?{}:currentBody('weather',mode==='expired');if(mode==='absent'){delete b.current.temperature_2m;delete b.current.apparent_temperature;}
  try{await r.fulfill({json:b});}catch{} // Aborted late route may already be closed; diagnostics records that state.
 });
 // Other network/map/radar remain genuine. The app renders independently of weather success.
}
async function usableMap(page:Page){
 const map=page.locator('.map-canvas');await expect(map).toHaveAttribute('data-map-status','ready',{timeout:30000});
 const before=await map.getAttribute('data-map-center');const canvas=await page.locator('.maplibregl-canvas').elementHandle();const r=await map.boundingBox();expect(r).not.toBeNull();
 const x=r!.x+r!.width*.45,y=r!.y+110;await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+45,y+10,{steps:8});await page.mouse.up();
 await expect.poll(()=>map.getAttribute('data-map-center')).not.toBe(before);await page.getByRole('button',{name:'กลับไปยังตำแหน่งที่เลือก'}).click();
 expect(await page.evaluate(n=>n===document.querySelector('.maplibregl-canvas'),canvas)).toBe(true);
}
for(let sample=1;sample<=3;sample++)test(`LIVE zero-retry original 45s temperature sample ${sample}`,async({page},info)=>{
 const save=await observe(page,info);
 try{await page.goto('./');await expect(page.getByTestId('temperature')).toHaveText(/\d+°C/,{timeout:45000});await expect(page.locator('.map-canvas')).toHaveAttribute('data-map-status','ready',{timeout:30000});}finally{await save();}
});
test('LAB native timeout and any abort real local transport',async({page},info)=>{
 test.skip(!!publicURL);const save=await observe(page,info);
 try{
  await labData(page,'ok');await page.goto('./');
  const result=await page.evaluate(async()=>{
   const one=async(combined:boolean)=>{const start=performance.now();const signal=combined?AbortSignal.any([new AbortController().signal,AbortSignal.timeout(1200)]):AbortSignal.timeout(1200);let abort:any=null;signal.addEventListener('abort',()=>abort={at:performance.now()-start,reason:signal.reason?.name},{once:true});
    const outcome=await Promise.race([fetch('http://127.0.0.1:4174/hang',{signal}).then(r=>({status:r.status}),e=>({name:e.name,message:e.message})),new Promise(resolve=>setTimeout(()=>resolve({stillPending:true}),4000))]);return {combined,elapsed:performance.now()-start,aborted:signal.aborted,abort,outcome};};
   return {direct:await one(false),combined:await one(true)};
  });
  await info.attach('native-abort-probe',{body:JSON.stringify(result,null,2),contentType:'application/json'});
  for(const r of [result.direct,result.combined]){expect(r.aborted).toBe(true);expect(r.elapsed).toBeLessThan(3000);expect((r.outcome as any).name).toMatch(/^(TimeoutError|AbortError)$/);}
 }finally{await save();}
});
for(const mode of ['reject','hang','delayed','late','empty','absent','expired'])test(`LAB fault ${mode} retains truthful map and state`,async({page},info)=>{
 test.skip(!!publicURL||control);const save=await observe(page,info);
 try{
  await labData(page,mode);await page.goto('./');
  const panel=page.locator('.situation-panel');
  if(mode==='reject'||mode==='hang'||mode==='late'||mode==='empty'){
   await expect(page.getByText('โหลดข้อมูลอากาศไม่ได้',{exact:true})).toBeVisible({timeout:30000});
   await expect(panel).toHaveAttribute('data-verdict','Unknown');
   await expect(page.getByRole('button',{name:'ลองใหม่',exact:true}).first()).toBeVisible();
  }else{
   await expect(page.getByTestId('temperature')).toBeVisible({timeout:10000});
   if(mode==='absent'||mode==='expired')await expect(panel).toHaveAttribute('data-verdict','Unknown');
   if(mode==='expired')await expect(panel).toHaveAttribute('data-weather-freshness','expired');
  }
  await usableMap(page);await page.getByRole('button',{name:'ขยายแผง',exact:true}).click();await expect(page.locator('.sheet-half')).toBeVisible();
 }finally{await save();}
});
test('LAB offline and failed refresh preserve cache with Unknown',async({page,context},info)=>{
 test.skip(!!publicURL||control);const save=await observe(page,info);
 try{
  await labData(page,'ok');await page.goto('./');await expect(page.getByTestId('temperature')).toHaveText(/\d+°C/);
  const original=await page.getByTestId('temperature').innerText();await context.setOffline(true);await expect(page.getByText('ออฟไลน์',{exact:false}).first()).toBeVisible();await context.setOffline(false);
  await page.unroute('https://api.open-meteo.com/**');await page.route('https://api.open-meteo.com/**',r=>r.abort('failed'));
  // TEST-only direct refetch bypasses admission UI to isolate query/cache settlement; policy is unchanged.
  await page.evaluate(()=>void (window as any).__WW_QUERY_CLIENT.refetchQueries({queryKey:['weather']}));
  await expect(page.locator('.situation-panel')).toHaveAttribute('data-weather-freshness','refresh-failed',{timeout:10000});await expect(page.locator('.situation-panel')).toHaveAttribute('data-verdict','Unknown');await expect(page.getByTestId('temperature')).toHaveText(original);
  await usableMap(page);
 }finally{await save();}
});
