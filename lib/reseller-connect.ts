/** Reseller cards carry at most 6 gallery photos (free-tier storage). */
export const RESELLER_MAX_GALLERY = 6;

/**
 * Checks for a reseller's Connect payload (the same fields as the admin form).
 * Images must be the reseller's own uploads, and the gallery is capped.
 */
export function checkResellerImages(fields: Record<string, unknown>, imagePrefix: string): string | null {
  const single = ['logo_url', 'cover_image_url', 'gallery_featured_url']
    .map((k) => fields[k])
    .filter((v): v is string => typeof v === 'string' && v.trim() !== '');
  const gallery = Array.isArray(fields.gallery_images)
    ? fields.gallery_images.filter((v): v is string => typeof v === 'string' && v.trim() !== '')
    : [];
  if (gallery.length > RESELLER_MAX_GALLERY) return `A card can have up to ${RESELLER_MAX_GALLERY} photos.`;
  if ([...single, ...gallery].some((url) => !url.startsWith(imagePrefix))) {
    return 'Please upload the images again.';
  }
  return null;
}

/** Every image URL a Connect row points to. */
export function connectImageUrls(row: {
  logo_url?: string | null;
  cover_image_url?: string | null;
  gallery_images?: unknown;
}): string[] {
  const gallery = Array.isArray(row.gallery_images) ? (row.gallery_images as string[]) : [];
  return [row.logo_url || '', row.cover_image_url || '', ...gallery].filter(Boolean);
}
