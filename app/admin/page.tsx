'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ConnectBusiness, ConnectAnalyticsSummary } from '@/lib/connect-types';
import ThemeToggle from '@/components/ThemeToggle';
import AdminTopBar from '@/components/AdminTopBar';
import ConnectLogoAvatar from '@/components/ConnectLogoAvatar';
import { cn } from '@/lib/utils';
import {
  Plus,
  ExternalLink,
  Edit,
  Trash2,
  Copy,
  Check,
  Power,
  LogOut,
  AlertCircle,
  Sparkles,
  BarChart2,
  Eye,
  MousePointer,
  TrendingUp,
} from 'lucide-react';

interface ConnectBusinessWithStats extends ConnectBusiness {
  stats?: ConnectAnalyticsSummary;
}

export default function AdminDashboardPage() {
  const router = useRouter();

  const [businesses, setBusinesses] = useState<ConnectBusinessWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const fetchBusinesses = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/connect/businesses');
      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to fetch Connect profiles');
        return;
      }
      setBusinesses(data.businesses || []);
    } catch (err) {
      setError('An error occurred loading Connect dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBusinesses();
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(id);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const handleToggleActive = async (b: ConnectBusinessWithStats) => {
    try {
      const res = await fetch(`/api/admin/connect/businesses/${b.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !b.is_active }),
      });
      if (res.ok) fetchBusinesses();
    } catch (err) {
      console.error('Toggle active failed:', err);
    }
  };

  const handleDelete = async (b: ConnectBusinessWithStats) => {
    if (!confirm(`Are you sure you want to delete Connect profile "${b.name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/connect/businesses/${b.id}`, { method: 'DELETE' });
      if (res.ok) fetchBusinesses();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  if (loading && businesses.length === 0) {
    return (
      <div className="sh-page min-h-dvh" aria-busy="true">
        <span className="sr-only">Loading admin panel…</span>
        <AdminTopBar title="BOOSTOV Admin" subtitle="NFC Profiles & Analytics" />
        <main className="mx-auto max-w-shell space-y-5 px-4 py-6 sm:py-8">
          <div className="sh-skel h-[150px] rounded-[28px]" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="sh-skel h-[340px] rounded-[24px]" />
            <div className="sh-skel h-[340px] rounded-[24px]" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="sh-page min-h-dvh">
      {/* ADMIN HEADER */}
      <AdminTopBar title="BOOSTOV Admin" subtitle="NFC Profiles & Analytics">
        <ThemeToggle className="hidden sm:inline-flex" />
        <Link href="/admin/connect/new" className="sh-btn-primary max-sm:w-10 max-sm:justify-center max-sm:px-0">
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          <span className="hidden sm:inline">Add Connect Business</span>
        </Link>

        <button
          onClick={handleLogout}
          className="ct-btn ct-btn-icon h-10 w-10 border border-line bg-surface"
          title="Sign Out"
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </AdminTopBar>

      {/* MAIN CONTAINER */}
      <main className="mx-auto max-w-shell space-y-5 px-4 pb-12 pt-5 sm:space-y-6 sm:pt-8">
        <section className="sh-hero sh-rise">
          <span aria-hidden className="sh-arcs">
            <span />
            <span />
            <span />
          </span>
          <div className="relative flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0 max-w-xl">
              <h2 className="bc-display text-[26px] font-extrabold leading-[1.05] tracking-[-0.035em] sm:text-[34px]">
                Boostov Connect Profiles{' '}
                <span className="ct-num align-middle text-[0.62em] font-bold text-white/60">
                  ({businesses.length})
                </span>
              </h2>
              <p className="mt-2.5 text-[13.5px] leading-relaxed text-white/70">
                Manage NFC business profiles, custom links, and private merchant analytics.
              </p>
            </div>
            <ThemeToggle variant="onCover" className="sm:hidden" />
          </div>
        </section>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-[18px] border border-danger-border bg-danger-soft px-4 py-3.5 text-[13px] font-medium text-danger"
          >
            <AlertCircle className="mt-px h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {!error && businesses.length === 0 ? (
          <div className="sh-rise ct-card px-8 pb-10 pt-12 text-center">
            <div className="relative mx-auto grid h-24 w-24 place-items-center">
              <span aria-hidden className="absolute inset-0 rounded-[28px] border-2 border-dashed border-line-strong" />
              <span className="sh-head-icon h-14 w-14 rounded-[18px]">
                <Sparkles className="h-6 w-6" strokeWidth={2} />
              </span>
            </div>
            <h3 className="ct-display mt-6 text-[22px]">No Connect profiles added yet</h3>
            <p className="mx-auto mt-2 max-w-[34ch] text-[14px] text-muted">
              Create your first digital NFC business card profile.
            </p>
            <Link href="/admin/connect/new" className="sh-btn-primary mx-auto mt-6 h-11 w-fit px-5">
              <Plus className="h-4 w-4" strokeWidth={2.5} /> Add Connect Business
            </Link>
          </div>
        ) : !error ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {businesses.map((b, index) => {
              const publicNfcUrl = typeof window !== 'undefined'
                ? `${window.location.origin}/connect/${b.slug}`
                : `/connect/${b.slug}`;
              const merchantDashUrl = typeof window !== 'undefined'
                ? `${window.location.origin}/connect/dashboard/${b.dashboard_token}`
                : `/connect/dashboard/${b.dashboard_token}`;

              return (
                <div
                  key={b.id}
                  style={
                    {
                      '--biz': b.theme_color || 'var(--bx-blue)',
                      '--d': `${Math.min(index, 6) * 60}ms`,
                    } as React.CSSProperties
                  }
                  className={cn('sh-biz sh-rise', !b.is_active && 'sh-biz-off')}
                >
                  {/* HEADER ROW */}
                  <div className="flex items-start justify-between gap-3">
                    <Link href={`/admin/connect/${b.id}`} className="group flex min-w-0 items-center gap-3">
                      <ConnectLogoAvatar name={b.name} logoUrl={b.logo_url} size="md" />

                      <div className="min-w-0">
                        <h3 className="bc-display truncate text-[16px] font-extrabold leading-tight tracking-[-0.02em] text-ink transition-colors group-hover:text-brand-text">
                          {b.name}
                        </h3>
                        <p className="ct-num mt-1 truncate text-[11.5px] text-muted">
                          /connect/{b.slug}
                        </p>
                      </div>
                    </Link>

                    <button
                      onClick={() => handleToggleActive(b)}
                      aria-pressed={b.is_active}
                      className={cn(
                        'ct-chip shrink-0 border transition-colors duration-150',
                        b.is_active
                          ? 'border-success-border bg-success-soft text-success hover:bg-success hover:text-white'
                          : 'border-danger-border bg-danger-soft text-danger hover:bg-danger hover:text-white'
                      )}
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>{b.is_active ? 'Active' : 'Disabled'}</span>
                    </button>
                  </div>

                  {/* STATS BADGES */}
                  <div className="sh-stats">
                    <div>
                      <div className="sh-stat-label">
                        <Eye className="h-3 w-3" /> Views
                      </div>
                      <div className="sh-stat-value ct-num">{b.stats?.total_views || 0}</div>
                    </div>
                    <div>
                      <div className="sh-stat-label">
                        <MousePointer className="h-3 w-3" /> Clicks
                      </div>
                      <div className="sh-stat-value ct-num">{b.stats?.total_clicks || 0}</div>
                    </div>
                    <div>
                      <div className="sh-stat-label">
                        <TrendingUp className="h-3 w-3" /> CTR %
                      </div>
                      <div className="sh-stat-value ct-num">{b.stats?.ctr || 0}%</div>
                    </div>
                  </div>

                  {/* TWO MANDATORY URL COPIERS */}
                  <div className="space-y-2">
                    {/* 1. PUBLIC NFC PROFILE URL */}
                    <div className="sh-url">
                      <div className="min-w-0">
                        <span className="sh-url-label">NFC Profile URL</span>
                        <span className="ct-num mt-0.5 block truncate text-[11.5px] text-ink-2">
                          {publicNfcUrl}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          onClick={() => handleCopy(publicNfcUrl, `pub_${b.id}`)}
                          className="ct-btn ct-btn-icon h-9 w-9 bg-surface"
                          title="Copy NFC URL"
                          aria-label="Copy NFC profile URL"
                        >
                          {copiedLink === `pub_${b.id}` ? (
                            <Check className="h-3.5 w-3.5 text-success" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <a
                          href={`/connect/${b.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="ct-btn ct-btn-icon h-9 w-9 bg-surface text-brand-text"
                          title="Open NFC Profile Page"
                          aria-label="Open NFC profile page"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </div>

                    {/* 2. PRIVATE MERCHANT ANALYTICS DASHBOARD URL */}
                    <div className="sh-url">
                      <div className="min-w-0">
                        <span className="sh-url-label">Analytics URL</span>
                        <span className="ct-num mt-0.5 block truncate text-[11.5px] text-ink-2">
                          /connect/dashboard/{b.dashboard_token.substring(0, 8)}…
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          onClick={() => handleCopy(merchantDashUrl, `dash_${b.id}`)}
                          className="ct-btn ct-btn-icon h-9 w-9 bg-surface"
                          title="Copy Analytics Dashboard URL"
                          aria-label="Copy analytics dashboard URL"
                        >
                          {copiedLink === `dash_${b.id}` ? (
                            <Check className="h-3.5 w-3.5 text-success" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <a
                          href={`/connect/dashboard/${b.dashboard_token}`}
                          target="_blank"
                          rel="noreferrer"
                          className="ct-btn ct-btn-icon h-9 w-9 bg-surface"
                          title="Open Analytics Dashboard"
                          aria-label="Open analytics dashboard"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* BOTTOM ACTIONS */}
                  <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-4">
                    <Link
                      href={`/connect/dashboard/${b.dashboard_token}`}
                      target="_blank"
                      className="ct-btn ct-btn-sm ct-btn-quiet h-10 px-4"
                    >
                      <BarChart2 className="h-3.5 w-3.5 text-brand-text" />
                      <span>View Analytics</span>
                    </Link>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/connect/${b.id}`}
                        className="ct-btn ct-btn-icon h-10 w-10 border border-line bg-surface"
                        title="Edit Connect Business"
                        aria-label="Edit connect business"
                      >
                        <Edit className="h-4 w-4" />
                      </Link>

                      <button
                        onClick={() => handleDelete(b)}
                        className="ct-btn ct-btn-icon h-10 w-10 border border-danger-border bg-danger-soft text-danger hover:bg-danger hover:text-white"
                        title="Delete Connect Business"
                        aria-label="Delete connect business"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </main>
    </div>
  );
}
