import * as React from 'react';

/**
 * Returns a stable callback that forces a re-render. Used by pages that mutate
 * the in-memory demo store in place and need the view to reflect the change.
 * When the data layer is swapped for Supabase + a query cache, these calls can
 * be replaced by query invalidation.
 */
export function useForceUpdate(): () => void {
  return React.useReducer((x: number) => x + 1, 0)[1];
}
