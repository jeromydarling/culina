import * as React from 'react';
import { useLocation } from 'react-router-dom';
import { SITE, seoForPath } from '@culina/shared';

/**
 * Per-route <head> manager. Sets title, description, canonical, and Open
 * Graph / Twitter tags on the client so Google (which renders JS) and users
 * see page-specific metadata. The Worker injects the same tags server-side for
 * social/AI crawlers that don't run JS (see apps/worker/src/seo).
 *
 *   <Seo />                                   // uses the route's defaults
 *   <Seo title="Sara's Sourdough" description="Fresh loaves…" />  // dynamic page
 */
function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

export function Seo({ title, description }: { title?: string; description?: string }) {
  const { pathname } = useLocation();

  React.useEffect(() => {
    const seo = seoForPath(pathname, { title, description });
    document.title = seo.title;
    upsertMeta('name', 'description', seo.description);
    upsertCanonical(seo.canonical);

    upsertMeta('property', 'og:title', seo.title);
    upsertMeta('property', 'og:description', seo.description);
    upsertMeta('property', 'og:url', seo.ogUrl);
    upsertMeta('property', 'og:image', SITE.ogImage);
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:site_name', SITE.name);

    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', seo.title);
    upsertMeta('name', 'twitter:description', seo.description);
    upsertMeta('name', 'twitter:image', SITE.ogImage);
  }, [pathname, title, description]);

  return null;
}
