import { type Env } from '../lib/http';
import { sendEmail, templates } from '../email';
import { uuid } from '../lib/crypto';

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
      `SELECT kitchen_id, tenant_id, COUNT(*) AS n, SUM(COALESCE(subtotal_cents,0)) AS subtotal
       FROM bookings
       WHERE start_time >= ? AND start_time < ? AND status IN ('confirmed','completed')
       GROUP BY kitchen_id, tenant_id HAVING subtotal > 0`,
    )
    .bind(start.toISOString(), end.toISOString())
    .all();

  let created = 0;
  for (const r of results as any[]) {
    const existing = await db
      .prepare('SELECT id FROM invoices WHERE tenant_id = ? AND kitchen_id = ? AND period_start = ? LIMIT 1')
      .bind(r.tenant_id, r.kitchen_id, periodStart)
      .first();
    if (existing) continue;

    const subtotal = Number(r.subtotal) || 0;
    const fee = Math.round(subtotal * (feePct / 100));
    const lineItems = JSON.stringify([
      { description: `Kitchen bookings — ${monthLabel} (${r.n} sessions)`, qty: 1, unit_price: subtotal / 100, total: subtotal / 100 },
    ]);
    const number = `INV-${now.getUTCFullYear()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
    const due = new Date(now.getTime() + 14 * 864e5).toISOString().slice(0, 10);

    await db
      .prepare(
        `INSERT INTO invoices (id, kitchen_id, tenant_id, invoice_number, period_start, period_end,
          line_items, subtotal_cents, tax_cents, total_cents, platform_fee_cents, status, due_date, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 'draft', ?, ?, ?)`,
      )
      .bind(crypto.randomUUID(), r.kitchen_id, r.tenant_id, number, periodStart, periodEnd, lineItems, subtotal, subtotal + fee, fee, due, `Auto-generated from ${monthLabel} bookings.`, new Date().toISOString())
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
        await sendEmail(env, tp.email, `Your ${monthLabel} Culina invoice`,
          templates.invoiceNew({ name: tp.full_name, month: monthLabel, total: `$${((subtotal + fee) / 100).toFixed(2)}`, dueDate: due, viewUrl: `${base}/tenant/bookings` }));
      }
    } catch (e) {
      console.error('[invoicing] email failed:', (e as Error).message);
    }
    created += 1;
  }
  return { created };
}
