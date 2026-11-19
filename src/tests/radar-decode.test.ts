import { afterEach, expect, it, vi } from 'vitest';
import { decodeRadarImage } from '../radar/decode';
afterEach(()=>vi.unstubAllGlobals());
it('closes decoded bitmaps and rejects corrupt bytes instead of qualifying transport', async()=>{
  const close=vi.fn(), decode=vi.fn(async()=>({close})); vi.stubGlobal('createImageBitmap',decode);
  await decodeRadarImage(new ArrayBuffer(1),new AbortController().signal); expect(close).toHaveBeenCalledTimes(1);
  decode.mockRejectedValueOnce(new Error('corrupt PNG'));
  await expect(decodeRadarImage(new ArrayBuffer(1),new AbortController().signal)).rejects.toThrow('corrupt PNG');
});
it('closes a bitmap returned after cancellation and rejects the obsolete result',async()=>{
  const close=vi.fn(), controller=new AbortController();
  vi.stubGlobal('createImageBitmap',vi.fn(async()=>{controller.abort();return{close};}));
  await expect(decodeRadarImage(new ArrayBuffer(1),controller.signal)).rejects.toMatchObject({name:'AbortError'});
  expect(close).toHaveBeenCalledTimes(1);
});
it('fallback decoder revokes its URL on failure and on cancellation without waiting for load',async()=>{
  vi.stubGlobal('createImageBitmap',undefined); const images:any[]=[];
  vi.stubGlobal('Image',class {onload:any;onerror:any;src='';constructor(){images.push(this);}});
  const create=vi.fn(()=>'blob:decode'),revoke=vi.fn();
  vi.stubGlobal('URL',class extends URL {static createObjectURL=create;static revokeObjectURL=revoke;});
  const failed=decodeRadarImage(new ArrayBuffer(1),new AbortController().signal);
  const rejected=expect(failed).rejects.toThrow('decoding failed'); images[0].onerror();await rejected;
  const controller=new AbortController(), pending=decodeRadarImage(new ArrayBuffer(1),controller.signal);
  const cancelled=expect(pending).rejects.toMatchObject({name:'AbortError'});controller.abort();await cancelled;
  expect(revoke).toHaveBeenCalledTimes(2);expect(images[1].onload).toBeNull();expect(images[1].onerror).toBeNull();
});
