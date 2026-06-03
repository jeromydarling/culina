import * as React from 'react';
import type { Profile, UserRole } from '@culina/shared';
import { isDemoMode, supabase } from '@/lib/supabase';
import { getProfile, IDS } from '@/lib/store';

interface AuthState {
  profile: Profile | null;
  loading: boolean;
  isDemo: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  signup: (email: string, password: string, role: UserRole, fullName: string) => Promise<{ error?: string }>;
  loginAsDemo: (role: UserRole) => void;
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
      const { data } = await supabase!.auth.getSession();
      if (data.session?.user) {
        const { data: prof } = await supabase!
          .from('profiles')
          .select('*')
          .eq('id', data.session.user.id)
          .single();
        if (active) setProfile((prof as Profile) ?? null);
      }
      if (active) setLoading(false);
    }
    init();
    return () => {
      active = false;
    };
  }, []);

  const loginAsDemo = React.useCallback((role: UserRole) => {
    const id = demoIdForRole[role];
    localStorage.setItem(DEMO_KEY, id);
    setProfile(getProfile(id));
  }, []);

  const login = React.useCallback(
    async (email: string, password: string): Promise<{ error?: string }> => {
      if (isDemoMode) {
        if (!password) return { error: 'Password required' };
        loginAsDemo(roleForEmail(email));
        return {};
      }
      const { error } = await supabase!.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };
      const { data } = await supabase!.auth.getUser();
      if (data.user) {
        const { data: prof } = await supabase!.from('profiles').select('*').eq('id', data.user.id).single();
        setProfile((prof as Profile) ?? null);
      }
      return {};
    },
    [loginAsDemo],
  );

  const signup = React.useCallback(
    async (email: string, password: string, role: UserRole, fullName: string): Promise<{ error?: string }> => {
      if (isDemoMode) {
        loginAsDemo(role);
        return {};
      }
      const { data, error } = await supabase!.auth.signUp({ email, password });
      if (error) return { error: error.message };
      if (data.user) {
        await supabase!.from('profiles').insert({ id: data.user.id, email, role, full_name: fullName });
        setProfile({
          id: data.user.id,
          email,
          role,
          full_name: fullName,
          avatar_url: null,
          phone: null,
          created_at: new Date().toISOString(),
        });
      }
      return {};
    },
    [loginAsDemo],
  );

  const logout = React.useCallback(async () => {
    if (isDemoMode) {
      localStorage.removeItem(DEMO_KEY);
      setProfile(null);
      return;
    }
    await supabase!.auth.signOut();
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
