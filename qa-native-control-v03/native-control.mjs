// Standalone browser module: no imports, global patches, retries or raw output.
export async function runNativeControl(endpoints) {
  const hosts = {WEATHER:'api.open-meteo.com', AQI:'air-quality-api.open-meteo.com'};
  if (!Array.isArray(endpoints) || endpoints.length !== 2 || endpoints.map(x=>x.provider).join(',') !== 'WEATHER,AQI') throw new Error('CONTROL_INPUT');
  for (const x of endpoints) {
    if (Object.keys(x).sort().join(',') !== 'provider,url') throw new Error('CONTROL_INPUT');
    const u = new URL(x.url);
    if (u.protocol !== 'https:' || u.hostname !== hosts[x.provider] || u.port || u.username || u.password || u.hash) throw new Error('CONTROL_ENDPOINT');
  }
  const origin = performance.now();
  return Promise.all(endpoints.map(async ({provider,url})=>{
    const controller = new AbortController();
    const row = {provider, requestMs:Math.round(performance.now()-origin), headersMs:null, jsonMs:null,
      deadlineMs:null, statusClass:'NONE', outcome:'PENDING', aborted:false, operationSettled:false, valid:false};
    let expired = false, timer;
    const deadline = new Promise(resolve=>{ timer = setTimeout(()=>{
      expired=true; row.deadlineMs=Math.round(performance.now()-origin); controller.abort(new DOMException('Provider deadline exceeded','TimeoutError')); resolve('DEADLINE');
    },12000); });
    const operation = (async()=>{
      try {
        const response=await fetch(url,{signal:controller.signal});
        if (expired) return 'LATE_IGNORED';
        row.headersMs=Math.round(performance.now()-origin);
        row.statusClass = response.status>=100 && response.status<=599 ? Math.floor(response.status/100)+'xx' : 'NONE';
        if (!response.ok) return 'HTTP_ERROR';
        const body=await response.json();
        if (expired) return 'LATE_IGNORED';
        row.jsonMs=Math.round(performance.now()-origin);
        row.valid=Number.isFinite(body?.current?.[provider==='WEATHER'?'temperature_2m':'us_aqi']);
        return row.valid?'VALID_JSON':'MISSING_FIELD';
      } catch (error) {
        if (expired) return 'ABORT_AFTER_DEADLINE';
        return error?.name==='SyntaxError'?'JSON_REJECTED':'FETCH_REJECTED';
      } finally { row.operationSettled=true; }
    })();
    const result=await Promise.race([operation,deadline]);
    clearTimeout(timer); row.outcome=expired?'DEADLINE':result; row.aborted=controller.signal.aborted;
    return structuredClone(row);
  }));
}
