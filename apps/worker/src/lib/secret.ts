import { type Env } from './http';

let cached: string | null = null;

/**
 * Resolve the JWT signing secret. Priority:
 *  1) AUTH_SECRET worker secret (best — set with `wrangler secret put`)
 *  2) a per-deployment secret generated once and stored in D1 (app_secrets)
 * Never falls back to a hardcoded literal in production.
 */
export async function getAuthSecret(env: Env): Promise<string> {
  if (cached) return cached;
  if (env.AUTH_SECRET && env.AUTH_SECRET.length >= 16) {
    cached = env.AUTH_SECRET;
    return cached;
  }
  if (!env.DB) {
    // Local dev without D1 — ephemeral, not used in production.
    cached = 'dev-only-ephemeral-secret';
    return cached;
  }
  const row = await env.DB.prepare("SELECT value FROM app_secrets WHERE key = 'auth_secret'").first<{ value: string }>();
  if (row?.value) {
    cached = row.value;
    return cached;
  }
  const secret = crypto.randomUUID() + crypto.randomUUID();
  await env.DB.prepare("INSERT OR IGNORE INTO app_secrets (key, value, created_at) VALUES ('auth_secret', ?, ?)")
    .bind(secret, new Date().toISOString())
    .run();
  const again = await env.DB.prepare("SELECT value FROM app_secrets WHERE key = 'auth_secret'").first<{ value: string }>();
  cached = again?.value ?? secret;
  return cached;
}
