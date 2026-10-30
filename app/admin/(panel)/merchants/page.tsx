import Link from 'next/link';
import { BarChart2, ExternalLink } from 'lucide-react';
import { supabaseServer } from '@/lib/supabase/server';
import { loadAllMerchants } from '@/lib/reseller-data';
import AdminShell from '@/components/AdminShell';
import ConnectLogoAvatar from '@/components/ConnectLogoAvatar';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

/** Every merchant in the system (yours and all resellers'), with taps. */
export default async function AllMerchantsPage({ searchParams }: { searchParams: { reseller?: string } }) {
  const { merchants, resellers } = supabaseServer
    ? await loadAllMerchants(supabaseServer)
    : { merchants: [], resellers: [] };
  const names = new Map(resellers.map((r) => [r.id, r.name]));
  const filter = searchParams.reseller || '';
  const shown = merchants.filter((m) =>
    !filter ? true : filter === 'boostov' ? m.reseller_id === null : m.reseller_id === filter
  );
  const totalTaps = shown.reduce((s, m) => s + m.taps_total, 0);

  const chips = [
    { key: '', label: 'All' },
    { key: 'boostov', label: 'Boostov (you)' },
    ...resellers.map((r) => ({ key: r.id, label: r.name })),
  ];

  return (
    <AdminShell tab="merchants" subtitle="All merchants">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="ct-card p-4">
          <p className="sh-stat-label">Merchants</p>
          <p className="ct-num mt-1 text-[24px] font-bold text-ink">{shown.length}</p>
        </div>
        <div className="ct-card p-4">
          <p className="sh-stat-label">Taps</p>
          <p className="ct-num mt-1 text-[24px] font-bold text-ink">{totalTaps}</p>
        </div>
        <div className="ct-card col-span-2 p-4 sm:col-span-1">
          <p className="sh-stat-label">Resellers</p>
          <p className="ct-num mt-1 text-[24px] font-bold text-ink">{resellers.length}</p>
        </div>
      </section>

      <div className="ct-scroll-none -mx-4 flex gap-2 overflow-x-auto px-4">
        {chips.map((c) => (
          <Link
            key={c.key || 'all'}
            href={c.key ? `/admin/merchants?reseller=${c.key}` : '/admin/merchants'}
            className={cn(
              'whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold',
              filter === c.key ? 'border-ink bg-ink text-canvas' : 'border-line bg-surface text-muted hover:text-ink'
            )}
          >
            {c.label}
          </Link>
        ))}
      </div>

      <ul className="ct-card divide-y divide-[var(--border)] overflow-hidden">
        {shown.length === 0 && <li className="px-5 py-10 text-center text-[14px] text-muted">No merchants here yet.</li>}
        {shown.map((m) => (
          <li key={`${m.product}-${m.id}`} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
            <ConnectLogoAvatar name={m.name} logoUrl={m.logo_url} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="truncate text-[14px] font-bold text-ink">{m.name}</span>
                <span
                  className={cn(
                    'ct-chip border px-2 py-0.5 text-[10.5px]',
                    m.product === 'grow' ? 'border-success-border bg-success-soft text-success' : 'border-info-border bg-info-soft text-info'
                  )}
                >
                  {m.product === 'grow' ? 'Grow' : 'Connect'}
                </span>
                {!m.is_active && <span className="ct-chip border border-danger-border bg-danger-soft px-2 py-0.5 text-[10.5px] text-danger">Off</span>}
              </div>
              <p className="truncate text-[12px] text-muted">
                {m.reseller_id ? names.get(m.reseller_id) ?? 'Reseller' : 'Boostov (you)'} · /m/{m.slug}
              </p>
            </div>
            <div className="text-right">
              <p className="ct-num text-[16px] font-bold text-ink">{m.taps_total}</p>
              <p className="text-[11px] text-muted">{m.taps_7d} this week</p>
            </div>
            <div className="hidden items-center gap-1 sm:flex">
              <a href={m.stats_url} target="_blank" rel="noreferrer" className="ct-btn ct-btn-icon h-9 w-9 bg-surface" aria-label="Stats">
                <BarChart2 className="h-3.5 w-3.5" />
              </a>
              <a href={m.public_url} target="_blank" rel="noreferrer" className="ct-btn ct-btn-icon h-9 w-9 bg-surface text-brand-text" aria-label="Open">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </li>
        ))}
      </ul>
    </AdminShell>
  );
}
