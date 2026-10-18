import {describe,it,expect,vi} from 'vitest';
import {applyEditorialStyle} from '../maps/editorialStyle';
import type {Map} from 'maplibre-gl';
describe('editorial basemap boundary',()=>{
 for(const theme of ['light','dark'])it(`keeps radar and unknown provider layers untouched in ${theme}`,()=>{
  const layers=[{id:'ww-radar',type:'raster'},{id:'ww-coverage',type:'fill'},{id:'background',type:'background'},{id:'water',type:'fill'},{id:'label_city',type:'symbol','source-layer':'place'},{id:'future-provider-layer',type:'line'}];
  const paint=vi.fn(),layout=vi.fn();
  applyEditorialStyle({getStyle:()=>({layers}),setPaintProperty:paint,setLayoutProperty:layout} as unknown as Map,theme);
  expect(paint.mock.calls.some(x=>x[0]==='water')).toBe(true);
  expect([...paint.mock.calls,...layout.mock.calls].some(x=>x[0].startsWith('ww-')||x[0]==='future-provider-layer')).toBe(false);
  expect(paint.mock.calls.find(x=>x[0]==='label_city'&&x[1]==='text-color')).toBeDefined();
 });
 it('accepts a minimal diagnostic basemap without assuming named layers exist',()=>{
  const paint=vi.fn();applyEditorialStyle({getStyle:()=>({layers:[{id:'LAB-only',type:'background'}]}),setPaintProperty:paint,setLayoutProperty:vi.fn()} as unknown as Map,'light');expect(paint).not.toHaveBeenCalled();
 });
});
