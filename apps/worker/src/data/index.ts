import { type Env, json, error } from '../lib/http';
import { authenticate } from '../auth';
import { uuid } from '../lib/crypto';
import { sendEmail, templates } from '../email';

const PLATFORM_FEE_PCT = 1.5;
const MARKETPLACE_COMMISSION_PCT = 5;

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const appBase = (env: Env, request: Request) => (env.APP_URL || new URL(request.url).origin).replace(/\/$/, '');

/** Human-readable booking window, e.g. "Mon, Jun 9 · 9:00 AM – 1:00 PM". */
function formatWindow(startIso: string, endIso: string): string {
  const s = new Date(startIso);
  const e = new Date(endIso);
  const day = s.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
  const t = (d: Date) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' });
  return `${day} · ${t(s)} – ${t(e)}`;
}

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

// Tables writable via the generic upsert. Bookings are intentionally excluded —
// they go through the validated /bookings endpoint (conflict + money checks).
const WRITABLE = new Set([
  'kitchens', 'kitchen_spaces', 'kitchen_equipment', 'memberships', 'tenant_profiles',
  'compliance_documents', 'leads', 'invoices', 'recipes', 'products', 'orders',
  'announcements', 'tenant_sites', 'notifications', 'access_credentials', 'mentor_requests',
  'email_subscribers', 'classifieds', 'community_posts', 'marketplace_transactions',
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
  return out;
}

async function all(env: Env, sql: string, ...binds: unknown[]): Promise<any[]> {
  const { results } = await env.DB!.prepare(sql).bind(...binds).all();
  return results as any[];
}

type Profile = { id: string; role: string };

async function operatesKitchen(env: Env, kitchenId: string | undefined, profileId: string): Promise<boolean> {
  if (!kitchenId) return false;
  const k = await env.DB!.prepare('SELECT operator_id FROM kitchens WHERE id = ?').bind(kitchenId).first<{ operator_id: string }>();
  return k?.operator_id === profileId;
}

/** Authorization: can this profile write this row to this table? */
async function canWrite(env: Env, profile: Profile, table: string, row: any): Promise<boolean> {
  if (profile.role === 'admin') return true;
  switch (table) {
    case 'recipes':
    case 'products':
    case 'orders':
    case 'tenant_sites':
    case 'tenant_profiles':
    case 'mentor_requests':
    case 'email_subscribers':
      return row.tenant_id === profile.id;
    case 'notifications':
      return row.user_id === profile.id;
    case 'compliance_documents':
      return row.tenant_id === profile.id || (await operatesKitchen(env, row.kitchen_id, profile.id));
    case 'kitchens':
      return row.operator_id === profile.id;
    case 'classifieds':
      return row.author_tenant_id === profile.id || (await operatesKitchen(env, row.kitchen_id, profile.id));
    case 'community_posts':
      return row.author_id === profile.id || (await operatesKitchen(env, row.kitchen_id, profile.id));
    case 'kitchen_spaces':
    case 'kitchen_equipment':
    case 'memberships':
    case 'leads':
    case 'invoices':
    case 'announcements':
    case 'access_credentials':
    case 'marketplace_transactions':
      return operatesKitchen(env, row.kitchen_id, profile.id);
    default:
      return false; // white_label_configs etc. → admin only (handled above)
  }
}

/** Recompute money server-side so clients can't dictate fees/totals. */
function recomputeMoney(table: string, row: any) {
  if (table === 'invoices') {
    const subtotal = Number(row.subtotal_cents) || 0;
    row.platform_fee_cents = Math.round(subtotal * (PLATFORM_FEE_PCT / 100));
    row.total_cents = subtotal + (Number(row.tax_cents) || 0) + row.platform_fee_cents;
  }
  if (table === 'marketplace_transactions') {
    const amount = Number(row.amount_cents) || 0;
    row.commission_cents = Math.round(amount * (MARKETPLACE_COMMISSION_PCT / 100));
  }
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

  // ── Hydrate: only data the user is entitled to (no global PII dump) ────
  if (path === 'hydrate' && request.method === 'GET') {
    const out: Record<string, any[]> = {
      grants: (await all(env, 'SELECT * FROM grants')).map((r) => toApp('grants', r)),
      learningResources: (await all(env, 'SELECT * FROM learning_resources')).map((r) => toApp('learning_resources', r)),
      mentors: await all(env, 'SELECT * FROM mentors'),
      referralPartners: await all(env, 'SELECT * FROM referral_partners'),
    };

    if (profile.role === 'operator') {
      const k = await db.prepare('SELECT * FROM kitchens WHERE operator_id = ? LIMIT 1').bind(profile.id).first<any>();
      out.kitchens = k ? [toApp('kitchens', k)] : [];
      const kid = k?.id ?? '';
      out.spaces = (await all(env, 'SELECT * FROM kitchen_spaces WHERE kitchen_id = ?', kid)).map((r) => toApp('kitchen_spaces', r));
      out.equipment = (await all(env, 'SELECT * FROM kitchen_equipment WHERE kitchen_id = ?', kid)).map((r) => toApp('kitchen_equipment', r));
      out.memberships = await all(env, 'SELECT * FROM memberships WHERE kitchen_id = ?', kid);
      // Only this kitchen's tenants' profiles (scoped PII).
      out.profiles = await all(env, 'SELECT p.id, p.email, p.full_name, p.role, p.avatar_url, p.phone, p.created_at FROM profiles p JOIN memberships m ON m.tenant_id = p.id WHERE m.kitchen_id = ?', kid);
      out.profiles.push({ id: profile.id, role: 'operator' });
      out.tenantProfiles = await all(env, 'SELECT tp.* FROM tenant_profiles tp JOIN memberships m ON m.tenant_id = tp.tenant_id WHERE m.kitchen_id = ?', kid);
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
      const m = await db.prepare('SELECT * FROM memberships WHERE tenant_id = ? LIMIT 1').bind(profile.id).first<any>();
      out.memberships = m ? [m] : [];
      if (m?.kitchen_id) {
        out.kitchens = (await all(env, 'SELECT * FROM kitchens WHERE id = ?', m.kitchen_id)).map((r) => toApp('kitchens', r));
        out.announcements = (await all(env, 'SELECT * FROM announcements WHERE kitchen_id = ?', m.kitchen_id)).map((r) => toApp('announcements', r));
        out.classifieds = await all(env, 'SELECT * FROM classifieds WHERE kitchen_id = ?', m.kitchen_id);
        out.communityPosts = await all(env, 'SELECT * FROM community_posts WHERE kitchen_id = ?', m.kitchen_id);
      }
      out.tenantProfiles = (await all(env, 'SELECT * FROM tenant_profiles WHERE tenant_id = ?', profile.id)).map((r) => toApp('tenant_profiles', r));
      out.bookings = (await all(env, 'SELECT * FROM bookings WHERE tenant_id = ?', profile.id)).map((r) => toApp('bookings', r));
      out.recipes = (await all(env, 'SELECT * FROM recipes WHERE tenant_id = ?', profile.id)).map((r) => toApp('recipes', r));
      out.products = (await all(env, 'SELECT * FROM products WHERE tenant_id = ?', profile.id)).map((r) => toApp('products', r));
      out.orders = (await all(env, 'SELECT * FROM orders WHERE tenant_id = ?', profile.id)).map((r) => toApp('orders', r));
      out.complianceDocuments = await all(env, 'SELECT * FROM compliance_documents WHERE tenant_id = ?', profile.id);
      out.tenantSites = (await all(env, 'SELECT * FROM tenant_sites WHERE tenant_id = ?', profile.id)).map((r) => toApp('tenant_sites', r));
      out.emailSubscribers = await all(env, 'SELECT * FROM email_subscribers WHERE tenant_id = ?', profile.id);
      out.mentorRequests = await all(env, 'SELECT * FROM mentor_requests WHERE tenant_id = ?', profile.id);
      out.notifications = await all(env, 'SELECT * FROM notifications WHERE user_id = ?', profile.id);
    } else {
      out.kitchens = (await all(env, 'SELECT * FROM kitchens')).map((r) => toApp('kitchens', r));
      out.whiteLabelConfigs = (await all(env, 'SELECT * FROM white_label_configs')).map((r) => toApp('white_label_configs', r));
      out.marketplaceTransactions = await all(env, 'SELECT * FROM marketplace_transactions');
    }
    return json(out, env);
  }

  // Admin: recent captured errors (observability)
  if (path === 'errors' && request.method === 'GET') {
    if (profile.role !== 'admin') return error('Forbidden', env, 403);
    return json({ errors: await all(env, 'SELECT * FROM error_logs ORDER BY created_at DESC LIMIT 100') }, env);
  }

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

  // ── Validated booking creation (conflict + compliance + server money) ──
  if (path === 'bookings' && request.method === 'POST') {
    const b: any = await request.json().catch(() => ({}));
    const space = await db.prepare('SELECT * FROM kitchen_spaces WHERE id = ?').bind(b.space_id).first<any>();
    if (!space || !space.is_active) return error('Space unavailable', env, 400);
    const kitchenId = space.kitchen_id;

    // Who is this booking for? Tenants book for themselves; operators for a member.
    let tenantId = profile.id;
    if (profile.role === 'operator') {
      if (!(await operatesKitchen(env, kitchenId, profile.id))) return error('Not your kitchen', env, 403);
      tenantId = b.tenant_id || profile.id;
    } else if (b.tenant_id && b.tenant_id !== profile.id) {
      return error('Cannot book for another tenant', env, 403);
    }

    const start = new Date(b.start_time);
    const end = new Date(b.end_time);
    if (!(end > start)) return error('End must be after start', env, 400);

    // Conflict check: overlapping active booking on the same space.
    const clash = await db
      .prepare("SELECT id FROM bookings WHERE space_id = ? AND status IN ('pending','confirmed','completed') AND start_time < ? AND end_time > ? LIMIT 1")
      .bind(b.space_id, end.toISOString(), start.toISOString())
      .first();
    if (clash) return error('That space is already booked for an overlapping time.', env, 409);

    // Compliance: block if a required doc is expired (server-enforced).
    const expired = await db
      .prepare("SELECT id FROM compliance_documents WHERE tenant_id = ? AND status = 'expired' AND doc_type IN ('food_handler_cert','liability_insurance') LIMIT 1")
      .bind(tenantId)
      .first();
    if (expired) return error('A required compliance document is expired — booking is blocked.', env, 403);

    // Server-side money (never trust the client).
    const hours = Math.max(1, (end.getTime() - start.getTime()) / 3.6e6);
    const equipIds: string[] = Array.isArray(b.equipment_ids) ? b.equipment_ids : [];
    let equipRate = 0;
    for (const id of equipIds) {
      const eq = await db.prepare('SELECT hourly_rate_cents FROM kitchen_equipment WHERE id = ? AND kitchen_id = ?').bind(id, kitchenId).first<{ hourly_rate_cents: number }>();
      equipRate += eq?.hourly_rate_cents ?? 0;
    }
    const subtotal = Math.round(((space.hourly_rate_cents ?? 0) + equipRate) * hours);
    const fee = Math.round(subtotal * (PLATFORM_FEE_PCT / 100));
    const id = uuid();
    const now = new Date().toISOString();
    const membership = await db.prepare('SELECT id FROM memberships WHERE tenant_id = ? AND kitchen_id = ?').bind(tenantId, kitchenId).first<{ id: string }>();

    await db
      .prepare(
        `INSERT INTO bookings (id, kitchen_id, space_id, tenant_id, membership_id, start_time, end_time, status, booking_type,
          subtotal_cents, platform_fee_cents, total_cents, notes, equipment_ids, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmed', 'hourly', ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(id, kitchenId, b.space_id, tenantId, membership?.id ?? null, start.toISOString(), end.toISOString(), subtotal, fee, subtotal + fee, b.notes ?? null, JSON.stringify(equipIds), now, now)
      .run();

    const created = await db.prepare('SELECT * FROM bookings WHERE id = ?').bind(id).first();

    // Confirmation emails (best-effort; never block the booking).
    try {
      const [renter, kitchenRow] = await Promise.all([
        db.prepare('SELECT email, full_name FROM profiles WHERE id = ?').bind(tenantId).first<any>(),
        db.prepare('SELECT name, operator_id FROM kitchens WHERE id = ?').bind(kitchenId).first<any>(),
      ]);
      const when = formatWindow(start.toISOString(), end.toISOString());
      const total = money(subtotal + fee);
      const base = appBase(env, request);
      const sends: Promise<unknown>[] = [];
      if (renter?.email) {
        sends.push(sendEmail(env, renter.email, 'Your Culina booking is confirmed',
          templates.bookingConfirmed({ name: renter.full_name, kitchen: kitchenRow?.name ?? 'the kitchen', space: space.name, when, total, manageUrl: `${base}/tenant/bookings` })));
      }
      if (kitchenRow?.operator_id && kitchenRow.operator_id !== tenantId) {
        const op = await db.prepare('SELECT email FROM profiles WHERE id = ?').bind(kitchenRow.operator_id).first<any>();
        if (op?.email) {
          sends.push(sendEmail(env, op.email, 'New booking in your kitchen',
            templates.bookingOperatorAlert({ kitchen: kitchenRow.name ?? 'your kitchen', space: space.name, renter: renter?.full_name ?? renter?.email ?? 'A renter', when, total, calendarUrl: `${base}/operator/calendar` })));
        }
      }
      await Promise.allSettled(sends);
    } catch (e) {
      console.error('[booking] confirmation email failed:', (e as Error).message);
    }

    return json({ booking: toApp('bookings', created) }, env);
  }

  // ── Booking status updates (cancel / complete / no-show) ──────────────
  // Bookings are excluded from the generic upsert, so status changes flow
  // through here with explicit authorization + a validated status set.
  const bk = path.match(/^bookings\/(.+)$/);
  if (bk && request.method === 'POST') {
    const bookingId = bk[1];
    const body: any = await request.json().catch(() => ({}));
    const existing = await db.prepare('SELECT * FROM bookings WHERE id = ?').bind(bookingId).first<any>();
    if (!existing) return error('Booking not found', env, 404);
    const owns = existing.tenant_id === profile.id || (await operatesKitchen(env, existing.kitchen_id, profile.id)) || profile.role === 'admin';
    if (!owns) return error('Forbidden', env, 403);
    const allowed = ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'];
    if (body.status && !allowed.includes(body.status)) return error('Invalid status', env, 400);
    await db
      .prepare('UPDATE bookings SET status = COALESCE(?, status), notes = COALESCE(?, notes), updated_at = ? WHERE id = ?')
      .bind(body.status ?? null, body.notes ?? null, new Date().toISOString(), bookingId)
      .run();
    const updated = await db.prepare('SELECT * FROM bookings WHERE id = ?').bind(bookingId).first();

    // Email the renter when a booking is confirmed or cancelled (best-effort).
    try {
      if (body.status && body.status !== existing.status && (body.status === 'confirmed' || body.status === 'cancelled')) {
        const [renter, kitchenRow, sp] = await Promise.all([
          db.prepare('SELECT email, full_name FROM profiles WHERE id = ?').bind(existing.tenant_id).first<any>(),
          db.prepare('SELECT name FROM kitchens WHERE id = ?').bind(existing.kitchen_id).first<any>(),
          db.prepare('SELECT name FROM kitchen_spaces WHERE id = ?').bind(existing.space_id).first<any>(),
        ]);
        if (renter?.email) {
          await sendEmail(env, renter.email, `Your booking is ${body.status}`,
            templates.bookingStatus({ name: renter.full_name, kitchen: kitchenRow?.name ?? 'the kitchen', space: sp?.name ?? 'your space', when: formatWindow(existing.start_time, existing.end_time), status: body.status, manageUrl: `${appBase(env, request)}/tenant/bookings` }));
        }
      }
    } catch (e) {
      console.error('[booking] status email failed:', (e as Error).message);
    }

    return json({ booking: toApp('bookings', updated) }, env);
  }

  // ── Generic upsert (authorized + money-recomputed + conflict-safe) ────
  if (path === 'upsert' && request.method === 'POST') {
    const body: any = await request.json().catch(() => ({}));
    const { table, row, base_updated_at } = body;
    if (!WRITABLE.has(table) || !row?.id) return error('Invalid upsert', env, 400);

    const existing = await db.prepare(`SELECT * FROM ${table} WHERE id = ?`).bind(row.id).first<any>();
    // Authorize against both the current row (no hijacking) and the new state.
    if (existing && !(await canWrite(env, profile, table, existing))) return error('Forbidden', env, 403);
    if (!(await canWrite(env, profile, table, row))) return error('Forbidden', env, 403);

    recomputeMoney(table, row);
    const data = toDb(table, row);
    const guarded = 'updated_at' in data;

    // Optimistic concurrency: reject if the row changed since the client loaded it.
    if (existing && guarded && base_updated_at && existing.updated_at && existing.updated_at > base_updated_at) {
      return json({ error: 'conflict', current: toApp(table, existing), updated_at: existing.updated_at }, env, 409);
    }
    const now = new Date().toISOString();
    if (guarded) data.updated_at = now;

    // Partial merge: only the provided columns are written (preserves the rest).
    const cols = Object.keys(data);
    const placeholders = cols.map(() => '?').join(',');
    const setClause = cols.filter((c) => c !== 'id').map((c) => `${c} = excluded.${c}`).join(', ');
    const sql = setClause
      ? `INSERT INTO ${table} (${cols.join(',')}) VALUES (${placeholders}) ON CONFLICT(id) DO UPDATE SET ${setClause}`
      : `INSERT OR IGNORE INTO ${table} (${cols.join(',')}) VALUES (${placeholders})`;
    await db.prepare(sql).bind(...cols.map((c) => data[c])).run();
    return json({ ok: true, updated_at: guarded ? now : undefined }, env);
  }

  // ── Bulk import (onboarding) ──────────────────────────────────────────
  if (path === 'tenants/import' && request.method === 'POST') {
    if (profile.role !== 'operator') return error('Forbidden', env, 403);
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

  // ── Delete (authorized) ───────────────────────────────────────────────
  const del = path.match(/^([a-z_]+)\/(.+)$/);
  if (del && request.method === 'DELETE') {
    const [, table, id] = del;
    if (!WRITABLE.has(table)) return error('Invalid delete', env, 400);
    const existing = await db.prepare(`SELECT * FROM ${table} WHERE id = ?`).bind(id).first<any>();
    if (!existing) return json({ ok: true }, env);
    if (!(await canWrite(env, profile, table, existing))) return error('Forbidden', env, 403);
    await db.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(id).run();
    return json({ ok: true }, env);
  }

  return error('Not found', env, 404);
}
