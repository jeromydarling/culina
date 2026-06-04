import { type Env } from '../lib/http';

const DEFAULT_FROM = 'no-reply@culina.life';

/**
 * Send a transactional email.
 *
 * Transport priority:
 *   1. Cloudflare Email Service (the `EMAIL` send_email binding) — native.
 *   2. Resend (if RESEND_API_KEY is set) — fallback.
 *   3. No-op (logs only) — so demo/unconfigured environments never error.
 */
export async function sendEmail(env: Env, to: string, subject: string, html: string, text?: string): Promise<boolean> {
  const from = env.EMAIL_FROM || DEFAULT_FROM;
  const replyTo = env.EMAIL_REPLY_TO || undefined;
  const plain = text ?? htmlToText(html);

  // 1) Cloudflare Email Service binding
  if (env.EMAIL?.send) {
    try {
      await env.EMAIL.send({
        to,
        from: { email: from, name: 'Culina' },
        subject,
        html,
        text: plain,
        ...(replyTo ? { replyTo } : {}),
      });
      return true;
    } catch (e) {
      console.error(`[email:cf] failed to=${to} subject="${subject}": ${(e as Error).message}`);
      // fall through to the next transport
    }
  }

  // 2) Resend fallback
  if (env.RESEND_API_KEY) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env.RESEND_FROM_EMAIL || from, to, subject, html, text: plain, ...(replyTo ? { reply_to: replyTo } : {}) }),
    });
    return res.ok;
  }

  // 3) No-op
  console.log(`[email:noop] to=${to} subject="${subject}"`);
  return false;
}

/** Naive HTML→text for the plain-text part (improves deliverability). */
function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

/* ─────────────────────────── Branded templates ─────────────────────────── */

/** Wrap body content in a responsive, on-brand Culina email shell. */
export function emailLayout(opts: { heading: string; intro: string; ctaText?: string; ctaUrl?: string; outro?: string }): string {
  const { heading, intro, ctaText, ctaUrl, outro } = opts;
  const button =
    ctaText && ctaUrl
      ? `<tr><td style="padding:8px 0 24px"><a href="${ctaUrl}" style="display:inline-block;background:#2D4A3E;color:#F5E6C8;text-decoration:none;font-weight:600;font-size:15px;padding:13px 26px;border-radius:8px">${ctaText}</a></td></tr>`
      : '';
  const fallback =
    ctaUrl ? `<tr><td style="padding:0 0 8px;color:#6B7280;font-size:12px;line-height:1.6">If the button doesn’t work, copy and paste this link:<br/><a href="${ctaUrl}" style="color:#2D4A3E;word-break:break-all">${ctaUrl}</a></td></tr>` : '';
  const outroHtml = outro ? `<tr><td style="padding:4px 0 0;color:#6B7280;font-size:13px;line-height:1.6">${outro}</td></tr>` : '';
  return `<!doctype html><html><body style="margin:0;background:#F8F9FA;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F8F9FA;padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.06)">
        <tr><td style="background:#2D4A3E;padding:22px 28px">
          <span style="font-family:Georgia,serif;color:#F5E6C8;font-size:22px;font-weight:700;letter-spacing:.3px">Culina</span>
        </td></tr>
        <tr><td style="padding:28px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="font-family:Georgia,serif;color:#1A1A1A;font-size:22px;font-weight:700;padding:0 0 12px">${heading}</td></tr>
            <tr><td style="color:#374151;font-size:15px;line-height:1.7;padding:0 0 20px">${intro}</td></tr>
            ${button}
            ${fallback}
            ${outroHtml}
          </table>
        </td></tr>
        <tr><td style="padding:18px 28px;border-top:1px solid #eee;color:#9CA3AF;font-size:12px;line-height:1.6">
          You’re receiving this because of activity on your Culina account.<br/>
          Culina — tools for shared kitchens and the makers inside them.
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
}

export const templates = {
  welcomeVerify: (name: string | null, verifyUrl: string) =>
    emailLayout({
      heading: `Welcome to Culina${name ? `, ${escapeHtml(name.split(' ')[0])}` : ''}!`,
      intro: 'We’re glad you’re here. Confirm your email address to secure your account and unlock everything Culina has to offer — booking, storefronts, compliance, and growth tools built for the whole kitchen circle.',
      ctaText: 'Confirm my email',
      ctaUrl: verifyUrl,
      outro: 'This link expires in 24 hours. If you didn’t create a Culina account, you can safely ignore this email.',
    }),
  verify: (verifyUrl: string) =>
    emailLayout({
      heading: 'Confirm your email',
      intro: 'Please confirm your email address to finish securing your Culina account.',
      ctaText: 'Confirm my email',
      ctaUrl: verifyUrl,
      outro: 'This link expires in 24 hours.',
    }),
  reset: (resetUrl: string) =>
    emailLayout({
      heading: 'Reset your password',
      intro: 'We received a request to reset the password for your Culina account. Click below to choose a new one.',
      ctaText: 'Reset my password',
      ctaUrl: resetUrl,
      outro: 'This link expires in 1 hour. If you didn’t request a reset, you can safely ignore this email — your password won’t change.',
    }),
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
