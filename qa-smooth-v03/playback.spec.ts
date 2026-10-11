import { test, expect } from '@playwright/test';
import { createRequire } from 'node:module';
// Reuse Playwright's existing PNG utility in diagnostics only; no new dependency/runtime import.
const { PNG } = createRequire(import.meta.url)('playwright-core/lib/utilsBundle');
function difference(a: Buffer, b: Buffer) {
  const aa = PNG.sync.read(a), bb = PNG.sync.read(b); let changed = 0;
  expect([aa.width,aa.height]).toEqual([bb.width,bb.height]);
  for(let i=0;i<aa.data.length;i+=4) if(Math.max(...[0,1,2].map(c=>Math.abs(aa.data[i+c]-bb.data[i+c])))>8) changed++;
  return { changedPixels: changed, totalPixels: aa.width*aa.height, fraction: changed/(aa.width*aa.height) };
}
test('real radar pixels, cadence, Pause, manual scrub and stable map', async ({ page }, info) => {
  const expectedInterval = Number(process.env.WW_EXPECT_INTERVAL || 2500);
  const phase = process.env.WW_SMOOTH_PHASE || 'candidate';
  const errors: string[]=[], requests: {at:number,url:string}[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(/rainviewer\.com\/.*\.png/.test(r.url())) requests.push({at:Date.now(),url:r.url()});});
  await page.addInitScript(({fallback})=>{
    if(fallback) { const original=HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext=function(type:string,...args:any[]){ if(type==='webgl'||type==='webgl2') return null;return original.apply(this,[type,...args] as any); } as any; }
    const frames:number[]=[],tasks:number[]=[];let last=performance.now();
    function sample(now:number){frames.push(now-last);last=now;if(frames.length>10000)frames.shift();requestAnimationFrame(sample);}requestAnimationFrame(sample);
    if(PerformanceObserver.supportedEntryTypes.includes('longtask')) new PerformanceObserver(l=>{tasks.push(...l.getEntries().map(e=>e.duration));}).observe({type:'longtask',buffered:true});
    (window as any).__SMOOTH={frames,tasks};
  },{fallback:info.project.name==='leaflet-reduced'});
  await page.goto('./');
  await expect(page.getByTestId('temperature')).toHaveText(/\d+°C/,{timeout:45000});
  const map=page.locator('.map-canvas');
  await expect(map).toHaveAttribute('data-map-status','ready',{timeout:30000});
  const engine=await map.getAttribute('data-map-engine');
  if(info.project.name==='leaflet-reduced') expect(engine).toBe('leaflet-fallback');
  const host=await map.elementHandle();
  const time=page.getByTestId('radar-time'), status=page.getByTestId('radar-presentation');
  await expect(status).toHaveAttribute('data-status','unverified',{timeout:40000});
  const clip={x:8,y:150,width:374,height:350};
  const originalImage=await page.screenshot({clip});
  const start=Date.now(); let previous=await time.getAttribute('datetime');
  await page.getByRole('button',{name:'เล่นเรดาร์ย้อนหลัง',exact:true}).click();
  await expect(page.getByRole('button',{name:'หยุดเรดาร์',exact:true})).toHaveAttribute('aria-pressed','true');
  const advances:{at:number,time:string|null,status:string|null}[]=[], images:Buffer[]=[],pixelChanges:any[]=[];
  for(let i=0;i<6;i++) {
    await expect.poll(()=>time.getAttribute('datetime'),{timeout:i===0?2000:25000,intervals:[50]}).not.toBe(previous);
    const selected=await time.getAttribute('datetime'); advances.push({at:Date.now()-start,time:selected,status:await status.getAttribute('data-status')}); previous=selected;
    await expect(status).toHaveAttribute('data-status','unverified',{timeout:20000});
    expect(await map.getAttribute('data-radar-displayed-frame')).toBe('');
    const img=await page.screenshot({clip}); images.push(img);
    pixelChanges.push(difference(i===0?originalImage:images[i-1]!,img));
    await info.attach(`actual-radar-frame-${i}`,{body:img,contentType:'image/png'});
  }
  await page.getByRole('button',{name:'หยุดเรดาร์',exact:true}).click();
  const paused=await time.getAttribute('datetime');await page.waitForTimeout(3500);expect(await time.getAttribute('datetime')).toBe(paused);
  expect(pixelChanges.filter(x=>x.changedPixels>=30).length).toBeGreaterThanOrEqual(3);
  const intervals=advances.slice(1).map((x,i)=>x.at-advances[i]!.at);
  expect(advances[0]!.at).toBeLessThanOrEqual(2000);
  // Gate/budget delays may lengthen intervals; record them without pretending a fixed FPS.
  expect(intervals.filter(x=>x>=expectedInterval-250&&x<=expectedInterval+500).length).toBeGreaterThanOrEqual(3);
  const slider=page.getByRole('slider',{name:'เฟรมเรดาร์ย้อนหลัง',exact:true});await slider.focus();await slider.press('End');
  expect(await time.getAttribute('datetime')).not.toBe(paused);
  await expect(page.getByRole('button',{name:'เล่นเรดาร์ย้อนหลัง',exact:true})).toHaveAttribute('aria-pressed','false');
  // Basemap control: radar hidden, fixed viewport and no dynamic UI in the clip.
  await page.getByRole('button',{name:'เลือกชั้นข้อมูล'}).click();
  await page.getByRole('checkbox',{name:/เรดาร์ฝน/}).uncheck();await page.getByRole('button',{name:'ปิด',exact:true}).click();
  await page.waitForTimeout(1000);const baseA=await page.screenshot({clip});await page.waitForTimeout(1000);const baseB=await page.screenshot({clip});
  const basemapControl=difference(baseA,baseB);expect(basemapControl.changedPixels).toBeLessThanOrEqual(10);
  expect(await page.evaluate(node=>node===document.querySelector('.map-canvas'),host)).toBe(true);
  const observations=await page.evaluate(()=>(window as any).__SMOOTH);
  const sorted=observations.frames.filter((n:number)=>n<1000).sort((a:number,b:number)=>a-b);
  const peak=Math.max(0,...requests.map(t=>requests.filter(v=>v.at>t.at-60000&&v.at<=t.at).length));expect(peak).toBeLessThanOrEqual(80);
  const result={phase,browser:info.project.name,baseURL:info.project.use.baseURL,engine,firstAdvanceMs:advances[0]!.at,intervalsMs:intervals,advances,pixelChanges,basemapControl,requests:requests.length,peakRolling60s:peak,uniqueTileURLs:new Set(requests.map(x=>x.url)).size,sameMapHost:true,canvasCount:await page.locator('canvas').count(),rAF:{count:observations.frames.length,p95Ms:sorted[Math.floor(sorted.length*.95)],excludedOver1000Ms:observations.frames.length-sorted.length},longTasks:observations.tasks,heap:await page.evaluate(()=>(performance as any).memory?.usedJSHeapSize??null),errors,limitations:'Transport is not pixel-complete confirmation. Pixel differences demonstrate sampled visible imagery, not complete viewport coverage. Linux browsers; not physical iPhone.'};
  await info.attach('smooth-playback-measurements',{body:Buffer.from(JSON.stringify(result,null,2)),contentType:'application/json'});
  expect(errors).toEqual([]);
});
