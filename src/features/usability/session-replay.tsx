"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "@/app/moderator/moderator.module.css";
import type { TrackedEvent } from "@/lib/testing/types";

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
  const [index, setIndex] = useState(Math.max(0, replayEvents.length - 1));
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(2);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const safeIndex = Math.min(index, Math.max(0, replayEvents.length - 1));
  const current = replayEvents[safeIndex] ?? null;
  const screen = current?.screen ?? "/";
  const activelyPlaying = playing && safeIndex < replayEvents.length - 1;

  useEffect(() => {
    if (!activelyPlaying) return;
    const currentTime = new Date(replayEvents[safeIndex].timestamp).getTime();
    const nextTime = new Date(replayEvents[safeIndex + 1].timestamp).getTime();
    const delay = Math.min(2400, Math.max(140, (nextTime - currentTime) / speed));
    const timeout = setTimeout(() => setIndex((value) => value + 1), delay);
    return () => clearTimeout(timeout);
  }, [activelyPlaying, replayEvents, safeIndex, speed]);

  const syncScroll = useCallback(() => {
    const scrollY = current ? numberMetadata(current, "scrollY") ?? 0 : 0;
    const content = iframeRef.current?.contentDocument?.querySelector<HTMLElement>(".participant-content");
    if (content) content.scrollTop = scrollY;
  }, [current]);

  useEffect(() => { syncScroll(); }, [safeIndex, screen, syncScroll]);

  if (!current) return <div className={styles.empty}>Для replay пока нет событий.</div>;

  const x = numberMetadata(current, "x");
  const y = numberMetadata(current, "y");
  const viewportWidth = numberMetadata(current, "viewportWidth");
  const viewportHeight = numberMetadata(current, "viewportHeight");
  const hasPoint = current.type === "tap" && x !== null && y !== null && viewportWidth && viewportHeight;

  return <div className={styles.replayGrid}>
    <div>
      <div className={styles.replayViewport}>
        <iframe ref={iframeRef} key={screen} src={replayUrl(screen)} title={`Replay экрана ${screen}`} onLoad={syncScroll} />
        {hasPoint && <span className={styles.replayPoint} style={{ left: `${Math.min(100, Math.max(0, x / viewportWidth * 100))}%`, top: `${Math.min(100, Math.max(0, y / viewportHeight * 100))}%` }}><i /></span>}
      </div>
      <div className={styles.replayControls}>
        <button className={styles.button} type="button" onClick={() => { if (activelyPlaying) setPlaying(false); else { if (safeIndex >= replayEvents.length - 1) setIndex(0); setPlaying(true); } }}>{activelyPlaying ? "Пауза" : "Воспроизвести"}</button>
        <select className={styles.select} value={speed} aria-label="Скорость replay" onChange={(event) => setSpeed(Number(event.target.value))}><option value={1}>1×</option><option value={2}>2×</option><option value={4}>4×</option></select>
      </div>
      <input className={styles.replayRange} type="range" min={0} max={Math.max(0, replayEvents.length - 1)} value={safeIndex} onChange={(event) => { setPlaying(false); setIndex(Number(event.target.value)); }} aria-label="Позиция replay" />
      <p className={styles.replayNow}><strong>{eventElapsed(current, startedAt, replayEvents[0].timestamp)}</strong> · {screen}<br />{current.action ?? current.target ?? current.type}</p>
    </div>
    <div className={styles.replayTimeline}>
      {replayEvents.map((event, eventIndex) => <button type="button" className={eventIndex === index ? styles.replayEventActive : ""} key={event.id} onClick={() => { setPlaying(false); setIndex(eventIndex); }}>
        <span>{eventElapsed(event, startedAt, replayEvents[0].timestamp)}</span>
        <strong>{event.type}</strong>
        <small>{event.screen ?? "—"} · {event.action ?? event.target ?? "—"}</small>
      </button>)}
    </div>
  </div>;
}
