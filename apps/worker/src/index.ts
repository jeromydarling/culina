import { type Env, corsHeaders, json, error } from './lib/http';
import { handleAI } from './ai';
import { handleImage } from './ai/image';
import { handleStripe } from './stripe';
import { handleAuth } from './auth';
import { handleData } from './data';
import { runComplianceSweep, runMonthlyInvoicing } from './cron';
import { handleUpload, handleFile } from './storage';

/**
 * Culina API — Cloudflare Worker.
 *
 * Routes:
 *   GET  /api/health
 *   POST /api/ai/:endpoint            → Claude proxy (key never leaves the worker)
 *   POST /api/stripe/:action          → Stripe Connect (Express) + webhooks
 *
 * The data CRUD routes (/api/kitchens, /api/bookings, …) are served directly
 * from Supabase via the client + Row Level Security in the current build; this
 * worker focuses on the operations that must run server-side: the AI proxy
 * (to protect the Anthropic key) and Stripe (to protect the secret key and
 * apply the platform fee). Add data routes here as needed.
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(env) });
    }

    // Non-API requests are served by the static-asset binding (the React SPA).
    // In the unified deployment Cloudflare routes only /api/* to the Worker
    // (run_worker_first), but we handle the fallback here too for safety.
    if (!path.startsWith('/api/')) {
      if (env.ASSETS) return env.ASSETS.fetch(request);
      return error('Not found', env, 404);
    }

    if (path === '/api/health') {
      return json({ ok: true, service: 'culina', ai: !!env.ANTHROPIC_API_KEY, images: !!env.AI, db: !!env.DB, storage: !!env.STORAGE, stripe: !!env.STRIPE_SECRET_KEY }, env);
    }

    // Auth (Cloudflare D1 + JWT — no external accounts)
    const authMatch = path.match(/^\/api\/auth\/(.+)$/);
    if (authMatch && (request.method === 'POST' || request.method === 'GET')) {
      return handleAuth(authMatch[1], request, env);
    }

    // D1 data API
    const dataMatch = path.match(/^\/api\/data\/(.+)$/);
    if (dataMatch) {
      return handleData(dataMatch[1], request, env);
    }

    // File storage (R2)
    if (path === '/api/upload' && request.method === 'POST') {
      return handleUpload(request, env);
    }
    const fileMatch = path.match(/^\/api\/files\/(.+)$/);
    if (fileMatch && request.method === 'GET') {
      return handleFile(fileMatch[1], env);
    }

    // Flux image generation (Workers AI)
    if (path === '/api/ai/generate-image' && request.method === 'POST') {
      return handleImage(request, env);
    }

    // AI text proxy (Claude)
    const aiMatch = path.match(/^\/api\/ai\/(.+)$/);
    if (aiMatch && request.method === 'POST') {
      return handleAI(aiMatch[1], request, env);
    }

    // Stripe
    const stripeMatch = path.match(/^\/api\/stripe\/(.+)$/);
    if (stripeMatch && request.method === 'POST') {
      return handleStripe(stripeMatch[1], request, env);
    }

    return error('Not found', env, 404);
  },

  // Scheduled tasks (see [triggers].crons in wrangler.jsonc):
  //  - daily  "0 13 * * *"  → compliance sweep
  //  - monthly "0 6 1 * *"  → auto-generate invoices from the prior month
  async scheduled(event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    if (event.cron === '0 6 1 * *') {
      ctx.waitUntil(runMonthlyInvoicing(env).then((r) => console.log('monthly invoicing', r)));
    } else {
      ctx.waitUntil(runComplianceSweep(env).then((r) => console.log('compliance sweep', r)));
    }
  },
};
