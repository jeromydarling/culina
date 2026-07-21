import { type Env, json, error, corsHeaders } from '../lib/http';
import { authenticate } from '../auth';
import { uuid, randomToken, sha256Hex } from '../lib/crypto';
import { getAuthSecret } from '../lib/secret';
import { sendEmail, templates, emailLayout } from '../email';
import { invoicePayUrl } from '../stripe';
import { checkAiQuota } from '../lib/ratelimit';

const PLATFORM_FEE_PCT = 1.5;
const MARKETPLACE_COMMISSION_PCT = 5;

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const appBase = (env: Env, request: Request) => (env.APP_URL || new URL(request.url).origin).replace(/\/$/, '');
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

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
  kitchens: ['stripe_onboarded', 'is_listed', 'is_verified'],
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
  integrations: ['connected'],
  crm_task: ['done'],
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
  integrations: ['metadata'],
  crm_customer: ['tags'],
};

// Tables writable via the generic upsert. Bookings are intentionally excluded —
// they go through the validated /bookings endpoint (conflict + money checks).
const WRITABLE = new Set([
  'kitchens', 'kitchen_spaces', 'kitchen_equipment', 'memberships', 'tenant_profiles',
  'compliance_documents', 'leads', 'invoices', 'recipes', 'products', 'orders',
  'announcements', 'tenant_sites', 'notifications', 'access_credentials', 'mentor_requests',
  'email_subscribers', 'classifieds', 'community_posts', 'marketplace_transactions',
  'learning_resources', 'white_label_configs', 'integrations', 'access_events',
  // Super-admin CRM (admin-only writes; enforced by canWrite's admin gate).
  'crm_customer', 'crm_activity', 'crm_task',
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
    case 'access_events':
    case 'marketplace_transactions':
      return operatesKitchen(env, row.kitchen_id, profile.id);
    case 'integrations':
      // integrations.owner_id holds the kitchen id (0001 schema).
      return operatesKitchen(env, row.owner_id, profile.id);
    default:
      return false; // learning_resources, white_label_configs etc. → admin only (handled above)
  }
}

/**
 * Fire the kitchen's outbound webhook (if one is connected), best-effort.
 * The integrations row (0001 schema) keys the kitchen via owner_id and keeps
 * the destination URL in the metadata JSON column. Never blocks a response.
 */
async function fireKitchenWebhook(env: Env, kitchenId: string, event: object): Promise<void> {
  try {
    const row = await env.DB!
      .prepare("SELECT metadata FROM integrations WHERE owner_id = ? AND provider = 'webhook' AND connected = 1 LIMIT 1")
      .bind(kitchenId)
      .first<{ metadata: string | null }>();
    if (!row?.metadata) return;
    let url = '';
    try { url = String(JSON.parse(row.metadata)?.url ?? ''); } catch { /* malformed config → skip */ }
    if (!/^https?:\/\//.test(url)) return;
    await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(event) }).catch(() => {});
  } catch (e) {
    console.error('[webhook] fire failed:', (e as Error).message);
  }
}

/** ISO timestamp → iCalendar UTC basic format (YYYYMMDDTHHMMSSZ). */
const icsDate = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
/** Escape iCalendar TEXT values (RFC 5545 §3.3.11). */
const icsEscape = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

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
    // Public iCal feed of a kitchen's bookings, guarded by an unguessable token
    // derived from the auth secret (no auth header — calendar apps can't send one).
    if (path === 'calendar-feed') {
      const u = new URL(request.url);
      const k = u.searchParams.get('k') ?? '';
      const t = u.searchParams.get('t') ?? '';
      if (!k || t !== (await sha256Hex(`ical:${k}:${await getAuthSecret(env)}`))) return error('Invalid calendar token', env, 403);
      const from = new Date(Date.now() - 30 * 864e5).toISOString();
      const to = new Date(Date.now() + 90 * 864e5).toISOString();
      const rows = await all(env,
        `SELECT b.id, b.start_time, b.end_time, s.name AS space_name, tp.business_name, p.full_name
         FROM bookings b
         LEFT JOIN kitchen_spaces s ON s.id = b.space_id
         LEFT JOIN tenant_profiles tp ON tp.tenant_id = b.tenant_id
         LEFT JOIN profiles p ON p.id = b.tenant_id
         WHERE b.kitchen_id = ? AND b.status != 'cancelled' AND b.start_time >= ? AND b.start_time <= ?
         ORDER BY b.start_time`, k, from, to);
      const now = icsDate(new Date().toISOString());
      const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Culina//Kitchen Calendar//EN', 'CALSCALE:GREGORIAN'];
      for (const b of rows) {
        const who = b.business_name || b.full_name || 'Booking';
        const what = `${who} — ${b.space_name || 'Kitchen booking'}`;
        lines.push(
          'BEGIN:VEVENT',
          `UID:${b.id}@culina`,
          `DTSTAMP:${now}`,
          `DTSTART:${icsDate(b.start_time)}`,
          `DTEND:${icsDate(b.end_time)}`,
          `SUMMARY:${icsEscape(what)}`,
          'END:VEVENT',
        );
      }
      lines.push('END:VCALENDAR');
      return new Response(lines.join('\r\n') + '\r\n', {
        headers: { 'Content-Type': 'text/calendar; charset=utf-8', ...corsHeaders(env) },
      });
    }
    if (path === 'kitchens') return json({ kitchens: (await all(env, 'SELECT * FROM kitchens WHERE is_listed = 1')).map((r) => toApp('kitchens', r)) }, env);
    // Public kitchen profile by slug (listed only) — powers /kitchen/:slug for
    // visitors who aren't logged in, including operator-created kitchens.
    const km = path.match(/^kitchen\/(.+)$/);
    if (km) {
      const slug = decodeURIComponent(km[1]);
      const k = await db.prepare('SELECT * FROM kitchens WHERE slug = ? AND is_listed = 1').bind(slug).first<any>();
      if (!k) return json({ kitchen: null }, env);
      const spaces = (await all(env, 'SELECT * FROM kitchen_spaces WHERE kitchen_id = ? AND is_active = 1', k.id)).map((r) => toApp('kitchen_spaces', r));
      const equipment = (await all(env, 'SELECT * FROM kitchen_equipment WHERE kitchen_id = ? AND is_active = 1', k.id)).map((r) => toApp('kitchen_equipment', r));
      return json({ kitchen: toApp('kitchens', k), spaces, equipment }, env);
    }
    // Public invite lookup (by token) → prefills the sign-up page.
    const invMatch = path.match(/^invite\/(.+)$/);
    if (invMatch) {
      const row = await db
        .prepare('SELECT i.email, i.full_name, i.business_name, i.status, i.expires_at, k.name AS kitchen_name FROM invites i JOIN kitchens k ON k.id = i.kitchen_id WHERE i.token_hash = ?')
        .bind(await sha256Hex(decodeURIComponent(invMatch[1])))
        .first<any>();
      if (!row || row.status !== 'pending' || row.expires_at < new Date().toISOString()) return json({ invite: null }, env);
      return json({ invite: { email: row.email, full_name: row.full_name, business_name: row.business_name, kitchen_name: row.kitchen_name } }, env);
    }
    const sf = path.match(/^storefront\/(.+)$/);
    if (sf) {
      const slug = decodeURIComponent(sf[1]);
      const tp: any = await db.prepare('SELECT * FROM tenant_profiles WHERE business_slug = ?').bind(slug).first();
      const site = await db.prepare('SELECT * FROM tenant_sites WHERE site_slug = ?').bind(slug).first();
      const products = tp ? (await all(env, 'SELECT * FROM products WHERE tenant_id = ? AND is_active = 1', tp.tenant_id)).map((r) => toApp('products', r)) : [];
      return json({ profile: toApp('tenant_profiles', tp), site: toApp('tenant_sites', site), products }, env);
    }
  }

  // ── Public lead capture from a kitchen's directory page (no auth) ─────────
  if (path === 'leads' && request.method === 'POST') {
    const b: any = await request.json().catch(() => ({}));
    const fullName = String(b.full_name ?? '').trim().slice(0, 120);
    const email = String(b.email ?? '').trim().slice(0, 200);
    if (!fullName || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return error('Name and a valid email are required', env, 400);

    // Light per-IP daily guard (reuses the usage table). Over limit → silent ok.
    const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
    if (!(await checkAiQuota(env, `lead:${ip}`, 20))) return json({ ok: true }, env);

    // Resolve the kitchen by id, then slug. Unknown (e.g. demo-only) → silent ok.
    let kitchen: any = null;
    if (b.kitchen_id) kitchen = await db.prepare('SELECT id, name, operator_id FROM kitchens WHERE id = ?').bind(b.kitchen_id).first();
    if (!kitchen && b.kitchen_slug) kitchen = await db.prepare('SELECT id, name, operator_id FROM kitchens WHERE slug = ?').bind(b.kitchen_slug).first();
    if (!kitchen) return json({ ok: true }, env);

    const now = new Date().toISOString();
    const leadId = uuid();
    const phone = String(b.phone ?? '').trim().slice(0, 40) || null;
    const business = String(b.business_name ?? '').trim().slice(0, 120) || null;
    const message = String(b.message ?? '').trim().slice(0, 2000) || null;
    await db
      .prepare(
        `INSERT INTO leads (id, kitchen_id, full_name, email, phone, business_name, business_type, message, source, status, notes, follow_up_date, assigned_to, converted_membership_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, 'new', NULL, NULL, NULL, NULL, ?, ?)`,
      )
      .bind(leadId, kitchen.id, fullName, email, phone, business, message, String(b.source ?? 'culina_directory').slice(0, 40), now, now)
      .run();

    // Notify the operator (in-app + email), best-effort.
    try {
      if (kitchen.operator_id) {
        await db
          .prepare('INSERT INTO notifications (id, user_id, title, body, type, is_read, action_url, created_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?)')
          .bind(uuid(), kitchen.operator_id, 'New space inquiry', `${fullName} is interested in ${kitchen.name}.`, 'lead', '/operator/leads', now)
          .run();
        const op = await db.prepare('SELECT email FROM profiles WHERE id = ?').bind(kitchen.operator_id).first<any>();
        if (op?.email) {
          await sendEmail(env, op.email, `New inquiry for ${kitchen.name}`,
            templates.leadInquiry({ kitchen: kitchen.name, name: fullName, email, phone: phone ?? '', business: business ?? '', message: message ?? '', crmUrl: `${appBase(env, request)}/operator/leads` }));
        }
      }
    } catch (e) {
      console.error('[lead] notify failed:', (e as Error).message);
    }

    // Warm acknowledgement to the person who reached out (best-effort).
    try {
      await sendEmail(env, email, `Thanks for reaching out to ${kitchen.name}`, templates.inquiryAck({ kitchen: kitchen.name, name: fullName }));
    } catch (e) {
      console.error('[lead] ack failed:', (e as Error).message);
    }

    // Outbound webhook (best-effort, never blocks the response).
    try {
      await fireKitchenWebhook(env, kitchen.id, { type: 'lead.created', lead: { id: leadId, full_name: fullName, email } });
    } catch { /* fire-and-forget */ }
    return json({ ok: true, id: leadId }, env);
  }

  const profile = await authenticate(request, env);
  if (!profile) return error('Unauthorized', env, 401);

  // ── Super-admin CRM: status/tags + the activity timeline ──────────────
  if (path === 'crm' && request.method === 'GET') {
    if (profile.role !== 'admin') return error('Forbidden', env, 403);
    const customers = (await all(env, 'SELECT * FROM crm_customer')).map((r) => toApp('crm_customer', r));
    const activities = await all(env, 'SELECT * FROM crm_activity ORDER BY created_at DESC LIMIT 2000');
    const tasks = (await all(env, 'SELECT * FROM crm_task ORDER BY due_date')).map((r) => toApp('crm_task', r));
    return json({ customers, activities, tasks }, env);
  }

  // ── Bulk email a filtered CRM segment (admin only) ─────────────────────
  if (path === 'crm/bulk-email' && request.method === 'POST') {
    if (profile.role !== 'admin') return error('Forbidden', env, 403);
    const body: any = await request.json().catch(() => ({}));
    const ids: string[] = Array.isArray(body.kitchen_ids) ? body.kitchen_ids.slice(0, 200).map(String) : [];
    const subject = String(body.subject ?? '').trim().slice(0, 200);
    const message = String(body.message ?? '').trim().slice(0, 5000);
    if (!ids.length) return error('No recipients in this segment.', env, 400);
    if (!subject || !message) return error('Subject and message are required.', env, 400);

    const now = new Date().toISOString();
    let sent = 0;
    let skipped = 0;
    for (const id of ids) {
      const k = await db.prepare(
        'SELECT k.id, k.name, k.email AS kitchen_email, p.email AS operator_email, p.full_name FROM kitchens k LEFT JOIN profiles p ON p.id = k.operator_id WHERE k.id = ?',
      ).bind(id).first<any>();
      const to = k?.operator_email || k?.kitchen_email;
      if (!k || !to) { skipped++; continue; }

      // Light personalization so bulk still reads like a person wrote it.
      const first = (k.full_name ?? '').trim().split(' ')[0] || 'there';
      const personalized = message.replaceAll('{{kitchen}}', k.name).replaceAll('{{name}}', first);
      const ok = await sendEmail(env, to, subject.replaceAll('{{kitchen}}', k.name).replaceAll('{{name}}', first),
        templates.leadMessage({ kitchen: 'Culina', senderName: profile.full_name ?? 'The Culina team', message: personalized }),
        undefined, profile.email);
      if (ok) sent++;

      // Log the touch on the customer's timeline + bump last_contacted.
      await db.batch([
        db.prepare('INSERT INTO crm_activity (id, kitchen_id, author_id, kind, body, created_at) VALUES (?, ?, ?, ?, ?, ?)')
          .bind(uuid(), k.id, profile.id, 'email', `Segment email: ${subject}`, now),
        db.prepare(`INSERT INTO crm_customer (id, last_contacted, updated_at) VALUES (?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET last_contacted = excluded.last_contacted, updated_at = excluded.updated_at`)
          .bind(k.id, now, now),
      ]);
    }
    return json({ ok: true, sent, skipped, total: ids.length }, env);
  }

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

    // Outbound webhook (best-effort, never blocks the response).
    try {
      await fireKitchenWebhook(env, kitchenId, {
        type: 'booking.created',
        booking: { id, start_time: start.toISOString(), end_time: end.toISOString(), total_cents: subtotal + fee, tenant_id: tenantId },
      });
    } catch { /* fire-and-forget */ }

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
        // When the renter cancels their own booking, give the operator a heads-up
        // so they know the slot reopened (they aren't alerted otherwise).
        if (body.status === 'cancelled' && profile.id === existing.tenant_id) {
          const op = await db.prepare('SELECT p.email FROM kitchens k JOIN profiles p ON p.id = k.operator_id WHERE k.id = ?').bind(existing.kitchen_id).first<any>();
          if (op?.email) {
            await sendEmail(env, op.email, 'A booking was cancelled',
              templates.bookingCancelledOperatorAlert({ renter: renter?.full_name ?? renter?.email ?? 'A maker', space: sp?.name ?? 'a space', when: formatWindow(existing.start_time, existing.end_time), calendarUrl: `${appBase(env, request)}/operator/calendar` }));
          }
        }
      }
    } catch (e) {
      console.error('[booking] status email failed:', (e as Error).message);
    }

    return json({ booking: toApp('bookings', updated) }, env);
  }

  // ── Email a lead directly from the CRM (operator/admin only) ──────────
  const leadContact = path.match(/^leads\/([^/]+)\/contact$/);
  if (leadContact && request.method === 'POST') {
    const lead = await db.prepare('SELECT * FROM leads WHERE id = ?').bind(leadContact[1]).first<any>();
    if (!lead) return error('Lead not found', env, 404);
    if (!(profile.role === 'admin' || (await operatesKitchen(env, lead.kitchen_id, profile.id)))) return error('Forbidden', env, 403);
    const body: any = await request.json().catch(() => ({}));
    const subject = String(body.subject ?? '').trim().slice(0, 200) || 'A message about your inquiry';
    const message = String(body.message ?? '').trim().slice(0, 5000);
    if (!message) return error('Message is required', env, 400);

    const kitchenRow = await db.prepare('SELECT name FROM kitchens WHERE id = ?').bind(lead.kitchen_id).first<any>();
    // Replies go straight to the operator, not the no-reply mailbox.
    const sent = await sendEmail(env, lead.email, subject,
      templates.leadMessage({ kitchen: kitchenRow?.name ?? 'the kitchen', senderName: profile.full_name ?? kitchenRow?.name ?? 'The team', message }),
      undefined, profile.email);

    const now = new Date().toISOString();
    const logLine = `[${now.slice(0, 10)}] Emailed: ${subject}`;
    const notes = lead.notes ? `${lead.notes}\n${logLine}` : logLine;
    const status = lead.status === 'new' ? 'contacted' : lead.status;
    await db.prepare('UPDATE leads SET status = ?, notes = ?, updated_at = ? WHERE id = ?').bind(status, notes, now, lead.id).run();
    const updated = await db.prepare('SELECT * FROM leads WHERE id = ?').bind(lead.id).first();
    return json({ ok: true, sent, lead: toApp('leads', updated) }, env);
  }

  // ── Email a member directly (retention outreach; operator/admin only) ──
  const memberContact = path.match(/^members\/([^/]+)\/contact$/);
  if (memberContact && request.method === 'POST') {
    const tenantId = memberContact[1];
    const membership = await db.prepare('SELECT * FROM memberships WHERE tenant_id = ? ORDER BY created_at DESC').bind(tenantId).first<any>();
    if (!membership) return error('Member not found', env, 404);
    if (!(profile.role === 'admin' || (await operatesKitchen(env, membership.kitchen_id, profile.id)))) return error('Forbidden', env, 403);
    const who = await db.prepare('SELECT email, full_name FROM profiles WHERE id = ?').bind(tenantId).first<any>();
    if (!who?.email) return error('Member has no email on file', env, 404);
    const body: any = await request.json().catch(() => ({}));
    const subject = String(body.subject ?? '').trim().slice(0, 200) || 'Checking in';
    const message = String(body.message ?? '').trim().slice(0, 5000);
    if (!message) return error('Message is required', env, 400);

    const kitchenRow = await db.prepare('SELECT name FROM kitchens WHERE id = ?').bind(membership.kitchen_id).first<any>();
    // Replies go straight to the operator, not the no-reply mailbox.
    const sent = await sendEmail(env, who.email, subject,
      templates.leadMessage({ kitchen: kitchenRow?.name ?? 'your kitchen', senderName: profile.full_name ?? kitchenRow?.name ?? 'The team', message }),
      undefined, profile.email);

    const now = new Date().toISOString();
    const logLine = `[${now.slice(0, 10)}] Reached out: ${subject}`;
    const notes = membership.notes ? `${membership.notes}\n${logLine}` : logLine;
    await db.prepare('UPDATE memberships SET notes = ?, updated_at = ? WHERE id = ?').bind(notes, now, membership.id).run();
    return json({ ok: true, sent }, env);
  }

  // ── Suspend / reinstate an account (admin only) ────────────────────────
  const suspendMatch = path.match(/^users\/([^/]+)\/suspend$/);
  if (suspendMatch && request.method === 'POST') {
    if (profile.role !== 'admin') return error('Forbidden', env, 403);
    const body: any = await request.json().catch(() => ({}));
    const suspended = !!body.suspended;
    await db.prepare('UPDATE users SET suspended = ? WHERE id = ?').bind(suspended ? 1 : 0, suspendMatch[1]).run();
    // Let the member know their access changed (best-effort).
    try {
      const target = await db.prepare('SELECT email, full_name FROM profiles WHERE id = ?').bind(suspendMatch[1]).first<any>();
      if (target?.email) {
        if (suspended) {
          await sendEmail(env, target.email, 'Your Culina account has been paused',
            templates.accountSuspended({ name: target.full_name }));
        } else {
          await sendEmail(env, target.email, 'Your Culina account is active again',
            templates.accountReinstated({ name: target.full_name, loginUrl: `${appBase(env, request)}/auth/login` }));
        }
      }
    } catch (e) {
      console.error('[data] suspend email failed:', (e as Error).message);
    }
    return json({ ok: true, suspended }, env);
  }

  // ── Bulk-invite imported members who don't have an account yet ────────
  if (path === 'members/bulk-invite' && request.method === 'POST') {
    if (!(profile.role === 'operator' || profile.role === 'admin')) return error('Forbidden', env, 403);
    const body: any = await request.json().catch(() => ({}));
    // Operators invite into their own kitchen; admins may name one explicitly.
    const kitchen = profile.role === 'operator'
      ? await db.prepare('SELECT id, name FROM kitchens WHERE operator_id = ? LIMIT 1').bind(profile.id).first<any>()
      : body.kitchen_id
        ? await db.prepare('SELECT id, name FROM kitchens WHERE id = ?').bind(String(body.kitchen_id)).first<any>()
        : null;
    if (!kitchen) return error('No kitchen found', env, 400);

    // Members with a profile but no login yet (imported), who have an email.
    const rows = await all(env,
      `SELECT m.tenant_id, m.membership_type, p.email, p.full_name, tp.business_name
       FROM memberships m
       JOIN profiles p ON p.id = m.tenant_id
       LEFT JOIN tenant_profiles tp ON tp.tenant_id = m.tenant_id
       LEFT JOIN users u ON u.email = p.email
       WHERE m.kitchen_id = ? AND u.id IS NULL`, kitchen.id);

    const base = appBase(env, request);
    const now = new Date().toISOString();
    let invited = 0;
    let skipped = 0;
    for (const r of rows) {
      if (invited >= 100 || !r.email) { skipped++; continue; }
      // Already holding a live invitation → don't double-send.
      const pending = await db
        .prepare("SELECT id FROM invites WHERE kitchen_id = ? AND email = ? AND status = 'pending' AND expires_at >= ? LIMIT 1")
        .bind(kitchen.id, r.email, now)
        .first();
      if (pending) { skipped++; continue; }
      const token = randomToken();
      await db.prepare(`INSERT INTO invites (id, kitchen_id, lead_id, email, full_name, business_name, membership_type, token_hash, status, expires_at, created_at) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, 'pending', ?, ?)`)
        .bind(uuid(), kitchen.id, r.email, r.full_name ?? null, r.business_name ?? null, r.membership_type ?? 'monthly', await sha256Hex(token), new Date(Date.now() + 14 * 864e5).toISOString(), now).run();
      try {
        await sendEmail(env, r.email, `You’re invited to join ${kitchen.name}`,
          templates.inviteToJoin({ kitchen: kitchen.name, name: r.full_name ?? null, signupUrl: `${base}/auth/signup?invite=${token}` }));
      } catch (e) {
        console.error('[bulk-invite] email failed:', (e as Error).message);
      }
      invited++;
    }
    return json({ ok: true, invited, skipped }, env);
  }

  // ── On-demand compliance reminders for the caller's kitchen ───────────
  if (path === 'compliance/remind' && request.method === 'POST') {
    if (!(profile.role === 'operator' || profile.role === 'admin')) return error('Forbidden', env, 403);
    const body: any = await request.json().catch(() => ({}));
    const kitchenId = profile.role === 'operator'
      ? (await db.prepare('SELECT id FROM kitchens WHERE operator_id = ? LIMIT 1').bind(profile.id).first<{ id: string }>())?.id
      : body.kitchen_id ? String(body.kitchen_id) : undefined;
    if (!kitchenId) return error('No kitchen found', env, 400);

    const soon = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
    const rows = await all(env,
      `SELECT d.tenant_id, d.doc_type, p.email, p.full_name
       FROM compliance_documents d JOIN profiles p ON p.id = d.tenant_id
       WHERE d.kitchen_id = ? AND (d.status = 'expired' OR (d.expiration_date IS NOT NULL AND d.expiration_date <= ?))`, kitchenId, soon);

    // One reminder per member, even with several documents due.
    const seen = new Set<string>();
    const now = new Date().toISOString();
    let reminded = 0;
    for (const r of rows) {
      if (seen.has(r.tenant_id)) continue;
      seen.add(r.tenant_id);
      await db
        .prepare('INSERT INTO notifications (id, user_id, title, body, type, is_read, action_url, created_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?)')
        .bind(uuid(), r.tenant_id, 'Document expiring', `Your ${String(r.doc_type).replace(/_/g, ' ')} needs attention.`, 'document_expiring', '/tenant/documents', now)
        .run();
      if (r.email) {
        // Same email shape as the daily runComplianceSweep.
        await sendEmail(env, r.email, 'Action needed: a Culina compliance document is expiring',
          `<p>Hi ${r.full_name ?? 'there'},</p><p>Your <strong>${String(r.doc_type).replace(/_/g, ' ')}</strong> is expired or expiring soon. Please update it in Culina to keep booking.</p>`);
      }
      reminded += 1;
    }
    return json({ ok: true, reminded }, env);
  }

  // ── Warm funding-partner introduction request (any authed user) ───────
  if (path === 'grants/intro' && request.method === 'POST') {
    const body: any = await request.json().catch(() => ({}));
    const grantTitle = String(body.grant_title ?? '').trim().slice(0, 200);
    const funder = String(body.funder ?? '').trim().slice(0, 200);
    if (!grantTitle && !funder) return error('Tell us which grant or funder you’d like an introduction to.', env, 400);

    const tp = await db.prepare('SELECT business_name, business_type FROM tenant_profiles WHERE tenant_id = ?').bind(profile.id).first<any>();
    const inbox = env.EMAIL_REPLY_TO || 'gardener@thecros.app';
    // Replies go straight to the requester so the intro can happen by email.
    await sendEmail(env, inbox, `Funding intro request: ${funder || grantTitle}`,
      emailLayout({
        heading: 'A maker wants a funding introduction',
        intro: `<strong>${esc(profile.full_name ?? profile.email)}</strong> (${esc(profile.email)})${tp?.business_name ? ` of <strong>${esc(tp.business_name)}</strong>` : ''}${tp?.business_type ? ` — ${esc(tp.business_type)}` : ''} asked for an introduction.<br/><br/>Grant: <strong>${esc(grantTitle || '—')}</strong><br/>Funder: <strong>${esc(funder || '—')}</strong>`,
        outro: 'Reply to this email to reach them directly.',
      }), undefined, profile.email);

    // Warm acknowledgement to the requester (best-effort).
    try {
      await sendEmail(env, profile.email, 'We’re on it — your funding introduction',
        emailLayout({
          heading: 'We’re on it',
          intro: `Hi ${esc((profile.full_name ?? 'there').split(' ')[0])}, thanks for raising your hand${funder ? ` about ${esc(funder)}` : ''}. We’ll make the introduction and you’ll hear back by email.`,
          outro: 'Anything to add in the meantime? Just reply to this email.',
        }));
    } catch (e) {
      console.error('[grants/intro] ack failed:', (e as Error).message);
    }
    return json({ ok: true }, env);
  }

  // ── Co-packer matchmaking submission (any authed user) ────────────────
  if (path === 'copacker/submit' && request.method === 'POST') {
    const body: any = await request.json().catch(() => ({}));
    const company = String(body.company ?? '').trim().slice(0, 200);
    const location = String(body.location ?? '').trim().slice(0, 200);
    const capabilities = String(body.capabilities ?? '').trim().slice(0, 2000);
    const notes = String(body.notes ?? '').trim().slice(0, 2000);
    if (!company || !capabilities) return error('Company and capabilities are required.', env, 400);

    const tp = await db.prepare('SELECT business_name, business_type FROM tenant_profiles WHERE tenant_id = ?').bind(profile.id).first<any>();
    const inbox = env.EMAIL_REPLY_TO || 'gardener@thecros.app';
    await sendEmail(env, inbox, `Co-packer matchmaking: ${company}`,
      emailLayout({
        heading: 'A maker is looking for a co-packer',
        intro: `<strong>${esc(profile.full_name ?? profile.email)}</strong> (${esc(profile.email)})${tp?.business_name ? ` of <strong>${esc(tp.business_name)}</strong>` : ''}${tp?.business_type ? ` — ${esc(tp.business_type)}` : ''} submitted a match request.<br/><br/>Company: <strong>${esc(company)}</strong><br/>Location: <strong>${esc(location || '—')}</strong><br/>Capabilities needed: ${esc(capabilities)}<br/>Notes: ${esc(notes || '—')}`,
        outro: 'Reply to this email to reach them directly.',
      }), undefined, profile.email);

    // Warm acknowledgement to the submitter (best-effort).
    try {
      await sendEmail(env, profile.email, 'We’re on it — your co-packer match',
        emailLayout({
          heading: 'We’re on it',
          intro: `Hi ${esc((profile.full_name ?? 'there').split(' ')[0])}, thanks for the details about ${esc(company)}. We’ll look for a good co-packer match and you’ll hear back by email.`,
          outro: 'Anything to add in the meantime? Just reply to this email.',
        }));
    } catch (e) {
      console.error('[copacker] ack failed:', (e as Error).message);
    }
    return json({ ok: true }, env);
  }

  // ── The kitchen's subscribable calendar URL (operator) ────────────────
  if (path === 'integrations/ical-url' && request.method === 'GET') {
    const k = await db.prepare('SELECT id FROM kitchens WHERE operator_id = ? LIMIT 1').bind(profile.id).first<{ id: string }>();
    if (!k) return error('No kitchen found for this operator', env, 404);
    const t = await sha256Hex(`ical:${k.id}:${await getAuthSecret(env)}`);
    return json({ url: `${appBase(env, request)}/api/data/calendar-feed?k=${encodeURIComponent(k.id)}&t=${t}` }, env);
  }

  // ── Convert a lead into a member: add now, or invite them to join ──────
  const leadConvert = path.match(/^leads\/([^/]+)\/convert$/);
  if (leadConvert && request.method === 'POST') {
    const lead = await db.prepare('SELECT * FROM leads WHERE id = ?').bind(leadConvert[1]).first<any>();
    if (!lead) return error('Lead not found', env, 404);
    if (!(profile.role === 'admin' || (await operatesKitchen(env, lead.kitchen_id, profile.id)))) return error('Forbidden', env, 403);
    const body: any = await request.json().catch(() => ({}));
    const membershipType = ['hourly', 'monthly', 'annual'].includes(body.membership_type) ? body.membership_type : 'monthly';
    const kitchenRow = await db.prepare('SELECT name FROM kitchens WHERE id = ?').bind(lead.kitchen_id).first<any>();
    const kitchenName = kitchenRow?.name ?? 'the kitchen';
    const now = new Date().toISOString();
    const base = appBase(env, request);
    const note = (line: string) => (lead.notes ? `${lead.notes}\n[${now.slice(0, 10)}] ${line}` : `[${now.slice(0, 10)}] ${line}`);

    const existingUser = await db.prepare('SELECT id FROM users WHERE email = ?').bind(lead.email).first<{ id: string }>();
    if (existingUser) {
      // They already have an account — welcome them in as a member now.
      let membership = await db.prepare('SELECT id FROM memberships WHERE tenant_id = ? AND kitchen_id = ?').bind(existingUser.id, lead.kitchen_id).first<{ id: string }>();
      if (!membership) {
        const mid = uuid();
        await db.prepare(`INSERT INTO memberships (id, kitchen_id, tenant_id, status, membership_type, start_date, notes, created_at, updated_at) VALUES (?, ?, ?, 'active', ?, ?, ?, ?, ?)`)
          .bind(mid, lead.kitchen_id, existingUser.id, membershipType, now.slice(0, 10), 'Welcomed from an inquiry.', now, now).run();
        membership = { id: mid };
      }
      await db.prepare("UPDATE leads SET status = 'converted', converted_membership_id = ?, notes = ?, updated_at = ? WHERE id = ?").bind(membership.id, note('Welcomed as a member'), now, lead.id).run();
      try {
        await db.prepare('INSERT INTO notifications (id, user_id, title, body, type, is_read, action_url, created_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?)')
          .bind(uuid(), existingUser.id, `Welcome to ${kitchenName}`, 'You’ve been welcomed in as a member.', 'membership', '/tenant', now).run();
        await sendEmail(env, lead.email, `Welcome to ${kitchenName}`, templates.addedToKitchen({ kitchen: kitchenName, name: lead.full_name, loginUrl: `${base}/auth/login` }));
      } catch (e) {
        console.error('[convert] welcome failed:', (e as Error).message);
      }
      const updatedLead = await db.prepare('SELECT * FROM leads WHERE id = ?').bind(lead.id).first();
      return json({ ok: true, mode: 'added', lead: toApp('leads', updatedLead) }, env);
    }

    // No account yet — send a warm invitation to join.
    const token = randomToken();
    await db.prepare(`INSERT INTO invites (id, kitchen_id, lead_id, email, full_name, business_name, membership_type, token_hash, status, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`)
      .bind(uuid(), lead.kitchen_id, lead.id, lead.email, lead.full_name, lead.business_name, membershipType, await sha256Hex(token), new Date(Date.now() + 14 * 864e5).toISOString(), now).run();
    await db.prepare("UPDATE leads SET status = 'converted', notes = ?, updated_at = ? WHERE id = ?").bind(note('Invitation to join sent'), now, lead.id).run();
    try {
      await sendEmail(env, lead.email, `You’re invited to join ${kitchenName}`, templates.inviteToJoin({ kitchen: kitchenName, name: lead.full_name, signupUrl: `${base}/auth/signup?invite=${token}` }));
    } catch (e) {
      console.error('[convert] invite email failed:', (e as Error).message);
    }
    const updatedLead = await db.prepare('SELECT * FROM leads WHERE id = ?').bind(lead.id).first();
    return json({ ok: true, mode: 'invited', lead: toApp('leads', updatedLead) }, env);
  }

  // ── Send an invoice to its tenant by email (operator/admin only) ──────
  const invSend = path.match(/^invoices\/([^/]+)\/send$/);
  if (invSend && request.method === 'POST') {
    const inv = await db.prepare('SELECT * FROM invoices WHERE id = ?').bind(invSend[1]).first<any>();
    if (!inv) return error('Invoice not found', env, 404);
    if (!(profile.role === 'admin' || (await operatesKitchen(env, inv.kitchen_id, profile.id)))) return error('Forbidden', env, 403);

    const [tenant, kitchenRow] = await Promise.all([
      db.prepare('SELECT email, full_name FROM profiles WHERE id = ?').bind(inv.tenant_id).first<any>(),
      db.prepare('SELECT name, stripe_account_id, stripe_onboarded FROM kitchens WHERE id = ?').bind(inv.kitchen_id).first<any>(),
    ]);
    let emailed = false;
    if (tenant?.email) {
      const period = inv.period_start ? new Date(inv.period_start).toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }) : undefined;
      // When the kitchen accepts online payment, the email CTA is a durable pay link.
      const payable = !!env.STRIPE_SECRET_KEY && !!kitchenRow?.stripe_account_id && !!kitchenRow?.stripe_onboarded;
      const ctaUrl = payable ? await invoicePayUrl(env, inv.id, appBase(env, request)) : `${appBase(env, request)}/tenant/bookings`;
      emailed = await sendEmail(env, tenant.email, `Invoice ${inv.invoice_number} from ${kitchenRow?.name ?? 'Culina'}`,
        templates.invoiceNew({ name: tenant.full_name, period, number: inv.invoice_number, total: money(inv.total_cents), dueDate: inv.due_date ?? '—', viewUrl: ctaUrl, cta: payable ? 'Pay invoice' : undefined }));
    }
    if (inv.status === 'draft') await db.prepare("UPDATE invoices SET status = 'sent' WHERE id = ?").bind(inv.id).run();
    try {
      await db.prepare('INSERT INTO notifications (id, user_id, title, body, type, is_read, action_url, created_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?)')
        .bind(uuid(), inv.tenant_id, 'New invoice', `Invoice ${inv.invoice_number} is ready to review.`, 'invoice_due', '/tenant/bookings', new Date().toISOString()).run();
    } catch { /* non-fatal */ }
    const updated = await db.prepare('SELECT * FROM invoices WHERE id = ?').bind(inv.id).first();
    return json({ ok: true, emailed, invoice: toApp('invoices', updated) }, env);
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
