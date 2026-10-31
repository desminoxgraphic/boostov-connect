import { NextResponse } from 'next/server';
import { createUserClient } from '@/lib/supabase/ssr';
import { afterSignIn } from '@/lib/post-login';

/** Google sends the person back here; only invited emails get through. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  if (!code) return NextResponse.redirect(new URL('/login?error=google', url.origin), 303);

  const supabase = await createUserClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error('Google callback failed:', error.message);
    return NextResponse.redirect(new URL('/login?error=google', url.origin), 303);
  }

  const result = await afterSignIn(supabase, 'google');
  const target = result.ok ? result.next : `/login?error=${result.code}`;
  return NextResponse.redirect(new URL(target, url.origin), 303);
}
