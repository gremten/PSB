import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { schema } from "./schema";
import type { DatabaseAdapter } from "./types";

let database: Database.Database;
let adapter: DatabaseAdapter;
vi.mock("./index", () => ({ getDatabase: () => adapter }));
import { assignParticipantScenario, beginParticipantScenario, createParticipantSession, deleteSession, endSession, getFullSessionSnapshot, getParticipantScenarioStatus, getSession, getSessionSnapshot, heartbeatSession, leaveParticipantScenario, listSessions, recordParticipantEaseScore, recordParticipantEvent } from "./queries";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-10T00:00:00.000Z"));
  database = new Database(":memory:");
  database.exec(schema);
  adapter = {
    async all<T>(sql: string, params: unknown[] = []) { return database.prepare(sql).all(...params) as T[]; },
    async first<T>(sql: string, params: unknown[] = []) { return (database.prepare(sql).get(...params) as T | undefined) ?? null; },
    async run(sql, params = []) { const result = database.prepare(sql).run(...params); return { lastRowId: Number(result.lastInsertRowid), changes: result.changes }; },
    async batch(queries) { database.transaction(() => { for (const { sql, params = [] } of queries) database.prepare(sql).run(...params); })(); },
  };
});
afterEach(() => { database.close(); vi.useRealTimers(); });

describe("independent participant session lifecycle", () => {
  it("keeps a named participant waiting and records only after Start", async () => {
    const session = await createParticipantSession("P-00");
    expect(session.startedAt).toBeNull();
    expect(await recordParticipantEvent({ sessionId: session.id, eventName: "tap", action: "home.account.open", target: "home.account.open" })).toBeNull();
    expect((await getSessionSnapshot(session.id))?.events).toHaveLength(0);
    await assignParticipantScenario(session.id, "CARD_COPY");
    expect((await getParticipantScenarioStatus(session.id))?.assignedScenario).toBe("CARD_COPY");
    await beginParticipantScenario(session.id);
    expect((await getParticipantScenarioStatus(session.id))?.activeScenario).toBe("CARD_COPY");
    expect(await recordParticipantEvent({ sessionId: session.id, eventName: "tap", action: "participant.scenario.start", target: "participant.scenario.start" })).toBeNull();
    expect((await getSessionSnapshot(session.id))?.events.some((event) => event.target === "participant.scenario.start")).toBe(false);
  });

  it("leaves an empty pending test without a recording", async () => {
    const session = await createParticipantSession("Skip-me");
    await assignParticipantScenario(session.id, "CARD_COPY");
    await leaveParticipantScenario(session.id);
    expect(await getSession(session.id)).toBeNull();
    expect(database.prepare("SELECT id FROM task_runs WHERE session_id = ?").all(session.id)).toHaveLength(0);
  });

  it("rejects delayed events from outside the active scenario and stores one SEQ response", async () => {
    const session = await createParticipantSession("Boundary");
    await assignParticipantScenario(session.id, "CARD_COPY");
    await beginParticipantScenario(session.id, Date.now());
    expect(await recordParticipantEvent({ sessionId: session.id, scenarioCode: null, eventName: "tap", action: "home.savings.open" })).toBeNull();
    expect(await recordParticipantEvent({ sessionId: session.id, scenarioCode: "CASHBACK_CONNECT", eventName: "tap", action: "home.cashback.open" })).toBeNull();
    expect(await recordParticipantEvent({ sessionId: session.id, scenarioCode: "CARD_COPY", eventName: "tap", action: "home.account.open", target: "home.account.open" })).not.toBeNull();
    database.prepare("UPDATE task_runs SET ended_at = ?, result = 'unaided' WHERE session_id = ?").run(new Date().toISOString(), session.id);
    expect((await recordParticipantEaseScore(session.id, 6)).easeScore).toBe(6);
    await expect(recordParticipantEaseScore(session.id, 5)).rejects.toThrow("Нет завершённого сценария без оценки");
  });

  it("completes each of the three flows separately and ends only after all three", async () => {
    const session = await createParticipantSession("P-03");
    const tap = (action: string, screen: string, metadata: Record<string, unknown> = {}) => recordParticipantEvent({ sessionId: session.id, eventName: "tap", action, target: action, screen, metadata });
    const action = (name: string, screen: string) => recordParticipantEvent({ sessionId: session.id, eventName: "action", action: name, screen });
    await expect(assignParticipantScenario(session.id, "CASHBACK_NEXT")).rejects.toThrow("Сначала подключите");

    await assignParticipantScenario(session.id, "CARD_COPY");
    await beginParticipantScenario(session.id);
    await tap("home.account.open", "/");
    await tap("account.card.salary.open", "/account");
    await tap("card.salary.flip", "/card");
    await tap("card.salary.number.copy", "/card");
    expect((await getParticipantScenarioStatus(session.id))?.activeScenario).toBe("CARD_COPY");
    await action("card.copy.toast.closed", "/card");
    expect((await getParticipantScenarioStatus(session.id))?.completedScenarios).toContain("CARD_COPY");

    await assignParticipantScenario(session.id, "CASHBACK_CONNECT");
    await beginParticipantScenario(session.id);
    await tap("home.cashback.open", "/");
    await tap("cashback.connect.start", "/cashback");
    for (const id of ["all", "flights", "taxi"]) await tap(`cashback.category.${id}.toggle`, "/cashback/categories");
    await tap("cashback.categories.confirm", "/cashback/categories", { selectedCount: 3 });
    await tap("cashback.success.close", "/");
    expect((await getParticipantScenarioStatus(session.id))?.completedScenarios).toContain("CASHBACK_CONNECT");
    expect((await getSession(session.id))?.endedAt).toBeNull();

    await assignParticipantScenario(session.id, "CASHBACK_NEXT");
    await beginParticipantScenario(session.id);
    await tap("cashback.tab.open", "/");
    await tap("cashback.next_month.categories.open", "/cashback");
    for (const id of ["delivery", "fuel", "family"]) await tap(`cashback.category.${id}.toggle`, "/cashback/categories");
    await tap("cashback.categories.confirm", "/cashback/categories", { selectedCount: 3 });
    await action("cashback.next_month.success.dismissed", "/cashback");
    const lateCloseTap = await recordParticipantEvent({ sessionId: session.id, scenarioCode: "CASHBACK_NEXT", eventName: "tap", screen: "/cashback", action: "cashback.next_month.success.close", target: "cashback.next_month.success.close" });
    expect(lateCloseTap?.metadata.scenarioVerdict).toBe("correct");
    const snapshot = await getSessionSnapshot(session.id);
    expect(snapshot?.taskRuns.map((run) => run.result)).toEqual(["unaided", "unaided", "unaided"]);
    expect(snapshot?.session.endReason).toBe("all_scenarios_completed");
    expect((await getParticipantScenarioStatus(session.id))?.ended).toBe(true);
    expect(await tap("cashback.period.year", "/cashback")).toBeNull();
  });
  it("expires only the disconnected client and freezes duration at its last presence", async () => {
    const a = await createParticipantSession("A");
    const b = await createParticipantSession("B");
    vi.setSystemTime(new Date("2026-09-10T00:01:00.000Z"));
    await heartbeatSession(b.id);
    vi.setSystemTime(new Date("2026-09-10T00:01:40.000Z"));
    const sessions = await listSessions();
    expect(sessions.find((s) => s.id === a.id)).toMatchObject({ endedAt: a.lastSeenAt, endReason: "client_timeout" });
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
    await assignParticipantScenario(session.id, "CARD_COPY");
    await beginParticipantScenario(session.id);
    await recordParticipantEvent({ sessionId: session.id, eventName: "tap", action: "account.card.primary.open" });
    await endSession(session.id);
    await endSession(session.id);
    const snapshot = await getSessionSnapshot(session.id);
    expect(snapshot?.session.endReason).toBe("moderator");
    expect(snapshot?.events.filter((event) => event.type === "tap")).toHaveLength(1);
    expect(snapshot?.events.filter((event) => event.type === "session_ended")).toHaveLength(1);
  });

  it("does not silently truncate the durable export snapshot", async () => {
    const session = await createParticipantSession("Export-all");
    await assignParticipantScenario(session.id, "CARD_COPY");
    await beginParticipantScenario(session.id);
    await recordParticipantEvent({ sessionId: session.id, eventName: "tap", action: "home.account.open" });
    await recordParticipantEvent({ sessionId: session.id, eventName: "tap", action: "account.card.primary.open" });
    expect((await getSessionSnapshot(session.id, 1))?.events).toHaveLength(1);
    expect((await getFullSessionSnapshot(session.id))?.events).toHaveLength(4);
  });

  it("deletes exactly one session with its task and events, preserving other clients", async () => {
    const a = await createParticipantSession("Delete-me");
    const b = await createParticipantSession("Keep-me");
    database.prepare("INSERT INTO task_runs (id,session_id,task_code,started_at) VALUES ('task-1',?,'A1',?)").run(a.id, a.createdAt);
    database.prepare("INSERT INTO events (session_id,task_run_id,timestamp,type) VALUES (?,'task-1',?,'tap')").run(a.id, a.createdAt);
    await deleteSession(a.id);
    expect(await getSession(a.id)).toBeNull();
    expect(database.prepare("SELECT id FROM task_runs").all()).toHaveLength(0);
    expect((await getSessionSnapshot(b.id))?.events).toHaveLength(0);
    expect((await getSession(b.id))?.endedAt).toBeNull();
  });

  it("does not fabricate task failure/success when the participant disconnects", async () => {
    const session = await createParticipantSession("Interrupted");
    await assignParticipantScenario(session.id, "CARD_COPY");
    await beginParticipantScenario(session.id);
    vi.setSystemTime(new Date("2026-09-10T00:02:00.000Z"));
    const snapshot = await getSessionSnapshot(session.id);
    expect(snapshot?.taskRuns[0]).toMatchObject({ result: "corrupted", endedAt: session.createdAt });
  });
});
