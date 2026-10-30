import Link from 'next/link';
import {
  BarChart2,
  Check,
  Edit,
  ExternalLink,
  MessageCircle,
  Nfc,
  Plus,
  QrCode,
  Radio,
  Store,
  TrendingUp,
} from 'lucide-react';
import ConnectLogoAvatar from './ConnectLogoAvatar';
import CopyButton from './CopyButton';
import { cn } from '@/lib/utils';
import { BOOSTOV_SUPPORT_WHATSAPP, buildWhatsAppUrl } from '@/lib/app-url';
import type { ResellerSpace } from '@/lib/reseller-data';

/**
 * The reseller dashboard body. Rendered as-is for the reseller, and with
 * `readOnly` for the super admin's "View their space": same screen, every
 * control that would change something is disabled.
 */
export default function ResellerSpaceView({ space, readOnly = false }: { space: ResellerSpace; readOnly?: boolean }) {
  const { reseller, merchants } = space;
  const used = merchants.length;
  const limit = reseller.merchant_limit;
  const atLimit = used >= limit;
  const percent = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 100;
  const totalTaps = merchants.reduce((sum, m) => sum + m.taps_total, 0);
  const weekTaps = merchants.reduce((sum, m) => sum + m.taps_7d, 0);

  const steps = [
    { done: used > 0, title: 'Create your first merchant', body: 'Add the business name, logo and contact links.' },
    {
      done: totalTaps > 0,
      title: 'Program the NFC card with NFC Tools',
      body: 'Open NFC Tools → Write → Add a record → URL, paste the merchant link, then Write and hold the card to the phone.',
    },
    { done: totalTaps > 0, title: 'Test the tap', body: 'Tap the card with a phone. The first visit appears here as a tap.' },
  ];
  const onboardingDone = steps.every((s) => s.done);

  const supportUrl = buildWhatsAppUrl(
    BOOSTOV_SUPPORT_WHATSAPP,
    `Bonjour Boostov, je suis ${reseller.name}. J'ai atteint ma limite de ${limit} marchands et je souhaite l'augmenter.`
  );

  const newMerchantButton =
    readOnly || atLimit ? (
      <span aria-disabled className="sh-btn-primary pointer-events-none opacity-50">
        <Plus className="h-4 w-4" strokeWidth={2.5} />
        New merchant
      </span>
    ) : (
      <Link href="/dashboard/merchants/new" className="sh-btn-primary">
        <Plus className="h-4 w-4" strokeWidth={2.5} />
        New merchant
      </Link>
    );

  return (
    <div className="space-y-5 sm:space-y-6">
      <section className="sh-hero sh-rise">
        <span aria-hidden className="sh-arcs">
          <span />
          <span />
          <span />
        </span>
        <div className="relative space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-white/60">Reseller space</p>
              <h2 className="bc-display mt-1 text-[26px] font-extrabold leading-[1.05] tracking-[-0.035em] sm:text-[34px]">
                {reseller.name}
              </h2>
            </div>
            {newMerchantButton}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <HeroStat label="Merchants" value={`${used} / ${limit}`} />
            <HeroStat label="Taps" value={String(totalTaps)} />
            <HeroStat label="Last 7 days" value={String(weekTaps)} />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/15">
              <div
                className={cn('h-full rounded-full', atLimit ? 'bg-amber-300' : 'bg-white')}
                style={{ width: `${percent}%` }}
              />
            </div>
            <span className="ct-num text-[12px] font-semibold text-white/70">{percent}%</span>
          </div>
        </div>
      </section>

      {atLimit && (
        <section
          role="status"
          className="sh-rise flex flex-col gap-4 rounded-[22px] border border-warning-border bg-warning-soft p-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h3 className="ct-title">You've reached your limit of {limit} merchants</h3>
            <p className="ct-meta mt-1">
              Your merchants keep working. To add more, contact Boostov to increase your limit.
            </p>
          </div>
          <a
            href={readOnly ? undefined : supportUrl}
            target="_blank"
            rel="noreferrer"
            aria-disabled={readOnly}
            className={cn(
              'ct-btn ct-btn-md shrink-0 bg-[#25D366] px-5 text-white hover:brightness-95',
              readOnly && 'pointer-events-none opacity-50'
            )}
          >
            <MessageCircle className="h-4 w-4" />
            Contact Boostov
          </a>
        </section>
      )}

      {!onboardingDone && (
        <section className="ct-card sh-rise p-5 sm:p-6">
          <h3 className="ct-section-title">Get started</h3>
          <ol className="mt-4 space-y-3">
            {steps.map((step, i) => (
              <li key={step.title} className="flex gap-3.5">
                <span
                  className={cn(
                    'mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12px] font-bold',
                    step.done ? 'bg-success text-white' : 'border border-line-strong text-muted'
                  )}
                >
                  {step.done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
                </span>
                <div className="min-w-0">
                  <p className={cn('text-[14px] font-semibold', step.done ? 'text-muted line-through' : 'text-ink')}>
                    {step.title}
                  </p>
                  <p className="ct-meta">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {merchants.length === 0 ? (
        <div className="sh-rise ct-card px-8 pb-10 pt-12 text-center">
          <div className="relative mx-auto grid h-24 w-24 place-items-center">
            <span aria-hidden className="absolute inset-0 rounded-[28px] border-2 border-dashed border-line-strong" />
            <span className="sh-head-icon h-14 w-14 rounded-[18px]">
              <Store className="h-6 w-6" strokeWidth={2} />
            </span>
          </div>
          <h3 className="ct-display mt-6 text-[22px]">No merchants yet</h3>
          <p className="mx-auto mt-2 max-w-[34ch] text-[14px] text-muted">
            Create a merchant to get its NFC link and QR code.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {merchants.map((m, index) => (
            <article
              key={m.id}
              style={{ '--d': `${Math.min(index, 6) * 60}ms` } as React.CSSProperties}
              className={cn('sh-biz sh-rise', !m.is_active && 'sh-biz-off')}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <ConnectLogoAvatar name={m.name} logoUrl={m.logo_url} size="md" />
                  <div className="min-w-0">
                    <h3 className="bc-display truncate text-[16px] font-extrabold leading-tight tracking-[-0.02em] text-ink">
                      {m.name}
                    </h3>
                    <p className="ct-num mt-1 truncate text-[11.5px] text-muted">/m/{m.slug}</p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <span
                    className={cn(
                      'ct-chip border',
                      m.product === 'grow'
                        ? 'border-success-border bg-success-soft text-success'
                        : 'border-info-border bg-info-soft text-info'
                    )}
                  >
                    {m.product === 'grow' ? 'Grow' : 'Connect'}
                  </span>
                  {!m.is_active && (
                    <span className="ct-chip border border-danger-border bg-danger-soft text-danger">Off</span>
                  )}
                </div>
              </div>

              <div className="sh-stats">
                <div>
                  <div className="sh-stat-label">
                    <Radio className="h-3 w-3" /> Taps
                  </div>
                  <div className="sh-stat-value ct-num">{m.taps_total}</div>
                </div>
                <div>
                  <div className="sh-stat-label">
                    <TrendingUp className="h-3 w-3" /> 7 days
                  </div>
                  <div className="sh-stat-value ct-num">{m.taps_7d}</div>
                </div>
                <div>
                  <div className="sh-stat-label">
                    <Nfc className="h-3 w-3" /> Status
                  </div>
                  <div className="sh-stat-value text-[15px]">{m.is_active ? 'Live' : 'Off'}</div>
                </div>
              </div>

              <div className="sh-url">
                <div className="min-w-0">
                  <span className="sh-url-label">NFC link</span>
                  <span className="ct-num mt-0.5 block truncate text-[11.5px] text-ink-2">{m.public_url}</span>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <CopyButton value={m.public_url} />
                  <a
                    href={m.public_url}
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

              <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-4">
                <a
                  href={m.stats_url}
                  target="_blank"
                  rel="noreferrer"
                  className="ct-btn ct-btn-sm ct-btn-quiet h-10 px-4"
                >
                  <BarChart2 className="h-3.5 w-3.5 text-brand-text" />
                  <span>Stats</span>
                </a>
                <div className="flex items-center gap-2">
                  <ActionLink href={`/dashboard/merchants/${m.id}/share`} disabled={readOnly} label="Link & QR">
                    <QrCode className="h-4 w-4" />
                  </ActionLink>
                  <ActionLink href={`/dashboard/merchants/${m.id}`} disabled={readOnly} label="Edit">
                    <Edit className="h-4 w-4" />
                  </ActionLink>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] bg-white/10 px-3 py-2.5 backdrop-blur-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/60">{label}</p>
      <p className="ct-num mt-0.5 text-[20px] font-bold text-white">{value}</p>
    </div>
  );
}

function ActionLink({
  href,
  disabled,
  label,
  children,
}: {
  href: string;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  const className = 'ct-btn ct-btn-icon h-10 w-10 border border-line bg-surface';
  if (disabled) {
    return (
      <span aria-disabled title={`${label} (read only)`} className={cn(className, 'pointer-events-none opacity-40')}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} title={label} aria-label={label} className={className}>
      {children}
    </Link>
  );
}
