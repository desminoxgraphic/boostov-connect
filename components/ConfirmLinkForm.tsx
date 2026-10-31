'use client';

import { useState } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';

/** Continue button for setup/reset links; disables itself so it is sent once. */
export default function ConfirmLinkForm({ tokenHash }: { tokenHash: string }) {
  const [sent, setSent] = useState(false);
  return (
    <form
      method="post"
      action="/api/auth/confirm"
      className="space-y-4"
      onSubmit={(e) => {
        if (sent) e.preventDefault();
        else setSent(true);
      }}
    >
      <p className="ct-meta">Press Continue to sign in.</p>
      <input type="hidden" name="token_hash" value={tokenHash} />
      <button type="submit" aria-disabled={sent} className="sh-save h-12">
        {sent ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        <span>{sent ? 'Opening…' : 'Continue'}</span>
        {!sent && <ArrowRight className="h-4 w-4" />}
      </button>
    </form>
  );
}
