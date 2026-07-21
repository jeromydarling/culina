import { type Env } from '../lib/http';
import { seoForPath } from '@culina/shared';
import { ogImageUrl } from './ogimage';

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
  /^\/terms$/,
  /^\/kitchen\/[^/]+$/,
  /^\/shop\/[^/]+$/,
];

export function isSeoHtmlRoute(path: string): boolean {
  const clean = path.replace(/\/+$/, '') || '/';
  return HTML_ROUTES.some((re) => re.test(clean));
}

/** Static, indexable marketing routes with their crawl hints. */
const STATIC_SITEMAP: { path: string; changefreq: string; priority: string }[] = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/about', changefreq: 'monthly', priority: '0.7' },
  { path: '/features', changefreq: 'monthly', priority: '0.8' },
  { path: '/find-a-kitchen', changefreq: 'daily', priority: '0.9' },
  { path: '/privacy', changefreq: 'yearly', priority: '0.3' },
  { path: '/terms', changefreq: 'yearly', priority: '0.3' },
];

const SITE_URL = 'https://culina.life';

/**
 * Dynamically-generated sitemap: the static marketing pages PLUS every public
 * kitchen (`is_listed = 1`) and published storefront, so Google can discover the
 * Kitchen Discovery Network and maker shops instead of only the 6 static routes.
 * Best-effort on the DB — always returns at least the static set.
 */
export async function handleSitemap(env: Env): Promise<Response> {
  const urls: string[] = STATIC_SITEMAP.map(
    (r) => `  <url>\n    <loc>${SITE_URL}${r.path}</loc>\n    <changefreq>${r.changefreq}</changefreq>\n    <priority>${r.priority}</priority>\n  </url>`,
  );
  try {
    if (env.DB) {
      const kitchens = await env.DB.prepare('SELECT slug FROM kitchens WHERE is_listed = 1 AND slug IS NOT NULL').all<{ slug: string }>();
      for (const k of kitchens.results ?? []) {
        urls.push(`  <url>\n    <loc>${SITE_URL}/kitchen/${encodeURIComponent(k.slug)}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>`);
      }
      const shops = await env.DB
        .prepare('SELECT tp.business_slug AS slug FROM tenant_profiles tp JOIN tenant_sites ts ON ts.tenant_id = tp.tenant_id WHERE tp.business_slug IS NOT NULL AND ts.is_published = 1')
        .all<{ slug: string }>();
      for (const s of shops.results ?? []) {
        urls.push(`  <url>\n    <loc>${SITE_URL}/shop/${encodeURIComponent(s.slug)}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.6</priority>\n  </url>`);
      }
    }
  } catch {
    /* fall back to the static set */
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
  return new Response(xml, {
    headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' },
  });
}

export async function handleSeoHtml(request: Request, env: Env): Promise<Response> {
  const asset = await env.ASSETS!.fetch(request);
  // Only rewrite the HTML shell; pass assets/other responses through untouched.
  if (!(asset.headers.get('content-type') || '').includes('text/html')) return asset;

  const path = new URL(request.url).pathname.replace(/\/+$/, '') || '/';

  // Dynamic routes (kitchen / shop): look up the entity so the preview is truly
  // page-specific. Best-effort — falls back to route defaults on any error.
  let override: { title?: string; description?: string } | undefined;
  // Per-page social-preview image (falls back to the site default when unset).
  let ogImage: string | undefined;
  try {
    const km = path.match(/^\/kitchen\/([^/]+)$/);
    const sm = path.match(/^\/shop\/([^/]+)$/);
    if (env.DB && km) {
      const k = await env.DB.prepare('SELECT name, description, city, state FROM kitchens WHERE slug = ?').bind(km[1]).first<{ name: string; description: string | null; city: string | null; state: string | null }>();
      if (k) {
        const where = k.city ? ` in ${k.city}${k.state ? ', ' + k.state : ''}` : '';
        override = { title: `${k.name} — Shared commercial kitchen`, description: k.description || `${k.name}${where}: a licensed shared commercial kitchen. Book time and grow your food business on Culina.` };
        ogImage = ogImageUrl(k.name, `Shared commercial kitchen${k.city ? ` · ${k.city}${k.state ? ', ' + k.state : ''}` : ''}`);
      }
    } else if (env.DB && sm) {
      const t = await env.DB.prepare('SELECT business_name, description FROM tenant_profiles WHERE business_slug = ?').bind(sm[1]).first<{ business_name: string | null; description: string | null }>();
      if (t?.business_name) {
        override = { title: `${t.business_name} — Order online`, description: t.description || `Shop ${t.business_name} — fresh from a Culina maker. Order online.` };
        ogImage = ogImageUrl(t.business_name, 'Order online · a Culina maker');
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

  let rw = new HTMLRewriter()
    .on('title', { element(el) { el.setInnerContent(seo.title); } })
    .on('meta[name="description"]', set('content', seo.description))
    .on('link[rel="canonical"]', set('href', seo.canonical))
    .on('meta[property="og:title"]', set('content', seo.title))
    .on('meta[property="og:description"]', set('content', seo.description))
    .on('meta[property="og:url"]', set('content', seo.ogUrl))
    .on('meta[name="twitter:title"]', set('content', seo.title))
    .on('meta[name="twitter:description"]', set('content', seo.description));
  if (ogImage) {
    rw = rw
      .on('meta[property="og:image"]', set('content', ogImage))
      .on('meta[name="twitter:image"]', set('content', ogImage));
  }
  return rw.transform(asset);
}
