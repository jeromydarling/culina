import { API_URL } from './config';

/**
 * Calls a Culina AI endpoint on the Cloudflare Worker. If the worker is
 * unreachable (e.g. in a pure demo with no backend), returns a graceful,
 * canned response so the UI still demonstrates the feature.
 */
export type ImageStyle = 'dish' | 'product' | 'menu' | 'storefront' | 'kitchen' | 'space' | 'logo';

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

/**
 * Turn a natural-language instruction into a partial site patch. Uses the
 * Worker's Claude proxy; falls back to a small local heuristic so the AI
 * command bar still does something useful with no backend.
 */
export async function editSite(command: string, site: Record<string, unknown>): Promise<Record<string, unknown>> {
  try {
    const res = await fetch(`${API_URL}/api/ai/site-edit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command, site }),
    });
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as { text?: string };
    if (data.text) {
      const match = data.text.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]) as Record<string, unknown>;
    }
    throw new Error('no patch');
  } catch {
    await new Promise((r) => setTimeout(r, 700));
    return heuristicEdit(command);
  }
}

function heuristicEdit(command: string): Record<string, unknown> {
  const c = command.toLowerCase();
  const patch: Record<string, unknown> = {};
  if (/warm|cozy|earthy|rustic/.test(c)) { patch.color_primary = '#7C5E10'; patch.color_secondary = '#FAF3E0'; patch.theme = 'rustic_farm'; }
  if (/bold|vibrant|punchy|market/.test(c)) { patch.color_primary = '#B91C1C'; patch.color_secondary = '#FEF3C7'; patch.theme = 'bold_market'; }
  if (/modern|clean|minimal|sleek/.test(c)) { patch.color_primary = '#111827'; patch.color_secondary = '#F3F4F6'; patch.theme = 'modern_clean'; }
  if (/elegant|patisserie|refined|luxe/.test(c)) { patch.color_primary = '#5B2333'; patch.color_secondary = '#FCE7EF'; patch.theme = 'elegant_patisserie'; }
  if (/hide products|no products/.test(c)) patch.show_products = false;
  if (/hide about/.test(c)) patch.show_about = false;
  const headline = command.match(/headline (?:to|:)?\s*["“]?([^"”]+)["”]?$/i);
  if (headline) patch.hero_headline = headline[1].trim();
  if (Object.keys(patch).length === 0) patch.hero_subheadline = command.trim();
  return patch;
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
