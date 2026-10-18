import { afterEach, expect, it, vi } from 'vitest';
import { BoundedRadarLayer } from '../maps/BoundedRadarLayer';
import { radarImage } from '../radar/budget';
vi.mock('../radar/budget',()=>({radarImage:vi.fn()}));
afterEach(()=>{vi.unstubAllGlobals();vi.mocked(radarImage).mockReset();});
const coords={x:25,y:15,z:5} as import('leaflet').Coords;
function layer(){return new BoundedRadarLayer('https://tilecache.rainviewer.com/v2/radar/100/512/{z}/{x}/{y}/2/1_0.png',{});}
function blobURLs(){const revoke=vi.fn();vi.stubGlobal('URL',class extends URL{static createObjectURL=vi.fn(()=>'blob:radar-test');static revokeObjectURL=revoke;});return revoke;}
it('tileabort cancels transport even without tileunload, and late completion creates no blob',async()=>{
  let resolve!:(data:ArrayBuffer)=>void;
  vi.mocked(radarImage).mockImplementation(()=>new Promise(r=>{resolve=r;}));
  const revoke=blobURLs(), l=layer(), done=vi.fn(), img=l.createTile(coords,done);
  const signal=vi.mocked(radarImage).mock.calls[0]![1]; l.fire('tileabort',{tile:img,coords}); expect(signal.aborted).toBe(true);
  resolve(new ArrayBuffer(1));await Promise.resolve();expect(URL.createObjectURL).not.toHaveBeenCalled();expect(revoke).not.toHaveBeenCalled();expect(done).not.toHaveBeenCalled();
});
it('unload revokes the owned blob after Leaflet has replaced src; repeated cleanup is idempotent',async()=>{
  vi.mocked(radarImage).mockResolvedValue(new ArrayBuffer(1));const revoke=blobURLs(),l=layer(),done=vi.fn();
  const img=l.createTile(coords,done) as HTMLImageElement; await Promise.resolve();expect(img.src).toBe('blob:radar-test');
  img.onload!(new Event('load'));expect(done).toHaveBeenCalledTimes(1);
  img.src='data:image/png;base64,';l.fire('tileabort',{tile:img,coords});l.fire('tileunload',{tile:img,coords});l.fire('remove');
  expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:radar-test');expect(img.onload).toBeNull();expect(img.onerror).toBeNull();
});
it('removing the layer releases every outstanding URL/controller without a completion callback',async()=>{
  vi.mocked(radarImage).mockResolvedValue(new ArrayBuffer(1));const revoke=blobURLs(),l=layer(),done=vi.fn();
  l.createTile(coords,done);l.createTile(coords,done);await Promise.resolve();l.fire('remove');
  expect(revoke).toHaveBeenCalledTimes(2);expect(vi.mocked(radarImage).mock.calls.every(c=>c[1].aborted)).toBe(true);expect(done).not.toHaveBeenCalled();
});
