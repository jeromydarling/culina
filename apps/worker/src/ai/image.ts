import { type Env, json, error } from '../lib/http';

/**
 * Flux image generation via Cloudflare Workers AI.
 * Model: @cf/black-forest-labs/flux-1-schnell (fast, 1–8 steps).
 * Requires an [ai] binding in wrangler.toml — no API key needed.
 *
 * We wrap the user's subject in a food-photography prompt and always steer
 * away from people, since these power menu / dish / kitchen imagery.
 */
const STYLE_SUFFIX =
  'professional food photography, appetizing, fresh, natural soft light, shallow depth of field, clean styled surface, high detail, menu hero shot, no people, no text, no watermark';

const STYLE_PRESETS: Record<string, string> = {
  dish: 'a beautifully plated dish, close-up',
  product: 'an artisan packaged food product on a clean surface',
  menu: 'an elegant flat-lay of menu items, overhead',
  storefront: 'a warm, inviting hero image for a small food brand',
  kitchen: 'a clean modern commercial kitchen, stainless steel stations, no people',
  space: 'a tidy commercial kitchen prep station with equipment, no people',
};

export async function handleImage(request: Request, env: Env): Promise<Response> {
  const body: any = await request.json().catch(() => ({}));
  const subject: string = (body.prompt ?? body.subject ?? '').toString().trim();
  const preset: string = (body.style ?? 'dish').toString();

  if (!subject) return error('A prompt/subject is required.', env, 400);

  if (!env.AI) {
    return json({ image: null, demo: true, note: 'Workers AI (AI binding) not configured on this worker.' }, env);
  }

  const prompt = `${STYLE_PRESETS[preset] ?? STYLE_PRESETS.dish}: ${subject}. ${STYLE_SUFFIX}`;

  try {
    const result: any = await env.AI.run('@cf/black-forest-labs/flux-1-schnell', {
      prompt,
      steps: Math.min(8, Number(body.steps) || 6),
    });

    // flux-1-schnell returns { image: "<base64 jpeg>" }
    const b64: string | undefined = result?.image;
    if (!b64) return error('Image model returned no data.', env, 502);

    return json({ image: `data:image/jpeg;base64,${b64}`, prompt }, env);
  } catch (e) {
    return error(`Image generation failed: ${(e as Error).message}`, env, 500);
  }
}
