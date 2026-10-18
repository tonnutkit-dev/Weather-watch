// The sheet owns bottom space; map cameras use its actual rendered height.
// Viewport breakpoint (not narrow desktop map width) selects mobile behavior.
export function mapBottomInset(host: HTMLElement): number {
  if (!window.matchMedia("(max-width: 759px), (orientation: landscape) and (max-height: 520px) and (max-width: 1024px)").matches) return 0;
  const workspace = host.closest(".workspace");
  const sheet = workspace?.querySelector<HTMLElement>(".situation-panel");
  const radar = workspace?.querySelector<HTMLElement>(".radar-controls");
  const map = host.getBoundingClientRect();
  // Measure the actual obstruction. A landscape side rail does not cover the
  // map; variable-height radar status text must still leave the selected point
  // above the dock. Only camera padding changes, never the map instance.
  let inset = 0;
  for (const element of [sheet, radar]) {
    if (!element) continue;
    const r = element.getBoundingClientRect();
    if (r.height && r.width && r.right > map.left && r.left < map.right && r.top < map.bottom && r.bottom > map.top) {
      inset = Math.max(inset, map.bottom - r.top + 8);
    }
  }
  return Math.max(0, Math.min(host.clientHeight - 92, inset));
}
export function observeMapLayout(
  host: HTMLElement,
  update: () => void,
): () => void {
  const observer = new ResizeObserver(update);
  observer.observe(host);
  for (const element of host
    .closest(".workspace")
    ?.querySelectorAll(".situation-panel, .radar-controls") ?? [])
    observer.observe(element);
  update();
  return () => observer.disconnect();
}
