import { API_URL, isLive } from './config';
import { getToken } from './authApi';
import { reportError } from './telemetry';
import { processImage, MAX_UPLOAD_BYTES } from './image';

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
export async function uploadFile(rawFile: File): Promise<Uploaded> {
  if (rawFile.size > MAX_UPLOAD_BYTES) {
    throw new Error(`That file is too large (max ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB).`);
  }
  // Shrink/recompress images client-side so R2 only ever holds lean files.
  const file = await processImage(rawFile);

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
