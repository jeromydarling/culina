-- Membership invitations: convert an inquiry into a member, even before they
-- have an account. Accepted at sign-up via a single-use token (hash stored).
CREATE TABLE IF NOT EXISTS invites (
  id TEXT PRIMARY KEY,
  kitchen_id TEXT NOT NULL,
  lead_id TEXT,
  email TEXT NOT NULL,
  full_name TEXT,
  business_name TEXT,
  membership_type TEXT NOT NULL DEFAULT 'monthly',
  token_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',   -- pending | accepted | expired
  expires_at TEXT NOT NULL,
  membership_id TEXT,
  created_at TEXT NOT NULL,
  accepted_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_invites_hash ON invites(token_hash);
CREATE INDEX IF NOT EXISTS idx_invites_email ON invites(email);
