'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { Expand } from 'lucide-react';
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

/**
 * Editorial layout per photo count. Presentation only: every tile is the same
 * button opening the same lightbox at the same index.
 *  1 -> one wide frame
 *  2 -> two portrait frames
 *  3 -> tall lead + two stacked
 *  4 -> wide lead + three below
 */
function gridFor(count: number): { grid: string; tile: (index: number) => string; sizes: (index: number) => string } {
  const half = '(max-width: 480px) 45vw, 210px';
  const full = '(max-width: 480px) 90vw, 420px';
  switch (count) {
    case 1:
      return { grid: 'grid-cols-1', tile: () => 'aspect-[4/3]', sizes: () => full };
    case 2:
      return { grid: 'grid-cols-2', tile: () => 'aspect-[4/5]', sizes: () => half };
    case 3:
      return {
        grid: 'grid-cols-2 grid-rows-2 aspect-[1/1]',
        tile: (i) => (i === 0 ? 'row-span-2 h-full' : 'h-full'),
        sizes: () => half,
      };
    default:
      return {
        grid: 'grid-cols-3',
        tile: (i) => (i === 0 ? 'col-span-3 aspect-[16/10]' : 'aspect-square'),
        sizes: (i) => (i === 0 ? full : '(max-width: 480px) 30vw, 140px'),
      };
  }
}

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

  /* Reveal the tiles once the section scrolls into view. Opacity and the
   * `translate` property only, so it never fights the hover `transform`.
   * Without IntersectionObserver, or under reduced motion, it is simply shown. */
  const sectionRef = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;
    if (
      typeof IntersectionObserver === 'undefined' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setShown(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShown(true);
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.05 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [ordered.length]);

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

  const markLoaded = (url: string) => setLoaded((prev) => ({ ...prev, [url]: true }));

  const featuredChip = (
    <span className="bc-gal-featured">Featured</span>
  );

  const tileBody = (url: string, index: number, sizes: string) => (
    <>
      <Image
        src={url}
        alt={`${businessName} photo ${index + 1}`}
        fill
        sizes={sizes}
        className={cn('object-cover', loaded[url] ? 'opacity-100' : 'opacity-0')}
        onLoad={() => markLoaded(url)}
        onError={() => markLoaded(url)}
      />
      <span aria-hidden className="bc-gal-scrim" />
      <span aria-hidden className="bc-gal-expand">
        <Expand className="h-3.5 w-3.5" strokeWidth={2.25} />
      </span>
      {featuredUrl === url && (index === 0 || !useCarousel) && featuredChip}
    </>
  );

  const layout = gridFor(ordered.length);

  return (
    <section
      ref={sectionRef}
      aria-label="Photo catalogue"
      className="bc-gal pt-10"
      data-shown={shown ? '' : undefined}
    >
      {/* ---------------- Header ---------------- */}
      <div className="mb-4 flex items-end justify-between gap-3 px-5">
        <h2 className="flex min-w-0 items-center gap-3">
          {sectionIndex ? (
            <span aria-hidden className="bc-gal-index">
              {String(sectionIndex).padStart(2, '0')}
            </span>
          ) : null}
          <span className="min-w-0">
            <span className="block text-[10.5px] font-bold uppercase leading-none tracking-[0.18em] text-muted">
              Gallery
            </span>
            <span className="bc-display mt-1.5 block text-[20px] font-extrabold leading-none tracking-[-0.025em] text-ink">
              <span className="ct-num">{ordered.length}</span> photo{ordered.length === 1 ? '' : 's'}
            </span>
          </span>
        </h2>
        {useCarousel && (
          <span className="bc-gal-swipe">
            Swipe <span aria-hidden className="bc-gal-swipe-arrow">&rarr;</span>
          </span>
        )}
      </div>

      {useCarousel ? (
        /* ---------------- HORIZONTAL CAROUSEL (5+ photos) ---------------- */
        <div className="ct-scroll-none flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pb-3 pt-1">
          {ordered.map((url, index) => (
            <button
              key={url}
              type="button"
              onClick={() => open(index)}
              aria-label={`Open photo ${index + 1} of ${ordered.length}`}
              style={{ '--i': Math.min(index, 4) } as React.CSSProperties}
              className={cn(
                'bc-shot bc-gal-tile group shrink-0 snap-start',
                index === 0 ? 'aspect-[4/5] w-[70%]' : 'aspect-[3/4] w-[46%] self-end'
              )}
            >
              {tileBody(url, index, '(max-width: 480px) 70vw, 300px')}
            </button>
          ))}
        </div>
      ) : (
        /* ---------------- EDITORIAL GRID (1-4 photos) ---------------- */
        <div className="px-5">
          <div className={cn('grid gap-2.5', layout.grid)}>
            {ordered.map((url, index) => (
              <button
                key={url}
                type="button"
                onClick={() => open(index)}
                aria-label={`Open photo ${index + 1} of ${ordered.length}`}
                style={{ '--i': index } as React.CSSProperties}
                className={cn('bc-shot bc-gal-tile group w-full', layout.tile(index))}
              >
                {tileBody(url, index, layout.sizes(index))}
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
