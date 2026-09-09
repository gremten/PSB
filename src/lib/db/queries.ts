import { randomUUID } from "node:crypto";
import { getTask } from "@/config/test-scenarios";
import { eventBus } from "@/lib/events";
import { aggregateTaskMetrics, calculateTaskMetrics } from "@/lib/testing/metrics";
import { sanitizeMetadata } from "@/lib/testing/metadata";
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
         started_at startedAt, ended_at endedAt, build_id buildId
  FROM sessions`;

const taskSelect = `
  SELECT id, session_id sessionId, task_code taskCode, started_at startedAt,
         ended_at endedAt, result, was_aided wasAided, ease_score easeScore,
         ease_reason easeReason, moderator_note moderatorNote, corrupted_reason corruptedReason
  FROM task_runs`;

const eventSelect = `
  SELECT id, session_id sessionId, task_run_id taskRunId, timestamp, type,
         screen, action, target, metadata FROM events`;

export function listSessions(limit = 30): ResearchSession[] {
  return getDatabase()
    .prepare(`${sessionSelect} ORDER BY created_at DESC LIMIT ?`)
    .all(limit) as unknown as SessionRow[];
}

export function getSession(id: string): ResearchSession | null {
  return (getDatabase().prepare(`${sessionSelect} WHERE id = ?`).get(id) as SessionRow | undefined) ?? null;
}

export function getTaskRun(id: string): TaskRun | null {
  const row = getDatabase().prepare(`${taskSelect} WHERE id = ?`).get(id) as TaskRunRow | undefined;
  return row ? asTaskRun(row) : null;
}

export function getSessionSnapshot(id: string, eventLimit = 500): SessionSnapshot | null {
  const session = getSession(id);
  if (!session) return null;
  const taskRuns = (
    getDatabase().prepare(`${taskSelect} WHERE session_id = ? ORDER BY started_at`).all(id) as unknown as TaskRunRow[]
  ).map(asTaskRun);
  const events = (
    getDatabase()
      .prepare(`${eventSelect} WHERE session_id = ? ORDER BY id DESC LIMIT ?`)
      .all(id, eventLimit) as unknown as EventRow[]
  )
    .reverse()
    .map(asEvent);
  return { session, taskRuns, events };
}

export function getResearchState(): ResearchSessionState {
  const row = getDatabase()
    .prepare(`
      SELECT c.session_id sessionId, c.participant_code participantCode, c.variant,
             c.current_task currentTask, c.current_task_run_id currentTaskRunId,
             c.current_screen currentScreen, c.reset_version resetVersion,
             s.started_at startedAt, s.ended_at endedAt
      FROM research_control c LEFT JOIN sessions s ON s.id = c.session_id WHERE c.id = 1
    `)
    .get() as
    | {
        sessionId: string | null;
        participantCode: string | null;
        variant: CashbackVariant;
        currentTask: string | null;
        currentTaskRunId: string | null;
        currentScreen: string;
        resetVersion: number;
        startedAt: string | null;
        endedAt: string | null;
      }
    | undefined;
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

function publishControl() {
  eventBus.emit("control", getResearchState());
}

export function createSession(participantCode: string, variant: CashbackVariant) {
  const db = getDatabase();
  const id = randomUUID();
  const timestamp = now();
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare(
      "INSERT INTO sessions (id, participant_code, variant, created_at, build_id) VALUES (?, ?, ?, ?, ?)",
    ).run(id, participantCode.trim().slice(0, 32), variant, timestamp, buildId());
    db.prepare(`
      UPDATE research_control SET session_id = ?, participant_code = ?, variant = ?,
        current_task = NULL, current_task_run_id = NULL, current_screen = '/',
        reset_version = reset_version + 1, updated_at = ? WHERE id = 1
    `).run(id, participantCode.trim().slice(0, 32), variant, timestamp);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  publishControl();
  return getSession(id)!;
}

export function startSession(id: string) {
  const session = getSession(id);
  if (!session) throw new Error("Session not found");
  if (session.endedAt) throw new Error("Session already ended");
  if (!session.startedAt) {
    getDatabase().prepare("UPDATE sessions SET started_at = ? WHERE id = ?").run(now(), id);
  }
  publishControl();
  return getSession(id)!;
}

function insertEvent(input: {
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
  const result = db
    .prepare(`
      INSERT INTO events (session_id, task_run_id, timestamp, type, screen, action, target, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      input.sessionId,
      input.taskRunId ?? null,
      timestamp,
      input.type.slice(0, 64),
      input.screen?.slice(0, 128) ?? null,
      input.action?.slice(0, 160) ?? null,
      input.target?.slice(0, 160) ?? null,
      JSON.stringify(sanitizeMetadata(input.metadata)),
    );
  if (input.screen && (input.type === "screen_view" || input.type === "navigation")) {
    db.prepare("UPDATE research_control SET current_screen = ?, updated_at = ? WHERE session_id = ?")
      .run(input.screen.slice(0, 128), timestamp, input.sessionId);
  }
  const row = db.prepare(`${eventSelect} WHERE id = ?`).get(Number(result.lastInsertRowid)) as EventRow;
  const event = asEvent(row);
  eventBus.emit(`session:${input.sessionId}`, event);
  if (input.screen) publishControl();
  return event;
}

export function recordParticipantEvent(input: {
  eventName: string;
  screen?: string;
  action?: string;
  target?: string;
  metadata?: Record<string, unknown>;
}) {
  const state = getResearchState();
  if (!state.sessionId || state.sessionStatus !== "running") return null;
  return insertEvent({
    sessionId: state.sessionId,
    taskRunId: state.currentTaskRunId,
    type: input.eventName,
    screen: input.screen,
    action: input.action,
    target: input.target,
    metadata: input.metadata,
  });
}

export function startTask(sessionId: string, taskCode: string) {
  const state = getResearchState();
  if (state.sessionId !== sessionId || state.sessionStatus !== "running") {
    throw new Error("Start the active session first");
  }
  if (state.currentTaskRunId) throw new Error("Finish the current task first");
  if (!getTask(taskCode)) throw new Error("Unknown task code");
  const id = randomUUID();
  const timestamp = now();
  getDatabase()
    .prepare("INSERT INTO task_runs (id, session_id, task_code, started_at) VALUES (?, ?, ?, ?)")
    .run(id, sessionId, taskCode, timestamp);
  getDatabase()
    .prepare(`UPDATE research_control SET current_task = ?, current_task_run_id = ?, updated_at = ? WHERE session_id = ?`)
    .run(taskCode, id, timestamp, sessionId);
  insertEvent({ sessionId, taskRunId: id, type: "task_started", action: taskCode });
  publishControl();
  return getTaskRun(id)!;
}

export function finishTask(
  taskRunId: string,
  input: {
    result: TaskResult;
    easeScore: number;
    easeReason?: string;
    moderatorNote?: string;
    corruptedReason?: string;
  },
) {
  const run = getTaskRun(taskRunId);
  if (!run || run.endedAt) throw new Error("Active task not found");
  const result = run.wasAided && input.result === "unaided" ? "aided" : input.result;
  if (result === "corrupted" && !input.corruptedReason?.trim()) {
    throw new Error("Corrupted reason is required");
  }
  const timestamp = now();
  getDatabase().prepare(`
    UPDATE task_runs SET ended_at = ?, result = ?, ease_score = ?, ease_reason = ?,
      moderator_note = ?, corrupted_reason = ? WHERE id = ?
  `).run(
    timestamp,
    result,
    Math.min(7, Math.max(1, input.easeScore)),
    input.easeReason?.trim().slice(0, 2000) || null,
    input.moderatorNote?.trim().slice(0, 4000) || run.moderatorNote,
    input.corruptedReason?.trim().slice(0, 2000) || null,
    taskRunId,
  );
  insertEvent({ sessionId: run.sessionId, taskRunId, type: "task_finished", action: result });
  getDatabase()
    .prepare(`UPDATE research_control SET current_task = NULL, current_task_run_id = NULL, updated_at = ? WHERE session_id = ?`)
    .run(timestamp, run.sessionId);
  publishControl();
  return getTaskRun(taskRunId)!;
}

export function markHint(sessionId: string) {
  const state = getResearchState();
  if (state.sessionId !== sessionId || !state.currentTaskRunId) throw new Error("No active task");
  getDatabase().prepare("UPDATE task_runs SET was_aided = 1 WHERE id = ?").run(state.currentTaskRunId);
  return insertEvent({
    sessionId,
    taskRunId: state.currentTaskRunId,
    type: "action",
    action: "moderator.hint_given",
  });
}

export function saveModeratorNote(sessionId: string, note: string) {
  const state = getResearchState();
  if (state.sessionId !== sessionId || !state.currentTaskRunId) throw new Error("No active task");
  getDatabase()
    .prepare("UPDATE task_runs SET moderator_note = ? WHERE id = ?")
    .run(note.trim().slice(0, 4000) || null, state.currentTaskRunId);
  return getTaskRun(state.currentTaskRunId)!;
}

export function resetParticipant(sessionId: string) {
  const state = getResearchState();
  if (state.sessionId !== sessionId) throw new Error("Session is not active");
  getDatabase()
    .prepare("UPDATE research_control SET reset_version = reset_version + 1, current_screen = '/', updated_at = ? WHERE session_id = ?")
    .run(now(), sessionId);
  const event = insertEvent({
    sessionId,
    taskRunId: state.currentTaskRunId,
    type: "product_state_change",
    screen: "/",
    action: "participant.state.reset",
    metadata: { variant: state.cashbackVariant },
  });
  publishControl();
  return event;
}

export function endSession(id: string) {
  const session = getSession(id);
  if (!session || session.endedAt) throw new Error("Open session not found");
  const state = getResearchState();
  if (state.sessionId === id && state.currentTaskRunId) throw new Error("Finish the current task first");
  const timestamp = now();
  getDatabase().prepare("UPDATE sessions SET ended_at = ? WHERE id = ?").run(timestamp, id);
  insertEvent({ sessionId: id, type: "action", action: "session.ended" });
  publishControl();
  return getSession(id)!;
}

export function getAggregateMetrics() {
  const runs = (
    getDatabase().prepare(`${taskSelect} WHERE ended_at IS NOT NULL AND result IS NOT NULL`).all() as unknown as TaskRunRow[]
  ).map(asTaskRun);
  const events = (
    getDatabase().prepare(`${eventSelect} WHERE task_run_id IS NOT NULL ORDER BY id`).all() as unknown as EventRow[]
  ).map(asEvent);
  return aggregateTaskMetrics(runs.map((run) => calculateTaskMetrics(run, events, getTask(run.taskCode))));
}
