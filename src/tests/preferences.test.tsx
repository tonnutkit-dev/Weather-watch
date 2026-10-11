import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  readAppearance,
  saveAppearance,
  resolveTheme,
  readFavorites,
  saveFavorites,
} from "../shared/preferences";
import { useTheme } from "../shared/theme";
import { defaultLocation } from "../locations/provinces";
describe("Appearance and local privacy", () => {
  it("defaults to system, accepts only allowed stored values", () => {
    expect(readAppearance()).toBe("system");
    localStorage.setItem("ww-appearance", "hacked");
    expect(readAppearance()).toBe("system");
    saveAppearance("dark");
    expect(readAppearance()).toBe("dark");
  });
  it("system resolves either OS state without a clock algorithm", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
    expect(resolveTheme("light", true)).toBe("light");
  });
  it("persists manual preference and sets actual HTML theme", () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setAppearance("dark"));
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem("ww-appearance")).toBe("dark");
    act(() => result.current.setAppearance("light"));
    expect(document.documentElement.dataset.theme).toBe("light");
  });
  it("follows OS change while preserving unrelated location preference", () => {
    let change: () => void = () => {};
    const media = {
      matches: false,
      media: "",
      addEventListener: vi.fn((_: string, cb: () => void) => (change = cb)),
      removeEventListener: vi.fn(),
    };
    vi.mocked(window.matchMedia).mockReturnValue(
      media as unknown as MediaQueryList,
    );
    localStorage.setItem("ww-last-preset", "cn-xian");
    const { result } = renderHook(() => useTheme());
    act(() => {
      media.matches = true;
      change();
    });
    expect(result.current.theme).toBe("dark");
    expect(localStorage.getItem("ww-last-preset")).toBe("cn-xian");
  });
  it("favorites require explicit storage and invalid payload rejected", () => {
    expect(readFavorites()).toEqual([]);
    localStorage.setItem("ww-favorites", "broken");
    expect(readFavorites()).toEqual([]);
    saveFavorites([defaultLocation]);
    expect(readFavorites()).toEqual([defaultLocation]);
    localStorage.setItem("ww-favorites", '[{"latitude":1000}]');
    expect(readFavorites()).toEqual([]);
  });
});
