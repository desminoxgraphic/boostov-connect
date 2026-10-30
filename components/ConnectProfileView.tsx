'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Link as LinkIcon } from 'lucide-react';
import { ConnectBusiness, ConnectLink } from '@/lib/connect-types';
import ConnectPublicCard from '@/components/ConnectPublicCard';

/**
 * The public NFC profile, shared by /connect/<slug> (existing cards) and
 * /m/<slug> (reseller-era links).
 */
export default function ConnectProfileView({ slug }: { slug: string }) {
  const [business, setBusiness] = useState<ConnectBusiness | null>(null);
  const [links, setLinks] = useState<ConnectLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFoundState, setNotFoundState] = useState(false);

  const hasLoggedView = useRef(false);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/connect/profile?slug=${encodeURIComponent(slug)}`);
      if (!res.ok) {
        if (res.status === 404) setNotFoundState(true);
        return;
      }
      const data = await res.json();
      setBusiness(data.business);
      setLinks(data.links || []);

      if (data.business?.id && !hasLoggedView.current) {
        hasLoggedView.current = true;
        fetch('/api/connect/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            business_id: data.business.id,
            event_type: 'view',
          }),
        }).catch(() => {});
      }
    } catch (err) {
      setNotFoundState(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [slug]);

  const trackEvent = (
    eventType: string,
    linkId?: string,
    metadata?: Record<string, unknown>
  ) => {
    if (!business) return;
    fetch('/api/connect/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        business_id: business.id,
        event_type: eventType,
        link_id: linkId || null,
        metadata: metadata || {},
      }),
    }).catch(() => {});
  };

  if (loading) {
    return (
      <div className="connect-scope relative isolate flex min-h-dvh justify-center sm:px-6 sm:py-12">
        <div aria-hidden className="bc-backdrop" />
        <div className="bc-card flex w-full max-w-card flex-col bg-surface">
          <div className="bc-hero animate-pulse bg-surface-3">
            <div className="bc-plate-stage">
              <div className="h-full w-full rounded-[20px] bg-surface-2/60" />
            </div>
          </div>
          <div className="bc-sheet px-6 pt-8">
            <div className="h-6 w-28 animate-pulse rounded-full bg-surface-2" />
            <div className="mt-4 h-8 w-4/5 animate-pulse rounded-[10px] bg-surface-2" />
            <div className="mt-3 h-3.5 w-3/5 animate-pulse rounded-full bg-surface-2" />
            <div className="mt-6 flex h-[60px] w-full animate-pulse items-center rounded-[20px] bg-surface-2 px-6 text-transparent">
              Save Contact
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (notFoundState || !business || !business.is_active) {
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
