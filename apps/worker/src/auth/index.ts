import { type Env, json, error } from '../lib/http';
import { signJwt, verifyJwt, hashPassword, verifyPassword, uuid, randomToken, sha256Hex } from '../lib/crypto';
import { getAuthSecret } from '../lib/secret';
import { sendEmail, templates } from '../email';
import { underHourlyLimit, bumpHourlyLimit } from '../lib/ratelimit';

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
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';

  if (action === 'signup') {
    const { email, password, role, full_name, invite } = body;
    if (!email || !password) return error('Email and password required', env, 400);
    // Abuse guard: cap account creation per IP per hour.
    if (!(await underHourlyLimit(env, `signup:${ip}`, 10))) {
      return error('Too many signups from this network — please try again in an hour.', env, 429);
    }
    await bumpHourlyLimit(env, `signup:${ip}`);
    const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
    if (existing) return error('An account with that email already exists', env, 409);

    const id = uuid();
    const { hash, salt } = await hashPassword(password);
    const now = new Date().toISOString();
    // An invitation always creates a member (tenant) account.
    const safeRole = invite ? 'tenant' : ['operator', 'tenant', 'admin'].includes(role) ? role : 'tenant';
    // Email verification is OFF by default: the account is created already-verified
    // so it can use the whole app immediately. Flip EMAIL_VERIFICATION="on" to gate.
    const verificationOn = (env.EMAIL_VERIFICATION || '').toLowerCase() === 'on';
    const verified = verificationOn ? 0 : 1;

    await env.DB.batch([
      env.DB.prepare('INSERT INTO users (id, email, password_hash, salt, email_verified, created_at) VALUES (?, ?, ?, ?, ?, ?)').bind(id, email, hash, salt, verified, now),
      env.DB.prepare('INSERT INTO profiles (id, email, full_name, role, created_at) VALUES (?, ?, ?, ?, ?)').bind(id, email, full_name ?? null, safeRole, now),
    ]);

    // Accept a membership invitation, if one was provided (best-effort).
    if (invite) {
      try {
        const row = await env.DB.prepare('SELECT id, kitchen_id, lead_id, membership_type, status, expires_at FROM invites WHERE token_hash = ?').bind(await sha256Hex(invite)).first<any>();
        if (row && row.status === 'pending' && row.expires_at >= now) {
          let mid = (await env.DB.prepare('SELECT id FROM memberships WHERE tenant_id = ? AND kitchen_id = ?').bind(id, row.kitchen_id).first<{ id: string }>())?.id;
          if (!mid) {
            mid = uuid();
            await env.DB.prepare(`INSERT INTO memberships (id, kitchen_id, tenant_id, status, membership_type, start_date, notes, created_at, updated_at) VALUES (?, ?, ?, 'active', ?, ?, ?, ?, ?)`)
              .bind(mid, row.kitchen_id, id, row.membership_type, now.slice(0, 10), 'Joined via invitation.', now, now).run();
          }
          await env.DB.prepare("UPDATE invites SET status = 'accepted', accepted_at = ?, membership_id = ? WHERE id = ?").bind(now, mid, row.id).run();
          if (row.lead_id) await env.DB.prepare("UPDATE leads SET status = 'converted', converted_membership_id = ?, updated_at = ? WHERE id = ?").bind(mid, now, row.lead_id).run();
        }
      } catch (e) {
        console.error('[signup] invite accept failed:', (e as Error).message);
      }
    }

    // Say hello (best-effort: never block signup on email). When verification is
    // on, the welcome doubles as the confirm-your-email; otherwise it's a plain
    // welcome with no link to click — the journey never depends on email.
    try {
      if (verificationOn) {
        const verifyToken = await issueToken(env, id, 'verify', 24 * HOUR);
        const verifyUrl = `${appUrl(request, env)}/auth/verify?token=${verifyToken}`;
        await sendEmail(env, email, 'Welcome to Culina — confirm your email', templates.welcomeVerify(full_name ?? null, verifyUrl));
      } else {
        await sendEmail(env, email, 'Welcome to Culina!', templates.welcome(full_name ?? null, `${appUrl(request, env)}/`));
      }
    } catch (e) {
      console.error('[auth] welcome email failed:', (e as Error).message);
    }

    const token = await signJwt({ sub: id, role: safeRole }, await getAuthSecret(env));
    return json({ token, profile: { id, email, full_name: full_name ?? null, role: safeRole, avatar_url: null, phone: null, created_at: now, email_verified: !verificationOn } }, env);
  }

  if (action === 'login') {
    const { email, password } = body;
    // Brute-force guard: only FAILED attempts count, per email and per IP.
    const emailKey = `login:${String(email ?? '').toLowerCase().slice(0, 120)}`;
    const ipKey = `loginip:${ip}`;
    if (!(await underHourlyLimit(env, emailKey, 10)) || !(await underHourlyLimit(env, ipKey, 30))) {
      return error('Too many failed attempts — please wait an hour or reset your password.', env, 429);
    }
    const user = await env.DB.prepare('SELECT id, password_hash, salt FROM users WHERE email = ?')
      .bind(email)
      .first<{ id: string; password_hash: string; salt: string }>();
    if (!user || !(await verifyPassword(password, user.password_hash, user.salt))) {
      await Promise.all([bumpHourlyLimit(env, emailKey), bumpHourlyLimit(env, ipKey)]);
      return error('Invalid email or password', env, 401);
    }
    const profile = await loadProfile(env, user.id);
    const token = await signJwt({ sub: user.id, role: profile?.role ?? 'tenant' }, await getAuthSecret(env));
    return json({ token, profile }, env);
  }

  // Request a password reset. Always returns 200 (no account enumeration).
  if (action === 'forgot') {
    const { email } = body;
    // Cap reset-email requests per IP per hour (silently, to avoid enumeration).
    if (!(await underHourlyLimit(env, `forgot:${ip}`, 5))) return json({ ok: true }, env);
    await bumpHourlyLimit(env, `forgot:${ip}`);
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
