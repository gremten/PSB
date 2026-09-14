ALTER TABLE sessions ADD COLUMN assigned_scenario TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_task_runs_active_interactive_session ON task_runs(session_id)
  WHERE ended_at IS NULL AND task_code IN ('CARD_COPY', 'CASHBACK_CONNECT', 'CASHBACK_NEXT');
