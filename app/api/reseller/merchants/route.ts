import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { requireApi } from '@/lib/authz';
import { supabaseServer } from '@/lib/supabase/server';
import { RESELLER_COLS, resellerImagePrefix, takenSlugs, type ResellerRow } from '@/lib/reseller-data';
import {
  describeMerchantDbError,
  nextFreeSlug,
  slugify,
  validateMerchantInput,
} from '@/lib/reseller-validation';
import { merchantColumns, tableFor } from '@/lib/reseller-merchants';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Creates a merchant owned by the signed-in reseller. The insert runs as the reseller (RLS). */
export async function POST(request: Request) {
  const gate = await requireApi('reseller');
  if (!gate.ok) return gate.response;
  const { ctx, supabase } = gate.auth;
  if (!supabaseServer) return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });

  const { data: reseller } = await supabase.from('resellers').select(RESELLER_COLS).eq('id', ctx.userId).single();
  if (!reseller) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  const r = reseller as ResellerRow;

  let raw: Record<string, unknown>;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const parsed = validateMerchantInput(raw, { growEnabled: r.grow_enabled, imagePrefix: resellerImagePrefix(r.id) });
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const input = parsed.value;

  const [{ count: connectCount }, { count: growCount }] = await Promise.all([
    supabase.from('connect_businesses').select('id', { count: 'exact', head: true }).eq('reseller_id', r.id),
    supabase.from('businesses').select('id', { count: 'exact', head: true }).eq('reseller_id', r.id),
  ]);
  if ((connectCount ?? 0) + (growCount ?? 0) >= r.merchant_limit) {
    const { status, error, code } = describeMerchantDbError('MERCHANT_LIMIT_REACHED');
    return NextResponse.json({ error, code }, { status });
  }

  const base = slugify(input.name);
  const slug = nextFreeSlug(base, await takenSlugs(supabaseServer, base));
  const id = typeof raw.id === 'string' && UUID.test(raw.id) ? raw.id : randomUUID();

  const { error } = await supabase
    .from(tableFor(input.product))
    .insert({ id, reseller_id: r.id, slug, ...merchantColumns(input) });

  if (error) {
    const { status, error: message, code } = describeMerchantDbError(error.message);
    if (status === 500) console.error('Reseller merchant insert failed:', error.message);
    return NextResponse.json({ error: message, code }, { status });
  }

  return NextResponse.json({ id, product: input.product, slug }, { status: 201 });
}
