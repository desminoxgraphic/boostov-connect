/**
 * Input rules for resellers and their merchants. Pure functions, unit tested.
 * The database enforces the same limits again (triggers + RLS); these exist to
 * give a clear message before a request ever reaches it.
 */

export type MerchantProduct = 'connect' | 'grow';

export const DEFAULT_MERCHANT_LIMIT = 10;
export const MAX_MERCHANT_LIMIT = 1000;
export const MAX_GALLERY_IMAGES = 6;
export const MAX_UPLOAD_BYTES = 1.5 * 1024 * 1024;
export const UPLOAD_MIME_TYPES = ['image/webp', 'image/jpeg', 'image/png'] as const;

export function validatePassword(password: string): string | null {
  if (password.length < 10) return 'Use at least 10 characters.';
  if (password.length > 72) return 'Use 72 characters or fewer.';
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) return 'Use letters and at least one number.';
  return null;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export interface ResellerInput {
  name: string;
  email: string;
  phone: string;
  merchant_limit: number;
  grow_enabled: boolean;
}

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

function str(value: unknown, max = 200): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export function parseMerchantLimit(value: unknown): number | null {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isInteger(n) || n < 0 || n > MAX_MERCHANT_LIMIT) return null;
  return n;
}

export function validateResellerInput(raw: Record<string, unknown>): Result<ResellerInput> {
  const name = str(raw.name, 100);
  const email = str(raw.email, 200).toLowerCase();
  const phone = str(raw.phone, 40);
  if (!name) return { ok: false, error: 'Enter the reseller name.' };
  if (!EMAIL.test(email)) return { ok: false, error: 'Enter a valid email address.' };
  if (phone.replace(/\D/g, '').length < 8) return { ok: false, error: 'Enter a WhatsApp phone number with country code.' };
  const limit = raw.merchant_limit === undefined || raw.merchant_limit === ''
    ? DEFAULT_MERCHANT_LIMIT
    : parseMerchantLimit(raw.merchant_limit);
  if (limit === null) return { ok: false, error: `The merchant limit must be a whole number from 0 to ${MAX_MERCHANT_LIMIT}.` };
  return { ok: true, value: { name, email, phone, merchant_limit: limit, grow_enabled: raw.grow_enabled === true } };
}

/** "Café Atlas Ifni" -> "cafe-atlas-ifni". Matches the DB slug check. */
export function slugify(name: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
    .replace(/-+$/g, '');
  return slug || 'merchant';
}

/** First free slug: name, name-2, name-3, ... */
export function nextFreeSlug(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base;
  for (let i = 2; i < 1000; i++) {
    const candidate = `${base}-${i}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export interface MerchantInput {
  product: MerchantProduct;
  name: string;
  logo_url: string | null;
  phone: string;
  whatsapp_number: string;
  instagram_handle: string;
  website_url: string;
  email: string;
  google_maps_url: string;
  gallery_images: string[];
  google_review_url: string;
  discount_percentage: number;
  is_active: boolean;
}

function httpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * @param imagePrefix Uploaded images must live under this public storage
 *                    prefix (the reseller's own folder).
 */
export function validateMerchantInput(
  raw: Record<string, unknown>,
  opts: { growEnabled: boolean; imagePrefix: string; productLocked?: MerchantProduct }
): Result<MerchantInput> {
  const product: MerchantProduct = opts.productLocked ?? (raw.product === 'grow' ? 'grow' : 'connect');
  if (product === 'grow' && !opts.growEnabled && !opts.productLocked) {
    return { ok: false, error: 'Grow is not enabled on your account.' };
  }

  const name = str(raw.name, 100);
  if (!name) return { ok: false, error: 'Enter the merchant name.' };

  const logo = str(raw.logo_url, 500);
  if (logo && !logo.startsWith(opts.imagePrefix)) return { ok: false, error: 'Upload the logo again.' };

  const gallery = Array.isArray(raw.gallery_images)
    ? raw.gallery_images.filter((u): u is string => typeof u === 'string' && u.length > 0)
    : [];
  if (product === 'connect' && gallery.length > MAX_GALLERY_IMAGES) {
    return { ok: false, error: `A merchant can have up to ${MAX_GALLERY_IMAGES} photos.` };
  }
  if (gallery.some((u) => !u.startsWith(opts.imagePrefix))) return { ok: false, error: 'Upload the photos again.' };

  const website = str(raw.website_url, 300);
  const maps = str(raw.google_maps_url, 500);
  const review = str(raw.google_review_url, 500);
  const email = str(raw.email, 200).toLowerCase();
  if (website && !httpUrl(website)) return { ok: false, error: 'The website must start with https://' };
  if (maps && !httpUrl(maps)) return { ok: false, error: 'Paste the full Google Maps link.' };
  if (email && !EMAIL.test(email)) return { ok: false, error: 'Enter a valid email address.' };

  let discount = 10;
  if (product === 'grow') {
    if (!review || !httpUrl(review)) return { ok: false, error: 'Paste the Google review link.' };
    discount = Number(raw.discount_percentage);
    if (!Number.isInteger(discount) || discount < 1 || discount > 100) {
      return { ok: false, error: 'The discount must be a whole number from 1 to 100.' };
    }
  }

  return {
    ok: true,
    value: {
      product,
      name,
      logo_url: logo || null,
      phone: str(raw.phone, 40),
      whatsapp_number: str(raw.whatsapp_number, 40),
      instagram_handle: str(raw.instagram_handle, 100).replace(/^@/, ''),
      website_url: website,
      email,
      google_maps_url: maps,
      gallery_images: product === 'connect' ? gallery : [],
      google_review_url: product === 'grow' ? review : '',
      discount_percentage: discount,
      is_active: raw.is_active !== false,
    },
  };
}

/** Maps the database's own rule errors to a status and a message for people. */
export function describeMerchantDbError(message: string): { status: number; error: string; code: string } {
  if (message.includes('MERCHANT_LIMIT_REACHED')) {
    return { status: 409, code: 'limit', error: 'You have reached your merchant limit. Contact Boostov to increase it.' };
  }
  if (message.includes('GROW_NOT_ENABLED')) {
    return { status: 403, code: 'grow', error: 'Grow is not enabled on your account.' };
  }
  if (message.includes('GALLERY_LIMIT_REACHED')) {
    return { status: 400, code: 'gallery', error: `A merchant can have up to ${MAX_GALLERY_IMAGES} photos.` };
  }
  if (message.includes('RESELLER_INACTIVE')) {
    return { status: 403, code: 'inactive', error: 'Your account is not active.' };
  }
  if (/duplicate key|unique/i.test(message)) {
    return { status: 409, code: 'slug', error: 'That link name was just taken. Save again.' };
  }
  return { status: 500, code: 'unknown', error: 'Could not save the merchant. Try again.' };
}
