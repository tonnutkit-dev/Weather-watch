import { useEffect, useRef, useState } from 'react';
import * as ml from 'maplibre-gl';
import type { Map, StyleSpecification } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { DemoLocation, Direction, Theme } from './design';
ml.setWorkerUrl(workerUrl);
const colors = {
    a: { light: ['#e7edf0', '#f1f2ee', '#dce5dc', '#b3c7d1', '#6b777c'], dark: ['#1c2a32', '#25353d', '#2a3e3d', '#334d5a', '#a7bac1'] },
    b: { light: ['#bdd8e3', '#dde8e5', '#c5dcd2', '#8baabb', '#466b7a'], dark: ['#112a3d', '#19384b', '#1f444e', '#315c70', '#9ebacb'] },
    c: { light: ['#d3e1e8', '#ecede7', '#dae3d8', '#aac0cc', '#63767e'], dark: ['#152732', '#25343a', '#2a413f', '#3d5964', '#a9bcbf'] },
} as const;
export default function MapScene({ direction, theme, location, rain, frame, recenter }: {
    direction: Direction;
    theme: Theme;
    location: DemoLocation;
    rain: boolean;
    frame: number;
    recenter: number;
}) {
    const ref = useRef<HTMLDivElement>(null), map = useRef<Map | null>(null);
    const [status, setStatus] = useState('loading');
    const [zoom, setZoom] = useState('');
    const current = useRef({ location, rain, frame });
    current.current = { location, rain, frame };
    useEffect(() => {
        if (!ref.current)
            return;
        const controller = new AbortController();
        let disposed = false;
        let observer: ResizeObserver | undefined;
        const initialize = async () => {
            try {
                setStatus('loading');
                const response = await fetch('https://tiles.openfreemap.org/styles/positron', { signal: controller.signal });
                if (!response.ok)
                    throw new Error('Map style unavailable');
                const style = await response.json() as StyleSpecification;
                const [water, land, park, road, text] = colors[direction][theme];
                // Adapt the licensed real vector style in this isolated prototype only.
                for (const layer of style.layers) {
                    const key = layer.id.toLowerCase();
                    if (layer.type === 'background')
                        layer.paint = { 'background-color': land };
                    if (layer.type === 'fill') {
                        if (key.includes('water'))
                            layer.paint = { 'fill-color': water };
                        else if (/park|landcover|landuse/.test(key))
                            layer.paint = { 'fill-color': park, 'fill-opacity': .42 };
                        else if (key.includes('building'))
                            layer.layout = { ...layer.layout, visibility: 'none' };
                    }
                    if (layer.type === 'line') {
                        if (/road|highway|railway|bridge|tunnel/.test(key))
                            layer.paint = { ...layer.paint, 'line-color': road, 'line-opacity': .3 };
                        if (/boundary/.test(key))
                            layer.paint = { ...layer.paint, 'line-color': text, 'line-opacity': .25 };
                    }
                    if (layer.type === 'symbol') {
                        if (/country|poi|road|highway|housenumber|waterway|airport|suburb|neighbourhood/.test(key))
                            layer.layout = { ...layer.layout, visibility: 'none' };
                        else
                            layer.paint = { ...layer.paint, 'text-color': text, 'text-halo-color': land, 'text-halo-width': 1 };
                    }
                }
                if (disposed || !ref.current)
                    return;
                const selected = current.current.location;
                const m = new ml.Map({ container: ref.current, style, center: [selected.lon, selected.lat - .12], zoom: 6.8, maxZoom: 15, minZoom: 3, attributionControl: false, renderWorldCopies: false });
                map.current = m;
                m.addControl(new ml.AttributionControl({ compact: false }), 'bottom-left');
                m.addControl(new ml.ScaleControl({ maxWidth: 65, unit: 'metric' }), 'bottom-right');
                m.on('load', () => {
                    if (disposed)
                        return;
                    const area=(lon:number,lat:number,width:number,height:number,intensity:number) => {
                        const ring=Array.from({length:49},(_,i)=>{const t=i/48*Math.PI*2;const w=1+.08*Math.sin(3*t)+.04*Math.cos(5*t);return [lon+Math.cos(t)*width*w,lat+Math.sin(t)*height*w];});
                        return {type:'Feature' as const,properties:{intensity},geometry:{type:'Polygon' as const,coordinates:[ring]}};
                    };
                    m.addSource('illustration',{type:'geojson',data:{type:'FeatureCollection',features:[
                        area(99.95,14.43,.7,.37,1),area(100.06,14.39,.44,.23,2),area(101.4,13.05,.46,.27,1)
                    ]}});
                    const before = m.getStyle().layers.find(l => l.type === 'symbol')?.id;
                    m.addLayer({ id: 'illustrative-rain', type: 'fill', source: 'illustration', paint: { 'fill-color': ['match', ['get', 'intensity'], 2, theme === 'dark' ? '#87aaca' : '#7ea6be', theme === 'dark' ? '#4e84a7' : '#a9c5d8'], 'fill-opacity': .6 }, layout: { visibility: current.current.rain ? 'visible' : 'none' } }, before);
                    m.addLayer({ id: 'illustrative-rain-edge', type: 'line', source: 'illustration', paint: { 'line-color': theme === 'dark' ? '#97b8d0' : '#7097b1', 'line-width': 1, 'line-opacity': .48 }, layout: { visibility: current.current.rain ? 'visible' : 'none' } }, before);
                    const dot = document.createElement('div');
                    dot.className = 'map-marker';
                    dot.setAttribute('aria-hidden', 'true');
                    const pin = document.createElement('span');
                    pin.className = 'map-point';
                    dot.append(pin);
                    const label = document.createElement('span');
                    label.className = 'map-location-label';
                    label.textContent = selected.name;
                    dot.append(label);
                    new ml.Marker({ element: dot }).setLngLat([selected.lon, selected.lat]).addTo(m);
                    setStatus('ready');
                    setZoom(m.getZoom().toFixed(2));
                });
                m.on('moveend', () => setZoom(m.getZoom().toFixed(2)));
                m.on('error', () => { if (!m.isStyleLoaded())
                    setStatus('error'); });
                observer = new ResizeObserver(() => m.resize());
                observer.observe(ref.current);
            }
            catch {
                if (!disposed)
                    setStatus('error');
            }
        };
        void initialize();
        return () => { disposed = true; controller.abort(); observer?.disconnect(); map.current?.remove(); map.current = null; };
    }, [direction, theme, location]);
    useEffect(() => {
        const m = map.current;
        if (!m?.getLayer('illustrative-rain'))
            return;
        for (const id of ['illustrative-rain', 'illustrative-rain-edge'])
            m.setLayoutProperty(id, 'visibility', rain ? 'visible' : 'none');
        m.setPaintProperty('illustrative-rain', 'fill-opacity', .36 + frame * .13);
    }, [rain, frame]);
    useEffect(() => { map.current?.easeTo({ center: [location.lon, location.lat - .12], zoom: 6.8, duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 350 }); }, [recenter, location]);
    return <div className="map-scene" data-map-status={status} data-map-zoom={zoom} data-rain-visible={rain}>
    <div className="map-canvas" ref={ref} aria-label="แผนที่จริง ปัดเพื่อเลื่อน จีบนิ้วเพื่อซูม หรือใช้ปุ่มลูกศรและบวกลบบนแป้นพิมพ์"/>
    {status === 'loading' && <div className="map-state" role="status">กำลังเปิดแผนที่…</div>}
    {status === 'error' && <div className="map-state" role="status">โหลดแผนที่ไม่ได้ · ตรวจการเชื่อมต่อแล้วรีเฟรช</div>}
  </div>;
}
