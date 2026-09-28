'use client';

import React, { useCallback, useMemo, useState } from 'react';
import Image from 'next/image';
import { Images, Expand } from 'lucide-react';
import ConnectLightbox from '@/components/ConnectLightbox';
import { cn } from '@/lib/utils';

interface ConnectPublicGalleryProps {
  images: string[];
  featuredUrl: string;
  businessName: string;
  onImageOpen?: (url: string, index: number) => void;
}

/** Above this many photos a 2x2 grid gets cramped, so we switch to a carousel. */
const GRID_THRESHOLD = 4;

export default function ConnectPublicGallery({
  images,
  featuredUrl,
  businessName,
  onImageOpen,
}: ConnectPublicGalleryProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});

  // The featured photo leads the gallery, everything else keeps admin order.
  const ordered = useMemo(() => {
    if (images.length === 0) return [];
    if (featuredUrl && images.includes(featuredUrl)) {
      return [featuredUrl, ...images.filter((url) => url !== featuredUrl)];
    }
    return images;
  }, [images, featuredUrl]);

  const useCarousel = ordered.length > GRID_THRESHOLD;

  const open = useCallback(
    (index: number) => {
      if (index < 0 || index >= ordered.length) return;
      setActiveIndex(index);
      if (onImageOpen) onImageOpen(ordered[index], index);
    },
    [ordered, onImageOpen]
  );

  const close = useCallback(() => setActiveIndex(null), []);

  const step = useCallback(
    (direction: -1 | 1) => {
      setActiveIndex((current) => {
        if (current === null) return current;
        const next = current + direction;
        if (next < 0 || next >= ordered.length) return current;
        return next;
      });
    },
    [ordered.length]
  );

  const goTo = useCallback((target: number) => {
    setActiveIndex(target);
  }, []);

  if (ordered.length === 0) return null;

  return (
    <section aria-label="Photo catalogue" className="animate-rise pt-7">
      {/* Section header */}
      <div className="mb-3 flex items-center justify-between px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="ct-tile h-8 w-8 bg-brand-soft text-brand-text">
            <Images className="h-4 w-4" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <h2 className="text-[13px] font-semibold leading-tight text-ink">Gallery</h2>
            <p className="ct-num truncate text-[11px] leading-tight text-muted">
              {ordered.length} photo{ordered.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>
        {useCarousel && (
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-2">
            Swipe &rarr;
          </span>
        )}
      </div>

      {useCarousel ? (
        /* ---------------- HORIZONTAL CAROUSEL (5+ photos) ---------------- */
        <div className="ct-scroll-none flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-5 pb-1">
          {ordered.map((url, index) => (
            <button
              key={url}
              type="button"
              onClick={() => open(index)}
              aria-label={`Open photo ${index + 1} of ${ordered.length}`}
              className={cn(
                'relative aspect-[3/4] shrink-0 snap-start overflow-hidden rounded-control border border-line',
                'bg-surface-2 transition-transform duration-150 active:scale-[0.98]',
                index === 0 ? 'w-[62%]' : 'w-[42%]'
              )}
            >
              <Image
                src={url}
                alt={`${businessName} photo ${index + 1}`}
                fill
                sizes="(max-width: 480px) 60vw, 260px"
                className={cn(
                  'object-cover transition-opacity duration-300',
                  loaded[url] ? 'opacity-100' : 'opacity-0'
                )}
                onLoad={() => setLoaded((prev) => ({ ...prev, [url]: true }))}
                onError={() => setLoaded((prev) => ({ ...prev, [url]: true }))}
              />
              <span className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-[10px] bg-black/45 text-white backdrop-blur-sm">
                <Expand className="h-3.5 w-3.5" strokeWidth={2} />
              </span>
              {index === 0 && featuredUrl === url && (
                <span className="ct-chip absolute left-2 top-2 bg-brand px-2 py-0.5 text-[9px] uppercase tracking-[0.08em] text-on-brand">
                  Featured
                </span>
              )}
            </button>
          ))}
        </div>
      ) : (
        /* ---------------- 2x2 GRID (1-4 photos) ---------------- */
        <div className="px-5">
          <div
            className={cn(
              'grid gap-2.5',
              ordered.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
            )}
          >
            {ordered.map((url, index) => (
              <button
                key={url}
                type="button"
                onClick={() => open(index)}
                aria-label={`Open photo ${index + 1} of ${ordered.length}`}
                className={cn(
                  'relative overflow-hidden rounded-control border border-line bg-surface-2',
                  'transition-transform duration-150 active:scale-[0.98]',
                  ordered.length === 1 ? 'aspect-[4/3] w-full' : 'aspect-square'
                )}
              >
                <Image
                  src={url}
                  alt={`${businessName} photo ${index + 1}`}
                  fill
                  sizes={
                    ordered.length === 1 ? '(max-width: 480px) 90vw, 420px' : '(max-width: 480px) 45vw, 210px'
                  }
                  className={cn(
                    'object-cover transition-opacity duration-300',
                    loaded[url] ? 'opacity-100' : 'opacity-0'
                  )}
                  onLoad={() => setLoaded((prev) => ({ ...prev, [url]: true }))}
                  onError={() => setLoaded((prev) => ({ ...prev, [url]: true }))}
                />
                {featuredUrl === url && (
                  <span className="ct-chip absolute left-2 top-2 bg-brand px-2 py-0.5 text-[9px] uppercase tracking-[0.08em] text-on-brand">
                    Featured
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {activeIndex !== null && (
        <ConnectLightbox
          images={ordered}
          index={activeIndex}
          businessName={businessName}
          onClose={close}
          onStep={step}
          onGoTo={goTo}
        />
      )}
    </section>
  );
}
