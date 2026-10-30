import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Eye } from 'lucide-react';
import { supabaseServer } from '@/lib/supabase/server';
import { loadResellerSpace } from '@/lib/reseller-data';
import AdminTopBar from '@/components/AdminTopBar';
import ResellerSpaceView from '@/components/ResellerSpaceView';

export const dynamic = 'force-dynamic';

/**
 * "View their space": the reseller's dashboard exactly as they see it, read-only.
 * No impersonation: the data is loaded with the admin's server access and every
 * control that would change something is disabled.
 */
export default async function ResellerSpacePreviewPage({ params }: { params: { id: string } }) {
  if (!supabaseServer) notFound();
  const space = await loadResellerSpace(supabaseServer, params.id);
  if (!space) notFound();

  return (
    <div className="sh-page min-h-dvh">
      <div className="sticky top-0 z-30 flex items-center justify-center gap-2 bg-ink px-4 py-2 text-center text-[12.5px] font-semibold text-canvas">
        <Eye className="h-4 w-4 shrink-0" />
        Viewing {space.reseller.name}&apos;s space — read only
      </div>
      <AdminTopBar
        title="Boostov Partner"
        subtitle={space.reseller.email}
        leading={
          <Link href={`/admin/resellers/${space.reseller.id}`} className="ct-btn ct-btn-icon h-10 w-10 border border-line bg-surface" aria-label="Back to reseller">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        }
      />
      <main className="mx-auto max-w-shell px-4 pb-12 pt-5 sm:pt-8">
        <ResellerSpaceView space={space} readOnly />
      </main>
    </div>
  );
}
