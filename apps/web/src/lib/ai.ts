import { API_URL } from './supabase';

/**
 * Calls a Culina AI endpoint on the Cloudflare Worker. If the worker is
 * unreachable (e.g. in a pure demo with no backend), returns a graceful,
 * canned response so the UI still demonstrates the feature.
 */
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
