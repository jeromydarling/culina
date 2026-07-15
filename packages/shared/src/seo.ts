/**
 * Single source of truth for SEO metadata, shared by the client head manager
 * (<Seo/>) and the Worker's crawler-time HTML injection so search engines,
 * social crawlers (which don't run JS), and AI assistants all see the same,
 * per-route title / description / canonical / Open Graph.
 *
 * Rules enforced here: titles ≤ 60 chars, descriptions ≤ 160 chars.
 */

export const SITE = {
  name: 'Culina',
  url: 'https://culina.life',
  // Site-wide default (index.html). 143 chars — under the 160 limit.
  title: 'Culina — Where food businesses are born and grow',
  description:
    'The all-in-one platform for shared commercial kitchens and the food entrepreneurs inside them — booking, compliance, storefronts, and growth.',
  ogImage: 'https://culina.life/og.svg',
  twitter: '@culinahq',
  locale: 'en_US',
} as const;

export interface RouteSeo {
  title: string;
  description: string;
}

/** Per-route metadata for the static, indexable public routes. */
export const SEO_ROUTES: Record<string, RouteSeo> = {
  '/': {
    title: 'Culina — Where food businesses grow',
    description:
      'Run your shared commercial kitchen (or your food business inside one): online booking, compliance, storefronts, payments, and growth — all in one place.',
  },
  '/about': {
    title: 'About Culina — Our mission for food makers',
    description:
      'Why we built Culina: to help shared commercial kitchens and the food entrepreneurs inside them start, run, and grow — with less busywork and more hospitality.',
  },
  '/features': {
    title: 'Features to run your food business | Culina',
    description:
      'Booking and calendars, compliance tracking, AI storefronts, invoicing, grants, and a maker community — everything a shared kitchen and its makers need.',
  },
  '/find-a-kitchen': {
    title: 'Find a commercial kitchen near you | Culina',
    description:
      'Browse the Culina Kitchen Discovery Network to find a licensed shared commercial kitchen near you and reach out to reserve time and grow your food business.',
  },
  '/privacy': {
    title: 'Privacy Policy | Culina',
    description:
      'How Culina collects, uses, and protects your data across shared-kitchen operations, storefronts, and payments. Your information, handled with care.',
  },
  // 25-char title / 155-char description — within the 60/160 limits.
  '/terms': {
    title: 'Terms of Service | Culina',
    description:
      'The terms that govern Culina: accounts and roles, bookings, invoice-first billing, the 1.5% platform fee and Stripe payments, storefronts, and AI features.',
  },
};

/** Clamp helpers so overrides (dynamic pages) also stay within limits. */
export const clampTitle = (t: string) => (t.length <= 60 ? t : t.slice(0, 57).trimEnd() + '…');
export const clampDescription = (d: string) => (d.length <= 160 ? d : d.slice(0, 157).trimEnd() + '…');

/** Resolve SEO for a pathname, applying optional dynamic overrides. */
export function seoForPath(
  pathname: string,
  override?: Partial<RouteSeo>,
): RouteSeo & { canonical: string; ogUrl: string } {
  const clean = pathname.replace(/\/+$/, '') || '/';
  const base = SEO_ROUTES[clean] ?? { title: SITE.title, description: SITE.description };
  const canonical = SITE.url + (clean === '/' ? '/' : clean);
  return {
    title: clampTitle(override?.title ?? base.title),
    description: clampDescription(override?.description ?? base.description),
    canonical,
    ogUrl: canonical,
  };
}
