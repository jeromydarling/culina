import { type Env } from '../lib/http';
import { sendEmail, templates } from '../email';
import { uuid } from '../lib/crypto';
import { invoicePayUrl } from '../stripe';

/**
 * Daily compliance sweep: flag expired documents, and notify + email tenants
 * whose required docs are expired or expiring within 30 days.
 */
export async function runComplianceSweep(env: Env): Promise<{ flagged: number; notified: number }> {
  if (!env.DB) return { flagged: 0, notified: 0 };
  const db = env.DB;
  const now = new Date();
  const soon = new Date(now.getTime() + 30 * 864e5).toISOString().slice(0, 10);
  const today = now.toISOString().slice(0, 10);

  // 1) Move past-due approved docs to "expired".
  const flagged = await db
    .prepare("UPDATE compliance_documents SET status = 'expired' WHERE status = 'approved' AND expiration_date IS NOT NULL AND expiration_date < ?")
    .bind(today)
    .run();

  // 2) Notify tenants with expired or soon-expiring docs.
  const { results } = await db
    .prepare(
      `SELECT d.id, d.doc_type, d.expiration_date, d.tenant_id, p.email, p.full_name
       FROM compliance_documents d JOIN profiles p ON p.id = d.tenant_id
       WHERE d.status = 'expired' OR (d.expiration_date IS NOT NULL AND d.expiration_date <= ?)`,
    )
    .bind(soon)
    .all();

  let notified = 0;
  for (const r of results as any[]) {
    await db
      .prepare('INSERT INTO notifications (id, user_id, title, body, type, is_read, action_url, created_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?)')
      .bind(uuid(), r.tenant_id, 'Document expiring', `Your ${String(r.doc_type).replace(/_/g, ' ')} needs attention.`, 'document_expiring', '/tenant/documents', new Date().toISOString())
      .run();
    if (r.email) {
      await sendEmail(env, r.email, 'Action needed: a Culina compliance document is expiring',
        `<p>Hi ${r.full_name ?? 'there'},</p><p>Your <strong>${String(r.doc_type).replace(/_/g, ' ')}</strong> is expired or expiring soon. Please update it in Culina to keep booking.</p>`);
    }
    notified += 1;
  }
  return { flagged: flagged.meta.changes ?? 0, notified };
}

/**
 * Monthly invoicing: roll each tenant's confirmed/completed bookings from the
 * prior calendar month into a single draft invoice per tenant. Idempotent —
 * skips a tenant if an invoice for that period already exists.
 */
export async function runMonthlyInvoicing(env: Env): Promise<{ created: number }> {
  if (!env.DB) return { created: 0 };
  const db = env.DB;
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const periodStart = start.toISOString().slice(0, 10);
  const periodEnd = new Date(end.getTime() - 864e5).toISOString().slice(0, 10);
  const monthLabel = start.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const feePct = Number(env.STRIPE_PLATFORM_FEE_PERCENT ?? 1.5);

  const { results } = await db
    .prepare(
      `SELECT kitchen_id, tenant_id, COUNT(*) AS n, SUM(COALESCE(subtotal_cents,0)) AS subtotal,
              SUM((julianday(end_time) - julianday(start_time)) * 24) AS hours
       FROM bookings
       WHERE start_time >= ? AND start_time < ? AND status IN ('confirmed','completed')
       GROUP BY kitchen_id, tenant_id`,
    )
    .bind(start.toISOString(), end.toISOString())
    .all();

  // Active monthly plans also owe their base fee (kitchen's monthly price) —
  // even in a quiet month — and pay overage beyond any included hours.
  const { results: plans } = await db
    .prepare(
      `SELECT m.kitchen_id, m.tenant_id, m.monthly_hours_included, m.hourly_overage_rate_cents, k.monthly_price_cents
       FROM memberships m JOIN kitchens k ON k.id = m.kitchen_id
       WHERE m.status = 'active' AND m.membership_type = 'monthly'`,
    )
    .all();

  type Line = { description: string; qty: number; unit_price: number; total: number };
  type Pair = { kitchen_id: string; tenant_id: string; n: number; subtotal: number; hours: number; plan?: any };
  const byPair = new Map<string, Pair>();
  for (const r of results as any[]) {
    byPair.set(`${r.kitchen_id}:${r.tenant_id}`, { kitchen_id: r.kitchen_id, tenant_id: r.tenant_id, n: Number(r.n) || 0, subtotal: Number(r.subtotal) || 0, hours: Number(r.hours) || 0 });
  }
  for (const p of plans as any[]) {
    const key = `${p.kitchen_id}:${p.tenant_id}`;
    const row: Pair = byPair.get(key) ?? { kitchen_id: p.kitchen_id, tenant_id: p.tenant_id, n: 0, subtotal: 0, hours: 0 };
    row.plan = p;
    byPair.set(key, row);
  }

  let created = 0;
  for (const r of byPair.values()) {
    const existing = await db
      .prepare('SELECT id FROM invoices WHERE tenant_id = ? AND kitchen_id = ? AND period_start = ? LIMIT 1')
      .bind(r.tenant_id, r.kitchen_id, periodStart)
      .first();
    if (existing) continue;

    const lines: Line[] = [];
    if (r.plan) {
      const base = Number(r.plan.monthly_price_cents) || 0;
      if (base > 0) lines.push({ description: `Monthly membership — ${monthLabel}`, qty: 1, unit_price: base / 100, total: base / 100 });
      const included = Number(r.plan.monthly_hours_included) || 0;
      const rate = Number(r.plan.hourly_overage_rate_cents) || 0;
      if (included > 0) {
        // Plan covers included hours; bill only the overage beyond them.
        const over = Math.max(0, r.hours - included);
        if (over > 0 && rate > 0) {
          const qty = Math.round(over * 10) / 10;
          lines.push({ description: `Overage hours beyond ${included} included — ${monthLabel}`, qty, unit_price: rate / 100, total: Math.round(qty * rate) / 100 });
        }
      } else if (r.subtotal > 0) {
        // No included hours on the plan — bookings bill at their booked price.
        lines.push({ description: `Kitchen bookings — ${monthLabel} (${r.n} sessions)`, qty: 1, unit_price: r.subtotal / 100, total: r.subtotal / 100 });
      }
    } else if (r.subtotal > 0) {
      lines.push({ description: `Kitchen bookings — ${monthLabel} (${r.n} sessions)`, qty: 1, unit_price: r.subtotal / 100, total: r.subtotal / 100 });
    }

    const subtotal = Math.round(lines.reduce((s, l) => s + l.total, 0) * 100);
    if (subtotal <= 0) continue;
    const fee = Math.round(subtotal * (feePct / 100));
    const lineItems = JSON.stringify(lines);
    const invId = crypto.randomUUID();
    const number = `INV-${now.getUTCFullYear()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
    const due = new Date(now.getTime() + 14 * 864e5).toISOString().slice(0, 10);

    await db
      .prepare(
        `INSERT INTO invoices (id, kitchen_id, tenant_id, invoice_number, period_start, period_end,
          line_items, subtotal_cents, tax_cents, total_cents, platform_fee_cents, status, due_date, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 'draft', ?, ?, ?)`,
      )
      .bind(invId, r.kitchen_id, r.tenant_id, number, periodStart, periodEnd, lineItems, subtotal, subtotal + fee, fee, due, `Auto-generated from ${monthLabel} activity.`, new Date().toISOString())
      .run();

    await db
      .prepare('INSERT INTO notifications (id, user_id, title, body, type, is_read, action_url, created_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?)')
      .bind(crypto.randomUUID(), r.tenant_id, 'New invoice ready', `Your ${monthLabel} booking invoice is ready to review.`, 'invoice_due', '/tenant/bookings', new Date().toISOString())
      .run();

    // Email the tenant their new invoice (best-effort).
    try {
      const tp = await db.prepare('SELECT email, full_name FROM profiles WHERE id = ?').bind(r.tenant_id).first<any>();
      if (tp?.email) {
        const base = (env.APP_URL || 'https://culina.life').replace(/\/$/, '');
        // Pay-online CTA when the kitchen accepts Stripe payments.
        const k = await db.prepare('SELECT stripe_account_id, stripe_onboarded FROM kitchens WHERE id = ?').bind(r.kitchen_id).first<any>();
        const payable = !!env.STRIPE_SECRET_KEY && !!k?.stripe_account_id && !!k?.stripe_onboarded;
        const ctaUrl = payable ? await invoicePayUrl(env, invId, base) : `${base}/tenant/bookings`;
        await sendEmail(env, tp.email, `Your ${monthLabel} Culina invoice`,
          templates.invoiceNew({ name: tp.full_name, period: monthLabel, total: `$${((subtotal + fee) / 100).toFixed(2)}`, dueDate: due, viewUrl: ctaUrl, cta: payable ? 'Pay invoice' : undefined }));
      }
    } catch (e) {
      console.error('[invoicing] email failed:', (e as Error).message);
    }
    created += 1;
  }
  return { created };
}
