import type { Metadata } from 'next';
import AuthShell, { FormError } from '@/components/AuthShell';
import ConfirmLinkForm from '@/components/ConfirmLinkForm';

export const metadata: Metadata = {
  title: 'Boostov',
  robots: { index: false, follow: false },
};

/**
 * Landing page of a setup / reset link. Opening it changes nothing: the
 * one-time token is only used when the person presses Continue (a POST),
 * so link previews in WhatsApp cannot consume it.
 */
export default function ConfirmLinkPage({
  searchParams,
}: {
  searchParams: { token_hash?: string; error?: string };
}) {
  const tokenHash = searchParams.token_hash || '';
  const failed = searchParams.error === 'expired' || searchParams.error === 'invalid' || !tokenHash;

  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <AuthShell title="Welcome to Boostov" subtitle="Secure account link">
        {failed ? (
          <FormError message="This link has expired or was already used. Ask Boostov to send you a new one." />
        ) : (
          <ConfirmLinkForm tokenHash={tokenHash} />
        )}
      </AuthShell>
    </div>
  );
}
