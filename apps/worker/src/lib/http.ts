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
  EMAIL?: { send: (message: { to: string | string[]; from: string; subject: string; html?: string; text?: string; reply_to?: string }) => Promise<unknown> };
  EMAIL_FROM?: string;
  APP_URL?: string;
  ALLOWED_ORIGIN?: string;
}

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
