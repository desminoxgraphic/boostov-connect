import type { Metadata } from 'next';
import AuthShell from '@/components/AuthShell';
import SignInForm from '@/components/SignInForm';

export const metadata: Metadata = {
  title: 'Boostov Partner',
  robots: { index: false, follow: false },
};

export default async function ResellerLoginPage(props: { searchParams: Promise<{ suspended?: string }> }) {
  const searchParams = await props.searchParams;
  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <AuthShell title="Boostov Partner" subtitle="Reseller space">
        <SignInForm
          area="reseller"
          notice={searchParams.suspended ? 'This account is suspended. Contact Boostov.' : undefined}
        />
      </AuthShell>
    </div>
  );
}
