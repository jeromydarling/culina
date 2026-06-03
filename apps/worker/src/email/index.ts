import { type Env } from '../lib/http';

/** Send a transactional email via Resend. No-ops (logs) if no key configured. */
export async function sendEmail(env: Env, to: string, subject: string, html: string): Promise<boolean> {
  if (!env.RESEND_API_KEY) {
    console.log(`[email:noop] to=${to} subject="${subject}"`);
    return false;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env.RESEND_FROM_EMAIL || 'hello@culina.app', to, subject, html }),
  });
  return res.ok;
}
