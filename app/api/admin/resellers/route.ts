import { NextResponse } from 'next/server';
import { requireApi } from '@/lib/authz';
import { supabaseServer } from '@/lib/supabase/server';
import { validateResellerInput } from '@/lib/reseller-validation';
import { resellerAccessMessage } from '@/lib/reseller-admin';
import { buildWhatsAppUrl } from '@/lib/app-url';
import { loadResellers } from '@/lib/reseller-data';

export async function GET() {
  const gate = await requireApi('admin');
  if (!gate.ok) return gate.response;
  if (!supabaseServer) return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
  return NextResponse.json({ resellers: await loadResellers(supabaseServer) });
}

/**
 * Creates a reseller with the email and password the admin chose. No email is
 * sent: the admin passes the sign-in details on (WhatsApp button).
 * Optional request_id marks the matching "Demander un accès" request approved.
 */
export async function POST(request: Request) {
  const gate = await requireApi('admin');
  if (!gate.ok) return gate.response;
  const service = supabaseServer;
  if (!service) return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });

  let raw: Record<string, unknown>;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
  const parsed = validateResellerInput(raw);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const input = parsed.value;

  const { data: created, error: createError } = await service.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { name: input.name },
  });
  if (createError || !created?.user) {
    const exists = /already|registered|exists/i.test(createError?.message || '');
    return NextResponse.json(
      { error: exists ? 'An account with this email already exists.' : 'Could not create the account.' },
      { status: exists ? 409 : 500 }
    );
  }
  const userId = created.user.id;

  const { error: roleError } = await service.from('user_roles').insert({ user_id: userId, role: 'reseller' });
  const { error: resellerError } = roleError
    ? { error: roleError }
    : await service.from('resellers').insert({
        id: userId,
        name: input.name,
        email: input.email,
        phone: input.phone,
        merchant_limit: input.merchant_limit,
        grow_enabled: input.grow_enabled,
        status: 'active',
        password_set_at: new Date().toISOString(),
      });

  if (resellerError) {
    console.error('Reseller create failed:', resellerError.message);
    await service.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: 'Could not create the reseller.' }, { status: 500 });
  }

  if (typeof raw.request_id === 'string') {
    await service.from('access_requests').update({ status: 'approved' }).eq('id', raw.request_id);
  }

  const message = resellerAccessMessage(input.name, input.email, input.password);
  return NextResponse.json(
    { id: userId, message, whatsapp_url: buildWhatsAppUrl(input.phone, message) },
    { status: 201 }
  );
}
