import { type Env, json, error } from '../lib/http';
import { PLATFORM_FEE_PERCENT } from '@culina/shared';

/** Encode a flat/nested object as application/x-www-form-urlencoded for the Stripe API. */
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
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form(params),
  });
  const data = await res.json();
  if (!res.ok) throw new Error((data as any)?.error?.message ?? 'Stripe error');
  return data;
}

function feeCents(amountCents: number, env: Env): number {
  const pct = Number(env.STRIPE_PLATFORM_FEE_PERCENT ?? PLATFORM_FEE_PERCENT);
  return Math.round(amountCents * (pct / 100));
}

export async function handleStripe(action: string, request: Request, env: Env): Promise<Response> {
  if (!env.STRIPE_SECRET_KEY && action !== 'webhooks') {
    return json({ demo: true, note: 'STRIPE_SECRET_KEY not configured on the worker.' }, env);
  }
  const body: any = await request.json().catch(() => ({}));

  try {
    switch (action) {
      case 'connect/create-account': {
        const account = await stripe(env, 'accounts', {
          type: 'express',
          email: body.email,
          capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
        });
        return json({ account_id: account.id }, env);
      }

      case 'connect/create-account-link': {
        const link = await stripe(env, 'account_links', {
          account: body.account_id,
          refresh_url: body.refresh_url,
          return_url: body.return_url,
          type: 'account_onboarding',
        });
        return json({ url: link.url }, env);
      }

      case 'create-payment-intent': {
        // Direct charge on platform with destination transfer + application fee.
        const amount = Number(body.amount_cents);
        const pi = await stripe(env, 'payment_intents', {
          amount,
          currency: 'usd',
          application_fee_amount: feeCents(amount, env),
          transfer_data: { destination: body.connected_account_id },
          metadata: { booking_id: body.booking_id ?? '', order_id: body.order_id ?? '' },
        });
        return json({ client_secret: pi.client_secret, id: pi.id }, env);
      }

      case 'create-checkout-session': {
        const amount = Number(body.amount_cents);
        const session = await stripe(env, 'checkout/sessions', {
          mode: 'payment',
          success_url: body.success_url,
          cancel_url: body.cancel_url,
          'line_items[0]': {
            quantity: 1,
            price_data: { currency: 'usd', unit_amount: amount, product_data: { name: body.description ?? 'Order' } },
          },
          payment_intent_data: {
            application_fee_amount: feeCents(amount, env),
            transfer_data: { destination: body.connected_account_id },
          },
        });
        return json({ url: session.url, id: session.id }, env);
      }

      case 'create-subscription': {
        const sub = await stripe(env, 'subscriptions', {
          customer: body.customer_id,
          'items[0]': { price: body.price_id },
          application_fee_percent: Number(env.STRIPE_PLATFORM_FEE_PERCENT ?? PLATFORM_FEE_PERCENT),
          transfer_data: { destination: body.connected_account_id },
        });
        return json({ subscription_id: sub.id, status: sub.status }, env);
      }

      case 'webhooks':
        return handleWebhook(request, env);

      default:
        return error(`Unknown Stripe action: ${action}`, env, 404);
    }
  } catch (e) {
    return error((e as Error).message, env, 502);
  }
}

/**
 * Stripe webhook receiver. In production, verify the signature with
 * STRIPE_WEBHOOK_SECRET (HMAC-SHA256 over `${timestamp}.${payload}`) before
 * acting on events. We parse and route the key events Culina cares about.
 */
async function handleWebhook(request: Request, env: Env): Promise<Response> {
  const payload = await request.text();
  let event: any;
  try {
    event = JSON.parse(payload);
  } catch {
    return error('Invalid payload', env, 400);
  }

  // NOTE: signature verification omitted in this scaffold — add HMAC check here.
  switch (event.type) {
    case 'payment_intent.succeeded':
      // → mark booking/order paid in Supabase
      break;
    case 'payment_intent.payment_failed':
      // → notify tenant, queue retry
      break;
    case 'invoice.paid':
      // → mark invoice paid
      break;
    case 'invoice.payment_failed':
      // → notify operator + tenant
      break;
    case 'account.updated':
      // → update stripe_onboarded based on charges_enabled/payouts_enabled
      break;
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      // → sync membership/order subscription status
      break;
    default:
      break;
  }
  return json({ received: true, type: event.type }, env);
}
