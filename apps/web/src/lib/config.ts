/**
 * Culina runs 100% on Cloudflare — D1 (SQLite) + R2 (files), fronted by the
 * Worker. No external accounts.
 *
 * Demo and Live coexist, decided by HOW you signed in (not a global switch):
 *  - DEMO  → one-click role logins. In-memory sandbox, resets on reload. Safe
 *            for prospective users to poke at every feature.
 *  - LIVE  → real sign-up / email login. Persists to Cloudflare D1, real auth.
 *
 * The mode is stored per browser session and read at runtime so both can be
 * used from the same deployment.
 */
type SessionMode = 'demo' | 'live';
const MODE_KEY = 'culina_session_mode';

let mode: SessionMode = (() => {
  try {
    return (localStorage.getItem(MODE_KEY) as SessionMode) || 'demo';
  } catch {
    return 'demo';
  }
})();

export function setSessionMode(m: SessionMode) {
  mode = m;
  try {
    localStorage.setItem(MODE_KEY, m);
  } catch {
    /* ignore */
  }
}
export function clearSessionMode() {
  mode = 'demo';
  try {
    localStorage.removeItem(MODE_KEY);
  } catch {
    /* ignore */
  }
}

export const isLive = () => mode === 'live';
export const isDemo = () => mode === 'demo';

// In production the API is same-origin (one unified Worker); in dev, a local one.
export const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  (import.meta.env.DEV ? 'http://localhost:8787' : '');
