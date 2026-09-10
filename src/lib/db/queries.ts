import { randomUUID } from "node:crypto";
import { getTask } from "@/config/test-scenarios";
import { eventBus } from "@/lib/events";
import { aggregateTaskMetrics, calculateTaskMetrics } from "@/lib/testing/metrics";
import { sanitizeMetadata } from "@/lib/testing/metadata";
import { presenceCutoff } from "@/lib/testing/session-presence";
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
         started_at startedAt, ended_at endedAt, last_seen_at lastSeenAt, end_reason endReason, build_id buildId
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
    "INSERT INTO sessions (id, participant_code, variant, created_at, started_at, last_seen_at, build_id) VALUES (?, ?, 'disconnected', ?, ?, ?, ?)",
    [id, cleanName, timestamp, timestamp, timestamp, buildId()],
  );
  await insertEvent({ sessionId: id, type: "session_started", screen: "/", action: "participant.session.started" });
  return (await getSession(id))!;
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
  const result = await db.run(`
      INSERT INTO events (session_id, task_run_id, timestamp, type, screen, action, target, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      input.sessionId,
      input.taskRunId ?? null,
      timestamp,
      input.type.slice(0, 64),
      input.screen?.slice(0, 128) ?? null,
      input.action?.slice(0, 160) ?? null,
      input.target?.slice(0, 160) ?? null,
      JSON.stringify(sanitizeMetadata(input.metadata)),
    ]);
  if (input.screen && (input.type === "screen_view" || input.type === "navigation")) {
    await db.run("UPDATE research_control SET current_screen = ?, updated_at = ? WHERE session_id = ?", [
      input.screen.slice(0, 128), timestamp, input.sessionId,
    ]);
  }
  const row = await db.first<EventRow>(`${eventSelect} WHERE id = ?`, [result.lastRowId]);
  if (!row) throw new Error("Event could not be read after insert");
  const event = asEvent(row);
  eventBus.emit(`session:${input.sessionId}`, event);
  if (input.screen) await publishControl();
  return event;
}

export async function recordParticipantEvent(input: {
  eventName: string;
  sessionId?: string;
  screen?: string;
  action?: string;
  target?: string;
  metadata?: Record<string, unknown>;
}) {
  if (!input.sessionId) return null;
  const session = await heartbeatSession(input.sessionId);
  if (!session?.startedAt || session.endedAt) return null;
  return insertEvent({
    sessionId: session.id,
    type: input.eventName,
    screen: input.screen,
    action: input.action,
    target: input.target,
    metadata: input.metadata,
  });
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
  await db.run(`UPDATE sessions SET ended_at = COALESCE(last_seen_at, started_at, created_at), end_reason = 'client_timeout'
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
    { sql: "UPDATE sessions SET ended_at = ?, end_reason = 'moderator' WHERE id = ? AND ended_at IS NULL", params: [timestamp, id] },
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
