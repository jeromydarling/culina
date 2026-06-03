import type { UserRole, Recipe, Product, TenantSite, KitchenSpace, KitchenEquipment } from '@culina/shared';

/** Work captured from a demo session to replay into a new real account. */
export interface DemoCarry {
  recipes?: Recipe[];
  products?: Product[];
  site?: TenantSite | null;
  spaces?: KitchenSpace[];
  equipment?: KitchenEquipment[];
  counts: Record<string, number>;
}

/** Carries context from a demo session into the real sign-up form. */
export interface SignupPrefill {
  role: UserRole;
  fullName?: string;
  businessName?: string; // business name (maker) or kitchen name (operator)
  carry?: DemoCarry;
}

const KEY = 'culina_signup_prefill';

export function setSignupPrefill(p: SignupPrefill) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

/** Read and clear the prefill (one-shot). */
export function takeSignupPrefill(): SignupPrefill | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    localStorage.removeItem(KEY);
    return JSON.parse(raw) as SignupPrefill;
  } catch {
    return null;
  }
}
