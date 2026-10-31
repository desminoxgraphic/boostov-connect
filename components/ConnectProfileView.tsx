'use client';

import React, { useEffect, useRef } from 'react';
import { Link as LinkIcon } from 'lucide-react';
import { ConnectBusiness, ConnectLink } from '@/lib/connect-types';
import ConnectPublicCard from '@/components/ConnectPublicCard';

/**
 * The public NFC profile, shared by /connect/<slug> (existing cards) and
 * /m/<slug> (reseller-era links).
 *
 * The card data is loaded on the server and arrives inside the page HTML, so
 * the logo and banner start downloading immediately instead of after the
 * JavaScript and an extra API round trip.
 */
export default function ConnectProfileView({
  business,
  links,
}: {
  /** null = no such card, or it is switched off. */
  business: ConnectBusiness | null;
  links: ConnectLink[];
}) {
  const hasLoggedView = useRef(false);

  const post = (payload: Record<string, unknown>) =>
    fetch('/api/connect/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});

  useEffect(() => {
    if (!business?.id || hasLoggedView.current) return;
    hasLoggedView.current = true;
    post({ business_id: business.id, event_type: 'view' });
  }, [business?.id]);

  const trackEvent = (eventType: string, linkId?: string, metadata?: Record<string, unknown>) => {
    if (!business) return;
    post({ business_id: business.id, event_type: eventType, link_id: linkId || null, metadata: metadata || {} });
  };

  if (!business || !business.is_active) {
    return (
      <div className="connect-scope relative isolate flex min-h-dvh items-center justify-center p-5 text-center">
        <div aria-hidden className="bc-backdrop" />
        <div className="bc-in w-full max-w-sm overflow-hidden rounded-[30px] border border-line bg-surface px-8 pb-9 pt-10 shadow-lg">
          <div className="relative mx-auto grid h-24 w-24 place-items-center">
            <span aria-hidden className="absolute inset-0 rounded-[28px] border-2 border-dashed border-line-strong" />
            <span className="grid h-14 w-14 rotate-[-8deg] place-items-center rounded-[18px] bg-brand-soft text-brand-text">
              <LinkIcon className="h-6 w-6" strokeWidth={2.25} />
            </span>
          </div>
          <h2 className="bc-display mt-6 text-[26px] font-extrabold leading-tight tracking-[-0.03em] text-ink">
            Profile Not Found
          </h2>
          <p className="mx-auto mt-2.5 max-w-[30ch] text-[14px] leading-relaxed text-muted">
            This NFC profile page does not exist or has been deactivated.
          </p>
        </div>
      </div>
    );
  }

  return <ConnectPublicCard business={business} links={links} onTrack={trackEvent} />;
}
