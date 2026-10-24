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
  /** Display-only running number for the section heading on the public card. */
  sectionIndex?: number;
}

/** Above this many photos a 2x2 grid gets cramped, so we switch to a carousel. */
const GRID_THRESHOLD = 4;

export default function ConnectPublicGallery({
  images,
  featuredUrl,
  businessName,
  onImageOpen,
  sectionIndex,
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
    <section aria-label="Photo catalogue" className="bc-in pt-10">
      {/* Section header */}
      <div className="px-5">
        <h2 className="bc-heading">
          {sectionIndex ? (
            <span aria-hidden className="bc-heading-num">
              {String(sectionIndex).padStart(2, '0')}
            </span>
          ) : (
            <Images aria-hidden className="h-4 w-4 self-center text-brand-text" strokeWidth={2.25} />
          )}
          <span>Gallery</span>
          <span className="bc-heading-meta ct-num normal-case">
            {ordered.length} photo{ordered.length === 1 ? '' : 's'}
          </span>
        </h2>
        {useCarousel && (
          <p className="-mt-1.5 mb-3 flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-brand-text">
            <span aria-hidden className="h-[2px] w-5 rounded-[2px] bg-brand" />
            Swipe &rarr;
          </p>
        )}
      </div>

      {useCarousel ? (
        /* ---------------- HORIZONTAL CAROUSEL (5+ photos) ---------------- */
        <div className="ct-scroll-none flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pb-2 pt-1">
          {ordered.map((url, index) => (
            <button
              key={url}
              type="button"
              onClick={() => open(index)}
              aria-label={`Open photo ${index + 1} of ${ordered.length}`}
              className={cn(
                'bc-shot group aspect-[3/4] shrink-0 snap-start',
                index === 0 ? 'w-[64%]' : 'w-[44%]'
              )}
            >
              <Image
                src={url}
                alt={`${businessName} photo ${index + 1}`}
                fill
                sizes="(max-width: 480px) 60vw, 260px"
                className={cn('object-cover', loaded[url] ? 'opacity-100' : 'opacity-0')}
                onLoad={() => setLoaded((prev) => ({ ...prev, [url]: true }))}
                onError={() => setLoaded((prev) => ({ ...prev, [url]: true }))}
              />
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-1/3 bg-gradient-to-t from-black/45 to-transparent"
              />
              <span className="absolute bottom-2 right-2 z-[1] flex h-8 w-8 items-center justify-center rounded-[11px] bg-white/20 text-white backdrop-blur-sm transition-transform duration-200 group-hover:scale-110">
                <Expand className="h-3.5 w-3.5" strokeWidth={2.25} />
              </span>
              {index === 0 && featuredUrl === url && (
                <span className="ct-chip absolute left-2.5 top-2.5 z-[1] bg-brand px-2.5 py-1 text-[9.5px] uppercase tracking-[0.1em] text-on-brand shadow-md">
                  Featured
                </span>
              )}
            </button>
          ))}
        </div>
      ) : (
        /* ---------------- 2x2 GRID (1-4 photos) ---------------- */
        <div className="px-5">
          <div className={cn('grid gap-3', ordered.length === 1 ? 'grid-cols-1' : 'grid-cols-2')}>
            {ordered.map((url, index) => (
              <button
                key={url}
                type="button"
                onClick={() => open(index)}
                aria-label={`Open photo ${index + 1} of ${ordered.length}`}
                className={cn(
                  'bc-shot group',
                  ordered.length === 1 ? 'aspect-[4/3] w-full' : 'aspect-square',
                  /* An odd last photo spans the row instead of leaving a hole. */
                  ordered.length === 3 && index === 0 && 'col-span-2 aspect-[2/1]'
                )}
              >
                <Image
                  src={url}
                  alt={`${businessName} photo ${index + 1}`}
                  fill
                  sizes={
                    ordered.length === 1 ? '(max-width: 480px) 90vw, 420px' : '(max-width: 480px) 45vw, 210px'
                  }
                  className={cn('object-cover', loaded[url] ? 'opacity-100' : 'opacity-0')}
                  onLoad={() => setLoaded((prev) => ({ ...prev, [url]: true }))}
                  onError={() => setLoaded((prev) => ({ ...prev, [url]: true }))}
                />
                {featuredUrl === url && (
                  <span className="ct-chip absolute left-2.5 top-2.5 z-[1] bg-brand px-2.5 py-1 text-[9.5px] uppercase tracking-[0.1em] text-on-brand shadow-md">
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
