/** Minimal JWT (HS256) + PBKDF2 password hashing using the Web Crypto API. */

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64urlEncode(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let str = '';
  for (const b of arr) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlDecode(s: string): Uint8Array {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}
function toHex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export interface JwtPayload {
  sub: string;
  role: string;
  exp: number;
}

export async function signJwt(payload: Omit<JwtPayload, 'exp'>, secret: string, ttlSeconds = 60 * 60 * 24 * 7): Promise<string> {
  const header = b64urlEncode(enc.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const body = b64urlEncode(enc.encode(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds })));
  const data = `${header}.${body}`;
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(data));
  return `${data}.${b64urlEncode(sig)}`;
}

export async function verifyJwt(token: string, secret: string): Promise<JwtPayload | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  const ok = await crypto.subtle.verify('HMAC', await hmacKey(secret), b64urlDecode(sig), enc.encode(`${header}.${body}`));
  if (!ok) return null;
  const payload = JSON.parse(dec.decode(b64urlDecode(body))) as JwtPayload;
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

// Current PBKDF2 work factor for NEW hashes (OWASP-recommended for SHA-256).
// The stored format doesn't record iterations, so verification also tries the
// legacy count — existing accounts keep logging in unchanged.
const PBKDF2_ITERATIONS = 600_000;
const LEGACY_PBKDF2_ITERATIONS = 100_000;

export async function hashPassword(password: string, saltHex?: string, iterations = PBKDF2_ITERATIONS): Promise<{ hash: string; salt: string }> {
  const salt = saltHex ? b64urlDecode(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    keyMaterial,
    256,
  );
  return { hash: toHex(bits), salt: b64urlEncode(salt) };
}

/** Constant-time-ish hex digest compare. */
function digestsEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
  // Try the current work factor first, then fall back to the legacy one so
  // accounts hashed before the bump still verify.
  const current = await hashPassword(password, salt, PBKDF2_ITERATIONS);
  if (digestsEqual(current.hash, hash)) return true;
  const legacy = await hashPassword(password, salt, LEGACY_PBKDF2_ITERATIONS);
  return digestsEqual(legacy.hash, hash);
}

export function uuid(): string {
  return crypto.randomUUID();
}

/** A URL-safe random token (default 256-bit) for password-reset / verification links. */
export function randomToken(bytes = 32): string {
  return b64urlEncode(crypto.getRandomValues(new Uint8Array(bytes)));
}

/** SHA-256 hex digest — we store only the hash of a token, never the token itself. */
export async function sha256Hex(input: string): Promise<string> {
  return toHex(await crypto.subtle.digest('SHA-256', enc.encode(input)));
}
