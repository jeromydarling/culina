import { type Env, json, error } from '../lib/http';
import { signJwt, verifyJwt, hashPassword, verifyPassword, uuid } from '../lib/crypto';

interface ProfileRow {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  avatar_url: string | null;
  phone: string | null;
  created_at: string;
}

const secret = (env: Env) => env.AUTH_SECRET || 'dev-insecure-secret-change-me';

/** Resolve the authenticated profile from the Authorization: Bearer header. */
export async function authenticate(request: Request, env: Env): Promise<ProfileRow | null> {
  if (!env.DB) return null;
  const header = request.headers.get('Authorization');
  if (!header?.startsWith('Bearer ')) return null;
  const payload = await verifyJwt(header.slice(7), secret(env));
  if (!payload) return null;
  return env.DB.prepare('SELECT id, email, full_name, role, avatar_url, phone, created_at FROM profiles WHERE id = ?')
    .bind(payload.sub)
    .first<ProfileRow>();
}

export async function handleAuth(action: string, request: Request, env: Env): Promise<Response> {
  if (!env.DB) return error('Database not configured (bind a D1 database named "culina").', env, 503);

  if (action === 'me') {
    const profile = await authenticate(request, env);
    if (!profile) return error('Unauthorized', env, 401);
    return json({ profile }, env);
  }

  const body: any = await request.json().catch(() => ({}));

  if (action === 'signup') {
    const { email, password, role, full_name } = body;
    if (!email || !password) return error('Email and password required', env, 400);
    const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
    if (existing) return error('An account with that email already exists', env, 409);

    const id = uuid();
    const { hash, salt } = await hashPassword(password);
    const now = new Date().toISOString();
    const safeRole = ['operator', 'tenant', 'admin'].includes(role) ? role : 'tenant';

    await env.DB.batch([
      env.DB.prepare('INSERT INTO users (id, email, password_hash, salt, created_at) VALUES (?, ?, ?, ?, ?)').bind(id, email, hash, salt, now),
      env.DB.prepare('INSERT INTO profiles (id, email, full_name, role, created_at) VALUES (?, ?, ?, ?, ?)').bind(id, email, full_name ?? null, safeRole, now),
    ]);

    const token = await signJwt({ sub: id, role: safeRole }, secret(env));
    return json({ token, profile: { id, email, full_name: full_name ?? null, role: safeRole, avatar_url: null, phone: null, created_at: now } }, env);
  }

  if (action === 'login') {
    const { email, password } = body;
    const user = await env.DB.prepare('SELECT id, password_hash, salt FROM users WHERE email = ?')
      .bind(email)
      .first<{ id: string; password_hash: string; salt: string }>();
    if (!user || !(await verifyPassword(password, user.password_hash, user.salt))) {
      return error('Invalid email or password', env, 401);
    }
    const profile = await env.DB.prepare('SELECT id, email, full_name, role, avatar_url, phone, created_at FROM profiles WHERE id = ?')
      .bind(user.id)
      .first<ProfileRow>();
    const token = await signJwt({ sub: user.id, role: profile?.role ?? 'tenant' }, secret(env));
    return json({ token, profile }, env);
  }

  return error(`Unknown auth action: ${action}`, env, 404);
}
