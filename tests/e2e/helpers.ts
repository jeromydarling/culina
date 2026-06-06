import { type Page, type APIRequestContext, expect } from '@playwright/test';

/**
 * Shared helpers for the Culina E2E rig.
 *
 * Email verification is DISABLED server-side by default (EMAIL_VERIFICATION env
 * var on the Worker, default OFF), so a brand-new signup is already verified and
 * can use the whole app immediately — no email link in the loop. Re-enable by
 * setting EMAIL_VERIFICATION="on" on the Worker (one variable).
 */

// Guards POST /api/admin/purge-user. Falls back to the Worker's known default so
// CI cleans up even without a configured secret; the endpoint additionally
// refuses any address that doesn't start with "e2e+".
export const PURGE_TOKEN = process.env.ADMIN_PURGE_TOKEN || 'culina-e2e-purge';

/** Unique, clearly-marked test address. The domain never needs to receive mail. */
export function uniqueEmail(tag: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `e2e+${tag}-${Date.now()}-${rand}@culina.life`;
}

/** Best-effort cleanup. Never throws — a not-yet-deployed endpoint shouldn't fail a run. */
export async function purgeUser(request: APIRequestContext, email: string): Promise<boolean> {
  try {
    const res = await request.post(
      `/api/admin/purge-user?token=${encodeURIComponent(PURGE_TOKEN)}&email=${encodeURIComponent(email)}`,
    );
    return res.ok();
  } catch {
    return false;
  }
}

/** Locate the <input>/<textarea>/<select> that follows a given <label> (labels
 *  aren't htmlFor-associated in this app, so getByLabel won't work). */
export function field(page: Page, label: string, tag: 'input' | 'textarea' | 'select' = 'input') {
  return page.locator(`label:text-is("${label}") + ${tag}`).first();
}

/** The amber "confirm your email" banner only appears when verification is ON.
 *  Dismiss it if present so it never adds layout noise — works either way. */
export async function dismissVerifyBanner(page: Page): Promise<void> {
  const dismiss = page.getByRole('button', { name: 'Dismiss' });
  if (await dismiss.isVisible().catch(() => false)) await dismiss.click().catch(() => {});
}

interface SignupInfo {
  email: string;
  password: string;
  name: string;
  business: string;
}

/** Sign up a brand-new MAKER (tenant) and land in the app, signed in. */
export async function signUpAsMaker(page: Page, info: SignupInfo): Promise<void> {
  await page.goto('/auth/signup');
  await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible();

  // Default role is operator; choose "I'm a food entrepreneur" (Maker / tenant).
  await page.getByRole('button', { name: /food entrepreneur/i }).click();

  await field(page, 'Full name').fill(info.name);
  await field(page, 'Business name').fill(info.business);
  await page.locator('input[type="email"]').fill(info.email);
  await page.locator('input[type="password"]').fill(info.password);

  await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/auth/signup') && r.request().method() === 'POST'),
    page.getByRole('button', { name: 'Create account' }).click(),
  ]);

  // Signed in → landed in the tenant app. The greeting <h1> ("Good …, <name> 👋")
  // shows on both desktop and mobile, unlike the viewport-dependent sidebar.
  await page.waitForURL('**/tenant');
  await expect(page.getByRole('heading', { level: 1, name: /👋/ })).toBeVisible({ timeout: 15_000 });
  await dismissVerifyBanner(page);
}
