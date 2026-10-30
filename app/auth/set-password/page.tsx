import type { Metadata } from 'next';
import { createUserClient } from '@/lib/supabase/ssr';
import AuthShell, { FormError } from '@/components/AuthShell';
import SetPasswordForm from '@/components/SetPasswordForm';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Boostov',
  robots: { index: false, follow: false },
};

export default async function SetPasswordPage() {
  const { data } = await createUserClient().auth.getUser();
  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <AuthShell title="Choose a password" subtitle={data.user?.email || 'Boostov'}>
        {data.user ? (
          <SetPasswordForm />
        ) : (
          <FormError message="This link has expired or was already used. Ask Boostov to send you a new one." />
        )}
      </AuthShell>
    </div>
  );
}
