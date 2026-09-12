"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "@/app/moderator/moderator.module.css";
import type { TrackedEvent } from "@/lib/testing/types";
import { findReplayIndex, projectTrackedTap } from "./replay-geometry";

function numberMetadata(event: TrackedEvent, key: string) {
  const value = event.metadata[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function eventElapsed(event: TrackedEvent, startedAt: string | null, firstTimestamp: string) {
  const origin = startedAt ?? firstTimestamp;
  const milliseconds = Math.max(0, new Date(event.timestamp).getTime() - new Date(origin).getTime());
  const minutes = Math.floor(milliseconds / 60_000);
  const seconds = (milliseconds % 60_000) / 1000;
  return `+${String(minutes).padStart(2, "0")}:${seconds.toFixed(1).padStart(4, "0")}`;
}

function replayUrl(screen: string) {
  const safeScreen = screen.startsWith("/") && !screen.startsWith("//") ? screen : "/";
  return `${safeScreen}${safeScreen.includes("?") ? "&" : "?"}replay=1`;
}

export function SessionReplay({ events, startedAt }: { events: TrackedEvent[]; startedAt: string | null }) {
  const replayEvents = useMemo(() => events.filter((event) => event.screen || event.type === "tap"), [events]);
  const eventTimes = useMemo(() => {
    const first = new Date(replayEvents[0]?.timestamp ?? 0).getTime();
    return replayEvents.reduce<number[]>((times, event) => {
      const elapsed = Math.max(0, new Date(event.timestamp).getTime() - first);
      times.push(Math.max(elapsed, (times.at(-1) ?? -1) + 1));
      return times;
    }, []);
  }, [replayEvents]);
  const durationMs = eventTimes.at(-1) ?? 0;
  const [playheadMs, setPlayheadMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(2);
  const [tapPoint, setTapPoint] = useState<{ id: number; left: number; top: number } | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const safeIndex = Math.max(0, findReplayIndex(eventTimes, playheadMs));
  const current = replayEvents[safeIndex] ?? null;
  const screen = replayEvents.slice(0, safeIndex + 1).reverse().find((event) => event.screen)?.screen ?? "/";
  const activelyPlaying = playing && playheadMs < durationMs;

  const activeTap = useMemo(() => {
    for (let index = safeIndex; index >= 0; index--) {
      const event = replayEvents[index];
      if (event.type !== "tap" || event.screen !== screen) continue;
      if (activelyPlaying && playheadMs - eventTimes[index] > 950) return null;
      if (!activelyPlaying && index !== safeIndex) return null;
      return event;
    }
    return null;
  }, [activelyPlaying, eventTimes, playheadMs, replayEvents, safeIndex, screen]);

  useEffect(() => {
    if (!activelyPlaying) return;
    let last = performance.now();
    const interval = window.setInterval(() => {
      const now = performance.now();
      const delta = now - last;
      last = now;
      setPlayheadMs((elapsed) => Math.min(durationMs, elapsed + delta * speed));
    }, 33);
    return () => window.clearInterval(interval);
  }, [activelyPlaying, durationMs, speed]);

  const syncScroll = useCallback(() => {
    const scrollY = current ? numberMetadata(current, "scrollY") ?? 0 : 0;
    const content = iframeRef.current?.contentDocument?.querySelector<HTMLElement>(".participant-content");
    if (content) content.scrollTop = scrollY;
  }, [current]);

  const measureTap = useCallback(() => {
    const iframe = iframeRef.current;
    const viewport = viewportRef.current;
    const document = iframe?.contentDocument;
    if (!activeTap || !iframe || !viewport || !document || !activeTap.target) {
      setTapPoint(null);
      return;
    }
    const target = Array.from(document.querySelectorAll<HTMLElement>("[data-track]"))
      .find((element) => element.dataset.track === activeTap.target);
    if (!target) {
      setTapPoint(null);
      return;
    }
    const iframeRect = iframe.getBoundingClientRect();
    const viewportRect = viewport.getBoundingClientRect();
    const point = projectTrackedTap(activeTap.metadata, target.getBoundingClientRect(), {
      left: iframeRect.left - viewportRect.left,
      top: iframeRect.top - viewportRect.top,
    });
    setTapPoint(point ? { id: activeTap.id, ...point } : null);
  }, [activeTap]);

  useEffect(() => {
    syncScroll();
    const frame = window.requestAnimationFrame(measureTap);
    return () => window.cancelAnimationFrame(frame);
  }, [safeIndex, screen, syncScroll, measureTap]);

  if (!current) return <div className={styles.empty}>Для replay пока нет событий.</div>;

  return <div className={styles.replayGrid}>
    <div>
      <div className={styles.replayViewport} ref={viewportRef}>
        <iframe ref={iframeRef} key={screen} src={replayUrl(screen)} title={`Replay экрана ${screen}`} onLoad={() => { syncScroll(); window.requestAnimationFrame(measureTap); }} />
        {tapPoint && activeTap && tapPoint.id === activeTap.id && <span key={tapPoint.id} className={`${styles.replayPoint} ${activelyPlaying ? styles.replayPointCurrent : styles.replayPointPaused}`} style={{ left: tapPoint.left, top: tapPoint.top }}><i /></span>}
      </div>
      <div className={styles.replayControls}>
        <button className={styles.button} type="button" onClick={() => { if (activelyPlaying) setPlaying(false); else { if (playheadMs >= durationMs) setPlayheadMs(0); setPlaying(true); } }}>{activelyPlaying ? "Пауза" : "Воспроизвести"}</button>
        <select className={styles.select} value={speed} aria-label="Скорость replay" onChange={(event) => setSpeed(Number(event.target.value))}><option value={1}>1×</option><option value={2}>2×</option><option value={4}>4×</option></select>
      </div>
      <input className={styles.replayRange} type="range" min={0} max={Math.max(0, Math.ceil(durationMs))} value={Math.round(playheadMs)} onChange={(event) => { setPlaying(false); setPlayheadMs(Number(event.target.value)); }} aria-label="Позиция replay по времени" />
      <p className={styles.replayNow}><strong>{eventElapsed(current, startedAt, replayEvents[0].timestamp)}</strong> · {screen}<br />{current.action ?? current.target ?? current.type}</p>
    </div>
    <div className={styles.replayTimeline}>
      {replayEvents.map((event, eventIndex) => <button type="button" className={`${eventIndex === safeIndex ? styles.replayEventActive : ""} ${event.type === "tap" ? styles.replayTapEvent : ""}`} key={event.id} onClick={() => { setPlaying(false); setPlayheadMs(eventTimes[eventIndex]); }}>
        <span>{eventElapsed(event, startedAt, replayEvents[0].timestamp)}</span>
        <strong>{event.type}</strong>
        <small>{event.screen ?? "—"} · {event.action ?? event.target ?? "—"}</small>
      </button>)}
    </div>
  </div>;
}
