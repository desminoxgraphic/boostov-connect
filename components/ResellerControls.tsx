'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Loader2, Pause, Play } from 'lucide-react';
import ResellerLinkResult from './ResellerLinkResult';
import { FormError } from './AuthShell';
import type { ResellerRow } from '@/lib/reseller-data';

type LinkResult = { kind: 'setup' | 'reset'; link: string; whatsapp_url: string };

/** Super admin actions on one reseller. Every action is checked again on the server. */
export default function ResellerControls({
  reseller,
  lastLinkLabel,
}: {
  reseller: ResellerRow;
  /** Formatted on the server, so server and browser render the same text. */
  lastLinkLabel: string | null;
}) {
  const router = useRouter();
  const [limit, setLimit] = useState(String(reseller.merchant_limit));
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [link, setLink] = useState<LinkResult | null>(null);

  const patch = async (key: string, body: Record<string, unknown>, done: string) => {
    setBusy(key);
    setError(null);
    setSaved(null);
    try {
      const res = await fetch(`/api/admin/resellers/${reseller.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not save.');
      setSaved(done);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.');
    } finally {
      setBusy(null);
    }
  };

  const generateLink = async () => {
    setBusy('link');
    setError(null);
    setLink(null);
    try {
      const res = await fetch(`/api/admin/resellers/${reseller.id}/link`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not generate the link.');
      setLink(data);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not generate the link.');
    } finally {
      setBusy(null);
    }
  };

  const suspended = reseller.status === 'suspended';
  const spinner = (key: string) => (busy === key ? <Loader2 className="h-4 w-4 animate-spin" /> : null);

  return (
    <div className="space-y-5">
      <section className="ct-card space-y-4 p-5 sm:p-6">
        <h2 className="ct-section-title">Limits & products</h2>
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            patch('limit', { merchant_limit: limit }, 'Limit saved.');
          }}
        >
          <div className="flex-1">
            <label className="ct-label" htmlFor="limit">Merchant limit</label>
            <input id="limit" inputMode="numeric" value={limit} onChange={(e) => setLimit(e.target.value)} className="ct-control ct-num" />
          </div>
          <button type="submit" disabled={busy !== null} className="ct-btn ct-btn-md h-[46px] border border-line bg-surface px-5">
            {spinner('limit')} Save
          </button>
        </form>
        <p className="ct-hint">Lowering the limit never removes merchants; it only blocks new ones.</p>

        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-[14px] border border-line bg-surface-2 px-4 py-3">
          <span>
            <span className="block text-[14px] font-semibold text-ink">Grow enabled</span>
            <span className="text-[12px] text-muted">Lets this reseller create Grow merchants</span>
          </span>
          <input
            type="checkbox"
            checked={reseller.grow_enabled}
            disabled={busy !== null}
            onChange={(e) => patch('grow', { grow_enabled: e.target.checked }, e.target.checked ? 'Grow enabled.' : 'Grow disabled.')}
            className="h-5 w-5 accent-[var(--bx-blue)]"
          />
        </label>
      </section>

      <section className="ct-card space-y-4 p-5 sm:p-6">
        <h2 className="ct-section-title">Access</h2>
        <p className="ct-meta">
          {reseller.password_set_at
            ? 'The reseller has set a password. A reset link lets them choose a new one.'
            : 'The reseller has not set a password yet. Send a new setup link if the first one expired.'}
          {lastLinkLabel && ` Last link: ${lastLinkLabel}.`}
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={generateLink} disabled={busy !== null || suspended} className="ct-btn ct-btn-md border border-line bg-surface px-4">
            {spinner('link') ?? <KeyRound className="h-4 w-4" />}
            {reseller.password_set_at ? 'Generate reset link' : 'Generate setup link'}
          </button>
          {suspended ? (
            <button
              type="button"
              onClick={() => patch('status', { status: 'active' }, 'Reseller reactivated.')}
              disabled={busy !== null}
              className="ct-btn ct-btn-md border border-success-border bg-success-soft px-4 text-success"
            >
              {spinner('status') ?? <Play className="h-4 w-4" />} Reactivate
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (confirm(`Suspend ${reseller.name}? They lose access immediately; their merchants stay live.`)) {
                  patch('status', { status: 'suspended' }, 'Reseller suspended.');
                }
              }}
              disabled={busy !== null}
              className="ct-btn ct-btn-md border border-danger-border bg-danger-soft px-4 text-danger"
            >
              {spinner('status') ?? <Pause className="h-4 w-4" />} Suspend
            </button>
          )}
        </div>
        {link && <ResellerLinkResult kind={link.kind} link={link.link} whatsappUrl={link.whatsapp_url} />}
      </section>

      <FormError message={error} />
      {saved && <p role="status" className="text-center text-[13px] font-semibold text-success">{saved}</p>}
    </div>
  );
}
