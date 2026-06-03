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

/** Explicit per-browser override: 'true' | 'false' | null (use build default). */
export function setLiveMode(on: boolean) {
  localStorage.setItem(RUNTIME_KEY, on ? 'true' : 'false');
}
export function clearLiveModeOverride() {
  localStorage.removeItem(RUNTIME_KEY);
}

function override(): boolean | null {
  try {
    const v = localStorage.getItem(RUNTIME_KEY);
    return v === null ? null : v === 'true';
  } catch {
    return null;
  }
}

// LIVE (real Cloudflare D1) is the default; a browser override can force Demo.
const buildDefault = (import.meta.env.VITE_USE_API as string | undefined) !== 'false';

export const useApi = override() ?? buildDefault;

export const isDemoMode = !useApi;

// In production the API is same-origin (one unified Worker), so a relative path
// works. In dev, point at a locally-running worker.
export const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  (import.meta.env.DEV ? 'http://localhost:8787' : '');
