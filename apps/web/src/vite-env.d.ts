/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_API_URL?: string;
  readonly VITE_APP_URL?: string;
  readonly VITE_STRIPE_PUBLISHABLE_KEY?: string;
  /** Public Mapbox token (pk.*) for the kitchen-discovery map. Optional — the
   *  map degrades to a styled static fallback when absent. */
  readonly VITE_MAPBOX_TOKEN?: string;
  /** Client-side Sentry DSN (publishable). Unset disables Sentry. */
  readonly VITE_SENTRY_DSN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
