import { API_URL } from './supabase';

/**
 * Calls a Culina AI endpoint on the Cloudflare Worker. If the worker is
 * unreachable (e.g. in a pure demo with no backend), returns a graceful,
 * canned response so the UI still demonstrates the feature.
 */
export type ImageStyle = 'dish' | 'product' | 'menu' | 'storefront' | 'kitchen' | 'space';

export interface GeneratedImage {
  image: string | null;
  demo?: boolean;
  note?: string;
}

/**
 * Generate a food/kitchen image with Flux (Cloudflare Workers AI) via the
 * Worker. Returns a data URL. If the worker/AI binding is unavailable (e.g. a
 * pure frontend demo), returns { image: null, demo: true } so callers can show
 * a friendly hint and keep any existing artwork.
 */
export async function generateImage(prompt: string, style: ImageStyle = 'dish'): Promise<GeneratedImage> {
  try {
    const res = await fetch(`${API_URL}/api/ai/generate-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, style }),
    });
    if (!res.ok) throw new Error(`Image request failed: ${res.status}`);
    return (await res.json()) as GeneratedImage;
  } catch {
    return { image: null, demo: true, note: 'Image generation needs the deployed Worker with a Workers AI binding.' };
  }
}

export async function callAI(endpoint: string, body: unknown, demoFallback: string): Promise<string> {
  try {
    const res = await fetch(`${API_URL}/api/ai/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`AI request failed: ${res.status}`);
    const data = (await res.json()) as { text?: string };
    return data.text ?? demoFallback;
  } catch {
    // Simulate latency for a realistic demo experience.
    await new Promise((r) => setTimeout(r, 900));
    return demoFallback;
  }
}
