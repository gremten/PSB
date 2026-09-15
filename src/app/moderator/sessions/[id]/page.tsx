import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getTask } from "@/config/test-scenarios";
import styles from "@/app/moderator/moderator.module.css";
import { getFullSessionSnapshot } from "@/lib/db/queries";
import { calculateTaskMetrics } from "@/lib/testing/metrics";
import { calculateSessionInteractionMetrics } from "@/lib/testing/session-metrics";
import { isValidModeratorToken, MODERATOR_COOKIE } from "@/lib/moderator-auth";
import { ModeratorLogin } from "@/features/usability/moderator-login";
import { SessionReplay } from "@/features/usability/session-replay";
import { SessionActions } from "@/features/usability/session-actions";

export const dynamic = "force-dynamic";

function duration(milliseconds: number) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export default async function SessionSummaryPage({ params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  if (!isValidModeratorToken(cookieStore.get(MODERATOR_COOKIE)?.value)) return <ModeratorLogin configured={Boolean(process.env.MODERATOR_SECRET)} />;
  const { id } = await params;
  const snapshot = await getFullSessionSnapshot(id);
  if (!snapshot) notFound();
  const recordingInProgress = snapshot.taskRuns.some((run) => !run.endedAt);
  const interaction = calculateSessionInteractionMetrics(snapshot.session, snapshot.events, undefined, snapshot.taskRuns);
  const taskMetrics = snapshot.taskRuns.map((run) => ({ run, metric: calculateTaskMetrics(run, snapshot.events, getTask(run.taskCode)) }));

  return <main className={styles.page}><div className={`${styles.shell} ${styles.summary}`}>
    <header className={`${styles.topbar} ${styles.summaryTopbar}`}><div><Link className={styles.summaryBack} href="/moderator">← Dashboard</Link><p className={styles.build}>session summary · build {snapshot.session.buildId}</p><h1 className={styles.brand}>{snapshot.session.participantCode}</h1></div><div className={styles.buttonRow}><Link className={`${styles.button} ${styles.secondary}`} href={`/api/moderator/sessions/${snapshot.session.id}/export?format=md`}>Скачать MD</Link><Link className={`${styles.button} ${styles.secondary}`} href={`/api/moderator/sessions/${snapshot.session.id}/export`}>Скачать JSON</Link><Link className={`${styles.button} ${styles.secondary}`} href={`/api/moderator/sessions/${snapshot.session.id}/export?format=csv`}>Скачать CSV</Link><SessionActions session={snapshot.session} actions="delete" showStatus={false} /></div></header>
    <section className={styles.card}><SessionActions session={snapshot.session} actions="end" /></section>

    <section className={styles.card}><h2>Метрики сессии</h2><div className={styles.metricGrid}><div className={styles.stat}><span>Время в сценариях</span><strong>{duration(interaction.durationMs)}</strong></div><div className={styles.stat}><span>Клики</span><strong>{interaction.tapCount}</strong></div><div className={styles.stat}><span>Meaningful steps</span><strong>{interaction.meaningfulSteps}</strong></div><div className={styles.stat}><span>Всего событий</span><strong>{interaction.eventCount}</strong></div><div className={styles.stat}><span>Просмотры экранов</span><strong>{interaction.screenViewCount}</strong></div><div className={styles.stat}><span>Уникальные экраны</span><strong>{interaction.uniqueScreens}</strong></div><div className={styles.stat}><span>Переходы</span><strong>{interaction.navigationCount}</strong></div><div className={styles.stat}><span>Изменения состояния</span><strong>{interaction.productStateChanges}</strong></div><div className={styles.stat}><span>Мисклики</span><strong>{interaction.missclickCount}</strong></div><div className={styles.stat}><span>Изучение интерфейса</span><strong>{interaction.infoTapCount}</strong></div><div className={styles.stat}><span>Последний экран</span><strong>{interaction.lastScreen}</strong></div><div className={styles.stat}><span>Первое действие</span><strong>{interaction.firstMeaningfulAction ?? "—"}</strong></div><div className={styles.stat}><span>Последнее действие</span><strong>{interaction.lastAction ?? "—"}</strong></div></div></section>

    <section className={styles.card}><div className="row-between"><div><h2>Replay по сценариям</h2><p className={styles.build}>Верные клики — зелёные, ошибочные — красные, изучение интерфейса — жёлтое. Возврат из неверного раздела сохраняется в записи.</p></div></div>{recordingInProgress ? <div className={styles.empty}>Идёт запись текущего сценария. Replay станет доступен сразу после его завершения.</div> : <SessionReplay events={snapshot.events} startedAt={snapshot.session.startedAt} taskRuns={snapshot.taskRuns} />}</section>

    {taskMetrics.map(({ run, metric }) => <section className={styles.card} key={run.id}><div className="row-between"><h2>{run.taskCode} · {getTask(run.taskCode)?.title ?? "Задача"}</h2><strong className={run.result === "corrupted" ? "error-text" : styles.success}>{run.result ?? "running"}</strong></div><div className={styles.status}><div className={styles.stat}><span>Время</span><strong>{metric.completionTimeMs === null ? "—" : `${(metric.completionTimeMs / 1000).toFixed(1)} сек`}</strong></div><div className={styles.stat}><span>Верно / ошибочно / возвраты / изучение</span><strong>{metric.correctTaps} / {metric.wrongTaps} / {metric.recoveryTaps} / {metric.infoTaps}</strong></div><div className={styles.stat}><span>Шаги / golden</span><strong>{metric.meaningfulSteps} / {metric.goldenPathSteps ?? "—"}</strong></div><div className={styles.stat}><span>Лишние тапы</span><strong>{metric.excessTaps ?? "—"}</strong></div><div className={styles.stat}><span>Первый клик</span><strong>{metric.firstClickCorrect === null ? "—" : metric.firstClickCorrect ? "верный" : "неверный"}</strong></div><div className={styles.stat}><span>Error-free / direct path</span><strong>{metric.errorFree ? "да" : "нет"} / {metric.directPath ? "да" : "нет"}</strong></div><div className={styles.stat}><span>SEQ</span><strong>{metric.easeScore ?? "—"} / 7</strong></div></div><p><strong>Первое действие:</strong> {metric.firstMeaningfulAction ?? "—"}</p>{run.easeReason && <p><strong>Причина оценки:</strong> {run.easeReason}</p>}{run.moderatorNote && <p><strong>Заметка:</strong> {run.moderatorNote}</p>}{run.corruptedReason && <p><strong>Причина corrupted:</strong> {run.corruptedReason}</p>}<details><summary>Последовательность экранов и&nbsp;действий</summary><ol className={styles.sequence}>{metric.sequence.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ol></details></section>)}

    <section className={styles.card}><h2>Полный журнал событий</h2><div className={styles.eventLog}>{snapshot.events.map((event) => <div className={styles.event} key={event.id}><span>{new Date(event.timestamp).toLocaleTimeString("ru-RU")}</span><span className={styles.eventType}>{event.type}</span><span className={styles.eventAction}>{event.screen ?? "—"} · {event.action ?? event.target ?? "—"}</span></div>)}</div></section>
  </div></main>;
}
