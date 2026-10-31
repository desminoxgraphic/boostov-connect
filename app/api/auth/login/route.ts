import { NextResponse } from 'next/server';
import { createUserClient } from '@/lib/supabase/ssr';
import { loadAccessContext } from '@/lib/authz';
import { LOGIN_MESSAGES, passwordLoginEnabled } from '@/lib/post-login';

const GENERIC = 'Invalid email or password.';

/**
 * Old email + password sign-in, kept only as a safety net until the super
 * admin has signed in once with Google or an email code. After that it is
 * refused for everyone.
 */
export async function POST(request: Request) {
  if (!(await passwordLoginEnabled())) {
    return NextResponse.json(
      { error: 'Password sign-in is turned off. Continue with Google or an email code.' },
      { status: 403 }
    );
  }

  let body: { email?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: GENERIC }, { status: 400 });
  }
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!email || !password) return NextResponse.json({ error: GENERIC }, { status: 400 });

  const supabase = await createUserClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (/banned/i.test(error.message)) return NextResponse.json({ error: LOGIN_MESSAGES.suspended }, { status: 403 });
    return NextResponse.json({ error: GENERIC }, { status: 401 });
  }

  const ctx = await loadAccessContext(supabase);
  if (!ctx?.role) {
    await supabase.auth.signOut();
    return NextResponse.json({ error: GENERIC }, { status: 401 });
  }
  if (ctx.role === 'super_admin') return NextResponse.json({ next: ctx.hasTotp ? '/admin/mfa' : '/admin' });
  if (ctx.resellerStatus !== 'active') {
    await supabase.auth.signOut();
    return NextResponse.json({ error: LOGIN_MESSAGES.suspended }, { status: 403 });
  }
  return NextResponse.json({ next: '/dashboard' });
}
