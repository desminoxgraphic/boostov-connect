import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import AuthShell from '@/components/AuthShell';
import LoginPanel from '@/components/LoginPanel';
import { createUserClient } from '@/lib/supabase/ssr';
import { loadAccessContext } from '@/lib/authz';
import { LOGIN_MESSAGES, passwordLoginEnabled } from '@/lib/post-login';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Sign in · Boostov',
  robots: { index: false, follow: false },
};

/** The single sign-in page for the super admin and every reseller. */
export default async function LoginPage(props: { searchParams: Promise<{ error?: string; suspended?: string }> }) {
  const searchParams = await props.searchParams;

  // Already signed in: go straight to the right place.
  const ctx = await loadAccessContext(await createUserClient());
  if (ctx?.role === 'super_admin') redirect(ctx.hasTotp && ctx.aal !== 'aal2' ? '/admin/mfa' : '/admin');
  if (ctx?.role === 'reseller' && ctx.resellerStatus === 'active') redirect('/dashboard');

  const errorKey = searchParams.suspended ? 'suspended' : searchParams.error;
  const initialError = errorKey ? LOGIN_MESSAGES[errorKey] ?? LOGIN_MESSAGES.error : null;

  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <AuthShell title="Sign in to Boostov" subtitle="Partners and admin">
        <LoginPanel initialError={initialError} passwordEnabled={await passwordLoginEnabled()} />
      </AuthShell>
    </div>
  );
}
