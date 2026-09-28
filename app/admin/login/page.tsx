'use client';

import React, { useState } from 'react';
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
    <div className="flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="ct-tile mx-auto mb-4 h-14 w-14 bg-brand-soft text-brand-text">
            <Lock className="h-6 w-6" strokeWidth={2} />
          </div>
          <h1 className="ct-display text-[24px]">CARDIFY Admin</h1>
          <p className="ct-meta mt-1.5">Management Portal</p>
        </div>

        <form onSubmit={handleLogin} className="ct-card space-y-4 p-6">
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
              className="rounded-control border border-danger-border bg-danger-soft px-3.5 py-2.5 text-center text-[12.5px] font-medium text-danger"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="ct-btn ct-btn-md w-full bg-brand text-on-brand shadow-sm hover:bg-brand-hover"
          >
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