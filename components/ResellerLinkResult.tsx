'use client';

import { MessageCircle } from 'lucide-react';
import CopyButton from './CopyButton';

/** Shows a freshly generated setup/reset link with Copy and Send on WhatsApp. */
export default function ResellerLinkResult({
  kind,
  link,
  whatsappUrl,
}: {
  kind: 'setup' | 'reset';
  link: string;
  whatsappUrl: string;
}) {
  return (
    <div className="space-y-3 rounded-[18px] border border-success-border bg-success-soft p-4">
      <p className="text-[13px] font-semibold text-success">
        {kind === 'setup' ? 'Setup link ready' : 'Password reset link ready'} — it works once.
      </p>
      <p className="ct-num break-all rounded-[12px] bg-surface px-3 py-2 text-[11.5px] text-ink-2">{link}</p>
      <div className="flex flex-wrap gap-2">
        <CopyButton value={link} label="Copy link" />
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
          className="ct-btn ct-btn-sm h-10 bg-[#25D366] px-4 text-white hover:brightness-95"
        >
          <MessageCircle className="h-4 w-4" /> Send on WhatsApp
        </a>
      </div>
    </div>
  );
}
