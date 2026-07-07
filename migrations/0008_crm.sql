-- Super-admin CRM: per-customer status/tags and a human-first activity timeline.
-- Backs apps/web/src/lib/crm.ts in LIVE sessions (localStorage remains the demo
-- fallback). Written through the generic /api/data/upsert path (admin-only).

-- One row per customer (kitchen). id = kitchen_id.
CREATE TABLE IF NOT EXISTS crm_customer (
  id             TEXT PRIMARY KEY,          -- = kitchens.id
  status         TEXT,                       -- 'prospect' | 'active' | 'at_risk' | 'churned'
  tags           TEXT,                       -- JSON array of strings
  last_contacted TEXT,
  updated_at     TEXT NOT NULL
);

-- Append-only timeline: notes, calls, emails, meetings, status changes.
CREATE TABLE IF NOT EXISTS crm_activity (
  id         TEXT PRIMARY KEY,
  kitchen_id TEXT NOT NULL,
  author_id  TEXT,
  kind       TEXT NOT NULL,                  -- 'note' | 'call' | 'email' | 'meeting' | 'status'
  body       TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_crm_activity_kitchen ON crm_activity(kitchen_id, created_at DESC);
