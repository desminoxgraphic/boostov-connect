import { NextResponse } from 'next/server';
import { requireApi } from '@/lib/authz';
import { connectStatsUrl, growStatsUrl } from '@/lib/app-url';
import { loadEditableMerchant } from '@/lib/reseller-merchants';

/** Issues a new secret stats link; the old one stops working immediately. */
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const gate = await requireApi('reseller');
  if (!gate.ok) return gate.response;
  const { supabase } = gate.auth;

  const merchant = await loadEditableMerchant(supabase, params.id);
  if (!merchant) return NextResponse.json({ error: 'Merchant not found.' }, { status: 404 });

  const { data, error } = await supabase.rpc('regenerate_stats_token', {
    p_merchant_id: merchant.id,
    p_product: merchant.product,
  });
  if (error || typeof data !== 'string') {
    console.error('regenerate_stats_token failed:', error?.message);
    return NextResponse.json({ error: 'Could not create a new link. Try again.' }, { status: 500 });
  }

  const url = merchant.product === 'grow' ? growStatsUrl(data) : connectStatsUrl(data);
  return NextResponse.json({ stats_url: url });
}
