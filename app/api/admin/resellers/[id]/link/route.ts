import { NextResponse } from 'next/server';
import { requireApi } from '@/lib/authz';
import { supabaseServer } from '@/lib/supabase/server';
import { generateResellerLink } from '@/lib/reseller-admin';

/** New setup link (password never set) or reset link (password already set). */
export async function POST(_request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const gate = await requireApi('admin');
  if (!gate.ok) return gate.response;
  const service = supabaseServer;
  if (!service) return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });

  const { data: reseller } = await service
    .from('resellers')
    .select('id, name, email, phone, status, password_set_at')
    .eq('id', params.id)
    .maybeSingle();
  if (!reseller) return NextResponse.json({ error: 'Reseller not found.' }, { status: 404 });
  if (reseller.status === 'suspended') {
    return NextResponse.json({ error: 'Reactivate the reseller before sending a link.' }, { status: 409 });
  }

  const result = await generateResellerLink(service, reseller);
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json(result);
}
