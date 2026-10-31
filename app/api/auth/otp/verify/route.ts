import { NextResponse } from 'next/server';
import { createUserClient } from '@/lib/supabase/ssr';
import { LOGIN_MESSAGES, afterSignIn, normalizeEmail } from '@/lib/post-login';

/** Step 2 of email sign-in: checks the code and opens the right dashboard. */
export async function POST(request: Request) {
  let email = '';
  let code = '';
  try {
    const body = await request.json();
    email = normalizeEmail(body?.email);
    code = typeof body?.code === 'string' ? body.code.replace(/\D/g, '') : '';
  } catch {
    /* handled below */
  }
  if (!email || !/^\d{6,10}$/.test(code)) {
    return NextResponse.json({ error: 'Enter the code from the email.' }, { status: 400 });
  }

  const supabase = await createUserClient();
  const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
  if (error) {
    return NextResponse.json({ error: 'That code is wrong or has expired. Request a new one.' }, { status: 401 });
  }

  const result = await afterSignIn(supabase, 'code');
  if (!result.ok) return NextResponse.json({ error: LOGIN_MESSAGES[result.code], code: result.code }, { status: 403 });
  return NextResponse.json({ next: result.next });
}
