import { test, expect, type Page } from '@playwright/test';
import { signUpAsMaker, dismissVerifyBanner, field, purgeUser, uniqueEmail } from './helpers';

/**
 * THE journey: one brand-new maker account does everything a real user can do,
 * end-to-end, against the DEPLOYED site. Serial, one shared page/account, and
 * auto-cleaned in afterAll.
 *
 * Persistence is the point: every create/update is followed by a real reload and
 * a re-assert, so we prove it reached Cloudflare D1 — not just React state. Saves
 * are fire-and-forget, so we await the actual POST /api/data/upsert before reload.
 */

test.describe.configure({ mode: 'serial' });

// Wait for the D1 write a save kicks off, then click. Returns once it lands.
function saveAnd(page: Page, click: () => Promise<void>) {
  return Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/api/data/upsert') && r.request().method() === 'POST' && r.status() < 400,
      { timeout: 20_000 },
    ),
    click(),
  ]);
}

test.describe('Maker journey (signup → use everything → sign out)', () => {
  let page: Page;
  let email: string;
  const password = 'E2e-Passw0rd!';
  const name = 'Robin Tester';
  let suffix: string;
  let business: string;

  test.beforeAll(async ({ browser }, testInfo) => {
    // Unique per project so desktop and mobile don't collide on one account.
    suffix = `${testInfo.project.name}-${Date.now()}`;
    email = uniqueEmail(`journey-${testInfo.project.name}`);
    business = `Robin's Test Kitchen ${suffix}`;
    page = await browser.newPage();
  });

  test.afterAll(async () => {
    // Best-effort cleanup so CI runs don't accumulate junk accounts.
    await purgeUser(page.request, email);
    await page.close();
  });

  test('1. marketing → sign up a brand-new maker (no email link needed)', async () => {
    await page.goto('/');
    await page.getByRole('link', { name: /start free/i }).first().click();
    await expect(page).toHaveURL(/\/auth\/signup/);
    await signUpAsMaker(page, { email, password, name, business });
    // Signed in: the greeting heading shows the new user's first name.
    await expect(page.getByRole('heading', { level: 1, name: /Robin/ })).toBeVisible();
  });

  test('2. every maker screen renders its page heading', async () => {
    const pages: { path: string; heading: RegExp }[] = [
      { path: '/tenant/book', heading: /^Book a Space$/ },
      { path: '/tenant/bookings', heading: /^My Bookings$/ },
      { path: '/tenant/documents', heading: /^My Documents$/ },
      { path: '/tenant/recipes', heading: /Recipe & Food Cost Lab/ },
      { path: '/tenant/products', heading: /Products & Storefront/ },
      { path: '/tenant/storefront', heading: /Website Manager/ },
      { path: '/tenant/marketing', heading: /Marketing Studio/ },
      { path: '/tenant/grants', heading: /Grant Finder/ },
      { path: '/tenant/learning', heading: /Learning Hub/ },
      { path: '/tenant/mentors', heading: /Mentor Matching/ },
      { path: '/tenant/community', heading: /^Community$/ },
      { path: '/tenant/tools', heading: /Business Tools/ },
      { path: '/tenant/settings', heading: /^Settings$/ },
    ];
    // Navigate by URL (not nav clicks) to dodge the desktop-sidebar/mobile-drawer
    // viewport split — and assert the level-1 PageHeader, which shows in both.
    for (const { path, heading } of pages) {
      await page.goto(path);
      await dismissVerifyBanner(page);
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible({ timeout: 15_000 });
    }
  });

  test('3. create a recipe → it persists across reload; the AI advisor responds', async () => {
    const recipeName = `Sourdough Loaf ${suffix}`;
    await page.goto('/tenant/recipes');
    await page.getByRole('button', { name: /new recipe/i }).first().click();

    const nameField = field(page, 'Name');
    await expect(nameField).toBeVisible({ timeout: 15_000 });
    await nameField.fill(recipeName);
    await saveAnd(page, () => page.getByRole('button', { name: 'Save', exact: true }).click());

    // AI / long action: the advisor always renders advice (real or fallback),
    // tagged with the AI disclaimer. Give it room.
    await page.getByRole('button', { name: /reduce COGS/i }).click();
    await expect(page.getByText(/AI-generated/i)).toBeVisible({ timeout: 30_000 });

    // Persisted? Reload the list and find it.
    await page.goto('/tenant/recipes');
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: /Recipe & Food Cost Lab/ })).toBeVisible();
    await expect(page.getByText(recipeName, { exact: true }).first()).toBeVisible({ timeout: 15_000 });
  });

  test('4. create a product → it persists across reload', async () => {
    const productName = `Country Boule ${suffix}`;
    await page.goto('/tenant/products');
    // "Add product" appears in both the header and the empty state — take the first.
    await page.getByRole('button', { name: 'Add product', exact: true }).first().click();

    await field(page, 'Name').fill(productName);
    await field(page, 'Price ($)').fill('14.00');
    await saveAnd(page, () => page.getByRole('button', { name: 'Save product' }).click());

    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: /Products & Storefront/ })).toBeVisible();
    await expect(page.getByText(productName, { exact: true }).first()).toBeVisible({ timeout: 15_000 });
  });

  test('5. update business settings → the change persists across reload', async () => {
    const updated = `Robin's Bakehouse ${suffix}`;
    await page.goto('/tenant/settings');
    const biz = field(page, 'Business name');
    await expect(biz).toBeVisible({ timeout: 15_000 });
    await biz.fill(updated);
    await saveAnd(page, () => page.getByRole('button', { name: 'Save changes' }).click());

    await page.reload();
    await expect(field(page, 'Business name')).toHaveValue(updated, { timeout: 15_000 });
  });

  test('6. edit the storefront hero → it persists across reload', async () => {
    const hero = `Fresh from ${suffix}`;
    await page.goto('/tenant/storefront');
    await expect(page.getByRole('heading', { level: 1, name: /Website Manager/ })).toBeVisible();
    const headline = field(page, 'Hero headline');
    await expect(headline).toBeVisible({ timeout: 15_000 });
    await headline.fill(hero);
    await saveAnd(page, () => page.getByRole('button', { name: 'Save', exact: true }).click());

    await page.reload();
    await expect(field(page, 'Hero headline')).toHaveValue(hero, { timeout: 15_000 });
  });

  test('7. request a mentor (when seeded) → the request persists across reload', async () => {
    await page.goto('/tenant/mentors');
    await expect(page.getByRole('heading', { level: 1, name: /Mentor Matching/ })).toBeVisible();

    const requestButtons = page.getByRole('button', { name: /request mentorship/i });
    const before = await requestButtons.count();
    test.skip(before === 0, 'No mentors seeded in this environment.');

    await requestButtons.first().click();
    await field(page, 'What would you like help with?', 'textarea').fill(
      'I want help pricing my product line for wholesale accounts.',
    );
    await saveAnd(page, () => page.getByRole('button', { name: 'Send request' }).click());

    // After a reload, that mentor shows a status instead of the request button, so
    // the count of available "Request mentorship" buttons drops — proof it persisted.
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: /Mentor Matching/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /request mentorship/i })).toHaveCount(before - 1, {
      timeout: 15_000,
    });
  });

  test('8. the session survives a cold reload, then signs out cleanly', async () => {
    await page.goto('/tenant');
    await page.reload();
    // Still signed in (D1-backed JWT session restored on load), not bounced to login.
    await expect(page.getByRole('heading', { level: 1, name: /👋/ })).toBeVisible({ timeout: 15_000 });
    await dismissVerifyBanner(page);

    // Sign out. The Log-out control lives in the sidebar (desktop) / drawer (mobile);
    // open the mobile drawer first if no visible logout is on screen.
    const visibleLogout = page.locator('button[aria-label="Log out"]:visible');
    if ((await visibleLogout.count()) === 0) {
      await page.getByRole('button', { name: 'Open menu' }).click();
    }
    await page.locator('button[aria-label="Log out"]:visible').first().click();

    // Back on marketing, signed out: the hero CTA (in-body, both viewports) is back.
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('link', { name: /start free/i }).first()).toBeVisible({ timeout: 15_000 });
  });
});
