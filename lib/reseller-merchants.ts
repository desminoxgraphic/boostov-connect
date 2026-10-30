import type { SupabaseClient } from '@supabase/supabase-js';

const BUCKET = 'business-assets';
const PUBLIC_MARKER = `/storage/v1/object/public/${BUCKET}/`;

export interface OwnedMerchant {
  id: string;
  slug: string;
  product: 'connect' | 'grow';
}

/** Loads one merchant through the caller's client: RLS decides whether it is theirs. */
export async function loadOwnedMerchant(client: SupabaseClient, id: string): Promise<OwnedMerchant | null> {
  const { data: connect } = await client.from('connect_businesses').select('id, slug').eq('id', id).maybeSingle();
  if (connect) return { ...connect, product: 'connect' };
  const { data: grow } = await client.from('businesses').select('id, slug').eq('id', id).maybeSingle();
  return grow ? { ...grow, product: 'grow' } : null;
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
