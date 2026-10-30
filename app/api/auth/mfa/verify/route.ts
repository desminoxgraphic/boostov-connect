import { NextResponse } from 'next/server';
import { requireApi } from '@/lib/authz';

/** Verifies a 6-digit TOTP code (sign-in, or finishing an enrolment). */
export async function POST(request: Request) {
  const gate = await requireApi('admin-mfa');
  if (!gate.ok) return gate.response;
  const { supabase } = gate.auth;

  let body: { code?: unknown; factorId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Enter the 6-digit code.' }, { status: 400 });
  }
  const code = typeof body.code === 'string' ? body.code.replace(/\s/g, '') : '';
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: 'Enter the 6-digit code.' }, { status: 400 });
  }

  let factorId = typeof body.factorId === 'string' ? body.factorId : '';
  if (!factorId) {
    const { data } = await supabase.auth.mfa.listFactors();
    factorId = data?.totp?.[0]?.id ?? '';
  }
  if (!factorId) return NextResponse.json({ error: 'No authenticator is set up yet.' }, { status: 400 });

  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
  if (error) {
    return NextResponse.json({ error: 'That code is not valid. Try the latest one.' }, { status: 401 });
  }

  return NextResponse.json({ next: '/admin' });
}
