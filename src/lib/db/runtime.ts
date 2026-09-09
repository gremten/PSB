import { env as cloudflareEnv } from "cloudflare:workers";
import type { DatabaseAdapter, Query } from "./types";

interface D1Result<T> {
  results?: T[];
  meta?: { last_row_id?: number };
}

interface D1PreparedStatement {
  bind(...params: unknown[]): D1PreparedStatement;
  all<T>(): Promise<D1Result<T>>;
  first<T>(): Promise<T | null>;
  run(): Promise<D1Result<unknown>>;
}

interface D1Database {
  prepare(sql: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<D1Result<unknown>[]>;
}

export function getRuntimeDatabase(): DatabaseAdapter {
  const database = (cloudflareEnv as { PSB_DB?: D1Database }).PSB_DB;
  if (!database) throw new Error("Cloudflare D1 binding PSB_DB is not configured");

  const statement = (sql: string, params: unknown[] = []) => database.prepare(sql).bind(...params);
  return {
    async all<T>(sql: string, params: unknown[] = []): Promise<T[]> {
      return (await statement(sql, params).all<T>()).results ?? [];
    },
    async first<T>(sql: string, params: unknown[] = []): Promise<T | null> {
      return statement(sql, params).first<T>();
    },
    async run(sql: string, params: unknown[] = []) {
      const result = await statement(sql, params).run();
      return { lastRowId: result.meta?.last_row_id };
    },
    async batch(queries: Query[]): Promise<void> {
      await database.batch(queries.map(({ sql, params }) => statement(sql, params)));
    },
  };
}
