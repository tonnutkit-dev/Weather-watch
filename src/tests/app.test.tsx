import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "../app/App";
import { getWeather, normalizeWeather } from "../providers/weather";
import { normalizeAir } from "../providers/airQuality";
import { normalizeRadar } from "../providers/radar";
import { defaultLocation } from "../locations/provinces";
import w from "../../evidence/weather-bangkok.json";
import a from "../../evidence/air-bangkok.json";
import r from "../../evidence/radar.json";
// Map rendering is browser QA. These component tests exercise orchestration with labeled test fixtures.
vi.mock("../maps/MapCanvas", () => ({ default: () => null }));
vi.mock("../providers/weather", async (original) => {
  const actual = await original<typeof import("../providers/weather")>();
  return {
    ...actual,
    getWeather: vi.fn(async (l) => actual.normalizeWeather(w, l)),
  };
});
vi.mock("../providers/airQuality", async (original) => {
  const actual = await original<typeof import("../providers/airQuality")>();
  return {
    ...actual,
    getAirQuality: vi.fn(async (l) => actual.normalizeAir(a, l)),
  };
});
vi.mock("../providers/radar", async (original) => {
  const actual = await original<typeof import("../providers/radar")>();
  return {
    ...actual,
    getRadar: vi.fn(async () =>
      actual.normalizeRadar(r, Math.max(Date.now() / 1000, r.generated)),
    ),
  };
});
const mount = () =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <App />
    </QueryClientProvider>,
  );
describe("App regressions", () => {
  it("location switching changes provider coordinates and timezone, without Thai alert logic in China", async () => {
    mount();
    await screen.findByTestId("temperature");
    fireEvent.click(screen.getByRole("button", { name: "🇨🇳 ซีอาน" }));
    await screen.findByRole("heading", { name: "ซีอาน" });
    await waitFor(() =>
      expect(
        vi
          .mocked(getWeather)
          .mock.calls.some(
            ([l]) => l.country === "CN" && l.timezone === "Asia/Shanghai",
          ),
      ).toBe(true),
    );
    fireEvent.click(screen.getAllByRole("button", { name: "สิ่งแวดล้อม" })[0]!);
    expect(
      screen.getByText("China Meteorological Administration"),
    ).toBeInTheDocument();
    expect(screen.queryByText("กรมอุตุนิยมวิทยา")).not.toBeInTheDocument();
  });
  it("weather failure renders error without crashing radar/environment controls", async () => {
    vi.mocked(getWeather).mockRejectedValueOnce(
      new Error("test-only network failure"),
    );
    mount();
    await screen.findByText("โหลดข้อมูลอากาศไม่ได้");
    expect(
      screen.getByRole("button", { name: "ชั้นข้อมูลเพิ่มเติม" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "ยังไม่เชื่อมต่อข้อมูลน้ำท่วมที่ตรวจสอบแล้ว ไม่สามารถสรุปว่าไม่มีน้ำท่วมในพื้นที่",
      ),
    ).toBeInTheDocument();
  });
  it("offline event shows explicit connectivity state", async () => {
    mount();
    await screen.findByTestId("temperature");
    fireEvent(window, new Event("offline"));
    expect(
      screen.getByText(/ไม่มีการเชื่อมต่ออินเทอร์เน็ต/),
    ).toBeInTheDocument();
    fireEvent(window, new Event("online"));
    expect(
      screen.queryByText(/ไม่มีการเชื่อมต่ออินเทอร์เน็ต/),
    ).not.toBeInTheDocument();
  });
  it("sheet has three states and keyboard alternatives", async () => {
    mount();
    await screen.findByTestId("temperature");
    const sheet = screen.getByLabelText("สถานการณ์อากาศ");
    fireEvent.click(screen.getByRole("button", { name: "ขยายแผง" }));
    expect(sheet).toHaveClass("sheet-half");
    fireEvent.click(screen.getByRole("button", { name: "ขยายแผง" }));
    expect(sheet).toHaveClass("sheet-expanded");
    fireEvent.keyDown(
      screen.getByRole("button", { name: "ปรับความสูงแผงสถานการณ์" }),
      { key: "ArrowDown" },
    );
    expect(sheet).toHaveClass("sheet-half");
    fireEvent.click(screen.getByRole("button", { name: "ยุบแผง" }));
    expect(sheet).toHaveClass("sheet-collapsed");
  });
  it("geolocation is opt-in and denial preserves a usable default", async () => {
    const previous = Object.getOwnPropertyDescriptor(navigator, "geolocation");
    const locate = vi.fn(
      (_success: PositionCallback, error?: PositionErrorCallback | null) =>
        error?.({
          code: 1,
          message: "test-only denial",
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        }),
    );
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition: locate },
    });
    try {
      mount();
      await screen.findByTestId("temperature");
      expect(locate).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole("button", { name: "ค้นหาตำแหน่ง" }));
      fireEvent.click(screen.getByRole("button", { name: "ใช้ตำแหน่งของฉัน" }));
      expect(locate).toHaveBeenCalledOnce();
      expect(
        screen.getByText(
          "ไม่ได้รับอนุญาตให้ใช้ตำแหน่ง เลือกจังหวัดหรือเมืองแทนได้",
        ),
      ).toBeInTheDocument();
      expect(screen.getByLabelText("สถานการณ์อากาศ")).toHaveAttribute(
        "data-selected-location",
        defaultLocation.id,
      );
    } finally {
      if (previous) Object.defineProperty(navigator, "geolocation", previous);
      else Reflect.deleteProperty(navigator, "geolocation");
    }
  });
  it("real fixtures stay in tests and trust classifications remain independent", () => {
    expect(normalizeWeather(w, defaultLocation).currentMeta.dataType).toBe(
      "MODELED",
    );
    expect(normalizeAir(a, defaultLocation).forecastMeta.dataType).toBe(
      "FORECAST",
    );
    expect(normalizeRadar(r, r.generated + 30).meta.dataType).toBe("OBSERVED");
  });
});
