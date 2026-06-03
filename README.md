# Culina

**Where food businesses are born and grow.**

Culina is the all-in-one platform for shared commercial kitchens and the food
entrepreneurs inside them. It is priced radically low — free for makers, from
$19/mo for operators — and earns through a single, transparent **1.5%** fee on
transactions. We grow only when our community grows.

---

## ✨ What's in this build

A complete, **runnable** MVP across the whole product:

| Area | Status |
|---|---|
| Deep, animated marketing site (why / problem / solution / competitor comparison / pricing / mission) | ✅ |
| Auth + role-based routing (operator / maker / admin) with one-click demo logins | ✅ |
| **Operator dashboard** — overview, booking calendar, tenants, leads CRM (kanban), invoices, compliance grid, spaces & equipment, announcements, analytics, settings, payments | ✅ |
| **Maker dashboard** — home/milestones, book a space, bookings, documents, **Recipe & Food Cost Lab** (live COGS + AI advice + label generator), products, **AI storefront builder**, grant finder, learning hub + AI tutor, business tools suite, payments | ✅ |
| **Public** — Kitchen Discovery network, kitchen profiles + lead intake, tenant storefront with cart & checkout | ✅ |
| **Admin panel** — platform overview, kitchen registry, users, grant management, learning content | ✅ |
| Cloudflare **Worker API** — Claude AI proxy (7 endpoints) + Stripe Connect (Express) + webhooks | ✅ |
| Supabase schema + RLS + seed | ✅ |

> **Demo mode:** with no Supabase/Stripe/Anthropic secrets configured, the web
> app runs entirely on seeded mock data and simulated auth, and AI features fall
> back to realistic canned responses. This makes the whole product explorable
> with `npm install && npm run dev` — no accounts required.

---

## 🧱 Stack

- **Frontend:** React + TypeScript + Vite + Tailwind CSS + hand-rolled shadcn-style UI, React Router v6, Recharts, Sonner
- **API:** Cloudflare Workers (TypeScript) — AI proxy + Stripe
- **Database:** Supabase (PostgreSQL + Row Level Security)
- **Payments:** Stripe Connect (Express), flat 1.5% platform fee
- **AI:** Anthropic Claude via a Worker proxy (key never touches the browser)
- **Email:** Resend (transactional)

## 📦 Monorepo layout

```
culina/
├── apps/
│   ├── web/        # React + Vite app
│   └── worker/     # Cloudflare Worker API (AI proxy + Stripe)
├── packages/
│   └── shared/     # Types, constants, money/COGS utilities
├── supabase/
│   ├── migrations/ # 0001_init.sql (schema) + 0002_rls.sql (policies)
│   └── seed.sql
└── .github/workflows/deploy.yml
```

## 🚀 Getting started

```bash
npm install
npm run dev          # web app on http://localhost:5173  (demo mode)
npm run dev:worker   # API on http://localhost:8787       (optional)
```

Open the app, click **Log in**, and pick **Operator**, **Maker**, or **Admin**
to explore — no credentials needed in demo mode.

### Going live

1. **Supabase:** create a project, run `supabase/migrations/*.sql` then
   `seed.sql`. Set `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (web) — the app
   automatically leaves demo mode once these are present.
2. **Worker secrets:** `wrangler secret put ANTHROPIC_API_KEY` (and
   `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`).
3. **Deploy:** Cloudflare Pages builds the web app (`npm run build:web`, output
   `apps/web/dist`); `npm run build:worker` / `wrangler deploy` (or the GitHub
   Action) ships the API.

See `.env.example` and `apps/worker/.dev.vars.example` for the full variable list.

## 🔑 Demo accounts (when wired to Supabase)

| Role | Email | Password |
|---|---|---|
| Operator | `demo@operator.culina.app` | `demo1234` |
| Maker | `sara@tenant.culina.app` | `demo1234` |

## 💵 Fee transparency

Culina's 1.5% platform fee is computed in one place
(`packages/shared/src/money.ts`) and shown as an explicit line item everywhere
money moves — bookings, invoices, storefront checkout. Never hidden.

## 🖼️ Imagery & AI image generation (Flux)

Makers and operators can generate photography on demand with **Flux**
(`@cf/black-forest-labs/flux-1-schnell`) via **Cloudflare Workers AI** — no API
key, just the `[ai]` binding in `apps/worker/wrangler.toml`. The `AiImageButton`
appears in:

- Maker → **Products** (dish / menu / product shots)
- Maker → **Storefront builder** (hero image)
- Operator → **Spaces & Equipment** (station photos)
- Operator → **Settings** (kitchen / menu cover image)

Endpoint: `POST /api/ai/generate-image` `{ prompt, style }` → `{ image: dataUrl }`.
Prompts are always steered toward appetizing food/kitchen photography with no
people. In demo mode (no Worker) the button explains how to enable it instead of
failing.

Static marketing/storefront imagery is centralized in
`apps/web/src/lib/images.ts`. Every image renders through `<SmartImage>`, which
falls back to an on-brand gradient if a source fails — so swapping in your own
assets under `apps/web/public/img/` is always safe.

---

*Built with love for food entrepreneurs everywhere.*
