/**
 * Mapbox GL loader.
 *
 * Culina stays Cloudflare-native for storage/compute, but the public kitchen
 * directory benefits from a real interactive map, so we lazily pull Mapbox GL
 * from its CDN only when a token is configured and the discovery page is
 * actually viewed. This keeps it out of the app bundle entirely and means the
 * site builds and runs with zero Mapbox setup — the map simply falls back to a
 * styled static view when no token is present.
 *
 * Set the token at build time as `VITE_MAPBOX_TOKEN` (a public `pk.*` token).
 */
const MAPBOX_VERSION = 'v3.9.4';

export const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN?.trim() || '';
export const hasMapbox = () => MAPBOX_TOKEN.length > 0;

let loader: Promise<any> | null = null;

export function loadMapbox(): Promise<any> {
  const w = window as any;
  if (w.mapboxgl) return Promise.resolve(w.mapboxgl);
  if (loader) return loader;

  loader = new Promise((resolve, reject) => {
    // Stylesheet
    if (!document.querySelector('link[data-mapbox]')) {
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = `https://api.mapbox.com/mapbox-gl-js/${MAPBOX_VERSION}/mapbox-gl.css`;
      css.setAttribute('data-mapbox', '');
      document.head.appendChild(css);
    }
    // Script
    const script = document.createElement('script');
    script.src = `https://api.mapbox.com/mapbox-gl-js/${MAPBOX_VERSION}/mapbox-gl.js`;
    script.async = true;
    script.onload = () => {
      if (w.mapboxgl) {
        w.mapboxgl.accessToken = MAPBOX_TOKEN;
        resolve(w.mapboxgl);
      } else {
        reject(new Error('Mapbox GL failed to initialize'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load Mapbox GL'));
    document.head.appendChild(script);
  });
  return loader;
}
