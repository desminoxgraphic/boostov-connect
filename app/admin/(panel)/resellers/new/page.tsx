'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import AdminTopBar from '@/components/AdminTopBar';
import ResellerLinkResult from '@/components/ResellerLinkResult';
import { FormError } from '@/components/AuthShell';
import { DEFAULT_MERCHANT_LIMIT } from '@/lib/reseller-validation';

type Created = { id: string; kind?: 'setup' | 'reset'; link?: string; whatsapp_url?: string; link_error?: string };

export default function NewResellerPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [limit, setLimit] = useState(String(DEFAULT_MERCHANT_LIMIT));
  const [grow, setGrow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Created | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setError(null);
    setSaving(true);
    try {
      const res = await fetch('/api/admin/resellers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, merchant_limit: limit, grow_enabled: grow }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not create the reseller.');
      setCreated(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the reseller.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="sh-page min-h-dvh">
      <AdminTopBar
        title="New reseller"
        subtitle="Starter Kit partner"
        narrow
        leading={
          <Link href="/admin/resellers" className="ct-btn ct-btn-icon h-10 w-10 border border-line bg-surface" aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        }
      />
      <main className="mx-auto max-w-3xl space-y-5 px-4 pb-12 pt-5 sm:pt-8">
        {created ? (
          <section className="ct-card sh-rise space-y-4 p-5 sm:p-6">
            <h2 className="ct-section-title">{name} is created</h2>
            {created.link && created.kind && created.whatsapp_url ? (
              <ResellerLinkResult kind={created.kind} link={created.link} whatsappUrl={created.whatsapp_url} />
            ) : (
              <FormError message={created.link_error || 'The link could not be generated. Open the reseller to try again.'} />
            )}
            <div className="flex flex-wrap gap-2">
              <Link href={`/admin/resellers/${created.id}`} className="sh-btn-primary">
                Open reseller
              </Link>
              <Link href="/admin/resellers" className="ct-btn ct-btn-md border border-line bg-surface">
                All resellers
              </Link>
            </div>
          </section>
        ) : (
          <form onSubmit={submit} className="ct-card sh-rise space-y-5 p-5 sm:p-6">
            <div>
              <label className="ct-label" htmlFor="r-name">Name</label>
              <input id="r-name" required value={name} onChange={(e) => setName(e.target.value)} className="ct-control" placeholder="Full name or company" />
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className="ct-label" htmlFor="r-email">Email (their login)</label>
                <input id="r-email" type="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="ct-control" />
              </div>
              <div>
                <label className="ct-label" htmlFor="r-phone">WhatsApp phone</label>
                <input id="r-phone" type="tel" inputMode="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} className="ct-control" placeholder="+212 6…" />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className="ct-label" htmlFor="r-limit">Merchant limit</label>
                <input id="r-limit" inputMode="numeric" value={limit} onChange={(e) => setLimit(e.target.value)} className="ct-control ct-num" />
              </div>
              <label className="flex cursor-pointer items-center justify-between gap-3 self-end rounded-[14px] border border-line bg-surface-2 px-4 py-3">
                <span>
                  <span className="block text-[14px] font-semibold text-ink">Enable Grow</span>
                  <span className="text-[12px] text-muted">Off by default: Connect only</span>
                </span>
                <input type="checkbox" checked={grow} onChange={(e) => setGrow(e.target.checked)} className="h-5 w-5 accent-[var(--bx-blue)]" />
              </label>
            </div>
            <p className="ct-hint">
              No email is sent. You get a one-time setup link to send on WhatsApp; the reseller opens it and chooses a password.
            </p>
            <FormError message={error} />
            <button type="submit" disabled={saving} className="sh-save">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              <span>Create reseller</span>
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
