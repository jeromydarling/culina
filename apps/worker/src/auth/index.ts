import { type Env, json, error } from '../lib/http';
import { signJwt, verifyJwt, hashPassword, verifyPassword, uuid, randomToken, sha256Hex } from '../lib/crypto';
import { getAuthSecret } from '../lib/secret';
import { sendEmail, templates } from '../email';

const HOUR = 60 * 60 * 1000;

/** Base URL for links in emails: explicit override, else the request origin. */
function appUrl(request: Request, env: Env): string {
  return (env.APP_URL || new URL(request.url).origin).replace(/\/$/, '');
}

/** Create a single-use token of a given kind, store its hash, return the raw token. */
async function issueToken(env: Env, userId: string, kind: 'reset' | 'verify', ttlMs: number): Promise<string> {
  const token = randomToken();
  const now = new Date();
  await env.DB!.prepare(
    'INSERT INTO auth_tokens (id, user_id, kind, token_hash, expires_at, used, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)',
  )
    .bind(uuid(), userId, kind, await sha256Hex(token), new Date(now.getTime() + ttlMs).toISOString(), now.toISOString())
    .run();
  return token;
}

/** Look up and consume a token; returns the user_id or null if invalid/expired/used. */
async function consumeToken(env: Env, kind: 'reset' | 'verify', token: string): Promise<string | null> {
  const row = await env.DB!.prepare('SELECT id, user_id, expires_at, used FROM auth_tokens WHERE token_hash = ? AND kind = ?')
    .bind(await sha256Hex(token), kind)
    .first<{ id: string; user_id: string; expires_at: string; used: number }>();
  if (!row || row.used || row.expires_at < new Date().toISOString()) return null;
  await env.DB!.prepare('UPDATE auth_tokens SET used = 1 WHERE id = ?').bind(row.id).run();
  return row.user_id;
}

interface ProfileRow {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  avatar_url: string | null;
  phone: string | null;
  created_at: string;
}

/** Load a client-facing profile (joins users.email_verified onto the profile row). */
async function loadProfile(env: Env, id: string): Promise<(ProfileRow & { email_verified: boolean }) | null> {
  const row = await env.DB!.prepare(
    `SELECT p.id, p.email, p.full_name, p.role, p.avatar_url, p.phone, p.created_at, COALESCE(u.email_verified, 0) AS email_verified
     FROM profiles p LEFT JOIN users u ON u.id = p.id WHERE p.id = ?`,
  )
    .bind(id)
    .first<ProfileRow & { email_verified: number }>();
  return row ? { ...row, email_verified: !!row.email_verified } : null;
}

/** Resolve the authenticated profile from the Authorization: Bearer header. */
export async function authenticate(request: Request, env: Env): Promise<ProfileRow | null> {
  if (!env.DB) return null;
  const header = request.headers.get('Authorization');
  if (!header?.startsWith('Bearer ')) return null;
  const payload = await verifyJwt(header.slice(7), await getAuthSecret(env));
  if (!payload) return null;
  return env.DB.prepare('SELECT id, email, full_name, role, avatar_url, phone, created_at FROM profiles WHERE id = ?')
    .bind(payload.sub)
    .first<ProfileRow>();
}

export async function handleAuth(action: string, request: Request, env: Env): Promise<Response> {
  if (!env.DB) return error('Database not configured (bind a D1 database named "culina").', env, 503);

  if (action === 'me') {
    const authed = await authenticate(request, env);
    if (!authed) return error('Unauthorized', env, 401);
    return json({ profile: (await loadProfile(env, authed.id)) ?? authed }, env);
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

    // Welcome + confirm-your-email (best-effort: never block signup on email).
    try {
      const verifyToken = await issueToken(env, id, 'verify', 24 * HOUR);
      const verifyUrl = `${appUrl(request, env)}/auth/verify?token=${verifyToken}`;
      await sendEmail(env, email, 'Welcome to Culina — confirm your email', templates.welcomeVerify(full_name ?? null, verifyUrl));
    } catch (e) {
      console.error('[auth] welcome email failed:', (e as Error).message);
    }

    const token = await signJwt({ sub: id, role: safeRole }, await getAuthSecret(env));
    return json({ token, profile: { id, email, full_name: full_name ?? null, role: safeRole, avatar_url: null, phone: null, created_at: now, email_verified: false } }, env);
  }

  if (action === 'login') {
    const { email, password } = body;
    const user = await env.DB.prepare('SELECT id, password_hash, salt FROM users WHERE email = ?')
      .bind(email)
      .first<{ id: string; password_hash: string; salt: string }>();
    if (!user || !(await verifyPassword(password, user.password_hash, user.salt))) {
      return error('Invalid email or password', env, 401);
    }
    const profile = await loadProfile(env, user.id);
    const token = await signJwt({ sub: user.id, role: profile?.role ?? 'tenant' }, await getAuthSecret(env));
    return json({ token, profile }, env);
  }

  // Request a password reset. Always returns 200 (no account enumeration).
  if (action === 'forgot') {
    const { email } = body;
    if (email) {
      const user = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first<{ id: string }>();
      if (user) {
        try {
          const token = await issueToken(env, user.id, 'reset', 1 * HOUR);
          const resetUrl = `${appUrl(request, env)}/auth/reset?token=${token}`;
          await sendEmail(env, email, 'Reset your Culina password', templates.reset(resetUrl));
        } catch (e) {
          console.error('[auth] reset email failed:', (e as Error).message);
        }
      }
    }
    return json({ ok: true }, env);
  }

  // Complete a password reset and auto-login.
  if (action === 'reset') {
    const { token, password } = body;
    if (!token || !password) return error('Token and new password are required', env, 400);
    if (String(password).length < 8) return error('Password must be at least 8 characters', env, 400);
    const userId = await consumeToken(env, 'reset', token);
    if (!userId) return error('This reset link is invalid or has expired.', env, 400);

    const { hash, salt } = await hashPassword(password);
    await env.DB.prepare('UPDATE users SET password_hash = ?, salt = ? WHERE id = ?').bind(hash, salt, userId).run();
    const profile = await loadProfile(env, userId);
    const jwt = await signJwt({ sub: userId, role: profile?.role ?? 'tenant' }, await getAuthSecret(env));
    return json({ token: jwt, profile }, env);
  }

  // Confirm an email address.
  if (action === 'verify') {
    const { token } = body;
    if (!token) return error('Verification token is required', env, 400);
    const userId = await consumeToken(env, 'verify', token);
    if (!userId) return error('This verification link is invalid or has expired.', env, 400);
    await env.DB.prepare('UPDATE users SET email_verified = 1 WHERE id = ?').bind(userId).run();
    return json({ ok: true }, env);
  }

  // Re-send a verification email (requires being logged in).
  if (action === 'resend-verification') {
    const profile = await authenticate(request, env);
    if (!profile) return error('Unauthorized', env, 401);
    const user = await env.DB.prepare('SELECT email_verified FROM users WHERE id = ?').bind(profile.id).first<{ email_verified: number }>();
    if (user?.email_verified) return json({ ok: true, already_verified: true }, env);
    try {
      const token = await issueToken(env, profile.id, 'verify', 24 * HOUR);
      const verifyUrl = `${appUrl(request, env)}/auth/verify?token=${token}`;
      await sendEmail(env, profile.email, 'Confirm your Culina email', templates.verify(verifyUrl));
    } catch (e) {
      console.error('[auth] resend verification failed:', (e as Error).message);
    }
    return json({ ok: true }, env);
  }

  return error(`Unknown auth action: ${action}`, env, 404);
}
