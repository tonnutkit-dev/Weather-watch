import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { onlineManager } from "@tanstack/query-core";
import { WeatherOverview } from "../components/WeatherOverview";
import { defaultLocation } from "../locations/provinces";
import { ProviderError } from "../providers/http";
import {
  INITIAL_WEATHER_DEADLINE_MS,
  shouldRetryWeather,
  weatherAttemptDeadline,
  weatherLoadPhase,
  weatherQueryOptions,
} from "../reliability/weatherLoad";
import { STANDARD_RETRY_LIMIT } from "../reliability/loadPolicy";
import fixture from "../../evidence/weather-bangkok.json";

const key = [
  "weather",
  defaultLocation.country,
  defaultLocation.latitude,
  defaultLocation.longitude,
  defaultLocation.timezone,
] as const;

function body() {
  const next = structuredClone(fixture);
  next.current.time = Math.floor(Date.now() / 1000);
  return next;
}
function ok() {
  return { ok: true, status: 200, json: async () => body() } as Response;
}
function client() {
  return new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
}
function Probe({ queryClient }: { queryClient: QueryClient }) {
  const weather = useQuery(weatherQueryOptions(queryClient, defaultLocation, [...key]));
  return (
    <>
      <button type="button" onClick={() => void weather.refetch()}>
        รีเฟรชในเทสต์
      </button>
      <WeatherOverview
        location={defaultLocation}
        now={Date.now()}
        favorite={false}
        onFavorite={vi.fn()}
        onSearch={vi.fn()}
        onRefresh={() => void weather.refetch()}
        weather={weather}
      />
    </>
  );
}
function mount(queryClient = client()) {
  const view = render(
    <QueryClientProvider client={queryClient}>
      <Probe queryClient={queryClient} />
    </QueryClientProvider>,
  );
  return { ...view, queryClient };
}
async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}
afterEach(() => {
  Object.defineProperty(navigator, "onLine", { configurable: true, get: () => true });
  onlineManager.setOnline(true);
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("initial weather load policy", () => {
  it("keeps one retry for refresh and offline, and two retries only for a first online load", () => {
    const stalled = new ProviderError("แหล่งข้อมูลตอบช้าเกินไป กรุณาลองใหม่");
    const denied = new ProviderError("แหล่งข้อมูลตอบกลับ 400", 400);
    expect(weatherLoadPhase(false, true)).toBe("initial");
    expect(weatherLoadPhase(true, true)).toBe("refresh");
    expect(weatherLoadPhase(false, false)).toBe("refresh");
    expect(shouldRetryWeather(0, stalled, "initial")).toBe(true);
    expect(shouldRetryWeather(1, stalled, "initial")).toBe(true);
    expect(shouldRetryWeather(2, stalled, "initial")).toBe(false);
    expect(shouldRetryWeather(0, stalled, "refresh")).toBe(true);
    expect(shouldRetryWeather(1, stalled, "refresh")).toBe(false);
    expect(shouldRetryWeather(0, denied, "initial")).toBe(false);
    expect(STANDARD_RETRY_LIMIT).toBe(1);
    expect(weatherAttemptDeadline("initial", 0)).toBe(INITIAL_WEATHER_DEADLINE_MS);
    expect(weatherAttemptDeadline("initial", 1)).toBe(12_000);
    expect(weatherAttemptDeadline("refresh", 0)).toBe(12_000);
  });

  it("shows temperature after one stalled first attempt", async () => {
    vi.useFakeTimers();
    let calls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(() => {
        calls += 1;
        if (calls === 1) return new Promise(() => {});
        return Promise.resolve(ok());
      }),
    );
    mount();
    expect(screen.getByText("กำลังโหลดอากาศสำหรับตำแหน่งนี้…")).toBeVisible();
    await advance(12_000);
    expect(calls).toBe(1);
    expect(screen.queryByText("โหลดข้อมูลอากาศไม่ได้")).not.toBeInTheDocument();
    await advance(6_000);
    expect(calls).toBe(1);
    await advance(1_000);
    await advance(1);
    expect(calls).toBe(2);
    expect(screen.getByTestId("temperature")).toHaveTextContent(/\d+°C/);
    expect(screen.queryByText("โหลดข้อมูลอากาศไม่ได้")).not.toBeInTheDocument();
  });

  it("shows the error state only after every initial attempt fails", async () => {
    vi.useFakeTimers();
    let calls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(() => {
        calls += 1;
        return new Promise(() => {});
      }),
    );
    mount();
    await advance(INITIAL_WEATHER_DEADLINE_MS + 1_000 + 12_000 + 2_000 + 12_000);
    await advance(1);
    expect(calls).toBe(3);
    expect(screen.getByText("โหลดข้อมูลอากาศไม่ได้")).toBeVisible();
    expect(screen.getByText("แหล่งข้อมูลตอบช้าเกินไป กรุณาลองใหม่")).toBeVisible();
    expect(screen.queryByTestId("temperature")).not.toBeInTheDocument();
    await advance(10_000);
    expect(calls).toBe(3);
  });

  it("does not retry a caller cancellation or a non-retryable response", async () => {
    vi.useFakeTimers();
    const signals: AbortSignal[] = [];
    let calls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init?: RequestInit) => {
        calls += 1;
        signals.push(init!.signal!);
        return new Promise(() => {});
      }),
    );
    const view = mount();
    await advance(1);
    expect(calls).toBe(1);
    view.unmount();
    await advance(30_000);
    expect(calls).toBe(1);
    expect(signals[0]?.aborted).toBe(true);

    calls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        calls += 1;
        return { ok: false, status: 400, json: async () => ({}) };
      }),
    );
    mount();
    await advance(1);
    expect(calls).toBe(1);
    expect(screen.getByText("โหลดข้อมูลอากาศไม่ได้")).toBeVisible();
    expect(screen.getByText("แหล่งข้อมูลตอบกลับ 400")).toBeVisible();
    await advance(5_000);
    expect(calls).toBe(1);
  });

  it("keeps a cached refresh on one 12s retry", async () => {
    vi.useFakeTimers();
    let mode: "ok" | "hang" = "ok";
    let calls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(() => {
        calls += 1;
        if (mode === "ok") return Promise.resolve(ok());
        return new Promise(() => {});
      }),
    );
    mount();
    await advance(0);
    expect(screen.getByTestId("temperature")).toHaveTextContent(/\d+°C/);
    const cached = calls;
    mode = "hang";
    fireEvent.click(screen.getByRole("button", { name: "รีเฟรชในเทสต์" }));
    await advance(12_000);
    expect(calls).toBe(cached + 1);
    await advance(1_000);
    expect(calls).toBe(cached + 2);
    await advance(12_000);
    await advance(1);
    expect(calls).toBe(cached + 2);
    expect(screen.getByTestId("temperature")).toHaveTextContent(/\d+°C/);
    expect(screen.getByText(/อัปเดตไม่สำเร็จ/)).toBeVisible();
    expect(screen.getByRole("button", { name: "ลองใหม่" })).toBeVisible();
    await advance(10_000);
    expect(calls).toBe(cached + 2);
  });

  it("keeps offline failures on the single retry and still shows the error", async () => {
    vi.useFakeTimers();
    Object.defineProperty(navigator, "onLine", { configurable: true, get: () => false });
    let calls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        calls += 1;
        throw new Error("offline");
      }),
    );
    mount();
    await advance(0);
    expect(calls).toBe(1);
    expect(screen.queryByText("โหลดข้อมูลอากาศไม่ได้")).not.toBeInTheDocument();
    await advance(1_000);
    await advance(1);
    expect(calls).toBe(2);
    expect(screen.getByText("โหลดข้อมูลอากาศไม่ได้")).toBeVisible();
    expect(screen.getByText(/เชื่อมต่อแหล่งข้อมูลไม่ได้/)).toBeVisible();
    await advance(20_000);
    expect(calls).toBe(2);
    expect(screen.queryByTestId("temperature")).not.toBeInTheDocument();
  });
});
