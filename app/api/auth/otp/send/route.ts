import { NextResponse } from 'next/server';
import { createUserClient } from '@/lib/supabase/ssr';
import { supabaseServer } from '@/lib/supabase/server';
import { LOGIN_MESSAGES, normalizeEmail } from '@/lib/post-login';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Step 1 of email sign-in: sends a one-time code, only to invited emails.
 * Supabase never creates an account here (shouldCreateUser: false).
 */
export async function POST(request: Request) {
  let email = '';
  try {
    email = normalizeEmail((await request.json())?.email);
  } catch {
    /* handled below */
  }
  if (!EMAIL.test(email)) return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  if (!supabaseServer) return NextResponse.json({ error: LOGIN_MESSAGES.error }, { status: 503 });

  const { data } = await supabaseServer.rpc('invited_access', { p_email: email });
  const access = Array.isArray(data) ? data[0] : null;
  if (!access) return NextResponse.json({ error: LOGIN_MESSAGES.no_access, code: 'no_access' }, { status: 403 });
  if (access.role === 'reseller' && access.reseller_status === 'suspended') {
    return NextResponse.json({ error: LOGIN_MESSAGES.suspended, code: 'suspended' }, { status: 403 });
  }

  const supabase = await createUserClient();
  const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
  if (error) {
    const limited = error.status === 429 || /rate|seconds|too many/i.test(error.message);
    console.error('OTP send failed:', error.status, error.message);
    return NextResponse.json(
      {
        error: limited
          ? 'Too many codes requested. Wait a minute and try again.'
          : 'We could not send the code right now. Try again in a moment, or continue with Google.',
      },
      { status: limited ? 429 : 502 }
    );
  }
  return NextResponse.json({ sent: true });
}
