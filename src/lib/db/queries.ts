import { randomUUID } from "node:crypto";
import { getInteractiveScenario, getTask, interactiveScenarios } from "@/config/test-scenarios";
import { eventBus } from "@/lib/events";
import { sortTrackedEvents, trackedEventTime } from "@/lib/testing/event-time";
import { aggregateTaskMetrics, calculateTaskMetrics } from "@/lib/testing/metrics";
import { sanitizeMetadata } from "@/lib/testing/metadata";
import { calculateResearchSummary } from "@/lib/testing/research-summary";
import { presenceCutoff } from "@/lib/testing/session-presence";
import { classifyScenarioTap, isScenarioGateTarget, scenarioProgress } from "@/lib/testing/scenario-progress";
import type {
  CashbackVariant,
  ResearchSession,
  ResearchSessionState,
  SessionSnapshot,
  TaskResult,
  TaskRun,
  TrackedEvent,
} from "@/lib/testing/types";
import { getDatabase } from "./index";

type SessionRow = Omit<ResearchSession, "variant"> & { variant: CashbackVariant };
type TaskRunRow = Omit<TaskRun, "wasAided"> & { wasAided: number };
type ActiveParticipantRunRow = TaskRunRow & { sessionCreatedAt: string; sessionStartedAt: string; sessionLastSeenAt: string | null };
type EventRow = Omit<TrackedEvent, "metadata"> & { metadata: string };

function now() {
  return new Date().toISOString();
}

function buildId() {
  return process.env.NEXT_PUBLIC_BUILD_ID ?? process.env.PSB_BUILD_ID ?? "local-unknown";
}

function asTaskRun(row: TaskRunRow): TaskRun {
  return { ...row, wasAided: Boolean(row.wasAided) };
}

function asEvent(row: EventRow): TrackedEvent {
  let metadata: Record<string, unknown> = {};
  try {
    metadata = JSON.parse(row.metadata) as Record<string, unknown>;
  } catch {}
  return { ...row, metadata };
}

const sessionSelect = `
  SELECT id, participant_code participantCode, variant, created_at createdAt,
         started_at startedAt, ended_at endedAt, last_seen_at lastSeenAt, end_reason endReason,
         assigned_scenario assignedScenario, build_id buildId
  FROM sessions`;

const taskSelect = `
  SELECT id, session_id sessionId, task_code taskCode, started_at startedAt,
         ended_at endedAt, result, was_aided wasAided, ease_score easeScore,
         ease_reason easeReason, moderator_note moderatorNote, corrupted_reason corruptedReason
  FROM task_runs`;

const eventSelect = `
  SELECT id, session_id sessionId, task_run_id taskRunId, timestamp, type,
         screen, action, target, metadata FROM events`;

export async function listSessions(limit = 30): Promise<ResearchSession[]> {
  await expireDisconnectedSessions();
  return getDatabase().all<SessionRow>(`${sessionSelect} ORDER BY created_at DESC LIMIT ?`, [limit]);
}

export async function getSession(id: string): Promise<ResearchSession | null> {
  return getDatabase().first<SessionRow>(`${sessionSelect} WHERE id = ?`, [id]);
}

export async function getTaskRun(id: string): Promise<TaskRun | null> {
  const row = await getDatabase().first<TaskRunRow>(`${taskSelect} WHERE id = ?`, [id]);
  return row ? asTaskRun(row) : null;
}

export async function getSessionSnapshot(id: string, eventLimit = 500): Promise<SessionSnapshot | null> {
  await expireDisconnectedSessions(id);
  const session = await getSession(id);
  if (!session) return null;
  const taskRuns = (await getDatabase().all<TaskRunRow>(`${taskSelect} WHERE session_id = ? ORDER BY started_at`, [id])).map(asTaskRun);
  const events = (await getDatabase().all<EventRow>(`${eventSelect} WHERE session_id = ? ORDER BY id DESC LIMIT ?`, [id, eventLimit])).reverse().map(asEvent);
  return { session, taskRuns, events };
}

/** Full, ordered snapshot for durable exports. Live moderator reads stay bounded. */
export async function getFullSessionSnapshot(id: string): Promise<SessionSnapshot | null> {
  await expireDisconnectedSessions(id);
  const session = await getSession(id);
  if (!session) return null;
  const taskRuns = (await getDatabase().all<TaskRunRow>(`${taskSelect} WHERE session_id = ? ORDER BY started_at`, [id])).map(asTaskRun);
  const events = (await getDatabase().all<EventRow>(`${eventSelect} WHERE session_id = ? ORDER BY id`, [id])).map(asEvent);
  return { session, taskRuns, events };
}

export async function getResearchState(): Promise<ResearchSessionState> {
  const row = await getDatabase().first<{
        sessionId: string | null;
        participantCode: string | null;
        variant: CashbackVariant;
        currentTask: string | null;
        currentTaskRunId: string | null;
        currentScreen: string;
        resetVersion: number;
        startedAt: string | null;
        endedAt: string | null;
      }>(`
      SELECT c.session_id sessionId, c.participant_code participantCode, c.variant,
             c.current_task currentTask, c.current_task_run_id currentTaskRunId,
             c.current_screen currentScreen, c.reset_version resetVersion,
             s.started_at startedAt, s.ended_at endedAt
      FROM research_control c LEFT JOIN sessions s ON s.id = c.session_id WHERE c.id = 1
    `);
  if (!row) {
    return {
      cashbackVariant: "disconnected",
      sessionId: null,
      participantCode: null,
      currentTask: null,
      currentTaskRunId: null,
      currentScreen: "/",
      resetVersion: 0,
      sessionStatus: "idle",
    };
  }
  const sessionStatus = !row.sessionId
    ? "idle"
    : row.endedAt
      ? "ended"
      : row.startedAt
        ? "running"
        : "draft";
  return {
    cashbackVariant: row.variant,
    sessionId: row.sessionId,
    participantCode: row.participantCode,
    currentTask: row.currentTask,
    currentTaskRunId: row.currentTaskRunId,
    currentScreen: row.currentScreen,
    resetVersion: row.resetVersion,
    sessionStatus,
  };
}

async function publishControl() {
  eventBus.emit("control", await getResearchState());
}

export async function createSession(participantCode: string, variant: CashbackVariant) {
  const db = getDatabase();
  const id = randomUUID();
  const timestamp = now();
  const cleanCode = participantCode.trim().slice(0, 32);
  await db.batch([
    {
      sql: "INSERT INTO sessions (id, participant_code, variant, created_at, build_id) VALUES (?, ?, ?, ?, ?)",
      params: [id, cleanCode, variant, timestamp, buildId()],
    },
    {
      sql: `UPDATE research_control SET session_id = ?, participant_code = ?, variant = ?,
        current_task = NULL, current_task_run_id = NULL, current_screen = '/',
        reset_version = reset_version + 1, updated_at = ? WHERE id = 1`,
      params: [id, cleanCode, variant, timestamp],
    },
  ]);
  await publishControl();
  return (await getSession(id))!;
}

export async function createParticipantSession(participantName: string) {
  const id = randomUUID();
  const timestamp = now();
  const cleanName = participantName.trim().replace(/\s+/g, " ").slice(0, 32);
  if (!cleanName) throw new Error("Укажите имя или псевдоним");
  await getDatabase().run(
    "INSERT INTO sessions (id, participant_code, variant, created_at, last_seen_at, build_id) VALUES (?, ?, 'disconnected', ?, ?, ?)",
    [id, cleanName, timestamp, timestamp, buildId()],
  );
  return (await getSession(id))!;
}

export async function getParticipantScenarioStatus(id: string, expire = true) {
  if (expire) await expireDisconnectedSessions(id);
  const session = await getSession(id);
  if (!session) return null;
  const runs = (await getDatabase().all<TaskRunRow>(`${taskSelect} WHERE session_id = ? ORDER BY started_at`, [id])).map(asTaskRun);
  return {
    assignedScenario: session.assignedScenario ?? null,
    activeScenario: runs.find((run) => !run.endedAt)?.taskCode ?? null,
    completedScenarios: runs.filter((run) => run.result === "unaided" || run.result === "aided").map((run) => run.taskCode),
    ended: Boolean(session.endedAt),
    endReason: session.endReason ?? null,
  };
}

export async function recordParticipantEaseScore(id: string, easeScore: number) {
  if (!Number.isInteger(easeScore) || easeScore < 1 || easeScore > 7) throw new Error("Оценка должна быть от 1 до 7");
  const session = await getSession(id);
  if (!session) throw new Error("Сессия не найдена");
  const run = await getDatabase().first<TaskRunRow>(`${taskSelect}
    WHERE session_id = ? AND ended_at IS NOT NULL AND result IN ('unaided', 'aided') AND ease_score IS NULL
    ORDER BY ended_at DESC LIMIT 1`, [id]);
  if (!run) throw new Error("Нет завершённого сценария без оценки");
  const update = await getDatabase().run("UPDATE task_runs SET ease_score = ? WHERE id = ? AND ease_score IS NULL", [easeScore, run.id]);
  if (update.changes === 0) throw new Error("Оценка уже сохранена");
  return asTaskRun({ ...run, easeScore });
}

export async function assignParticipantScenario(id: string, code: string) {
  if (!getInteractiveScenario(code)) throw new Error("Неизвестный сценарий");
  const snapshot = await getSessionSnapshot(id);
  if (!snapshot || snapshot.session.endedAt) throw new Error("Сессия завершена");
  if (snapshot.taskRuns.some((run) => !run.endedAt)) throw new Error("Сценарий уже выполняется");
  if (snapshot.taskRuns.some((run) => run.taskCode === code && (run.result === "unaided" || run.result === "aided"))) throw new Error("Сценарий уже пройден");
  if (code === "CASHBACK_NEXT" && !snapshot.taskRuns.some((run) => run.taskCode === "CASHBACK_CONNECT" && (run.result === "unaided" || run.result === "aided"))) {
    throw new Error("Сначала подключите кешбэк в предыдущем сценарии");
  }
  await getDatabase().run("UPDATE sessions SET assigned_scenario = ? WHERE id = ? AND ended_at IS NULL", [code, id]);
  return getParticipantScenarioStatus(id, false);
}

export async function beginParticipantScenario(id: string, clientTimeMs?: number) {
  const snapshot = await getSessionSnapshot(id);
  if (!snapshot || snapshot.session.endedAt || !snapshot.session.assignedScenario) throw new Error("Сценарий пока не назначен");
  if (snapshot.taskRuns.some((run) => !run.endedAt)) throw new Error("Сценарий уже начат");
  const code = snapshot.session.assignedScenario;
  if (!getInteractiveScenario(code)) throw new Error("Неизвестный сценарий");
  const runId = randomUUID();
  const timestamp = now();
  await getDatabase().batch([
    { sql: "INSERT INTO task_runs (id, session_id, task_code, started_at) SELECT ?, id, ?, ? FROM sessions WHERE id = ? AND assigned_scenario = ? AND ended_at IS NULL", params: [runId, code, timestamp, id, code] },
    { sql: "UPDATE sessions SET started_at = COALESCE(started_at, ?), assigned_scenario = NULL WHERE id = ? AND assigned_scenario = ? AND ended_at IS NULL AND EXISTS (SELECT 1 FROM task_runs WHERE id = ?)", params: [timestamp, id, code, runId] },
  ]);
  if (!await getTaskRun(runId)) throw new Error("Сценарий больше не назначен");
  if (!snapshot.session.startedAt) await insertEvent({ sessionId: id, type: "session_started", screen: "/", action: "participant.session.started" });
  await insertEvent({ sessionId: id, taskRunId: runId, type: "task_started", screen: "/", action: code, metadata: Number.isFinite(clientTimeMs) ? { clientTimeMs } : undefined });
  return getParticipantScenarioStatus(id, false);
}

export async function leaveParticipantScenario(id: string) {
  const snapshot = await getSessionSnapshot(id);
  if (!snapshot || snapshot.session.endedAt) return;
  if (!snapshot.taskRuns.length) {
    await deleteSession(id);
    return;
  }
  const timestamp = now();
  await getDatabase().batch([
    { sql: "UPDATE sessions SET ended_at = ?, end_reason = 'participant_exit', assigned_scenario = NULL WHERE id = ? AND ended_at IS NULL", params: [timestamp, id] },
    { sql: "UPDATE task_runs SET ended_at = ?, result = 'corrupted', corrupted_reason = 'Участник вышел из теста' WHERE session_id = ? AND ended_at IS NULL", params: [timestamp, id] },
  ]);
  await insertEvent({ sessionId: id, type: "session_ended", action: "session.ended.participant_exit" });
}

export async function startSession(id: string) {
  const session = await getSession(id);
  if (!session) throw new Error("Session not found");
  if (session.endedAt) throw new Error("Session already ended");
  if (!session.startedAt) {
    await getDatabase().run("UPDATE sessions SET started_at = ? WHERE id = ?", [now(), id]);
  }
  await publishControl();
  return (await getSession(id))!;
}

async function insertEvent(input: {
  sessionId: string;
  taskRunId?: string | null;
  type: string;
  screen?: string | null;
  action?: string | null;
  target?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const db = getDatabase();
  const timestamp = now();
  const metadata = sanitizeMetadata(input.metadata);
  const type = input.type.slice(0, 64);
  const screen = input.screen?.slice(0, 128) ?? null;
  const action = input.action?.slice(0, 160) ?? null;
  const target = input.target?.slice(0, 160) ?? null;
  const result = await db.run(`
      INSERT INTO events (session_id, task_run_id, timestamp, type, screen, action, target, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      input.sessionId,
      input.taskRunId ?? null,
      timestamp,
      type,
      screen,
      action,
      target,
      JSON.stringify(metadata),
    ]);
  const controlChanged = Boolean(input.screen && (input.type === "screen_view" || input.type === "navigation"));
  if (controlChanged && input.screen) {
    await db.run("UPDATE research_control SET current_screen = ?, updated_at = ? WHERE session_id = ?", [
      input.screen.slice(0, 128), timestamp, input.sessionId,
    ]);
  }
  if (typeof result.lastRowId !== "number") throw new Error("Event id was not returned after insert");
  const event: TrackedEvent = { id: result.lastRowId, sessionId: input.sessionId, taskRunId: input.taskRunId ?? null, timestamp, type, screen, action, target, metadata };
  eventBus.emit(`session:${input.sessionId}`, event);
  if (controlChanged) await publishControl();
  return event;
}

export async function recordParticipantEvent(input: {
  eventName: string;
  sessionId?: string;
  scenarioCode?: string | null;
  screen?: string;
  action?: string;
  target?: string;
  metadata?: Record<string, unknown>;
}) {
  if (!input.sessionId) return null;
  // The click that starts recording races the start request over the network.
  // It belongs to the gate, never to the newly created scenario run.
  if (input.eventName === "tap" && isScenarioGateTarget(input.target ?? input.action)) return null;
  let runRow = await getDatabase().first<ActiveParticipantRunRow>(`
    SELECT tr.id, tr.session_id sessionId, tr.task_code taskCode, tr.started_at startedAt,
      tr.ended_at endedAt, tr.result, tr.was_aided wasAided, tr.ease_score easeScore,
      tr.ease_reason easeReason, tr.moderator_note moderatorNote, tr.corrupted_reason corruptedReason,
      s.created_at sessionCreatedAt, s.started_at sessionStartedAt, s.last_seen_at sessionLastSeenAt
    FROM task_runs tr JOIN sessions s ON s.id = tr.session_id
    WHERE s.id = ? AND s.started_at IS NOT NULL AND s.ended_at IS NULL AND tr.ended_at IS NULL
    ORDER BY tr.started_at DESC LIMIT 1`, [input.sessionId]);
  const lateTerminalTapScenario = input.eventName === "tap" && input.target ? ({
    "cashback.success.close": "CASHBACK_CONNECT",
    "cashback.success.drag": "CASHBACK_CONNECT",
    "cashback.next_month.success.close": "CASHBACK_NEXT",
    "cashback.next_month.success.drag": "CASHBACK_NEXT",
  } as Partial<Record<string, string>>)[input.target] : undefined;
  if ((!runRow || (input.scenarioCode !== undefined && input.scenarioCode !== runRow.taskCode))
    && lateTerminalTapScenario && input.scenarioCode === lateTerminalTapScenario) {
    const completedRun = await getDatabase().first<ActiveParticipantRunRow>(`
      SELECT tr.id, tr.session_id sessionId, tr.task_code taskCode, tr.started_at startedAt,
        tr.ended_at endedAt, tr.result, tr.was_aided wasAided, tr.ease_score easeScore,
        tr.ease_reason easeReason, tr.moderator_note moderatorNote, tr.corrupted_reason corruptedReason,
        s.created_at sessionCreatedAt, s.started_at sessionStartedAt, s.last_seen_at sessionLastSeenAt
      FROM task_runs tr JOIN sessions s ON s.id = tr.session_id
      WHERE s.id = ? AND tr.task_code = ? AND tr.ended_at IS NOT NULL AND tr.result IN ('unaided', 'aided')
      ORDER BY tr.ended_at DESC LIMIT 1`, [input.sessionId, lateTerminalTapScenario]);
    const endedAt = completedRun?.endedAt ? new Date(completedRun.endedAt).getTime() : 0;
    if (completedRun && Math.abs(Date.now() - endedAt) <= 10_000) runRow = completedRun;
  }
  if (!runRow) return null;
  if ((runRow.sessionLastSeenAt ?? runRow.sessionStartedAt ?? runRow.sessionCreatedAt) < presenceCutoff()) {
    await expireDisconnectedSessions(input.sessionId);
    return null;
  }
  if (input.scenarioCode !== undefined && input.scenarioCode !== runRow.taskCode) return null;
  if (runRow.endedAt) {
    const metadata = { ...input.metadata, scenarioVerdict: "correct" };
    return insertEvent({ sessionId: input.sessionId, taskRunId: runRow.id, type: input.eventName, screen: input.screen, action: input.action, target: input.target, metadata });
  }
  await getDatabase().run("UPDATE sessions SET last_seen_at = ? WHERE id = ? AND ended_at IS NULL", [now(), input.sessionId]);
  const capturedAt = Number(input.metadata?.clientTimeMs);
  const scenario = getInteractiveScenario(runRow.taskCode);
  const affectsScenarioProgress = input.eventName === "tap" || input.eventName === "action" || input.eventName === "product_state_change";
  const prior = scenario && affectsScenarioProgress
    ? (await getDatabase().all<EventRow>(`${eventSelect} WHERE task_run_id = ? AND type IN ('tap', 'action', 'product_state_change') ORDER BY id`, [runRow.id])).map(asEvent)
    : [];
  const priorAtCapture = Number.isFinite(capturedAt)
    ? prior.filter((event) => trackedEventTime(event) <= capturedAt)
    : prior;
  const metadata = { ...input.metadata };
  if (scenario && input.eventName === "tap" && input.target) {
    metadata.scenarioVerdict = classifyScenarioTap(scenario.code, sortTrackedEvents(priorAtCapture), input.target, metadata, input.screen);
  }
  const event = await insertEvent({
    sessionId: input.sessionId,
    taskRunId: runRow.id,
    type: input.eventName,
    screen: input.screen,
    action: input.action,
    target: input.target,
    metadata,
  });
  if (scenario && affectsScenarioProgress && scenarioProgress(scenario.code, sortTrackedEvents([...prior, event])).completed) {
    await finishParticipantScenario(asTaskRun(runRow), capturedAt);
  }
  return event;
}

async function finishParticipantScenario(run: TaskRun, clientTimeMs?: number) {
  if (run.endedAt || !getInteractiveScenario(run.taskCode)) return;
  const timestamp = now();
  const update = await getDatabase().run("UPDATE task_runs SET ended_at = ?, result = 'unaided' WHERE id = ? AND ended_at IS NULL", [timestamp, run.id]);
  if (update.changes === 0) return;
  await insertEvent({ sessionId: run.sessionId, taskRunId: run.id, type: "task_finished", action: run.taskCode, metadata: Number.isFinite(clientTimeMs) ? { clientTimeMs: Number(clientTimeMs) + 1 } : undefined });
  const completed = await getDatabase().all<{ taskCode: string }>("SELECT task_code taskCode FROM task_runs WHERE session_id = ? AND result IN ('unaided', 'aided')", [run.sessionId]);
  if (interactiveScenarios.every((scenario) => completed.some((item) => item.taskCode === scenario.code))) {
    await getDatabase().run("UPDATE sessions SET ended_at = ?, end_reason = 'all_scenarios_completed', assigned_scenario = NULL WHERE id = ? AND ended_at IS NULL", [timestamp, run.sessionId]);
    await insertEvent({ sessionId: run.sessionId, type: "session_ended", action: "session.ended.all_scenarios_completed" });
  }
}

export async function startTask(sessionId: string, taskCode: string) {
  const state = await getResearchState();
  if (state.sessionId !== sessionId || state.sessionStatus !== "running") {
    throw new Error("Start the active session first");
  }
  if (state.currentTaskRunId) throw new Error("Finish the current task first");
  if (!getTask(taskCode)) throw new Error("Unknown task code");
  const id = randomUUID();
  const timestamp = now();
  await getDatabase().batch([
    {
      sql: "INSERT INTO task_runs (id, session_id, task_code, started_at) VALUES (?, ?, ?, ?)",
      params: [id, sessionId, taskCode, timestamp],
    },
    {
      sql: "UPDATE research_control SET current_task = ?, current_task_run_id = ?, updated_at = ? WHERE session_id = ?",
      params: [taskCode, id, timestamp, sessionId],
    },
  ]);
  await insertEvent({ sessionId, taskRunId: id, type: "task_started", action: taskCode });
  await publishControl();
  return (await getTaskRun(id))!;
}

export async function finishTask(
  taskRunId: string,
  input: {
    result: TaskResult;
    easeScore: number;
    easeReason?: string;
    moderatorNote?: string;
    corruptedReason?: string;
  },
) {
  const run = await getTaskRun(taskRunId);
  if (!run || run.endedAt) throw new Error("Active task not found");
  const result = run.wasAided && input.result === "unaided" ? "aided" : input.result;
  if (result === "corrupted" && !input.corruptedReason?.trim()) {
    throw new Error("Corrupted reason is required");
  }
  const timestamp = now();
  await getDatabase().run(`
    UPDATE task_runs SET ended_at = ?, result = ?, ease_score = ?, ease_reason = ?,
      moderator_note = ?, corrupted_reason = ? WHERE id = ?
  `, [
    timestamp,
    result,
    Math.min(7, Math.max(1, input.easeScore)),
    input.easeReason?.trim().slice(0, 2000) || null,
    input.moderatorNote?.trim().slice(0, 4000) || run.moderatorNote,
    input.corruptedReason?.trim().slice(0, 2000) || null,
    taskRunId,
  ]);
  await insertEvent({ sessionId: run.sessionId, taskRunId, type: "task_finished", action: result });
  await getDatabase().run("UPDATE research_control SET current_task = NULL, current_task_run_id = NULL, updated_at = ? WHERE session_id = ?", [timestamp, run.sessionId]);
  await publishControl();
  return (await getTaskRun(taskRunId))!;
}

export async function markHint(sessionId: string) {
  const state = await getResearchState();
  if (state.sessionId !== sessionId || !state.currentTaskRunId) throw new Error("No active task");
  await getDatabase().run("UPDATE task_runs SET was_aided = 1 WHERE id = ?", [state.currentTaskRunId]);
  return insertEvent({
    sessionId,
    taskRunId: state.currentTaskRunId,
    type: "action",
    action: "moderator.hint_given",
  });
}

export async function saveModeratorNote(sessionId: string, note: string) {
  const state = await getResearchState();
  if (state.sessionId !== sessionId || !state.currentTaskRunId) throw new Error("No active task");
  await getDatabase().run("UPDATE task_runs SET moderator_note = ? WHERE id = ?", [
    note.trim().slice(0, 4000) || null, state.currentTaskRunId,
  ]);
  return (await getTaskRun(state.currentTaskRunId))!;
}

export async function resetParticipant(sessionId: string) {
  const state = await getResearchState();
  if (state.sessionId !== sessionId) throw new Error("Session is not active");
  await getDatabase().run("UPDATE research_control SET reset_version = reset_version + 1, current_screen = '/', updated_at = ? WHERE session_id = ?", [now(), sessionId]);
  const event = await insertEvent({
    sessionId,
    taskRunId: state.currentTaskRunId,
    type: "product_state_change",
    screen: "/",
    action: "participant.state.reset",
    metadata: { variant: state.cashbackVariant },
  });
  await publishControl();
  return event;
}

export async function expireDisconnectedSessions(id?: string) {
  const db = getDatabase();
  const idFilter = id ? " AND id = ?" : "";
  await db.run(`UPDATE sessions SET ended_at = COALESCE(last_seen_at, started_at, created_at), end_reason = 'client_timeout', assigned_scenario = NULL
    WHERE ended_at IS NULL AND COALESCE(last_seen_at, started_at, created_at) < ?${idFilter}`,
  id ? [presenceCutoff(), id] : [presenceCutoff()]);
  await db.run(`UPDATE task_runs SET ended_at = (SELECT ended_at FROM sessions WHERE id = task_runs.session_id),
    result = 'corrupted', corrupted_reason = 'Клиент отключился до завершения задачи'
    WHERE ended_at IS NULL AND session_id IN (SELECT id FROM sessions WHERE ended_at IS NOT NULL AND end_reason = 'client_timeout'${idFilter})`, id ? [id] : []);
}

export async function heartbeatSession(id: string) {
  await expireDisconnectedSessions(id);
  await getDatabase().run("UPDATE sessions SET last_seen_at = ? WHERE id = ? AND ended_at IS NULL", [now(), id]);
  return getSession(id);
}

export async function endSession(id: string) {
  const session = await getSession(id);
  if (!session) throw new Error("Session not found");
  if (session.endedAt) return session;
  const timestamp = now();
  await getDatabase().batch([
    { sql: "UPDATE sessions SET ended_at = ?, end_reason = 'moderator', assigned_scenario = NULL WHERE id = ? AND ended_at IS NULL", params: [timestamp, id] },
    { sql: "UPDATE task_runs SET ended_at = ?, result = 'corrupted', corrupted_reason = 'Сессия завершена модератором' WHERE session_id = ? AND ended_at IS NULL", params: [timestamp, id] },
    { sql: "UPDATE research_control SET current_task = NULL, current_task_run_id = NULL, updated_at = ? WHERE session_id = ?", params: [timestamp, id] },
  ]);
  await insertEvent({ sessionId: id, type: "session_ended", action: "session.ended.moderator" });
  await publishControl();
  return (await getSession(id))!;
}

export async function deleteSession(id: string) {
  // Atomic, explicit child-first deletion: foreign keys intentionally use RESTRICT.
  await getDatabase().batch([
    { sql: "DELETE FROM events WHERE session_id = ?", params: [id] },
    { sql: "DELETE FROM task_runs WHERE session_id = ?", params: [id] },
    { sql: "UPDATE research_control SET session_id = NULL, participant_code = NULL, current_task = NULL, current_task_run_id = NULL, updated_at = ? WHERE session_id = ?", params: [now(), id] },
    { sql: "DELETE FROM sessions WHERE id = ?", params: [id] },
  ]);
}

export async function getAggregateMetrics() {
  const runs = (await getDatabase().all<TaskRunRow>(`${taskSelect} WHERE ended_at IS NOT NULL AND result IS NOT NULL`)).map(asTaskRun);
  const events = (await getDatabase().all<EventRow>(`${eventSelect} WHERE task_run_id IS NOT NULL ORDER BY id`)).map(asEvent);
  return aggregateTaskMetrics(runs.map((run) => calculateTaskMetrics(run, events, getTask(run.taskCode))));
}

export async function getResearchSummary() {
  await expireDisconnectedSessions();
  const sessions = await getDatabase().all<SessionRow>(`${sessionSelect} WHERE started_at IS NOT NULL ORDER BY created_at`);
  const runs = (await getDatabase().all<TaskRunRow>(`${taskSelect} ORDER BY started_at`)).map(asTaskRun);
  const events = (await getDatabase().all<EventRow>(`${eventSelect} WHERE type IN ('tap', 'task_started', 'task_finished') ORDER BY id`)).map(asEvent);
  return calculateResearchSummary(sessions, runs, events);
}
