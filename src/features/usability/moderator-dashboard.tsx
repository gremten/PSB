"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "@/app/moderator/moderator.module.css";
import { interactiveScenarios } from "@/config/test-scenarios";
import type { AggregateTaskMetrics } from "@/lib/testing/metrics";
import type { ResearchSummary } from "@/lib/testing/research-summary";
import { scenarioVerdictForEvent } from "@/lib/testing/scenario-progress";
import { calculateSessionInteractionMetrics, isDemoMissclick } from "@/lib/testing/session-metrics";
import type { ResearchSession, SessionSnapshot } from "@/lib/testing/types";
import { GlassToast } from "./glass-toast";
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

function confidenceLabel(range: { lower: number; upper: number } | null) {
  return range ? `95% ДИ ${range.lower}–${range.upper}%` : "95% ДИ —";
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
  const [liveMissclickId, setLiveMissclickId] = useState<number | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [researchSummary, setResearchSummary] = useState<ResearchSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const selectionRequest = useRef(0);
  const seenMissclick = useRef({ sessionId: initialSnapshot?.session.id ?? null, id: initialSnapshot?.events.filter(isDemoMissclick).at(-1)?.id ?? 0 });
  const selectedId = snapshot?.session.id;

  const openSession = useCallback(async (id: string) => {
    const requestNumber = ++selectionRequest.current;
    setError("");
    try {
      const payload = await readJson<{ snapshot: SessionSnapshot }>(`/api/moderator/sessions/${encodeURIComponent(id)}`);
      if (requestNumber === selectionRequest.current) {
        seenMissclick.current = { sessionId: id, id: payload.snapshot.events.filter(isDemoMissclick).at(-1)?.id ?? 0 };
        setLiveMissclickId(null);
        setSnapshot(payload.snapshot);
      }
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
          if (!cancelled) {
            const latest = data.snapshot.events.filter(isDemoMissclick).at(-1);
            if (seenMissclick.current.sessionId === selectedId && latest && latest.id > seenMissclick.current.id) setLiveMissclickId(latest.id);
            seenMissclick.current = { sessionId: selectedId, id: latest?.id ?? 0 };
            setSnapshot((current) => current?.session.id === selectedId ? data.snapshot : current);
          }
        } else if (payload.sessions[0]) void openSession(payload.sessions[0].id);
        else setSnapshot(null);
      } catch {}
      finally { pending = false; }
    };
    void refresh();
    const interval = window.setInterval(refresh, 1500);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [openSession, selectedId]);

  const observed = useMemo(() => snapshot ? calculateSessionInteractionMetrics(snapshot.session, snapshot.events, clock, snapshot.taskRuns) : null, [clock, snapshot]);
  const taskCodeByRun = useMemo(() => new Map(snapshot?.taskRuns.map((run) => [run.id, run.taskCode]) ?? []), [snapshot]);
  const activeRun = snapshot?.taskRuns.find((run) => !run.endedAt);
  const completedCodes = new Set(snapshot?.taskRuns.filter((run) => run.result === "unaided" || run.result === "aided").map((run) => run.taskCode) ?? []);

  const assignScenario = async (code: string) => {
    if (!snapshot) return;
    setError("");
    try {
      const response = await fetch(`/api/moderator/sessions/${encodeURIComponent(snapshot.session.id)}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "assign_scenario", scenarioCode: code }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Не удалось назначить сценарий");
      await openSession(snapshot.session.id);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Не удалось назначить сценарий"); }
  };

  const toggleResearchSummary = async () => {
    if (summaryOpen) { setSummaryOpen(false); return; }
    setSummaryOpen(true);
    setSummaryLoading(true);
    try {
      const payload = await readJson<{ summary: ResearchSummary }>("/api/moderator/metrics");
      setResearchSummary(payload.summary);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Не удалось получить саммари"); }
    finally { setSummaryLoading(false); }
  };

  return <main className={styles.page}><div className={styles.shell}>
    <header className={styles.topbar}><div><p className={styles.build}>private research prototype</p><h1 className={styles.brand}>PSB Moderator</h1></div><span className={styles.build}>build {process.env.NEXT_PUBLIC_BUILD_ID}</span></header>
    {error && <div className={styles.error}>{error}</div>}
    <div className={styles.dashboardGrid}>
      <section className={styles.card}>
        <div className="row-between"><div><h2>Участники и&nbsp;записи</h2><p className={styles.build}>Сессия появляется после ввода псевдонима участником.</p></div><span className={styles.liveBadge}>LIVE</span></div>
        {sessions.length ? <div className={styles.sessionTableWrap}><table className={styles.sessionTable}><thead><tr><th>Участник</th><th>Создана</th><th>Статус</th><th>Данные</th><th>Быстро</th></tr></thead><tbody>{sessions.map((session) => <tr key={session.id} className={snapshot?.session.id === session.id ? styles.selectedRow : undefined}><td><button type="button" onClick={() => void openSession(session.id)}>{session.participantCode}</button></td><td>{shortDate(session.createdAt)}</td><td>{session.endedAt ? "завершена" : session.assignedScenario ? "ждёт старта" : session.startedAt ? "идёт тест" : "ждёт сценарий"}</td><td><Link className={styles.link} href={`/moderator/sessions/${session.id}`}>Метрики + replay</Link></td><td><div className={styles.sessionQuickActions}><Link className={styles.quickDownload} data-track="moderator.session.export.md.quick" href={`/api/moderator/sessions/${session.id}/export?format=md`}>Скачать MD</Link><SessionActions session={session} actions="delete" showStatus={false} onChanged={(deleted) => { if (!deleted) return; setSessions((current) => current.filter((item) => item.id !== session.id)); if (snapshot?.session.id === session.id) setSnapshot(null); }} /></div></td></tr>)}</tbody></table></div> : <div className={styles.empty}>Записей пока нет. Откройте участнику главную ссылку теста.</div>}
      </section>

      {snapshot && observed ? <>
        <section className={styles.card}>
          <div className="row-between"><div><p className={styles.build}>выбранная запись</p><h2>{snapshot.session.participantCode}</h2></div>{activeRun ? <span className={styles.build}>Replay будет доступен после завершения текущего сценария</span> : <Link className={styles.button} href={`/moderator/sessions/${snapshot.session.id}`}>Открыть replay</Link>}</div>
          <SessionActions key={snapshot.session.id} session={snapshot.session} onChanged={(deleted) => {
            if (deleted) {
              selectionRequest.current++;
              setSessions((current) => current.filter((session) => session.id !== snapshot.session.id));
              setSnapshot(null);
            } else void openSession(snapshot.session.id);
          }} />
          <div className={styles.scenarioPicker} aria-label="Сценарии тестирования">
            {interactiveScenarios.map((scenario) => {
              const done = completedCodes.has(scenario.code);
              const blocked = scenario.code === "CASHBACK_NEXT" && !completedCodes.has("CASHBACK_CONNECT");
              return <button key={scenario.code} type="button" className={`${styles.scenarioButton} ${done ? styles.scenarioDone : ""} ${snapshot.session.assignedScenario === scenario.code ? styles.scenarioAssigned : ""}`} data-track={`moderator.scenario.${scenario.code.toLowerCase()}.assign`} disabled={Boolean(snapshot.session.endedAt || activeRun || done || blocked)} onClick={() => void assignScenario(scenario.code)}>
                <span>{scenario.title}</span><strong>{done ? "✓" : activeRun?.taskCode === scenario.code ? "Идёт" : snapshot.session.assignedScenario === scenario.code ? "Назначен" : blocked ? "После подключения" : "Назначить"}</strong>
              </button>;
            })}
          </div>
          <div className={styles.metricGrid}>
            <div className={styles.stat}><span>Время в сценариях</span><strong>{duration(observed.durationMs)}</strong></div><div className={styles.stat}><span>Клики</span><strong>{observed.tapCount}</strong></div><div className={styles.stat}><span>Meaningful steps</span><strong>{observed.meaningfulSteps}</strong></div><div className={styles.stat}><span>Просмотры экранов</span><strong>{observed.screenViewCount}</strong></div><div className={styles.stat}><span>Уникальные экраны</span><strong>{observed.uniqueScreens}</strong></div><div className={styles.stat}><span>Переходы</span><strong>{observed.navigationCount}</strong></div><div className={styles.stat}><span>Изменения состояния</span><strong>{observed.productStateChanges}</strong></div><div className={styles.stat}><span>Мисклики</span><strong>{observed.missclickCount}</strong></div><div className={styles.stat}><span>Текущий экран</span><strong>{observed.lastScreen}</strong></div><div className={styles.stat}><span>Первое действие</span><strong>{observed.firstMeaningfulAction ?? "—"}</strong></div><div className={styles.stat}><span>Последнее действие</span><strong>{observed.lastAction ?? "—"}</strong></div><div className={styles.stat}><span>Всего событий</span><strong>{observed.eventCount}</strong></div>
          </div>
          <div className={styles.metricGrid}><div className={styles.stat}><span>Верные клики</span><strong>{observed.correctTapCount}</strong></div><div className={styles.stat}><span>Ошибки в сценариях</span><strong>{observed.scenarioErrorCount}</strong></div><div className={styles.stat}><span>Возвраты</span><strong>{observed.recoveryCount}</strong></div><div className={styles.stat}><span>Изучение интерфейса</span><strong>{observed.infoTapCount}</strong></div></div>
        </section>
        <section className={styles.card}><div className="row-between"><div><h2>Live timeline</h2><p className={styles.build}>Клики и&nbsp;действия появляются здесь в&nbsp;реальном времени.</p></div><span className={styles.build}>{snapshot.events.length} events</span></div><div className={styles.eventLog}>{snapshot.events.length ? [...snapshot.events].reverse().map((event) => { const verdict = scenarioVerdictForEvent(event, event.taskRunId ? taskCodeByRun.get(event.taskRunId) : undefined); return <div className={`${styles.event} ${verdict === "error" ? styles.liveError : verdict === "info" ? styles.liveInfo : verdict === "correct" || verdict === "recovery" ? styles.liveCorrect : ""}`} key={event.id}><span>{shortTime(event.timestamp)}</span><span className={styles.eventType}>{event.type}</span><span className={styles.eventAction}>{event.screen ?? "—"} · {event.action ?? event.target ?? "—"}</span></div>; }) : <div className={styles.empty}>Ждём первое действие участника</div>}</div></section>
        <section className={styles.card}><h2>Последовательность экранов и&nbsp;действий</h2>{observed.sequence.length ? <ol className={styles.sequence}>{observed.sequence.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ol> : <div className={styles.empty}>Последовательность пока пуста</div>}</section>
      </> : <section className={styles.card}><div className={styles.empty}>Выберите запись участника, чтобы увидеть метрики и&nbsp;клики.</div></section>}

      <section className={styles.card}>
        <div className="row-between"><div><h2>Саммари по сессиям</h2><p className={styles.build}>Доли считаются по участникам, а не по количеству событий.</p></div><div className={styles.buttonRow}><Link className={styles.button} data-track="moderator.sessions.export_summary.md" href="/api/moderator/sessions/export-summary?format=md">Скачать общее MD-саммари</Link><button type="button" className={`${styles.button} ${styles.secondary}`} onClick={() => void toggleResearchSummary()}>{summaryOpen ? "Скрыть саммари" : "Открыть саммари"}</button></div></div>
        {summaryOpen && (summaryLoading ? <div className={styles.empty}>Считаем показатели…</div> : researchSummary ? <>
          <p className={styles.summaryTotal}>Записанных сессий: <strong>{researchSummary.recordedSessions}</strong></p>
          <h3 className={styles.summaryHeading}>Качество завершённых сценариев</h3>
          <div className={styles.metricGrid}>{researchSummary.journeySegments.map((metric) => <div className={styles.stat} key={metric.id}><span>{metric.label}</span><strong>{metric.count} из {metric.total} · {metric.percent}%</strong><small className={styles.summaryDenominator}>{metric.denominatorLabel}</small></div>)}</div>
          <h3 className={styles.summaryHeading}>Поведение участников</h3>
          <div className={styles.metricGrid}>{researchSummary.metrics.map((metric) => <div className={styles.stat} key={metric.id}><span>{metric.label}</span><strong>{metric.count} из {metric.total} · {metric.percent}%</strong><small className={styles.summaryDenominator}>{metric.denominatorLabel}</small></div>)}</div>
          <h3 className={styles.summaryHeading}>Метрики по сценариям</h3>
          <div className={styles.scenarioSummaryGrid}>{researchSummary.scenarioMetrics.map((scenario) => <article className={styles.scenarioSummary} key={scenario.code}>
            <div className={styles.scenarioSummaryHeader}><div><small>{scenario.code}</small><h4>{scenario.title}</h4></div><strong>{scenario.completedParticipants}/{scenario.startedParticipants}</strong></div>
            <div className={styles.metricGrid}>
              <div className={styles.stat}><span>Task completion</span><strong>{scenario.completionRate}%</strong><small className={styles.summaryDenominator}>{scenario.completedParticipants} из {scenario.startedParticipants} начавших · {confidenceLabel(scenario.completionConfidence95)}</small></div>
              <div className={styles.stat}><span>Без помощи / с помощью</span><strong>{scenario.unaidedCompletionRate}% / {scenario.aidedCompletionRate}%</strong></div>
              <div className={styles.stat}><span>Error-free completion</span><strong>{scenario.errorFreeCompletionRate}%</strong><small className={styles.summaryDenominator}>из завершивших · {confidenceLabel(scenario.errorFreeConfidence95)}</small></div>
              <div className={styles.stat}><span>Direct path</span><strong>{scenario.directPathRate}%</strong><small className={styles.summaryDenominator}>без отклонений · {confidenceLabel(scenario.directPathConfidence95)}</small></div>
              <div className={styles.stat}><span>Успешный первый клик</span><strong>{scenario.firstClickSuccessRate}%</strong><small className={styles.summaryDenominator}>{confidenceLabel(scenario.firstClickConfidence95)}</small></div>
              <div className={styles.stat}><span>Время median / P75</span><strong>{scenario.medianCompletionTimeMs === null ? "—" : duration(scenario.medianCompletionTimeMs)} / {scenario.p75CompletionTimeMs === null ? "—" : duration(scenario.p75CompletionTimeMs)}</strong></div>
              <div className={styles.stat}><span>Лишние тапы median / P75</span><strong>{scenario.medianExcessTaps ?? "—"} / {scenario.p75ExcessTaps ?? "—"}</strong></div>
              <div className={styles.stat}><span>SEQ mean / median</span><strong>{scenario.seqMean ?? "—"} / {scenario.seqMedian ?? "—"}</strong><small className={styles.summaryDenominator}>{scenario.seqResponseCount} ответов · 5–7: {scenario.seqPositiveRate}% · {confidenceLabel(scenario.seqPositiveConfidence95)}</small></div>
              <div className={styles.stat}><span>В процессе / исключено</span><strong>{scenario.inProgressParticipants} / {scenario.excludedParticipants}</strong><small className={styles.summaryDenominator}>исключённые попытки не входят в проценты</small></div>
            </div>
            {scenario.dropoffs.length > 0 && <div className={styles.dropoffList}><strong>Где остановились</strong>{scenario.dropoffs.map((dropoff) => <span key={dropoff.stage}>{dropoff.label}: {dropoff.count} из {dropoff.total} · {dropoff.percent}%</span>)}</div>}
          </article>)}</div>
          <h3 className={styles.summaryHeading}>Проблемные точки</h3>
          <p className={styles.build}>Связь с completion описательная: она показывает, что произошло в этой выборке, но сама по себе не доказывает причинность.</p>
          {researchSummary.issueMetrics.length ? <div className={styles.sessionTableWrap}><table className={styles.metrics}><thead><tr><th>Сценарий</th><th>Действие</th><th>Участники</th><th>Распространённость</th><th>Completion: с проблемой / без</th><th>Вернулись</th><th>Повторов</th></tr></thead><tbody>{researchSummary.issueMetrics.map((issue) => <tr key={`${issue.scenarioCode}:${issue.semanticId}`}><td>{issue.scenarioTitle}</td><td title={issue.semanticId}>{issue.label}</td><td>{issue.affectedParticipants} из {issue.startedParticipants}</td><td>{issue.prevalencePercent}%<small className={styles.summaryDenominator}>{confidenceLabel(issue.prevalenceConfidence95)}</small></td><td>{issue.affectedCompletionRate}% / {issue.unaffectedCompletionRate === null ? "—" : `${issue.unaffectedCompletionRate}%`}<small className={styles.summaryDenominator}>{issue.completionDifferencePp === null ? "нет группы сравнения" : `${issue.completionDifferencePp > 0 ? "+" : ""}${issue.completionDifferencePp} п.п.`}</small></td><td>{issue.recoveredParticipants} · {issue.recoveryRate}%</td><td>{issue.occurrenceCount}</td></tr>)}</tbody></table></div> : <div className={styles.empty}>Ошибочных действий пока нет</div>}
        </> : <div className={styles.empty}>Нет данных для саммари</div>)}
      </section>

      {initialMetrics.length > 0 && <section className={styles.card}><h2>Агрегаты завершённых задач</h2><div className={styles.sessionTableWrap}><table className={styles.metrics}><thead><tr><th>Task</th><th>Completion</th><th>Unaided</th><th>Error-free</th><th>Direct path</th><th>First click</th><th>Median / P75 time</th><th>Median / P75 extra taps</th><th>SEQ</th></tr></thead><tbody>{initialMetrics.map((metric) => <tr key={metric.taskCode}><td>{metric.taskCode}</td><td>{Math.round(metric.completionRate * 100)}%</td><td>{Math.round(metric.unaidedCompletionRate * 100)}%</td><td>{Math.round(metric.errorFreeCompletionRate * 100)}%</td><td>{Math.round(metric.directPathRate * 100)}%</td><td>{Math.round(metric.firstClickSuccessRate * 100)}%</td><td>{metric.medianCompletionTimeMs === null ? "—" : duration(metric.medianCompletionTimeMs)} / {metric.p75CompletionTimeMs === null ? "—" : duration(metric.p75CompletionTimeMs)}</td><td>{metric.medianExcessTaps ?? "—"} / {metric.p75ExcessTaps ?? "—"}</td><td>{metric.easeMedian ?? "—"}/7 ({metric.easeResponseCount})</td></tr>)}</tbody></table></div></section>}
    </div>
  </div>{liveMissclickId !== null && <GlassToast key={liveMissclickId} placement="bottom" tone="orange" trackId="moderator.live.demo_toast.dismiss" className={styles.moderatorLiveToast} onDone={() => setLiveMissclickId((current) => current === liveMissclickId ? null : current)}>Участник открыл недоступное в&nbsp;демо</GlassToast>}</main>;
}
