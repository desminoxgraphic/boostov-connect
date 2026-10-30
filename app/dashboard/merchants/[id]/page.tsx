import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, QrCode } from 'lucide-react';
import { requirePage } from '@/lib/authz';
import { loadEditableMerchant } from '@/lib/reseller-merchants';
import { BOOSTOV_SUPPORT_WHATSAPP, buildWhatsAppUrl } from '@/lib/app-url';
import MerchantForm from '@/components/MerchantForm';

export const dynamic = 'force-dynamic';

export default async function EditMerchantPage({ params }: { params: { id: string } }) {
  const { supabase } = await requirePage('reseller');
  const merchant = await loadEditableMerchant(supabase, params.id);
  if (!merchant) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <Link href="/dashboard" className="ct-btn ct-btn-sm ct-btn-quiet h-9 w-fit px-3">
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>
        <Link href={`/dashboard/merchants/${merchant.id}/share`} className="ct-btn ct-btn-sm h-9 border border-line bg-surface px-3">
          <QrCode className="h-4 w-4" /> Link & QR
        </Link>
      </div>
      <h1 className="ct-display truncate text-[26px]">{merchant.name}</h1>
      <MerchantForm
        merchantId={merchant.id}
        initial={merchant}
        growEnabled={merchant.product === 'grow'}
        supportUrl={buildWhatsAppUrl(BOOSTOV_SUPPORT_WHATSAPP, 'Bonjour Boostov')}
      />
    </div>
  );
}
