'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Loader2, Mail } from 'lucide-react';
import { FormError } from './AuthShell';

type Step = 'email' | 'code' | 'password';

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

/** The one sign-in screen: Google, or email + one-time code. */
export default function LoginPanel({
  initialError,
  passwordEnabled,
}: {
  initialError: string | null;
  passwordEnabled: boolean;
}) {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const [resendIn, setResendIn] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = window.setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [resendIn]);

  const sendCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const { ok, data } = await postJson('/api/auth/otp/send', { email });
    setBusy(false);
    if (!ok) return setError(data.error || 'Could not send the code.');
    setStep('code');
    setCode('');
    setResendIn(60);
    window.setTimeout(() => codeRef.current?.focus(), 50);
  };

  const verifyCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const { ok, data } = await postJson('/api/auth/otp/verify', { email, code });
    if (!ok || !data.next) {
      setBusy(false);
      return setError(data.error || 'That code did not work.');
    }
    window.location.href = data.next;
  };

  const signInWithPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const { ok, data } = await postJson('/api/auth/login', { email, password });
    if (!ok || !data.next) {
      setBusy(false);
      return setError(data.error || 'Sign in failed.');
    }
    window.location.href = data.next;
  };

  if (step === 'code') {
    return (
      <form onSubmit={verifyCode} className="space-y-4">
        <button
          type="button"
          onClick={() => { setStep('email'); setError(null); }}
          className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-muted hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> {email}
        </button>
        <div>
          <label className="ct-label" htmlFor="login-code">Code from your email</label>
          <input
            ref={codeRef}
            id="login-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={10}
            required
            value={code}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, '');
              setCode(v);
            }}
            className="ct-control ct-num text-center text-[24px] tracking-[0.35em]"
            placeholder="••••••"
          />
          <p className="ct-hint">We sent a code to {email}. It expires in a few minutes. Check spam too.</p>
        </div>
        <FormError message={error} />
        <button type="submit" disabled={busy || code.length < 6} className="sh-save h-12">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          <span>Sign in</span>
        </button>
        <button
          type="button"
          disabled={busy || resendIn > 0}
          onClick={() => sendCode()}
          className="w-full text-center text-[12.5px] font-semibold text-brand-text disabled:text-muted"
        >
          {resendIn > 0 ? `Send a new code in ${resendIn}s` : 'Send a new code'}
        </button>
      </form>
    );
  }

  if (step === 'password') {
    return (
      <form onSubmit={signInWithPassword} className="space-y-4">
        <button
          type="button"
          onClick={() => { setStep('email'); setError(null); }}
          className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-muted hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>
        <div>
          <label className="ct-label" htmlFor="login-email-pw">Email</label>
          <input id="login-email-pw" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} className="ct-control" />
        </div>
        <div>
          <label className="ct-label" htmlFor="login-password">Password</label>
          <input id="login-password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="ct-control" />
          <p className="ct-hint">Temporary. Turns off once the Boostov admin has signed in with Google or a code.</p>
        </div>
        <FormError message={error} />
        <button type="submit" disabled={busy} className="sh-save h-12">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          <span>Sign in with password</span>
        </button>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      <a
        href="/api/auth/google"
        className="flex h-12 w-full items-center justify-center gap-3 rounded-[16px] border border-line-strong bg-surface text-[14.5px] font-semibold text-ink shadow-sm transition-colors hover:bg-surface-2"
      >
        <GoogleMark />
        Continue with Google
      </a>
      <div className="flex items-center gap-3 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-muted">
        <span className="h-px flex-1 bg-[var(--border)]" /> or <span className="h-px flex-1 bg-[var(--border)]" />
      </div>
      <form onSubmit={sendCode} className="space-y-3">
        <div>
          <label className="ct-label" htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="ct-control"
            placeholder="you@example.com"
          />
        </div>
        <FormError message={error} />
        <button type="submit" disabled={busy} className="sh-save h-12">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
          <span>Email me a sign-in code</span>
        </button>
      </form>
      <p className="text-center text-[12px] leading-relaxed text-muted">
        Access is by invitation. Use the email Boostov added for you.
      </p>
      {passwordEnabled && (
        <button
          type="button"
          onClick={() => { setStep('password'); setError(null); }}
          className="w-full text-center text-[12px] font-semibold text-muted underline-offset-2 hover:text-ink hover:underline"
        >
          Sign in with password instead
        </button>
      )}
    </div>
  );
}
