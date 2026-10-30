import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createHash } from 'crypto';
import { createUserClient } from '@/lib/supabase/ssr';
import { hardenCookie } from '@/lib/supabase/cookie-options';

/** Remembers, for 10 minutes, which link this browser just used. */
const USED_LINK_COOKIE = 'bx_used_link';

function fingerprint(tokenHash: string): string {
  return createHash('sha256').update(tokenHash).digest('base64url');
}

/**
 * Consumes a setup / reset link. Only reachable through the Continue button on
 * /auth/confirm (a POST), so a chat app's link preview, which only GETs the
 * page, cannot burn the one-time token.
 *
 * Pressing Continue twice, or reloading, re-sends the same one-time token. If
 * this browser already used exactly that link a moment ago and is signed in,
 * it goes on to the password screen instead of showing "expired".
 */
export async function POST(request: Request) {
  const form = await request.formData();
  const tokenHash = String(form.get('token_hash') || '');
  const base = new URL(request.url);

  if (!tokenHash) return NextResponse.redirect(new URL('/auth/confirm?error=invalid', base), 303);

  const store = cookies();
  const supabase = createUserClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' });

  if (error) {
    const sameLink = store.get(USED_LINK_COOKIE)?.value === fingerprint(tokenHash);
    const { data } = sameLink ? await supabase.auth.getUser() : { data: { user: null } };
    if (sameLink && data.user) return NextResponse.redirect(new URL('/auth/set-password', base), 303);
    return NextResponse.redirect(new URL('/auth/confirm?error=expired', base), 303);
  }

  store.set(USED_LINK_COOKIE, fingerprint(tokenHash), { ...hardenCookie(), maxAge: 600 });
  return NextResponse.redirect(new URL('/auth/set-password', base), 303);
}
