ALTER TABLE sessions ADD COLUMN last_seen_at TEXT;
ALTER TABLE sessions ADD COLUMN end_reason TEXT;

UPDATE sessions SET last_seen_at = COALESCE(
  (SELECT MAX(timestamp) FROM events WHERE session_id = sessions.id), started_at, created_at
);
CREATE INDEX IF NOT EXISTS idx_sessions_presence ON sessions(ended_at, last_seen_at);
