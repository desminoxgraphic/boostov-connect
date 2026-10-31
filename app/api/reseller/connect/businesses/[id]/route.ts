import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requireApi } from '@/lib/authz';
import { supabaseServer } from '@/lib/supabase/server';
import { getConnectBusinessById, getConnectCapabilities, updateConnectBusiness } from '@/lib/connect-db';
import { pickConnectBusinessFields } from '@/lib/connect-utils';
import { resellerImagePrefix } from '@/lib/reseller-data';
import { describeMerchantDbError } from '@/lib/reseller-validation';
import { checkResellerImages, connectImageUrls } from '@/lib/reseller-connect';
import { deleteStorageObjects, removedImagePaths } from '@/lib/reseller-merchants';

/**
 * Ownership is checked with the reseller's own session (RLS): if their client
 * cannot see the row, it is not theirs and the answer is 404.
 */
async function ownedId(supabase: SupabaseClient, id: string): Promise<boolean> {
  const { data } = await supabase.from('connect_businesses').select('id').eq('id', id).maybeSingle();
  return !!data;
}

export async function GET(_request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const gate = await requireApi('reseller');
  if (!gate.ok) return gate.response;
  if (!(await ownedId(gate.auth.supabase, params.id))) {
    return NextResponse.json({ error: 'Business profile not found.' }, { status: 404 });
  }
  const data = await getConnectBusinessById(params.id);
  if (!data) return NextResponse.json({ error: 'Business profile not found.' }, { status: 404 });
  return NextResponse.json({ ...data, capabilities: await getConnectCapabilities() });
}

/** Same payload as the admin edit form. The slug (programmed on cards) and owner never change. */
export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const gate = await requireApi('reseller');
  if (!gate.ok) return gate.response;
  const { ctx, supabase } = gate.auth;
  if (!(await ownedId(supabase, params.id))) {
    return NextResponse.json({ error: 'Business profile not found.' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
  const fields = pickConnectBusinessFields(body);
  delete fields.slug;
  delete fields.id;

  const imageProblem = checkResellerImages(fields, resellerImagePrefix(ctx.userId));
  if (imageProblem) return NextResponse.json({ error: imageProblem }, { status: 400 });

  const before = await getConnectBusinessById(params.id);
  try {
    const updated = await updateConnectBusiness(params.id, fields);
    if (!updated) return NextResponse.json({ error: 'Business profile not found.' }, { status: 404 });

    // Free-tier storage: replaced or removed images are deleted.
    if (supabaseServer && before) {
      await deleteStorageObjects(
        supabaseServer,
        removedImagePaths(connectImageUrls(before.business), connectImageUrls(updated.business), `resellers/${ctx.userId}/`)
      );
    }
    return NextResponse.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const { status, error } = describeMerchantDbError(message);
    if (status === 500) console.error('Reseller Connect update failed:', message);
    return NextResponse.json({ error }, { status });
  }
}

/**
 * A reseller deletes one of their own cards: the card, its links, its stats and
 * its uploaded images. Its NFC link and QR code stop working.
 */
export async function DELETE(_request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const gate = await requireApi('reseller');
  if (!gate.ok) return gate.response;
  const { ctx, supabase } = gate.auth;
  if (!(await ownedId(supabase, params.id))) {
    return NextResponse.json({ error: 'Business profile not found.' }, { status: 404 });
  }
  if (!supabaseServer) return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });

  const { error } = await supabaseServer
    .from('connect_businesses')
    .delete()
    .eq('id', params.id)
    .eq('reseller_id', ctx.userId);
  if (error) return NextResponse.json({ error: 'Could not delete the card.' }, { status: 500 });

  const folder = `resellers/${ctx.userId}/${params.id}`;
  const { data: files } = await supabaseServer.storage.from('business-assets').list(folder, { limit: 1000 });
  await deleteStorageObjects(supabaseServer, (files ?? []).map((f) => `${folder}/${f.name}`));

  return NextResponse.json({ deleted: true });
}
