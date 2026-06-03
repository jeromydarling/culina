/**
 * Curated food & kitchen imagery (no people).
 *
 * These point at hosted photography for a polished default. To use your own
 * AI-generated (Flux) assets instead, drop files into `apps/web/public/img/`
 * and replace the URLs below with `/img/your-file.jpg`. Every consumer renders
 * through <SmartImage>, which falls back to an on-brand gradient if a source
 * fails to load — so swapping or removing any image is always safe.
 */
const u = (id: string, w = 1000) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

export const IMG = {
  heroBread: u('1509440159596-0249088772ff'), // croissants / bake
  heroKitchen: u('1556911220-bff31c812dba'), // stainless prep
  heroJars: u('1607013251379-e6eecfffe234'), // jars / preserves
  kitchenLine: u('1581622558663-b2e33377dfb2'), // commercial kitchen
  makerPastry: u('1555507036-ab1f4038808a'), // pastries tray
  bread: u('1549931319-a545dcf3bc7c'),
  pastry: u('1486427944299-d1955d23e34d'),
  jars: u('1474979266404-7eaacbcd87c5'),
  bagels: u('1585478259715-1c0a1a3a3b9e'),
};
