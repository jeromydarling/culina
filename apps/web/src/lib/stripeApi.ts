import { API_URL } from './config';
import { getToken } from './authApi';

async function post(path: string, body: unknown, auth = false): Promise<any> {
  const res = await fetch(`${API_URL}/api/stripe/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(auth && getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok && !data.demo) throw new Error(data.error ?? `Stripe request failed (${res.status})`);
  return data as { url?: string; demo?: boolean; error?: string };
}

/** Begin Stripe Connect onboarding for the signed-in operator/maker. */
export const connectStart = (returnUrl: string) => post('connect/start', { return_url: returnUrl }, true);

/** Create a storefront Checkout session (public — the customer is buying). */
export const startCheckout = (slug: string, items: { product_id: string; qty: number }[], email?: string) =>
  post('checkout', { slug, items, email });
