import type { Map } from "maplibre-gl";
/** Presentation only. Called once per existing style.load; never touches WW raster sources. */
export function applyEditorialStyle(map: Pick<Map, "getStyle" | "setPaintProperty" | "setLayoutProperty">, theme: string) {
 const dark=theme==='dark';
 const land=dark?'#25343a':'#ecede7',water=dark?'#152732':'#d3e1e8';
 for(const layer of map.getStyle().layers) {
  if(layer.id.startsWith('ww-'))continue;
  if(layer.id==='background'&&layer.type==='background')map.setPaintProperty(layer.id,'background-color',land);
  if(layer.type==='fill'&&layer.id==='water')map.setPaintProperty(layer.id,'fill-color',water);
  if(layer.type==='fill'&&['landuse_residential','landcover_wood','park','landuse_park'].includes(layer.id))map.setPaintProperty(layer.id,'fill-color',dark?'#293b3d':'#e5e9df');
  if(layer.type==='line'&&layer.id==='waterway')map.setPaintProperty(layer.id,'line-color',water);
  if(['building','highway-name-path','highway-name-minor','highway_name_other','place_suburb','label_other','place_other'].includes(layer.id))map.setLayoutProperty(layer.id,'visibility','none');
  if(layer.type==='symbol'&&('source-layer' in layer)&&['place','water_name'].includes(layer['source-layer']||'')) {
   map.setPaintProperty(layer.id,'text-color',dark?'#afc3c5':'#637c83');
   map.setPaintProperty(layer.id,'text-halo-color',land);
  }
 }
}
