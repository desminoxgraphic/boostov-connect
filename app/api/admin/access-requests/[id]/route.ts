import { NextResponse } from 'next/server';
import { requireApi } from '@/lib/authz';
import { supabaseServer } from '@/lib/supabase/server';

/** Admin dismisses (or re-opens) an access request. */
export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const gate = await requireApi('admin');
  if (!gate.ok) return gate.response;
  if (!supabaseServer) return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });

  let status = '';
  try {
    status = String((await request.json())?.status ?? '');
  } catch {
    /* handled below */
  }
  if (!['pending', 'approved', 'dismissed'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status.' }, { status: 400 });
  }
  const { error } = await supabaseServer.from('access_requests').update({ status }).eq('id', params.id);
  if (error) return NextResponse.json({ error: 'Could not update the request.' }, { status: 500 });
  return NextResponse.json({ status });
}
