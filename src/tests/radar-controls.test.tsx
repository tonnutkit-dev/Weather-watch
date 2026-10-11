import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { RadarControls } from "../components/RadarControls";
import { normalizeRadar } from "../providers/radar";
const now = Date.parse("2026-10-11T03:00:00Z") / 1000;
function props(latest = now - 600) {
  return {
    radar: normalizeRadar(
      {
        host: "https://tilecache.rainviewer.com",
        generated: now,
        radar: {
          past: [
            { time: now - 7200, path: "/v2/radar/test_first" },
            { time: latest, path: "/v2/radar/test_latest" },
          ],
        },
      },
      now,
    ),
    index: 0,
    playing: false,
    onIndex: vi.fn(),
    onPlay: vi.fn(),
    onRefresh: vi.fn(),
    onHide: vi.fn(),
    timezone: "Asia/Bangkok",
    country: "TH" as const,
    loading: false,
    error: false,
  };
}
describe("Radar presentation trust", () => {
  it("assesses freshness from the latest real frame, not the selected historical frame", () => {
    vi.spyOn(Date, "now").mockReturnValue(now * 1000);
    render(<RadarControls {...props()} />);
    expect(screen.queryByText("ภาพล่าสุดเกิน 30 นาที")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "รายละเอียดเรดาร์" }));
    expect(screen.getByText(/ไม่ใช่พยากรณ์หรือ Nowcast/)).toBeInTheDocument();
    expect(screen.getByText(/ไม่ยืนยันว่าไม่มีฝน/)).toBeInTheDocument();
  });
  it("marks old latest imagery as stale and never turns a blank layer into no-rain advice", () => {
    vi.spyOn(Date, "now").mockReturnValue(now * 1000);
    render(<RadarControls {...props(now - 3600)} />);
    expect(screen.getByText("ภาพล่าสุดเกิน 30 นาที")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "รายละเอียดเรดาร์" }));
    expect(screen.getByText(/ภาพล่าสุดมีอายุ 60 นาที/)).toBeInTheDocument();
  });
  it("preserves UTC instants while displaying Bangkok and China local times", () => {
    vi.spyOn(Date, "now").mockReturnValue(now * 1000);
    render(<RadarControls {...props()} index={1} />);
    expect(screen.getByTestId("radar-time")).toHaveTextContent("09:50");
    expect(screen.getByTestId("radar-time")).toHaveAttribute(
      "datetime",
      "2026-10-11T02:50:00.000Z",
    );
    cleanup();
    render(
      <RadarControls
        {...props()}
        index={1}
        timezone="Asia/Shanghai"
        country="CN"
      />,
    );
    expect(screen.getByTestId("radar-time")).toHaveTextContent("10:50");
    expect(screen.getByText("จีนอาจไม่ครอบคลุม")).toBeInTheDocument();
  });
  it("missing/error imagery disables playback and exposes a retry in details", () => {
    render(<RadarControls {...props()} radar={undefined} error />);
    expect(
      screen.getByRole("button", { name: "เล่นเรดาร์ย้อนหลัง" }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "รายละเอียดเรดาร์" }));
    expect(screen.getByRole("button", { name: "รีเฟรชเรดาร์" })).toBeEnabled();
  });
});
