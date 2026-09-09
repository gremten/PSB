import { getRuntimeDatabase } from "@/lib/db/runtime";

export type { DatabaseAdapter, Query, RunResult } from "./types";
export const getDatabase = getRuntimeDatabase;
