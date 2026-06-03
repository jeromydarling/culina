/**
 * Downscale + recompress an image in the browser before upload, so we never
 * push huge originals to R2. Non-images (and gif/svg) pass through untouched.
 */
export async function processImage(file: File, maxDim = 1600, quality = 0.82): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml') return file;
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file; // can't decode → upload as-is
  }
  const { width, height } = bitmap;
  const scale = Math.min(1, maxDim / Math.max(width, height));
  // Already small enough — don't bother re-encoding.
  if (scale >= 1 && file.size < 500_000) {
    bitmap.close?.();
    return file;
  }
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close?.();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', quality));
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
}

/** Max accepted upload size (before client resize), to protect memory + R2. */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
