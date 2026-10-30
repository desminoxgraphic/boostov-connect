import AuthShell from '@/components/AuthShell';
import SignInForm from '@/components/SignInForm';

export default function AdminLoginPage() {
  return (
    <AuthShell title="Boostov Admin" subtitle="Management portal">
      <SignInForm area="admin" />
    </AuthShell>
  );
}
