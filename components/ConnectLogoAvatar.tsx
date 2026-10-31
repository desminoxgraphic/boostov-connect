'use client';

import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

/**
 * The one place a business logo is drawn.
 *
 * Every surface that shows a business logo renders it through here, so the
 * avatar is a perfect circle at the same size with the same mask in light mode,
 * in dark mode, and in the visitor-chosen appearance of the public profile.
 *
 * The circular mask itself is not set here. It lives in `.ct-avatar` in
 * globals.css, in an unlayered rule, so no utility class and no theme block can
 * square the corners off by accident. This component only decides the size,
 * what fills the circle, and whether it needs a separating ring where it
 * overlaps a cover.
 */

const SIZES = {
  sm: { box: 'h-9 w-9', px: 36, text: 'text-[13px]', pad: 'p-1.5' },
  md: { box: 'h-12 w-12', px: 48, text: 'text-[16px]', pad: 'p-2' },
  lg: { box: 'h-[116px] w-[116px]', px: 116, text: 'text-[36px]', pad: 'p-2.5' },
} as const;

export type ConnectLogoAvatarSize = keyof typeof SIZES;

export interface ConnectLogoAvatarProps {
  name: string;
  logoUrl?: string | null;
  size?: ConnectLogoAvatarSize;
  /**
   * `floating` adds a ring outside the circle. Use it wherever the avatar
   * overlaps a cover or a photo: without it the disc edge disappears against a
   * dark cover in dark mode and the logo reads as a clipped polygon rather than
   * a circle.
   */
  ring?: 'none' | 'floating';
  /** `accent` tints the letter fallback with the business colour. */
  fallbackTone?: 'accent' | 'muted';
  className?: string;
  imageClassName?: string;
  /** Load first (the hero logo on a public card). */
  priority?: boolean;
}

export default function ConnectLogoAvatar({
  name,
  logoUrl,
  size = 'md',
  ring = 'none',
  fallbackTone = 'muted',
  className,
  imageClassName,
  priority = false,
}: ConnectLogoAvatarProps) {
  const { box, px, text, pad } = SIZES[size];
  const trimmed = (name || '').trim();

  return (
    <div
      /* `ct-avatar` owns the circular mask; nothing here may add a radius,
       * an overflow or a display utility, or the guarantee is lost. */
      className={cn(
        'ct-avatar',
        box,
        ring === 'floating' && 'ct-avatar-floating',
        fallbackTone === 'accent' && !logoUrl ? 'bg-brand' : 'bg-surface',
        className
      )}
    >
      {logoUrl ? (
        <Image
          src={logoUrl}
          alt={name}
          fill
          sizes={`${px}px`}
          priority={priority}
          /* `contain` so a rectangular or transparent upload is letterboxed
           * inside the circle instead of being cropped by it. */
          className={cn('object-contain', pad, imageClassName)}
        />
      ) : (
        <span
          aria-hidden
          className={cn(
            'select-none font-semibold leading-none',
            text,
            fallbackTone === 'accent' ? 'text-on-brand' : 'text-ink-2'
          )}
        >
          {(trimmed.charAt(0) || '?').toUpperCase()}
        </span>
      )}
    </div>
  );
}
