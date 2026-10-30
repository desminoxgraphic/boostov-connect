import type { SupabaseClient } from '@supabase/supabase-js';
import { connectStatsUrl, getAppUrl, getGrowAppUrl, growStatsUrl, merchantPublicUrl } from './app-url';
import type { MerchantProduct } from './reseller-validation';
import type { ResellerStatus } from './access';

export interface ResellerRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  merchant_limit: number;
  grow_enabled: boolean;
  status: ResellerStatus;
  password_set_at: string | null;
  last_link_generated_at: string | null;
  created_at: string;
}

export interface MerchantSummary {
  id: string;
  product: MerchantProduct;
  name: string;
  slug: string;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
  reseller_id: string | null;
  taps_total: number;
  taps_7d: number;
  public_url: string;
  stats_url: string;
}

export interface ResellerSpace {
  reseller: ResellerRow;
  merchants: MerchantSummary[];
}

type TapRow = { product: string; merchant_id: string; total: number; last_7d: number };

async function loadTapCounts(client: SupabaseClient): Promise<Map<string, TapRow>> {
  const { data, error } = await client.rpc('merchant_tap_counts');
  if (error) console.error('merchant_tap_counts failed:', error.message);
  const map = new Map<string, TapRow>();
  for (const row of (data as TapRow[] | null) ?? []) map.set(`${row.product}:${row.merchant_id}`, row);
  return map;
}

type ConnectRow = {
  id: string; name: string; slug: string; logo_url: string | null; is_active: boolean;
  created_at: string; dashboard_token: string; reseller_id: string | null;
};
type GrowRow = {
  id: string; name: string; slug: string; logo_url: string | null; is_active: boolean;
  created_at: string; merchant_token: string; reseller_id: string | null;
};

function toSummaries(
  connect: ConnectRow[],
  grow: GrowRow[],
  taps: Map<string, TapRow>,
  appUrl = getAppUrl(),
  growUrl = getGrowAppUrl()
): MerchantSummary[] {
  const rows: MerchantSummary[] = [
    ...connect.map((b) => {
      const t = taps.get(`connect:${b.id}`);
      return {
        id: b.id, product: 'connect' as const, name: b.name, slug: b.slug, logo_url: b.logo_url,
        is_active: b.is_active, created_at: b.created_at, reseller_id: b.reseller_id,
        taps_total: Number(t?.total ?? 0), taps_7d: Number(t?.last_7d ?? 0),
        public_url: merchantPublicUrl(b.slug, appUrl),
        stats_url: connectStatsUrl(b.dashboard_token, appUrl),
      };
    }),
    ...grow.map((b) => {
      const t = taps.get(`grow:${b.id}`);
      return {
        id: b.id, product: 'grow' as const, name: b.name, slug: b.slug, logo_url: b.logo_url,
        is_active: b.is_active, created_at: b.created_at, reseller_id: b.reseller_id,
        taps_total: Number(t?.total ?? 0), taps_7d: Number(t?.last_7d ?? 0),
        public_url: merchantPublicUrl(b.slug, appUrl),
        stats_url: growStatsUrl(b.merchant_token, growUrl),
      };
    }),
  ];
  return rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

const CONNECT_COLS = 'id, name, slug, logo_url, is_active, created_at, dashboard_token, reseller_id';
const GROW_COLS = 'id, name, slug, logo_url, is_active, created_at, merchant_token, reseller_id';
export const RESELLER_COLS =
  'id, name, email, phone, merchant_limit, grow_enabled, status, password_set_at, last_link_generated_at, created_at';

/**
 * One reseller's space. Called with the reseller's own client (RLS limits it to
 * their rows) or, for the super admin's read-only view, the service client.
 */
export async function loadResellerSpace(client: SupabaseClient, resellerId: string): Promise<ResellerSpace | null> {
  const [{ data: reseller }, { data: connect }, { data: grow }, taps] = await Promise.all([
    client.from('resellers').select(RESELLER_COLS).eq('id', resellerId).maybeSingle(),
    client.from('connect_businesses').select(CONNECT_COLS).eq('reseller_id', resellerId),
    client.from('businesses').select(GROW_COLS).eq('reseller_id', resellerId),
    loadTapCounts(client),
  ]);
  if (!reseller) return null;
  return {
    reseller: reseller as ResellerRow,
    merchants: toSummaries((connect as ConnectRow[]) ?? [], (grow as GrowRow[]) ?? [], taps),
  };
}

/** Super admin only (service client): every merchant, with its reseller. */
export async function loadAllMerchants(service: SupabaseClient): Promise<{
  merchants: MerchantSummary[];
  resellers: Pick<ResellerRow, 'id' | 'name'>[];
}> {
  const [{ data: connect }, { data: grow }, { data: resellers }, taps] = await Promise.all([
    service.from('connect_businesses').select(CONNECT_COLS),
    service.from('businesses').select(GROW_COLS),
    service.from('resellers').select('id, name').order('name'),
    loadTapCounts(service),
  ]);
  return {
    merchants: toSummaries((connect as ConnectRow[]) ?? [], (grow as GrowRow[]) ?? [], taps),
    resellers: (resellers as Pick<ResellerRow, 'id' | 'name'>[]) ?? [],
  };
}

export async function loadResellers(service: SupabaseClient): Promise<Array<ResellerRow & { merchant_count: number }>> {
  const [{ data: resellers }, { data: connect }, { data: grow }] = await Promise.all([
    service.from('resellers').select(RESELLER_COLS).order('created_at', { ascending: false }),
    service.from('connect_businesses').select('reseller_id').not('reseller_id', 'is', null),
    service.from('businesses').select('reseller_id').not('reseller_id', 'is', null),
  ]);
  const counts = new Map<string, number>();
  for (const row of [...(connect ?? []), ...(grow ?? [])] as { reseller_id: string }[]) {
    counts.set(row.reseller_id, (counts.get(row.reseller_id) ?? 0) + 1);
  }
  return ((resellers as ResellerRow[]) ?? []).map((r) => ({ ...r, merchant_count: counts.get(r.id) ?? 0 }));
}

/** Slugs already used anywhere (registry and both merchant tables). Service client. */
export async function takenSlugs(service: SupabaseClient, base: string): Promise<Set<string>> {
  const pattern = `${base}%`;
  const [a, b, c] = await Promise.all([
    service.from('merchant_slugs').select('slug').like('slug', pattern),
    service.from('connect_businesses').select('slug').like('slug', pattern),
    service.from('businesses').select('slug').like('slug', pattern),
  ]);
  return new Set([...(a.data ?? []), ...(b.data ?? []), ...(c.data ?? [])].map((r: { slug: string }) => r.slug));
}

/** Public storage prefix for one reseller's uploads. */
export function resellerImagePrefix(resellerId: string): string {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
  return `${base}/storage/v1/object/public/business-assets/resellers/${resellerId}/`;
}
