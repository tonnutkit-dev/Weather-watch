import { useEffect, useState } from "react";
import { Play, Pause, RefreshCw, EyeOff, ChevronUp } from "lucide-react";
import type { Radar } from "../radar/types";
import { timeLabel } from "../shared/time";
import { isRadarStale } from "../providers/radar";
import { Modal } from "./Modal";
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
  country: "TH" | "CN";
}
export function RadarControls(p: Props) {
  const [details, setDetails] = useState(false);
  const [now, setNow] = useState(() => Date.now() / 1000);
  useEffect(() => {
    const update = () => setNow(Date.now() / 1000);
    const id = setInterval(() => {
      if (!document.hidden) update();
    }, 60000);
    document.addEventListener("visibilitychange", update);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  const frames = p.radar?.frames || [],
    frame = frames[p.index],
    latest = frames.at(-1);
  const stale = isRadarStale(latest?.time, now);
  const fullTime = (time?: number) =>
    timeLabel(time, p.timezone, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  return (
    <>
      <div className="radar-controls" aria-label="ควบคุมเรดาร์ย้อนหลัง">
        <div className="radar-caption">
          <span>เรดาร์ย้อนหลัง</span>
          <span
            className={
              stale || p.error ? "radar-freshness stale" : "radar-freshness"
            }
            role="status"
          >
            {p.error
              ? "โหลดไม่ได้"
              : !frames.length
                ? "กำลังโหลด"
                : stale
                  ? "ภาพล่าสุดเกิน 30 นาที"
                  : p.country === "CN"
                    ? "จีนอาจไม่ครอบคลุม"
                    : ""}
          </span>
          <time
            data-testid="radar-time"
            dateTime={
              frame ? new Date(frame.time * 1000).toISOString() : undefined
            }
          >
            {timeLabel(frame?.time, p.timezone)}
          </time>
        </div>
        <div className="radar-playline">
          <button
            className="play-button"
            aria-label={p.playing ? "หยุดเรดาร์" : "เล่นเรดาร์ย้อนหลัง"}
            disabled={!frames.length || p.error}
            onClick={p.onPlay}
          >
            {p.playing ? (
              <Pause size={19} fill="currentColor" />
            ) : (
              <Play size={19} fill="currentColor" />
            )}
          </button>
          <input
            aria-label="เฟรมเรดาร์ย้อนหลัง"
            type="range"
            min="0"
            max={Math.max(0, frames.length - 1)}
            step="1"
            value={Math.min(p.index, Math.max(0, frames.length - 1))}
            disabled={!frames.length || p.error}
            aria-valuetext={frame ? fullTime(frame.time) : "ยังไม่มีภาพ"}
            onChange={(e) => p.onIndex(Number(e.target.value))}
          />
          <button
            className="icon-button radar-details-button"
            aria-label="รายละเอียดเรดาร์"
            aria-expanded={details}
            onClick={() => setDetails(true)}
          >
            <ChevronUp size={20} />
          </button>
        </div>
      </div>
      {details && (
        <Modal
          title="รายละเอียดเรดาร์ย้อนหลัง"
          onClose={() => setDetails(false)}
        >
          <div className="radar-details">
            <dl>
              <div>
                <dt>ภาพที่เลือก</dt>
                <dd>{fullTime(frame?.time)}</dd>
              </div>
              <div>
                <dt>ภาพล่าสุด</dt>
                <dd>{fullTime(latest?.time)}</dd>
              </div>
              <div>
                <dt>เวลาท้องถิ่นตอนนี้</dt>
                <dd>{fullTime(now)}</dd>
              </div>
            </dl>
            <p className="micro">
              เขตเวลา {p.timezone} · {frames.length}{" "}
              ภาพย้อนหลังที่ผู้ให้บริการส่งมา
            </p>
            {p.error && (
              <p className="data-error" role="status">
                โหลดข้อมูลเรดาร์ไม่ได้ กรุณาลองรีเฟรช
              </p>
            )}
            {stale && (
              <p className="stale" role="status">
                {latest
                  ? `ภาพล่าสุดมีอายุ ${Math.max(0, Math.floor((now - latest.time) / 60))} นาที`
                  : "ยังไม่มีภาพล่าสุดที่ตรวจสอบได้"}{" "}
                · ยังสรุปสถานการณ์ฝนปัจจุบันไม่ได้
              </p>
            )}
            <p>
              ภาพย้อนหลังจาก RainViewer ไม่ใช่พยากรณ์หรือ Nowcast
              เวลาที่แสดงคือเวลาสร้างภาพรวม สถานีแต่ละแห่งอาจวัดคนละเวลา
            </p>
            <div className="radar-legend">
              <strong>ความเข้มฝน</strong>
              <div className="legend-spectrum" />
              <div>
                <span>เบา</span>
                <span>หนัก</span>
              </div>
              <small>RainViewer · dBZ · ชุดสี 2</small>
            </div>
            <p>ภาพว่างอาจอยู่นอกความครอบคลุม ไม่ยืนยันว่าไม่มีฝน</p>
            {p.country === "CN" && (
              <p>
                เรดาร์จีนอาจไม่มีข้อมูลครอบคลุม
                กรุณาดูพยากรณ์และแหล่งทางการเพิ่มเติม
              </p>
            )}
            <div className="radar-detail-actions">
              <button
                className="text-button"
                aria-label="รีเฟรชเรดาร์"
                onClick={p.onRefresh}
                disabled={p.loading}
              >
                <RefreshCw size={17} />{" "}
                {p.loading ? "กำลังรีเฟรช" : "รีเฟรชเรดาร์"}
              </button>
              <button
                className="text-button"
                onClick={() => {
                  setDetails(false);
                  p.onHide();
                }}
              >
                <EyeOff size={17} /> ซ่อนเรดาร์
              </button>
            </div>
            <a
              href="https://www.rainviewer.com/"
              target="_blank"
              rel="noreferrer"
            >
              Weather data by RainViewer
            </a>
          </div>
        </Modal>
      )}
    </>
  );
}
