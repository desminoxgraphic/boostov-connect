import { NextResponse } from 'next/server';
import { requireApi } from '@/lib/authz';
import { supabaseServer } from '@/lib/supabase/server';
import { validatePassword } from '@/lib/reseller-validation';
import { resellerAccessMessage } from '@/lib/reseller-admin';
import { buildWhatsAppUrl } from '@/lib/app-url';

/** Admin sets a new password for a reseller (forgotten password). */
export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const gate = await requireApi('admin');
  if (!gate.ok) return gate.response;
  const service = supabaseServer;
  if (!service) return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });

  let password = '';
  try {
    password = String((await request.json())?.password ?? '');
  } catch {
    /* handled below */
  }
  const problem = validatePassword(password);
  if (problem) return NextResponse.json({ error: `Mot de passe : ${problem}` }, { status: 400 });

  const { data: reseller } = await service.from('resellers').select('id, name, email, phone').eq('id', params.id).maybeSingle();
  if (!reseller) return NextResponse.json({ error: 'Reseller not found.' }, { status: 404 });

  const { error } = await service.auth.admin.updateUserById(reseller.id, { password });
  if (error) return NextResponse.json({ error: 'Could not change the password.' }, { status: 500 });
  await service.from('resellers').update({ password_set_at: new Date().toISOString() }).eq('id', reseller.id);

  const message = resellerAccessMessage(reseller.name, reseller.email, password);
  return NextResponse.json({ message, whatsapp_url: buildWhatsAppUrl(reseller.phone, message) });
}
