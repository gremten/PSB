"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "@/app/moderator/moderator.module.css";
import type { TrackedEvent } from "@/lib/testing/types";
import { findReplayIndex, projectTrackedTap } from "./replay-geometry";
import { deriveReplayState, recordedEventTime, replayEventTimes, REPLAY_APPLIED, REPLAY_MESSAGE, REPLAY_READY, REPLAY_SCREENS } from "./replay-state";

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
  return `${REPLAY_SCREENS.has(screen) ? screen : "/"}?replay=1`;
}

const ReplayTimeline = memo(function ReplayTimeline({ events, times, startedAt, activeIndex, select }: {
  events: TrackedEvent[]; times: number[]; startedAt: string | null; activeIndex: number; select: (time: number) => void;
}) {
  return <div className={styles.replayTimeline}>
    {events.map((event, index) => <button type="button" className={`${index === activeIndex ? styles.replayEventActive : ""} ${event.type === "tap" ? styles.replayTapEvent : ""}`} key={event.id} onClick={() => select(times[index])}>
      <span>{eventElapsed(event, startedAt, events[0].timestamp)}</span>
      <strong>{event.type}</strong>
      <small>{event.screen ?? "—"} · {event.action ?? event.target ?? "—"}</small>
    </button>)}
  </div>;
});

export function SessionReplay({ events, startedAt }: { events: TrackedEvent[]; startedAt: string | null }) {
  const replayEvents = useMemo(() => events.filter((event) => event.screen || event.type === "tap")
    .sort((a, b) => recordedEventTime(a) - recordedEventTime(b) || a.id - b.id), [events]);
  const eventTimes = useMemo(() => replayEventTimes(replayEvents), [replayEvents]);
  const durationMs = eventTimes.at(-1) ?? 0;
  const [playheadMs, setPlayheadMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(2);
  const [tapPoint, setTapPoint] = useState<{ id: number; left: number; top: number } | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const safeIndex = Math.max(0, findReplayIndex(eventTimes, playheadMs));
  const current = replayEvents[safeIndex] ?? null;
  const screen = useMemo(() => {
    for (let index = safeIndex; index >= 0; index--) if (replayEvents[index].screen) return replayEvents[index].screen!;
    return "/";
  }, [replayEvents, safeIndex]);
  const visualState = useMemo(() => deriveReplayState(replayEvents, safeIndex), [replayEvents, safeIndex]);
  const replaySnapshot = useRef({ index: safeIndex, state: visualState, screen: REPLAY_SCREENS.has(screen) ? screen : "/" });
  const scrollY = useMemo(() => {
    for (let index = safeIndex; index >= 0; index--) {
      const event = replayEvents[index];
      if (event.screen !== screen) continue;
      const recorded = numberMetadata(event, "scrollY");
      if (recorded !== null) return recorded;
    }
    return 0;
  }, [replayEvents, safeIndex, screen]);
  const activelyPlaying = playing && playheadMs < durationMs;

  const activeTapIndex = useMemo(() => {
    for (let index = safeIndex; index >= 0; index--) {
      const event = replayEvents[index];
      if (event.type !== "tap" || event.screen !== screen) continue;
      return index;
    }
    return -1;
  }, [replayEvents, safeIndex, screen]);
  const activeTap = replayEvents[activeTapIndex] ?? null;
  const showTap = activeTap && (activelyPlaying ? playheadMs - eventTimes[activeTapIndex] < 900 : activeTapIndex === safeIndex);

  useEffect(() => {
    if (!activelyPlaying) return;
    let last = performance.now();
    let lastPaint = last;
    let pending = 0;
    let frame = 0;
    const tick = () => {
      const now = performance.now();
      const delta = now - last;
      last = now;
      pending += delta;
      if (now - lastPaint >= 50) {
        lastPaint = now;
        const advance = pending * speed;
        pending = 0;
        setPlayheadMs((elapsed) => Math.min(durationMs, elapsed + advance));
      }
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [activelyPlaying, durationMs, speed]);

  const syncScroll = useCallback(() => {
    const content = iframeRef.current?.contentDocument?.querySelector<HTMLElement>(".participant-content");
    if (content) content.scrollTop = scrollY;
  }, [scrollY]);

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
      setTapPoint((previous) => previous?.id === activeTap.id ? previous : null);
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

  const postReplayState = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage({ type: REPLAY_MESSAGE, ...replaySnapshot.current }, window.location.origin);
  }, []);

  useEffect(() => {
    replaySnapshot.current = { index: safeIndex, state: visualState, screen: REPLAY_SCREENS.has(screen) ? screen : "/" };
    postReplayState();
  }, [safeIndex, screen, visualState, postReplayState]);

  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== iframeRef.current?.contentWindow) return;
      const message = event.data as { type?: string; index?: number } | null;
      if (message?.type === REPLAY_READY) postReplayState();
      if (message?.type === REPLAY_APPLIED && message.index === replaySnapshot.current.index) {
        syncScroll();
        window.requestAnimationFrame(measureTap);
      }
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [postReplayState, syncScroll, measureTap]);

  const selectEvent = useCallback((time: number) => { setPlaying(false); setPlayheadMs(time); }, []);

  if (!current) return <div className={styles.empty}>Для replay пока нет событий.</div>;

  return <div className={styles.replayGrid}>
    <div>
      <div className={styles.replayViewport} ref={viewportRef}>
        <iframe ref={iframeRef} src={replayUrl(replayEvents[0].screen ?? "/")} title={`Replay экрана ${screen}`} onLoad={postReplayState} />
        {tapPoint && activeTap && showTap && tapPoint.id === activeTap.id && <span key={tapPoint.id} className={`${styles.replayPoint} ${activelyPlaying ? styles.replayPointCurrent : styles.replayPointPaused}`} style={{ left: tapPoint.left, top: tapPoint.top }}><i /></span>}
      </div>
      <div className={styles.replayControls}>
        <button className={styles.button} type="button" onClick={() => { if (activelyPlaying) setPlaying(false); else { if (playheadMs >= durationMs) setPlayheadMs(0); setPlaying(true); } }}>{activelyPlaying ? "Пауза" : "Воспроизвести"}</button>
        <select className={styles.select} value={speed} aria-label="Скорость replay" onChange={(event) => setSpeed(Number(event.target.value))}><option value={1}>1×</option><option value={2}>2×</option><option value={4}>4×</option></select>
      </div>
      <input className={styles.replayRange} type="range" min={0} max={Math.max(0, Math.ceil(durationMs))} value={Math.round(playheadMs)} onChange={(event) => { setPlaying(false); setPlayheadMs(Number(event.target.value)); }} aria-label="Позиция replay по времени" />
      <p className={styles.replayNow}><strong>{eventElapsed(current, startedAt, replayEvents[0].timestamp)}</strong> · {screen}<br />{current.action ?? current.target ?? current.type} · паузы сокращены</p>
    </div>
    <ReplayTimeline events={replayEvents} times={eventTimes} startedAt={startedAt} activeIndex={safeIndex} select={selectEvent} />
  </div>;
}
