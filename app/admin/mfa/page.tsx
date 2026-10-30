import { requirePage } from '@/lib/authz';
import AuthShell from '@/components/AuthShell';
import AdminMfaPanel from '@/components/AdminMfaPanel';

export const dynamic = 'force-dynamic';

/**
 * TOTP step of the super admin sign-in. First time: enrol an authenticator.
 * After that: enter the 6-digit code. From a verified session: add a backup device.
 */
export default async function AdminMfaPage() {
  const { ctx, supabase } = await requirePage('admin-mfa');
  const { data } = await supabase.auth.mfa.listFactors();
  const devices = (data?.totp ?? []).map((f) => ({ id: f.id, name: f.friendly_name || 'Authenticator' }));

  const mode = !ctx.hasTotp ? 'enroll' : ctx.aal === 'aal2' ? 'manage' : 'verify';

  return (
    <AuthShell
      title="Two-factor sign-in"
      subtitle={mode === 'enroll' ? 'Set up your authenticator app' : 'Boostov Admin'}
    >
      <AdminMfaPanel mode={mode} devices={devices} />
    </AuthShell>
  );
}
