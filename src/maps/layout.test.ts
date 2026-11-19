import { describe, it, expect, vi } from "vitest";
import { mapInsets, mapBottomInset } from "./layout";
function rect(x: number, y: number, width: number, height: number) {
  return { x, y, width, height, left: x, top: y, right: x + width, bottom: y + height } as DOMRect;
}
function setup(chip: DOMRect, dock: DOMRect, height = 844) {
  const app = document.createElement("div"); app.className = "ww-app";
  const host = document.createElement("div"); app.append(host);
  const top = document.createElement("section"); top.dataset.mapInset = "top"; app.append(top);
  const bottom = document.createElement("div"); bottom.dataset.mapInset = "bottom"; app.append(bottom);
  vi.spyOn(host, "getBoundingClientRect").mockReturnValue(rect(0, 0, 390, height));
  Object.defineProperty(host, "clientHeight", { value: height });
  vi.spyOn(top, "getBoundingClientRect").mockReturnValue(chip);
  vi.spyOn(bottom, "getBoundingClientRect").mockReturnValue(dock);
  return host;
}
describe("camera padding follows floating UI geometry", () => {
  it("pads for the now chip on top and the dock at the bottom", () =>
    expect(mapInsets(setup(rect(12, 57, 366, 112), rect(12, 650, 366, 130)))).toEqual({ top: 177, bottom: 202 }));
  it("ignores hidden or zero-size elements", () =>
    expect(mapBottomInset(setup(rect(12, 57, 366, 112), rect(0, 0, 0, 0)))).toBe(0));
  it("never pads more than the map can show", () => {
    const { top, bottom } = mapInsets(setup(rect(0, 0, 390, 300), rect(0, 100, 390, 300), 400));
    expect(top + bottom).toBeLessThanOrEqual(308);
  });
});
