import { toast } from 'sonner';
import { reportError } from './telemetry';

export const SUPPORT_EMAIL = 'support@culina.app';

export function openSupport(subject = 'I need help with Culina', body = '') {
  const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}${body ? `&body=${encodeURIComponent(body)}` : ''}`;
  if (typeof window !== 'undefined') window.location.href = url;
}

/** Translate any error into a calm, human sentence. */
export function humanError(error: unknown): string {
  const msg = (error as Error)?.message ?? String(error ?? '');
  const m = msg.toLowerCase();
  if (m.includes('billing_not_configured')) return "Online payment isn't set up here yet, so this couldn't go through. No card was charged — please contact the kitchen or maker directly.";
  if (m.includes('conflict') || m.includes('changed in another')) return 'This was just changed in another session. We refreshed to the latest — please re-apply your change.';
  if (m.includes('already booked') || m.includes('overlapping')) return 'That space is already booked for an overlapping time. Pick another slot.';
  if (m.includes('compliance') || m.includes('expired')) return 'A required compliance document is expired, so this is blocked. Update your documents first.';
  if (m.includes('daily ai limit')) return "You've reached today's AI limit. It resets tomorrow — or sign in for a higher limit.";
  if (m.includes('unauthorized') || m.includes('401')) return 'Your session expired. Please log in again.';
  if (m.includes('forbidden') || m.includes('permission') || m.includes('403')) return "You don't have permission to do that.";
  if (m.includes('failed to fetch') || m.includes('networkerror') || m.includes('load failed')) return "We couldn't reach the server. Check your connection and try again.";
  if (msg && msg.length < 140) return msg; // server already returned something human
  return 'Something went wrong. Please try again.';
}

/**
 * Show a human error toast with a one-tap path to support, and log it.
 */
export function notifyError(error: unknown, context?: Record<string, unknown>) {
  reportError(error, context);
  toast.error(humanError(error), {
    description: 'Still stuck? We’re here to help.',
    action: { label: 'Get help', onClick: () => openSupport('Help with Culina', `What I was doing:\n\nError: ${(error as Error)?.message ?? error}`) },
    duration: 8000,
  });
}
