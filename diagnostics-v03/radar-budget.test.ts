// Audit-only transport tests against the unchanged production radar module.
// Synthetic binary bytes test cache mechanics; never used in product views.
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
const url=(n:number)=>`https://tilecache.rainviewer.com/v2/radar/audit-${n}/512/5/25/15/2/1_0.png`;
let transport:ReturnType<typeof vi.fn>;
beforeEach(()=>{vi.resetModules();vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-11T00:00:00Z'));transport=vi.fn(async()=>new Response(new Uint8Array([1,2,3,4])));vi.stubGlobal('fetch',transport);});
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
describe('unchanged radar budget/cache contracts',()=>{
  it('never starts the 81st request until the rolling minute expires',async()=>{
    const {radarImage,remainingBudget}=await import('../src/radar/budget');
    await Promise.all(Array.from({length:80},(_,i)=>radarImage(url(i),new AbortController().signal)));
    expect(remainingBudget()).toBe(0);
    const pending=radarImage(url(80),new AbortController().signal);
    await vi.advanceTimersByTimeAsync(59999);expect(transport).toHaveBeenCalledTimes(80);
    await vi.advanceTimersByTimeAsync(52);await pending;
    expect(transport).toHaveBeenCalledTimes(81);expect(remainingBudget()).toBe(79);
  });
  it('returns an independent cached buffer and expires it after five minutes',async()=>{
    const {radarImage}=await import('../src/radar/budget');
    const a=await radarImage(url(0),new AbortController().signal);new Uint8Array(a)[0]=99;
    const b=await radarImage(url(0),new AbortController().signal);
    expect(new Uint8Array(b)[0]).toBe(1);expect(transport).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(300001);await radarImage(url(0),new AbortController().signal);
    expect(transport).toHaveBeenCalledTimes(2);
  });
  it('aborts a budget-waiting tile without starting another network request',async()=>{
    const {radarImage}=await import('../src/radar/budget');
    await Promise.all(Array.from({length:80},(_,i)=>radarImage(url(i),new AbortController().signal)));
    const controller=new AbortController();const pending=radarImage(url(81),controller.signal);
    const rejected=expect(pending).rejects.toMatchObject({name:'AbortError'});
    controller.abort();await rejected;expect(transport).toHaveBeenCalledTimes(80);
    await vi.advanceTimersByTimeAsync(60051);expect(transport).toHaveBeenCalledTimes(80);
  });
  it('documents concurrent identical requests are not deduplicated before cache fill',async()=>{
    const resolvers:Array<(value:Response)=>void>=[];
    transport.mockImplementation(()=>new Promise<Response>(resolve=>resolvers.push(resolve)));
    const {radarImage}=await import('../src/radar/budget');
    const a=radarImage(url(0),new AbortController().signal),b=radarImage(url(0),new AbortController().signal);
    expect(transport).toHaveBeenCalledTimes(2);
    resolvers.forEach(resolve=>resolve(new Response(new Uint8Array([1]))));await Promise.all([a,b]);
  });
  it('keeps only ninety successful URL entries',async()=>{
    const {radarImage}=await import('../src/radar/budget');
    await Promise.all(Array.from({length:80},(_,i)=>radarImage(url(i),new AbortController().signal)));
    await vi.advanceTimersByTimeAsync(60051);
    await Promise.all(Array.from({length:11},(_,i)=>radarImage(url(i+80),new AbortController().signal)));
    await radarImage(url(0),new AbortController().signal);
    expect(transport).toHaveBeenCalledTimes(92);
  });
  it('rejects untrusted transport without making requests',async()=>{
    const {radarImage}=await import('../src/radar/budget');
    await expect(radarImage('https://example.com/tile.png',new AbortController().signal)).rejects.toThrow('Untrusted');
    await expect(radarImage('http://tilecache.rainviewer.com/tile.png',new AbortController().signal)).rejects.toThrow('Untrusted');
    expect(transport).not.toHaveBeenCalled();
  });
});
