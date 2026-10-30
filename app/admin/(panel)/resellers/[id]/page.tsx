import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Eye } from 'lucide-react';
import { supabaseServer } from '@/lib/supabase/server';
import { loadResellerSpace } from '@/lib/reseller-data';
import AdminTopBar from '@/components/AdminTopBar';
import { StatusChip } from '@/components/AdminShell';
import ResellerControls from '@/components/ResellerControls';

export const dynamic = 'force-dynamic';

export default async function ResellerDetailPage({ params }: { params: { id: string } }) {
  if (!supabaseServer) notFound();
  const space = await loadResellerSpace(supabaseServer, params.id);
  if (!space) notFound();
  const { reseller, merchants } = space;
  const taps = merchants.reduce((sum, m) => sum + m.taps_total, 0);

  return (
    <div className="sh-page min-h-dvh">
      <AdminTopBar
        title={reseller.name}
        subtitle={reseller.email}
        narrow
        leading={
          <Link href="/admin/resellers" className="ct-btn ct-btn-icon h-10 w-10 border border-line bg-surface" aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        }
      />
      <main className="mx-auto max-w-3xl space-y-5 px-4 pb-12 pt-5 sm:pt-8">
        <section className="ct-card sh-rise p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <StatusChip status={reseller.status} />
              {reseller.grow_enabled && (
                <span className="ct-chip border border-success-border bg-success-soft text-success">Grow enabled</span>
              )}
            </div>
            <Link href={`/admin/resellers/${reseller.id}/space`} className="sh-btn-primary">
              <Eye className="h-4 w-4" /> View their space
            </Link>
          </div>
          <dl className="mt-5 grid grid-cols-3 gap-3">
            <div className="ct-inset">
              <dt className="sh-stat-label">Merchants</dt>
              <dd className="ct-num mt-1 text-[20px] font-bold text-ink">
                {merchants.length} / {reseller.merchant_limit}
              </dd>
            </div>
            <div className="ct-inset">
              <dt className="sh-stat-label">Taps</dt>
              <dd className="ct-num mt-1 text-[20px] font-bold text-ink">{taps}</dd>
            </div>
            <div className="ct-inset">
              <dt className="sh-stat-label">Phone</dt>
              <dd className="ct-num mt-1 break-all text-[12px] leading-snug font-semibold text-ink">{reseller.phone}</dd>
            </div>
          </dl>
        </section>

        <ResellerControls
          reseller={reseller}
          lastLinkLabel={
            reseller.last_link_generated_at
              ? new Date(reseller.last_link_generated_at).toLocaleString('en-GB', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                  timeZone: 'Africa/Casablanca',
                })
              : null
          }
        />
      </main>
    </div>
  );
}
