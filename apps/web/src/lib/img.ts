/**
 * Request a lean thumbnail width for R2-stored images (served by the Worker's
 * /api/files endpoint, which resizes via Cloudflare Images when enabled).
 * External URLs (e.g. Unsplash) and data URLs are returned unchanged.
 */
export function thumb(url: string | undefined | null, w = 600): string | undefined {
  if (!url) return url ?? undefined;
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;
  if (url.includes('/api/files/')) return `${url}${url.includes('?') ? '&' : '?'}w=${w}`;
  return url;
}
