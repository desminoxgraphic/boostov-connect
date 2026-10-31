import { NextResponse } from 'next/server';
import { createUserClient } from '@/lib/supabase/ssr';
import { LOGIN_MESSAGES, afterSignIn, normalizeEmail } from '@/lib/post-login';

/** Email + password sign-in for the super admin and every reseller. */
export async function POST(request: Request) {
  let body: { email?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: LOGIN_MESSAGES.invalid }, { status: 400 });
  }
  const email = normalizeEmail(body.email);
  const password = typeof body.password === 'string' ? body.password : '';
  if (!email || !password) return NextResponse.json({ error: LOGIN_MESSAGES.invalid }, { status: 400 });

  const supabase = await createUserClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (/banned/i.test(error.message)) return NextResponse.json({ error: LOGIN_MESSAGES.suspended }, { status: 403 });
    if (error.status === 429) {
      return NextResponse.json({ error: 'Trop de tentatives. Attendez une minute.' }, { status: 429 });
    }
    return NextResponse.json({ error: LOGIN_MESSAGES.invalid }, { status: 401 });
  }

  const result = await afterSignIn(supabase);
  if (!result.ok) return NextResponse.json({ error: LOGIN_MESSAGES[result.code] }, { status: 403 });
  return NextResponse.json({ next: result.next });
}
