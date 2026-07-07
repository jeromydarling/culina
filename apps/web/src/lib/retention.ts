import type { Membership, Booking, Invoice, ComplianceDocument, TenantProfile } from '@culina/shared';
import { DOC_TYPE_LABELS } from '@culina/shared';

/**
 * Member retention / churn-risk scoring.
 *
 * A health score (0–100) derived from the signals a real operator would watch:
 * booking recency + what's on the calendar, overdue billing, expiring
 * compliance, and how much of a paid plan is actually being used. The goal is
 * to surface who needs a human touch BEFORE they quietly cancel.
 */
export type HealthBand = 'healthy' | 'watch' | 'at_risk';

export interface MemberHealth {
  score: number;
  band: HealthBand;
  reasons: string[]; // negative drivers, worst first
  lastBookingDays: number | null;
  upcomingCount: number;
  utilizationPct: number | null; // for monthly plans with included hours
}

const DAY = 864e5;
const hoursBetween = (a: string, b: string) => Math.max(0, (new Date(b).getTime() - new Date(a).getTime()) / 3.6e6);

export function bandFor(score: number): HealthBand {
  return score >= 70 ? 'healthy' : score >= 40 ? 'watch' : 'at_risk';
}

export const BAND_LABEL: Record<HealthBand, string> = {
  healthy: 'Healthy',
  watch: 'Watch',
  at_risk: 'At risk',
};

export function memberHealth(input: {
  membership: Membership;
  bookings: Booking[];
  invoices: Invoice[];
  docs: ComplianceDocument[];
  tenantProfile?: TenantProfile | null;
  now?: Date;
}): MemberHealth {
  const { membership, bookings, invoices, docs } = input;
  const now = input.now ?? new Date();
  const reasons: { text: string; weight: number }[] = [];
  let score = 100;
  const penalize = (weight: number, text: string) => {
    score -= weight;
    reasons.push({ text, weight });
  };

  // Suspended is the clearest signal of all.
  if (membership.status === 'suspended') penalize(45, 'Membership is paused');

  // ── Booking recency ──────────────────────────────────────────────────
  const real = bookings.filter((b) => b.status !== 'cancelled');
  const past = real.filter((b) => new Date(b.start_time) <= now).sort((a, b) => +new Date(b.start_time) - +new Date(a.start_time));
  const upcoming = real.filter((b) => new Date(b.start_time) > now);
  const memberAgeDays = membership.start_date ? (now.getTime() - new Date(membership.start_date).getTime()) / DAY : 999;

  let lastBookingDays: number | null = null;
  if (past.length === 0) {
    if (memberAgeDays > 14) penalize(35, 'No bookings yet');
  } else {
    lastBookingDays = Math.floor((now.getTime() - new Date(past[0].start_time).getTime()) / DAY);
    if (lastBookingDays > 45) penalize(30, `Hasn't booked in ${lastBookingDays} days`);
    else if (lastBookingDays > 21) penalize(15, `Quiet — last booked ${lastBookingDays} days ago`);
  }
  if (upcoming.length === 0 && membership.status === 'active') penalize(10, 'Nothing on the calendar');

  // Recent no-shows are a strong disengagement signal.
  const noShows = past.filter((b) => b.status === 'no_show' && now.getTime() - new Date(b.start_time).getTime() < 60 * DAY).length;
  if (noShows > 0) penalize(Math.min(15, noShows * 6), `${noShows} recent no-show${noShows > 1 ? 's' : ''}`);

  // ── Billing ──────────────────────────────────────────────────────────
  const overdue = invoices.filter(
    (i) => i.status === 'overdue' || (i.status === 'sent' && i.due_date && new Date(i.due_date) < now),
  );
  if (overdue.length > 0) penalize(25, `${overdue.length} overdue invoice${overdue.length > 1 ? 's' : ''}`);

  // ── Compliance ───────────────────────────────────────────────────────
  const expired = docs.filter((d) => d.status === 'expired' || (d.expiration_date && new Date(d.expiration_date) < now));
  const expiring = docs.filter((d) => d.expiration_date && new Date(d.expiration_date) >= now && new Date(d.expiration_date) < new Date(now.getTime() + 30 * DAY));
  if (expired.length > 0) penalize(20, `${DOC_TYPE_LABELS[expired[0].doc_type] ?? 'A document'} expired`);
  else if (expiring.length > 0) penalize(8, `${DOC_TYPE_LABELS[expiring[0].doc_type] ?? 'A document'} expiring soon`);

  // ── Utilization of a paid monthly plan ───────────────────────────────
  let utilizationPct: number | null = null;
  const included = membership.monthly_hours_included ?? 0;
  if (membership.membership_type === 'monthly' && included > 0) {
    const usedThisMonth = real
      .filter((b) => {
        const d = new Date(b.start_time);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && b.status !== 'no_show';
      })
      .reduce((s, b) => s + hoursBetween(b.start_time, b.end_time), 0);
    utilizationPct = Math.round((usedThisMonth / included) * 100);
    if (utilizationPct < 10) penalize(20, `Using ~${utilizationPct}% of ${included} paid hrs`);
    else if (utilizationPct < 30) penalize(8, `Low usage — ${utilizationPct}% of ${included} hrs`);
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  return {
    score,
    band: membership.status === 'suspended' ? 'at_risk' : bandFor(score),
    reasons: reasons.sort((a, b) => b.weight - a.weight).map((r) => r.text),
    lastBookingDays,
    upcomingCount: upcoming.length,
    utilizationPct,
  };
}

/** A warm, pre-filled outreach draft tailored to the member's top risk. */
export function suggestOutreach(name: string, health: MemberHealth): { subject: string; message: string } {
  const first = name.trim().split(' ')[0] || 'there';
  const top = health.reasons[0] ?? '';
  let opener = `Hi ${first}, just checking in — how are things going in the kitchen?`;
  if (/hasn't booked|No bookings|Quiet|calendar/i.test(top))
    opener = `Hi ${first}, we haven't seen you in the kitchen lately and wanted to check in. Is there anything we can do to help you get back to a good rhythm?`;
  else if (/overdue/i.test(top))
    opener = `Hi ${first}, a quick note on your account — we'd love to sort out your latest invoice together. Anything we can help with?`;
  else if (/expired|expiring/i.test(top))
    opener = `Hi ${first}, one of your documents needs a refresh so you can keep booking without interruption. Happy to help you get it sorted.`;
  else if (/Using|Low usage/i.test(top))
    opener = `Hi ${first}, we noticed you haven't used much of your kitchen time this month — we'd hate for it to go to waste. Want help planning a production run?`;
  return {
    subject: 'Checking in from your kitchen',
    message: `${opener}\n\nWe're glad you're part of the community and want to make sure Culina is working well for you.\n\n— Your kitchen team`,
  };
}
