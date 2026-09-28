'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Link as LinkIcon } from 'lucide-react';
import { ConnectBusiness, ConnectLink } from '@/lib/connect-types';
import ConnectPublicCard from '@/components/ConnectPublicCard';

interface PageProps {
  params: { slug: string };
}

export default function PublicConnectProfilePage({ params }: PageProps) {
  const [business, setBusiness] = useState<ConnectBusiness | null>(null);
  const [links, setLinks] = useState<ConnectLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFoundState, setNotFoundState] = useState(false);

  const hasLoggedView = useRef(false);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/connect/profile?slug=${params.slug}`);
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
  }, [params.slug]);

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
      <div className="connect-scope flex min-h-dvh justify-center bg-canvas sm:py-6">
        <div className="w-full max-w-card border-x border-line bg-surface sm:rounded-card sm:border">
          <div className="h-[176px] w-full animate-pulse rounded-t-card bg-surface-2 sm:h-[200px]" />
          <div className="-mt-[58px] px-5 text-center">
            <div className="relative mx-auto h-[116px] w-[116px] animate-pulse rounded-full border-[3px] border-surface bg-surface-2 shadow-md" />
            <div className="mx-auto mt-5 h-6 w-40 animate-pulse rounded-full bg-surface-2" />
            <div className="mx-auto mt-3 h-3.5 w-56 animate-pulse rounded-full bg-surface-2" />
            <div className="ct-btn ct-btn-lg mt-6 w-full animate-pulse bg-surface-2 text-transparent">
              Save Contact
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (notFoundState || !business || !business.is_active) {
    return (
      <div className="connect-scope flex min-h-dvh items-center justify-center bg-canvas p-4 text-center">
        <div className="ct-card w-full max-w-sm space-y-3 p-8">
          <div className="ct-tile mx-auto h-12 w-12 bg-surface-2 text-muted">
            <LinkIcon className="h-6 w-6" strokeWidth={2} />
          </div>
          <h2 className="ct-title text-[20px]">Profile Not Found</h2>
          <p className="ct-meta">
            This NFC profile page does not exist or has been deactivated.
          </p>
        </div>
      </div>
    );
  }

  return <ConnectPublicCard business={business} links={links} onTrack={trackEvent} />;
}
