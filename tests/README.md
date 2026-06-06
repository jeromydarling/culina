# Culina E2E tests

Playwright tests that sign up a brand-new user and exercise everything a real
maker can do, against the **deployed** site (Cloudflare Worker serving the SPA +
API) — not a local dev server.

## What's here

| File | Purpose |
| --- | --- |
| `e2e/smoke.spec.ts` | Public surfaces + API health/list shape. No auth, no accounts. |
| `e2e/journey.spec.ts` | THE journey — one new maker account does everything, serial, auto-cleaned. |
| `e2e/app.spec.ts` | Negative paths (bad login, purge-token rejection). Creates nothing. |
| `e2e/helpers.ts` | Signup flow, field locators, purge cleanup. |

The journey signs up a maker, visits every screen, **creates a recipe, a
product, a settings change, and a storefront edit — then reloads and re-asserts
each** to prove it persisted to D1 (not just React state). It runs the AI recipe
advisor, requests a mentor (when seeded), confirms the session survives a cold
reload, and signs out. `afterAll` purges the account.

## Run it

```bash
# Against production (default):
npm run test:e2e

# Against a specific deployment:
BASE_URL=https://culina.life npm run test:e2e

# One project only / interactive:
npx playwright test --project=desktop
npm run test:e2e:ui
```

> **This repo's sandbox can't run a browser** (egress is blocked, so
> `npx playwright install chromium` fails and there's no system Chrome). Validate
> specs locally with `npx playwright test --list`; the real run happens in CI
> (GitHub Actions has Chromium). See `.github/workflows/e2e.yml`.

## Env knobs

| Variable | Where | Default | Meaning |
| --- | --- | --- | --- |
| `BASE_URL` | test runner | `https://culina.life` | Deployed site under test. |
| `ADMIN_PURGE_TOKEN` | test runner + Worker | `culina-e2e-purge` | Token for the cleanup endpoint. Set as a repo secret **and** a Worker secret to harden. |
| `EMAIL_VERIFICATION` | **Worker** | _(unset = OFF)_ | **OFF** ⇒ new signups are created already-verified and can use the app immediately (no email link in the loop). **Set to `"on"`** to require confirming the email link. This is the single variable to re-enable verification. |

### Email verification is DISABLED for tests

By default the Worker creates new accounts already-verified, so the journey never
depends on an email link. **To re-enable, set `EMAIL_VERIFICATION="on"` on the
Worker** (e.g. in `apps/worker/wrangler.toml` `[vars]`, or
`wrangler secret put EMAIL_VERIFICATION`). That's the only change required.

### Cleanup endpoint

`POST /api/admin/purge-user?token=<token>&email=<email>` deletes the user and all
child rows. It refuses any address that doesn't start with `e2e+`, so even a
leaked fallback token can only ever delete test accounts.

## Porting this rig to another Cloudflare app

1. Copy `playwright.config.ts`, `tests/`, and `.github/workflows/e2e.yml`.
2. Point `BASE_URL` at the new deployment.
3. Add the two Worker pieces: the `EMAIL_VERIFICATION` gate in signup and the
   token-guarded `purge-user` endpoint (reuse the app's account-delete logic).
4. Re-map selectors in `helpers.ts` + the specs to the new app's headings,
   nav labels, and create flows. Keep the rules that matter: assert the
   level-1 `<h1>` (stable across viewports), `reducedMotion: 'reduce'`, await the
   write request before reloading, and `{ exact: true }` for short labels.
