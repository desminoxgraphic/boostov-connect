'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ImagePlus, Loader2, MessageCircle, Plus, Trash2, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { compressImage } from '@/lib/image-compress';
import { MAX_GALLERY_IMAGES, type MerchantProduct } from '@/lib/reseller-validation';
import type { EditableMerchant } from '@/lib/reseller-merchants';

type Values = Omit<EditableMerchant, 'id' | 'slug'>;

const EMPTY: Values = {
  product: 'connect',
  name: '',
  logo_url: null,
  phone: '',
  whatsapp_number: '',
  instagram_handle: '',
  website_url: '',
  email: '',
  google_maps_url: '',
  gallery_images: [],
  google_review_url: '',
  discount_percentage: 10,
  is_active: true,
};

async function upload(file: File, merchantId: string, kind: 'logo' | 'gallery'): Promise<string> {
  const compressed = await compressImage(file, kind === 'logo' ? 512 : 1600);
  const form = new FormData();
  form.set('file', compressed);
  form.set('merchant_id', merchantId);
  form.set('kind', kind);
  const res = await fetch('/api/reseller/assets', { method: 'POST', body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.url) throw new Error(data.error || 'Upload failed.');
  return data.url as string;
}

export default function MerchantForm({
  merchantId,
  initial,
  growEnabled,
  supportUrl,
}: {
  merchantId: string;
  /** null when creating. */
  initial: EditableMerchant | null;
  growEnabled: boolean;
  supportUrl: string;
}) {
  const router = useRouter();
  const editing = initial !== null;
  const [values, setValues] = useState<Values>(initial ?? EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<'logo' | 'gallery' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [limitHit, setLimitHit] = useState(false);
  const logoInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);

  const set = <K extends keyof Values>(key: K, value: Values[K]) => setValues((v) => ({ ...v, [key]: value }));
  const isGrow = values.product === 'grow';

  const onLogo = async (file?: File) => {
    if (!file) return;
    setError(null);
    setUploading('logo');
    try {
      set('logo_url', await upload(file, merchantId, 'logo'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setUploading(null);
      if (logoInput.current) logoInput.current.value = '';
    }
  };

  const onGallery = async (files: FileList | null) => {
    if (!files?.length) return;
    setError(null);
    const room = MAX_GALLERY_IMAGES - values.gallery_images.length;
    const picked = Array.from(files).slice(0, room);
    if (files.length > room) setError(`Only ${MAX_GALLERY_IMAGES} photos per merchant. Extra photos were skipped.`);
    setUploading('gallery');
    try {
      const urls: string[] = [];
      for (const file of picked) urls.push(await upload(file, merchantId, 'gallery'));
      setValues((v) => ({ ...v, gallery_images: [...v.gallery_images, ...urls].slice(0, MAX_GALLERY_IMAGES) }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setUploading(null);
      if (galleryInput.current) galleryInput.current.value = '';
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || uploading) return;
    setError(null);
    setLimitHit(false);
    setSaving(true);
    try {
      const res = await fetch(editing ? `/api/reseller/merchants/${merchantId}` : '/api/reseller/merchants', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, id: merchantId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLimitHit(data.code === 'limit');
        throw new Error(data.error || 'Could not save.');
      }
      router.push(editing ? '/dashboard' : `/dashboard/merchants/${data.id}/share`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  const field = (
    key: keyof Values,
    label: string,
    opts: { type?: string; placeholder?: string; hint?: string; inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'] } = {}
  ) => (
    <div>
      <label className="ct-label" htmlFor={`m-${key}`}>
        {label}
      </label>
      <input
        id={`m-${key}`}
        type={opts.type ?? 'text'}
        inputMode={opts.inputMode}
        value={String(values[key] ?? '')}
        onChange={(e) => set(key, e.target.value as never)}
        placeholder={opts.placeholder}
        className="ct-control"
      />
      {opts.hint && <p className="ct-hint">{opts.hint}</p>}
    </div>
  );

  return (
    <form onSubmit={submit} className="space-y-5">
      <section className="ct-card space-y-5 p-5 sm:p-6">
        <h2 className="ct-section-title">Business</h2>

        {!editing && (
          <div>
            <span className="ct-label">Product</span>
            <div className="grid grid-cols-2 gap-2">
              {(['connect', 'grow'] as MerchantProduct[]).map((p) => {
                const disabled = p === 'grow' && !growEnabled;
                return (
                  <button
                    key={p}
                    type="button"
                    disabled={disabled}
                    onClick={() => set('product', p)}
                    aria-pressed={values.product === p}
                    className={cn(
                      'rounded-[16px] border px-4 py-3 text-left transition-colors',
                      values.product === p ? 'border-brand bg-brand-soft' : 'border-line bg-surface',
                      disabled && 'cursor-not-allowed opacity-50'
                    )}
                  >
                    <span className="block text-[14px] font-bold text-ink">{p === 'grow' ? 'Grow' : 'Connect'}</span>
                    <span className="block text-[12px] text-muted">
                      {p === 'grow'
                        ? disabled
                          ? 'Not enabled on your account'
                          : 'Google reviews + discount'
                        : 'Digital business card'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {field('name', 'Business name', { placeholder: 'e.g. Café Atlas' })}

        <div>
          <span className="ct-label">Logo</span>
          <div className="flex items-center gap-4">
            <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full border border-line bg-surface-2">
              {values.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={values.logo_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <ImagePlus className="h-6 w-6 text-muted" />
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => logoInput.current?.click()}
                disabled={uploading !== null}
                className="ct-btn ct-btn-sm h-10 border border-line bg-surface px-4"
              >
                {uploading === 'logo' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {values.logo_url ? 'Replace' : 'Upload'}
              </button>
              {values.logo_url && (
                <button
                  type="button"
                  onClick={() => set('logo_url', null)}
                  className="ct-btn ct-btn-sm h-10 border border-line bg-surface px-3 text-danger"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove
                </button>
              )}
            </div>
            <input
              ref={logoInput}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => onLogo(e.target.files?.[0])}
            />
          </div>
          <p className="ct-hint">Square image works best. It is compressed automatically.</p>
        </div>
      </section>

      <section className="ct-card space-y-5 p-5 sm:p-6">
        <h2 className="ct-section-title">{isGrow ? 'Reviews & offer' : 'Contact links'}</h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {field('phone', 'Phone', { type: 'tel', inputMode: 'tel', placeholder: '+212 6…' })}
          {isGrow ? (
            <>
              {field('google_review_url', 'Google review link', { type: 'url', placeholder: 'https://g.page/r/…/review' })}
              {field('discount_percentage', 'Discount offer (%)', { inputMode: 'numeric', placeholder: '10' })}
            </>
          ) : (
            <>
              {field('whatsapp_number', 'WhatsApp', { type: 'tel', inputMode: 'tel', placeholder: '+212 6…' })}
              {field('instagram_handle', 'Instagram', { placeholder: '@business' })}
              {field('website_url', 'Website', { type: 'url', placeholder: 'https://…' })}
              {field('email', 'Email', { type: 'email', inputMode: 'email', placeholder: 'contact@…' })}
              {field('google_maps_url', 'Google Maps link', { type: 'url', placeholder: 'https://maps.app.goo.gl/…' })}
            </>
          )}
        </div>
      </section>

      {!isGrow && (
        <section className="ct-card space-y-4 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="ct-section-title">Photos</h2>
            <span className="ct-num text-[12px] text-muted">
              {values.gallery_images.length} / {MAX_GALLERY_IMAGES}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {values.gallery_images.map((url) => (
              <div key={url} className="group relative aspect-square overflow-hidden rounded-[14px] bg-surface-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => set('gallery_images', values.gallery_images.filter((u) => u !== url))}
                  className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white"
                  aria-label="Remove photo"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {values.gallery_images.length < MAX_GALLERY_IMAGES && (
              <button
                type="button"
                onClick={() => galleryInput.current?.click()}
                disabled={uploading !== null}
                className="grid aspect-square place-items-center rounded-[14px] border-2 border-dashed border-line-strong text-muted hover:border-brand hover:text-brand-text"
                aria-label="Add photos"
              >
                {uploading === 'gallery' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
              </button>
            )}
          </div>
          <input
            ref={galleryInput}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            className="hidden"
            onChange={(e) => onGallery(e.target.files)}
          />
        </section>
      )}

      {editing && (
        <label className="ct-card flex cursor-pointer items-center justify-between gap-4 p-5">
          <span>
            <span className="block text-[14px] font-bold text-ink">Page is live</span>
            <span className="ct-meta">Turn off to show &quot;profile not available&quot; when the card is tapped.</span>
          </span>
          <input
            type="checkbox"
            checked={values.is_active}
            onChange={(e) => set('is_active', e.target.checked)}
            className="h-5 w-5 accent-[var(--bx-blue)]"
          />
        </label>
      )}

      {error && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-[16px] border border-danger-border bg-danger-soft px-4 py-3 text-[13px] font-medium text-danger sm:flex-row sm:items-center sm:justify-between"
        >
          <span>{error}</span>
          {limitHit && (
            <a href={supportUrl} target="_blank" rel="noreferrer" className="ct-btn ct-btn-sm h-9 bg-[#25D366] px-4 text-white">
              <MessageCircle className="h-4 w-4" /> Contact Boostov
            </a>
          )}
        </div>
      )}

      <button type="submit" disabled={saving || uploading !== null} className="sh-save">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        <span>{editing ? 'Save changes' : 'Create merchant'}</span>
      </button>
    </form>
  );
}
