import { API_URL } from './config';
import { getToken } from './authApi';

/** Fire-and-forget error report to the Worker telemetry sink. */
export function reportError(error: unknown, context?: Record<string, unknown>) {
  try {
    const err = error as { message?: string; stack?: string };
    void fetch(`${API_URL}/api/telemetry/error`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      },
      body: JSON.stringify({
        message: err?.message ?? String(error),
        stack: err?.stack,
        url: typeof location !== 'undefined' ? location.href : undefined,
        context,
      }),
    }).catch(() => {});
  } catch {
    /* never throw from the reporter */
  }
}

/** Capture otherwise-unhandled errors so nothing fails silently. */
export function initTelemetry() {
  if (typeof window === 'undefined') return;
  window.addEventListener('error', (e) => reportError(e.error ?? e.message, { kind: 'window.onerror' }));
  window.addEventListener('unhandledrejection', (e) => reportError(e.reason, { kind: 'unhandledrejection' }));
}
