import { test, expect } from '@playwright/test';

/**
 * Public, no-auth smoke tests. Verify the deployed site serves the marketing
 * surfaces and that the API health/list endpoints respond with the right shape.
 * These create no accounts.
 */

test.describe('public surfaces', () => {
  test('landing loads with title, hero, and a working primary CTA', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/culina/i);
    // The hero <h1> renders in both layouts.
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();

    // Primary CTA → sign up.
    await page.getByRole('link', { name: /start free/i }).first().click();
    await expect(page).toHaveURL(/\/auth\/signup/);
    await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible();
  });

  test('login page offers the demo entries', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    // Short labels: exact match so "Maker" ≠ some longer string.
    await expect(page.getByRole('button', { name: 'Maker', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Operator', exact: true })).toBeVisible();
  });

  test('key public marketing routes render real content', async ({ page }) => {
    for (const path of ['/about', '/features', '/find-a-kitchen', '/privacy']) {
      await page.goto(path);
      await expect(page).toHaveTitle(/culina/i);
      // A level-1 heading proves the route resolved to a real page (lazy chunks
      // settle first). We deliberately don't assert on the Find-a-Kitchen map —
      // it's a token-dependent Mapbox canvas that mounts via IntersectionObserver.
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 15_000 });
    }
  });
});

test.describe('API', () => {
  test('health reports the service and its bindings', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.service).toBe('culina');
    // Boolean capability flags should always be present.
    for (const k of ['ai', 'images', 'db', 'storage', 'stripe']) {
      expect(typeof body[k]).toBe('boolean');
    }
  });

  test('public list endpoints return arrays of the expected shape', async ({ request }) => {
    const checks: [string, string][] = [
      ['/api/data/grants', 'grants'],
      ['/api/data/learning', 'learning'],
      ['/api/data/mentors', 'mentors'],
      ['/api/data/kitchens', 'kitchens'],
    ];
    for (const [path, key] of checks) {
      const res = await request.get(path);
      expect(res.ok(), `${path} should respond ok`).toBeTruthy();
      const body = await res.json();
      expect(Array.isArray(body[key]), `${path} → ${key} should be an array`).toBeTruthy();
    }
  });
});
