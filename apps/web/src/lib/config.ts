/**
 * App configuration. Culina runs 100% on Cloudflare — D1 (SQLite) + R2 (files),
 * fronted by the Worker. No external accounts.
 *
 * Backend mode:
 *  - DEMO (default): seeded in-memory store + simulated auth — zero setup.
 *  - LIVE: real Cloudflare D1 persistence + Worker JWT auth.
 *
 * LIVE can be enabled at build time (VITE_USE_API=true) OR toggled at runtime in
 * the browser via the login screen (persisted in localStorage), so you can try
 * the real backend without any redeploy.
 */
const RUNTIME_KEY = 'culina_use_api';

export function setLiveMode(on: boolean) {
  if (on) localStorage.setItem(RUNTIME_KEY, 'true');
  else localStorage.removeItem(RUNTIME_KEY);
}

function runtimeLive(): boolean {
  try {
    return localStorage.getItem(RUNTIME_KEY) === 'true';
  } catch {
    return false;
  }
}

export const useApi =
  (import.meta.env.VITE_USE_API as string | undefined) === 'true' || runtimeLive();

export const isDemoMode = !useApi;

// In production the API is same-origin (one unified Worker), so a relative path
// works. In dev, point at a locally-running worker.
export const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  (import.meta.env.DEV ? 'http://localhost:8787' : '');
