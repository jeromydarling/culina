import { API_URL } from './config';
import { getToken } from './authApi';
import { reportError } from './telemetry';
import type { ImportTenantRow } from './store';

export interface TenantRow {
  id: string;
  tenant_id: string;
  status: string;
  membership_type: string;
  start_date: string | null;
  full_name: string | null;
  email: string;
  business_name: string | null;
  business_type: string | null;
  annual_revenue_estimate: number | null;
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}/api/data/${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    const err = new Error((data as { error?: string }).error ?? `Request failed (${res.status})`);
    if (res.status >= 500) reportError(err, { path });
    throw err;
  }
  return data;
}

export const dataApi = {
  bootstrap: () => req<{ kitchen: Record<string, unknown> | null; tenants: TenantRow[] }>('bootstrap'),
  kitchens: () => req<{ kitchens: any[] }>('kitchens'), // public listed-kitchen directory
  kitchenBySlug: (slug: string) => req<{ kitchen: any | null; spaces?: any[]; equipment?: any[] }>(`kitchen/${encodeURIComponent(slug)}`),
  // Public: look up a membership invitation by token (prefills sign-up).
  invite: (token: string) => req<{ invite: { email: string; full_name: string | null; business_name: string | null; kitchen_name: string } | null }>(`invite/${encodeURIComponent(token)}`),
  hydrate: async () => {
    const data = await req<Record<string, any[]>>('hydrate');
    // Seed revision tokens so write-through can detect concurrent edits.
    for (const arr of Object.values(data)) {
      if (Array.isArray(arr)) for (const row of arr) if (row?.id && row?.updated_at) serverRev[row.id] = row.updated_at;
    }
    return data;
  },
  storefront: (slug: string) => req<{ profile: any; site: any; products: any[] }>(`storefront/${encodeURIComponent(slug)}`),
  importTenants: (rows: ImportTenantRow[]) =>
    req<{ imported: number }>('tenants/import', { method: 'POST', body: JSON.stringify({ rows }) }),
  createBooking: (input: { space_id: string; start_time: string; end_time: string; equipment_ids?: string[]; notes?: string; tenant_id?: string }) =>
    req<{ booking: any }>('bookings', { method: 'POST', body: JSON.stringify(input) }),
  updateBooking: (id: string, patch: { status?: string; notes?: string }) =>
    req<{ booking: any }>(`bookings/${id}`, { method: 'POST', body: JSON.stringify(patch) }),
  // Public kitchen-page inquiry → creates a lead + notifies the operator.
  createLead: (input: { kitchen_id?: string; kitchen_slug?: string; full_name: string; email: string; phone?: string; business_name?: string; message?: string; source?: string }) =>
    req<{ ok: boolean; id?: string }>('leads', { method: 'POST', body: JSON.stringify(input) }),
  // Operator/admin: email an invoice to its tenant and mark it sent.
  sendInvoice: (id: string) =>
    req<{ ok: boolean; emailed: boolean; invoice: any }>(`invoices/${id}/send`, { method: 'POST', body: JSON.stringify({}) }),
  // Operator/admin: email a lead directly from the CRM (replies go to the operator).
  contactLead: (id: string, subject: string, message: string) =>
    req<{ ok: boolean; sent: boolean; lead: any }>(`leads/${id}/contact`, { method: 'POST', body: JSON.stringify({ subject, message }) }),
  // Operator/admin: retention outreach — email a current member (replies go to the operator).
  contactMember: (tenantId: string, subject: string, message: string) =>
    req<{ ok: boolean; sent: boolean }>(`members/${tenantId}/contact`, { method: 'POST', body: JSON.stringify({ subject, message }) }),
  // Operator/admin: welcome a lead in — adds a membership now (existing account)
  // or sends an invitation to join (new person).
  convertLead: (id: string, membershipType: string) =>
    req<{ ok: boolean; mode: 'added' | 'invited'; lead: any }>(`leads/${id}/convert`, { method: 'POST', body: JSON.stringify({ membership_type: membershipType }) }),
  errors: () => req<{ errors: any[] }>('errors'),
  // Super-admin CRM: per-customer status/tags + the activity timeline.
  crm: () => req<{ customers: any[]; activities: any[]; tasks: any[] }>('crm'),
  exportUrl: () => `${API_URL}/api/account/export`,
  async deleteAccount(): Promise<{ ok: boolean }> {
    const res = await fetch(`${API_URL}/api/account/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) },
    });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (!res.ok) {
      const err = new Error(data.error ?? `Account deletion failed (${res.status})`);
      if (res.status >= 500) reportError(err, { path: 'account/delete' });
      throw err;
    }
    return { ok: !!data.ok };
  },
};

// ─── Optimistic concurrency (no silent lost updates) ────────────────────────
const serverRev: Record<string, string> = {}; // row id → last-known server updated_at
let conflictHandler: (() => void) | null = null;
export function setConflictHandler(fn: () => void) {
  conflictHandler = fn;
}

/**
 * Write-through persistence. Sends the row + the revision the client last saw;
 * if the server's row is newer (someone else edited it) the server returns 409,
 * and we trigger a reconcile so the user sees the latest instead of clobbering.
 */
export async function persist(table: string, row: Record<string, unknown>): Promise<void> {
  try {
    const res = await fetch(`${API_URL}/api/data/upsert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) },
      body: JSON.stringify({ table, row, base_updated_at: serverRev[row.id as string] }),
    });
    if (res.status === 409) {
      conflictHandler?.();
      return;
    }
    if (!res.ok) {
      reportError(new Error(`persist ${table} failed (${res.status})`));
      return;
    }
    const data = (await res.json().catch(() => ({}))) as { updated_at?: string };
    if (data.updated_at && row.id) serverRev[row.id as string] = data.updated_at;
  } catch (e) {
    reportError(e, { op: 'persist', table });
  }
}

export function removeRemote(table: string, id: string): void {
  void fetch(`${API_URL}/api/data/${table}/${id}`, {
    method: 'DELETE',
    headers: { ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) },
  }).catch((e) => reportError(e, { op: 'delete', table }));
}
