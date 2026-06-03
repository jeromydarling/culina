import { type Env, json, error } from '../lib/http';
import { authenticate } from '../auth';
import { uuid } from '../lib/crypto';

/**
 * D1-backed data API (a focused, real slice). Public reference reads + the
 * operator's kitchen/tenants bootstrap + tenant bulk-import. Access is enforced
 * here in the Worker (SQLite has no RLS).
 */
export async function handleData(path: string, request: Request, env: Env): Promise<Response> {
  if (!env.DB) return error('Database not configured (bind a D1 database named "culina").', env, 503);
  const db = env.DB;

  // ── Public reference reads ────────────────────────────────────────────
  if (request.method === 'GET') {
    if (path === 'grants') {
      const { results } = await db.prepare('SELECT * FROM grants WHERE is_active = 1 ORDER BY created_at DESC').all();
      return json({ grants: results }, env);
    }
    if (path === 'learning') {
      const { results } = await db.prepare('SELECT * FROM learning_resources ORDER BY created_at').all();
      return json({ learning: results }, env);
    }
    if (path === 'mentors') {
      const { results } = await db.prepare('SELECT * FROM mentors ORDER BY created_at').all();
      return json({ mentors: results }, env);
    }
    if (path === 'kitchens') {
      const { results } = await db.prepare('SELECT * FROM kitchens WHERE is_listed = 1 ORDER BY created_at DESC').all();
      return json({ kitchens: results }, env);
    }
  }

  // ── Authenticated ─────────────────────────────────────────────────────
  const profile = await authenticate(request, env);
  if (!profile) return error('Unauthorized', env, 401);

  // Operator dashboard bootstrap: their kitchen + tenant roster
  if (path === 'bootstrap' && request.method === 'GET') {
    const kitchen = await db.prepare('SELECT * FROM kitchens WHERE operator_id = ? LIMIT 1').bind(profile.id).first();
    if (!kitchen) return json({ kitchen: null, tenants: [] }, env);
    const { results: tenants } = await db
      .prepare(
        `SELECT m.id, m.status, m.membership_type, m.start_date,
                p.id AS tenant_id, p.full_name, p.email,
                tp.business_name, tp.business_type, tp.annual_revenue_estimate
         FROM memberships m
         JOIN profiles p ON p.id = m.tenant_id
         LEFT JOIN tenant_profiles tp ON tp.tenant_id = m.tenant_id
         WHERE m.kitchen_id = ?
         ORDER BY m.created_at DESC`,
      )
      .bind((kitchen as { id: string }).id)
      .all();
    return json({ kitchen, tenants }, env);
  }

  // Bulk-import tenants into the operator's kitchen
  if (path === 'tenants/import' && request.method === 'POST') {
    const body: any = await request.json().catch(() => ({}));
    const rows: any[] = Array.isArray(body.rows) ? body.rows : [];
    const kitchen = await db.prepare('SELECT id FROM kitchens WHERE operator_id = ? LIMIT 1').bind(profile.id).first<{ id: string }>();
    if (!kitchen) return error('No kitchen found for this operator', env, 400);

    const now = new Date().toISOString();
    const statements = [];
    let created = 0;
    for (const r of rows) {
      if (!r.email) continue;
      const exists = await db.prepare('SELECT id FROM profiles WHERE email = ?').bind(r.email).first();
      if (exists) continue;
      const id = uuid();
      const slug = String(r.business_name ?? 'maker').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + id.slice(0, 4);
      const mtype = String(r.plan ?? '').toLowerCase().includes('month') ? 'monthly' : 'hourly';
      const status = ['active', 'pending', 'suspended', 'graduated'].includes(String(r.status ?? '').toLowerCase()) ? String(r.status).toLowerCase() : 'active';
      statements.push(
        db.prepare('INSERT INTO profiles (id, email, full_name, role, created_at) VALUES (?, ?, ?, ?, ?)').bind(id, r.email, r.full_name ?? r.business_name ?? r.email, 'tenant', now),
        db.prepare('INSERT INTO tenant_profiles (id, tenant_id, business_name, business_slug, business_type, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(uuid(), id, r.business_name ?? r.email, slug, r.business_type ?? null, now, now),
        db.prepare('INSERT INTO memberships (id, kitchen_id, tenant_id, status, membership_type, start_date, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(uuid(), kitchen.id, id, status, mtype, now.slice(0, 10), 'Imported during onboarding.', now, now),
      );
      created += 1;
    }
    if (statements.length) await db.batch(statements);
    return json({ imported: created }, env);
  }

  return error('Not found', env, 404);
}
