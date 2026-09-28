export function normalizeConnectSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
}

export function calculateConnectCTR(totalViews: number, totalClicks: number): number {
  if (totalViews <= 0) return 0;
  return Number(((totalClicks / totalViews) * 100).toFixed(1));
}

export const CONNECT_GALLERY_MAX_IMAGES = 30;

const IMAGE_URL_PATTERN = /^https?:\/\/\S+$/i;

/**
 * Normalizes arbitrary jsonb input into a clean, de-duplicated list of
 * absolute image URLs. Tolerates legacy values that are objects (e.g.
 * `{ url, path }` or `{ path }`) as well as a bare storage path.
 */
export function normalizeGalleryImages(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const result: string[] = [];

  for (const entry of value) {
    let raw = '';

    if (typeof entry === 'string') {
      raw = entry.trim();
    } else if (entry && typeof entry === 'object') {
      const obj = entry as Record<string, unknown>;
      const url = typeof obj.url === 'string' ? obj.url : '';
      const path = typeof obj.path === 'string' ? obj.path : '';
      raw = (url || path).trim();
    }

    if (!raw) continue;
    if (raw.startsWith('/') && !raw.startsWith('//')) {
      raw = `/storage/v1/object/public/business-assets${raw.startsWith('/businesses') ? raw : ''}`;
    }

    if (!IMAGE_URL_PATTERN.test(raw)) continue;
    if (seen.has(raw)) continue;

    seen.add(raw);
    result.push(raw);

    if (result.length >= CONNECT_GALLERY_MAX_IMAGES) break;
  }

  return result;
}

export function normalizeGalleryFeaturedUrl(value: unknown, images: string[]): string {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return '';
  if (images.includes(raw)) return raw;

  // Featured image was removed from the list - clear the stale reference.
  return '';
}

/**
 * Length budgets. These are the single source of truth shared by the admin form
 * (`maxLength`), the write normalizers, and the database CHECK constraints, so a
 * value can never be accepted by the form and then rejected by Postgres.
 */
export const CONNECT_DESCRIPTION_MAX = 300;
export const CONNECT_BOTTOM_TAGLINE_MAX = 80;
export const CONNECT_BOTTOM_BUTTON_MAX = 60;
export const CONNECT_ADDRESS_MAX = 200;
export const CONNECT_EMAIL_MAX = 254;
export const CONNECT_CATEGORY_MAX = 60;
export const CONNECT_PHONE_MAX = 40;

/**
 * Phone-like fields keep whatever formatting the admin typed (spaces, dashes,
 * parentheses) because that is how they expect to read it, but the length is
 * capped and the common unicode dashes are normalised so `tel:` links work.
 */
export function normalizeConnectPhone(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/[\u00a0\u2007\u202f]/g, ' ')
    .trim()
    .slice(0, CONNECT_PHONE_MAX);
}

export function normalizeConnectText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

export function normalizeConnectEmail(value: unknown): string {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (!trimmed) return '';
  if (trimmed.length > CONNECT_EMAIL_MAX) return '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return '';
  return trimmed;
}

export function normalizeConnectAddress(value: unknown): string {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return '';
  return raw.slice(0, CONNECT_ADDRESS_MAX);
}

const CONNECT_BUSINESS_FIELDS = [
  'id',
  'name',
  'slug',
  'logo_url',
  'cover_image_url',
  'description',
  'whatsapp_number',
  'instagram_handle',
  'facebook_url',
  'tiktok_handle',
  'youtube_url',
  'google_maps_url',
  'phone',
  'website_url',
  'gallery_images',
  'gallery_featured_url',
  'theme_color',
  'email',
  'address',
  'bottom_tagline',
  'bottom_button_text',
  'category',
  'second_phone',
  'office_phone',
  'fax',
  'is_active',
  'links',
] as const;

/**
 * Single source of truth for which request-body keys reach the database layer.
 *
 * The admin routes used to destructure and re-forward fields by hand, which is
 * how `id` and `youtube_url` silently went missing from create. Routes now pull
 * from this list instead, so adding a field to `CreateConnectBusinessInput` only
 * has to be done in one place.
 */
export function pickConnectBusinessFields(body: unknown): Record<string, unknown> {
  const source = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const picked: Record<string, unknown> = {};

  for (const field of CONNECT_BUSINESS_FIELDS) {
    if (field in source) picked[field] = source[field];
  }

  return picked;
}
