import { NextResponse } from 'next/server';
import { requireApi } from '@/lib/authz';
import { supabaseServer } from '@/lib/supabase/server';
import { parseMerchantLimit } from '@/lib/reseller-validation';
import { SUSPEND_BAN_DURATION } from '@/lib/reseller-admin';
import { RESELLER_COLS, type ResellerRow } from '@/lib/reseller-data';

/**
 * Changes a reseller's limit, Grow flag or status. Lowering the limit or
 * suspending never touches their merchants: those keep working publicly.
 */
export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const gate = await requireApi('admin');
  if (!gate.ok) return gate.response;
  const service = supabaseServer;
  if (!service) return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });

  const { data: current } = await service.from('resellers').select(RESELLER_COLS).eq('id', params.id).maybeSingle();
  const reseller = current as ResellerRow | null;
  if (!reseller) return NextResponse.json({ error: 'Reseller not found.' }, { status: 404 });

  let raw: Record<string, unknown>;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if ('merchant_limit' in raw) {
    const limit = parseMerchantLimit(raw.merchant_limit);
    if (limit === null) return NextResponse.json({ error: 'Enter a whole number from 0 to 1000.' }, { status: 400 });
    update.merchant_limit = limit;
  }
  if ('grow_enabled' in raw) update.grow_enabled = raw.grow_enabled === true;

  if (raw.status === 'suspended' && reseller.status !== 'suspended') {
    const { error } = await service.auth.admin.updateUserById(reseller.id, { ban_duration: SUSPEND_BAN_DURATION });
    if (error) return NextResponse.json({ error: 'Could not suspend the account.' }, { status: 500 });
    update.status = 'suspended';
  } else if (raw.status === 'active' && reseller.status === 'suspended') {
    const { error } = await service.auth.admin.updateUserById(reseller.id, { ban_duration: 'none' });
    if (error) return NextResponse.json({ error: 'Could not reactivate the account.' }, { status: 500 });
    update.status = reseller.password_set_at ? 'active' : 'pending';
  }

  const { data, error } = await service
    .from('resellers')
    .update(update)
    .eq('id', reseller.id)
    .select(RESELLER_COLS)
    .single();
  if (error) return NextResponse.json({ error: 'Could not save.' }, { status: 500 });
  return NextResponse.json({ reseller: data });
}
