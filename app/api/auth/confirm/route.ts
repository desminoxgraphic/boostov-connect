import { NextResponse } from 'next/server';
import { createUserClient } from '@/lib/supabase/ssr';

/**
 * Consumes a setup / reset link. Only reachable through the Continue button on
 * /auth/confirm (a POST), so a chat app's link preview, which only GETs the
 * page, cannot burn the one-time token.
 */
export async function POST(request: Request) {
  const form = await request.formData();
  const tokenHash = String(form.get('token_hash') || '');
  const base = new URL(request.url);

  if (!tokenHash) return NextResponse.redirect(new URL('/auth/confirm?error=invalid', base), 303);

  const supabase = createUserClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' });
  if (error) return NextResponse.redirect(new URL('/auth/confirm?error=expired', base), 303);

  return NextResponse.redirect(new URL('/auth/set-password', base), 303);
}
