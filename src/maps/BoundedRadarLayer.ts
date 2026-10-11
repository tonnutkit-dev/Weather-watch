import L from 'leaflet';
import { radarTransport } from '../radar/presentation';
import { radarImage } from '../radar/budget';
/** Own URLs independently of img.src: Leaflet replaces src before tileabort/tileunload. */
export class BoundedRadarLayer extends L.TileLayer {
  private resources = new Map<HTMLElement, { controller: AbortController; url?: string; release: () => void }>();
  constructor(url: string, options: L.TileLayerOptions) {
    super(url, options);
    const releaseTile = (event: L.LeafletEvent) => this.resources.get((event as L.TileEvent).tile)?.release();
    this.on('tileabort', releaseTile); this.on('tileunload', releaseTile);
    this.on('remove', () => { for(const resource of [...this.resources.values()]) resource.release(); });
  }
  override createTile(coords: L.Coords, done: L.DoneCallback): HTMLElement {
    const img = document.createElement('img'); img.alt=''; img.setAttribute('role','presentation');
    const controller = new AbortController(), request = radarTransport(this.getTileUrl(coords));
    const resource = { controller, url: undefined as string | undefined, release: () => {
      if(!this.resources.delete(img)) return;
      img.onload=null; img.onerror=null; controller.abort();
      if(resource.url) { URL.revokeObjectURL(resource.url); resource.url=undefined; }
    } };
    this.resources.set(img, resource);
    controller.signal.addEventListener('abort', () => request.finish('aborted'), { once:true });
    radarImage(request.url, controller.signal).then(data => {
      if(controller.signal.aborted) return;
      resource.url=URL.createObjectURL(new Blob([data],{type:'image/png'}));
      img.onload=()=> { if(controller.signal.aborted) return; request.finish('success'); done(undefined,img); };
      img.onerror=()=> { if(controller.signal.aborted) return; request.finish('failed'); resource.release(); done(new Error('Radar image decoding failed'),img); };
      img.src=resource.url;
    }).catch(error => {
      request.finish(controller.signal.aborted?'aborted':'failed');
      if(!controller.signal.aborted) { resource.release(); done(error instanceof Error?error:new Error('Radar tile unavailable'),img); }
    });
    return img;
  }
}
