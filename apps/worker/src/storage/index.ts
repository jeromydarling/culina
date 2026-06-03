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

/** GET /api/files/:key — stream a stored file back. */
export async function handleFile(key: string, env: Env): Promise<Response> {
  if (!env.STORAGE) return error('Storage not configured.', env, 503);
  const object = await env.STORAGE.get(decodeURIComponent(key));
  if (!object) return error('File not found', env, 404);
  const headers = new Headers(corsHeaders(env));
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('Cache-Control', 'private, max-age=3600');
  return new Response(object.body, { headers });
}
