'use client';

import React from 'react';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ConnectRowItem {
  key: string;
  label: string;
  value: string;
  /** Omitted for informational rows that have nothing to open, e.g. a fax number. */
  href?: string;
  event: string;
  linkId?: string;
  metadata?: Record<string, unknown>;
  icon: React.ReactNode;
  tile: string;
  external: boolean;
}

interface Props {
  item: ConnectRowItem;
  onSelect: (item: ConnectRowItem) => void;
  /**
   * Presentation only. `row` sits inside a grouped list, `bento` is a large
   * tile for the primary contact actions; `bento-solid` is the accent tile.
   * Link, tracking and content are identical across all three.
   */
  variant?: 'row' | 'bento' | 'bento-solid';
}

export default function ConnectLinkRow({ item, onSelect, variant = 'row' }: Props) {
  const bento = variant !== 'row';
  const className = cn(
    'group',
    bento ? 'bc-bento' : 'bc-row',
    variant === 'bento-solid' && 'bc-bento-solid'
  );

  const go = item.href && (
    <span className="bc-row-go" aria-hidden>
      <ArrowRight className="h-4 w-4 rtl:-scale-x-100" strokeWidth={2.25} />
    </span>
  );

  const text = (
    <span className={cn('min-w-0', !bento && 'flex-1')}>
      <span
        dir="auto"
        className={cn(
          'block truncate font-semibold leading-tight',
          bento ? 'text-[15px] tracking-[-0.01em]' : 'text-[14px] text-ink'
        )}
      >
        {item.label}
      </span>
      <span
        dir="auto"
        className={cn(
          'mt-1 block truncate text-[12px] leading-tight',
          variant === 'bento-solid' ? 'opacity-80' : 'text-muted'
        )}
      >
        {item.value}
      </span>
    </span>
  );

  const body = bento ? (
    <>
      <span className="flex items-start justify-between gap-2">
        <span className={cn('bc-row-tile', item.tile)}>{item.icon}</span>
        {go}
      </span>
      {text}
    </>
  ) : (
    <>
      <span className={cn('bc-row-tile', item.tile)}>{item.icon}</span>
      {text}
      {go}
    </>
  );

  if (!item.href) {
    return <div className={className}>{body}</div>;
  }

  return (
    <a
      href={item.href}
      target={item.external ? '_blank' : undefined}
      rel={item.external ? 'noreferrer' : undefined}
      onClick={() => onSelect(item)}
      className={className}
    >
      {body}
    </a>
  );
}
