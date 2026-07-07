import { type Env } from '../lib/http';
import { seoForPath } from '@culina/shared';

/**
 * Server-side per-route SEO for crawlers that don't run JS (Facebook, Twitter/X,
 * LinkedIn, Slack, and many AI assistants). The SPA's <Seo/> handles JS-capable
 * clients (Google renders JS); this rewrites the served index.html so social and
 * AI crawlers see page-specific title / description / canonical / Open Graph
 * instead of the generic homepage tags.
 *
 * Only fires for HTML document routes listed in `run_worker_first` (wrangler.jsonc).
 */
const HTML_ROUTES: RegExp[] = [
  /^\/$/,
  /^\/about$/,
  /^\/features$/,
  /^\/find-a-kitchen$/,
  /^\/privacy$/,
  /^\/kitchen\/[^/]+$/,
  /^\/shop\/[^/]+$/,
];

export function isSeoHtmlRoute(path: string): boolean {
  const clean = path.replace(/\/+$/, '') || '/';
  return HTML_ROUTES.some((re) => re.test(clean));
}

export async function handleSeoHtml(request: Request, env: Env): Promise<Response> {
  const asset = await env.ASSETS!.fetch(request);
  // Only rewrite the HTML shell; pass assets/other responses through untouched.
  if (!(asset.headers.get('content-type') || '').includes('text/html')) return asset;

  const path = new URL(request.url).pathname.replace(/\/+$/, '') || '/';

  // Dynamic routes (kitchen / shop): look up the entity so the preview is truly
  // page-specific. Best-effort — falls back to route defaults on any error.
  let override: { title?: string; description?: string } | undefined;
  try {
    const km = path.match(/^\/kitchen\/([^/]+)$/);
    const sm = path.match(/^\/shop\/([^/]+)$/);
    if (env.DB && km) {
      const k = await env.DB.prepare('SELECT name, description, city, state FROM kitchens WHERE slug = ?').bind(km[1]).first<{ name: string; description: string | null; city: string | null; state: string | null }>();
      if (k) {
        const where = k.city ? ` in ${k.city}${k.state ? ', ' + k.state : ''}` : '';
        override = { title: `${k.name} — Shared commercial kitchen`, description: k.description || `${k.name}${where}: a licensed shared commercial kitchen. Book time and grow your food business on Culina.` };
      }
    } else if (env.DB && sm) {
      const t = await env.DB.prepare('SELECT business_name, description FROM tenant_profiles WHERE business_slug = ?').bind(sm[1]).first<{ business_name: string | null; description: string | null }>();
      if (t?.business_name) {
        override = { title: `${t.business_name} — Order online`, description: t.description || `Shop ${t.business_name} — fresh from a Culina maker. Order online.` };
      }
    }
  } catch {
    /* fall back to route defaults */
  }

  const seo = seoForPath(path, override);
  const set = (attr: 'content' | 'href', value: string) => ({
    element(el: { setAttribute(name: string, v: string): void }) {
      el.setAttribute(attr, value);
    },
  });

  return new HTMLRewriter()
    .on('title', { element(el) { el.setInnerContent(seo.title); } })
    .on('meta[name="description"]', set('content', seo.description))
    .on('link[rel="canonical"]', set('href', seo.canonical))
    .on('meta[property="og:title"]', set('content', seo.title))
    .on('meta[property="og:description"]', set('content', seo.description))
    .on('meta[property="og:url"]', set('content', seo.ogUrl))
    .on('meta[name="twitter:title"]', set('content', seo.title))
    .on('meta[name="twitter:description"]', set('content', seo.description))
    .transform(asset);
}
