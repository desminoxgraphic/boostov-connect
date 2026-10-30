import type { SupabaseClient } from '@supabase/supabase-js';
import type { MerchantInput, MerchantProduct } from './reseller-validation';

const BUCKET = 'business-assets';
const PUBLIC_MARKER = `/storage/v1/object/public/${BUCKET}/`;

export function tableFor(product: MerchantProduct): 'connect_businesses' | 'businesses' {
  return product === 'grow' ? 'businesses' : 'connect_businesses';
}

/** Columns written for each product. Mirrors the column grants in the migration. */
export function merchantColumns(input: MerchantInput): Record<string, unknown> {
  if (input.product === 'grow') {
    return {
      name: input.name,
      logo_url: input.logo_url,
      phone: input.phone,
      google_review_url: input.google_review_url,
      discount_percentage: input.discount_percentage,
      is_active: input.is_active,
    };
  }
  return {
    name: input.name,
    logo_url: input.logo_url,
    phone: input.phone,
    whatsapp_number: input.whatsapp_number,
    instagram_handle: input.instagram_handle,
    website_url: input.website_url,
    email: input.email,
    google_maps_url: input.google_maps_url,
    gallery_images: input.gallery_images,
    is_active: input.is_active,
  };
}

export interface EditableMerchant extends MerchantInput {
  id: string;
  slug: string;
}

/** Loads one merchant through the caller's client (RLS decides visibility). */
export async function loadEditableMerchant(
  client: SupabaseClient,
  id: string
): Promise<EditableMerchant | null> {
  const { data: connect } = await client
    .from('connect_businesses')
    .select('id, slug, name, logo_url, phone, whatsapp_number, instagram_handle, website_url, email, google_maps_url, gallery_images, is_active')
    .eq('id', id)
    .maybeSingle();
  if (connect) {
    return {
      ...(connect as Omit<EditableMerchant, 'product' | 'google_review_url' | 'discount_percentage'>),
      gallery_images: Array.isArray(connect.gallery_images) ? connect.gallery_images : [],
      product: 'connect',
      google_review_url: '',
      discount_percentage: 10,
    };
  }
  const { data: grow } = await client
    .from('businesses')
    .select('id, slug, name, logo_url, phone, google_review_url, discount_percentage, is_active')
    .eq('id', id)
    .maybeSingle();
  if (!grow) return null;
  return {
    ...(grow as Pick<EditableMerchant, 'id' | 'slug' | 'name' | 'logo_url' | 'phone' | 'google_review_url' | 'discount_percentage' | 'is_active'>),
    product: 'grow',
    whatsapp_number: '',
    instagram_handle: '',
    website_url: '',
    email: '',
    google_maps_url: '',
    gallery_images: [],
  };
}

export function storagePathFromUrl(url: string): string | null {
  const i = url.indexOf(PUBLIC_MARKER);
  return i === -1 ? null : decodeURIComponent(url.slice(i + PUBLIC_MARKER.length).split('?')[0]);
}

/** Images that were in `before` but are gone in `after`, limited to one folder. */
export function removedImagePaths(before: string[], after: string[], folder: string): string[] {
  const keep = new Set(after);
  return before
    .filter((url) => url && !keep.has(url))
    .map(storagePathFromUrl)
    .filter((p): p is string => !!p && p.startsWith(folder));
}

export async function deleteStorageObjects(service: SupabaseClient, paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await service.storage.from(BUCKET).remove(paths);
  if (error) console.error('Storage cleanup failed:', error.message);
}

export { BUCKET as ASSETS_BUCKET };
