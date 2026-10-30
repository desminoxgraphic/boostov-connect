import Link from 'next/link';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import { requirePage } from '@/lib/authz';
import { loadResellerSpace } from '@/lib/reseller-data';
import { BOOSTOV_SUPPORT_WHATSAPP, buildWhatsAppUrl } from '@/lib/app-url';
import ConnectBusinessCreateForm from '@/components/ConnectBusinessCreateForm';

export const dynamic = 'force-dynamic';

/** Same Connect form as the admin's; at the limit it explains how to get more. */
export default async function NewMerchantPage() {
  const { ctx, supabase } = await requirePage('reseller');
  const space = await loadResellerSpace(supabase, ctx.userId);
  const limit = space?.reseller.merchant_limit ?? 0;
  const used = space?.merchants.length ?? 0;

  if (used >= limit) {
    const supportUrl = buildWhatsAppUrl(
      BOOSTOV_SUPPORT_WHATSAPP,
      `Bonjour Boostov, je suis ${space?.reseller.name ?? ''}. J'ai atteint ma limite de ${limit} marchands et je souhaite l'augmenter.`
    );
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <Link href="/dashboard" className="ct-btn ct-btn-sm ct-btn-quiet h-9 w-fit px-3">
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>
        <section className="flex flex-col gap-4 rounded-[22px] border border-warning-border bg-warning-soft p-5">
          <h1 className="ct-title">You&apos;ve reached your limit of {limit} merchants</h1>
          <p className="ct-meta">Your merchants keep working. Contact Boostov to increase your limit.</p>
          <a
            href={supportUrl}
            target="_blank"
            rel="noreferrer"
            className="ct-btn ct-btn-md w-fit bg-[#25D366] px-5 text-white hover:brightness-95"
          >
            <MessageCircle className="h-4 w-4" /> Contact Boostov
          </a>
        </section>
      </div>
    );
  }

  return <ConnectBusinessCreateForm variant="reseller" />;
}
