export interface Env {
  ASSETS?: { fetch: (request: Request) => Promise<Response> };
  AI?: { run: (model: string, input: Record<string, unknown>) => Promise<unknown> };
  DB?: D1Database;
  STORAGE?: R2Bucket;
  IMAGES?: unknown; // Cloudflare Images binding (optional; used for thumbnails)
  AUTH_SECRET?: string;
  ANTHROPIC_API_KEY?: string;
  ANTHROPIC_MODEL?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PLATFORM_FEE_PERCENT?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  // Cloudflare Email Service (Email Sending) binding — outbound transactional
  // email. Optional: when unbound, sendEmail() falls back to Resend, then no-op.
  EMAIL?: {
    send: (message: {
      to: EmailAddr | EmailAddr[];
      from: EmailAddr;
      subject: string;
      html?: string;
      text?: string;
      replyTo?: EmailAddr;
    }) => Promise<{ messageId?: string }>;
  };
  EMAIL_FROM?: string;
  EMAIL_REPLY_TO?: string;
  APP_URL?: string;
  ALLOWED_ORIGIN?: string;
  // Email verification gate. Default OFF: a new signup is created already-verified
  // and can use the whole app immediately (no email round-trip). Set to "on" to
  // require confirming the email link before email_verified flips true.
  EMAIL_VERIFICATION?: string;
  // Token guarding POST /api/admin/purge-user (E2E test cleanup). Falls back to a
  // known constant so CI works without a secret; the endpoint additionally refuses
  // any email that doesn't start with "e2e+", bounding the blast radius.
  ADMIN_PURGE_TOKEN?: string;
  // Server-side Sentry DSN (worker request + cron errors). Set in production
  // via `wrangler secret put SENTRY_DSN`; unset → Sentry no-ops.
  SENTRY_DSN?: string;
}

/** An email address, optionally with a display name (Cloudflare Email Service shape). */
export type EmailAddr = string | { email: string; name?: string };

export function corsHeaders(env: Env): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Stripe-Signature',
  };
}

export function json(data: unknown, env: Env, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(env) },
  });
}

export function error(message: string, env: Env, status = 400): Response {
  return json({ error: message }, env, status);
}
