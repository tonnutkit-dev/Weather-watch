import {test,expect,type Page} from '@playwright/test';
import {readFileSync,writeFileSync} from 'node:fs';
const baseline=process.env.WW_MOBILE_PHASE==='baseline';
const fixture=JSON.parse(readFileSync('diagnostics-p0/provider-fixtures.json','utf8'));
const profiles=[
 {name:'375x667',width:375,height:667,target:240},
 {name:'390x844',width:390,height:844,target:300},
 {name:'430x932',width:430,height:932,target:300},
 {name:'landscape-667x375',width:667,height:375,target:100},
 {name:'landscape-844x390',width:844,height:390,target:150},
 {name:'safe-390x844',width:390,height:844,target:300,safe:true},
 {name:'safe-landscape-844x390',width:844,height:390,target:140,safe:true},
 {name:'browser-short-375x567',width:375,height:567,target:140},
 {name:'dynamic-390x720',width:390,height:720,target:240},
];
async function measure(page:Page){return page.evaluate(()=>{
 const rect=(s:string)=>{const el=document.querySelector<HTMLElement>(s);if(!el||getComputedStyle(el).display==='none')return null;const r=el.getBoundingClientRect();return r.width&&r.height?r.toJSON():null;};
 const map=rect('.map-canvas')!,sheet=rect('.situation-panel')!,radar=rect('.radar-controls'),toolbar=rect('.map-toolbar')!;
 const intersection=(r:any)=>r&&r.right>map.left&&r.left<map.right&&r.bottom>map.top&&r.top<map.bottom;
 const bottomObstructions=[sheet,radar,rect('.tile-error'),rect('.maplibregl-ctrl-attrib'),rect('.leaflet-control-attribution')].filter(intersection);
 const top=toolbar.bottom+1,bottom=Math.min(map.bottom,...bottomObstructions.map(r=>r.top));
 // Real DOM hit-testing excludes docks, sheet, attribution, toolbar, warning banners and markers.
 const free=(x:number,y:number)=>{const el=document.elementFromPoint(x,y);return !!el&&(!!el.closest('.maplibregl-canvas')||!!el.closest('.leaflet-container')&&!el.closest('.leaflet-control,.leaflet-marker-icon,.leaflet-popup'));};
 let sampledPixels=0,totalPixels=0;const step=8;
 for(let y=map.top+step/2;y<map.bottom;y+=step)for(let x=map.left+step/2;x<map.right;x+=step){totalPixels+=step*step;if(free(x,y))sampledPixels+=step*step;}
 const lanes=[];for(let y=top+4;y<bottom-4;y+=8)lanes.push([map.left+16,map.left+map.width*.35,map.left+map.width*.65,map.right-16].every(x=>free(x,y)));
 const controls=['.location-heading','.favorite-button','.map-toolbar button','.handle-button','.sheet-state-controls button','.radar-playline button','.radar-playline input'].flatMap(s=>Array.from(document.querySelectorAll<HTMLElement>(s))).filter(e=>e.getBoundingClientRect().width&&e.getBoundingClientRect().height).map(e=>({label:e.getAttribute('aria-label'),...e.getBoundingClientRect().toJSON()}));
 return {viewport:{width:innerWidth,height:innerHeight,visualHeight:visualViewport?.height},map,sheet,radar,toolbar,overview:rect('.weather-overview'),attribution:rect('.maplibregl-ctrl-attrib')||rect('.leaflet-control-attribution'),source:rect('.overview-freshness'),temperature:rect('[data-testid="temperature"]'),condition:rect('[data-testid="weather-condition"]'),corridor:{top,bottom,height:Math.max(0,bottom-top),width:map.width,allSampledLanesHitMap:lanes.every(Boolean)},sampledFreeArea:{pixels:sampledPixels,totalPixels,step,fraction:sampledPixels/totalPixels},controls,overflow:document.documentElement.scrollWidth>innerWidth};
});}
async function theme(page:Page,dark:boolean){await page.getByRole('button',{name:'การแสดงผลและตั้งค่า'}).click();await page.getByRole('button',{name:dark?'มืด':'สว่าง',exact:true}).click();await page.getByRole('button',{name:'ปิด',exact:true}).click();await expect(page.locator('.map-canvas')).toHaveAttribute('data-theme',dark?'dark':'light',{timeout:30000});}
for(const profile of profiles)test(`matched geometry ${profile.name}`,async({page},info)=>{
 test.skip(!!process.env.WW_E2E_BASE_URL,'LAB recordings never route a deployed website');
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://api.open-meteo.com/v1/forecast**',r=>r.fulfill({json:fixture.weather.body}));
 await page.route('https://air-quality-api.open-meteo.com/v1/air-quality**',r=>r.fulfill({json:fixture.air.body}));
 // ONLY recorded weather/AQ. Basemap and historical radar use their real network resources.
 await page.setViewportSize(profile);await page.goto('./');await expect(page.getByTestId('temperature')).toHaveText(/\d+°C/);await expect(page.locator('.map-canvas')).toHaveAttribute('data-map-status','ready',{timeout:30000});
 if(profile.safe)await page.evaluate(({landscape})=>{
  const css=Array.from(document.styleSheets).flatMap(s=>{try{return Array.from(s.cssRules).map(r=>r.cssText);}catch{return [];}}).join('\n').replace(/env\(safe-area-inset-top\)/g,landscape?'0px':'24px').replace(/env\(safe-area-inset-bottom\)/g,landscape?'21px':'34px').replace(/env\(safe-area-inset-left\)/g,landscape?'44px':'0px').replace(/env\(safe-area-inset-right\)/g,landscape?'44px':'0px');
  const style=document.createElement('style');style.textContent=css;document.head.append(style);
 },{landscape:profile.width>profile.height});
 const canvas=await page.locator('.maplibregl-canvas').elementHandle();const rows:any[]=[];
 for(const dark of [false,true]){
  await theme(page,dark);
  for(const state of baseline && !(await page.getByRole('button',{name:'ขยายแผง',exact:true}).isVisible()) ? ['collapsed'] : ['collapsed','half','expanded']){
   if(state!=='collapsed')await page.getByRole('button',{name:'ขยายแผง',exact:true}).click();
   await expect(page.locator(`.sheet-${state}`)).toBeVisible();
   await page.waitForTimeout(250); // End the 200ms sheet transition before bounds/screenshot.
   const g=await measure(page);rows.push({phase:baseline?'baseline':'candidate',browser:info.project.name,profile:profile.name,theme:dark?'dark':'light',state,...g});
   writeFileSync(info.outputPath('geometry.json'),JSON.stringify({scope:'Linux browser emulation. Recorded weather/AQ, real basemap/radar. Hit-test area is an 8px-grid estimate, corridor uses exact DOM bounds. Safe insets and browser-short viewport are simulations.',errors,rows},null,2));
   await page.screenshot({path:info.outputPath(`${baseline?'before':'after'}-${profile.name}-${dark?'dark':'light'}-${state}.png`),animations:'disabled'});
   if(!baseline){
    expect(g.overflow).toBe(false);
    for(const target of g.controls){expect(target.width,`${target.label} width`).toBeGreaterThanOrEqual(44);expect(target.height,`${target.label} height`).toBeGreaterThanOrEqual(44);}
    await expect(page.getByTestId('temperature')).toBeInViewport({ratio:1});await expect(page.getByTestId('weather-condition')).toBeInViewport({ratio:1});await expect(page.locator('.overview-freshness')).toBeInViewport({ratio:1});
    expect(await page.evaluate(n=>n===document.querySelector('.maplibregl-canvas'),canvas)).toBe(true);
    if(state==='collapsed'){
     expect(g.radar).not.toBeNull();expect(g.corridor.height).toBeGreaterThanOrEqual(profile.target);expect(g.corridor.allSampledLanesHitMap).toBe(true);
     expect(g.radar!.bottom).toBeLessThanOrEqual(g.attribution!.top+1);
     await expect(page.getByRole('slider',{name:'เฟรมเรดาร์ย้อนหลัง'})).toBeInViewport({ratio:1});
    }
   }
  }
  if(await page.getByRole('button',{name:'ยุบแผง',exact:true}).isVisible()){await page.getByRole('button',{name:'ยุบแผง',exact:true}).click();await page.getByRole('button',{name:'ยุบแผง',exact:true}).click();}
 }
 await info.attach('geometry',{path:info.outputPath('geometry.json'),contentType:'application/json'});expect(errors).toEqual([]);
});
test('fallback portrait and landscape geometry, reduced motion and status text',async({page},info)=>{
 test.skip(baseline||!!process.env.WW_E2E_BASE_URL);
 await page.route('https://api.open-meteo.com/v1/forecast**',r=>r.fulfill({json:fixture.weather.body}));await page.route('https://air-quality-api.open-meteo.com/v1/air-quality**',r=>r.fulfill({json:fixture.air.body}));
 await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type:string,...args:any[]){if(type==='webgl'||type==='webgl2')return null;return original.apply(this,[type,...args] as any);} as any;});
 await page.emulateMedia({reducedMotion:'reduce'});const rows=[];
 for(const profile of [profiles[0]!,profiles[4]!]){
  await page.setViewportSize(profile);await page.goto('./');await expect(page.locator('.map-canvas')).toHaveAttribute('data-map-status','ready',{timeout:30000});await expect(page.locator('.map-canvas')).toHaveAttribute('data-map-engine','leaflet-fallback');
  for(const dark of [false,true]){
   await theme(page,dark);const g=await measure(page);rows.push({profile:profile.name,theme:dark?'dark':'light',...g});writeFileSync(info.outputPath('fallback.json'),JSON.stringify(rows,null,2));
   await page.screenshot({path:info.outputPath(`after-fallback-${profile.name}-${dark?'dark':'light'}.png`)});
   expect(g.overflow).toBe(false);expect(g.radar).not.toBeNull();expect(g.corridor.height).toBeGreaterThanOrEqual(profile.target-20);expect(g.radar!.bottom).toBeLessThanOrEqual(g.attribution!.top+1);
   expect(await page.locator('.situation-panel').evaluate(e=>getComputedStyle(e).transitionDuration)).toBe('0s');
  }
 }
 await info.attach('fallback',{path:info.outputPath('fallback.json'),contentType:'application/json'});
});
test('live mobile source and radar controls remain accessible',async({page},info)=>{
 test.skip(baseline);await page.setViewportSize({width:375,height:667});await page.goto('./');
 await expect(page.getByTestId('temperature')).toHaveText(/\d+°C/,{timeout:45000});await expect(page.locator('.map-canvas')).toHaveAttribute('data-map-status','ready',{timeout:30000});
 const g=await measure(page);await info.attach('live-geometry',{body:Buffer.from(JSON.stringify(g,null,2)),contentType:'application/json'});expect(g.corridor.height).toBeGreaterThanOrEqual(240);
 await page.screenshot({path:info.outputPath('after-live-375-light.png')});await theme(page,true);await page.screenshot({path:info.outputPath('after-live-375-dark.png')});
 await page.getByRole('button',{name:'ขยายแผง',exact:true}).click();await expect(page.locator('.mobile-weather-detail')).toBeVisible();
 await page.locator('.panel-scroll').evaluate(el=>el.scrollTop=el.scrollHeight);await expect(page.locator('.data-footer')).toBeInViewport();
 await page.getByRole('button',{name:'ยุบแผง',exact:true}).click();await page.getByRole('button',{name:'รายละเอียดเรดาร์'}).click();await expect(page.getByRole('dialog')).toBeVisible();await expect(page.getByText('ภาพที่เลือก',{exact:true})).toBeVisible();
});
test('landscape actual one-finger pan and two-finger zoom retain canvas',async({page,context},info)=>{
 test.skip(baseline||info.project.name!=='chromium'||!!process.env.WW_E2E_BASE_URL);
 await page.route('https://api.open-meteo.com/v1/forecast**',r=>r.fulfill({json:fixture.weather.body}));await page.route('https://air-quality-api.open-meteo.com/v1/air-quality**',r=>r.fulfill({json:fixture.air.body}));
 await page.setViewportSize({width:844,height:390});await page.goto('./');const map=page.locator('.map-canvas');await expect(map).toHaveAttribute('data-map-status','ready',{timeout:30000});
 const canvas=await page.locator('.maplibregl-canvas').elementHandle();const lane=await measure(page);const x=lane.map.x+lane.map.width*.4,y=(lane.corridor.top+lane.corridor.bottom)/2;
 expect(lane.corridor.height).toBeGreaterThanOrEqual(150);const cdp=await context.newCDPSession(page);const center=await map.getAttribute('data-map-center');
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:0}]});for(let i=1;i<=8;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+i*8,y,id:0}]});await page.waitForTimeout(20);}await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await expect.poll(()=>map.getAttribute('data-map-center')).not.toBe(center);
 const zoom=await map.getAttribute('data-map-zoom');const fingers=(s:number)=>[{x:x-s,y,id:0},{x:x+s,y,id:1}];await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:fingers(30)});for(let i=1;i<=8;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:fingers(30+i*2)});await page.waitForTimeout(20);}await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await expect.poll(()=>map.getAttribute('data-map-zoom')).not.toBe(zoom);
 await page.getByRole('button',{name:'ขยายแผง',exact:true}).click();await page.getByRole('button',{name:'ขยายแผง',exact:true}).click();await theme(page,true);expect(await page.evaluate(n=>n===document.querySelector('.maplibregl-canvas'),canvas)).toBe(true);
 await page.getByRole('button',{name:'กลับไปยังตำแหน่งที่เลือก'}).click();await expect.poll(()=>map.getAttribute('data-map-center')).toBe('13.7563,100.5018');await info.attach('landscape-touch',{body:Buffer.from(JSON.stringify({pan:true,pinch:true,recenter:true,sameCanvas:true,geometry:lane})),contentType:'application/json'});await cdp.detach();
});
