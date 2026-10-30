'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2, ShieldCheck, Smartphone } from 'lucide-react';
import { FormError } from './AuthShell';

type Mode = 'enroll' | 'verify' | 'manage';
type Enrolment = { factorId: string; qrCode: string; secret: string };

export default function AdminMfaPanel({
  mode,
  devices,
}: {
  mode: Mode;
  devices: { id: string; name: string }[];
}) {
  const [enrolment, setEnrolment] = useState<Enrolment | null>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startEnrol = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/mfa/enroll', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not start 2FA setup.');
      setEnrolment(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start 2FA setup.');
    } finally {
      setLoading(false);
    }
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, factorId: enrolment?.factorId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'That code is not valid.');
      window.location.href = data.next || '/admin';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That code is not valid.');
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  const codeForm = (
    <form onSubmit={verify} className="space-y-4">
      <div>
        <label className="ct-label" htmlFor="totp-code">
          6-digit code
        </label>
        <input
          id="totp-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]*"
          maxLength={7}
          autoFocus
          required
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="ct-control ct-num text-center text-[22px] tracking-[0.3em]"
          placeholder="000000"
        />
      </div>
      <FormError message={error} />
      <button type="submit" disabled={loading} className="sh-save h-12">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
        <span>Verify</span>
      </button>
    </form>
  );

  if (enrolment) {
    return (
      <div className="space-y-4">
        <p className="ct-meta">
          Scan this QR code with Google Authenticator, 1Password or Authy, then type the code it shows.
        </p>
        <div className="mx-auto w-fit rounded-[18px] bg-white p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={enrolment.qrCode} alt="Authenticator QR code" width={184} height={184} />
        </div>
        <details className="ct-inset text-[12px]">
          <summary className="cursor-pointer font-semibold text-ink-2">Can't scan? Enter this key</summary>
          <code className="ct-num mt-2 block break-all text-ink">{enrolment.secret}</code>
        </details>
        {codeForm}
      </div>
    );
  }

  if (mode === 'verify') {
    return (
      <div className="space-y-4">
        <p className="ct-meta">Open your authenticator app and enter the current code for Boostov.</p>
        {codeForm}
      </div>
    );
  }

  if (mode === 'enroll') {
    return (
      <div className="space-y-4">
        <p className="ct-meta">
          Your admin account needs a second step. You will scan a QR code once; after that, every sign-in asks
          for a 6-digit code from your phone.
        </p>
        <FormError message={error} />
        <button type="button" onClick={startEnrol} disabled={loading} className="sh-save h-12">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
          <span>Set up authenticator</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="ct-meta">2FA is on. Registered devices:</p>
      <ul className="space-y-2">
        {devices.map((d) => (
          <li key={d.id} className="ct-inset flex items-center gap-2.5 py-3 text-[13px] font-semibold text-ink">
            <Smartphone className="h-4 w-4 text-brand-text" />
            {d.name}
          </li>
        ))}
      </ul>
      <p className="ct-hint">Add a second phone as a backup in case you lose this one.</p>
      <FormError message={error} />
      <button
        type="button"
        onClick={startEnrol}
        disabled={loading}
        className="ct-btn ct-btn-md w-full border border-line bg-surface"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
        Add a backup device
      </button>
      <Link href="/admin" className="sh-save h-12">
        Go to admin panel
      </Link>
    </div>
  );
}
