import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * When Supabase env vars are absent the app runs in DEMO MODE: the data layer
 * (see lib/api.ts) serves seeded mock data and auth is simulated locally.
 */
export const isDemoMode = !url || !anonKey;

export const supabase: SupabaseClient | null = isDemoMode
  ? null
  : createClient(url as string, anonKey as string, {
      auth: { persistSession: true, autoRefreshToken: true },
    });

export const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:8787';
