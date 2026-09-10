import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { schema } from "./schema";
import type { DatabaseAdapter } from "./types";

let database: Database.Database;
let adapter: DatabaseAdapter;
vi.mock("./index", () => ({ getDatabase: () => adapter }));
import { createParticipantSession, deleteSession, endSession, getSession, getSessionSnapshot, heartbeatSession, listSessions, recordParticipantEvent } from "./queries";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-10T00:00:00.000Z"));
  database = new Database(":memory:");
  database.exec(schema);
  adapter = {
    async all<T>(sql: string, params: unknown[] = []) { return database.prepare(sql).all(...params) as T[]; },
    async first<T>(sql: string, params: unknown[] = []) { return (database.prepare(sql).get(...params) as T | undefined) ?? null; },
    async run(sql, params = []) { return { lastRowId: Number(database.prepare(sql).run(...params).lastInsertRowid) }; },
    async batch(queries) { database.transaction(() => { for (const { sql, params = [] } of queries) database.prepare(sql).run(...params); })(); },
  };
});
afterEach(() => { database.close(); vi.useRealTimers(); });

describe("independent participant session lifecycle", () => {
  it("expires only the disconnected client and freezes duration at its last presence", async () => {
    const a = await createParticipantSession("A");
    const b = await createParticipantSession("B");
    vi.setSystemTime(new Date("2026-09-10T00:01:00.000Z"));
    await heartbeatSession(b.id);
    vi.setSystemTime(new Date("2026-09-10T00:01:40.000Z"));
    const sessions = await listSessions();
    expect(sessions.find((s) => s.id === a.id)).toMatchObject({ endedAt: a.startedAt, endReason: "client_timeout" });
    expect(sessions.find((s) => s.id === b.id)?.endedAt).toBeNull();
  });

  it("keeps a short reload connected and refuses to resurrect an expired session", async () => {
    const session = await createParticipantSession("P-01");
    vi.setSystemTime(new Date("2026-09-10T00:00:30.000Z"));
    expect((await heartbeatSession(session.id))?.endedAt).toBeNull();
    vi.setSystemTime(new Date("2026-09-10T00:02:01.000Z"));
    expect((await heartbeatSession(session.id))?.endReason).toBe("client_timeout");
    expect(await recordParticipantEvent({ sessionId: session.id, eventName: "tap", action: "late.tap" })).toBeNull();
  });

  it("ends manually, preserves recordings, and makes repeated end safe", async () => {
    const session = await createParticipantSession("P-02");
    await recordParticipantEvent({ sessionId: session.id, eventName: "tap", action: "account.card.primary.open" });
    await endSession(session.id);
    await endSession(session.id);
    const snapshot = await getSessionSnapshot(session.id);
    expect(snapshot?.session.endReason).toBe("moderator");
    expect(snapshot?.events.filter((event) => event.type === "tap")).toHaveLength(1);
    expect(snapshot?.events.filter((event) => event.type === "session_ended")).toHaveLength(1);
  });

  it("deletes exactly one session with its task and events, preserving other clients", async () => {
    const a = await createParticipantSession("Delete-me");
    const b = await createParticipantSession("Keep-me");
    database.prepare("INSERT INTO task_runs (id,session_id,task_code,started_at) VALUES ('task-1',?,'A1',?)").run(a.id, a.startedAt);
    database.prepare("INSERT INTO events (session_id,task_run_id,timestamp,type) VALUES (?,'task-1',?,'tap')").run(a.id, a.startedAt);
    await deleteSession(a.id);
    expect(await getSession(a.id)).toBeNull();
    expect(database.prepare("SELECT id FROM task_runs").all()).toHaveLength(0);
    expect((await getSessionSnapshot(b.id))?.events).toHaveLength(1);
    expect((await getSession(b.id))?.endedAt).toBeNull();
  });

  it("does not fabricate task failure/success when the participant disconnects", async () => {
    const session = await createParticipantSession("Interrupted");
    database.prepare("INSERT INTO task_runs (id,session_id,task_code,started_at) VALUES ('task-1',?,'A1',?)").run(session.id, session.startedAt);
    vi.setSystemTime(new Date("2026-09-10T00:02:00.000Z"));
    const snapshot = await getSessionSnapshot(session.id);
    expect(snapshot?.taskRuns[0]).toMatchObject({ result: "corrupted", endedAt: session.startedAt });
  });
});
