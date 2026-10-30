import type { Metadata } from 'next';
import { ArrowRight } from 'lucide-react';
import AuthShell, { FormError } from '@/components/AuthShell';

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
          <form method="post" action="/api/auth/confirm" className="space-y-4">
            <p className="ct-meta">Press Continue to choose your password.</p>
            <input type="hidden" name="token_hash" value={tokenHash} />
            <button type="submit" className="sh-save h-12">
              <span>Continue</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        )}
      </AuthShell>
    </div>
  );
}
