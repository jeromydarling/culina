-- Observability: captured client + server errors.
CREATE TABLE IF NOT EXISTS error_logs (
  id         TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  source     TEXT,            -- 'client' | 'server'
  message    TEXT,
  stack      TEXT,
  url        TEXT,
  user_id    TEXT,
  incident   TEXT
);
CREATE INDEX IF NOT EXISTS idx_error_logs_created ON error_logs(created_at);
