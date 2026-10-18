// Browser-side probes. No application behavior or provider result is changed.
export function installObserver() {
  const log = { paint: [], lcp: [], shifts: [], longTasks: [], interactions: [],
    frames: [], frameTotals: {samples:0,over33:0,over50:0,missed:0,max:0}, mapEvents: [], mapCalls: {}, mapInstances: 0, snapshots: [], frameRequests: [], stateEvents: [], renders: {} };
  window.__WW_AUDIT = log;
  for (const [type,key] of [['paint','paint'],['largest-contentful-paint','lcp'],['layout-shift','shifts'],['longtask','longTasks'],['event','interactions']]) {
    try { new PerformanceObserver(list => {
      for (const e of list.getEntries()) {
        const row = {name:e.name,startTime:e.startTime,duration:e.duration};
        if (type==='layout-shift') {row.value=e.value;row.hadRecentInput=e.hadRecentInput;}
        if (type==='event') {row.interactionId=e.interactionId;row.processingStart=e.processingStart;row.processingEnd=e.processingEnd;}
        if (type==='largest-contentful-paint') {row.size=e.size;row.tag=e.element?.tagName;}
        log[key].push(row);
      }
    }).observe({type,buffered:true,...(type==='event'?{durationThreshold:16}:{})}); } catch { /* unsupported metric retained as empty */ }
  }
  let previous=0;
  function tick(now) {if(previous){const dt=now-previous;log.frames.push({at:now,dt});const t=log.frameTotals;t.samples++;t.over33+=Number(dt>33.34);t.over50+=Number(dt>50);t.missed+=Math.max(0,Math.round(dt/16.667)-1);t.max=Math.max(t.max,dt);}previous=now;if(log.frames.length>6000)log.frames.splice(0,1000);requestAnimationFrame(tick);}
  requestAnimationFrame(tick);
  const record=(kind,data={})=>{if(log.mapEvents.length<15000)log.mapEvents.push({at:performance.now(),kind,...data});};
  window.__WW_HOOK_MAP=(m,engine)=>{
    log.mapInstances++;record('created',{engine});
    const wrapped=new WeakSet();
    for(const name of ['setStyle','resize','setPadding','flyTo','addSource','addLayer','remove','setView','invalidateSize','panBy']) {
      if(typeof m[name]!=='function')continue;
      const original=m[name];m[name]=function(...args){log.mapCalls[name]=(log.mapCalls[name]||0)+1;record(name,{arg:typeof args[0]==='string'?args[0]:null});return original.apply(this,args);};
    }
    if(engine==='maplibre') {
      const get=m.getSource;m.getSource=function(id){const source=get.call(this,id);if(source&&!wrapped.has(source)){wrapped.add(source);for(const name of ['setTiles','setData']){if(typeof source[name]!=='function')continue;const original=source[name];source[name]=function(...args){log.mapCalls[name]=(log.mapCalls[name]||0)+1;record(name,{sourceId:id,tiles:name==='setTiles'?args[0]:null});return original.apply(this,args);};}}return source;};
      m.on('style.load',()=>record('style.load'));
      m.on('load',()=>record('load'));
      m.on('sourcedata',e=>{if(e.sourceId?.startsWith('ww-'))record('sourcedata',{sourceId:e.sourceId,dataType:e.sourceDataType,isSourceLoaded:e.isSourceLoaded,tile:e.tile?.tileID?.key});});
      let lastConfirmed='';
      m.on('render',()=>{
        const s=m.getSource('ww-radar');
        if(s&&m.getLayer('ww-radar')&&m.getLayoutProperty('ww-radar','visibility')!=='none'&&m.isSourceLoaded('ww-radar')){
          const tile=s.tiles?.[0];if(tile&&tile!==lastConfirmed){lastConfirmed=tile;record('render-source-complete',{tiles:[tile],requested:document.querySelector('.map-canvas')?.dataset.radarFrame});}
        }
      });
      m.on('error',e=>record('map-error',{sourceId:e.sourceId,message:e.error?.message}));
    }
  };
  addEventListener('DOMContentLoaded',()=>{
    new MutationObserver(()=>{
      const el=document.querySelector('.map-canvas');
      const time=el?.dataset.radarFrame;
      if(time&&time!==log.frameRequests.at(-1)?.time)log.frameRequests.push({at:performance.now(),time,label:document.querySelector('[data-testid="radar-time"]')?.getAttribute('datetime')});
      const state={map:el?.dataset.mapStatus,temperature:document.querySelector('[data-testid="temperature"]')?.textContent};
      const previous=log.stateEvents.at(-1);
      if(state.map!==previous?.map||state.temperature!==previous?.temperature)log.stateEvents.push({at:performance.now(),...state});
    }).observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['data-radar-frame','data-map-status']});
  });
}

