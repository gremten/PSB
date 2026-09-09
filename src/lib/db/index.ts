import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import Database from "better-sqlite3";
import { schema } from "./schema";

declare global {
  var __psbDatabase: Database.Database | undefined;
}

export function getDatabase() {
  if (globalThis.__psbDatabase) return globalThis.__psbDatabase;
  const databasePath = process.env.PSB_DB_PATH ?? join(process.cwd(), "data", "psb-research.sqlite");
  mkdirSync(dirname(databasePath), { recursive: true });
  const database = new Database(databasePath);
  database.exec(schema);
  globalThis.__psbDatabase = database;
  return database;
}
