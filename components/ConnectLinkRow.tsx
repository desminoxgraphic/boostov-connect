'use client';

import React from 'react';
import { ChevronRightIcon } from './connect-platform-icons';
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
}

export default function ConnectLinkRow({ item, onSelect }: Props) {
  const className = cn(
    'group flex w-full items-center gap-3.5 rounded-control border border-line bg-surface px-3.5 py-3',
    'text-left shadow-xs transition-all duration-150',
    'hover:border-brand-soft-border hover:bg-surface-2 active:scale-[0.99]'
  );

  const body = (
    <>
      <span className={cn('ct-tile h-11 w-11', item.tile)}>{item.icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13.5px] font-semibold leading-tight text-ink transition-colors duration-150 group-hover:text-brand-text">
          {item.label}
        </span>
        <span className="mt-0.5 block truncate text-[11.5px] leading-tight text-muted">
          {item.value}
        </span>
      </span>
      {item.href && (
        <ChevronRightIcon className="h-4 w-4 shrink-0 text-muted-2 transition-all duration-150 group-hover:translate-x-0.5 group-hover:text-brand" />
      )}
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
