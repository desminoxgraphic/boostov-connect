'use client';

import React from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown, Link2, ExternalLink } from 'lucide-react';
import {
  detectConnectPlatform,
  defaultConnectLinkLabel,
  formatConnectLinkValue,
  normalizeConnectUrl,
} from '@/lib/connect-platforms';
import ConnectPlatformIcon from '@/components/ConnectPlatformIcon';
import { cn } from '@/lib/utils';

export interface ConnectSocialLinkItem {
  id: string;
  url: string;
  label: string;
}

interface Props {
  links: ConnectSocialLinkItem[];
  onChange: (next: ConnectSocialLinkItem[]) => void;
}

function newLinkId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `link-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function ConnectSocialLinksFields({ links, onChange }: Props) {
  const addLink = () =>
    onChange([...links, { id: newLinkId(), url: '', label: '' }]);

  const removeLink = (id: string) => onChange(links.filter((link) => link.id !== id));

  const updateLink = (id: string, patch: Partial<ConnectSocialLinkItem>) =>
    onChange(links.map((link) => (link.id === id ? { ...link, ...patch } : link)));

  const moveLink = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= links.length) return;
    const next = [...links];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    onChange(next);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="ct-section-title">5. Links &amp; Socials</h2>
          <p className="ct-hint mt-1.5">
            Paste any URL. The platform logo and button name are detected automatically.
          </p>
        </div>
        <button
          type="button"
          onClick={addLink}
          className="ct-btn ct-btn-sm shrink-0 border border-line-strong"
        >
          <Plus className="h-3.5 w-3.5" /> Add Link
        </button>
      </div>

      {links.length === 0 ? (
        <div className="rounded-card border border-dashed border-line-strong bg-surface-2 px-4 py-8 text-center">
          <span className="ct-tile mx-auto h-11 w-11 bg-surface-3 text-muted-2">
            <Link2 className="h-5 w-5" />
          </span>
          <p className="ct-body mt-3 font-medium text-ink">No links yet</p>
          <p className="ct-hint mt-1">
            Instagram, Facebook, TikTok, YouTube, LinkedIn, X, Telegram, booking pages…
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {links.map((link, index) => {
            const platform = detectConnectPlatform(link.url);
            const trimmedUrl = link.url.trim();
            const href = trimmedUrl ? normalizeConnectUrl(trimmedUrl) : '';
            const previewLabel = link.label.trim() || defaultConnectLinkLabel(trimmedUrl, platform);
            const previewValue = formatConnectLinkValue(trimmedUrl, platform);

            return (
              <div
                key={link.id}
                className="ct-inset space-y-3.5 p-3.5"
              >
                <div className="flex items-center gap-2.5">
                  <span className="ct-tile h-9 w-9 shrink-0 bg-surface text-ink ring-1 ring-line">
                    <ConnectPlatformIcon platform={platform.key} className="h-[18px] w-[18px]" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-semibold text-ink">{previewLabel}</p>
                    <p className="truncate text-[11.5px] text-muted-2">
                      {trimmedUrl ? previewValue : `${platform.label} · waiting for a URL`}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => moveLink(index, -1)}
                      disabled={index === 0}
                      aria-label="Move link up"
                      className="ct-btn ct-btn-icon h-8 w-8 text-muted-2 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveLink(index, 1)}
                      disabled={index === links.length - 1}
                      aria-label="Move link down"
                      className="ct-btn ct-btn-icon h-8 w-8 text-muted-2 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeLink(link.id)}
                      aria-label="Remove link"
                      className="ct-btn ct-btn-icon h-8 w-8 text-muted-2 hover:bg-danger-soft hover:text-danger"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <label className="ct-label">URL</label>
                    <input
                      type="url"
                      value={link.url}
                      onChange={(e) => updateLink(link.id, { url: e.target.value })}
                      placeholder="https://instagram.com/royalbarber"
                      spellCheck={false}
                      className="ct-control"
                    />
                  </div>
                  <div>
                    <label className="ct-label">Label (optional)</label>
                    <input
                      type="text"
                      value={link.label}
                      maxLength={100}
                      onChange={(e) => updateLink(link.id, { label: e.target.value })}
                      placeholder={platform.key === 'globe' ? 'Our website' : platform.label}
                      className="ct-control"
                    />
                  </div>
                </div>

                {trimmedUrl && (
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11.5px] font-medium text-muted-2 transition-colors duration-150 hover:text-brand-text"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {href.replace(/^https?:\/\//, '')}
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
