import { NextResponse } from 'next/server';
import { createUserClient } from '@/lib/supabase/ssr';

/** Starts "Continue with Google". Google sends the person back to /auth/callback. */
export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const supabase = await createUserClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback`,
      skipBrowserRedirect: true,
      queryParams: { prompt: 'select_account' },
    },
  });
  if (error || !data?.url) {
    console.error('Google sign-in start failed:', error?.message);
    return NextResponse.redirect(new URL('/login?error=google', origin), 303);
  }
  return NextResponse.redirect(data.url, 303);
}
