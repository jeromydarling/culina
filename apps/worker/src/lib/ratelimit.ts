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
