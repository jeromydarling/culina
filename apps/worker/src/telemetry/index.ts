import { type Env, json } from '../lib/http';
import { authenticate } from '../auth';
import { uuid } from '../lib/crypto';

const clip = (s: unknown, n: number) => (typeof s === 'string' ? s.slice(0, n) : null);

/** Persist a captured error (client-reported or server-side). */
export async function logError(
  env: Env,
  source: 'client' | 'server',
  message: string,
  opts: { stack?: string; url?: string; userId?: string; incident?: string } = {},
): Promise<string> {
  const incident = opts.incident ?? uuid().slice(0, 8);
  // Always emit to Workers logs (picked up by observability) ...
  console.error(`[${source}] ${incident}: ${message}`, opts.stack ?? '');
  // ... and persist to D1 when available.
  if (env.DB) {
    try {
      await env.DB.prepare(
        'INSERT INTO error_logs (id, created_at, source, message, stack, url, user_id, incident) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      )
        .bind(uuid(), new Date().toISOString(), source, clip(message, 1000), clip(opts.stack ?? null, 4000), clip(opts.url ?? null, 500), opts.userId ?? null, incident)
        .run();
    } catch {
      /* never let logging throw */
    }
  }
  return incident;
}

/** POST /api/telemetry/error — accept a client error report. */
export async function handleTelemetry(request: Request, env: Env): Promise<Response> {
  const body: any = await request.json().catch(() => ({}));
  const who = await authenticate(request, env);
  const incident = await logError(env, 'client', String(body.message ?? 'Unknown client error'), {
    stack: body.stack,
    url: body.url,
    userId: who?.id,
  });
  return json({ ok: true, incident }, env);
}
