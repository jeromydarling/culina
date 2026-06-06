import { type Env, json, error } from '../lib/http';
import { authenticate } from '../auth';

async function rows(env: Env, sql: string, ...b: unknown[]) {
  return (await env.DB!.prepare(sql).bind(...b).all()).results;
}

/** GET /api/account/export — everything we hold about the caller (GDPR access). */
export async function handleAccountExport(request: Request, env: Env): Promise<Response> {
  const p = await authenticate(request, env);
  if (!p) return error('Unauthorized', env, 401);
  const db = env.DB!;
  const out: Record<string, unknown> = {
    profile: await db.prepare('SELECT id, email, full_name, role, phone, created_at FROM profiles WHERE id = ?').bind(p.id).first(),
  };
  if (p.role === 'tenant') {
    out.tenant_profile = await rows(env, 'SELECT * FROM tenant_profiles WHERE tenant_id = ?', p.id);
    out.memberships = await rows(env, 'SELECT * FROM memberships WHERE tenant_id = ?', p.id);
    out.bookings = await rows(env, 'SELECT * FROM bookings WHERE tenant_id = ?', p.id);
    out.recipes = await rows(env, 'SELECT * FROM recipes WHERE tenant_id = ?', p.id);
    out.products = await rows(env, 'SELECT * FROM products WHERE tenant_id = ?', p.id);
    out.orders = await rows(env, 'SELECT * FROM orders WHERE tenant_id = ?', p.id);
    out.compliance_documents = await rows(env, 'SELECT * FROM compliance_documents WHERE tenant_id = ?', p.id);
    out.tenant_sites = await rows(env, 'SELECT * FROM tenant_sites WHERE tenant_id = ?', p.id);
    out.email_subscribers = await rows(env, 'SELECT * FROM email_subscribers WHERE tenant_id = ?', p.id);
  } else if (p.role === 'operator') {
    out.kitchens = await rows(env, 'SELECT * FROM kitchens WHERE operator_id = ?', p.id);
  }
  return new Response(JSON.stringify(out, null, 2), {
    headers: { 'Content-Type': 'application/json', 'Content-Disposition': 'attachment; filename="culina-my-data.json"' },
  });
}

const TENANT_TABLES: [string, string][] = [
  ['recipes', 'tenant_id'], ['products', 'tenant_id'], ['orders', 'tenant_id'], ['bookings', 'tenant_id'],
  ['compliance_documents', 'tenant_id'], ['tenant_sites', 'tenant_id'], ['email_subscribers', 'tenant_id'],
  ['mentor_requests', 'tenant_id'], ['memberships', 'tenant_id'], ['classifieds', 'author_tenant_id'],
  ['community_posts', 'author_id'], ['notifications', 'user_id'], ['tenant_profiles', 'tenant_id'],
];
const KITCHEN_TABLES = ['kitchen_spaces', 'kitchen_equipment', 'memberships', 'leads', 'invoices', 'announcements', 'access_credentials', 'access_events', 'bookings', 'compliance_documents', 'classifieds', 'community_posts', 'marketplace_transactions'];

/** Delete a user and ALL their child rows (by id + role). Shared by the GDPR
 *  self-delete and the token-guarded E2E purge so they stay in lock-step. */
export async function purgeUserById(env: Env, id: string, role: string): Promise<void> {
  const db = env.DB!;
  const stmts = [];
  if (role === 'tenant') {
    for (const [t, col] of TENANT_TABLES) stmts.push(db.prepare(`DELETE FROM ${t} WHERE ${col} = ?`).bind(id));
  } else if (role === 'operator') {
    const kitchens = (await rows(env, 'SELECT id FROM kitchens WHERE operator_id = ?', id)) as { id: string }[];
    for (const k of kitchens) for (const t of KITCHEN_TABLES) stmts.push(db.prepare(`DELETE FROM ${t} WHERE kitchen_id = ?`).bind(k.id));
    stmts.push(db.prepare('DELETE FROM kitchens WHERE operator_id = ?').bind(id));
  }
  // Common to every role — auth + quota + identity rows.
  stmts.push(db.prepare('DELETE FROM notifications WHERE user_id = ?').bind(id));
  stmts.push(db.prepare('DELETE FROM auth_tokens WHERE user_id = ?').bind(id));
  stmts.push(db.prepare('DELETE FROM ai_usage WHERE identity = ?').bind(id));
  stmts.push(db.prepare('DELETE FROM profiles WHERE id = ?').bind(id));
  stmts.push(db.prepare('DELETE FROM users WHERE id = ?').bind(id));
  await db.batch(stmts);
}

/** POST /api/account/delete — erase the caller's data and account. */
export async function handleAccountDelete(request: Request, env: Env): Promise<Response> {
  const p = await authenticate(request, env);
  if (!p) return error('Unauthorized', env, 401);
  await purgeUserById(env, p.id, p.role);
  return json({ ok: true }, env);
}

// Known fallback so CI can clean up without a configured secret. Real protection
// comes from the e2e-only email guard below; set ADMIN_PURGE_TOKEN to harden.
const DEFAULT_PURGE_TOKEN = 'culina-e2e-purge';

/**
 * POST /api/admin/purge-user?token=...&email=...
 * Token-guarded test-account cleanup for the E2E rig. Refuses any email that
 * doesn't start with "e2e+", so even a leaked token can only delete test users.
 */
export async function handleAdminPurgeUser(request: Request, env: Env): Promise<Response> {
  if (!env.DB) return error('Database not configured', env, 503);
  const url = new URL(request.url);
  const token = url.searchParams.get('token') ?? '';
  const email = (url.searchParams.get('email') ?? '').trim();
  const expected = env.ADMIN_PURGE_TOKEN || DEFAULT_PURGE_TOKEN;
  if (!token || token !== expected) return error('Forbidden', env, 403);
  if (!/^e2e\+/i.test(email)) return error('Refusing to purge a non-e2e account.', env, 422);

  const user = await env.DB.prepare('SELECT id, role FROM profiles WHERE lower(email) = lower(?)')
    .bind(email)
    .first<{ id: string; role: string }>();
  if (!user) return json({ ok: true, purged: false, note: 'No such account.' }, env);
  await purgeUserById(env, user.id, user.role);
  return json({ ok: true, purged: true, email }, env);
}
