// The sheet owns bottom space; map cameras use its actual rendered height.
// Viewport breakpoint (not narrow desktop map width) selects mobile behavior.
export function mapBottomInset(host: HTMLElement): number {
  if (!window.matchMedia("(max-width: 759px)").matches) return 0;
  const workspace = host.closest(".workspace");
  const sheet = workspace?.querySelector<HTMLElement>(".situation-panel");
  const radar = workspace?.querySelector<HTMLElement>(".radar-controls");
  const sheetHeight = sheet?.getBoundingClientRect().height ?? 0;
  const radarHeight = radar?.getBoundingClientRect().height ?? 0;
  return Math.max(
    0,
    Math.min(
      host.clientHeight - 92,
      sheetHeight + (radarHeight ? radarHeight + 48 : 36),
    ),
  );
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
