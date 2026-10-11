import { test, expect } from '@playwright/test';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const { PNG }=createRequire(import.meta.url)('playwright-core/lib/utilsBundle');
const fixture=JSON.parse(readFileSync('diagnostics-p0/provider-fixtures.json','utf8'));
function image(color:number[]){const p=new PNG({width:512,height:512});for(let i=0;i<p.data.length;i+=4){p.data[i]=color[0];p.data[i+1]=color[1];p.data[i+2]=color[2];p.data[i+3]=200;}return PNG.sync.write(p);}
function changed(a:Buffer,b:Buffer){const aa=PNG.sync.read(a),bb=PNG.sync.read(b);let n=0;for(let i=0;i<aa.data.length;i+=4)if(Math.max(...[0,1,2].map(c=>Math.abs(aa.data[i+c]-bb.data[i+c])))>8)n++;return n;}
test('LAB distinct decoded imagery, delayed dwell, corrupt PNG and viewport/resource lifecycle',async({page},info)=>{
  test.skip(!!process.env.WW_E2E_BASE_URL,'Fixture renderer laboratory never substitutes data on the deployed/live verification path.');
  const fallback=info.project.name==='leaflet-reduced',errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(({fallback})=>{
    if(fallback){const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type:string,...args:any[]){return /webgl/.test(type)?null:original.apply(this,[type,...args] as any);} as any;}
    const originalCreate=URL.createObjectURL.bind(URL),originalRevoke=URL.revokeObjectURL.bind(URL),active=new Set<string>();
    URL.createObjectURL=b=>{const u=originalCreate(b);active.add(u);return u;};URL.revokeObjectURL=u=>{active.delete(u);originalRevoke(u);};
    (window as any).__RADAR_URLS=active;
    const transitions:any[]=[];let previous='';
    new MutationObserver(()=>{const time=document.querySelector('[data-testid=radar-time]')?.getAttribute('datetime');const status=document.querySelector('[data-testid=radar-presentation]')?.getAttribute('data-status');const key=JSON.stringify([time,status]);if(key!==previous&&time&&status){previous=key;transitions.push({time,status,at:performance.now()});}}).observe(document,{subtree:true,attributes:true,childList:true});
    (window as any).__RADAR_TRANSITIONS=transitions;
  },{fallback});
  await page.route('https://tiles.openfreemap.org/**',r=>r.fulfill({json:{version:8,sources:{},layers:[{id:'LAB-only',type:'background',paint:{'background-color':'#e4eaf0'}}]}}));
  await page.route(/https:\/\/[^/]*tile\.opentopomap\.org\//,r=>r.fulfill({body:image([228,234,240]),contentType:'image/png'}));
  await page.route('https://api.open-meteo.com/v1/forecast**',r=>r.fulfill({json:fixture.weather.body}));
  await page.route('https://air-quality-api.open-meteo.com/v1/air-quality**',r=>r.fulfill({json:fixture.air.body}));
  const times=[1000,1600,2200,2800],colors=[[245,60,65],[35,170,80],[200,30,180],[20,90,235]];
  await page.route('https://api.rainviewer.com/public/weather-maps.json',r=>r.fulfill({json:{host:'https://tilecache.rainviewer.com',radar:{past:times.map(time=>({time,path:`/v2/radar/${time}`}))}}}));
  const requests:{at:number,time:number}[]=[];
  await page.route('https://tilecache.rainviewer.com/**',async r=>{
    const time=Number(r.request().url().match(/\/radar\/(\d+)\//)?.[1]);requests.push({at:Date.now(),time});
    if(time===1000)await new Promise(resolve=>setTimeout(resolve,3200));
    try { await r.fulfill({body:time===2200?Buffer.from('CORRUPT LAB PNG'):image(colors[times.indexOf(time)]||[0,0,0]),contentType:'image/png'}); } catch(error) { if(!r.request().failure()) throw error; }
  });
  await page.goto('./');const map=page.locator('.map-canvas'),status=page.getByTestId('radar-presentation'),time=page.getByTestId('radar-time');
  await expect(map).toHaveAttribute('data-map-status','ready',{timeout:30000});await expect(status).toHaveAttribute('data-status','unverified',{timeout:20000});
  const clip={x:8,y:150,width:374,height:350};const initial=await page.screenshot({clip});
  await page.getByRole('button',{name:'เล่นเรดาร์ย้อนหลัง',exact:true}).click();
  await expect(time).toHaveAttribute('datetime',new Date(1000*1000).toISOString(),{timeout:2000});
  await expect(status).toHaveAttribute('data-status','pending');
  await expect(page.getByTestId('radar-playback')).toHaveAttribute('data-phase','buffering');
  await expect(status).toHaveAttribute('data-status','unverified',{timeout:10000});
  let first=await page.screenshot({clip});
  await info.attach('LAB-initial-before-pixel-assert',{body:initial,contentType:'image/png'});
  await expect.poll(async()=>{first=await page.screenshot({clip});expect(await time.getAttribute('datetime')).toBe(new Date(1000*1000).toISOString());return changed(initial,first);},{timeout:750,intervals:[50]}).toBeGreaterThan(20000);
  await expect(time).toHaveAttribute('datetime',new Date(1600*1000).toISOString(),{timeout:5000});
  const transitions=await page.evaluate(()=>(window as any).__RADAR_TRANSITIONS);
  const ready=transitions.find((x:any)=>x.time===new Date(1000*1000).toISOString()&&x.status==='unverified');
  const next=transitions.find((x:any)=>x.time===new Date(1600*1000).toISOString());
  expect(ready).toBeDefined();expect(next).toBeDefined();const dwell=next.at-ready.at;
  expect(dwell).toBeGreaterThanOrEqual(750);
  await expect(status).toHaveAttribute('data-status','unverified',{timeout:5000});let second=await page.screenshot({clip});await expect.poll(async()=>{second=await page.screenshot({clip});expect(await time.getAttribute('datetime')).toBe(new Date(1600*1000).toISOString());return changed(first,second);},{timeout:750,intervals:[50]}).toBeGreaterThan(20000);
  await expect(status).toHaveAttribute('data-status','failed',{timeout:7000});
  await expect(page.getByTestId('radar-playback')).toHaveAttribute('data-phase','failed',{timeout:2000});
  expect(await map.getAttribute('data-radar-displayed-frame')).toBe('');await expect(map).toHaveAttribute('data-map-status','ready');
  // Real map zoom cancellation followed by hiding the radar must release all owned image URLs.
  const slider=page.getByRole('slider',{name:'เฟรมเรดาร์ย้อนหลัง',exact:true});await slider.focus();await slider.press('Home');
  await page.mouse.move(180,270);await page.mouse.wheel(0,-400);await page.waitForTimeout(1200);
  await page.getByRole('button',{name:'เลือกชั้นข้อมูล'}).click();await page.getByRole('checkbox',{name:/เรดาร์ย้อนหลัง/}).uncheck();await page.getByRole('button',{name:'ปิด',exact:true}).click();await page.waitForTimeout(3500);
  if(fallback) expect(await page.evaluate(()=>(window as any).__RADAR_URLS.size)).toBe(0);
  await info.attach('LAB-initial-test-imagery',{body:initial,contentType:'image/png'});await info.attach('LAB-delayed-test-imagery',{body:first,contentType:'image/png'});await info.attach('LAB-next-test-imagery',{body:second,contentType:'image/png'});
  await info.attach('LAB-audit-P1-evidence',{body:Buffer.from(JSON.stringify({fallback,dwellMs:dwell,transitions,distinctPixels:[changed(initial,first),changed(first,second)],requests,remainingURLs:await page.evaluate(()=>(window as any).__RADAR_URLS.size),errors,note:'Synthetic LAB imagery and recorded responses only. Not live data. No viewport-complete claim.'},null,2)),contentType:'application/json'});
  expect(errors).toEqual([]);
});
