import type { SupabaseClient } from '@supabase/supabase-js';
import { loadAllMerchants, loadResellers, type MerchantSummary, type ResellerRow } from './reseller-data';
import { getAppUrl } from './app-url';

export interface ResellerOverviewRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  merchant_limit: number;
  grow_enabled: boolean;
  status: ResellerRow['status'];
  cards: number;
  taps: number;
  taps_7d: number;
  /** Last sign-in, or null if they never signed in. */
  last_active: string | null;
}

export interface AdminCardRow extends MerchantSummary {
  owner: string;
  /** The link printed on the card: /connect/ for your original cards, /m/ for reseller cards. */
  link: string;
}

export interface AccessRequestRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  created_at: string;
}

export interface AdminOverview {
  requests: AccessRequestRow[];
  resellers: ResellerOverviewRow[];
  cards: AdminCardRow[];
  totals: { resellers: number; cards: number; taps: number; taps_7d: number };
}

/** Everything the one-screen admin panel shows. Service client only. */
export async function loadAdminOverview(service: SupabaseClient): Promise<AdminOverview> {
  const [resellers, { merchants }, users, { data: requests }] = await Promise.all([
    loadResellers(service),
    loadAllMerchants(service),
    service.auth.admin.listUsers({ perPage: 1000 }),
    service
      .from('access_requests')
      .select('id, name, email, phone, message, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
  ]);
  const lastSignIn = new Map((users.data?.users ?? []).map((u) => [u.id, u.last_sign_in_at ?? null]));
  const names = new Map(resellers.map((r) => [r.id, r.name]));
  const appUrl = getAppUrl();

  const rows: ResellerOverviewRow[] = resellers.map((r) => {
    const own = merchants.filter((m) => m.reseller_id === r.id);
    return {
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      merchant_limit: r.merchant_limit,
      grow_enabled: r.grow_enabled,
      status: r.status,
      cards: r.merchant_count,
      taps: own.reduce((s, m) => s + m.taps_total, 0),
      taps_7d: own.reduce((s, m) => s + m.taps_7d, 0),
      last_active: lastSignIn.get(r.id) ?? null,
    };
  });

  const cards: AdminCardRow[] = merchants
    .filter((m) => m.product === 'connect')
    .map((m) => ({
      ...m,
      owner: m.reseller_id ? names.get(m.reseller_id) ?? 'Reseller' : 'Boostov',
      link: m.reseller_id ? m.public_url : `${appUrl}/connect/${m.slug}`,
    }));

  return {
    requests: (requests as AccessRequestRow[]) ?? [],
    resellers: rows,
    cards,
    totals: {
      resellers: rows.length,
      cards: cards.length,
      taps: cards.reduce((s, m) => s + m.taps_total, 0),
      taps_7d: cards.reduce((s, m) => s + m.taps_7d, 0),
    },
  };
}
