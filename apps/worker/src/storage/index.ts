import { type Env, json, error, corsHeaders } from '../lib/http';
import { authenticate } from '../auth';
import { uuid } from '../lib/crypto';

/** POST /api/upload — store a file in R2, return its key + retrieval URL. */
export async function handleUpload(request: Request, env: Env): Promise<Response> {
  if (!env.STORAGE) return error('Storage not configured (bind an R2 bucket named "culina-files").', env, 503);
  const profile = await authenticate(request, env);
  if (!profile) return error('Unauthorized', env, 401);

  const contentType = request.headers.get('Content-Type') || 'application/octet-stream';
  const filename = request.headers.get('X-Filename') || 'upload';
  const key = `${profile.id}/${uuid()}-${filename}`;

  await env.STORAGE.put(key, request.body, { httpMetadata: { contentType } });
  return json({ key, url: `/api/files/${encodeURIComponent(key)}` }, env);
}

function serve(object: R2ObjectBody, env: Env): Response {
  const headers = new Headers(corsHeaders(env));
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('Cache-Control', 'public, max-age=86400');
  return new Response(object.body, { headers });
}

/**
 * GET /api/files/:key — stream a stored file back.
 * Optional `?w=` resizes images on the fly via the Cloudflare Images binding
 * (when enabled), returning a lean WebP thumbnail; falls back to the original.
 */
export async function handleFile(key: string, env: Env, request: Request): Promise<Response> {
  if (!env.STORAGE) return error('Storage not configured.', env, 503);
  const decoded = decodeURIComponent(key);
  const w = Number(new URL(request.url).searchParams.get('w') || '');

  if (w > 0 && env.IMAGES) {
    try {
      const obj = await env.STORAGE.get(decoded);
      if (!obj) return error('File not found', env, 404);
      const ct = obj.httpMetadata?.contentType || '';
      if (ct.startsWith('image/')) {
        const result: any = await (env.IMAGES as any)
          .input(obj.body)
          .transform({ width: Math.min(2000, Math.max(32, w)) })
          .output({ format: 'image/webp', quality: 80 });
        const r: Response = result.response();
        const headers = new Headers(corsHeaders(env));
        headers.set('Content-Type', 'image/webp');
        headers.set('Cache-Control', 'public, max-age=86400');
        return new Response(r.body, { headers });
      }
      return serve(obj, env);
    } catch {
      /* fall through to original below */
    }
  }

  const object = await env.STORAGE.get(decoded);
  if (!object) return error('File not found', env, 404);
  return serve(object, env);
}
