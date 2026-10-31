import { NextResponse } from 'next/server';
import { createUserClient } from '@/lib/supabase/ssr';
import { loadAccessContext } from '@/lib/authz';

const GENERIC = 'Invalid email or password.';
const SUSPENDED = 'This account is suspended. Contact Boostov.';

/**
 * Email + password sign-in for both the super admin (/admin/login) and
 * resellers (/login). Signing in on the wrong screen fails with the same
 * generic message, so neither screen reveals which accounts exist.
 */
export async function POST(request: Request) {
  let body: { email?: unknown; password?: unknown; area?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: GENERIC }, { status: 400 });
  }
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const area = body.area === 'admin' ? 'admin' : 'reseller';
  if (!email || !password) return NextResponse.json({ error: GENERIC }, { status: 400 });

  const supabase = await createUserClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (/banned/i.test(error.message)) return NextResponse.json({ error: SUSPENDED }, { status: 403 });
    return NextResponse.json({ error: GENERIC }, { status: 401 });
  }

  const ctx = await loadAccessContext(supabase);
  const expected = area === 'admin' ? 'super_admin' : 'reseller';
  if (!ctx || ctx.role !== expected) {
    await supabase.auth.signOut();
    return NextResponse.json({ error: GENERIC }, { status: 401 });
  }

  if (area === 'admin') return NextResponse.json({ next: ctx.hasTotp ? '/admin/mfa' : '/admin' });

  if (ctx.resellerStatus === 'suspended' || !ctx.resellerStatus) {
    await supabase.auth.signOut();
    return NextResponse.json({ error: SUSPENDED }, { status: 403 });
  }
  if (ctx.resellerStatus === 'pending') return NextResponse.json({ next: '/auth/set-password' });
  return NextResponse.json({ next: '/dashboard' });
}
