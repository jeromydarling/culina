-- Hardening: server-managed auth secret + AI usage metering (spend guard).

CREATE TABLE IF NOT EXISTS app_secrets (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ai_usage (
  identity   TEXT NOT NULL,   -- user id, or "ip:<addr>" for anonymous
  day        TEXT NOT NULL,   -- YYYY-MM-DD (UTC)
  count      INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (identity, day)
);
