'use client';

import { useState } from 'react';
import { Loader2, MessageCircle } from 'lucide-react';

/** Email + password sign-in, shared by the admin and resellers. */
export default function PasswordLoginForm({ initialError, supportUrl }: { initialError: string | null; supportUrl: string }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const [forgot, setForgot] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.next) {
        setError(data.error || 'La connexion a échoué.');
        setBusy(false);
        return;
      }
      window.location.href = data.next;
    } catch {
      setError('Connexion impossible. Vérifiez votre réseau.');
      setBusy(false);
    }
  };

  const input =
    'h-12 w-full rounded-[14px] border border-[#d9deea] bg-white px-4 text-[15px] text-[#0b1530] outline-none transition focus:border-[#1d5cff] focus:ring-4 focus:ring-[#1d5cff]/15';

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="cx-email" className="mb-1.5 block text-[13.5px] font-semibold text-[#0b1530]">E-mail</label>
        <input
          id="cx-email"
          type="email"
          inputMode="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={input}
        />
      </div>
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label htmlFor="cx-password" className="text-[13.5px] font-semibold text-[#0b1530]">Mot de passe</label>
          <button type="button" onClick={() => setForgot((v) => !v)} className="text-[13px] font-semibold text-[#1d5cff] hover:underline">
            Mot de passe oublié ?
          </button>
        </div>
        <div className="relative">
          <input
            id="cx-password"
            type={show ? 'text' : 'password'}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`${input} pr-24`}
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-[10px] px-3 py-1.5 text-[13px] font-semibold text-[#3a4357] hover:bg-black/[0.05]"
          >
            {show ? 'Masquer' : 'Afficher'}
          </button>
        </div>
      </div>

      {forgot && (
        <div className="rounded-[14px] bg-[#f1f5ff] p-3.5 text-[13.5px] leading-relaxed text-[#3a4357]">
          Boostov vous envoie un nouveau mot de passe.
          <a href={supportUrl} target="_blank" rel="noreferrer" className="mt-2 flex w-fit items-center gap-1.5 font-semibold text-[#128c4a]">
            <MessageCircle className="h-4 w-4" /> Demander sur WhatsApp
          </a>
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-[14px] border border-[#f5c2c2] bg-[#fff1f1] px-4 py-3 text-center text-[13.5px] font-medium text-[#b42318]">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-[#1d5cff] text-[15px] font-semibold text-white shadow-[0_10px_24px_-12px_rgba(29,92,255,0.9)] transition hover:bg-[#164de0] disabled:opacity-60"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        Se connecter
      </button>
    </form>
  );
}
