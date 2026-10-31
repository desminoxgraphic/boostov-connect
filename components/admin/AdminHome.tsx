'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BarChart2,
  Check,
  Copy,
  Edit,
  Eye,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  Power,
  KeyRound,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import { generatePassword } from '@/lib/password';
import ConnectLogoAvatar from '@/components/ConnectLogoAvatar';
import { cn } from '@/lib/utils';
import type { AccessRequestRow, AdminCardRow, AdminOverview, ResellerOverviewRow } from '@/lib/admin-overview';

/* ------------------------------------------------------------------ helpers */

function timeAgo(iso: string | null, now: number): string {
  if (!iso) return 'Never';
  const s = Math.max(0, (now - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)} d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

async function send(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      /* clipboard blocked: nothing else to do */
    }
    setCopied(key);
    window.setTimeout(() => setCopied(null), 1600);
  };
  return { copied, copy };
}

const STATUS_STYLE = {
  active: 'border-success-border bg-success-soft text-success',
  pending: 'border-info-border bg-info-soft text-info',
  suspended: 'border-danger-border bg-danger-soft text-danger',
} as const;
const STATUS_LABEL = { active: 'Active', pending: 'Invited', suspended: 'Suspended' } as const;

function StatusPill({ status }: { status: keyof typeof STATUS_STYLE }) {
  return <span className={cn('ct-chip border', STATUS_STYLE[status])}>{STATUS_LABEL[status]}</span>;
}

function IconButton({
  label,
  onClick,
  href,
  children,
  tone = 'default',
  disabled,
}: {
  label: string;
  onClick?: () => void;
  href?: string;
  children: React.ReactNode;
  tone?: 'default' | 'danger' | 'success';
  disabled?: boolean;
}) {
  const className = cn(
    'ct-btn ct-btn-icon h-9 w-9 border bg-surface',
    tone === 'danger' && 'border-danger-border text-danger hover:bg-danger-soft',
    tone === 'success' && 'border-success-border text-success hover:bg-success-soft',
    tone === 'default' && 'border-line hover:bg-surface-2'
  );
  if (href) {
    return (
      <Link href={href} title={label} aria-label={label} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" title={label} aria-label={label} onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ main */

export default function AdminHome({ overview, appUrl, now }: { overview: AdminOverview; appUrl: string; now: number }) {
  const router = useRouter();
  const [adding, setAdding] = useState<AddPrefill | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { totals } = overview;

  const run = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    }
  };

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Resellers" value={totals.resellers} />
        <Kpi label="Cards" value={totals.cards} />
        <Kpi label="Taps · 7 days" value={totals.taps_7d} />
        <Kpi label="Taps · total" value={totals.taps} />
      </section>

      {error && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-[14px] border border-danger-border bg-danger-soft px-4 py-3 text-[13px] font-medium text-danger">
          {error}
          <button type="button" onClick={() => setError(null)} aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <RequestsSection
        requests={overview.requests}
        onApprove={(r) => setAdding({ requestId: r.id, name: r.name, email: r.email, phone: r.phone })}
        run={run}
        now={now}
      />
      <ResellersSection resellers={overview.resellers} onAdd={() => setAdding({})} run={run} appUrl={appUrl} now={now} />
      <CardsSection cards={overview.cards} resellers={overview.resellers} run={run} />

      {adding && <AddResellerDialog prefill={adding} onClose={() => setAdding(null)} onCreated={() => router.refresh()} />}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="ct-card px-4 py-3.5">
      <p className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-muted">{label}</p>
      <p className="ct-num mt-1 text-[24px] font-bold leading-none text-ink">{value.toLocaleString('en-US')}</p>
    </div>
  );
}

function SectionHeader({ title, count, children }: { title: string; count: number; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
      <h2 className="text-[16px] font-bold tracking-[-0.01em] text-ink">
        {title} <span className="ct-num ml-1 text-[13px] font-semibold text-muted">{count}</span>
      </h2>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ resellers */

function ResellersSection({
  resellers,
  onAdd,
  run,
  appUrl,
  now,
}: {
  resellers: ResellerOverviewRow[];
  onAdd: () => void;
  run: (fn: () => Promise<unknown>) => Promise<void>;
  appUrl: string;
  now: number;
}) {
  return (
    <section className="ct-card overflow-hidden">
      <SectionHeader title="Resellers" count={resellers.length}>
        <button type="button" onClick={onAdd} className="sh-btn-primary h-9 px-4 text-[13px]">
          <Plus className="h-4 w-4" strokeWidth={2.5} /> Add reseller
        </button>
      </SectionHeader>

      {resellers.length === 0 ? (
        <p className="border-t border-line px-5 py-10 text-center text-[14px] text-muted">
          No resellers yet. Add one, then tell them to sign in at the login page with their email.
        </p>
      ) : (
        <>
          <div className="hidden border-t border-line md:block">
            <table className="w-full text-left text-[13.5px]">
              <thead className="bg-surface-2 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-muted">
                <tr>
                  <th className="px-5 py-2.5 font-semibold">Reseller</th>
                  <th className="px-3 py-2.5 font-semibold">Cards / limit</th>
                  <th className="px-3 py-2.5 font-semibold">Taps</th>
                  <th className="px-3 py-2.5 font-semibold">Last activity</th>
                  <th className="px-3 py-2.5 font-semibold">Status</th>
                  <th className="px-5 py-2.5 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {resellers.map((r) => (
                  <tr key={r.id} className="hover:bg-surface-2/60">
                    <td className="px-5 py-3">
                      <p className="font-semibold text-ink">{r.name}</p>
                      <p className="text-[12.5px] text-muted">{r.email}</p>
                    </td>
                    <td className="px-3 py-3">
                      <LimitCell reseller={r} run={run} />
                    </td>
                    <td className="ct-num px-3 py-3 text-ink">
                      {r.taps}
                      <span className="ml-1.5 text-[11.5px] text-muted">+{r.taps_7d} 7d</span>
                    </td>
                    <td className="px-3 py-3 text-muted">{timeAgo(r.last_active, now)}</td>
                    <td className="px-3 py-3">
                      <StatusPill status={r.status} />
                    </td>
                    <td className="px-5 py-3">
                      <ResellerActions reseller={r} run={run} appUrl={appUrl} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="divide-y divide-[var(--border)] border-t border-line md:hidden">
            {resellers.map((r) => (
              <li key={r.id} className="space-y-3 px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink">{r.name}</p>
                    <p className="truncate text-[12.5px] text-muted">{r.email}</p>
                  </div>
                  <StatusPill status={r.status} />
                </div>
                <div className="grid grid-cols-3 gap-2 text-[12px]">
                  <div>
                    <p className="text-muted">Cards / limit</p>
                    <LimitCell reseller={r} run={run} />
                  </div>
                  <div>
                    <p className="text-muted">Taps</p>
                    <p className="ct-num text-[14px] font-semibold text-ink">{r.taps}</p>
                  </div>
                  <div>
                    <p className="text-muted">Last activity</p>
                    <p className="text-[13px] text-ink">{timeAgo(r.last_active, now)}</p>
                  </div>
                </div>
                <ResellerActions reseller={r} run={run} appUrl={appUrl} />
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function LimitCell({ reseller, run }: { reseller: ResellerOverviewRow; run: (fn: () => Promise<unknown>) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(reseller.merchant_limit));
  const [saving, setSaving] = useState(false);
  const full = reseller.cards >= reseller.merchant_limit;

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        title="Change limit"
        className={cn(
          'ct-num inline-flex items-center gap-1.5 rounded-[8px] px-1.5 py-0.5 text-[14px] font-semibold hover:bg-surface-3',
          full ? 'text-warning' : 'text-ink'
        )}
      >
        {reseller.cards} / {reseller.merchant_limit}
        <Edit className="h-3 w-3 text-muted" />
      </button>
    );
  }

  const save = async () => {
    setSaving(true);
    await run(() => send(`/api/admin/resellers/${reseller.id}`, 'PATCH', { merchant_limit: value }));
    setSaving(false);
    setEditing(false);
  };

  return (
    <form
      className="inline-flex items-center gap-1"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <span className="ct-num text-[13px] text-muted">{reseller.cards} /</span>
      <input
        autoFocus
        inputMode="numeric"
        value={value}
        onChange={(e) => setValue(e.target.value.replace(/\D/g, ''))}
        className="ct-num h-8 w-14 rounded-[8px] border border-line-strong bg-surface px-2 text-[13px] text-ink"
        aria-label="New limit"
      />
      <button type="submit" disabled={saving} className="grid h-8 w-8 place-items-center rounded-[8px] bg-ink text-canvas" aria-label="Save limit">
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
      </button>
      <button type="button" onClick={() => setEditing(false)} className="grid h-8 w-8 place-items-center rounded-[8px] text-muted hover:bg-surface-3" aria-label="Cancel">
        <X className="h-3.5 w-3.5" />
      </button>
    </form>
  );
}

function ResellerActions({
  reseller,
  run,
  appUrl,
}: {
  reseller: ResellerOverviewRow;
  run: (fn: () => Promise<unknown>) => Promise<void>;
  appUrl: string;
}) {
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const suspended = reseller.status === 'suspended';
  const toggleStatus = async () => {
    if (!suspended && !confirm(`Suspend ${reseller.name}? They lose access right away. Their cards stay online.`)) return;
    setBusy(true);
    await run(() => send(`/api/admin/resellers/${reseller.id}`, 'PATCH', { status: suspended ? 'active' : 'suspended' }));
    setBusy(false);
  };
  const toggleGrow = async () => {
    setBusy(true);
    await run(() => send(`/api/admin/resellers/${reseller.id}`, 'PATCH', { grow_enabled: !reseller.grow_enabled }));
    setBusy(false);
  };

  return (
    <div className="flex items-center justify-end gap-1.5 max-md:justify-start">
      <IconButton label="View their space (read-only)" href={`/admin/resellers/${reseller.id}/space`}>
        <Eye className="h-4 w-4" />
      </IconButton>
      <IconButton
        label={suspended ? 'Reactivate' : 'Suspend'}
        onClick={toggleStatus}
        disabled={busy}
        tone={suspended ? 'success' : 'danger'}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : suspended ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
      </IconButton>
      <IconButton label="Delete reseller completely" onClick={() => setDeleting(true)} tone="danger">
        <Trash2 className="h-4 w-4" />
      </IconButton>
      {deleting && <DeleteResellerDialog reseller={reseller} onClose={() => setDeleting(false)} run={run} />}
      {resetting && <ResetPasswordDialog reseller={reseller} onClose={() => setResetting(false)} />}
      <details className="relative">
        <summary className="ct-btn ct-btn-icon h-9 w-9 cursor-pointer list-none border border-line bg-surface hover:bg-surface-2" aria-label="More">
          <MoreHorizontal className="h-4 w-4" />
        </summary>
        <div className="absolute right-0 z-20 mt-1.5 w-56 rounded-[14px] border border-line bg-surface p-1.5 shadow-lg max-md:left-0 max-md:right-auto">
          <button
            type="button"
            onClick={() => setResetting(true)}
            className="flex w-full items-center gap-2 rounded-[10px] px-3 py-2 text-left text-[13px] text-ink hover:bg-surface-2"
          >
            <KeyRound className="h-4 w-4" /> New password
          </button>
          <button
            type="button"
            onClick={toggleGrow}
            className="flex w-full items-center justify-between rounded-[10px] px-3 py-2 text-left text-[13px] text-ink hover:bg-surface-2"
          >
            Grow product
            <span className={cn('text-[12px] font-semibold', reseller.grow_enabled ? 'text-success' : 'text-muted')}>
              {reseller.grow_enabled ? 'On' : 'Off'}
            </span>
          </button>
        </div>
      </details>
    </div>
  );
}

function DeleteResellerDialog({
  reseller,
  onClose,
  run,
}: {
  reseller: ResellerOverviewRow;
  onClose: () => void;
  run: (fn: () => Promise<unknown>) => Promise<void>;
}) {
  const [typed, setTyped] = useState('');
  const [working, setWorking] = useState(false);
  const matches = typed.trim() === reseller.name.trim();

  const confirmDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matches || working) return;
    setWorking(true);
    await run(() => send(`/api/admin/resellers/${reseller.id}`, 'DELETE', { confirm_name: typed.trim() }));
    setWorking(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-overlay p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Delete reseller">
      <form onSubmit={confirmDelete} className="w-full max-w-md space-y-4 rounded-t-[24px] bg-surface p-5 text-left shadow-2xl sm:rounded-[24px] sm:p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-[17px] font-bold text-danger">Delete {reseller.name}?</h3>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full hover:bg-surface-2" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-2 rounded-[14px] border border-danger-border bg-danger-soft p-3.5 text-[13px] leading-relaxed text-danger">
          <p className="font-semibold">This deletes everything and cannot be undone:</p>
          <ul className="list-disc space-y-0.5 pl-5">
            <li>their account and access ({reseller.email})</li>
            <li>
              their {reseller.cards} {reseller.cards === 1 ? 'card' : 'cards'}
              {reseller.cards > 0 && ': the NFC links stop working'}
            </li>
            <li>the cards&apos; stats and uploaded images</li>
          </ul>
        </div>
        <div>
          <label className="ct-label" htmlFor={`del-${reseller.id}`}>
            Type <span className="font-bold text-ink">{reseller.name}</span> to confirm
          </label>
          <input
            id={`del-${reseller.id}`}
            autoFocus
            autoComplete="off"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            className="ct-control"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={onClose} className="ct-btn ct-btn-md border border-line bg-surface">
            Cancel
          </button>
          <button
            type="submit"
            disabled={!matches || working}
            className="ct-btn ct-btn-md bg-danger text-white disabled:opacity-40"
          >
            {working ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete
          </button>
        </div>
      </form>
    </div>
  );
}

function CredentialsResult({ message, whatsappUrl, onDone }: { message: string; whatsappUrl: string; onDone: () => void }) {
  const { copied, copy } = useCopy();
  return (
    <div className="space-y-4">
      <p className="ct-meta">Send these sign-in details to the reseller. They sign in at /connexion with this email and password.</p>
      <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-[14px] bg-surface-2 p-3 text-[12.5px] leading-relaxed text-ink-2">{message}</pre>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => copy('msg', message)} className="ct-btn ct-btn-md border border-line bg-surface">
          {copied === 'msg' ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />} Copy
        </button>
        <a href={whatsappUrl} target="_blank" rel="noreferrer" className="ct-btn ct-btn-md bg-[#25D366] text-white hover:brightness-95">
          <MessageCircle className="h-4 w-4" /> WhatsApp
        </a>
      </div>
      <button type="button" onClick={onDone} className="sh-save h-11">Done</button>
    </div>
  );
}

function PasswordField({ value, onChange, id }: { value: string; onChange: (v: string) => void; id: string }) {
  return (
    <div>
      <label className="ct-label" htmlFor={id}>Password</label>
      <div className="flex gap-2">
        <input id={id} required autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} className="ct-control ct-num" />
        <button
          type="button"
          onClick={() => onChange(generatePassword())}
          className="ct-btn ct-btn-md shrink-0 border border-line bg-surface px-3"
          title="Generate a new password"
        >
          <RefreshCw className="h-4 w-4" /> New
        </button>
      </div>
      <p className="ct-hint">At least 10 characters with letters and a number. You send it to them.</p>
    </div>
  );
}

function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-overlay p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="w-full max-w-md rounded-t-[24px] bg-surface p-5 text-left shadow-2xl sm:rounded-[24px] sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[17px] font-bold text-ink">{title}</h3>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full hover:bg-surface-2" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ResetPasswordDialog({ reseller, onClose }: { reseller: ResellerOverviewRow; onClose: () => void }) {
  const [password, setPassword] = useState(() => generatePassword());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ message: string; whatsapp_url: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      setDone(await send(`/api/admin/resellers/${reseller.id}/password`, 'POST', { password }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change the password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog title={done ? 'Password changed' : `New password for ${reseller.name}`} onClose={onClose}>
      {done ? (
        <CredentialsResult message={done.message} whatsappUrl={done.whatsapp_url} onDone={onClose} />
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <p className="ct-meta">Their old password stops working immediately.</p>
          <PasswordField id={`pw-${reseller.id}`} value={password} onChange={setPassword} />
          {error && <p role="alert" className="rounded-[12px] bg-danger-soft px-3 py-2 text-[13px] font-medium text-danger">{error}</p>}
          <button type="submit" disabled={saving} className="sh-save h-11">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            <span>Set new password</span>
          </button>
        </form>
      )}
    </Dialog>
  );
}

/* ------------------------------------------------------------------ add reseller */

export interface AddPrefill {
  requestId?: string;
  name?: string;
  email?: string;
  phone?: string;
}

function AddResellerDialog({ prefill, onClose, onCreated }: { prefill: AddPrefill; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: prefill.name ?? '', email: prefill.email ?? '', phone: prefill.phone ?? '', limit: '10' });
  const [password, setPassword] = useState(() => generatePassword());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ message: string; whatsapp_url: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const data = await send('/api/admin/resellers', 'POST', {
        name: form.name,
        email: form.email,
        phone: form.phone,
        merchant_limit: form.limit,
        password,
        request_id: prefill.requestId,
      });
      setDone({ message: data.message, whatsapp_url: data.whatsapp_url });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add the reseller.');
    } finally {
      setSaving(false);
    }
  };

  const field = (key: keyof typeof form, label: string, props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <div>
      <label className="ct-label" htmlFor={`add-${key}`}>{label}</label>
      <input
        id={`add-${key}`}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        className="ct-control"
        {...props}
      />
    </div>
  );

  return (
    <Dialog title={done ? 'Reseller added' : prefill.requestId ? 'Approve request' : 'Add reseller'} onClose={onClose}>
      {done ? (
        <CredentialsResult message={done.message} whatsappUrl={done.whatsapp_url} onDone={onClose} />
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {field('name', 'Name', { required: true, placeholder: 'Full name or company', autoFocus: !prefill.name })}
          {field('email', 'Email (their login)', { required: true, type: 'email', inputMode: 'email', placeholder: 'name@gmail.com' })}
          {field('phone', 'WhatsApp phone', { required: true, type: 'tel', inputMode: 'tel', placeholder: '+212 6...' })}
          <PasswordField id="add-password" value={password} onChange={setPassword} />
          {field('limit', 'Card limit', { required: true, inputMode: 'numeric' })}
          {error && <p role="alert" className="rounded-[12px] bg-danger-soft px-3 py-2 text-[13px] font-medium text-danger">{error}</p>}
          <button type="submit" disabled={saving} className="sh-save h-11">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            <span>{prefill.requestId ? 'Create account' : 'Add reseller'}</span>
          </button>
        </form>
      )}
    </Dialog>
  );
}

/* ------------------------------------------------------------------ access requests */

function RequestsSection({
  requests,
  onApprove,
  run,
  now,
}: {
  requests: AccessRequestRow[];
  onApprove: (r: AccessRequestRow) => void;
  run: (fn: () => Promise<unknown>) => Promise<void>;
  now: number;
}) {
  if (requests.length === 0) return null;
  return (
    <section className="ct-card overflow-hidden">
      <SectionHeader title="Access requests" count={requests.length} />
      <ul className="divide-y divide-[var(--border)] border-t border-line">
        {requests.map((r) => (
          <li key={r.id} className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:px-5">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink">
                {r.name} <span className="ml-1 text-[12px] font-normal text-muted">{timeAgo(r.created_at, now)}</span>
              </p>
              <p className="truncate text-[12.5px] text-muted">
                {r.email}
                {r.phone && ` · ${r.phone}`}
              </p>
              {r.message && <p className="mt-1 text-[13px] text-ink-2">{r.message}</p>}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => onApprove(r)} className="sh-btn-primary h-9 px-4 text-[13px]">
                <Check className="h-4 w-4" /> Approve
              </button>
              <button
                type="button"
                onClick={() => run(() => send(`/api/admin/access-requests/${r.id}`, 'PATCH', { status: 'dismissed' }))}
                className="ct-btn ct-btn-sm h-9 border border-line bg-surface px-3"
              >
                Dismiss
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------ cards */

function CardsSection({
  cards,
  resellers,
  run,
}: {
  cards: AdminCardRow[];
  resellers: ResellerOverviewRow[];
  run: (fn: () => Promise<unknown>) => Promise<void>;
}) {
  const [filter, setFilter] = useState('');
  const shown = useMemo(
    () => cards.filter((c) => (!filter ? true : filter === 'boostov' ? !c.reseller_id : c.reseller_id === filter)),
    [cards, filter]
  );
  const chips = [
    { key: '', label: 'All' },
    { key: 'boostov', label: 'My cards' },
    ...resellers.map((r) => ({ key: r.id, label: r.name })),
  ];

  return (
    <section className="ct-card overflow-hidden">
      <SectionHeader title="Cards" count={shown.length}>
        <Link href="/admin/connect/new" className="ct-btn ct-btn-sm h-9 border border-line bg-surface px-3">
          <Plus className="h-4 w-4" /> New card
        </Link>
      </SectionHeader>
      <div className="ct-scroll-none flex gap-1.5 overflow-x-auto border-t border-line px-4 py-2.5 sm:px-5">
        {chips.map((c) => (
          <button
            key={c.key || 'all'}
            type="button"
            onClick={() => setFilter(c.key)}
            className={cn(
              'whitespace-nowrap rounded-full px-3 py-1 text-[12.5px] font-semibold',
              filter === c.key ? 'bg-ink text-canvas' : 'text-muted hover:bg-surface-2 hover:text-ink'
            )}
          >
            {c.label}
          </button>
        ))}
      </div>
      <ul className="divide-y divide-[var(--border)] border-t border-line">
        {shown.length === 0 && <li className="px-5 py-10 text-center text-[14px] text-muted">No cards here yet.</li>}
        {shown.map((c) => (
          <CardRow key={c.id} card={c} run={run} />
        ))}
      </ul>
    </section>
  );
}

function CardRow({ card, run }: { card: AdminCardRow; run: (fn: () => Promise<unknown>) => Promise<void> }) {
  const { copied, copy } = useCopy();
  const path = card.link.replace(/^https?:\/\/[^/]+/, '');

  return (
    <li className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2.5 px-4 py-3 sm:flex sm:px-5">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <ConnectLogoAvatar name={card.name} logoUrl={card.logo_url} size="sm" />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-[14px] font-semibold text-ink">{card.name}</p>
            {!card.is_active && <span className="ct-chip border border-danger-border bg-danger-soft px-2 py-0.5 text-[10.5px] text-danger">Off</span>}
          </div>
          <p className="truncate text-[12px] text-muted">
            {card.owner} · <span className="ct-num">{path}</span>
          </p>
        </div>
      </div>
      <div className="text-right sm:w-20">
        <p className="ct-num text-[15px] font-bold text-ink">{card.taps_total}</p>
        <p className="text-[11px] text-muted">+{card.taps_7d} 7d</p>
      </div>
      <div className="col-span-2 flex items-center gap-1.5 pl-12 sm:pl-0">
        <IconButton label="Copy card link" onClick={() => copy('link', card.link)}>
          {copied === 'link' ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
        </IconButton>
        <a href={card.stats_url} target="_blank" rel="noreferrer" title="Stats" aria-label="Stats" className="ct-btn ct-btn-icon h-9 w-9 border border-line bg-surface hover:bg-surface-2">
          <BarChart2 className="h-4 w-4" />
        </a>
        <IconButton label="Edit card" href={`/admin/connect/${card.id}`}>
          <Edit className="h-4 w-4" />
        </IconButton>
        <details className="relative">
          <summary className="ct-btn ct-btn-icon h-9 w-9 cursor-pointer list-none border border-line bg-surface hover:bg-surface-2" aria-label="More">
            <MoreHorizontal className="h-4 w-4" />
          </summary>
          <div className="absolute right-0 z-20 mt-1.5 w-48 rounded-[14px] border border-line bg-surface p-1.5 shadow-lg">
            <a href={card.link} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-[10px] px-3 py-2 text-[13px] text-ink hover:bg-surface-2">
              <Eye className="h-4 w-4" /> Open card
            </a>
            <button
              type="button"
              onClick={() => run(() => send(`/api/admin/connect/businesses/${card.id}`, 'PUT', { is_active: !card.is_active }))}
              className="flex w-full items-center gap-2 rounded-[10px] px-3 py-2 text-left text-[13px] text-ink hover:bg-surface-2"
            >
              <Power className="h-4 w-4" /> {card.is_active ? 'Turn off' : 'Turn on'}
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm(`Delete "${card.name}"? Its link stops working. This cannot be undone.`)) {
                  run(() => send(`/api/admin/connect/businesses/${card.id}`, 'DELETE'));
                }
              }}
              className="flex w-full items-center gap-2 rounded-[10px] px-3 py-2 text-left text-[13px] text-danger hover:bg-danger-soft"
            >
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          </div>
        </details>
      </div>
    </li>
  );
}
