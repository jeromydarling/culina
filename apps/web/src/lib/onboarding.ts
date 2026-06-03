/** Operator first-run onboarding state, persisted locally (demo) per user. */

export const ONBOARDING_STEPS = [
  { id: 'profile', label: 'Set up your kitchen profile', to: '/operator/settings' },
  { id: 'spaces', label: 'Add spaces & equipment', to: '/operator/spaces' },
  { id: 'import', label: 'Import or invite your tenants', to: '/operator/onboarding' },
  { id: 'pricing', label: 'Set your pricing', to: '/operator/spaces' },
  { id: 'stripe', label: 'Connect Stripe to get paid', to: '/operator/stripe-connect' },
  { id: 'list', label: 'List on the Kitchen Discovery network', to: '/operator/settings' },
  { id: 'promote', label: 'Promote money-makers to tenants (AI website + storefront)', to: '/operator/onboarding' },
] as const;

export const TENANT_ONBOARDING_STEPS = [
  { id: 't_profile', label: 'Complete your business profile', to: '/tenant/settings' },
  { id: 't_kitchen', label: 'Join your kitchen', to: '/tenant/onboarding' },
  { id: 't_docs', label: 'Upload your compliance documents', to: '/tenant/documents' },
  { id: 't_booking', label: 'Make your first booking', to: '/tenant/book' },
  { id: 't_recipe', label: 'Cost your first recipe', to: '/tenant/recipes' },
  { id: 't_storefront', label: 'Build your storefront & AI website', to: '/tenant/storefront' },
] as const;

export type OnboardingStepId =
  | (typeof ONBOARDING_STEPS)[number]['id']
  | (typeof TENANT_ONBOARDING_STEPS)[number]['id'];

const key = (userId: string) => `culina_onboarding_${userId}`;
const welcomeKey = (userId: string) => `culina_welcomed_${userId}`;

export function getCompletedSteps(userId: string): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(key(userId)) || '[]'));
  } catch {
    return new Set();
  }
}

export function completeStep(userId: string, step: OnboardingStepId) {
  const set = getCompletedSteps(userId);
  set.add(step);
  localStorage.setItem(key(userId), JSON.stringify([...set]));
}

export function resetOnboarding(userId: string) {
  localStorage.removeItem(key(userId));
}

export function hasBeenWelcomed(userId: string): boolean {
  return localStorage.getItem(welcomeKey(userId)) === '1';
}
export function markWelcomed(userId: string) {
  localStorage.setItem(welcomeKey(userId), '1');
}
