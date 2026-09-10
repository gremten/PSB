import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import Database from "better-sqlite3";
import { schema } from "./schema";
import type { DatabaseAdapter, Query } from "./types";

declare global {
  var __psbDatabase: Database.Database | undefined;
}

export function getRuntimeDatabase(): DatabaseAdapter {
  const databasePath = process.env.PSB_DB_PATH ?? join(process.cwd(), "data", "psb-research.sqlite");
  mkdirSync(dirname(databasePath), { recursive: true });
  const database = globalThis.__psbDatabase ?? new Database(databasePath);
  if (!globalThis.__psbDatabase) {
    database.exec(schema);
    const columns = database.prepare("PRAGMA table_info(sessions)").all() as { name: string }[];
    if (!columns.some((column) => column.name === "last_seen_at")) {
      database.exec("ALTER TABLE sessions ADD COLUMN last_seen_at TEXT; ALTER TABLE sessions ADD COLUMN end_reason TEXT; UPDATE sessions SET last_seen_at = COALESCE((SELECT MAX(timestamp) FROM events WHERE session_id = sessions.id), started_at, created_at)");
    }
    globalThis.__psbDatabase = database;
  }

  return {
    async all<T>(sql: string, params: unknown[] = []): Promise<T[]> {
      return database.prepare(sql).all(...params) as T[];
    },
    async first<T>(sql: string, params: unknown[] = []): Promise<T | null> {
      return (database.prepare(sql).get(...params) as T | undefined) ?? null;
    },
    async run(sql: string, params: unknown[] = []) {
      const result = database.prepare(sql).run(...params);
      return { lastRowId: Number(result.lastInsertRowid) };
    },
    async batch(queries: Query[]): Promise<void> {
      database.transaction(() => {
        for (const { sql, params = [] } of queries) database.prepare(sql).run(...params);
      })();
    },
  };
}
