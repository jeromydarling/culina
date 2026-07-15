import { type Env } from './http';

/**
 * Per-identity daily quota for the AI/image endpoints (spend guard + abuse
 * protection). Identity is the user id when authenticated, else "ip:<addr>".
 * Returns true if the call is allowed (and records it).
 */
export async function checkAiQuota(env: Env, identity: string, limit: number): Promise<boolean> {
  if (!env.DB) return true;
  const day = new Date().toISOString().slice(0, 10);
  await env.DB.prepare(
    'INSERT INTO ai_usage (identity, day, count) VALUES (?, ?, 1) ON CONFLICT(identity, day) DO UPDATE SET count = count + 1',
  )
    .bind(identity, day)
    .run();
  const row = await env.DB.prepare('SELECT count FROM ai_usage WHERE identity = ? AND day = ?')
    .bind(identity, day)
    .first<{ count: number }>();
  return (row?.count ?? 0) <= limit;
}

/* ── Hourly limiter for auth endpoints (brute-force / abuse guard) ──────────
 * Reuses the ai_usage table with an hour-granular bucket in the `day` column
 * ("YYYY-MM-DDTHH"), so no new schema is needed. check* is read-only so a
 * successful login never counts against the caller; bump* records a strike. */
const hourBucket = () => new Date().toISOString().slice(0, 13);

/** True if `identity` is still under `limit` strikes this hour. */
export async function underHourlyLimit(env: Env, identity: string, limit: number): Promise<boolean> {
  if (!env.DB) return true;
  const row = await env.DB.prepare('SELECT count FROM ai_usage WHERE identity = ? AND day = ?')
    .bind(identity, hourBucket())
    .first<{ count: number }>();
  return (row?.count ?? 0) < limit;
}

/** Record a strike against `identity` for this hour (e.g. a failed login). */
export async function bumpHourlyLimit(env: Env, identity: string): Promise<void> {
  if (!env.DB) return;
  await env.DB.prepare(
    'INSERT INTO ai_usage (identity, day, count) VALUES (?, ?, 1) ON CONFLICT(identity, day) DO UPDATE SET count = count + 1',
  )
    .bind(identity, hourBucket())
    .run();
}
