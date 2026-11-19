// Floating UI (now chip, bottom dock) marks itself with data-map-inset="top|bottom".
// Cameras pad by the measured overlap so the selected point stays in the visible map area.
// Only camera padding changes, never the map instance.
function scope(host: HTMLElement): ParentNode {
  return host.closest(".ww-app") ?? document;
}
export function mapInsets(host: HTMLElement): { top: number; bottom: number } {
  const map = host.getBoundingClientRect();
  let top = 0, bottom = 0;
  for (const element of scope(host).querySelectorAll<HTMLElement>("[data-map-inset]")) {
    const r = element.getBoundingClientRect();
    if (!r.width || !r.height || r.right <= map.left || r.left >= map.right || r.top >= map.bottom || r.bottom <= map.top) continue;
    if (element.dataset.mapInset === "top") top = Math.max(top, r.bottom - map.top + 8);
    else bottom = Math.max(bottom, map.bottom - r.top + 8);
  }
  const room = Math.max(0, host.clientHeight - 92);
  if (top + bottom > room) {
    const scale = room / (top + bottom);
    top = Math.floor(top * scale); bottom = Math.floor(bottom * scale);
  }
  return { top: Math.round(top), bottom: Math.round(bottom) };
}
export function mapBottomInset(host: HTMLElement): number {
  return mapInsets(host).bottom;
}
export function observeMapLayout(host: HTMLElement, update: () => void): () => void {
  const observer = new ResizeObserver(update);
  observer.observe(host);
  for (const element of scope(host).querySelectorAll("[data-map-inset]")) observer.observe(element);
  update();
  return () => observer.disconnect();
}
