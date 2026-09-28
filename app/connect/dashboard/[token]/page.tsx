'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { ConnectBusiness, ConnectLink, ConnectAnalyticsSummary, ConnectActionStat } from '@/lib/connect-types';
import ConnectPlatformIcon from '@/components/ConnectPlatformIcon';
import ThemeToggle from '@/components/ThemeToggle';
import {
  WhatsAppIcon,
  MapsIcon,
  PhoneIcon,
  GlobeIcon,
  MailIcon,
  BuildingIcon,
  SmartphoneIcon,
} from '@/components/connect-platform-icons';
import {
  Eye,
  MousePointerClick,
  TrendingUp,
  UserPlus,
  ExternalLink,
  Images,
  Link2,
  Loader2,
  RefreshCw,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageProps {
  params: { token: string };
}

const ICON = 'h-[17px] w-[17px]';

/** Same brand marks the public card uses, so both screens read identically. */
function ActionIcon({ stat }: { stat: ConnectActionStat }) {
  switch (stat.icon) {
    case 'mobile':
      return <PhoneIcon className={ICON} />;
    case 'whatsapp':
      return <WhatsAppIcon className={ICON} />;
    case 'smartphone':
      return <SmartphoneIcon className={ICON} />;
    case 'office':
      return <BuildingIcon className={ICON} />;
    case 'email':
      return <MailIcon className={ICON} />;
    case 'maps':
      return <MapsIcon className={ICON} />;
    case 'website':
      return <GlobeIcon className={ICON} />;
    case 'gallery':
      return <Images className={ICON} />;
    case 'save':
      return <UserPlus className={ICON} />;
    case 'platform':
    default:
      return <ConnectPlatformIcon platform={stat.platform} className={ICON} />;
  }
}

type Tone = 'brand' | 'success' | 'warning' | 'info';

const TONE_CHIP: Record<Tone, string> = {
  brand: 'bg-brand-soft text-brand-text',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  info: 'bg-info-soft text-info',
};

function StatCard({
  label,
  value,
  caption,
  icon,
  tone,
}: {
  label: string;
  value: string | number;
  caption: string;
  icon: React.ReactNode;
  tone: Tone;
}) {
  return (
    <div className="ct-card flex flex-col gap-3 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <span className="ct-section-title pt-0.5">{label}</span>
        <span className={cn('ct-tile h-8 w-8', TONE_CHIP[tone])}>{icon}</span>
      </div>
      <div>
        <div className="ct-num text-[28px] font-semibold leading-none text-ink sm:text-[32px]">
          {value}
        </div>
        <p className="ct-meta mt-2 text-[11.5px]">{caption}</p>
      </div>
    </div>
  );
}

export default function MerchantAnalyticsDashboardPage({ params }: PageProps) {
  const [business, setBusiness] = useState<ConnectBusiness | null>(null);
  const [links, setLinks] = useState<ConnectLink[]>([]);
  const [summary, setSummary] = useState<ConnectAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/connect/dashboard/${params.token}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError('Invalid dashboard link or business profile not found.');
        } else {
          setError('Failed to load dashboard metrics.');
        }
        return;
      }
      const data = await res.json();
      setBusiness(data.business);
      setLinks(data.links || []);
      setSummary(data.summary);
    } catch {
      setError('An error occurred loading merchant dashboard.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [params.token]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-canvas">
        <div className="flex flex-col items-center gap-3 text-muted">
          <Loader2 className="h-7 w-7 animate-spin text-brand" />
          <span className="text-[13px]">Loading merchant dashboard…</span>
        </div>
      </div>
    );
  }

  if (error || !business || !summary) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-canvas p-4">
        <div className="ct-card max-w-md w-full space-y-3 p-8 text-center">
          <div className="ct-tile mx-auto h-12 w-12 bg-danger-soft text-danger">
            <AlertCircle className="h-6 w-6" strokeWidth={2} />
          </div>
          <h2 className="ct-title text-[20px]">Access Error</h2>
          <p className="ct-meta">{error || 'Unable to access merchant dashboard.'}</p>
        </div>
      </div>
    );
  }

  const profileUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/connect/${business.slug}`
      : `/connect/${business.slug}`;

  /* Every row comes from the profile itself, so there is no fixed platform list
     here: a business with no website has no Website row, and a custom link
     appears the moment it is added and disappears when it is removed. */
  const rows = summary.actions;
  const maxClicks = rows.reduce((max, row) => Math.max(max, row.clicks), 0);
  const activeLinkCount = links.filter((link) => link.is_active !== false).length;

  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <header className="sticky top-0 z-20 border-b border-line bg-glass backdrop-blur-md">
        <div className="mx-auto flex max-w-shell items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-control border border-line bg-surface-2">
              {business.logo_url ? (
                <Image
                  src={business.logo_url}
                  alt={business.name}
                  width={40}
                  height={40}
                  className="h-full w-full rounded-[10px] object-contain"
                />
              ) : (
                <span className="bg-brand text-[15px] font-semibold text-on-brand">
                  {business.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-[15px] font-semibold leading-tight text-ink">
                  {business.name}
                </h1>
                <span className="ct-chip hidden shrink-0 bg-brand-soft text-[10px] uppercase tracking-[0.08em] text-brand-text sm:inline-flex">
                  Boostov Connect
                </span>
              </div>
              <p className="truncate text-[12px] text-muted">Merchant Analytics</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle className="hidden sm:inline-flex" />
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="ct-btn ct-btn-icon border border-line"
              title="Refresh Data"
              aria-label="Refresh data"
            >
              <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
            </button>
            <a
              href={profileUrl}
              target="_blank"
              rel="noreferrer"
              className="ct-btn ct-btn-sm bg-brand text-on-brand hover:bg-brand-hover"
            >
              <span>View Profile</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-shell space-y-5 px-4 py-6 sm:py-8">
        {/* ---------------- TOP STATS ---------------- */}
        <section aria-label="Top statistics">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
            <StatCard
              label="Profile Views"
              value={summary.total_views}
              caption="NFC taps & profile visits"
              tone="brand"
              icon={<Eye className="h-4 w-4" />}
            />
            <StatCard
              label="Total Clicks"
              value={summary.total_clicks}
              caption="Every action a visitor took"
              tone="success"
              icon={<MousePointerClick className="h-4 w-4" />}
            />
            <StatCard
              label="Click-Through Rate"
              value={`${summary.ctr}%`}
              caption="Clicks per profile view"
              tone="warning"
              icon={<TrendingUp className="h-4 w-4" />}
            />
            <StatCard
              label="Saved Contacts"
              value={summary.saved_contacts}
              caption="Contact cards saved"
              tone="info"
              icon={<UserPlus className="h-4 w-4" />}
            />
          </div>
        </section>

        {/* ---------------- LINK & ACTION PERFORMANCE ----------------
         * One unified list. Contact rows, socials, custom links, the gallery and
         * Save Contact are all actions on the same profile, so they are all
         * measured together instead of being split across separate sections. */}
        <section aria-label="Link and action performance" className="ct-card p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="ct-tile h-8 w-8 bg-brand-soft text-brand-text">
                <Link2 className="h-4 w-4" strokeWidth={2} />
              </span>
              <h2 className="ct-title">Link Performance</h2>
            </div>
            <span className="ct-num text-[12px] text-muted">
              {rows.length} action{rows.length === 1 ? '' : 's'} on your profile
              {activeLinkCount > 0 ? ` · ${activeLinkCount} link${activeLinkCount === 1 ? '' : 's'}` : ''}
            </span>
          </div>

          {rows.length === 0 ? (
            <p className="py-12 text-center text-[12.5px] text-muted">
              No actions are configured on this profile yet.
            </p>
          ) : (
            <ul className="mt-5 space-y-4">
              {rows.map((row) => {
                // Bars are scaled against the best performer so the leader is
                // always full width, while the printed percentage stays the
                // honest share of all clicks.
                const width = maxClicks > 0 ? (row.clicks / maxClicks) * 100 : 0;
                return (
                  <li key={row.key} className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="ct-tile h-9 w-9 bg-surface-2 text-ink-2">
                        <ActionIcon stat={row} />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink">
                        {row.label}
                      </span>
                      <span className="ct-num shrink-0 text-[13px] font-semibold text-ink">
                        {row.clicks}
                        <span className="ml-1 font-sans text-[11px] font-medium text-muted">
                          click{row.clicks === 1 ? '' : 's'}
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                        <div
                          className="h-full rounded-full bg-brand transition-[width] duration-500 ease-out"
                          style={{ width: `${width}%` }}
                        />
                      </div>
                      <span className="ct-num w-11 shrink-0 text-right text-[11px] text-muted">
                        {row.percent}%
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* ---------------- RECENT ACTIVITY ---------------- */}
        <section aria-label="Recent activity" className="ct-card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="ct-tile h-8 w-8 bg-brand-soft text-brand-text">
                <Clock className="h-4 w-4" strokeWidth={2} />
              </span>
              <h2 className="ct-title">Recent Activity</h2>
            </div>
            <span className="ct-num text-[12px] text-muted">Last 15 interactions</span>
          </div>

          {summary.recent_activity.length === 0 ? (
            <p className="py-12 text-center text-[12.5px] leading-relaxed text-muted">
              No activity recorded yet. Tap the physical NFC card or share your profile to see
              real-time events here.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {summary.recent_activity.map((act) => (
                <li key={act.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                    <span className="truncate text-[13px] font-medium text-ink">{act.title}</span>
                  </div>
                  <span className="ct-num shrink-0 text-[11.5px] text-muted">
                    {new Date(act.created_at).toLocaleString([], {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
