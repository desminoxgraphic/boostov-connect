import { randomUUID } from 'crypto';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requirePage } from '@/lib/authz';
import { loadResellerSpace } from '@/lib/reseller-data';
import { BOOSTOV_SUPPORT_WHATSAPP, buildWhatsAppUrl } from '@/lib/app-url';
import MerchantForm from '@/components/MerchantForm';

export const dynamic = 'force-dynamic';

export default async function NewMerchantPage() {
  const { ctx, supabase } = await requirePage('reseller');
  const space = await loadResellerSpace(supabase, ctx.userId);
  const reseller = space?.reseller;
  const supportUrl = buildWhatsAppUrl(
    BOOSTOV_SUPPORT_WHATSAPP,
    `Bonjour Boostov, je suis ${reseller?.name ?? ''}. Je souhaite augmenter ma limite de marchands.`
  );

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href="/dashboard" className="ct-btn ct-btn-sm ct-btn-quiet h-9 w-fit px-3">
        <ArrowLeft className="h-4 w-4" /> Dashboard
      </Link>
      <h1 className="ct-display text-[26px]">New merchant</h1>
      <MerchantForm
        merchantId={randomUUID()}
        initial={null}
        growEnabled={reseller?.grow_enabled ?? false}
        supportUrl={supportUrl}
      />
    </div>
  );
}
