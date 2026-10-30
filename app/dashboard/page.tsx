import { notFound } from 'next/navigation';
import { requirePage } from '@/lib/authz';
import { loadResellerSpace } from '@/lib/reseller-data';
import ResellerSpaceView from '@/components/ResellerSpaceView';

export const dynamic = 'force-dynamic';

export default async function ResellerDashboardPage() {
  const { ctx, supabase } = await requirePage('reseller');
  const space = await loadResellerSpace(supabase, ctx.userId);
  if (!space) notFound();
  return <ResellerSpaceView space={space} />;
}
