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

    // Back to the list in-app (no reload) — proves the populated list renders.
    await page.getByRole('button', { name: /All recipes/i }).click();
    await expect(page.getByText(recipeName, { exact: true }).first()).toBeVisible({ timeout: 15_000 });

    // Now prove D1 persistence with a real cold reload. Assert we stay in-app
    // (a session/auth bounce would land on /auth/login) and the recipe survives.
    await page.reload();
    await expect(page).toHaveURL(/\/tenant\/recipes/);
    await expect(page.getByText(recipeName, { exact: true }).first()).toBeVisible({ timeout: 25_000 });
  });

  test('4. create a product → it persists across reload', async () => {
    const productName = `Country Boule ${suffix}`;
    await page.goto('/tenant/products');
    // "Add product" appears twice: the PageHeader action (which sits under the
    // sticky top bar and gets click-intercepted on mobile) and the empty-state
    // button in the page body. Use the latter — reachable in both viewports.
    await page.getByRole('button', { name: 'Add product', exact: true }).last().click();

    await field(page, 'Name').fill(productName);
    await field(page, 'Price ($)').fill('14.00');
    await saveAnd(page, () => page.getByRole('button', { name: 'Save product' }).click());

    await page.reload();
    await expect(page).toHaveURL(/\/tenant\/products/);
    await expect(page.getByText(productName, { exact: true }).first()).toBeVisible({ timeout: 25_000 });
  });

  test('5. update business settings → the change persists across reload', async () => {
    const updated = `Robin's Bakehouse ${suffix}`;
    await page.goto('/tenant/settings');
    const biz = field(page, 'Business name');
    await expect(biz).toBeVisible({ timeout: 15_000 });
    await biz.fill(updated);
    await saveAnd(page, () => page.getByRole('button', { name: 'Save changes' }).click());

    await page.reload();
    await expect(page).toHaveURL(/\/tenant\/settings/);
    await expect(field(page, 'Business name')).toHaveValue(updated, { timeout: 25_000 });
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
    await expect(page).toHaveURL(/\/tenant\/storefront/);
    await expect(field(page, 'Hero headline')).toHaveValue(hero, { timeout: 25_000 });
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
    await expect(page).toHaveURL(/\/tenant\/mentors/);
    await expect(page.getByRole('button', { name: /request mentorship/i })).toHaveCount(before - 1, {
      timeout: 25_000,
    });
  });

  test('8. the session survives a cold reload, then signs out cleanly', async () => {
    await page.goto('/tenant');
    // Let auth fully settle before the cold reload: reloading mid-flight would
    // abort /api/auth/me, and that rejection clears the token (a false logout).
    await expect(page.getByRole('heading', { level: 1, name: /👋/ })).toBeVisible({ timeout: 25_000 });
    await page.reload();
    // Still signed in (D1-backed JWT session restored on load), not bounced to login.
    await expect(page).toHaveURL(/\/tenant$/);
    await expect(page.getByRole('heading', { level: 1, name: /👋/ })).toBeVisible({ timeout: 25_000 });
    await dismissVerifyBanner(page);

    // Sign out. The Log-out control lives in the sidebar (desktop) / drawer (mobile).
    // If none is on screen (mobile), open the drawer and wait for its logout to
    // appear — don't race the backdrop's fade-in.
    // Sign out. Desktop shows the Log-out control in the always-visible sidebar;
    // mobile hides it behind the hamburger drawer. Open the drawer only when no
    // logout is on screen (so we never toggle an open drawer shut), retrying to
    // ride out the backdrop's fade-in, then click the real control (a normal
    // click — force:true can land beside the handler).
    const visibleLogout = () => page.locator('button[aria-label="Log out"]:visible').first();
    await expect(async () => {
      // Open the drawer ONLY on mobile — i.e. when the hamburger is actually on
      // screen. On desktop the sidebar logout is always present (we just wait for
      // it to render), so we must never spawn the drawer, whose backdrop would
      // then intercept the logout click.
      const menu = page.getByRole('button', { name: 'Open menu' });
      if ((await page.locator('button[aria-label="Log out"]:visible').count()) === 0
        && (await menu.isVisible().catch(() => false))) {
        await menu.click({ force: true });
      }
      await expect(visibleLogout()).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 20_000 });
    // dispatchEvent fires the real logout handler on the element directly, so a
    // transient full-screen overlay (e.g. an animating backdrop the deployed
    // layout renders over the content column) can't swallow the click.
    await visibleLogout().dispatchEvent('click');

    // Logout navigates to the marketing root; the hero CTA is back (both viewports).
    await page.waitForURL(/\/$/, { timeout: 20_000 });
    await expect(page.getByRole('link', { name: /start free/i }).first()).toBeVisible({ timeout: 15_000 });
  });
});
