'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, X, ArrowLeft, Loader2 } from 'lucide-react';

interface ConnectLightboxProps {
  images: string[];
  index: number;
  businessName: string;
  onClose: () => void;
  onStep: (direction: -1 | 1) => void;
  onGoTo: (index: number) => void;
}

const SWIPE_MIN_DISTANCE = 45;
const SWIPE_MAX_OFF_AXIS = 70;

export default function ConnectLightbox({
  images,
  index,
  businessName,
  onClose,
  onStep,
  onGoTo,
}: ConnectLightboxProps) {
  const [mounted, setMounted] = useState(false);
  const [ratio, setRatio] = useState(1);
  const [loaded, setLoaded] = useState(false);
  const [closing, setClosing] = useState(false);
  const [leaving, setLeaving] = useState<null | -1 | 1>(null);

  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const scrollBeforeOpen = useRef(0);
  const timers = useRef<number[]>([]);

  const [frame, setFrame] = useState({ w: 0, h: 0 });

  const count = images.length;
  const url = images[index];
  const hasPrev = index > 0;
  const hasNext = index < count - 1;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((id) => window.clearTimeout(id));
      pending.length = 0;
    };
  }, []);

  const later = useCallback((fn: () => void, delay: number) => {
    const id = window.setTimeout(fn, delay);
    timers.current.push(id);
  }, []);

  const requestClose = useCallback(() => {
    if (closing) return;
    setClosing(true);
    later(onClose, 180);
  }, [closing, later, onClose]);

  const go = useCallback(
    (direction: -1 | 1) => {
      if (direction === -1 && !hasPrev) return;
      if (direction === 1 && !hasNext) return;
      setLeaving(direction);
      setLoaded(false);
      later(() => {
        onStep(direction);
        setLeaving(null);
      }, 130);
    },
    [hasNext, hasPrev, later, onStep]
  );

  const jumpTo = useCallback(
    (target: number) => {
      if (target === index || target < 0 || target >= count) return;
      setLeaving(target > index ? 1 : -1);
      setLoaded(false);
      later(() => {
        onGoTo(target);
        setLeaving(null);
      }, 130);
    },
    [count, index, later, onGoTo]
  );

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    setLoaded(false);

    const probe = new window.Image();
    probe.onload = () => {
      if (cancelled) return;
      if (probe.naturalWidth && probe.naturalHeight) {
        setRatio(probe.naturalWidth / probe.naturalHeight);
      }
      setLoaded(true);
    };
    probe.onerror = () => {
      if (!cancelled) setLoaded(true);
    };
    probe.src = url;

    return () => {
      cancelled = true;
      probe.onload = null;
      probe.onerror = null;
    };
  }, [url]);

  useEffect(() => {
    const node = measureRef.current;
    if (!node) return;

    const measure = () => {
      const rect = node.getBoundingClientRect();
      setFrame((prev) =>
        Math.abs(prev.w - rect.width) < 0.5 && Math.abs(prev.h - rect.height) < 0.5
          ? prev
          : { w: rect.width, h: rect.height }
      );
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    window.addEventListener('orientationchange', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('orientationchange', measure);
    };
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;

    scrollBeforeOpen.current = window.scrollY;

    const root = document.documentElement;
    const prevRootOverflow = root.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    const prevTouchAction = document.body.style.touchAction;

    const gap = window.innerWidth - root.clientWidth;
    root.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    if (gap > 0) document.body.style.paddingRight = `${gap}px`;

    closeButtonRef.current?.focus();

    return () => {
      root.style.overflow = prevRootOverflow;
      document.body.style.overflow = prevBodyOverflow;
      document.body.style.paddingRight = prevPaddingRight;
      document.body.style.touchAction = prevTouchAction;
      window.scrollTo(0, scrollBeforeOpen.current);
    };
  }, [mounted]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        requestClose();
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        go(-1);
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        go(1);
        return;
      }
      if (event.key === 'Tab') {
        const focusables = stageRef.current?.parentElement?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href]'
        );
        if (!focusables || focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [go, requestClose]);

  const onTouchStart = (event: React.TouchEvent) => {
    const touch = event.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  };

  const onTouchEnd = (event: React.TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < SWIPE_MIN_DISTANCE) return;
    if (Math.abs(dy) > Math.abs(dx) + SWIPE_MAX_OFF_AXIS) return;
    go(dx < 0 ? 1 : -1);
  };

  if (!mounted || count === 0 || !url) return null;

  const narrow = frame.w > 0 && frame.w < 640;
  const padX = narrow ? Math.min(frame.w * 0.03, 12) : Math.min(frame.w * 0.06, 64);
  const padTop = Math.min(frame.h * 0.16, narrow ? 60 : 64);
  const padBottom = Math.min(frame.h * 0.14, narrow ? 52 : 56);

  const availableW = Math.max(frame.w - padX * 2, 1);
  const availableH = Math.max(frame.h - padTop - padBottom, 1);
  const boxW = frame.w > 0 && frame.h > 0 ? Math.min(availableW, availableH * ratio) : 0;
  const boxH = boxW > 0 ? boxW / ratio : 0;

  const enterClass =
    leaving === 1
      ? 'opacity-0 -translate-x-8'
      : leaving === -1
        ? 'opacity-0 translate-x-8'
        : 'opacity-100 translate-x-0';

  return createPortal(
    <div
      className={`fixed inset-0 z-[100] backdrop-blur-md transition-opacity duration-200 ${
        closing ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ backgroundColor: 'var(--scrim)' }}
      role="dialog"
      aria-modal="true"
      aria-label={`Photo ${index + 1} of ${count}`}
      onClick={requestClose}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-3 px-3 pt-3 sm:px-5 sm:pt-5">
        <button
          type="button"
          onClick={requestClose}
          aria-label="Back to profile"
          className="pointer-events-auto inline-flex h-10 items-center gap-1.5 rounded-full bg-white/10 px-3.5 text-[12px] font-bold text-white/90 backdrop-blur-md transition-colors hover:bg-white/20 active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Back</span>
        </button>

        <span
          className="ct-num select-none text-[12px] font-semibold tracking-[0.04em] text-white/80"
          aria-live="polite"
        >
          {index + 1} / {count}
        </span>

        <button
          ref={closeButtonRef}
          type="button"
          onClick={requestClose}
          aria-label="Close photo viewer"
          className="pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/20 active:scale-95"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div
        ref={stageRef}
        className="absolute inset-0 flex items-center justify-center"
        onClick={(event) => event.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div ref={measureRef} className="pointer-events-none absolute inset-0" aria-hidden="true" />

        <div
          className={`relative shrink-0 overflow-hidden rounded-[20px] bg-black/40 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.85)] transition-all duration-300 ease-out ${enterClass} ${
            loaded && boxW > 0 ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            width: boxW || undefined,
            height: boxH || undefined,
          }}
        >
          <Image
            src={url}
            alt={`${businessName} photo ${index + 1}`}
            fill
            sizes="100vw"
            priority
            draggable={false}
            className="select-none object-contain"
          />
        </div>

        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-white/70" />
          </div>
        )}

        {hasPrev && (
          <button
            type="button"
            onClick={(event) => { event.stopPropagation(); go(-1); }}
            aria-label="Previous photo"
            className="absolute left-2 top-1/2 z-10 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition-all hover:bg-black/70 active:scale-90 sm:left-4"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        {hasNext && (
          <button
            type="button"
            onClick={(event) => { event.stopPropagation(); go(1); }}
            aria-label="Next photo"
            className="absolute right-2 top-1/2 z-10 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition-all hover:bg-black/70 active:scale-90 sm:right-4"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
      </div>

      {count > 1 && (
        <div
          className="absolute inset-x-0 bottom-0 z-30 flex items-center justify-center gap-1.5 overflow-x-auto px-4 pb-4 [scrollbar-width:none] sm:pb-6 [&::-webkit-scrollbar]:hidden"
          onClick={(event) => event.stopPropagation()}
        >
          {images.map((thumbUrl, dotIndex) => (
            <button
              key={thumbUrl}
              type="button"
              onClick={() => jumpTo(dotIndex)}
              aria-label={`Go to photo ${dotIndex + 1}`}
              aria-current={dotIndex === index}
              className={`h-1.5 shrink-0 rounded-full transition-all duration-300 ${
                dotIndex === index ? 'w-6 bg-white' : 'w-1.5 bg-white/35 hover:bg-white/60'
              }`}
            />
          ))}
        </div>
      )}
    </div>,
    document.body
  );
}
