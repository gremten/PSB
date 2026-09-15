"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "@/app/moderator/moderator.module.css";
import { getTask } from "@/config/test-scenarios";
import { isScenarioGateTarget, scenarioVerdictForEvent } from "@/lib/testing/scenario-progress";
import type { TaskRun, TrackedEvent } from "@/lib/testing/types";
import { isDemoMissclick } from "@/lib/testing/session-metrics";
import { GlassToast } from "./glass-toast";
import { findReplayIndex, interpolateReplayScroll, projectTrackedTap } from "./replay-geometry";
import { deriveReplayState, recordedEventTime, replayEventTimes, REPLAY_APPLIED, REPLAY_MESSAGE, REPLAY_READY, REPLAY_SCREENS } from "./replay-state";

function eventElapsed(event: TrackedEvent, firstEvent: TrackedEvent) {
  const milliseconds = Math.max(0, recordedEventTime(event) - recordedEventTime(firstEvent));
  const minutes = Math.floor(milliseconds / 60_000);
  const seconds = (milliseconds % 60_000) / 1000;
  return `+${String(minutes).padStart(2, "0")}:${seconds.toFixed(1).padStart(4, "0")}`;
}

function replayUrl(screen: string) {
  return `${REPLAY_SCREENS.has(screen) ? screen : "/"}?replay=1`;
}

const ReplayTimeline = memo(function ReplayTimeline({ events, times, activeIndex, select, taskCodeByRun }: {
  events: TrackedEvent[]; times: number[]; activeIndex: number; select: (time: number) => void; taskCodeByRun: Map<string, string>;
}) {
  return <div className={styles.replayTimeline}>
    {events.map((event, index) => ({ event, index })).filter(({ event }) => event.type !== "scroll").map(({ event, index }) => { const taskCode = event.taskRunId ? taskCodeByRun.get(event.taskRunId) : undefined; const verdict = scenarioVerdictForEvent(event, taskCode); const started = event.type === "task_started"; const finished = event.type === "task_finished"; return <button type="button" className={`${index === activeIndex ? styles.replayEventActive : ""} ${started ? styles.replayScenarioStart : finished ? styles.replayScenarioFinish : ""} ${event.type === "tap" ? verdict === "info" ? styles.replayTapInfo : verdict === "correct" || verdict === "recovery" ? styles.replayTapCorrect : styles.replayTapEvent : ""}`} key={event.id} onClick={() => select(times[index])}>
      <span>{eventElapsed(event, events[0])}</span>
      <strong>{started ? "НАЧАЛО" : finished ? "ЗАВЕРШЁН" : event.type}</strong>
      <small>{started || finished ? getTask(taskCode ?? event.action ?? "")?.title ?? taskCode ?? event.action : `${event.screen ?? "—"} · ${event.action ?? event.target ?? "—"}`}</small>
    </button>; })}
  </div>;
});

export function SessionReplay({ events, startedAt: _startedAt, taskRuns = [] }: { events: TrackedEvent[]; startedAt: string | null; taskRuns?: TaskRun[] }) {
  const taskCodeByRun = useMemo(() => new Map(taskRuns.map((run) => [run.id, run.taskCode])), [taskRuns]);
  const replayEvents = useMemo(() => events.filter((event) => (event.screen || event.type === "tap" || event.type === "task_started" || event.type === "task_finished") && !(event.type === "tap" && isScenarioGateTarget(event.target ?? event.action)))
    .sort((a, b) => recordedEventTime(a) - recordedEventTime(b) || a.id - b.id), [events]);
  const eventTimes = useMemo(() => replayEventTimes(replayEvents), [replayEvents]);
  const durationMs = eventTimes.at(-1) ?? 0;
  const [playheadMs, setPlayheadMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [tapPoint, setTapPoint] = useState<{ id: number; left: number; top: number } | null>(null);
  const [dismissedToastId, setDismissedToastId] = useState<number | null>(null);
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
  const scrollY = useMemo(() => interpolateReplayScroll(replayEvents, eventTimes, safeIndex, playheadMs, screen), [eventTimes, playheadMs, replayEvents, safeIndex, screen]);
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
  const replayToastEvent = useMemo(() => {
    for (let index = safeIndex; index >= 0 && playheadMs - eventTimes[index] < 3000; index--) {
      const event = replayEvents[index];
      if (event.screen === screen && isDemoMissclick(event)) return event;
    }
    return null;
  }, [eventTimes, playheadMs, replayEvents, safeIndex, screen]);

  useEffect(() => {
    if (!activelyPlaying) return;
    let last = performance.now();
    let frame = 0;
    const tick = () => {
      const now = performance.now();
      const delta = now - last;
      last = now;
      setPlayheadMs((elapsed) => Math.min(durationMs, elapsed + delta));
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [activelyPlaying, durationMs]);

  const syncScroll = useCallback(() => {
    const content = iframeRef.current?.contentDocument?.querySelector<HTMLElement>(".participant-content");
    if (content) content.scrollTop = scrollY;
  }, [scrollY]);

  useEffect(() => { syncScroll(); }, [syncScroll]);

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

  const selectEvent = useCallback((time: number) => { setPlaying(false); setDismissedToastId(null); setPlayheadMs(time); }, []);

  if (!current) return <div className={styles.empty}>Для replay пока нет событий.</div>;

  return <div className={styles.replayGrid}>
    <div>
      <div className={styles.replayViewport} ref={viewportRef}>
        <iframe ref={iframeRef} src={replayUrl(replayEvents[0].screen ?? "/")} title={`Replay экрана ${screen}`} onLoad={postReplayState} />
        {tapPoint && activeTap && showTap && tapPoint.id === activeTap.id && <span key={tapPoint.id} className={`${styles.replayPoint} ${activelyPlaying ? styles.replayPointCurrent : styles.replayPointPaused} ${scenarioVerdictForEvent(activeTap, activeTap.taskRunId ? taskCodeByRun.get(activeTap.taskRunId) : undefined) === "info" ? styles.replayPointInfo : scenarioVerdictForEvent(activeTap, activeTap.taskRunId ? taskCodeByRun.get(activeTap.taskRunId) : undefined) === "correct" || scenarioVerdictForEvent(activeTap, activeTap.taskRunId ? taskCodeByRun.get(activeTap.taskRunId) : undefined) === "recovery" ? styles.replayPointCorrect : ""}`} style={{ left: tapPoint.left, top: tapPoint.top }}><i /></span>}
        {replayToastEvent && replayToastEvent.id !== dismissedToastId && <GlassToast key={replayToastEvent.id} placement="bottom" tone="orange" trackId="moderator.replay.demo_toast.dismiss" className={styles.replayToast} onDone={() => setDismissedToastId(replayToastEvent.id)}>Недоступно в&nbsp;демо-демонстрации</GlassToast>}
      </div>
      <div className={styles.replayControls}>
        <button className={styles.button} type="button" onClick={() => { if (activelyPlaying) setPlaying(false); else { if (playheadMs >= durationMs) setPlayheadMs(0); setPlaying(true); } }}>{activelyPlaying ? "Пауза" : "Воспроизвести"}</button>
        <span className={styles.replaySpeed} aria-label="Скорость replay: один икс">1×</span>
      </div>
      {taskRuns.length > 0 && <select className={styles.select} defaultValue="" aria-label="Перейти к сценарию в записи" onChange={(event) => {
        const index = replayEvents.findIndex((item) => item.taskRunId === event.target.value);
        if (index >= 0) selectEvent(eventTimes[index]);
      }}><option value="" disabled>Перейти к сценарию</option>{taskRuns.map((run) => <option key={run.id} value={run.id}>{getTask(run.taskCode)?.title ?? run.taskCode}</option>)}</select>}
      <input className={styles.replayRange} type="range" min={0} max={Math.max(0, Math.ceil(durationMs))} value={Math.round(playheadMs)} onChange={(event) => { setPlaying(false); setPlayheadMs(Number(event.target.value)); }} aria-label={"Позиция replay по\u00a0времени"} />
      <p className={styles.replayNow}><strong>{eventElapsed(current, replayEvents[0])}</strong> · {screen}<br />{current.action ?? current.target ?? current.type} · паузы сокращены</p>
    </div>
    <ReplayTimeline events={replayEvents} times={eventTimes} activeIndex={safeIndex} select={selectEvent} taskCodeByRun={taskCodeByRun} />
  </div>;
}
