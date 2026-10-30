'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { FormError } from './AuthShell';

export default function SetPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.next) throw new Error(data.error || 'Could not save the password.');
      window.location.href = data.next;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="ct-label" htmlFor="new-password">
          New password
        </label>
        <input
          id="new-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="ct-control"
        />
        <p className="ct-hint">At least 10 characters, with letters and a number.</p>
      </div>
      <div>
        <label className="ct-label" htmlFor="confirm-password">
          Repeat password
        </label>
        <input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="ct-control"
        />
      </div>
      <FormError message={error} />
      <button type="submit" disabled={loading} className="sh-save h-12">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        <span>Save and continue</span>
      </button>
    </form>
  );
}
