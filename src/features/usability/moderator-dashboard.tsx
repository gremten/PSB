"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import styles from "@/app/moderator/moderator.module.css";
import type { UsabilityTask } from "@/config/test-scenarios";
import type { AggregateTaskMetrics } from "@/lib/testing/metrics";
import type {
  ResearchSession,
  ResearchSessionState,
  SessionSnapshot,
  TaskResult,
  TrackedEvent,
} from "@/lib/testing/types";

interface Props {
  initialSessions: ResearchSession[];
  initialResearch: ResearchSessionState;
  initialSnapshot: SessionSnapshot | null;
  initialMetrics: AggregateTaskMetrics[];
  tasks: UsabilityTask[];
}

function elapsed(startedAt?: string | null, endedAt?: string | null) {
  if (!startedAt) return "00:00";
  const seconds = Math.max(0, Math.floor(((endedAt ? new Date(endedAt).getTime() : Date.now()) - new Date(startedAt).getTime()) / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function shortTime(value: string) {
  return new Date(value).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function shortDate(value: string) {
  return new Date(value).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) } });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "Request failed");
  return body as T;
}

export function ModeratorDashboard({ initialSessions, initialResearch, initialSnapshot, initialMetrics, tasks }: Props) {
  const [sessions, setSessions] = useState(initialSessions);
  const [research, setResearch] = useState(initialResearch);
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [metrics, setMetrics] = useState(initialMetrics);
  const [participantCode, setParticipantCode] = useState("");
  const [taskCode, setTaskCode] = useState("");
  const [result, setResult] = useState<TaskResult>("unaided");
  const [easeScore, setEaseScore] = useState(4);
  const [easeReason, setEaseReason] = useState("");
  const [moderatorNote, setModeratorNote] = useState("");
  const [corruptedReason, setCorruptedReason] = useState("");
  const [error, setError] = useState("");
  const [, tick] = useState(0);

  const activeSession = snapshot?.session ?? null;
  const activeTask = snapshot?.taskRuns.find((run) => !run.endedAt) ?? null;
  const connectedBranchUnlocked = activeSession?.variant === "connected" || Boolean(snapshot?.events.some((event) =>
    event.action === "cashback.categories.confirmed" || event.action === "cashback.next_month.categories.confirmed"));
  const availableTasks = useMemo(
    () => tasks.filter((task) => task.set === "A" || connectedBranchUnlocked),
    [connectedBranchUnlocked, tasks],
  );
  const effectiveTaskCode = availableTasks.some((task) => task.code === taskCode)
    ? taskCode
    : (availableTasks[0]?.code ?? "");

  useEffect(() => {
    const interval = setInterval(() => tick((value) => value + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!activeSession?.id) return;
    const source = new EventSource(`/api/events/stream?sessionId=${encodeURIComponent(activeSession.id)}`);
    source.addEventListener("tracked", (message) => {
      const event = JSON.parse((message as MessageEvent).data) as TrackedEvent;
      setSnapshot((current) => current ? {
        ...current,
        events: [...current.events.filter((item) => item.id !== event.id), event].sort((a, b) => a.id - b.id).slice(-500),
      } : current);
      if (event.screen) setResearch((current) => ({ ...current, currentScreen: event.screen! }));
    });
    return () => source.close();
  }, [activeSession?.id]);

  const applyPayload = (payload: { snapshot?: SessionSnapshot; research?: ResearchSessionState; metrics?: AggregateTaskMetrics[] }) => {
    if (payload.snapshot) setSnapshot(payload.snapshot);
    if (payload.research) setResearch(payload.research);
    if (payload.metrics) setMetrics(payload.metrics);
  };

  const run = async (operation: () => Promise<{ snapshot?: SessionSnapshot; research?: ResearchSessionState; metrics?: AggregateTaskMetrics[] }>) => {
    setError("");
    try {
      applyPayload(await operation());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ошибка");
    }
  };

  const create = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      const payload = await api<{ session: ResearchSession; research: ResearchSessionState }>("/api/moderator/sessions", {
        method: "POST",
        body: JSON.stringify({ participantCode, variant: "disconnected" }),
      });
      setSessions((current) => [payload.session, ...current]);
      setResearch(payload.research);
      setSnapshot({ session: payload.session, taskRuns: [], events: [] });
      setParticipantCode("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ошибка");
    }
  };

  const startSession = () => activeSession && run(() => api(`/api/moderator/sessions/${activeSession.id}`, { method: "PATCH", body: JSON.stringify({ action: "start" }) }));
  const endSession = () => activeSession && run(async () => {
    const payload = await api<{ snapshot: SessionSnapshot; research: ResearchSessionState }>(`/api/moderator/sessions/${activeSession.id}`, { method: "PATCH", body: JSON.stringify({ action: "end" }) });
    setSessions((current) => current.map((item) => item.id === payload.snapshot.session.id ? payload.snapshot.session : item));
    return payload;
  });
  const startTask = () => activeSession && run(() => api(`/api/moderator/sessions/${activeSession.id}/tasks`, { method: "POST", body: JSON.stringify({ taskCode: effectiveTaskCode }) }));
  const hint = () => activeSession && run(() => api(`/api/moderator/sessions/${activeSession.id}/hint`, { method: "POST", body: "{}" }));
  const reset = () => activeSession && run(() => api(`/api/moderator/sessions/${activeSession.id}/reset`, { method: "POST", body: "{}" }));
  const saveNote = () => activeSession && run(() => api(`/api/moderator/sessions/${activeSession.id}/note`, { method: "POST", body: JSON.stringify({ note: moderatorNote }) }));
  const finishTask = () => activeTask && run(async () => {
    const payload = await api<{ snapshot: SessionSnapshot; research: ResearchSessionState; metrics: AggregateTaskMetrics[] }>(`/api/moderator/task-runs/${activeTask.id}`, {
      method: "PATCH",
      body: JSON.stringify({ result, easeScore, easeReason, moderatorNote, corruptedReason }),
    });
    setEaseReason("");
    setModeratorNote("");
    setCorruptedReason("");
    setResult("unaided");
    setEaseScore(4);
    return payload;
  });
  const openSession = async (id: string) => {
    setError("");
    try {
      applyPayload(await api(`/api/moderator/sessions/${id}`));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ошибка");
    }
  };

  return <main className={styles.page}>
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <div><p className={styles.build}>private research prototype</p><h1 className={styles.brand}>PSB Moderator</h1></div>
        <span className={styles.build}>build {process.env.NEXT_PUBLIC_BUILD_ID}</span>
      </header>
      {error && <div className={styles.error} style={{ marginBottom: 18 }}>{error}</div>}
      <div className={styles.grid}>
        <div className={styles.column}>
          <section className={styles.card}>
            <h2>Новая сессия</h2>
            <form className={styles.form} onSubmit={create}>
              <label className={styles.label}>Код респондента<input className={styles.input} maxLength={32} placeholder="P-01" value={participantCode} onChange={(event) => setParticipantCode(event.target.value)} /></label>
              <p className={styles.build}>Стартовое состояние: кешбэк не подключён. Ветка B откроется после подключения.</p>
              <button className={styles.button} disabled={!participantCode.trim() || research.sessionStatus === "running" || research.sessionStatus === "draft"}>Создать сессию</button>
            </form>
          </section>

          <section className={styles.card}>
            <h2>Участники и записи</h2>
            {sessions.length ? <div className={styles.sessionTableWrap}><table className={styles.sessionTable}>
              <thead><tr><th>Участник</th><th>Создана</th><th>Время</th><th>Статус</th><th>Данные</th></tr></thead>
              <tbody>{sessions.map((session) => <tr key={session.id}>
                <td><button type="button" onClick={() => openSession(session.id)}>{session.participantCode}</button></td>
                <td>{shortDate(session.createdAt)}</td>
                <td>{elapsed(session.startedAt, session.endedAt)}</td>
                <td>{session.endedAt ? "завершена" : session.startedAt ? "идёт" : "черновик"}</td>
                <td><Link className={styles.link} href={`/moderator/sessions/${session.id}`}>Статистика + replay</Link></td>
              </tr>)}</tbody>
            </table></div> : <div className={styles.empty}>Сессий пока нет</div>}
          </section>

          {metrics.length > 0 && <section className={styles.card}>
            <h2>Агрегаты</h2>
            <div style={{ overflowX: "auto" }}><table className={styles.metrics}>
              <thead><tr><th>Task</th><th>Unaided</th><th>Aided</th><th>Failed</th><th>Median</th></tr></thead>
              <tbody>{metrics.map((metric) => <tr key={metric.taskCode}><td>{metric.taskCode}</td><td>{Math.round(metric.unaidedCompletionRate * 100)}%</td><td>{metric.aidedCount}</td><td>{metric.failedCount}</td><td>{metric.medianCompletionTimeMs === null ? "—" : `${Math.round(metric.medianCompletionTimeMs / 1000)}с`}</td></tr>)}</tbody>
            </table></div>
          </section>}
        </div>

        <div className={styles.column}>
          {activeSession ? <>
            <section className={styles.card}>
              <div className="row-between"><h2>Управление сессией</h2><Link className={styles.link} href={`/moderator/sessions/${activeSession.id}`}>Статистика + replay</Link></div>
              <div className={styles.status}>
                <div className={styles.stat}><span>Респондент</span><strong>{activeSession.participantCode}</strong></div>
                <div className={styles.stat}><span>Состояние</span><strong>{research.sessionStatus}</strong></div>
                <div className={styles.stat}><span>Экран participant</span><strong>{research.currentScreen}</strong></div>
              </div>
              <div className={styles.buttonRow} style={{ marginTop: 14 }}>
                {research.sessionStatus === "draft" && <button className={styles.button} onClick={startSession}>Начать сессию</button>}
                <button className={`${styles.button} ${styles.secondary}`} onClick={reset}>Сбросить participant state</button>
                {research.sessionStatus === "running" && <button className={`${styles.button} ${styles.danger}`} disabled={Boolean(activeTask)} onClick={endSession}>Закончить сессию</button>}
              </div>
            </section>

            {research.sessionStatus === "running" && <section className={styles.card}>
              <div className="row-between"><h2>Текущая задача</h2><span className={styles.timer}>{elapsed(activeTask?.startedAt)}</span></div>
              {activeTask ? <div className={styles.form}>
                <div className={styles.stat}><span>Задача</span><strong>{activeTask.taskCode} · {tasks.find((task) => task.code === activeTask.taskCode)?.title}</strong></div>
                <div className={styles.buttonRow}><button className={`${styles.button} ${styles.secondary}`} disabled={activeTask.wasAided} onClick={hint}>{activeTask.wasAided ? "Подсказка отмечена" : "Отметить подсказку"}</button></div>
                <label className={styles.label}>Результат<select className={styles.select} value={result} onChange={(event) => setResult(event.target.value as TaskResult)}><option value="unaided">unaided</option><option value="aided">aided</option><option value="failed">failed</option><option value="corrupted">corrupted</option></select></label>
                {result === "corrupted" && <label className={styles.label}>Причина corrupted<textarea className={styles.textarea} value={corruptedReason} onChange={(event) => setCorruptedReason(event.target.value)} /></label>}
                <label className={styles.label}>Ease score: {easeScore}<input type="range" min="1" max="7" value={easeScore} onChange={(event) => setEaseScore(Number(event.target.value))} /></label>
                <label className={styles.label}>Почему такая оценка<textarea className={styles.textarea} value={easeReason} onChange={(event) => setEaseReason(event.target.value)} /></label>
                <label className={styles.label}>Заметка модератора<textarea className={styles.textarea} value={moderatorNote} onChange={(event) => setModeratorNote(event.target.value)} /></label>
                <div className={styles.buttonRow}><button className={`${styles.button} ${styles.secondary}`} onClick={saveNote}>Сохранить заметку</button><button className={styles.button} onClick={finishTask}>Завершить задачу</button></div>
              </div> : <div className={styles.form}>
                <label className={styles.label}>Задача<select className={styles.select} value={effectiveTaskCode} onChange={(event) => setTaskCode(event.target.value)}>{availableTasks.map((task) => <option key={task.code} value={task.code}>{task.code} · {task.title}</option>)}</select></label>
                {!connectedBranchUnlocked && <p className={styles.build}>Задачи ветки B появятся после события подключения кешбэка.</p>}
                <p className={styles.build}>{availableTasks.find((task) => task.code === effectiveTaskCode)?.prompt}</p>
                <button className={styles.button} onClick={startTask}>Запустить таймер задачи</button>
              </div>}
            </section>}

            <section className={styles.card}>
              <div className="row-between"><h2>Live event log</h2><span className={styles.build}>{snapshot?.events.length ?? 0} events</span></div>
              <div className={styles.eventLog}>{snapshot?.events.length ? [...snapshot.events].reverse().map((event) => <div className={styles.event} key={event.id}><span>{shortTime(event.timestamp)}</span><span className={styles.eventType}>{event.type}</span><span className={styles.eventAction}>{event.screen ?? "—"} · {event.action ?? event.target ?? "—"}</span></div>) : <div className={styles.empty}>Действия появятся здесь в реальном времени</div>}</div>
            </section>
          </> : <section className={styles.card}><div className={styles.empty}>Создайте сессию, чтобы начать тест.</div></section>}
        </div>
      </div>
    </div>
  </main>;
}
