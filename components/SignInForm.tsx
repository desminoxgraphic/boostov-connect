'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { FormError } from './AuthShell';

/** Email + password step, shared by /admin/login and /login. */
export default function SignInForm({ area, notice }: { area: 'admin' | 'reseller'; notice?: string }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(notice ?? null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, area }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.next) {
        setError(data.error || 'Sign in failed. Try again.');
        return;
      }
      window.location.href = data.next;
    } catch {
      setError('Cannot reach the server. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="ct-label" htmlFor="signin-email">
          Email
        </label>
        <input
          id="signin-email"
          type="email"
          inputMode="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="ct-control"
          placeholder="you@example.com"
        />
      </div>
      <div>
        <label className="ct-label" htmlFor="signin-password">
          Password
        </label>
        <input
          id="signin-password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="ct-control"
          placeholder="Your password"
        />
      </div>
      <FormError message={error} />
      <button type="submit" disabled={loading} className="sh-save h-12">
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Signing in…</span>
          </>
        ) : (
          <span>Sign in</span>
        )}
      </button>
    </form>
  );
}
