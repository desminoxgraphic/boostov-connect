'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import {
  Images,
  Upload,
  Loader2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Star,
  Plus,
  AlertTriangle,
  X,
} from 'lucide-react';
import { CONNECT_GALLERY_MAX_IMAGES } from '@/lib/connect-utils';
import { cn } from '@/lib/utils';

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const ACCEPT_ATTR = 'image/png,image/jpeg,image/webp,image/gif';
const MAX_FILE_BYTES = 10 * 1024 * 1024;

interface GalleryUpload {
  /** Stable local key (a URL is reused as the key once uploaded). */
  key: string;
  url: string;
  status: 'uploading' | 'ready' | 'error';
  error?: string;
}

interface ConnectGalleryManagerProps {
  businessId: string;
  images: string[];
  featuredUrl: string;
  onChange: (images: string[], featuredUrl: string) => void;
  onError?: (message: string | null) => void;
  /**
   * False until supabase/migrations/202609270001_add_connect_gallery.sql has
   * been applied. The featured-photo control is hidden rather than silently
   * dropping the admin's choice.
   */
  featuredSupported?: boolean;
  /** Upload endpoint; the reseller form uploads into the reseller's own folder. */
  uploadUrl?: string;
  maxImages?: number;
  /** Runs on each file before upload, e.g. browser-side compression. */
  prepareFile?: (file: File) => Promise<File>;
}

function readError(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object' && 'error' in payload) {
    const message = (payload as { error?: unknown }).error;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return fallback;
}

function describeFileError(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return `${file.name} is not a supported image (use PNG, JPG, WEBP or GIF).`;
  }
  if (file.size > MAX_FILE_BYTES) {
    return `${file.name} is larger than 10 MB.`;
  }
  return null;
}

export default function ConnectGalleryManager({
  businessId,
  images,
  featuredUrl,
  onChange,
  onError,
  featuredSupported = true,
  uploadUrl = '/api/admin/assets',
  maxImages = CONNECT_GALLERY_MAX_IMAGES,
  prepareFile,
}: ConnectGalleryManagerProps) {
  const [uploads, setUploads] = useState<GalleryUpload[]>([]);
  const [dragging, setDragging] = useState(false);
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);

  // Several files upload in parallel, so each completion must read the latest
  // list rather than the value captured when the upload started. These refs
  // are the authoritative source between renders.
  const imagesRef = useRef<string[]>(images);
  const featuredRef = useRef<string>(featuredUrl);

  imagesRef.current = images;
  featuredRef.current = featuredUrl;

  const commit = useCallback(
    (nextImages: string[], nextFeatured: string) => {
      imagesRef.current = nextImages;
      featuredRef.current = nextFeatured;
      onChange(nextImages, nextFeatured);
    },
    [onChange]
  );

  const busy = uploads.some((u) => u.status === 'uploading');
  const slotsInUse = images.length + uploads.filter((u) => u.status !== 'error').length;

  // Adopt any images that arrived from the server while we were not mounted.
  useEffect(() => {
    setUploads((prev) => {
      const known = new Set(prev.map((u) => u.url).filter(Boolean));
      const missing = images.filter((url) => !known.has(url));
      if (missing.length === 0) return prev;
      return [
        ...prev,
        ...missing.map((url) => ({ key: url, url, status: 'ready' as const })),
      ];
    });
  }, [images]);

  const reportError = useCallback(
    (message: string | null) => {
      if (onError) onError(message);
    },
    [onError]
  );

  const uploadFile = useCallback(
    async (file: File) => {
      const localError = describeFileError(file);
      if (localError) {
        setUploads((prev) => [
          ...prev,
          { key: `err-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, url: '', status: 'error', error: localError },
        ]);
        reportError(localError);
        return;
      }

      const key = `up-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setUploads((prev) => [...prev, { key, url: '', status: 'uploading' }]);

      try {
        const formData = new FormData();
        formData.append('file', prepareFile ? await prepareFile(file) : file);
        formData.append('kind', 'gallery');
        formData.append('business_id', businessId);

        const res = await fetch(uploadUrl, { method: 'POST', body: formData });
        const data = await res.json().catch(() => null);

        if (!res.ok) {
          const message = readError(data, `Could not upload ${file.name}.`);
          setUploads((prev) =>
            prev.map((u) => (u.key === key ? { ...u, status: 'error', error: message } : u))
          );
          reportError(message);
          return;
        }

        const url: string = data?.url;
        if (!url) {
          const message = `Upload of ${file.name} returned no URL.`;
          setUploads((prev) =>
            prev.map((u) => (u.key === key ? { ...u, status: 'error', error: message } : u))
          );
          reportError(message);
          return;
        }

        setUploads((prev) =>
          prev.map((u) => (u.key === key ? { ...u, key: url, url, status: 'ready' } : u))
        );

        if (!imagesRef.current.includes(url)) {
          commit([...imagesRef.current, url], featuredRef.current);
        }
      } catch (err) {
        const message = `Upload error: ${
          err instanceof Error ? err.message : String(err)
        }`;
        setUploads((prev) =>
          prev.map((u) => (u.key === key ? { ...u, status: 'error', error: message } : u))
        );
        reportError(message);
      }
    },
    [businessId, commit, reportError, uploadUrl, prepareFile]
  );

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;

      const files = Array.from(fileList);
      const room = maxImages - slotsInUse;
      const accepted = room > 0 ? files.slice(0, room) : [];

      if (accepted.length === 0) {
        reportError(
          `You can add up to ${maxImages} photos. Remove some to add more.`
        );
      } else if (accepted.length < files.length) {
        reportError(
          `Only ${accepted.length} of ${files.length} files were added (limit is ${maxImages} photos).`
        );
      } else {
        reportError(null);
      }

      accepted.forEach((file) => {
        void uploadFile(file);
      });
    },
    [slotsInUse, uploadFile, reportError, maxImages]
  );

  const removeAt = (index: number) => {
    const target = uploads[index];
    if (!target) return;

    setUploads((prev) => prev.filter((_, i) => i !== index));

    const current = imagesRef.current;
    if (index >= current.length) return;

    const removed = current[index];
    commit(
      current.filter((_, i) => i !== index),
      featuredRef.current === removed ? '' : featuredRef.current
    );
  };

  const move = (index: number, direction: -1 | 1) => {
    const current = imagesRef.current;
    const swapIndex = index + direction;
    if (swapIndex < 0 || swapIndex >= current.length) return;

    const next = [...current];
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
    commit(next, featuredRef.current);
  };

  const toggleFeatured = (index: number) => {
    const url = imagesRef.current[index];
    if (!url) return;
    commit(imagesRef.current, featuredRef.current === url ? '' : url);
  };

  // --- Lightbox -------------------------------------------------------------
  useEffect(() => {
    if (!activeUrl) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveUrl(null);
    };
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [activeUrl]);

  const lightboxIndex = activeUrl ? images.indexOf(activeUrl) : -1;

  const stepLightbox = (direction: -1 | 1) => {
    if (lightboxIndex < 0 || images.length === 0) return;
    const next = (lightboxIndex + direction + images.length) % images.length;
    setActiveUrl(images[next]);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="ct-section-title">6. Photo Catalogue / Gallery</h2>
          <p className="ct-hint mt-1.5">
            Upload your business photos from this device. They appear in a gallery on your public
            Boostov Connect page. The first photo is the cover shot.
          </p>
        </div>
        <span className="ct-chip ct-num shrink-0">{images.length} / {maxImages}</span>
      </div>

      {/* DROPZONE */}
      <div
        onDragEnter={(e) => {
          e.preventDefault();
          dragDepth.current += 1;
          setDragging(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={(e) => {
          e.preventDefault();
          dragDepth.current = Math.max(0, dragDepth.current - 1);
          if (dragDepth.current === 0) setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          dragDepth.current = 0;
          setDragging(false);
          handleFiles(e.dataTransfer?.files ?? null);
        }}
        className={cn(
          'rounded-card border-2 border-dashed p-5 text-center transition-colors duration-150 sm:p-6',
          dragging
            ? 'border-brand bg-brand-soft'
            : 'border-line-strong bg-surface-2 hover:border-brand-soft-border hover:bg-brand-soft'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_ATTR}
          multiple
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = '';
          }}
        />

        <span className="ct-tile mx-auto mb-3 h-11 w-11 bg-ink text-canvas">
          {busy ? <Loader2 className="h-5 w-5 animate-spin text-brand" /> : <Images className="h-5 w-5" />}
        </span>

        <p className="ct-body font-semibold text-ink">
          {dragging ? 'Drop photos here' : 'Drag & drop photos here'}
        </p>
        <p className="ct-hint mt-1">
          PNG, JPG, WEBP or GIF &middot; up to 10 MB each &middot; select many at once
        </p>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy || images.length >= maxImages}
          className="ct-btn ct-btn-sm mt-3.5 bg-ink text-canvas hover:bg-ink-2 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Upload className="w-3.5 h-3.5" />
          {busy ? 'Uploading...' : 'Choose Photos'}
        </button>
      </div>

      {uploads.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <h3 className="ct-label">
              Photos {images.length > 0 && `(${images.length} saved)`}
            </h3>
            {images.length > 1 && (
              <span className="ct-hint">
                {featuredSupported ? 'Arrows reorder' : 'Use arrows to reorder'}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {uploads.map((item, index) => {
              const isFeatured = Boolean(item.url) && item.url === featuredUrl;
              const isFirst = index === 0;

              return (
                <div
                  key={item.key}
                  className={cn(
                    'group relative overflow-hidden rounded-card border bg-surface-2 transition-colors duration-150',
                    isFeatured ? 'border-brand ring-2 ring-brand/25' : 'border-line'
                  )}
                >
                  <div className="relative aspect-square">
                    {item.url ? (
                      <Image
                        src={item.url}
                        alt={`Gallery photo ${index + 1}`}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        className="object-cover"
                      />
                    ) : item.status === 'uploading' ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted">
                        <Loader2 className="h-5 w-5 animate-spin text-brand" />
                        <span className="ct-label">Uploading</span>
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-2 text-center text-danger">
                        <AlertTriangle className="h-5 w-5" />
                        <span className="text-[10px] font-semibold leading-tight line-clamp-3">
                          {item.error || 'Upload failed'}
                        </span>
                      </div>
                    )}

                    {isFirst && item.status === 'ready' && (
                      <span className="ct-num absolute bottom-1.5 left-1.5 z-20 rounded-control bg-black/60 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
                        Cover
                      </span>
                    )}

                    {isFeatured && featuredSupported && (
                      <span className="ct-num absolute right-1.5 top-1.5 rounded-control bg-brand px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-on-brand">
                        Featured
                      </span>
                    )}

                    {/* Tap to preview larger */}
                    {item.status === 'ready' && (
                      <button
                        type="button"
                        aria-label={`Preview photo ${index + 1} larger`}
                        onClick={() => setActiveUrl(item.url)}
                        className="absolute inset-0 z-10"
                      />
                    )}

                    {/* Reorder */}
                    {item.status === 'ready' && (
                      <div className="absolute top-1.5 left-1.5 z-20 flex flex-col gap-1">
                        <button
                          type="button"
                          aria-label="Move photo earlier"
                          disabled={index === 0}
                          onClick={() => move(index, -1)}
                          className="ct-btn ct-btn-icon h-6 w-6 bg-white/90 text-black shadow-sm disabled:opacity-30"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label="Move photo later"
                          disabled={index === images.length - 1}
                          onClick={() => move(index, 1)}
                          className="ct-btn ct-btn-icon h-6 w-6 bg-white/90 text-black shadow-sm disabled:opacity-30"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Delete */}
                    <button
                      type="button"
                      aria-label="Delete photo"
                      onClick={() => removeAt(index)}
                      className="ct-btn ct-btn-icon absolute bottom-1.5 right-1.5 z-20 h-7 w-7 bg-danger text-white shadow-md active:scale-90"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {item.status === 'ready' && (
                    <div className="flex items-center justify-between gap-1 border-t border-line bg-surface p-2">
                      <span className="ct-num truncate text-[10px] text-muted-2">#{index + 1}</span>
                      {featuredSupported ? (
                        <button
                          type="button"
                          onClick={() => toggleFeatured(index)}
                          className={cn(
                            'inline-flex items-center gap-1 rounded-control px-2 py-1 text-[10px] font-semibold transition-colors duration-150',
                            isFeatured
                              ? 'bg-brand text-on-brand'
                              : 'bg-surface-2 text-muted hover:bg-brand-soft hover:text-brand-text'
                          )}
                        >
                          <Star className="w-3 h-3" />
                          {isFeatured ? 'Featured' : 'Set featured'}
                        </button>
                      ) : (
                        <span className="ct-num text-[10px] font-medium text-muted-2">
                          Photo {index + 1}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {images.length < maxImages && (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-card border-2 border-dashed border-line-strong bg-surface-2 text-muted transition-colors duration-150 hover:border-brand-soft-border hover:bg-brand-soft hover:text-brand-text"
              >
                <Plus className="w-5 h-5" />
                <span className="text-[10px] font-semibold uppercase tracking-wide">Add more</span>
              </button>
            )}
          </div>
        </>
      )}

      {images.length === 0 && !busy && (
        <p className="ct-hint text-center">
          No photos yet &mdash; the gallery stays hidden on your public page until you add at least one.
        </p>
      )}

      {!featuredSupported && (
        <p className="ct-hint rounded-control border border-warning-border bg-warning-soft px-3 py-2.5 leading-relaxed text-warning">
          Uploading, reordering and deleting all work. To also pick a <strong>featured photo</strong>,
          run <code className="font-mono text-[10.5px]">supabase/migrations/202609270001_add_connect_gallery.sql</code>{' '}
          in the Supabase SQL editor.
        </p>
      )}

      {/* LIGHTBOX PREVIEW */}
      {activeUrl && lightboxIndex >= 0 && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-scrim"
          role="dialog"
          aria-modal="true"
          aria-label="Photo preview"
          onClick={() => setActiveUrl(null)}
        >
          <div className="flex items-center justify-between px-4 py-4 text-ink-2">
            <span className="ct-num text-xs font-semibold">
              {lightboxIndex + 1} / {images.length}
            </span>
            <button
              type="button"
              aria-label="Close preview"
              onClick={() => setActiveUrl(null)}
              className="ct-btn ct-btn-icon h-9 w-9 border border-line bg-surface text-ink"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div
            className="flex-1 relative mx-4 mb-4"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={activeUrl}
              alt={`Gallery photo ${lightboxIndex + 1}`}
              fill
              sizes="100vw"
              className="object-contain"
            />
          </div>

          {images.length > 1 && (
            <div className="flex items-center justify-center gap-4 pb-6">
              <button
                type="button"
                aria-label="Previous photo"
                onClick={() => stepLightbox(-1)}
                className="ct-btn ct-btn-icon h-10 w-10 border border-line bg-surface text-ink"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                aria-label="Next photo"
                onClick={() => stepLightbox(1)}
                className="ct-btn ct-btn-icon h-10 w-10 border border-line bg-surface text-ink"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
