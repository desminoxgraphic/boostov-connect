import Link from 'next/link';
import { notFound } from 'next/navigation';
import { QrCode } from 'lucide-react';
import { requirePage } from '@/lib/authz';
import ConnectBusinessEditForm from '@/components/ConnectBusinessEditForm';

export const dynamic = 'force-dynamic';

export default async function EditMerchantPage({ params }: { params: { id: string } }) {
  const { supabase } = await requirePage('reseller');
  const { data } = await supabase.from('connect_businesses').select('id').eq('id', params.id).maybeSingle();
  if (!data) notFound();

  return (
    <div className="space-y-4">
      <div className="mx-auto flex max-w-3xl justify-end">
        <Link href={`/dashboard/merchants/${params.id}/share`} className="ct-btn ct-btn-sm h-9 border border-line bg-surface px-3">
          <QrCode className="h-4 w-4" /> Link & QR
        </Link>
      </div>
      <ConnectBusinessEditForm id={params.id} variant="reseller" />
    </div>
  );
}
