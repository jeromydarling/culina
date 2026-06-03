import * as React from 'react';
import type { Profile, UserRole } from '@culina/shared';
import { isDemoMode } from '@/lib/config';
import { authApi, getToken, setToken, clearToken } from '@/lib/authApi';
import { dataApi } from '@/lib/dataApi';
import { getProfile, hydrate, IDS } from '@/lib/store';

/** Pull the user's dataset from D1 into the in-memory store (LIVE mode). */
async function hydrateFromApi() {
  try {
    hydrate(await dataApi.hydrate());
  } catch (e) {
    console.warn('hydrate failed:', (e as Error).message);
  }
}

/** Seeded demo credentials for each role (LIVE mode one-click login). */
const demoCreds: Record<UserRole, string> = {
  operator: 'demo@operator.culina.app',
  tenant: 'sara@tenant.culina.app',
  admin: 'admin@culina.app',
};

interface AuthState {
  profile: Profile | null;
  loading: boolean;
  isDemo: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  signup: (email: string, password: string, role: UserRole, fullName: string) => Promise<{ error?: string }>;
  loginAsDemo: (role: UserRole) => void | Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = React.createContext<AuthState | undefined>(undefined);

const DEMO_KEY = 'culina_demo_user';

/** Infer a role from an email address (used for demo logins / routing). */
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    async function init() {
      if (isDemoMode) {
        const saved = localStorage.getItem(DEMO_KEY);
        if (saved) setProfile(getProfile(saved));
        setLoading(false);
        return;
      }
      // Cloudflare-backed: restore session from JWT.
      if (getToken()) {
        try {
          const { profile: p } = await authApi.me();
          await hydrateFromApi();
          if (active) setProfile(p);
        } catch {
          clearToken();
        }
      }
      if (active) setLoading(false);
    }
    init();
    return () => {
      active = false;
    };
  }, []);

  const loginAsDemo = React.useCallback(async (role: UserRole) => {
    if (isDemoMode) {
      const id = demoIdForRole[role];
      localStorage.setItem(DEMO_KEY, id);
      setProfile(getProfile(id));
      return;
    }
    // LIVE mode: authenticate the seeded demo account against D1.
    try {
      const { token, profile: p } = await authApi.login(demoCreds[role], 'demo1234');
      setToken(token);
      await hydrateFromApi();
      setProfile(p);
    } catch (e) {
      console.warn('demo login failed:', (e as Error).message);
    }
  }, []);

  const login = React.useCallback(
    async (email: string, password: string): Promise<{ error?: string }> => {
      if (isDemoMode) {
        if (!password) return { error: 'Password required' };
        loginAsDemo(roleForEmail(email));
        return {};
      }
      try {
        const { token, profile: p } = await authApi.login(email, password);
        setToken(token);
        await hydrateFromApi();
        setProfile(p);
        return {};
      } catch (e) {
        return { error: (e as Error).message };
      }
    },
    [loginAsDemo],
  );

  const signup = React.useCallback(
    async (email: string, password: string, role: UserRole, fullName: string): Promise<{ error?: string }> => {
      if (isDemoMode) {
        loginAsDemo(role);
        return {};
      }
      try {
        const { token, profile: p } = await authApi.signup(email, password, role, fullName);
        setToken(token);
        setProfile(p);
        return {};
      } catch (e) {
        return { error: (e as Error).message };
      }
    },
    [loginAsDemo],
  );

  const logout = React.useCallback(async () => {
    if (isDemoMode) {
      localStorage.removeItem(DEMO_KEY);
    } else {
      clearToken();
    }
    setProfile(null);
  }, []);

  const value: AuthState = { profile, loading, isDemo: isDemoMode, login, signup, loginAsDemo, logout };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
