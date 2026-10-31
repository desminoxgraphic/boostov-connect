import { NextResponse } from 'next/server';
import { createUserClient } from '@/lib/supabase/ssr';
import { loadAccessContext } from '@/lib/authz';
import { supabaseServer } from '@/lib/supabase/server';
import { validatePassword } from '@/lib/reseller-validation';

export async function POST(request: Request) {
  let body: { password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Choose a password.' }, { status: 400 });
  }
  const password = typeof body.password === 'string' ? body.password : '';
  const problem = validatePassword(password);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  const supabase = await createUserClient();
  const ctx = await loadAccessContext(supabase);
  if (!ctx || !ctx.role) {
    return NextResponse.json({ error: 'This link has expired. Ask Boostov for a new one.' }, { status: 401 });
  }
  if (ctx.role === 'reseller' && ctx.resellerStatus === 'suspended') {
    await supabase.auth.signOut();
    return NextResponse.json({ error: 'This account is suspended. Contact Boostov.' }, { status: 403 });
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    const reused = /different from the old/i.test(error.message);
    return NextResponse.json(
      { error: reused ? 'Choose a password you have not used before.' : 'Could not save the password. Try again.' },
      { status: 400 }
    );
  }

  if (ctx.role === 'reseller' && supabaseServer) {
    const now = new Date().toISOString();
    await supabaseServer.from('resellers').update({ password_set_at: now, updated_at: now }).eq('id', ctx.userId);
    await supabaseServer.from('resellers').update({ status: 'active' }).eq('id', ctx.userId).eq('status', 'pending');
    return NextResponse.json({ next: '/dashboard' });
  }

  return NextResponse.json({ next: '/admin' });
}
