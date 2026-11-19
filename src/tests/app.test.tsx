import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "../app/App";
import { I18nProvider } from "../i18n/i18n";
import { getWeather, normalizeWeather } from "../providers/weather";
import { normalizeAir } from "../providers/airQuality";
import { normalizeRadar } from "../providers/radar";
import { defaultLocation } from "../locations/provinces";
import w from "../../evidence/weather-bangkok.json";
import a from "../../evidence/air-bangkok.json";
import r from "../../evidence/radar.json";
// Map rendering is browser QA. These component tests exercise orchestration with labeled test fixtures.
vi.mock("../maps/MapCanvas", async () => {
  const React = await import('react');
  const { radarRequestKey } = await import('../radar/presentation');
  return { default: (p: import('../maps/MapCanvas').MapProps) => {
    React.useEffect(() => { p.onRadarPresentation?.({ key: radarRequestKey(p), requestedTime: p.frame?.time ?? null,
      displayedTime: null, status: 'unverified', evidence: 'test-only-transport-qualified;pixels-unverified' });
    }, [p.frame, p.theme, p.location, p.layers.radar]);
    // Test-only stand-in for a map tap near Chonburi city.
    return React.createElement("button", { onClick: () => p.onSelect(13.37, 100.99) }, "test-map-tap");
  } };
});
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
      <I18nProvider><App /></I18nProvider>
    </QueryClientProvider>,
  );
describe("App V1 map-first", () => {
  it("radar play/pause keeps playing across sheet open and close", async () => {
    mount();
    await screen.findByTestId("temperature");
    await waitFor(() => expect(screen.getByRole("button", { name: "เล่นเรดาร์ย้อนหลัง" })).toBeEnabled());
    vi.useFakeTimers();
    try {
      const time = screen.getByTestId("radar-time").getAttribute("datetime");
      fireEvent.click(screen.getByRole("button", { name: "เล่นเรดาร์ย้อนหลัง" }));
      expect(screen.getByRole("button", { name: "หยุดเรดาร์" })).toHaveAttribute("aria-pressed", "true");
      fireEvent.click(screen.getByRole("button", { name: "เปิดรายละเอียด" }));
      fireEvent.click(screen.getByRole("button", { name: "ปิดรายละเอียด" }));
      await act(async () => { vi.advanceTimersByTime(1500); });
      expect(screen.getByTestId("radar-time").getAttribute("datetime")).not.toBe(time);
      fireEvent.click(screen.getByRole("button", { name: "หยุดเรดาร์" }));
      expect(screen.getByRole("button", { name: "เล่นเรดาร์ย้อนหลัง" })).toHaveAttribute("aria-pressed", "false");
    } finally { vi.useRealTimers(); }
  });
  it("sheet is closed by default, opens and closes by tap and keyboard", async () => {
    mount();
    await screen.findByTestId("temperature");
    const sheet = screen.getByLabelText("รายละเอียดอากาศ");
    expect(sheet).toHaveAttribute("data-open", "false");
    fireEvent.click(screen.getByRole("button", { name: "เปิดรายละเอียด" }));
    expect(sheet).toHaveAttribute("data-open", "true");
    expect(screen.getByText("12 ชั่วโมงถัดไป")).toBeVisible();
    fireEvent.keyDown(screen.getByRole("button", { name: "ปิดรายละเอียด" }), { key: "ArrowDown" });
    expect(sheet).toHaveAttribute("data-open", "false");
    fireEvent.keyDown(screen.getByRole("button", { name: "เปิดรายละเอียด" }), { key: "ArrowUp" });
    expect(sheet).toHaveAttribute("data-open", "true");
    fireEvent.keyDown(screen.getByRole("button", { name: "ปิดรายละเอียด" }), { key: "Escape" });
    expect(sheet).toHaveAttribute("data-open", "false");
  });
  it("layer switch swaps radar timeline for temperature and air companions", async () => {
    mount();
    await screen.findByTestId("temperature");
    expect(screen.getByLabelText("ควบคุมเรดาร์ย้อนหลัง")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "อุณหภูมิ" }));
    expect(screen.getByRole("radio", { name: "อุณหภูมิ" })).toHaveAttribute("aria-checked", "true");
    expect(screen.queryByLabelText("ควบคุมเรดาร์ย้อนหลัง")).not.toBeInTheDocument();
    expect(screen.getByLabelText("อุณหภูมิที่จุดเลือก · 12 ชม.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "ฝุ่น" }));
    expect(screen.getByLabelText("US AQI ที่จุดเลือก · แบบจำลอง CAMS")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "เรดาร์" }));
    expect(screen.getByLabelText("ควบคุมเรดาร์ย้อนหลัง")).toBeInTheDocument();
  });
  it("weather failure shows the error with a working retry, and the map controls stay usable", async () => {
    vi.mocked(getWeather).mockRejectedValueOnce(new Error("test-only network failure"));
    mount();
    await screen.findByText("โหลดข้อมูลอากาศไม่ได้");
    expect(screen.getByRole("radiogroup", { name: "ชั้นข้อมูลแผนที่" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "เปิดรายละเอียด" }));
    expect(screen.getByText("ยังไม่เชื่อมต่อข้อมูลน้ำท่วมที่ตรวจสอบแล้ว ไม่สามารถสรุปว่าไม่มีน้ำท่วมในพื้นที่")).toBeInTheDocument();
    // No data yet: Retry works immediately (no 30 s cooldown).
    fireEvent.click(screen.getByRole("button", { name: "ลองใหม่" }));
    expect(await screen.findByTestId("temperature")).toHaveTextContent(/\d+°C/);
  });
  it("error-screen Retry has a ~3 s anti-spam guard", async () => {
    const original = vi.mocked(getWeather).getMockImplementation();
    vi.mocked(getWeather).mockRejectedValue(new Error("test-only network failure"));
    try {
      mount();
      await screen.findByText("โหลดข้อมูลอากาศไม่ได้");
      const before = vi.mocked(getWeather).mock.calls.length;
      const now = Date.now();
      const clock = vi.spyOn(Date, "now").mockReturnValue(now);
      fireEvent.click(screen.getByRole("button", { name: "ลองใหม่" }));
      await waitFor(() => expect(vi.mocked(getWeather).mock.calls.length).toBe(before + 1));
      await screen.findByText("โหลดข้อมูลอากาศไม่ได้");
      clock.mockReturnValue(now + 1000);
      fireEvent.click(screen.getByRole("button", { name: "ลองใหม่" }));
      expect(vi.mocked(getWeather).mock.calls.length).toBe(before + 1);
      clock.mockReturnValue(now + 3100);
      fireEvent.click(screen.getByRole("button", { name: "ลองใหม่" }));
      await waitFor(() => expect(vi.mocked(getWeather).mock.calls.length).toBe(before + 2));
    } finally {
      vi.mocked(getWeather).mockImplementation(original!);
    }
  });
  it("search switches to Xi'an with China timezone and China official source", async () => {
    mount();
    await screen.findByTestId("temperature");
    fireEvent.click(screen.getByRole("button", { name: "ค้นหาตำแหน่ง" }));
    fireEvent.click(screen.getByRole("button", { name: /ซีอาน/ }));
    await waitFor(() =>
      expect(vi.mocked(getWeather).mock.calls.some(([l]) => l.country === "CN" && l.timezone === "Asia/Shanghai")).toBe(true),
    );
    fireEvent.click(screen.getByRole("button", { name: "เปิดรายละเอียด" }));
    expect(screen.getByText(/China Meteorological Administration/)).toBeInTheDocument();
    expect(screen.queryByText(/กรมอุตุนิยมวิทยา/)).not.toBeInTheDocument();
  });
  it("offline banner appears and clears without extra weather requests", async () => {
    render(<QueryClientProvider client={new QueryClient()}><App /></QueryClientProvider>);
    await screen.findByTestId("temperature");
    const calls = vi.mocked(getWeather).mock.calls.length;
    fireEvent(window, new Event("offline"));
    expect(screen.getByText(/ไม่มีการเชื่อมต่ออินเทอร์เน็ต/)).toBeInTheDocument();
    fireEvent(window, new Event("online"));
    expect(screen.queryByText(/ไม่มีการเชื่อมต่ออินเทอร์เน็ต/)).not.toBeInTheDocument();
    expect(vi.mocked(getWeather).mock.calls.length).toBe(calls);
  });
  it("geolocation is opt-in and denial preserves a usable default", async () => {
    const previous = Object.getOwnPropertyDescriptor(navigator, "geolocation");
    const locate = vi.fn((_s: PositionCallback, error?: PositionErrorCallback | null) =>
      error?.({ code: 1, message: "test-only denial", PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 }));
    Object.defineProperty(navigator, "geolocation", { configurable: true, value: { getCurrentPosition: locate } });
    try {
      mount();
      await screen.findByTestId("temperature");
      expect(locate).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole("button", { name: "ค้นหาตำแหน่ง" }));
      fireEvent.click(screen.getByRole("button", { name: "ใช้ตำแหน่งของฉัน" }));
      expect(locate).toHaveBeenCalledOnce();
      expect(screen.getByText("ไม่ได้รับอนุญาตให้ใช้ตำแหน่ง เลือกจังหวัดหรือเมืองแทนได้")).toBeInTheDocument();
      expect(screen.getByLabelText("รายละเอียดอากาศ")).toHaveAttribute("data-selected-location", defaultLocation.id);
    } finally {
      if (previous) Object.defineProperty(navigator, "geolocation", previous);
      else Reflect.deleteProperty(navigator, "geolocation");
    }
  });
  it("language switch is structural: Thai default, English labels on demand", async () => {
    mount();
    await screen.findByTestId("temperature");
    fireEvent.click(screen.getByRole("button", { name: "ตั้งค่าและภาษา" }));
    fireEvent.click(screen.getByRole("button", { name: "English" }));
    expect(screen.getByRole("radio", { name: "Radar" })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe("en");
  });
  it("a tapped map point is named after the nearest province", async () => {
    mount();
    await screen.findByTestId("temperature");
    fireEvent.click(screen.getByRole("button", { name: "test-map-tap" }));
    await waitFor(() => expect(screen.getByRole("button", { name: /เปลี่ยนตำแหน่ง/ })).toHaveTextContent("ใกล้ชลบุรี"));
    expect(screen.queryByText("จุดที่เลือกบนแผนที่")).not.toBeInTheDocument();
  });
  it("real fixtures stay in tests and trust classifications remain independent", () => {
    expect(normalizeWeather(w, defaultLocation).currentMeta.dataType).toBe("MODELED");
    expect(normalizeAir(a, defaultLocation).forecastMeta.dataType).toBe("FORECAST");
    expect(normalizeRadar(r, r.generated + 30).meta.dataType).toBe("OBSERVED");
  });
});
