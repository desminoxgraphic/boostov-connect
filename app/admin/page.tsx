'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ConnectBusiness, ConnectAnalyticsSummary } from '@/lib/connect-types';
import ThemeToggle from '@/components/ThemeToggle';
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
  Loader2,
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
      <div className="flex min-h-dvh items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted">
          <Loader2 className="h-7 w-7 animate-spin text-brand" />
          <span className="text-[13px]">Loading admin panel…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh">
      {/* ADMIN HEADER */}
      <header className="sticky top-0 z-20 border-b border-line bg-glass backdrop-blur-md">
        <div className="mx-auto flex max-w-shell items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="ct-tile h-10 w-10 bg-ink text-[15px] font-semibold text-canvas">B</div>
            <div className="min-w-0">
              <h1 className="truncate text-[15px] font-semibold leading-tight text-ink">BOOSTOV Admin</h1>
              <p className="truncate text-[12px] text-muted">NFC Profiles &amp; Analytics</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle className="hidden sm:inline-flex" />
            <Link
              href="/admin/connect/new"
              className="ct-btn ct-btn-sm bg-brand text-on-brand hover:bg-brand-hover"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Connect Business</span>
            </Link>

            <button
              onClick={handleLogout}
              className="ct-btn ct-btn-icon border border-line"
              title="Sign Out"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="mx-auto max-w-shell space-y-5 px-4 py-6 sm:py-8">
        <div>
          <h2 className="ct-display text-[24px]">
            Boostov Connect Profiles{' '}
            <span className="ct-num text-muted">({businesses.length})</span>
          </h2>
          <p className="ct-meta mt-1.5">
            Manage NFC business profiles, custom links, and private merchant analytics.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-card border border-danger-border bg-danger-soft px-4 py-3 text-[13px] font-medium text-danger"
          >
            {error}
          </div>
        )}

        {!error && businesses.length === 0 ? (
          <div className="ct-card space-y-3 p-10 text-center">
            <div className="ct-tile mx-auto h-12 w-12 bg-brand-soft text-brand-text">
              <Sparkles className="h-6 w-6" strokeWidth={2} />
            </div>
            <h3 className="ct-title">No Connect profiles added yet</h3>
            <p className="ct-meta">Create your first digital NFC business card profile.</p>
            <Link
              href="/admin/connect/new"
              className="ct-btn ct-btn-md mx-auto mt-2 bg-brand text-on-brand hover:bg-brand-hover"
            >
              <Plus className="h-4 w-4" /> Add Connect Business
            </Link>
          </div>
        ) : !error ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {businesses.map((b) => {
              const publicNfcUrl = typeof window !== 'undefined'
                ? `${window.location.origin}/connect/${b.slug}`
                : `/connect/${b.slug}`;
              const merchantDashUrl = typeof window !== 'undefined'
                ? `${window.location.origin}/connect/dashboard/${b.dashboard_token}`
                : `/connect/dashboard/${b.dashboard_token}`;

              return (
                <div
                  key={b.id}
                  className={cn(
                    'ct-card flex flex-col justify-between gap-4 p-5 transition-shadow duration-150 hover:shadow-md',
                    !b.is_active && 'bg-surface-2'
                  )}
                >
                  {/* HEADER ROW */}
                  <div className="flex items-start justify-between gap-3">
                    <Link href={`/admin/connect/${b.id}`} className="flex min-w-0 items-center gap-3">
                      <ConnectLogoAvatar name={b.name} logoUrl={b.logo_url} size="md" />

                      <div className="min-w-0">
                        <h3 className="truncate text-[15px] font-semibold leading-tight text-ink">
                          {b.name}
                        </h3>
                        <p className="ct-num mt-0.5 truncate text-[11.5px] text-brand-text">
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
                  <div className="grid grid-cols-3 divide-x divide-line rounded-control border border-line bg-surface-2 text-center">
                    <div className="px-2 py-2.5">
                      <div className="ct-section-title flex items-center justify-center gap-1 text-[9.5px]">
                        <Eye className="h-3 w-3" /> Views
                      </div>
                      <div className="ct-num mt-1 text-[16px] font-semibold text-ink">
                        {b.stats?.total_views || 0}
                      </div>
                    </div>
                    <div className="px-2 py-2.5">
                      <div className="ct-section-title flex items-center justify-center gap-1 text-[9.5px]">
                        <MousePointer className="h-3 w-3" /> Clicks
                      </div>
                      <div className="ct-num mt-1 text-[16px] font-semibold text-success">
                        {b.stats?.total_clicks || 0}
                      </div>
                    </div>
                    <div className="px-2 py-2.5">
                      <div className="ct-section-title flex items-center justify-center gap-1 text-[9.5px]">
                        <TrendingUp className="h-3 w-3" /> CTR %
                      </div>
                      <div className="ct-num mt-1 text-[16px] font-semibold text-warning">
                        {b.stats?.ctr || 0}%
                      </div>
                    </div>
                  </div>

                  {/* TWO MANDATORY URL COPIERS */}
                  <div className="space-y-2">
                    {/* 1. PUBLIC NFC PROFILE URL */}
                    <div className="flex items-center justify-between gap-2 rounded-control border border-line bg-surface-2 px-2.5 py-2">
                      <div className="min-w-0">
                        <span className="ct-label mb-0.5 block !text-[9.5px]">NFC Profile URL</span>
                        <span className="ct-num block truncate text-[11.5px] text-muted">
                          {publicNfcUrl}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          onClick={() => handleCopy(publicNfcUrl, `pub_${b.id}`)}
                          className="ct-btn ct-btn-icon h-8 w-8"
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
                          className="ct-btn ct-btn-icon h-8 w-8 text-brand-text"
                          title="Open NFC Profile Page"
                          aria-label="Open NFC profile page"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </div>

                    {/* 2. PRIVATE MERCHANT ANALYTICS DASHBOARD URL */}
                    <div className="flex items-center justify-between gap-2 rounded-control border border-line bg-surface-2 px-2.5 py-2">
                      <div className="min-w-0">
                        <span className="ct-label mb-0.5 block !text-[9.5px]">Analytics URL</span>
                        <span className="ct-num block truncate text-[11.5px] text-muted">
                          /connect/dashboard/{b.dashboard_token.substring(0, 8)}…
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          onClick={() => handleCopy(merchantDashUrl, `dash_${b.id}`)}
                          className="ct-btn ct-btn-icon h-8 w-8"
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
                          className="ct-btn ct-btn-icon h-8 w-8"
                          title="Open Analytics Dashboard"
                          aria-label="Open analytics dashboard"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* BOTTOM ACTIONS */}
                  <div className="flex items-center justify-between gap-2 border-t border-line pt-4">
                    <Link
                      href={`/connect/dashboard/${b.dashboard_token}`}
                      target="_blank"
                      className="ct-btn ct-btn-sm ct-btn-quiet"
                    >
                      <BarChart2 className="h-3.5 w-3.5 text-brand-text" />
                      <span>View Analytics</span>
                    </Link>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/connect/${b.id}`}
                        className="ct-btn ct-btn-icon border border-line"
                        title="Edit Connect Business"
                        aria-label="Edit connect business"
                      >
                        <Edit className="h-4 w-4" />
                      </Link>

                      <button
                        onClick={() => handleDelete(b)}
                        className="ct-btn ct-btn-icon border border-danger-border bg-danger-soft text-danger"
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
