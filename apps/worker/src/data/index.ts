import { type Env, json, error } from '../lib/http';
import { authenticate } from '../auth';
import { uuid } from '../lib/crypto';

/** Per-table field metadata for converting between the app shape and SQLite. */
const BOOL_FIELDS: Record<string, string[]> = {
  kitchens: ['stripe_onboarded', 'is_listed'],
  kitchen_spaces: ['is_active'],
  kitchen_equipment: ['is_active'],
  tenant_profiles: ['stripe_onboarded'],
  products: ['track_inventory', 'is_active', 'is_subscription_eligible'],
  recipes: ['is_published'],
  announcements: ['is_pinned'],
  tenant_sites: ['show_products', 'show_about', 'show_contact', 'show_social', 'is_published'],
  notifications: ['is_read'],
  grants: ['is_recurring', 'is_active'],
  learning_resources: ['is_free'],
  white_label_configs: ['is_active'],
};
const JSON_FIELDS: Record<string, string[]> = {
  kitchens: ['amenities'],
  bookings: ['equipment_ids'],
  invoices: ['line_items'],
  recipes: ['ingredients', 'tags'],
  products: ['tags', 'images', 'allergens'],
  orders: ['items', 'shipping_address'],
  grants: ['target_states', 'target_business_types'],
  learning_resources: ['tags'],
};

const WRITABLE = new Set([
  'kitchens', 'kitchen_spaces', 'kitchen_equipment', 'memberships', 'tenant_profiles',
  'compliance_documents', 'bookings', 'leads', 'invoices', 'recipes', 'products', 'orders',
  'announcements', 'tenant_sites', 'notifications', 'access_credentials', 'mentor_requests',
  'email_subscribers', 'classifieds', 'community_posts', 'marketplace_transactions',
  'white_label_configs',
]);

function toApp(table: string, row: any): any {
  if (!row) return row;
  const out = { ...row };
  for (const f of BOOL_FIELDS[table] ?? []) if (f in out) out[f] = !!out[f];
  for (const f of JSON_FIELDS[table] ?? []) if (typeof out[f] === 'string') { try { out[f] = JSON.parse(out[f]); } catch { /* keep */ } }
  return out;
}
function toDb(table: string, row: any): any {
  const out = { ...row };
  for (const f of BOOL_FIELDS[table] ?? []) if (f in out) out[f] = out[f] ? 1 : 0;
  for (const f of JSON_FIELDS[table] ?? []) if (out[f] != null && typeof out[f] !== 'string') out[f] = JSON.stringify(out[f]);
  // Drop joined/extra fields that aren't real columns
  return out;
}

async function all(env: Env, sql: string, ...binds: unknown[]): Promise<any[]> {
  const { results } = await env.DB!.prepare(sql).bind(...binds).all();
  return results as any[];
}

export async function handleData(path: string, request: Request, env: Env): Promise<Response> {
  if (!env.DB) return error('Database not configured (bind a D1 database named "culina").', env, 503);
  const db = env.DB;

  // ── Public reference reads ────────────────────────────────────────────
  if (request.method === 'GET') {
    if (path === 'grants') return json({ grants: (await all(env, 'SELECT * FROM grants WHERE is_active = 1')).map((r) => toApp('grants', r)) }, env);
    if (path === 'learning') return json({ learning: (await all(env, 'SELECT * FROM learning_resources')).map((r) => toApp('learning_resources', r)) }, env);
    if (path === 'mentors') return json({ mentors: await all(env, 'SELECT * FROM mentors') }, env);
    if (path === 'kitchens') return json({ kitchens: (await all(env, 'SELECT * FROM kitchens WHERE is_listed = 1')).map((r) => toApp('kitchens', r)) }, env);
    const sf = path.match(/^storefront\/(.+)$/);
    if (sf) {
      const slug = decodeURIComponent(sf[1]);
      const tp: any = await db.prepare('SELECT * FROM tenant_profiles WHERE business_slug = ?').bind(slug).first();
      const site = await db.prepare('SELECT * FROM tenant_sites WHERE site_slug = ?').bind(slug).first();
      const products = tp ? (await all(env, 'SELECT * FROM products WHERE tenant_id = ? AND is_active = 1', tp.tenant_id)).map((r) => toApp('products', r)) : [];
      return json({ profile: toApp('tenant_profiles', tp), site: toApp('tenant_sites', site), products }, env);
    }
  }

  const profile = await authenticate(request, env);
  if (!profile) return error('Unauthorized', env, 401);

  // ── Hydrate: full dataset scoped to the user ──────────────────────────
  if (path === 'hydrate' && request.method === 'GET') {
    const out: Record<string, any[]> = {};
    const ref = async () => {
      out.grants = (await all(env, 'SELECT * FROM grants')).map((r) => toApp('grants', r));
      out.learningResources = (await all(env, 'SELECT * FROM learning_resources')).map((r) => toApp('learning_resources', r));
      out.mentors = await all(env, 'SELECT * FROM mentors');
      out.referralPartners = await all(env, 'SELECT * FROM referral_partners');
      out.kitchens = (await all(env, 'SELECT * FROM kitchens')).map((r) => toApp('kitchens', r));
      out.profiles = await all(env, 'SELECT * FROM profiles');
      out.tenantProfiles = (await all(env, 'SELECT * FROM tenant_profiles')).map((r) => toApp('tenant_profiles', r));
    };
    await ref();

    if (profile.role === 'operator') {
      const k = await db.prepare('SELECT id FROM kitchens WHERE operator_id = ? LIMIT 1').bind(profile.id).first<{ id: string }>();
      const kid = k?.id ?? '';
      out.spaces = (await all(env, 'SELECT * FROM kitchen_spaces WHERE kitchen_id = ?', kid)).map((r) => toApp('kitchen_spaces', r));
      out.equipment = (await all(env, 'SELECT * FROM kitchen_equipment WHERE kitchen_id = ?', kid)).map((r) => toApp('kitchen_equipment', r));
      out.memberships = await all(env, 'SELECT * FROM memberships WHERE kitchen_id = ?', kid);
      out.bookings = (await all(env, 'SELECT * FROM bookings WHERE kitchen_id = ?', kid)).map((r) => toApp('bookings', r));
      out.leads = await all(env, 'SELECT * FROM leads WHERE kitchen_id = ?', kid);
      out.invoices = (await all(env, 'SELECT * FROM invoices WHERE kitchen_id = ?', kid)).map((r) => toApp('invoices', r));
      out.complianceDocuments = await all(env, 'SELECT * FROM compliance_documents WHERE kitchen_id = ?', kid);
      out.announcements = (await all(env, 'SELECT * FROM announcements WHERE kitchen_id = ?', kid)).map((r) => toApp('announcements', r));
      out.accessCredentials = await all(env, 'SELECT * FROM access_credentials WHERE kitchen_id = ?', kid);
      out.classifieds = await all(env, 'SELECT * FROM classifieds WHERE kitchen_id = ?', kid);
      out.communityPosts = await all(env, 'SELECT * FROM community_posts WHERE kitchen_id = ?', kid);
      out.marketplaceTransactions = await all(env, 'SELECT * FROM marketplace_transactions WHERE kitchen_id = ?', kid);
    } else if (profile.role === 'tenant') {
      out.memberships = await all(env, 'SELECT * FROM memberships WHERE tenant_id = ?', profile.id);
      out.bookings = (await all(env, 'SELECT * FROM bookings WHERE tenant_id = ?', profile.id)).map((r) => toApp('bookings', r));
      out.recipes = (await all(env, 'SELECT * FROM recipes WHERE tenant_id = ?', profile.id)).map((r) => toApp('recipes', r));
      out.products = (await all(env, 'SELECT * FROM products WHERE tenant_id = ?', profile.id)).map((r) => toApp('products', r));
      out.orders = (await all(env, 'SELECT * FROM orders WHERE tenant_id = ?', profile.id)).map((r) => toApp('orders', r));
      out.complianceDocuments = await all(env, 'SELECT * FROM compliance_documents WHERE tenant_id = ?', profile.id);
      out.tenantSites = (await all(env, 'SELECT * FROM tenant_sites WHERE tenant_id = ?', profile.id)).map((r) => toApp('tenant_sites', r));
      out.emailSubscribers = await all(env, 'SELECT * FROM email_subscribers WHERE tenant_id = ?', profile.id);
      out.mentorRequests = await all(env, 'SELECT * FROM mentor_requests WHERE tenant_id = ?', profile.id);
    } else {
      out.kitchens = (await all(env, 'SELECT * FROM kitchens')).map((r) => toApp('kitchens', r));
      out.whiteLabelConfigs = (await all(env, 'SELECT * FROM white_label_configs')).map((r) => toApp('white_label_configs', r));
      out.marketplaceTransactions = await all(env, 'SELECT * FROM marketplace_transactions');
    }
    return json(out, env);
  }

  // Operator bootstrap (kept for the Tenants page)
  if (path === 'bootstrap' && request.method === 'GET') {
    const kitchen = toApp('kitchens', await db.prepare('SELECT * FROM kitchens WHERE operator_id = ? LIMIT 1').bind(profile.id).first());
    if (!kitchen) return json({ kitchen: null, tenants: [] }, env);
    const tenants = await all(env,
      `SELECT m.id, m.status, m.membership_type, m.start_date, p.id AS tenant_id, p.full_name, p.email,
              tp.business_name, tp.business_type, tp.annual_revenue_estimate
       FROM memberships m JOIN profiles p ON p.id = m.tenant_id
       LEFT JOIN tenant_profiles tp ON tp.tenant_id = m.tenant_id
       WHERE m.kitchen_id = ? ORDER BY m.created_at DESC`, kitchen.id);
    return json({ kitchen, tenants }, env);
  }

  // ── Generic upsert (write-through from the app) ───────────────────────
  if (path === 'upsert' && request.method === 'POST') {
    const body: any = await request.json().catch(() => ({}));
    const { table, row } = body;
    if (!WRITABLE.has(table) || !row?.id) return error('Invalid upsert', env, 400);
    const data = toDb(table, row);
    const cols = Object.keys(data);
    const placeholders = cols.map(() => '?').join(',');
    const sql = `INSERT OR REPLACE INTO ${table} (${cols.join(',')}) VALUES (${placeholders})`;
    await db.prepare(sql).bind(...cols.map((c) => data[c])).run();
    return json({ ok: true }, env);
  }

  // ── Bulk import (onboarding) ──────────────────────────────────────────
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
      if (await db.prepare('SELECT id FROM profiles WHERE email = ?').bind(r.email).first()) continue;
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

  // ── Delete ────────────────────────────────────────────────────────────
  const del = path.match(/^([a-z_]+)\/(.+)$/);
  if (del && request.method === 'DELETE') {
    const [, table, id] = del;
    if (!WRITABLE.has(table)) return error('Invalid delete', env, 400);
    await db.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(id).run();
    return json({ ok: true }, env);
  }

  return error('Not found', env, 404);
}
