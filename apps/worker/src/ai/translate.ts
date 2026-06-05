import { type Env, json, error } from '../lib/http';

/**
 * Text translation via Cloudflare Workers AI — Meta Llama.
 *
 * Model: @cf/meta/llama-3.1-8b-instruct (instruction-tuned, multilingual).
 * Requires an [ai] binding in wrangler.toml — no API key needed.
 *
 * We use an instruct model rather than a raw seq2seq translator (e.g. m2m100)
 * because Culina's copy is warm and idiomatic — announcements, storefront blurbs,
 * notes between operators and makers. Llama keeps tone and intent intact and
 * leaves names, prices, and units alone.
 */

// Languages we surface in the UI. Keep keys as BCP-47-ish codes; values are the
// human label the model is told to translate into.
export const LANGUAGES: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  zh: 'Chinese (Simplified)',
  vi: 'Vietnamese',
  fr: 'French',
  ar: 'Arabic',
  pt: 'Portuguese (Brazil)',
  ko: 'Korean',
  tl: 'Tagalog',
  ht: 'Haitian Creole',
  ru: 'Russian',
  bn: 'Bengali',
};

const MODEL = '@cf/meta/llama-3.1-8b-instruct';
const MAX_CHARS = 5000;

export async function handleTranslate(request: Request, env: Env): Promise<Response> {
  const body: any = await request.json().catch(() => ({}));
  const text: string = (body.text ?? '').toString();
  const targetCode: string = (body.target ?? body.targetLang ?? '').toString();
  const target = LANGUAGES[targetCode] ?? (targetCode || '').trim();

  if (!text.trim()) return error('Nothing to translate — `text` is required.', env, 400);
  if (!target) return error('A target language is required.', env, 400);
  if (text.length > MAX_CHARS) return error(`Text is too long (max ${MAX_CHARS} characters).`, env, 413);

  // No AI binding (local/demo) — tell the client so it can keep the original.
  if (!env.AI) {
    return json({ text: '', demo: true, note: 'Workers AI (AI binding) not configured on this worker.' }, env);
  }

  const system =
    `You are a professional translator for Culina, a platform for shared commercial kitchens and the food makers inside them. ` +
    `Translate the user's message into ${target}. Preserve the original meaning, warmth, and tone. ` +
    `Keep proper nouns, business names, brand names, URLs, email addresses, prices, numbers, and units unchanged. ` +
    `Do not add notes, explanations, or quotation marks. Return only the translated text. ` +
    `If the text is already in ${target}, return it unchanged.`;

  try {
    const result: any = await env.AI.run(MODEL, {
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: text },
      ],
      max_tokens: 1024,
      temperature: 0.2,
    });

    // Llama instruct models return { response: "<text>" }.
    const out: string = (result?.response ?? '').toString().trim();
    if (!out) return error('Translation model returned no text.', env, 502);

    return json({ text: out, target: targetCode || target }, env);
  } catch (e) {
    return error(`Translation failed: ${(e as Error).message}`, env, 500);
  }
}
