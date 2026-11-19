import { useEffect, useState, useSyncExternalStore, type CSSProperties } from "react";
import { Play, Pause, RefreshCw, Info } from "lucide-react";
import type { Radar } from "../radar/types";
import { isRadarStale } from "../providers/radar";
import type { RadarPlayback } from "../radar/playback";
import type { RadarPresentationStore } from "../radar/presentation";
import { useI18n } from "../i18n/i18n";
import type { Key } from "../i18n/strings";
import { Panel } from "./Panel";

export interface RadarTimelineProps {
  playback?: RadarPlayback;
  presentationStore?: RadarPresentationStore;
  requestKey?: string;
  radar?: Radar;
  index: number;
  playing: boolean;
  onIndex: (n: number) => void;
  onPlay: () => void;
  onRefresh: () => void;
  timezone: string;
  loading: boolean;
  error: boolean;
  country: "TH" | "CN";
}
const noSubscribe = () => () => {};
const noSnapshot = () => undefined;
/**
 * Thumb-zone radar scrubber. The dock shows only human states ("loading", failure, stale);
 * the honest machine state (presentation status, playback phase) stays in data attributes and
 * in the info panel's details. Times are relative to now: the device and the location can be in
 * different time zones, so absolute clocks appear only in details, labeled with the location zone.
 */
export function RadarTimeline(p: RadarTimelineProps) {
  const { t, fullTime } = useI18n();
  const snapshot = useSyncExternalStore(p.presentationStore?.subscribe ?? noSubscribe, p.presentationStore?.getSnapshot ?? noSnapshot);
  const playback = useSyncExternalStore(p.playback?.subscribe ?? noSubscribe, p.playback?.getSnapshot ?? noSnapshot);
  const presentation = snapshot?.key === p.requestKey ? snapshot : undefined;
  const status = presentation?.status ?? "pending";
  const phase = playback?.phase ?? "paused";
  const [details, setDetails] = useState(false);
  const [now, setNow] = useState(() => Date.now() / 1000);
  useEffect(() => {
    const update = () => setNow(Date.now() / 1000);
    const id = setInterval(() => { if (!document.hidden) update(); }, 60000);
    document.addEventListener("visibilitychange", update);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", update); };
  }, []);
  const frames = p.radar?.frames || [],
    max = Math.max(0, frames.length - 1),
    index = Math.min(p.index, max),
    frame = frames[index],
    first = frames[0],
    latest = frames.at(-1);
  const stale = isRadarStale(latest?.time, now);
  const ago = (minutes: number) => {
    const m = Math.max(0, Math.round(minutes));
    if (m < 60) return t("radar.mins", { m });
    const h = Math.floor(m / 60), r = Math.round((m % 60) / 10) * 10;
    return r && r < 60 ? t("radar.hoursMins", { h, m: r }) : t("radar.hours", { h: r === 60 ? h + 1 : h });
  };
  const rel = (time?: number) => (time == null ? "—" : now - time < 600 ? t("radar.nowRel") : `−${ago((now - time) / 60)}`);
  const failed = status === "failed" || phase === "failed";
  const busy = !p.error && !failed && (!frames.length || p.loading || phase === "buffering" || phase === "budget" || (p.playing && status === "pending"));
  const notice: { key: Key; warn?: boolean } | null =
    p.error ? { key: "radar.f.error", warn: true }
    : failed ? { key: "radar.f.partial", warn: true }
    : stale ? { key: "radar.f.stale", warn: true }
    : p.country === "CN" ? { key: "radar.f.china" } : null;
  const pct = max ? (index / max) * 100 : 100;
  const zone = p.timezone === "Asia/Shanghai" ? t("tz.cn") : t("tz.th");
  const detailKey: Key = status === "failed" ? "radar.d.failed" : status === "pending" ? "radar.d.pending" : "radar.d.unverified";
  const playKey: Key = phase === "budget" ? "radar.d.pBudget" : phase === "buffering" ? "radar.d.pBuffering"
    : phase === "failed" ? "radar.d.pFailed" : phase === "suspended" ? "radar.d.pSuspended" : "radar.d.pIdle";
  return (
    <>
      <div className="ww-timeline glass" aria-label={t("radar.controls")} data-map-inset="bottom">
        <button className="ww-play" aria-label={p.playing ? t("radar.pause") : t("radar.play")} aria-pressed={p.playing}
          disabled={frames.length < 2 || p.error} onClick={p.onPlay}>
          {p.playing ? <Pause size={19} fill="currentColor" /> : <Play size={19} fill="currentColor" />}
        </button>
        <div className="ww-tl-body">
          <div className="ww-tl-top">
            <time data-testid="radar-time" aria-label={t("radar.timeLabel")} dateTime={frame ? new Date(frame.time * 1000).toISOString() : undefined}>
              {rel(frame?.time)}
            </time>
            <span data-testid="radar-presentation" data-status={status} hidden />
            <span data-testid="radar-playback" data-phase={phase} hidden />
            <span className="ww-tl-status" role="status">
              {busy && <span className="ww-tl-busy"><span className="ww-spin" aria-hidden="true" />{t("radar.loading")}</span>}
              {!busy && notice && <span className={notice.warn ? "ww-tl-warn" : ""}>{t(notice.key)}</span>}
            </span>
          </div>
          <input className="ww-range" style={{ "--pct": `${pct}%` } as CSSProperties} aria-label={t("radar.frame")}
            type="range" min="0" max={max} step="1" value={index} disabled={!frames.length || p.error}
            aria-valuetext={frame ? rel(frame.time) : t("radar.noImage")} onChange={(e) => p.onIndex(Number(e.target.value))} />
          <div className="ww-tl-ticks num" aria-hidden="true">
            <span>{first ? rel(first.time) : ""}</span>
            <span>{latest ? rel(latest.time) : ""}</span>
          </div>
        </div>
        <button className="ww-icon-btn" aria-label={t("radar.details")} aria-expanded={details} onClick={() => setDetails(true)}>
          <Info size={18} />
        </button>
      </div>
      {details && (
        <Panel title={t("radar.detailsTitle")} onClose={() => setDetails(false)} compact
          footer={<button className="ww-btn ww-btn-block" aria-label={t("radar.refresh")} onClick={p.onRefresh} disabled={p.loading}>
            <RefreshCw size={16} /> {p.loading ? t("radar.refreshing") : t("radar.refresh")}</button>}>
          <div className="ww-radar-details">
            <p>{t("radar.i.what", { span: first && latest ? ago((latest.time - first.time) / 60) : "—" })}</p>
            <p>{t("radar.i.blank")}</p>
            {p.country === "CN" && <p>{t("radar.i.china")}</p>}
            {p.error && <p className="ww-bad" role="status">{t("radar.d.error")}</p>}
            {stale && (
              <p className="ww-warn" role="status">
                {latest ? t("radar.d.age", { m: Math.max(0, Math.floor((now - latest.time) / 60)) }) : t("radar.d.noLatest")} · {t("radar.d.cannotAssess")}
              </p>
            )}
            <div className="ww-legend">
              <strong>{t("radar.d.legend")}</strong>
              <div className="ww-spectrum" />
              <div><span>{t("radar.d.light")}</span><span>{t("radar.d.heavy")}</span></div>
            </div>
            <details className="ww-more">
              <summary>{t("radar.i.more")}</summary>
              <p role="status">{t(detailKey)}</p>
              {playback && <p className="ww-micro">{t(playKey)}</p>}
              <dl>
                <div><dt>{t("radar.d.selected")}</dt><dd>{fullTime(frame?.time, p.timezone)}</dd></div>
                <div><dt>{t("radar.d.latest")}</dt><dd>{fullTime(latest?.time, p.timezone)}</dd></div>
                <div><dt>{t("radar.d.localNow")}</dt><dd>{fullTime(now, p.timezone)}</dd></div>
              </dl>
              <p className="ww-micro">{zone} · {t("radar.d.frames", { n: frames.length })} · {t("radar.d.about")}</p>
              <a href="https://www.rainviewer.com/" target="_blank" rel="noreferrer">Weather data by RainViewer</a>
            </details>
          </div>
        </Panel>
      )}
    </>
  );
}
