# Culina Launch Audit

Loose ends before selling to the public, ordered by severity. Each item has a
file reference and a checkbox — check them off as they land.

_Context: sessions are `demo` or `live` (decided at login). Everything below
concerns what a REAL user hits in a live session at https://culina.life._

---

## 🔴 Launch blockers

- [ ] **B1 — R2 files are readable without auth.** `apps/worker/src/storage/index.ts` — `handleFile()` streams any `/api/files/<key>` object with no `authenticate()` and no ownership check, and sets `Cache-Control: public`. Compliance docs/IDs are only protected by unguessable keys. **Fix:** require auth + (owner ∨ kitchen-operator ∨ admin) on download; make product/storefront images the only public class; `private` cache for the rest.
- [ ] **B2 — No rate limiting on login/signup.** `apps/worker/src/auth/index.ts` — unlimited password guessing; `checkAiQuota` is AI-only. **Fix:** per-IP + per-email attempt counter (D1 or KV) with backoff, on `login`, `signup`, `forgot`.
- [ ] **B3 — CORS wide open.** `wrangler.jsonc` `ALLOWED_ORIGIN: "*"` + `Authorization` allowed header. **Fix:** set to `https://culina.life`.
- [ ] **B4 — Bookings are never charged.** `apps/worker/src/data/index.ts` records `status='confirmed'` + totals with no Stripe call. Operators see paid-looking bookings with no money collected. **Fix (product decision):** Stripe Checkout/PaymentIntent at booking time (destination charge to the operator's Connect account, platform fee applied) — or explicitly label bookings "billed via monthly invoice."
- [ ] **B5 — Memberships are never billed.** Created `active` with `stripe_subscription_id: null` everywhere (invite accept, lead convert, import). **Fix (product decision):** Stripe Billing subscriptions on the operator's Connect account, or lean on invoices (B6) as the billing path.
- [ ] **B6 — Invoices aren't payable online.** `invoices/<id>/send` emails a link to `/tenant/bookings`; no payment link. **Fix:** attach a Stripe payment link / hosted invoice per send.

> B4–B6 are one coherent "money story" decision: pick per-booking charges,
> subscriptions, or invoice-first billing — then wire that one path well.

## 🟠 High — fake actions & numbers visible to real users

**Buttons that only toast (no persistence), reachable in live mode:**

- [ ] Operator Tenants → "Invite tenant" modal (`Tenants.tsx`) — should call the real invite path (exists in Leads convert)
- [ ] Operator Compliance → "Email reminders" (`Compliance.tsx`)
- [ ] Admin Users → "Suspend" (`Users.tsx`)
- [ ] Admin Kitchens → "Verify" (`Kitchens.tsx`) — no "(demo)" label at all
- [ ] Operator Onboarding → bulk "Send invitations" + provider "Connect" (`Onboarding.tsx`)
- [ ] Operator Integrations → connect/disconnect (`Integrations.tsx`)
- [ ] Admin Content → "Add resource" (`Content.tsx`)
- [ ] Tenant Marketing → "Export CSV" (`Marketing.tsx`)
- [ ] Tenant Community → "Contact maker" (`Community.tsx`)
- [ ] Tenant Grants → "Request intro" (`Grants.tsx`)
- [ ] Tenant Tools → co-packing form (`Tools.tsx`)
- [ ] StripeConnectPanel → "Link Stripe" demo toast

**Hardcoded stats rendered as if real:**

- [ ] Operator Overview `+12%` trend; Tenant Home `+8%` trend
- [ ] Operator Analytics: MRR `$6,900`, `+11%`, `+18%`, Retention `92%`
- [ ] Operator PeerNetwork: retention `92%`, `+11 vs cohort`
- [ ] Admin Overview: `128` makers, `412` bookings, `$5,600` fee revenue
- [ ] Admin Revenue: entire revenue breakdown is a hardcoded object

**Fix pattern:** compute from real data where cheap (trends from last-month vs
this-month), otherwise remove the number rather than fake it.

## 🟡 Medium

- [ ] **M1 — Purge endpoint in prod with known default token.** Guard confirmed (only `e2e+*` emails deletable), but set `ADMIN_PURGE_TOKEN` as a real secret anyway.
- [ ] **M2 — Email verification off.** One var: `EMAIL_VERIFICATION="on"` in `wrangler.jsonc` when ready (E2E rig would need its own bypass or the flag left off in a staging env).
- [ ] **M3 — JWT 30-day expiry, no revocation; PBKDF2 100k iterations** (OWASP suggests ~600k). Shorten TTL and/or bump iterations.
- [ ] **M5 — `EMAIL_REPLY_TO: gardener@thecros.app`** while sending from `no-reply@culina.life` — replies leave the brand. Point at a culina.life inbox.
- [ ] **M6 — Footer says `hello@culina.app`** (wrong TLD) and links no Terms.
- [ ] **Terms of Service page missing** (Privacy is real; ToS doesn't exist). Add `/terms` + footer link. Consider cookie note if analytics/replay are enabled.
- [ ] **Error monitoring off:** no `SENTRY_DSN` (worker) / `VITE_SENTRY_DSN` (client) set. Code no-ops without them — set both.
- [ ] **D1 backups:** rely on Cloudflare Time Travel (verify retention) or add a scheduled export. **R2 orphaning:** account deletion purges DB rows but not R2 objects.
- [ ] **White-label writes silently dropped:** `white_label_configs` absent from the server `WRITABLE` list, so the admin page saves nothing in live.
- [ ] **AccessControl event log** demo-only (`access_events` not writable).
- [ ] **GSC verification** token still commented in `index.html`; submit `sitemap.xml` after verifying.

## ✅ Confirmed solid

- Auth secret handling (D1-stored generated secret, no hardcoded fallback in prod).
- Storefront checkout is a real Stripe Connect destination-charge flow with
  server-side price recompute + webhook order confirmation (when keys are set).
- Privacy page has substantive content; robots/sitemap/llms/OG all live.
- Purge endpoint's `e2e+` email guard verified.
- Core operator/tenant flows (bookings, recipes, products, leads, invoices send,
  retention outreach, CRM) persist to D1 with optimistic concurrency.
- E2E suite (30 tests, desktop+mobile) green against production on every push.
