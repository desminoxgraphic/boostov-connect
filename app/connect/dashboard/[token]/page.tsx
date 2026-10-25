'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ConnectBusiness, ConnectLink, ConnectAnalyticsSummary, ConnectActionStat } from '@/lib/connect-types';
import ConnectPlatformIcon from '@/components/ConnectPlatformIcon';
import ConnectLogoAvatar from '@/components/ConnectLogoAvatar';
import ThemeToggle from '@/components/ThemeToggle';
import { useCountUp } from '@/lib/use-count-up';
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

/** Animated figure. Counts up to the real value once; never shows anything else. */
function Figure({ value, suffix = '' }: { value: number; suffix?: string }) {
  const shown = useCountUp(value);
  return (
    <span className="ct-num">
      {shown}
      {suffix}
    </span>
  );
}

type Tone = 'sky' | 'mint' | 'amber' | 'violet';

function StatCard({
  label,
  value,
  suffix,
  caption,
  icon,
  tone,
  featured = false,
  className,
  style,
  badge,
}: {
  label: string;
  value: number;
  suffix?: string;
  caption: string;
  icon: React.ReactNode;
  tone: Tone;
  featured?: boolean;
  className?: string;
  style?: React.CSSProperties;
  /** Replaces the icon tile, e.g. the CTR ring. */
  badge?: React.ReactNode;
}) {
  return (
    <div
      style={style}
      className={cn('sh-kpi sh-rise', featured ? 'sh-kpi-featured' : `sh-kpi-${tone}`, className)}
    >
      {featured && (
        <span aria-hidden className="sh-arcs">
          <span />
          <span />
          <span />
        </span>
      )}
      <div className="relative flex items-start justify-between gap-2">
        <span className="sh-kpi-label">{label}</span>
        {badge ?? <span className="sh-kpi-icon">{icon}</span>}
      </div>
      <div className="relative mt-auto min-w-0">
        <div className="sh-kpi-value">
          <Figure value={value} suffix={suffix} />
        </div>
        <p className="sh-kpi-caption">{caption}</p>
      </div>
    </div>
  );
}

/** Click-through rate drawn as a ring. The arc is the real percentage, capped at the full circle. */
function RateRing({ value }: { value: number }) {
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const fraction = Math.max(0, Math.min(value, 100)) / 100;
  return (
    <svg aria-hidden viewBox="0 0 56 56" className="sh-ring -mr-1 -mt-1 h-11 w-11 shrink-0 -rotate-90">
      <circle cx="28" cy="28" r={radius} className="sh-ring-track" />
      <circle
        cx="28"
        cy="28"
        r={radius}
        className="sh-ring-fill"
        strokeDasharray={circumference}
        style={{ '--ring-off': `${circumference * (1 - fraction)}`, '--ring-len': `${circumference}` } as React.CSSProperties}
      />
    </svg>
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
      <div className="sh-page min-h-dvh" aria-busy="true">
        <span className="sr-only">Loading merchant dashboard…</span>
        <div className="sh-bar">
          <div className="mx-auto flex max-w-shell items-center gap-3 px-4 py-3">
            <div className="sh-skel h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <div className="sh-skel h-4 w-40 rounded-full" />
              <div className="sh-skel h-3 w-24 rounded-full" />
            </div>
          </div>
        </div>
        <main className="mx-auto max-w-shell space-y-4 px-4 py-6 sm:py-8">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
            <div className="sh-skel col-span-2 h-[150px] rounded-[24px] lg:col-span-1" />
            <div className="sh-skel h-[150px] rounded-[24px]" />
            <div className="sh-skel h-[150px] rounded-[24px]" />
            <div className="sh-skel col-span-2 h-[150px] rounded-[24px] lg:col-span-1" />
          </div>
          <div className="sh-skel h-[320px] rounded-[24px]" />
        </main>
      </div>
    );
  }

  if (error || !business || !summary) {
    return (
      <div className="sh-page flex min-h-dvh items-center justify-center p-5">
        <div className="sh-rise ct-card w-full max-w-md px-8 pb-9 pt-10 text-center">
          <div className="relative mx-auto grid h-20 w-20 place-items-center">
            <span aria-hidden className="absolute inset-0 rounded-[24px] border-2 border-dashed border-danger-border" />
            <span className="grid h-12 w-12 place-items-center rounded-[16px] bg-danger-soft text-danger">
              <AlertCircle className="h-6 w-6" strokeWidth={2.25} />
            </span>
          </div>
          <h2 className="ct-display mt-6 text-[24px]">Access Error</h2>
          <p className="mx-auto mt-2 max-w-[32ch] text-[14px] leading-relaxed text-muted">
            {error || 'Unable to access merchant dashboard.'}
          </p>
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
    <div className="sh-page min-h-dvh text-ink">
      <header className="sh-bar sticky top-0 z-20">
        <div className="mx-auto flex max-w-shell items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <ConnectLogoAvatar name={business.name} logoUrl={business.logo_url} size="md" fallbackTone="accent" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="bc-display line-clamp-2 text-[16px] font-extrabold leading-[1.15] tracking-[-0.02em] text-ink sm:line-clamp-1">
                  {business.name}
                </h1>
                <span className="sh-pill hidden shrink-0 sm:inline-flex">Boostov Connect</span>
              </div>
              <p className="truncate text-[12px] font-medium text-muted">Merchant Analytics</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle className="hidden sm:inline-flex" />
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="ct-btn ct-btn-icon h-10 w-10 border border-line bg-surface"
              title="Refresh Data"
              aria-label="Refresh data"
            >
              <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
            </button>
            <a href={profileUrl} target="_blank" rel="noreferrer" className="sh-btn-primary sh-btn-dock">
              <span>View Profile</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-shell space-y-4 px-4 pb-28 pt-5 sm:space-y-5 sm:pb-10 sm:pt-8">
        {/* ---------------- TOP STATS ---------------- */}
        <section aria-label="Top statistics">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
            <StatCard
              label="Profile Views"
              value={summary.total_views}
              caption="NFC taps & profile visits"
              tone="sky"
              featured
              className="col-span-2 lg:col-span-1"
              icon={<Eye className="h-4 w-4" />}
            />
            <StatCard
              label="Total Clicks"
              value={summary.total_clicks}
              caption="Every action a visitor took"
              tone="mint"
              style={{ '--d': '70ms' } as React.CSSProperties}
              icon={<MousePointerClick className="h-4 w-4" />}
            />
            <StatCard
              label="Click-Through Rate"
              value={summary.ctr}
              suffix="%"
              caption="Clicks per profile view"
              tone="amber"
              style={{ '--d': '140ms' } as React.CSSProperties}
              icon={<TrendingUp className="h-4 w-4" />}
              badge={<RateRing value={summary.ctr} />}
            />
            <StatCard
              label="Saved Contacts"
              value={summary.saved_contacts}
              caption="Contact cards saved"
              tone="violet"
              className="col-span-2 lg:col-span-1"
              style={{ '--d': '210ms' } as React.CSSProperties}
              icon={<UserPlus className="h-4 w-4" />}
            />
          </div>
        </section>

        <div className="grid items-start gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
          {/* ---------------- LINK & ACTION PERFORMANCE ----------------
           * One unified list. Contact rows, socials, custom links, the gallery and
           * Save Contact are all actions on the same profile, so they are all
           * measured together instead of being split across separate sections. */}
          <section
            aria-label="Link and action performance"
            className="sh-rise ct-card overflow-hidden"
            style={{ '--d': '260ms' } as React.CSSProperties}
          >
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-line px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <span className="sh-head-icon">
                  <Link2 className="h-4 w-4" strokeWidth={2.25} />
                </span>
                <h2 className="ct-title">Link Performance</h2>
              </div>
              <span className="ct-num text-[12px] text-muted">
                {rows.length} action{rows.length === 1 ? '' : 's'} on your profile
                {activeLinkCount > 0 ? ` · ${activeLinkCount} link${activeLinkCount === 1 ? '' : 's'}` : ''}
              </span>
            </div>

            {rows.length === 0 ? (
              <div className="sh-empty">
                <span className="sh-empty-icon">
                  <Link2 className="h-5 w-5" strokeWidth={2.25} />
                </span>
                <p>No actions are configured on this profile yet.</p>
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {rows.map((row, index) => {
                  // Bars are scaled against the best performer so the leader is
                  // always full width, while the printed percentage stays the
                  // honest share of all clicks.
                  const width = maxClicks > 0 ? (row.clicks / maxClicks) * 100 : 0;
                  const leader = maxClicks > 0 && row.clicks === maxClicks;
                  return (
                    <li key={row.key} className="sh-perf-row">
                      <span className={cn('sh-perf-icon', leader && 'sh-perf-icon-lead')}>
                        <ActionIcon stat={row} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="truncate text-[14px] font-semibold text-ink">{row.label}</span>
                          <span className="ct-num shrink-0 text-[14px] font-bold text-ink">
                            {row.clicks}
                            <span className="ml-1 font-sans text-[11.5px] font-medium text-muted">
                              click{row.clicks === 1 ? '' : 's'}
                            </span>
                          </span>
                        </div>
                        <div className="mt-2 flex items-center gap-3">
                          <div className="sh-track">
                            <div
                              className={cn('sh-fill', leader && 'sh-fill-lead')}
                              style={{ width: `${width}%`, '--d': `${Math.min(index, 8) * 60}ms` } as React.CSSProperties}
                            />
                          </div>
                          <span className="ct-num w-12 shrink-0 text-right text-[11.5px] font-semibold text-muted">
                            {row.percent}%
                          </span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* ---------------- RECENT ACTIVITY ---------------- */}
          <section
            aria-label="Recent activity"
            className="sh-rise ct-card overflow-hidden"
            style={{ '--d': '320ms' } as React.CSSProperties}
          >
            <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <span className="sh-head-icon">
                  <Clock className="h-4 w-4" strokeWidth={2.25} />
                </span>
                <h2 className="ct-title">Recent Activity</h2>
              </div>
              <span className="ct-num text-[12px] text-muted">Last 15 interactions</span>
            </div>

            {summary.recent_activity.length === 0 ? (
              <div className="sh-empty">
                <span className="sh-empty-icon">
                  <Clock className="h-5 w-5" strokeWidth={2.25} />
                </span>
                <p>
                  No activity recorded yet. Tap the physical NFC card or share your profile to see
                  real-time events here.
                </p>
              </div>
            ) : (
              <ol className="sh-timeline px-5 py-3 sm:px-6">
                {summary.recent_activity.map((act) => (
                  <li key={act.id} className="sh-timeline-item">
                    <span aria-hidden className="sh-timeline-dot" />
                    <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-ink">
                      {act.title}
                    </span>
                    <span className="ct-num shrink-0 text-[11.5px] text-muted">
                      {new Date(act.created_at).toLocaleString([], {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        {/* On phones the appearance control lives here, out of the crowded top bar. */}
        <div className="flex justify-center pt-2 sm:hidden">
          <ThemeToggle />
        </div>
      </main>
    </div>
  );
}
