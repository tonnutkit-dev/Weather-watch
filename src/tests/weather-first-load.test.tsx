import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { notifyManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ProviderError } from "../providers/http";
import {
  defaultProviderRetry,
  providerRetryDelay,
  weatherLoadRetry,
} from "../reliability/weatherRetry";
import App from "../app/App";
import weatherBody from "../../evidence/weather-bangkok.json";
import airBody from "../../evidence/air-bangkok.json";
import radarBody from "../../evidence/radar.json";

vi.mock("../maps/MapCanvas", () => ({ default: () => null }));

const weatherUrl = (url: unknown) => String(url).includes("api.open-meteo.com/v1/forecast");
const json = (body: unknown) => ({ ok: true, status: 200, json: async () => body }) as Response;

function client() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: defaultProviderRetry, retryDelay: providerRetryDelay },
    },
  });
}

function mount(queryClient = client()) {
  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  );
}

describe("weather load retry policy", () => {
  it("allows two transient retries only for an online uncached load", () => {
    const timeout = new ProviderError("แหล่งข้อมูลตอบช้าเกินไป กรุณาลองใหม่", 0);
    const clientError = new ProviderError("แหล่งข้อมูลตอบกลับ 404", 404);
    expect(weatherLoadRetry(0, timeout, false, true)).toBe(true);
    expect(weatherLoadRetry(1, timeout, false, true)).toBe(true);
    expect(weatherLoadRetry(2, timeout, false, true)).toBe(false);
    expect(weatherLoadRetry(0, timeout, true, true)).toBe(true);
    expect(weatherLoadRetry(1, timeout, true, true)).toBe(false);
    expect(weatherLoadRetry(0, timeout, false, false)).toBe(true);
    expect(weatherLoadRetry(1, timeout, false, false)).toBe(false);
    expect(weatherLoadRetry(0, clientError, false, true)).toBe(false);
    expect(defaultProviderRetry(0, timeout)).toBe(true);
    expect(defaultProviderRetry(1, timeout)).toBe(false);
  });
});

describe("initial weather load", () => {
  afterEach(() => {
    notifyManager.setScheduler((callback) => {
      setTimeout(callback, 0);
    });
    vi.useRealTimers();
    vi.unstubAllGlobals();
    Reflect.deleteProperty(navigator, "onLine");
  });

  function useImmediateQueryNotifications() {
    notifyManager.setScheduler((callback) => {
      callback();
    });
  }

  function stubFetch(weather: (call: number, init?: RequestInit) => Promise<Response>) {
    let calls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn((url: unknown, init?: RequestInit) => {
        const href = String(url);
        if (weatherUrl(href)) {
          calls += 1;
          return weather(calls, init);
        }
        if (href.includes("air-quality-api.open-meteo.com")) return Promise.resolve(json(airBody));
        if (href.includes("rainviewer.com")) return Promise.resolve(json(radarBody));
        return Promise.resolve(json({}));
      }),
    );
    return () => calls;
  }

  async function advance(ms: number) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ms);
    });
  }

  it("shows temperature after one stalled attempt", async () => {
    vi.useFakeTimers();
    useImmediateQueryNotifications();
    const calls = stubFetch((call) =>
      call === 1 ? new Promise<Response>(() => {}) : Promise.resolve(json(weatherBody)),
    );
    mount();
    await advance(12000);
    expect(calls()).toBe(1);
    expect(screen.queryByTestId("temperature")).not.toBeInTheDocument();
    expect(screen.queryByText("โหลดข้อมูลอากาศไม่ได้")).not.toBeInTheDocument();
    await advance(1000);
    expect(calls()).toBe(2);
    expect(screen.getByTestId("temperature")).toHaveTextContent(/\d+°C/);
  });

  it("shows the error state when every uncached attempt fails", async () => {
    vi.useFakeTimers();
    useImmediateQueryNotifications();
    const calls = stubFetch(() => new Promise<Response>(() => {}));
    mount();
    await advance(38999);
    expect(screen.queryByText("โหลดข้อมูลอากาศไม่ได้")).not.toBeInTheDocument();
    await advance(1);
    expect(calls()).toBe(3);
    expect(screen.getByRole("alert")).toHaveTextContent("โหลดข้อมูลอากาศไม่ได้");
    expect(screen.queryByTestId("temperature")).not.toBeInTheDocument();
    await advance(5000);
    expect(calls()).toBe(3);
  });

  it("keeps a cached refresh on one retry", async () => {
    vi.useFakeTimers();
    useImmediateQueryNotifications();
    const calls = stubFetch((call) =>
      call === 1 ? Promise.resolve(json(weatherBody)) : new Promise<Response>(() => {}),
    );
    const queryClient = client();
    mount(queryClient);
    await advance(1);
    expect(screen.getByTestId("temperature")).toHaveTextContent(/\d+°C/);
    let settled = false;
    const refresh = queryClient
      .refetchQueries({ queryKey: ["weather"] })
      .then(() => {
        settled = true;
      });
    await advance(25000);
    await refresh;
    expect(settled).toBe(true);
    expect(calls()).toBe(3);
    expect(screen.getByTestId("temperature")).toHaveTextContent(/\d+°C/);
    expect(screen.getAllByText(/อัปเดตไม่สำเร็จ/).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "ลองใหม่" }).length).toBeGreaterThan(0);
    await advance(20000);
    expect(calls()).toBe(3);
  });

  it("does not add an offline retry and still shows the offline banner", async () => {
    vi.useFakeTimers();
    useImmediateQueryNotifications();
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    const calls = stubFetch(() => Promise.reject(new TypeError("offline")));
    mount();
    await advance(1000);
    expect(calls()).toBe(2);
    expect(screen.getByRole("alert")).toHaveTextContent("โหลดข้อมูลอากาศไม่ได้");
    expect(screen.getByText(/ไม่มีการเชื่อมต่ออินเทอร์เน็ต/)).toBeVisible();
    await advance(5000);
    expect(calls()).toBe(2);
  });

  it("does not start another attempt after the caller cancels a stalled load", async () => {
    vi.useFakeTimers();
    useImmediateQueryNotifications();
    const calls = stubFetch(() => new Promise<Response>(() => {}));
    const view = mount();
    await advance(1);
    expect(calls()).toBe(1);
    view.unmount();
    await advance(40000);
    expect(calls()).toBe(1);
  });
});
