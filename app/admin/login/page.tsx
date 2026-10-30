import AuthShell from '@/components/AuthShell';
import SignInForm from '@/components/SignInForm';

export default function AdminLoginPage() {
  return (
    <AuthShell title="Boostov Admin" subtitle="Password, then your 2FA code">
      <SignInForm area="admin" />
    </AuthShell>
  );
}
