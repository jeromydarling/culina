-- Super-admin CRM: follow-up tasks / reminders per customer.
-- Backs the "Follow-ups" surface in the CRM (never drop a customer). Admin-only
-- writes via the generic /api/data/upsert path.
CREATE TABLE IF NOT EXISTS crm_task (
  id         TEXT PRIMARY KEY,
  kitchen_id TEXT NOT NULL,
  title      TEXT NOT NULL,
  due_date   TEXT,                 -- YYYY-MM-DD (nullable = no due date)
  done       INTEGER NOT NULL DEFAULT 0,
  author_id  TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_crm_task_open ON crm_task(done, due_date);
