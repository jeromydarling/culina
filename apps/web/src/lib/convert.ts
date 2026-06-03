import type { Profile } from '@culina/shared';
import { setSignupPrefill } from './signupPrefill';
import {
  getTenantProfile,
  getKitchenByOperator,
  listRecipes,
  listProducts,
  getTenantSite,
  listSpaces,
  listEquipment,
} from './store';

/**
 * Snapshot the current demo session's work and stash it for the sign-up form,
 * so converting to a real account carries everything over.
 */
export function captureConversion(profile: Profile) {
  if (profile.role === 'tenant') {
    const tp = getTenantProfile(profile.id);
    const recipes = listRecipes(profile.id);
    const products = listProducts(profile.id);
    const site = getTenantSite(profile.id);
    setSignupPrefill({
      role: 'tenant',
      fullName: profile.full_name ?? undefined,
      businessName: tp?.business_name ?? undefined,
      carry: { recipes, products, site, counts: { recipes: recipes.length, products: products.length, storefront: site ? 1 : 0 } },
    });
  } else if (profile.role === 'operator') {
    const k = getKitchenByOperator(profile.id);
    const spaces = k ? listSpaces(k.id) : [];
    const equipment = k ? listEquipment(k.id) : [];
    setSignupPrefill({
      role: 'operator',
      fullName: profile.full_name ?? undefined,
      businessName: k?.name ?? undefined,
      carry: { spaces, equipment, counts: { spaces: spaces.length, equipment: equipment.length } },
    });
  } else {
    setSignupPrefill({ role: profile.role, fullName: profile.full_name ?? undefined });
  }
}

/** Human summary of what a carry will bring into the new account. */
export function carrySummary(counts: Record<string, number>): string[] {
  const labels: Record<string, [string, string]> = {
    recipes: ['recipe', 'recipes'],
    products: ['product', 'products'],
    storefront: ['storefront', 'storefronts'],
    spaces: ['space', 'spaces'],
    equipment: ['equipment item', 'equipment items'],
  };
  return Object.entries(counts)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => `${n} ${labels[k]?.[n === 1 ? 0 : 1] ?? k}`);
}
