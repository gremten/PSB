export const schema = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  participant_code TEXT NOT NULL,
  variant TEXT NOT NULL CHECK (variant IN ('connected', 'disconnected')),
  created_at TEXT NOT NULL,
  started_at TEXT,
  ended_at TEXT,
  build_id TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS task_runs (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE RESTRICT,
  task_code TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  result TEXT CHECK (result IN ('unaided', 'aided', 'failed', 'corrupted')),
  was_aided INTEGER NOT NULL DEFAULT 0,
  ease_score INTEGER CHECK (ease_score BETWEEN 1 AND 7),
  ease_reason TEXT,
  moderator_note TEXT,
  corrupted_reason TEXT
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE RESTRICT,
  task_run_id TEXT REFERENCES task_runs(id) ON DELETE SET NULL,
  timestamp TEXT NOT NULL,
  type TEXT NOT NULL,
  screen TEXT,
  action TEXT,
  target TEXT,
  metadata TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS research_control (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  session_id TEXT,
  participant_code TEXT,
  variant TEXT NOT NULL DEFAULT 'disconnected',
  current_task TEXT,
  current_task_run_id TEXT,
  current_screen TEXT NOT NULL DEFAULT '/',
  reset_version INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

INSERT OR IGNORE INTO research_control (id, updated_at) VALUES (1, datetime('now'));

CREATE INDEX IF NOT EXISTS idx_task_runs_session ON task_runs(session_id, started_at);
CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id, id);
CREATE INDEX IF NOT EXISTS idx_events_task_run ON events(task_run_id, id);
`;
