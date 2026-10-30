import Link from 'next/link';
import { ChevronRight, Plus, Users } from 'lucide-react';
import { supabaseServer } from '@/lib/supabase/server';
import { loadResellers } from '@/lib/reseller-data';
import AdminShell, { StatusChip } from '@/components/AdminShell';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function ResellersPage() {
  const resellers = supabaseServer ? await loadResellers(supabaseServer) : [];

  return (
    <AdminShell tab="resellers" subtitle="Resellers">
      <section className="sh-hero sh-rise">
        <span aria-hidden className="sh-arcs">
          <span />
          <span />
          <span />
        </span>
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0 max-w-xl">
            <h2 className="bc-display text-[26px] font-extrabold leading-[1.05] tracking-[-0.035em] sm:text-[34px]">
              Resellers{' '}
              <span className="ct-num align-middle text-[0.62em] font-bold text-white/60">({resellers.length})</span>
            </h2>
            <p className="mt-2.5 text-[13.5px] leading-relaxed text-white/70">
              Starter Kit partners, their merchant limits and access.
            </p>
          </div>
          <Link href="/admin/resellers/new" className="sh-btn-primary">
            <Plus className="h-4 w-4" strokeWidth={2.5} /> New reseller
          </Link>
        </div>
      </section>

      {resellers.length === 0 ? (
        <div className="ct-card sh-rise px-8 pb-10 pt-12 text-center">
          <span className="sh-head-icon mx-auto h-14 w-14 rounded-[18px]">
            <Users className="h-6 w-6" />
          </span>
          <h3 className="ct-display mt-6 text-[22px]">No resellers yet</h3>
          <p className="mx-auto mt-2 max-w-[34ch] text-[14px] text-muted">Create one to send their setup link on WhatsApp.</p>
        </div>
      ) : (
        <ul className="ct-card sh-rise divide-y divide-[var(--border)] overflow-hidden">
          {resellers.map((r) => {
            const full = r.merchant_count >= r.merchant_limit;
            return (
              <li key={r.id}>
                <Link
                  href={`/admin/resellers/${r.id}`}
                  className="flex items-center gap-4 px-4 py-4 transition-colors hover:bg-surface-2 sm:px-5"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-soft text-[15px] font-bold text-brand-text">
                    {r.name.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-[15px] font-bold text-ink">{r.name}</span>
                      <StatusChip status={r.status} />
                      {r.grow_enabled && (
                        <span className="ct-chip border border-success-border bg-success-soft text-success">Grow</span>
                      )}
                    </div>
                    <p className="truncate text-[12.5px] text-muted">{r.email}</p>
                  </div>
                  <div className="text-right">
                    <p className={cn('ct-num text-[16px] font-bold', full ? 'text-warning' : 'text-ink')}>
                      {r.merchant_count} / {r.merchant_limit}
                    </p>
                    <p className="text-[11px] text-muted">merchants</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </AdminShell>
  );
}
