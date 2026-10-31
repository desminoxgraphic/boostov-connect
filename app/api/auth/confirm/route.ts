import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createHash } from 'crypto';
import { createUserClient } from '@/lib/supabase/ssr';
import { hardenCookie } from '@/lib/supabase/cookie-options';
import { afterSignIn } from '@/lib/post-login';

/** Remembers, for 10 minutes, which link this browser just used. */
const USED_LINK_COOKIE = 'bx_used_link';

function fingerprint(tokenHash: string): string {
  return createHash('sha256').update(tokenHash).digest('base64url');
}

/**
 * Consumes a one-time sign-in link (the emergency link printed by
 * scripts/create-super-admin.mjs). Only reachable through the Continue button on
 * /auth/confirm (a POST), so a chat app's link preview cannot burn it. Pressing
 * Continue twice in the same browser still signs in.
 */
export async function POST(request: Request) {
  const form = await request.formData();
  const tokenHash = String(form.get('token_hash') || '');
  const base = new URL(request.url);
  if (!tokenHash) return NextResponse.redirect(new URL('/login?error=expired', base), 303);

  const store = await cookies();
  const supabase = await createUserClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' });

  if (error) {
    const sameLink = store.get(USED_LINK_COOKIE)?.value === fingerprint(tokenHash);
    const { data } = sameLink ? await supabase.auth.getUser() : { data: { user: null } };
    if (!(sameLink && data.user)) return NextResponse.redirect(new URL('/login?error=expired', base), 303);
  } else {
    store.set(USED_LINK_COOKIE, fingerprint(tokenHash), { ...hardenCookie(), maxAge: 600 });
  }

  const result = await afterSignIn(supabase, 'link');
  return NextResponse.redirect(new URL(result.ok ? result.next : `/login?error=${result.code}`, base), 303);
}
