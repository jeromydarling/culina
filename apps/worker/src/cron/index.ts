import { type Env } from '../lib/http';
import { sendEmail } from '../email';
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
