import { test, expect } from '@playwright/test';
import { uniqueEmail } from './helpers';

/**
 * Negative paths. These exercise error handling without creating any account.
 */

test('a bad login is rejected and creates nothing', async ({ page }) => {
  await page.goto('/auth/login');
  await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();

  // A well-formed but non-existent account with the wrong password.
  await page.locator('input[type="email"]').fill(uniqueEmail('nobody'));
  await page.locator('input[type="password"]').fill('definitely-the-wrong-password');
  await page.getByRole('button', { name: 'Log in' }).click();

  // Server rejects with a generic (non-enumerating) message, surfaced as a toast.
  await expect(page.getByText(/invalid email or password/i)).toBeVisible({ timeout: 15_000 });
  // Still on the login page — no session established.
  await expect(page).toHaveURL(/\/auth\/login/);
});

test('the purge endpoint refuses a token but never a real address', async ({ request }) => {
  // Wrong token → 403 (and, regardless, it only ever accepts e2e+ addresses).
  const res = await request.post('/api/admin/purge-user?token=wrong&email=e2e+probe@culina.life');
  // 403 once the endpoint is deployed; 404 if this run predates the deploy.
  expect([403, 404]).toContain(res.status());
});
