import { type Env, corsHeaders, json, error } from './lib/http';
import { handleAI } from './ai';
import { handleImage } from './ai/image';
import { handleStripe } from './stripe';

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

    if (path === '/api/health' || path === '/') {
      return json({ ok: true, service: 'culina-api', ai: !!env.ANTHROPIC_API_KEY, images: !!env.AI, stripe: !!env.STRIPE_SECRET_KEY }, env);
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
};
