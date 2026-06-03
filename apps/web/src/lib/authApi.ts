import type { Profile, UserRole } from '@culina/shared';
import { API_URL } from './config';

const TOKEN_KEY = 'culina_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

async function req<T>(path: string, body?: unknown, auth = false): Promise<T> {
  const res = await fetch(`${API_URL}/api/auth/${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(auth && getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`);
  return data;
}

export const authApi = {
  signup: (email: string, password: string, role: UserRole, fullName: string) =>
    req<{ token: string; profile: Profile }>('signup', { email, password, role, full_name: fullName }),
  login: (email: string, password: string) =>
    req<{ token: string; profile: Profile }>('login', { email, password }),
  me: () => req<{ profile: Profile }>('me', undefined, true),
};
