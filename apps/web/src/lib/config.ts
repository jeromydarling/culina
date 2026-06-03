/**
 * App configuration. Culina runs 100% on Cloudflare — the persistence layer is
 * Cloudflare D1 (SQLite) + R2 (file storage), fronted by the Worker API. No
 * external accounts (no Supabase).
 *
 * DEMO MODE: when the API isn't wired (VITE_USE_API not "true"), the app runs
 * on the seeded in-memory store and simulated auth, so the whole product is
 * explorable with zero provisioning. Set VITE_USE_API=true (and bind a D1
 * database to the Worker) to use the real backend.
 */
export const useApi = (import.meta.env.VITE_USE_API as string | undefined) === 'true';

export const isDemoMode = !useApi;

// In production the API is same-origin (one unified Worker), so a relative path
// works. In dev, point at a locally-running worker.
export const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  (import.meta.env.DEV ? 'http://localhost:8787' : '');
