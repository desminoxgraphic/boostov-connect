import { NextResponse } from 'next/server';
import { requireApi } from '@/lib/authz';
import { supabaseServer } from '@/lib/supabase/server';
import { RESELLER_COLS, resellerImagePrefix, type ResellerRow } from '@/lib/reseller-data';
import { describeMerchantDbError, validateMerchantInput } from '@/lib/reseller-validation';
import {
  deleteStorageObjects,
  loadEditableMerchant,
  merchantColumns,
  removedImagePaths,
  tableFor,
} from '@/lib/reseller-merchants';

/** Updates a merchant. The slug and product never change, so programmed cards keep working. */
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const gate = await requireApi('reseller');
  if (!gate.ok) return gate.response;
  const { ctx, supabase } = gate.auth;

  const existing = await loadEditableMerchant(supabase, params.id);
  if (!existing) return NextResponse.json({ error: 'Merchant not found.' }, { status: 404 });

  const { data: reseller } = await supabase.from('resellers').select(RESELLER_COLS).eq('id', ctx.userId).single();
  const r = reseller as ResellerRow | null;
  if (!r) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  let raw: Record<string, unknown>;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const parsed = validateMerchantInput(raw, {
    growEnabled: r.grow_enabled,
    imagePrefix: resellerImagePrefix(r.id),
    productLocked: existing.product,
  });
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { error } = await supabase
    .from(tableFor(existing.product))
    .update({ ...merchantColumns(parsed.value), updated_at: new Date().toISOString() })
    .eq('id', existing.id);

  if (error) {
    const { status, error: message, code } = describeMerchantDbError(error.message);
    if (status === 500) console.error('Reseller merchant update failed:', error.message);
    return NextResponse.json({ error: message, code }, { status });
  }

  // Free-tier storage: replaced or removed images are deleted.
  if (supabaseServer) {
    const before = [existing.logo_url || '', ...existing.gallery_images];
    const after = [parsed.value.logo_url || '', ...parsed.value.gallery_images];
    await deleteStorageObjects(supabaseServer, removedImagePaths(before, after, `resellers/${r.id}/`));
  }

  return NextResponse.json({ id: existing.id, product: existing.product });
}
