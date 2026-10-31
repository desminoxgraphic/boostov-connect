import Link from 'next/link';
import { notFound } from 'next/navigation';
import QRCode from 'qrcode';
import { ArrowLeft, Download, Edit, ExternalLink } from 'lucide-react';
import { requirePage } from '@/lib/authz';
import { loadResellerSpace } from '@/lib/reseller-data';
import CopyButton from '@/components/CopyButton';
import StatsLinkCard from '@/components/StatsLinkCard';
import ConnectLogoAvatar from '@/components/ConnectLogoAvatar';

export const dynamic = 'force-dynamic';

const NFC_STEPS = [
  'Install NFC Tools (free) on your phone.',
  'Open it, go to Write, then Add a record → URL / URI.',
  'Paste the merchant link shown above and confirm.',
  'Tap Write, then hold the card or plaque against the back of the phone.',
  'Optional: in Other → Lock tag, lock it so nobody can rewrite it.',
  'Test: tap the card with another phone. The page should open.',
];

export default async function MerchantSharePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { ctx, supabase } = await requirePage('reseller');
  const space = await loadResellerSpace(supabase, ctx.userId);
  const merchant = space?.merchants.find((m) => m.id === params.id);
  if (!merchant) notFound();

  // Generated server-side from our own URL; safe to inline.
  const qrSvg = await QRCode.toString(merchant.public_url, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' });

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <Link href="/dashboard" className="ct-btn ct-btn-sm ct-btn-quiet h-9 w-fit px-3">
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>
        <Link href={`/dashboard/merchants/${merchant.id}`} className="ct-btn ct-btn-sm h-9 border border-line bg-surface px-3">
          <Edit className="h-4 w-4" /> Edit
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <ConnectLogoAvatar name={merchant.name} logoUrl={merchant.logo_url} size="md" />
        <div className="min-w-0">
          <h1 className="ct-display truncate text-[24px]">{merchant.name}</h1>
          <p className="ct-meta">Connect · {merchant.taps_total} taps</p>
        </div>
      </div>

      <section className="ct-card space-y-5 p-5 sm:p-6">
        <h2 className="ct-section-title">Merchant link</h2>
        <div className="sh-url">
          <div className="min-w-0">
            <span className="sh-url-label">Program this on the card</span>
            <span className="ct-num mt-0.5 block break-all text-[13px] font-semibold text-ink">{merchant.public_url}</span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <CopyButton value={merchant.public_url} />
            <a
              href={merchant.public_url}
              target="_blank"
              rel="noreferrer"
              className="ct-btn ct-btn-icon h-9 w-9 bg-surface text-brand-text"
              title="Open"
              aria-label="Open public page"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div
            className="w-48 shrink-0 rounded-[20px] bg-white p-3 shadow-sm [&_svg]:h-auto [&_svg]:w-full"
            aria-label={`QR code for ${merchant.public_url}`}
            role="img"
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
          <div className="space-y-3 text-center sm:text-left">
            <p className="ct-meta">
              The QR code opens the same page as the card. Print it on stickers, table cards or flyers.
            </p>
            <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
              <CopyButton value={merchant.public_url} label="Copy link" />
              <a
                href={`/api/reseller/merchants/${merchant.id}/qr`}
                className="ct-btn ct-btn-sm h-10 border border-line bg-surface px-4"
              >
                <Download className="h-3.5 w-3.5" /> Download QR (PNG)
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="ct-card space-y-4 p-5 sm:p-6">
        <h2 className="ct-section-title">Program the card with NFC Tools</h2>
        <ol className="space-y-2.5">
          {NFC_STEPS.map((step, i) => (
            <li key={step} className="flex gap-3 text-[13.5px] text-ink-2">
              <span className="ct-num grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-soft text-[11px] font-bold text-brand-text">
                {i + 1}
              </span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <StatsLinkCard merchantId={merchant.id} initialUrl={merchant.stats_url} />
    </div>
  );
}
