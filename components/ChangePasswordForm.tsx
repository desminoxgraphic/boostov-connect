'use client';

import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { FormError } from './AuthShell';

/** Signed-in admin or reseller chooses a new password for themselves. */
export default function ChangePasswordForm() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setSaved(false);
    if (password !== confirm) return setError('Les deux mots de passe ne sont pas identiques.');
    setBusy(true);
    setError(null);
    const res = await fetch('/api/auth/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error || 'Impossible d’enregistrer le mot de passe.');
    setSaved(true);
    setPassword('');
    setConfirm('');
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="ct-label" htmlFor="new-pw">Nouveau mot de passe</label>
        <input id="new-pw" type="password" autoComplete="new-password" required minLength={10} value={password} onChange={(e) => setPassword(e.target.value)} className="ct-control" />
        <p className="ct-hint">Au moins 10 caractères, avec des lettres et un chiffre.</p>
      </div>
      <div>
        <label className="ct-label" htmlFor="new-pw2">Répéter le mot de passe</label>
        <input id="new-pw2" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} className="ct-control" />
      </div>
      <FormError message={error} />
      {saved && (
        <p role="status" className="flex items-center justify-center gap-2 text-[13.5px] font-semibold text-success">
          <Check className="h-4 w-4" /> Mot de passe enregistré.
        </p>
      )}
      <button type="submit" disabled={busy} className="sh-save h-12">
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        <span>Enregistrer</span>
      </button>
    </form>
  );
}
