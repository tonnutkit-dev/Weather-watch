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
/** Thumb-zone radar scrubber. Presentation status stays honest: a selected frame is never shown as confirmed imagery. */
export function RadarTimeline(p: RadarTimelineProps) {
  const { t, time, fullTime } = useI18n();
  const snapshot = useSyncExternalStore(p.presentationStore?.subscribe ?? noSubscribe, p.presentationStore?.getSnapshot ?? noSnapshot);
  const playback = useSyncExternalStore(p.playback?.subscribe ?? noSubscribe, p.playback?.getSnapshot ?? noSnapshot);
  const playbackKey: Key | null =
    playback?.phase === "budget" ? "radar.p.budget"
    : playback?.phase === "suspended" ? "radar.p.suspended"
    : playback?.phase === "failed" ? "radar.p.failed"
    : playback?.playing && playback.reason === "starting" ? "radar.p.starting"
    : playback?.playing && playback.phase === "buffering" ? "radar.p.buffering"
    : playback?.playing ? "radar.p.playing"
    : playback ? "radar.p.paused" : null;
  const presentation = snapshot?.key === p.requestKey ? snapshot : undefined;
  const status = presentation?.status ?? "pending";
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
  const freshness: Key | null = p.error ? "radar.f.error" : !frames.length ? "radar.f.loading" : stale ? "radar.f.stale" : p.country === "CN" ? "radar.f.china" : null;
  const notable = status === "failed" || (playbackKey !== null && playbackKey !== "radar.p.playing" && playbackKey !== "radar.p.paused");
  const pct = max ? (index / max) * 100 : 100;
  const ago = (m: number) => (m >= 60 && m % 60 === 0 ? t("radar.hoursAgo", { h: m / 60 }) : t("radar.minAgo", { m }));
  return (
    <>
      <div className="ww-timeline glass" aria-label={t("radar.controls")} data-map-inset="bottom">
        <button
          className="ww-play"
          aria-label={p.playing ? t("radar.pause") : t("radar.play")}
          aria-pressed={p.playing}
          disabled={frames.length < 2 || p.error}
          onClick={p.onPlay}
        >
          {p.playing ? <Pause size={19} fill="currentColor" /> : <Play size={19} fill="currentColor" />}
        </button>
        <div className="ww-tl-body">
          <div className="ww-tl-top">
            <time data-testid="radar-time" aria-label={t("radar.timeLabel")} dateTime={frame ? new Date(frame.time * 1000).toISOString() : undefined}>
              {time(frame?.time, p.timezone)}
            </time>
            <span className="ww-tl-status" data-quiet={!notable && !freshness}>
              <span data-testid="radar-presentation" data-status={status} className={notable ? "" : "ww-sr"}>
                <span data-testid="radar-playback" data-phase={playback?.phase ?? "paused"} role="status">
                  {playbackKey ? t(playbackKey) + " · " : ""}
                </span>
                {t(`radar.s.${status}` as Key)}
              </span>
              {freshness && <span className={p.error || stale ? "ww-tl-warn" : ""} role="status">{t(freshness)}</span>}
            </span>
          </div>
          <input
            className="ww-range"
            style={{ "--pct": `${pct}%` } as CSSProperties}
            aria-label={t("radar.frame")}
            type="range"
            min="0"
            max={max}
            step="1"
            value={index}
            disabled={!frames.length || p.error}
            aria-valuetext={frame ? fullTime(frame.time, p.timezone) : t("radar.noImage")}
            onChange={(e) => p.onIndex(Number(e.target.value))}
          />
          <div className="ww-tl-ticks num" aria-hidden="true">
            <span>{first && latest ? ago(Math.round((latest.time - first.time) / 60)) : ""}</span>
            <span>{t("radar.now")} {time(latest?.time, p.timezone)}</span>
          </div>
        </div>
        <button className="ww-icon-btn" aria-label={t("radar.details")} aria-expanded={details} onClick={() => setDetails(true)}>
          <Info size={18} />
        </button>
      </div>
      {details && (
        <Panel title={t("radar.detailsTitle")} onClose={() => setDetails(false)}>
          <div className="ww-radar-details">
            <p role="status">{t(status === "failed" ? "radar.d.failed" : status === "pending" ? "radar.d.pending" : "radar.d.unverified")}</p>
            {playback && (
              <p className="ww-micro" role="status">
                {t(playback.phase === "budget" ? "radar.d.pBudget" : playback.phase === "buffering" ? "radar.d.pBuffering"
                  : playback.phase === "failed" ? "radar.d.pFailed" : playback.phase === "suspended" ? "radar.d.pSuspended" : "radar.d.pIdle")}
              </p>
            )}
            <dl>
              <div><dt>{t("radar.d.selected")}</dt><dd>{fullTime(frame?.time, p.timezone)} · {t("radar.d.selectedNote")}</dd></div>
              <div><dt>{t("radar.d.latest")}</dt><dd>{fullTime(latest?.time, p.timezone)}</dd></div>
              <div><dt>{t("radar.d.localNow")}</dt><dd>{fullTime(now, p.timezone)}</dd></div>
            </dl>
            <p className="ww-micro">{t("radar.d.frames", { tz: p.timezone, n: frames.length })}</p>
            {p.error && <p className="ww-bad" role="status">{t("radar.d.error")}</p>}
            {stale && (
              <p className="ww-warn" role="status">
                {latest ? t("radar.d.age", { m: Math.max(0, Math.floor((now - latest.time) / 60)) }) : t("radar.d.noLatest")} · {t("radar.d.cannotAssess")}
              </p>
            )}
            <p>{t("radar.d.about")}</p>
            <div className="ww-legend">
              <strong>{t("radar.d.legend")}</strong>
              <div className="ww-spectrum" />
              <div><span>{t("radar.d.light")}</span><span>{t("radar.d.heavy")}</span></div>
            </div>
            <p>{t("radar.d.blank")}</p>
            {p.country === "CN" && <p>{t("radar.d.china")}</p>}
            <button className="ww-btn" aria-label={t("radar.refresh")} onClick={p.onRefresh} disabled={p.loading}>
              <RefreshCw size={16} /> {p.loading ? t("radar.refreshing") : t("radar.refresh")}
            </button>
            <a href="https://www.rainviewer.com/" target="_blank" rel="noreferrer">Weather data by RainViewer</a>
          </div>
        </Panel>
      )}
    </>
  );
}
