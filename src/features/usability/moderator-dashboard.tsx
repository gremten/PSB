"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "@/app/moderator/moderator.module.css";
import type { AggregateTaskMetrics } from "@/lib/testing/metrics";
import { calculateSessionInteractionMetrics } from "@/lib/testing/session-metrics";
import type { ResearchSession, SessionSnapshot } from "@/lib/testing/types";
import { SessionActions } from "./session-actions";

interface Props {
  initialSessions: ResearchSession[];
  initialSnapshot: SessionSnapshot | null;
  initialMetrics: AggregateTaskMetrics[];
}

function duration(milliseconds: number) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function shortDate(value: string) {
  return new Date(value).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function shortTime(value: string) {
  return new Date(value).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

async function readJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? "Не удалось получить данные");
  return payload as T;
}

export function ModeratorDashboard({ initialSessions, initialSnapshot, initialMetrics }: Props) {
  const [sessions, setSessions] = useState(initialSessions);
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [error, setError] = useState("");
  const [clock, setClock] = useState(() => Date.now());
  const selectionRequest = useRef(0);
  const selectedId = snapshot?.session.id;

  const openSession = useCallback(async (id: string) => {
    const requestNumber = ++selectionRequest.current;
    setError("");
    try {
      const payload = await readJson<{ snapshot: SessionSnapshot }>(`/api/moderator/sessions/${encodeURIComponent(id)}`);
      if (requestNumber === selectionRequest.current) setSnapshot(payload.snapshot);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось получить данные");
    }
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let pending = false;
    const refresh = async () => {
      if (pending || document.hidden) return;
      pending = true;
      try {
        const payload = await readJson<{ sessions: ResearchSession[] }>("/api/moderator/sessions");
        if (cancelled) return;
        setSessions(payload.sessions);
        if (selectedId && payload.sessions.some((session) => session.id === selectedId)) {
          const data = await readJson<{ snapshot: SessionSnapshot }>(`/api/moderator/sessions/${encodeURIComponent(selectedId)}`);
          if (!cancelled) setSnapshot((current) => current?.session.id === selectedId ? data.snapshot : current);
        } else if (payload.sessions[0]) void openSession(payload.sessions[0].id);
        else setSnapshot(null);
      } catch {}
      finally { pending = false; }
    };
    void refresh();
    const interval = window.setInterval(refresh, 4000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [openSession, selectedId]);

  const observed = useMemo(() => snapshot ? calculateSessionInteractionMetrics(snapshot.session, snapshot.events, clock) : null, [clock, snapshot]);

  return <main className={styles.page}><div className={styles.shell}>
    <header className={styles.topbar}><div><p className={styles.build}>private research prototype</p><h1 className={styles.brand}>PSB Moderator</h1></div><span className={styles.build}>build {process.env.NEXT_PUBLIC_BUILD_ID}</span></header>
    {error && <div className={styles.error}>{error}</div>}
    <div className={styles.dashboardGrid}>
      <section className={styles.card}>
        <div className="row-between"><div><h2>Участники и записи</h2><p className={styles.build}>Сессия появляется после ввода псевдонима участником.</p></div><span className={styles.liveBadge}>LIVE</span></div>
        {sessions.length ? <div className={styles.sessionTableWrap}><table className={styles.sessionTable}><thead><tr><th>Участник</th><th>Создана</th><th>Статус</th><th>Данные</th></tr></thead><tbody>{sessions.map((session) => <tr key={session.id} className={snapshot?.session.id === session.id ? styles.selectedRow : undefined}><td><button type="button" onClick={() => void openSession(session.id)}>{session.participantCode}</button></td><td>{shortDate(session.createdAt)}</td><td>{session.endedAt ? "завершена" : "идёт"}</td><td><Link className={styles.link} href={`/moderator/sessions/${session.id}`}>Метрики + replay</Link></td></tr>)}</tbody></table></div> : <div className={styles.empty}>Записей пока нет. Откройте участнику главную ссылку теста.</div>}
      </section>

      {snapshot && observed ? <>
        <section className={styles.card}>
          <div className="row-between"><div><p className={styles.build}>выбранная запись</p><h2>{snapshot.session.participantCode}</h2></div><Link className={styles.button} href={`/moderator/sessions/${snapshot.session.id}`}>Открыть replay</Link></div>
          <SessionActions key={snapshot.session.id} session={snapshot.session} onChanged={(deleted) => {
            if (deleted) {
              selectionRequest.current++;
              setSessions((current) => current.filter((session) => session.id !== snapshot.session.id));
              setSnapshot(null);
            } else void openSession(snapshot.session.id);
          }} />
          <div className={styles.metricGrid}>
            <div className={styles.stat}><span>Время</span><strong>{duration(observed.durationMs)}</strong></div><div className={styles.stat}><span>Клики</span><strong>{observed.tapCount}</strong></div><div className={styles.stat}><span>Meaningful steps</span><strong>{observed.meaningfulSteps}</strong></div><div className={styles.stat}><span>Просмотры экранов</span><strong>{observed.screenViewCount}</strong></div><div className={styles.stat}><span>Уникальные экраны</span><strong>{observed.uniqueScreens}</strong></div><div className={styles.stat}><span>Переходы</span><strong>{observed.navigationCount}</strong></div><div className={styles.stat}><span>Изменения состояния</span><strong>{observed.productStateChanges}</strong></div><div className={styles.stat}><span>Попытки недоступного</span><strong>{observed.demoFeedbackCount}</strong></div><div className={styles.stat}><span>Текущий экран</span><strong>{observed.lastScreen}</strong></div><div className={styles.stat}><span>Первое действие</span><strong>{observed.firstMeaningfulAction ?? "—"}</strong></div><div className={styles.stat}><span>Последнее действие</span><strong>{observed.lastAction ?? "—"}</strong></div><div className={styles.stat}><span>Всего событий</span><strong>{observed.eventCount}</strong></div>
          </div>
        </section>
        <section className={styles.card}><div className="row-between"><div><h2>Live timeline</h2><p className={styles.build}>Клики и действия появляются здесь в реальном времени.</p></div><span className={styles.build}>{snapshot.events.length} events</span></div><div className={styles.eventLog}>{snapshot.events.length ? [...snapshot.events].reverse().map((event) => <div className={styles.event} key={event.id}><span>{shortTime(event.timestamp)}</span><span className={styles.eventType}>{event.type}</span><span className={styles.eventAction}>{event.screen ?? "—"} · {event.action ?? event.target ?? "—"}</span></div>) : <div className={styles.empty}>Ждём первое действие участника</div>}</div></section>
        <section className={styles.card}><h2>Последовательность экранов и действий</h2>{observed.sequence.length ? <ol className={styles.sequence}>{observed.sequence.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ol> : <div className={styles.empty}>Последовательность пока пуста</div>}</section>
      </> : <section className={styles.card}><div className={styles.empty}>Выберите запись участника, чтобы увидеть метрики и клики.</div></section>}

      {initialMetrics.length > 0 && <section className={styles.card}><h2>Агрегаты завершённых задач</h2><div className={styles.sessionTableWrap}><table className={styles.metrics}><thead><tr><th>Task</th><th>Unaided</th><th>Aided</th><th>Failed</th><th>Median time</th><th>Median steps</th><th>Median deviation</th><th>Ease median</th></tr></thead><tbody>{initialMetrics.map((metric) => <tr key={metric.taskCode}><td>{metric.taskCode}</td><td>{Math.round(metric.unaidedCompletionRate * 100)}%</td><td>{metric.aidedCount}</td><td>{metric.failedCount}</td><td>{metric.medianCompletionTimeMs === null ? "—" : duration(metric.medianCompletionTimeMs)}</td><td>{metric.medianSteps ?? "—"}</td><td>{metric.medianDeviationFromGoldenPath ?? "—"}</td><td>{metric.easeMedian ?? "—"}</td></tr>)}</tbody></table></div></section>}
    </div>
  </div></main>;
}
