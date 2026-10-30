'use client';

/**
 * Shrinks an image in the browser before upload (free-tier storage):
 * longest side capped, re-encoded as WebP (JPEG where the browser cannot
 * encode WebP). A 4 MB phone photo typically lands at 100–250 KB.
 */
export async function compressImage(file: File, maxSide: number, maxBytes = 1.4 * 1024 * 1024): Promise<File> {
  const source = await loadImage(file);
  const scale = Math.min(1, maxSide / Math.max(source.width, source.height));
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This browser cannot process images.');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, width, height);
  if ('close' in source) source.close();

  for (const quality of [0.82, 0.7, 0.55, 0.4]) {
    let blob = await toBlob(canvas, 'image/webp', quality);
    if (!blob || blob.type !== 'image/webp') blob = await toBlob(canvas, 'image/jpeg', quality);
    if (blob && blob.size <= maxBytes) {
      const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
      return new File([blob], `${file.name.replace(/\.[^.]+$/, '') || 'image'}.${ext}`, { type: blob.type });
    }
  }
  throw new Error('This image is too large. Try a smaller photo.');
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

async function loadImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file);
    } catch {
      // fall through (older Safari, some HEIC files)
    }
  }
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('This file is not an image the browser can read. Use JPG or PNG.'));
      img.src = url;
    });
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
