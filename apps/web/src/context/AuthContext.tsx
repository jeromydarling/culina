import * as React from 'react';
import { toast } from 'sonner';
import type { Profile, UserRole } from '@culina/shared';
import { isLive, isDemo, setSessionMode, clearSessionMode } from '@/lib/config';
import { authApi, getToken, setToken, clearToken } from '@/lib/authApi';
import { dataApi, setConflictHandler } from '@/lib/dataApi';
import { getProfile, hydrate, ensureOperatorKitchen, ensureTenantProfile, updateKitchen, getKitchenByOperator, applyDemoCarry, IDS } from '@/lib/store';
import type { DemoCarry } from '@/lib/signupPrefill';

interface AuthState {
  profile: Profile | null;
  loading: boolean;
  isDemo: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  signup: (email: string, password: string, role: UserRole, fullName: string, businessName?: string, carry?: DemoCarry) => Promise<{ error?: string }>;
  loginAsDemo: (role: UserRole) => void;
  logout: () => Promise<void>;
}

const AuthContext = React.createContext<AuthState | undefined>(undefined);

const DEMO_KEY = 'culina_demo_user';

/** Infer a role from an email address (used for routing). */
export function roleForEmail(email: string): UserRole {
  if (email.includes('admin')) return 'admin';
  if (email.includes('tenant') || email.includes('sara')) return 'tenant';
  return 'operator';
}

const demoIdForRole: Record<UserRole, string> = {
  operator: IDS.operator,
  tenant: IDS.sara,
  admin: IDS.admin,
};

/** Pull the user's dataset from D1 into the in-memory store (LIVE sessions). */
async function hydrateFromApi(p?: Profile | null) {
  try {
    hydrate(await dataApi.hydrate());
  } catch (e) {
    console.warn('hydrate failed:', (e as Error).message);
  }
  // New operators get a starter kitchen so the dashboard is never empty/broken.
  if (p?.role === 'operator') {
    ensureOperatorKitchen(p.id, `${(p.full_name ?? 'My').split(' ')[0]}'s Kitchen`);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [, force] = React.useReducer((x) => x + 1, 0);
  const profileRef = React.useRef<Profile | null>(null);
  profileRef.current = profile;

  // When the server reports a concurrent edit (409), reconcile to the latest
  // instead of silently overwriting someone else's change.
  React.useEffect(() => {
    setConflictHandler(async () => {
      await hydrateFromApi(profileRef.current);
      force();
      toast.info('Refreshed to the latest — another session made a change.');
    });
  }, []);

  React.useEffect(() => {
    let active = true;
    async function init() {
      if (isLive() && getToken()) {
        try {
          const { profile: p } = await authApi.me();
          await hydrateFromApi(p);
          if (active) setProfile(p);
        } catch {
          clearToken();
        }
      } else {
        // Demo session: restore the last one-click role if any.
        const saved = localStorage.getItem(DEMO_KEY);
        if (saved) setProfile(getProfile(saved));
      }
      if (active) setLoading(false);
    }
    init();
    return () => {
      active = false;
    };
  }, []);

  /** One-click demo: always an in-memory sandbox session (safe, non-persistent). */
  const loginAsDemo = React.useCallback((role: UserRole) => {
    setSessionMode('demo');
    const id = demoIdForRole[role];
    localStorage.setItem(DEMO_KEY, id);
    setProfile(getProfile(id));
    force();
  }, []);

  /** Real email/password login → LIVE Cloudflare D1 session. */
  const login = React.useCallback(async (email: string, password: string): Promise<{ error?: string }> => {
    setSessionMode('live');
    try {
      const { token, profile: p } = await authApi.login(email, password);
      setToken(token);
      await hydrateFromApi(p);
      setProfile(p);
      return {};
    } catch (e) {
      setSessionMode('demo'); // failed → don't strand the session in live
      return { error: (e as Error).message };
    }
  }, []);

  /** Sign-up → real LIVE account. */
  const signup = React.useCallback(
    async (email: string, password: string, role: UserRole, fullName: string, businessName?: string, carry?: DemoCarry): Promise<{ error?: string }> => {
      setSessionMode('live');
      try {
        const { token, profile: p } = await authApi.signup(email, password, role, fullName);
        setToken(token);
        await hydrateFromApi(p);
        // Carry a business/kitchen name from a converted demo into the real account.
        if (businessName?.trim()) {
          if (role === 'tenant') ensureTenantProfile(p.id, businessName.trim());
          else if (role === 'operator') {
            const k = getKitchenByOperator(p.id);
            if (k) updateKitchen(k.id, { name: businessName.trim() });
          }
        }
        // Replay any work captured from the demo (recipes, products, storefront, …).
        applyDemoCarry(role, p.id, carry);
        setProfile(p);
        return {};
      } catch (e) {
        setSessionMode('demo');
        return { error: (e as Error).message };
      }
    },
    [],
  );

  const logout = React.useCallback(async () => {
    clearToken();
    localStorage.removeItem(DEMO_KEY);
    clearSessionMode();
    setProfile(null);
    // Full reset so a live session's hydrated data doesn't leak into a later demo.
    window.location.assign('/');
  }, []);

  const value: AuthState = { profile, loading, isDemo: isDemo(), login, signup, loginAsDemo, logout };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
