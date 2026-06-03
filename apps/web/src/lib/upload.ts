import { API_URL, isLive } from './config';
import { getToken } from './authApi';
import { reportError } from './telemetry';

export interface Uploaded {
  url: string;
  key?: string;
  demo?: boolean;
}

const safeName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);

/**
 * Upload a file to Cloudflare R2 via the Worker. In a demo session (no live
 * backend / token) we keep it local with an object URL so the sandbox still
 * shows the file — nothing is persisted.
 */
export async function uploadFile(file: File): Promise<Uploaded> {
  if (!isLive() || !getToken()) {
    return { url: URL.createObjectURL(file), demo: true };
  }
  try {
    const res = await fetch(`${API_URL}/api/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
        'X-Filename': safeName(file.name),
        Authorization: `Bearer ${getToken()}`,
      },
      body: file,
    });
    if (!res.ok) throw new Error(`Upload failed (${res.status})`);
    const data = (await res.json()) as { url: string; key: string };
    return { url: `${API_URL}${data.url}`, key: data.key };
  } catch (e) {
    reportError(e, { op: 'upload', name: file.name });
    throw e;
  }
}
