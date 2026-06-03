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
  importTenants: (rows: ImportTenantRow[]) =>
    req<{ imported: number }>('tenants/import', { method: 'POST', body: JSON.stringify({ rows }) }),
};
