'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Lock, Loader2 } from 'lucide-react';

const LOGIN_TIMEOUT_MS = 12000;

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), LOGIN_TIMEOUT_MS);

    try {
      let res: Response;
      try {
        res = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password }),
          signal: controller.signal,
        });
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          setError('Login request timed out. Please try again.');
        } else {
          setError('Unable to reach the login service. Please try again.');
        }
        return;
      }

      let data: { success?: boolean; error?: string } | null = null;
      try {
        if (res.headers.get('content-type')?.includes('application/json')) {
          data = await res.json();
        }
      } catch {
        data = null;
      }

      if (!res.ok || !data?.success) {
        setError(data?.error || 'Login failed. Please try again.');
        return;
      }

      router.push('/admin');
      router.refresh();
      window.setTimeout(() => {
        if (window.location.pathname === '/admin/login') {
          window.location.href = '/admin';
        }
      }, 1200);
    } catch (err) {
      setError('An error occurred during login.');
    } finally {
      window.clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  return (
    <div className="sh-page relative flex min-h-dvh items-center justify-center overflow-hidden p-4">
      <span aria-hidden className="sh-login-orbit">
        <span />
        <span />
        <span />
      </span>
      <div className="sh-rise relative w-full max-w-sm">
        <div className="mb-7 text-center">
          <div className="sh-brand-mark mx-auto h-16 w-16 rounded-[22px]">
            <Image src="/boostov-logo.png" alt="" width={46} height={46} priority />
          </div>
          <h1 className="ct-display mt-5 text-[28px]">Boostov Admin</h1>
          <p className="mt-1.5 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted">
            <Lock className="h-3.5 w-3.5" strokeWidth={2.25} />
            Management Portal
          </p>
        </div>

        <form onSubmit={handleLogin} className="ct-card space-y-4 p-6 shadow-lg sm:p-7">
          <div>
            <label className="ct-label" htmlFor="admin-password">
              Admin Password
            </label>
            <input
              id="admin-password"
              type="password"
              placeholder="Enter password…"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="ct-control"
            />
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-[14px] border border-danger-border bg-danger-soft px-3.5 py-2.5 text-center text-[12.5px] font-medium text-danger"
            >
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="sh-save h-12">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Logging in…</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
