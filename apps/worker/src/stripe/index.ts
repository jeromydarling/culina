import { type Env, json, error } from '../lib/http';
import { authenticate } from '../auth';
import { uuid } from '../lib/crypto';
import { sendEmail } from '../email';
import { PLATFORM_FEE_PERCENT } from '@culina/shared';

const enc = new TextEncoder();

/** Encode a (possibly nested) object as application/x-www-form-urlencoded for Stripe. */
function form(params: Record<string, unknown>, prefix = ''): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === 'object') parts.push(form(v as Record<string, unknown>, key));
    else parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`);
  }
  return parts.filter(Boolean).join('&');
}

async function stripe(env: Env, path: string, params: Record<string, unknown>): Promise<any> {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form(params),
  });
  const data = await res.json();
  if (!res.ok) throw new Error((data as any)?.error?.message ?? 'Stripe error');
  return data;
}

const feeCents = (amount: number, env: Env) =>
  Math.round(amount * (Number(env.STRIPE_PLATFORM_FEE_PERCENT ?? PLATFORM_FEE_PERCENT) / 100));

const origin = (request: Request) => new URL(request.url).origin;

export async function handleStripe(action: string, request: Request, env: Env): Promise<Response> {
  if (action === 'webhooks') return handleWebhook(request, env);

  if (!env.STRIPE_SECRET_KEY) {
    // No keys yet → tell the client to use its simulated fallback.
    return json({ demo: true, note: 'STRIPE_SECRET_KEY not configured on the worker.' }, env);
  }

  // ── Connect onboarding (operator or maker) ──────────────────────────────
  if (action === 'connect/start') {
    const profile = await authenticate(request, env);
    if (!profile || !env.DB) return error('Unauthorized', env, 401);
    const body: any = await request.json().catch(() => ({}));

    // Where the connected-account id lives depends on the role.
    let accountId: string | null = null;
    let entity: { table: string; idCol: string; id: string } | null = null;
    if (profile.role === 'operator') {
      const k = await env.DB.prepare('SELECT id, stripe_account_id FROM kitchens WHERE operator_id = ? LIMIT 1').bind(profile.id).first<any>();
      if (!k) return error('No kitchen found', env, 400);
      accountId = k.stripe_account_id;
      entity = { table: 'kitchens', idCol: 'id', id: k.id };
    } else {
      const tp = await env.DB.prepare('SELECT id, stripe_account_id FROM tenant_profiles WHERE tenant_id = ? LIMIT 1').bind(profile.id).first<any>();
      if (!tp) return error('No business profile found', env, 400);
      accountId = tp.stripe_account_id;
      entity = { table: 'tenant_profiles', idCol: 'id', id: tp.id };
    }

    if (!accountId) {
      const account = await stripe(env, 'accounts', {
        type: 'express',
        email: profile.email,
        capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
        business_type: 'individual',
      });
      accountId = account.id;
      await env.DB.prepare(`UPDATE ${entity.table} SET stripe_account_id = ? WHERE ${entity.idCol} = ?`).bind(accountId, entity.id).run();
    }

    const link = await stripe(env, 'account_links', {
      account: accountId,
      refresh_url: body.return_url || `${origin(request)}/`,
      return_url: body.return_url || `${origin(request)}/`,
      type: 'account_onboarding',
    });
    return json({ url: link.url, account_id: accountId }, env);
  }

  // ── Storefront checkout (customer → maker, with platform fee) ────────────
  if (action === 'checkout') {
    if (!env.DB) return error('Database not configured', env, 503);
    const body: any = await request.json().catch(() => ({}));
    const slug: string = body.slug;
    const items: { product_id: string; qty: number }[] = Array.isArray(body.items) ? body.items : [];
    const tp = await env.DB.prepare('SELECT tenant_id, business_name, stripe_account_id, stripe_onboarded FROM tenant_profiles WHERE business_slug = ?').bind(slug).first<any>();
    if (!tp) return error('Shop not found', env, 404);
    if (!tp.stripe_account_id || !tp.stripe_onboarded) return error('This shop isn’t accepting online payments yet.', env, 400);

    // Recompute every price server-side from the catalog (never trust the client).
    const lineItems: Record<string, unknown> = {};
    let subtotal = 0;
    let i = 0;
    const orderItems: any[] = [];
    for (const it of items) {
      const p = await env.DB.prepare('SELECT name, price_cents FROM products WHERE id = ? AND tenant_id = ? AND is_active = 1').bind(it.product_id, tp.tenant_id).first<any>();
      if (!p) continue;
      const qty = Math.max(1, Math.min(99, Number(it.qty) || 1));
      subtotal += p.price_cents * qty;
      orderItems.push({ product_id: it.product_id, name: p.name, qty, price_cents: p.price_cents });
      lineItems[`line_items[${i}]`] = { quantity: qty, price_data: { currency: 'usd', unit_amount: p.price_cents, product_data: { name: p.name } } };
      i += 1;
    }
    if (subtotal <= 0) return error('Cart is empty', env, 400);

    const orderId = uuid();
    const orderNumber = `CL-${Date.now().toString(36).toUpperCase()}`;
    const session = await stripe(env, 'checkout/sessions', {
      mode: 'payment',
      success_url: `${origin(request)}/shop/${slug}?paid=1`,
      cancel_url: `${origin(request)}/shop/${slug}?canceled=1`,
      ...lineItems,
      // on_behalf_of moves chargeback/dispute liability to the maker's
      // connected account. Without it, destination charges keep liability
      // on the Culina platform by default. Federation policy is
      // "connected account owns disputes" across all marketplace apps.
      payment_intent_data: {
        application_fee_amount: feeCents(subtotal, env),
        transfer_data: { destination: tp.stripe_account_id },
        on_behalf_of: tp.stripe_account_id,
      },
      metadata: { order_id: orderId, tenant_id: tp.tenant_id, slug },
    });

    // Record a pending order; the webhook marks it paid.
    const now = new Date().toISOString();
    await env.DB.prepare(
      `INSERT INTO orders (id, tenant_id, customer_email, order_number, items, subtotal_cents, platform_fee_cents, total_cents, status, fulfillment_type, stripe_payment_intent_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pickup', ?, ?)`,
    ).bind(orderId, tp.tenant_id, body.email ?? 'guest@culina.app', orderNumber, JSON.stringify(orderItems), subtotal, feeCents(subtotal, env), subtotal, session.id, now).run();

    return json({ url: session.url }, env);
  }

  return error(`Unknown Stripe action: ${action}`, env, 404);
}

/** Verify Stripe's `Stripe-Signature` header (HMAC-SHA256 over `${t}.${payload}`). */
async function verifySignature(payload: string, header: string | null, secret: string): Promise<boolean> {
  if (!header) return false;
  const parts: Record<string, string> = {};
  for (const kv of header.split(',')) {
    const [k, v] = kv.split('=');
    if (k && v) parts[k.trim()] = v.trim();
  }
  if (!parts.t || !parts.v1) return false;
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(`${parts.t}.${payload}`));
  const hex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
  if (hex.length !== parts.v1.length) return false;
  let diff = 0;
  for (let j = 0; j < hex.length; j++) diff |= hex.charCodeAt(j) ^ parts.v1.charCodeAt(j);
  return diff === 0;
}

async function handleWebhook(request: Request, env: Env): Promise<Response> {
  const payload = await request.text();
  // Same URL serves both the platform webhook and the Connect webhook (events
  // from connected accounts). Each endpoint has its own signing secret, so we
  // try the platform secret first and fall back to the Connect secret.
  const sigHeader = request.headers.get('Stripe-Signature');
  const secrets = [env.STRIPE_WEBHOOK_SECRET, env.STRIPE_CONNECT_WEBHOOK_SECRET].filter(Boolean) as string[];
  if (secrets.length > 0) {
    let verified = false;
    for (const s of secrets) {
      if (await verifySignature(payload, sigHeader, s)) { verified = true; break; }
    }
    if (!verified) return error('Invalid signature', env, 400);
  }
  let event: any;
  try {
    event = JSON.parse(payload);
  } catch {
    return error('Invalid payload', env, 400);
  }
  const obj = event?.data?.object ?? {};

  if (env.DB) {
    switch (event.type) {
      case 'account.updated': {
        const onboarded = obj.charges_enabled ? 1 : 0;
        await env.DB.prepare('UPDATE kitchens SET stripe_onboarded = ? WHERE stripe_account_id = ?').bind(onboarded, obj.id).run();
        await env.DB.prepare('UPDATE tenant_profiles SET stripe_onboarded = ? WHERE stripe_account_id = ?').bind(onboarded, obj.id).run();
        break;
      }
      case 'checkout.session.completed': {
        const orderId = obj.metadata?.order_id;
        if (orderId) {
          await env.DB.prepare("UPDATE orders SET status = 'confirmed', customer_email = COALESCE(?, customer_email), stripe_payment_intent_id = ? WHERE id = ?")
            .bind(obj.customer_details?.email ?? null, obj.payment_intent ?? null, orderId).run();
          const tenant = obj.metadata?.tenant_id;
          if (tenant) {
            await env.DB.prepare('INSERT INTO notifications (id, user_id, title, body, type, is_read, action_url, created_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?)')
              .bind(uuid(), tenant, 'New order!', 'You received a paid storefront order.', 'order', '/tenant/products', new Date().toISOString()).run();
          }
          // Confirmation email to the customer (no-op without RESEND_API_KEY).
          const custEmail = obj.customer_details?.email;
          if (custEmail) {
            const total = obj.amount_total ? `$${(obj.amount_total / 100).toFixed(2)}` : '';
            await sendEmail(env, custEmail, 'Your Culina order is confirmed 🎉',
              `<p>Thanks for your order${total ? ` of ${total}` : ''}!</p><p>The maker has been notified and will follow up about pickup or delivery. We appreciate you supporting a small food business.</p>`);
          }
        }
        break;
      }
      case 'payment_intent.payment_failed':
        // Surface to the maker if we can map it; non-fatal.
        break;
      case 'charge.refunded': {
        // Destination-charge refunds (with reverse_transfer=true on the
        // refund call) reverse the maker's transfer. Mirror status on the
        // matching order so the maker sees it in their dashboard.
        const piId = obj.payment_intent ? String(obj.payment_intent) : null;
        if (piId) {
          const amount = Number(obj.amount ?? 0);
          const amountRefunded = Number(obj.amount_refunded ?? 0);
          const fully = amount > 0 && amountRefunded >= amount;
          const newStatus = fully ? 'refunded' : 'partially_refunded';
          await env.DB.prepare('UPDATE orders SET status = ? WHERE stripe_payment_intent_id = ?').bind(newStatus, piId).run();
          const row = await env.DB.prepare('SELECT id, tenant_id, order_number FROM orders WHERE stripe_payment_intent_id = ? LIMIT 1').bind(piId).first<any>();
          if (row?.tenant_id) {
            await env.DB.prepare('INSERT INTO notifications (id, user_id, title, body, type, is_read, action_url, created_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?)')
              .bind(uuid(), row.tenant_id, fully ? 'Order refunded' : 'Order partially refunded',
                `Order ${row.order_number}: $${(amountRefunded / 100).toFixed(2)} refunded to the customer. The transfer to your account has been reversed.`,
                'order', '/tenant/orders', new Date().toISOString()).run();
          }
        }
        break;
      }
      case 'charge.dispute.created':
      case 'charge.dispute.updated':
      case 'charge.dispute.closed': {
        // With on_behalf_of set on the charge, the maker's connected
        // account bears chargeback liability — but Culina still wants
        // visibility so support can help makers respond before the
        // response_due_by deadline. Mark the order, notify the maker.
        const piId = obj.payment_intent ? String(obj.payment_intent) : null;
        const status = String(obj.status ?? '');
        let orderStatus: string | null = null;
        if (event.type === 'charge.dispute.created') orderStatus = 'disputed';
        else if (event.type === 'charge.dispute.closed') {
          orderStatus = status === 'won' ? 'dispute_won' : status === 'lost' ? 'dispute_lost' : 'disputed';
        }
        if (piId && orderStatus) {
          await env.DB.prepare('UPDATE orders SET status = ? WHERE stripe_payment_intent_id = ?').bind(orderStatus, piId).run();
        }
        if (piId) {
          const row = await env.DB.prepare('SELECT id, tenant_id, order_number FROM orders WHERE stripe_payment_intent_id = ? LIMIT 1').bind(piId).first<any>();
          if (row?.tenant_id) {
            const amount = Number(obj.amount ?? 0);
            const reason = String(obj.reason ?? 'unspecified');
            const title = event.type === 'charge.dispute.created'
              ? 'Dispute opened on an order'
              : event.type === 'charge.dispute.closed'
                ? `Dispute ${status}`
                : 'Dispute updated';
            await env.DB.prepare('INSERT INTO notifications (id, user_id, title, body, type, is_read, action_url, created_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?)')
              .bind(uuid(), row.tenant_id, title,
                `Order ${row.order_number}: $${(amount / 100).toFixed(2)} — reason: ${reason}. Check your Stripe dashboard to respond.`,
                'dispute', '/tenant/orders', new Date().toISOString()).run();
          }
        }
        break;
      }
      case 'payout.failed': {
        // The connected account's payout to their bank failed. Stripe
        // shows it in their dashboard; we add an in-app notification so
        // they don't miss it. Account id is on event.account.
        const accountId = event.account ? String(event.account) : null;
        if (accountId) {
          const kitchen = await env.DB.prepare('SELECT id, operator_id FROM kitchens WHERE stripe_account_id = ? LIMIT 1').bind(accountId).first<any>();
          const tp = await env.DB.prepare('SELECT tenant_id FROM tenant_profiles WHERE stripe_account_id = ? LIMIT 1').bind(accountId).first<any>();
          const recipient = kitchen?.operator_id ?? tp?.tenant_id;
          if (recipient) {
            const amount = Number(obj.amount ?? 0);
            const failureMessage = String(obj.failure_message ?? obj.failure_code ?? 'unknown reason');
            await env.DB.prepare('INSERT INTO notifications (id, user_id, title, body, type, is_read, action_url, created_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?)')
              .bind(uuid(), recipient, 'Stripe payout failed',
                `Your $${(amount / 100).toFixed(2)} payout did not arrive: ${failureMessage}. Update your bank account in Stripe to retry.`,
                'payout_failed', '/tenant/payouts', new Date().toISOString()).run();
          }
        }
        break;
      }
      default:
        break;
    }
  }
  return json({ received: true, type: event.type }, env);
}
