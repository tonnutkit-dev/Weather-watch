import {describe,it,expect,vi,beforeEach,afterEach} from 'vitest';
import {fetchJson,ProviderError} from '../providers/http';
import {getWeather} from '../providers/weather';
import {getAirQuality} from '../providers/airQuality';
import {getRadar} from '../providers/radar';
import {searchPlaces} from '../providers/geocoding';
import {defaultLocation} from '../locations/provinces';
import weather from '../../evidence/weather-bangkok.json';
import air from '../../evidence/air-bangkok.json';
import radar from '../../evidence/radar.json';
function deferred<T>(){let resolve!:(v:T)=>void,reject!:(e:unknown)=>void;const promise=new Promise<T>((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
const result=(p:Promise<unknown>)=>p.then(value=>({value,error:undefined}),error=>({value:undefined,error}));
const ok=(body:unknown)=>({ok:true,status:200,json:async()=>body}) as Response;
beforeEach(()=>vi.useFakeTimers());
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
describe('Logical HTTP deadline, cancellation and cleanup',()=>{
 it('settles at12s even when fetch ignores native abort; no early settlement',async()=>{
  const late=deferred<Response>();let signal!:AbortSignal;vi.stubGlobal('fetch',vi.fn((_url,init)=>{signal=init.signal;return late.promise;}));
  let settled=false;const p=result(fetchJson('https://test.invalid/')).then(r=>{settled=true;return r;});
  await vi.advanceTimersByTimeAsync(11999);expect(settled).toBe(false);expect(signal.aborted).toBe(false);
  await vi.advanceTimersByTimeAsync(1);const r=await p;expect(r.error).toBeInstanceOf(ProviderError);expect(r.error.message).toBe('แหล่งข้อมูลตอบช้าเกินไป กรุณาลองใหม่');expect(signal.aborted).toBe(true);expect(vi.getTimerCount()).toBe(0);
  late.resolve(ok({late:true}));await vi.advanceTimersByTimeAsync(2000);expect((await p).value).toBeUndefined();
 });
 it('bounds JSON body read and handles its late rejection',async()=>{
  const body=deferred<unknown>();vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,status:200,json:()=>body.promise})));
  const p=result(fetchJson('https://test.invalid/'));await vi.advanceTimersByTimeAsync(12000);expect((await p).error).toBeInstanceOf(ProviderError);
  body.reject(new Error('late body failure'));await vi.advanceTimersByTimeAsync(1);expect(vi.getTimerCount()).toBe(0);
 });
 it.each([new Error('caller pre-aborted'),null])('does not start transport for pre-aborted caller and preserves reason %s',async reason=>{
  const caller=new AbortController();caller.abort(reason);const transport=vi.fn(()=>new Promise(()=>{}));vi.stubGlobal('fetch',transport);
  const r=await result(fetchJson('https://test.invalid/',caller.signal));expect(r.error).toBe(reason);expect(transport).not.toHaveBeenCalled();expect(vi.getTimerCount()).toBe(0);
 });
 it.each(['fetch','body'])('propagates mid-%s caller abort immediately and ignores late transport',async stage=>{
  const caller=new AbortController(),reason=new Error('location switched');const late=deferred<any>();let signal!:AbortSignal;
  vi.stubGlobal('fetch',vi.fn((_url,init)=>{signal=init.signal;return stage==='fetch'?late.promise:Promise.resolve({ok:true,status:200,json:()=>late.promise});}));
  const remove=vi.spyOn(caller.signal,'removeEventListener');const p=result(fetchJson('https://test.invalid/',caller.signal));await vi.advanceTimersByTimeAsync(1);caller.abort(reason);
  const r=await p;expect(r.error).toBe(reason);expect(signal.aborted).toBe(true);expect(remove).toHaveBeenCalled();expect(vi.getTimerCount()).toBe(0);
  late.reject(new Error('late ignored rejection'));await vi.advanceTimersByTimeAsync(1);
 });
 it('preserves null abort reason during transport',async()=>{
  const caller=new AbortController();vi.stubGlobal('fetch',vi.fn(()=>new Promise(()=>{})));const p=result(fetchJson('https://test.invalid/',caller.signal));caller.abort(null);expect((await p).error).toBeNull();expect(vi.getTimerCount()).toBe(0);
 });
 it('cleans timer/listener after success; later caller abort cannot cancel completed request',async()=>{
  const caller=new AbortController();let signal!:AbortSignal;const remove=vi.spyOn(caller.signal,'removeEventListener');vi.stubGlobal('fetch',vi.fn(async(_url,init)=>{signal=init.signal;return ok({zero:0});}));
  expect(await fetchJson('https://test.invalid/',caller.signal)).toEqual({zero:0});expect(vi.getTimerCount()).toBe(0);expect(remove).toHaveBeenCalled();caller.abort();expect(signal.aborted).toBe(false);
 });
 it.each([400,404,429,500,503])('preserves HTTP %i and error text without leaking timers',async status=>{
  vi.stubGlobal('fetch',vi.fn(async()=>({ok:false,status,json:vi.fn()})));const r=await result(fetchJson('https://test.invalid/'));expect(r.error).toBeInstanceOf(ProviderError);expect(r.error.status).toBe(status);expect(r.error.message).toBe(`แหล่งข้อมูลตอบกลับ ${status}`);expect(vi.getTimerCount()).toBe(0);
 });
 it('preserves network error text',async()=>{
  vi.stubGlobal('fetch',vi.fn(async()=>{throw new Error('network refused');}));const r=await result(fetchJson('https://test.invalid/'));expect(r.error.message).toBe('เชื่อมต่อแหล่งข้อมูลไม่ได้ ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่');expect(vi.getTimerCount()).toBe(0);
 });
});
const contracts=[
 {name:'weather',run:(signal?:AbortSignal)=>getWeather(defaultLocation,signal),body:weather,host:'api.open-meteo.com',check:(x:any)=>{expect(x.currentMeta.sourceId).toBe('open-meteo');expect(x.currentMeta.dataType).toBe('MODELED');expect(x.currentMeta.observedAt).toBeNull();expect(x.current.temperature).toBe(weather.current.temperature_2m);}},
 {name:'AQI',run:(signal?:AbortSignal)=>getAirQuality(defaultLocation,signal),body:air,host:'air-quality-api.open-meteo.com',check:(x:any)=>{expect(x.standard).toBe('US AQI');expect(x.meta.sourceId).toBe('open-meteo-cams');expect(x.pm25).toBe(air.current.pm2_5);}},
 {name:'radar metadata',run:(signal?:AbortSignal)=>getRadar(signal),body:radar,host:'api.rainviewer.com',check:(x:any)=>{expect(x.meta.sourceId).toBe('rainviewer');expect(x.meta.dataType).toBe('OBSERVED');expect(x.frames.length).toBeGreaterThan(0);expect(x.frames.every((f:any)=>f.time<=Date.now()/1000)).toBe(true);}},
 {name:'geocoding',run:(signal?:AbortSignal)=>searchPlaces('กรุงเทพ',signal),body:{results:[{id:1,name:'กรุงเทพมหานคร',latitude:13.7563,longitude:100.5018,country_code:'TH'}]},host:'geocoding-api.open-meteo.com',check:(x:any)=>{expect(x).toHaveLength(1);expect(x[0].country).toBe('TH');expect(x[0].timezone).toBe('Asia/Bangkok');}}
];
describe('Shared real-adapter HTTP contracts',()=>{
 for(const c of contracts){
  it(`${c.name} preserves endpoint and normalized contract`,async()=>{
   const transport=vi.fn(async(_url:unknown)=>ok(c.body));vi.stubGlobal('fetch',transport);c.check(await c.run());expect(new URL(String(transport.mock.calls[0]?.[0])).host).toBe(c.host);expect(vi.getTimerCount()).toBe(0);
  });
  it(`${c.name} forwards caller cancellation and excludes late data`,async()=>{
   const caller=new AbortController(),late=deferred<Response>(),reason=new Error('unmounted');vi.stubGlobal('fetch',vi.fn(()=>late.promise));const p=result(c.run(caller.signal));caller.abort(reason);expect((await p).error).toBe(reason);late.resolve(ok(c.body));await vi.advanceTimersByTimeAsync(1);expect((await p).value).toBeUndefined();expect(vi.getTimerCount()).toBe(0);
  });
 }
});
