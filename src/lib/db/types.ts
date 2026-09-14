export type Query = { sql: string; params?: unknown[] };
export type RunResult = { lastRowId?: number; changes?: number };

export interface DatabaseAdapter {
  all<T>(sql: string, params?: unknown[]): Promise<T[]>;
  first<T>(sql: string, params?: unknown[]): Promise<T | null>;
  run(sql: string, params?: unknown[]): Promise<RunResult>;
  batch(queries: Query[]): Promise<void>;
}
