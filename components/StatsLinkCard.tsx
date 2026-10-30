'use client';

import { useState } from 'react';
import { ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import CopyButton from './CopyButton';

/** The merchant's secret stats link, with copy and regenerate. */
export default function StatsLinkCard({ merchantId, initialUrl }: { merchantId: string; initialUrl: string }) {
  const [url, setUrl] = useState(initialUrl);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const regenerate = async () => {
    if (!confirm('Create a new stats link? The current link will stop working immediately.')) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/reseller/merchants/${merchantId}/stats-token`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.stats_url) throw new Error(data.error || 'Could not create a new link.');
      setUrl(data.stats_url);
      setMessage('New link created. Send it to the merchant again.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not create a new link.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="ct-card space-y-4 p-5 sm:p-6">
      <div>
        <h2 className="ct-section-title">Merchant stats link</h2>
        <p className="ct-meta mt-1.5">
          A private, read-only page with this merchant&apos;s taps. Anyone with the link can open it, so only share it
          with the merchant.
        </p>
      </div>
      <div className="sh-url">
        <div className="min-w-0">
          <span className="sh-url-label">Secret link</span>
          <span className="ct-num mt-0.5 block truncate text-[11.5px] text-ink-2">{url.replace(/([^/]{8})[^/]+$/, '$1…')}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <CopyButton value={url} />
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="ct-btn ct-btn-icon h-9 w-9 bg-surface"
            title="Open"
            aria-label="Open stats page"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
      <button
        type="button"
        onClick={regenerate}
        disabled={busy}
        className="ct-btn ct-btn-sm h-10 border border-line bg-surface px-4"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        Regenerate link
      </button>
      {message && <p className="ct-hint">{message}</p>}
    </section>
  );
}
