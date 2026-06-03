import { API_URL } from './config';
import { getToken } from './authApi';
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
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`);
  return data;
}

export const dataApi = {
  bootstrap: () => req<{ kitchen: Record<string, unknown> | null; tenants: TenantRow[] }>('bootstrap'),
  hydrate: () => req<Record<string, unknown[]>>('hydrate'),
  storefront: (slug: string) =>
    req<{ profile: any; site: any; products: any[] }>(`storefront/${encodeURIComponent(slug)}`),
  importTenants: (rows: ImportTenantRow[]) =>
    req<{ imported: number }>('tenants/import', { method: 'POST', body: JSON.stringify({ rows }) }),
};

/**
 * Write-through persistence. Called by the in-memory store after a mutation
 * when running in LIVE mode; a no-op otherwise. Fire-and-forget — failures are
 * logged but don't block the optimistic UI update.
 */
export function persist(table: string, row: Record<string, unknown>): void {
  void req('upsert', { method: 'POST', body: JSON.stringify({ table, row }) }).catch((e) =>
    console.warn(`persist(${table}) failed:`, e.message),
  );
}

export function removeRemote(table: string, id: string): void {
  void req(`${table}/${id}`, { method: 'DELETE' }).catch((e) =>
    console.warn(`delete(${table}) failed:`, e.message),
  );
}

