import { type Env } from '../lib/http';

/**
 * Dynamic Open Graph image generation (1200×630 PNG) for page-specific social
 * previews on kitchen and shop pages. Rendered at the edge with workers-og
 * (Satori + resvg-wasm), which is dynamically imported so its ~2MB of wasm only
 * loads on an actual OG request — the hot API path's cold start is untouched.
 *
 * Bulletproof by design: any failure (render error, bad input, missing lib)
 * falls back to a 302 to the static /og.png, so an og:image URL always resolves
 * to a real image and a crawler never sees a broken preview.
 */

const OG_FALLBACK = 'https://culina.life/og.png';
const BRAND_BG = '#2D4A3E';
const BRAND_CREAM = '#F5E6C8';
const BRAND_GOLD = '#C9A24B';
const SUBTITLE = '#CDBE93';

// workers-og's HTML parser does NOT decode entities and renders text as-is, so
// escaping would show literal "&#39;". We only strip angle brackets (the sole
// tag-injection risk) and control chars; apostrophes/ampersands pass through raw.
function esc(s: string): string {
  return s.replace(/[<>]/g, ' ').replace(/\s+/g, ' ').trim();
}
const clamp = (s: string, n: number) => (s.length <= n ? s : s.slice(0, n - 1).trimEnd() + '…');

export async function handleOgImage(request: Request, env: Env): Promise<Response> {
  try {
    const u = new URL(request.url);
    const title = clamp((u.searchParams.get('title') || 'Culina').trim(), 42) || 'Culina';
    const sub = clamp((u.searchParams.get('sub') || '').trim(), 64);

    // Strict-flex layout (Satori requires display:flex on any multi-child node)
    // with explicit pixel dimensions on the root so the brand background fills.
    const html = `<div style="display:flex;flex-direction:column;justify-content:center;width:1200px;height:630px;background:${BRAND_BG};padding:90px">
      <div style="display:flex;color:${BRAND_GOLD};font-size:38px;font-weight:700;letter-spacing:1px">Culina</div>
      <div style="display:flex;color:${BRAND_CREAM};font-size:74px;font-weight:700;margin-top:28px;line-height:1.05">${esc(title)}</div>
      ${sub ? `<div style="display:flex;color:${SUBTITLE};font-size:34px;margin-top:22px">${esc(sub)}</div>` : ''}
      <div style="display:flex;color:${BRAND_GOLD};font-size:26px;font-weight:700;margin-top:56px">culina.life</div>
    </div>`;

    const { ImageResponse } = await import('workers-og');
    const img = new ImageResponse(html, { width: 1200, height: 630 });
    // Re-wrap to attach long-lived caching (edge + browser).
    const headers = new Headers(img.headers);
    headers.set('cache-control', 'public, max-age=86400, s-maxage=604800');
    return new Response(img.body, { status: 200, headers });
  } catch (e) {
    console.error('[og] render failed, falling back to static:', (e as Error).message);
    return Response.redirect(OG_FALLBACK, 302);
  }
}

/** Build the absolute og:image URL for a page, or undefined to use the default. */
export function ogImageUrl(title: string, sub?: string): string {
  const p = new URLSearchParams({ title });
  if (sub) p.set('sub', sub);
  return `https://culina.life/api/og?${p.toString()}`;
}
