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

export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number]['id'];

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
