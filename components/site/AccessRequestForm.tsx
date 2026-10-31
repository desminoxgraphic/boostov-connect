'use client';

import { useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';

/** "Demander un accès": stored for the admin, who approves it in the panel. */
export default function AccessRequestForm() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '', website: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/access-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Envoi impossible.');
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Envoi impossible.');
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <CheckCircle2 className="h-12 w-12 text-[#16a34a]" />
        <p className="text-[18px] font-bold text-[#0b1530]">Demande envoyée</p>
        <p className="max-w-[32ch] text-[14.5px] text-[#5b6478]">
          Nous vous contactons rapidement avec votre e-mail et votre mot de passe.
        </p>
      </div>
    );
  }

  const input =
    'h-12 w-full rounded-[14px] border border-[#d9deea] bg-white px-4 text-[15px] text-[#0b1530] outline-none transition focus:border-[#1d5cff] focus:ring-4 focus:ring-[#1d5cff]/15';
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="rq-name" className="mb-1.5 block text-[13.5px] font-semibold text-[#0b1530]">Nom complet</label>
        <input id="rq-name" required value={form.name} onChange={set('name')} className={input} autoComplete="name" />
      </div>
      <div>
        <label htmlFor="rq-email" className="mb-1.5 block text-[13.5px] font-semibold text-[#0b1530]">E-mail</label>
        <input id="rq-email" type="email" inputMode="email" required value={form.email} onChange={set('email')} className={input} autoComplete="email" />
        <p className="mt-1.5 text-[12.5px] text-[#7a8296]">Il servira à vous connecter.</p>
      </div>
      <div>
        <label htmlFor="rq-phone" className="mb-1.5 block text-[13.5px] font-semibold text-[#0b1530]">WhatsApp</label>
        <input id="rq-phone" type="tel" inputMode="tel" value={form.phone} onChange={set('phone')} className={input} placeholder="+212 6…" autoComplete="tel" />
      </div>
      <div>
        <label htmlFor="rq-msg" className="mb-1.5 block text-[13.5px] font-semibold text-[#0b1530]">
          Message <span className="font-normal text-[#7a8296]">(facultatif)</span>
        </label>
        <textarea id="rq-msg" rows={3} value={form.message} onChange={set('message')} className={`${input} h-auto py-3`} />
      </div>
      {/* Hidden from people; bots fill it in. */}
      <input type="text" tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} className="hidden" aria-hidden />
      {error && (
        <p role="alert" className="rounded-[14px] border border-[#f5c2c2] bg-[#fff1f1] px-4 py-3 text-[13.5px] font-medium text-[#b42318]">{error}</p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-[#1d5cff] text-[15px] font-semibold text-white shadow-[0_10px_24px_-12px_rgba(29,92,255,0.9)] transition hover:bg-[#164de0] disabled:opacity-60"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        Envoyer ma demande
      </button>
    </form>
  );
}
