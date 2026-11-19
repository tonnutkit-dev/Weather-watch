import type { Map, ExpressionSpecification } from "maplibre-gl";
/** Presentation only. Called once per existing style.load; never touches WW raster sources. */
export function applyEditorialStyle(map: Pick<Map, "getStyle" | "setPaintProperty" | "setLayoutProperty">, theme: string) {
 const dark=theme==='dark';
 const land=dark?'#0f1829':'#f4f6f9',water=dark?'#070d19':'#d9e4ef';
 for(const layer of map.getStyle().layers) {
  if(layer.id.startsWith('ww-'))continue;
  if(layer.id==='background'&&layer.type==='background')map.setPaintProperty(layer.id,'background-color',land);
  if(layer.type==='fill'&&layer.id==='water')map.setPaintProperty(layer.id,'fill-color',water);
  if(layer.type==='fill'&&['landuse_residential','landcover_wood','park','landuse_park'].includes(layer.id))map.setPaintProperty(layer.id,'fill-color',dark?'#111d31':'#edf1f5');
  if(layer.type==='line'&&layer.id==='waterway')map.setPaintProperty(layer.id,'line-color',water);
  if(['building','highway-name-path','highway-name-minor','highway_name_other','place_suburb','label_other','place_other'].includes(layer.id))map.setLayoutProperty(layer.id,'visibility','none');
  if(layer.type==='symbol'&&('source-layer' in layer)&&['place','water_name'].includes(layer['source-layer']||'')) {
   map.setPaintProperty(layer.id,'text-color',dark?'#7d8db0':'#6d7b92');
   map.setPaintProperty(layer.id,'text-halo-color',land);
  }
 }
}
/** Label sources whose text-field is a place/feature name (never road refs/shields). */
const NAMED_LAYERS = ["place", "water_name", "waterway", "transportation_name", "poi", "park", "mountain_peak", "aerodrome_label", "boundary"];
/**
 * One label language that follows the UI language: no bilingual stacks, no uppercase.
 * Features without a name in that language fall back to English, then to the local name.
 */
export function labelExpression(lang: string): ExpressionSpecification {
  const chain = lang === "th" ? ["name:th", "name:en", "name"] : lang === "zh" ? ["name:zh-Hans", "name:zh", "name:en", "name"] : ["name:en", "name:latin", "name"];
  return ["coalesce", ...chain.map((k) => ["get", k] as ExpressionSpecification)] as ExpressionSpecification;
}
export function applyMapLanguage(map: Pick<Map, "getStyle" | "setLayoutProperty">, lang: string) {
  for (const layer of map.getStyle().layers) {
    if (layer.id.startsWith("ww-") || layer.type !== "symbol" || !("source-layer" in layer)) continue;
    if (!NAMED_LAYERS.includes(layer["source-layer"] || "")) continue;
    const field = JSON.stringify(layer.layout?.["text-field"] ?? "");
    if (!field || field === '""' || /\bref\b|"ref"/.test(field)) continue;
    map.setLayoutProperty(layer.id, "text-field", labelExpression(lang));
    map.setLayoutProperty(layer.id, "text-transform", "none");
  }
}
