import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const fixture=JSON.parse(readFileSync('diagnostics-p0/provider-fixtures.json','utf8'));
for(const mode of ['late','ignored-hang','body-hang','pre','abort-fetch','abort-body','statuses','cleanup'])test(`HTTP ${mode} logical deadline and cancellation`,async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('./qa-provider-v03/http-probe.html');
 const r=await page.evaluate(async mode=>{
  const w=window as any;const events:any[]=[];const unhandled:any[]=[];window.addEventListener('unhandledrejection',e=>unhandled.push(String(e.reason)));
  const originalFetch=window.fetch,originalTimeout=window.setTimeout,originalClear=window.clearTimeout;const timers=new Set<number>();
  window.setTimeout=((fn:TimerHandler,ms?:number,...args:any[])=>{const id=originalTimeout.call(window,fn,ms,...args);if(ms===12000)timers.add(id);return id;}) as typeof setTimeout;
  window.clearTimeout=(id:number|undefined)=>{if(id!==undefined)timers.delete(id);originalClear.call(window,id);};
  const start=performance.now();const log=(event:string,detail:any={})=>events.push({event,at:performance.now()-start,...detail});const controller=new AbortController();
  let removeCount=0;const remove=controller.signal.removeEventListener.bind(controller.signal);controller.signal.removeEventListener=function(...args:Parameters<typeof remove>){removeCount++;return remove(...args);};
  let requestSignal:AbortSignal|undefined,calls=0;const reason=mode==='pre'?null:new Error('LAB caller cancelled');
  const sleep=(ms:number)=>new Promise(resolve=>originalTimeout.call(window,resolve,ms));
  window.fetch=async(_input:any,init:any)=>{
   calls++;requestSignal=init.signal;log('fetch');init.signal.addEventListener('abort',()=>log('transport-abort',{reason:init.signal.reason?.name}));
   if(mode==='statuses')return new Response('LAB HTTP failure',{status:w.__LAB_STATUS});
   if(mode==='cleanup')return {ok:true,status:200,json:async()=>({lab:true})} as Response;
   if(mode==='body-hang'||mode==='abort-body')return {ok:true,status:200,json:async()=>{log('body-start');return new Promise(()=>{});}} as Response;
   if(mode==='late'){await sleep(14000);log('late-response');return {ok:true,status:200,json:async()=>({late:true})} as Response;}
   return new Promise(()=>{}); // Deliberately ignores transport abort; logical deadline must settle.
  };
  try{
   if(mode==='statuses'){
    const out=[];for(const status of [400,429,500,503]){w.__LAB_STATUS=status;try{await w.__WW_HTTP.fetchJson('https://lab.invalid/');out.push({status,unexpectedSuccess:true});}catch(e:any){out.push({status,actual:e.status,message:e.message,provider:e instanceof w.__WW_HTTP.ProviderError});}}
    return {out,timers:timers.size,unhandled};
   }
   if(mode==='pre')controller.abort(reason);
   if(mode==='abort-fetch'||mode==='abort-body')originalTimeout.call(window,()=>controller.abort(reason),100);
   let value:any,error:any,preserved=false;
   try{value=await w.__WW_HTTP.fetchJson('https://lab.invalid/',controller.signal);log('success');}catch(e:any){error={name:e?.name,message:e?.message,provider:e instanceof w.__WW_HTTP.ProviderError};preserved=e===reason;log('rejected',error);}
   const elapsed=performance.now()-start;
   if(mode==='late')await sleep(2200);if(mode==='cleanup')controller.abort(reason);await sleep(20);
   return {value,error,elapsed,preserved,calls,timers:timers.size,removeCount,requestAborted:requestSignal?.aborted,events,unhandled};
  }finally{window.fetch=originalFetch;window.setTimeout=originalTimeout;window.clearTimeout=originalClear;}
 },mode);
 await info.attach('logical-http-result',{body:JSON.stringify({scope:'LAB direct actual shared helper, real browser clock, no shipped fixtures; transport deliberately ignores abort.',mode,browser:info.project.name,result:r,errors},null,2),contentType:'application/json'});
 expect(errors).toEqual([]);expect(r.unhandled).toEqual([]);expect(r.timers).toBe(0);
 if(['late','ignored-hang','body-hang'].includes(mode)){expect(r.elapsed).toBeGreaterThanOrEqual(11900);expect(r.elapsed).toBeLessThan(13000);expect(r.error?.provider).toBe(true);expect(r.requestAborted).toBe(true);expect(r.value).toBeUndefined();expect(r.removeCount).toBe(1);}
 if(['pre','abort-fetch','abort-body'].includes(mode)){expect(r.preserved).toBe(true);expect(r.error?.provider).toBe(false);expect(r.elapsed).toBeLessThan(2000);if(mode==='pre')expect(r.calls).toBe(0);}
 if(mode==='statuses')for(const s of r.out!){expect(s.actual).toBe(s.status);expect(s.provider).toBe(true);}
 if(mode==='cleanup'){expect(r.value).toEqual({lab:true});expect(r.requestAborted).toBe(false);expect(r.removeCount).toBe(1);}
});
test('HTTP actual App location change and unmount cancel ignored transport',async({page},info)=>{
 await page.route('https://air-quality-api.open-meteo.com/**',r=>r.fulfill({json:fixture.air.body}));
 await page.addInitScript(()=>{const w=window as any;w.__LAB_REQUESTS=[];const original=window.fetch;window.fetch=function(input:any,init?:RequestInit){if(String(input).startsWith('https://api.open-meteo.com/'))return new Promise<Response>((resolve)=>{const row={url:String(input),aborted:false,resolve:()=>resolve(new Response('{"LAB":"late"}',{headers:{'Content-Type':'application/json'}}))};init?.signal?.addEventListener('abort',()=>row.aborted=true);w.__LAB_REQUESTS.push(row);});return original.call(window,input,init);};});
 await page.goto('./');await expect.poll(()=>page.evaluate(()=>(window as any).__LAB_REQUESTS.length)).toBe(1);
 await page.getByRole('button',{name:'ค้นหาตำแหน่ง',exact:true}).click();await page.locator('.secondary-locations summary').click();await page.locator('.china-options').getByRole('button',{name:/ซีอาน/}).click();
 await expect.poll(()=>page.evaluate(()=>(window as any).__LAB_REQUESTS.length)).toBe(2);await expect.poll(()=>page.evaluate(()=>(window as any).__LAB_REQUESTS[0].aborted)).toBe(true);
 await page.evaluate(()=>(window as any).__LAB_REQUESTS[0].resolve());await expect(page.getByTestId('temperature')).toHaveCount(0);
 await page.evaluate(()=>(window as any).__WW_APP_ROOT.unmount());await expect.poll(()=>page.evaluate(()=>(window as any).__LAB_REQUESTS[1].aborted)).toBe(true);
 await page.evaluate(()=>(window as any).__LAB_REQUESTS[1].resolve());
 const states=await page.evaluate(()=>(window as any).__WW_QUERY_CLIENT.getQueryCache().getAll().filter((q:any)=>q.queryKey[0]==='weather').map((q:any)=>({key:q.queryKey,data:q.state.data,fetchStatus:q.state.fetchStatus})));
 for(const q of states){expect(q.data).toBeUndefined();expect(q.fetchStatus).toBe('idle');}
 await info.attach('app-cancellation',{body:JSON.stringify({scope:'TEST-only root/client exposure; actual App selection and unmount. Ignored aborted transport cannot populate old-location cache.',states}),contentType:'application/json'});
});
test('HTTP actual App ignores native abort but completes one retry with Unknown by26s',async({page},info)=>{
 await page.route('https://air-quality-api.open-meteo.com/**',r=>r.fulfill({json:fixture.air.body}));
 await page.addInitScript(()=>{const w=window as any;w.__LAB_STARTED=[];const original=window.fetch;window.fetch=function(input:any,init?:RequestInit){if(String(input).startsWith('https://api.open-meteo.com/')){const row={at:performance.now(),aborted:false};init?.signal?.addEventListener('abort',()=>row.aborted=true);w.__LAB_STARTED.push(row);return new Promise(()=>{});}return original.call(window,input,init);};});
 await page.goto('./');await expect(page.getByText('โหลดข้อมูลอากาศไม่ได้',{exact:true})).toBeVisible({timeout:30000});await expect(page.locator('.situation-panel')).toHaveAttribute('data-verdict','Unknown');
 const r=await page.evaluate(()=>{const w=window as any;const q=w.__WW_QUERY_CLIENT.getQueryCache().getAll().find((q:any)=>q.queryKey[0]==='weather');const e=w.__WW_QUERY_EVENTS.findLast((e:any)=>e.key[0]==='weather'&&e.action==='error');return {requests:w.__LAB_STARTED,terminal:e,status:q.state.status,fetchStatus:q.state.fetchStatus,failures:q.state.fetchFailureCount};});
 expect(r.requests).toHaveLength(2);expect(r.requests.every((x:any)=>x.aborted)).toBe(true);expect(r.terminal.at-r.requests[0].at).toBeGreaterThanOrEqual(24900);expect(r.terminal.at-r.requests[0].at).toBeLessThan(26000);expect(r.status).toBe('error');expect(r.fetchStatus).toBe('idle');expect(r.failures).toBe(2);
 await info.attach('bounded-production-retry',{body:JSON.stringify({scope:'Actual original App/QueryClient options, ignored native abort, real browser time. No retry/polling change.',result:r}),contentType:'application/json'});
});
