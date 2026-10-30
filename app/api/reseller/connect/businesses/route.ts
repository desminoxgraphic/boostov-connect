import { NextResponse } from 'next/server';
import { requireApi } from '@/lib/authz';
import { supabaseServer } from '@/lib/supabase/server';
import { createConnectBusiness, normalizeConnectSlug } from '@/lib/connect-db';
import { pickConnectBusinessFields } from '@/lib/connect-utils';
import type { CreateConnectBusinessInput } from '@/lib/connect-types';
import { RESELLER_COLS, resellerImagePrefix, takenSlugs, type ResellerRow } from '@/lib/reseller-data';
import { describeMerchantDbError } from '@/lib/reseller-validation';
import { checkResellerImages } from '@/lib/reseller-connect';

/**
 * Creates a Connect card for the signed-in reseller with the same payload as
 * the admin form. The owner is always the caller; the database trigger
 * enforces the merchant limit and the account status again.
 */
export async function POST(request: Request) {
  const gate = await requireApi('reseller');
  if (!gate.ok) return gate.response;
  const { ctx, supabase } = gate.auth;
  if (!supabaseServer) return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });

  const { data: reseller } = await supabase.from('resellers').select(RESELLER_COLS).eq('id', ctx.userId).single();
  const r = reseller as ResellerRow | null;
  if (!r) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
  const fields = pickConnectBusinessFields(body);
  const name = typeof fields.name === 'string' ? fields.name.trim() : '';
  const slug = normalizeConnectSlug(typeof fields.slug === 'string' && fields.slug.trim() ? fields.slug : name);
  if (!name || !slug) return NextResponse.json({ error: 'Business name and slug are required.' }, { status: 400 });

  const imageProblem = checkResellerImages(fields, resellerImagePrefix(r.id));
  if (imageProblem) return NextResponse.json({ error: imageProblem }, { status: 400 });

  const [{ count: connectCount }, { count: growCount }] = await Promise.all([
    supabase.from('connect_businesses').select('id', { count: 'exact', head: true }).eq('reseller_id', r.id),
    supabase.from('businesses').select('id', { count: 'exact', head: true }).eq('reseller_id', r.id),
  ]);
  if ((connectCount ?? 0) + (growCount ?? 0) >= r.merchant_limit) {
    const { status, error, code } = describeMerchantDbError('MERCHANT_LIMIT_REACHED');
    return NextResponse.json({ error, code }, { status });
  }

  if ((await takenSlugs(supabaseServer, slug)).has(slug)) {
    return NextResponse.json({ error: `The link /m/${slug} is already taken. Choose another slug.` }, { status: 409 });
  }

  try {
    const { business, links } = await createConnectBusiness({
      ...(fields as unknown as CreateConnectBusinessInput),
      slug,
      reseller_id: r.id,
    });
    return NextResponse.json({ business, links }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const { status, error, code } = describeMerchantDbError(message);
    if (status === 500) console.error('Reseller Connect create failed:', message);
    return NextResponse.json({ error, code }, { status });
  }
}
