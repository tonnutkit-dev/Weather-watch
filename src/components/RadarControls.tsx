import { Play, Pause, RefreshCw, EyeOff } from "lucide-react";
import type { Radar } from "../radar/types";
import { timeLabel } from "../shared/time";
import { isRadarStale } from "../providers/radar";
interface Props {
  radar?: Radar;
  index: number;
  playing: boolean;
  onIndex: (n: number) => void;
  onPlay: () => void;
  onRefresh: () => void;
  onHide: () => void;
  timezone: string;
  loading: boolean;
  error: boolean;
}
export function RadarControls(p: Props) {
  const frames = p.radar?.frames || [],
    frame = frames[p.index],
    latest = frames.at(-1);
  return (
    <div className="radar-controls" aria-label="ควบคุมเรดาร์ย้อนหลัง">
      <div className="radar-topline">
        <span>
          <span className="live-dot" /> เรดาร์ย้อนหลัง
        </span>
        <small>
          {frame ? timeLabel(frame.time, p.timezone) : "รอภาพ"}{" "}
          <span>· เวลาสร้างเฟรม</span>
        </small>
        <button
          aria-label="ซ่อนแถบเรดาร์"
          title="ซ่อนเรดาร์"
          className="icon-button"
          onClick={p.onHide}
        >
          <EyeOff size={16} />
        </button>
      </div>
      {p.error ? (
        <div className="radar-unavailable" role="status">
          โหลดข้อมูลเรดาร์ไม่ได้ <button onClick={p.onRefresh}>ลองใหม่</button>
        </div>
      ) : p.loading && !frames.length ? (
        <p role="status" className="muted">
          กำลังโหลดภาพย้อนหลังจริง…
        </p>
      ) : (
        <>
          <div className="radar-playline">
            <button
              className="play-button"
              aria-label={p.playing ? "หยุดเรดาร์" : "เล่นเรดาร์ย้อนหลัง"}
              disabled={!frames.length}
              onClick={p.onPlay}
            >
              {p.playing ? (
                <Pause size={20} fill="currentColor" />
              ) : (
                <Play size={20} fill="currentColor" />
              )}
            </button>
            <div className="radar-slider">
              <input
                aria-label="เฟรมเรดาร์ย้อนหลัง"
                type="range"
                min="0"
                max={Math.max(0, frames.length - 1)}
                step="1"
                value={Math.min(p.index, Math.max(0, frames.length - 1))}
                disabled={!frames.length}
                onChange={(e) => p.onIndex(Number(e.target.value))}
              />
              <div>
                <span>{timeLabel(frames[0]?.time, p.timezone)}</span>
                <span>{frames.length} ภาพ · 10 นาที/เฟรม</span>
                <span>{timeLabel(latest?.time, p.timezone)}</span>
              </div>
            </div>
            <button
              className="icon-button refresh-radar"
              aria-label="รีเฟรชเรดาร์"
              onClick={p.onRefresh}
              disabled={p.loading}
            >
              <RefreshCw size={18} />
            </button>
          </div>
          <p
            className={`radar-caveat ${isRadarStale(latest?.time) ? "stale" : ""}`}
          >
            {isRadarStale(latest?.time)
              ? "ภาพล่าสุดเกิน 30 นาทีหรือยังไม่มีภาพ · "
              : ""}
            ภาพว่างอาจอยู่นอกความครอบคลุม ไม่ยืนยันว่าไม่มีฝน
            <span className="radar-latest">
              ภาพล่าสุด{" "}
              {timeLabel(latest?.time, p.timezone, {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            {p.playing ? " · เปลี่ยนภาพทุก 15 วินาที" : ""}
          </p>
        </>
      )}
    </div>
  );
}
