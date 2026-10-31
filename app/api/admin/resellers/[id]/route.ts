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

/**
 * Deletes a reseller completely: their cards (links stop working), the cards'
 * links and stats, their uploaded images, their role and their login.
 * The body must repeat the reseller's name, as typed in the confirmation box.
 */
export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const gate = await requireApi('admin');
  if (!gate.ok) return gate.response;
  const service = supabaseServer;
  if (!service) return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });

  const { data: reseller } = await service.from('resellers').select('id, name').eq('id', params.id).maybeSingle();
  if (!reseller) return NextResponse.json({ error: 'Reseller not found.' }, { status: 404 });
  if (reseller.id === gate.auth.ctx.userId) return NextResponse.json({ error: 'You cannot delete yourself.' }, { status: 400 });

  let confirmName = '';
  try {
    confirmName = String((await request.json())?.confirm_name ?? '');
  } catch {
    /* handled below */
  }
  if (confirmName.trim() !== reseller.name.trim()) {
    return NextResponse.json({ error: 'Type the reseller name exactly to confirm.' }, { status: 400 });
  }

  // 1. Uploaded images: resellers/<id>/<card>/<file>
  const bucket = service.storage.from('business-assets');
  const paths: string[] = [];
  const { data: folders } = await bucket.list(`resellers/${reseller.id}`, { limit: 1000 });
  for (const folder of folders ?? []) {
    const { data: files } = await bucket.list(`resellers/${reseller.id}/${folder.name}`, { limit: 1000 });
    for (const file of files ?? []) paths.push(`resellers/${reseller.id}/${folder.name}/${file.name}`);
  }

  // 2. Cards. Links, stats events, /m/ slugs and Grow rewards go with them (database cascades).
  const { count: connectCards, error: connectError } = await service
    .from('connect_businesses')
    .delete({ count: 'exact' })
    .eq('reseller_id', reseller.id);
  const { count: growCards, error: growError } = await service
    .from('businesses')
    .delete({ count: 'exact' })
    .eq('reseller_id', reseller.id);
  if (connectError || growError) {
    console.error('Reseller delete (cards) failed:', connectError?.message ?? growError?.message);
    return NextResponse.json({ error: 'Could not delete their cards. Nothing else was deleted.' }, { status: 500 });
  }

  if (paths.length) {
    const { error } = await bucket.remove(paths);
    if (error) console.error('Reseller delete (images) failed:', error.message);
  }

  // 3. Account: removing the login also removes the reseller row and role (cascade).
  const { error: userError } = await service.auth.admin.deleteUser(reseller.id);
  if (userError) {
    await service.from('resellers').delete().eq('id', reseller.id);
    console.error('Reseller delete (login) failed:', userError.message);
  }

  return NextResponse.json({
    deleted: true,
    cards: (connectCards ?? 0) + (growCards ?? 0),
    images: paths.length,
  });
}
