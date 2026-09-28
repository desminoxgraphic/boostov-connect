'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ConnectBusiness } from '@/lib/connect-types';
import ConnectGalleryManager from '@/components/ConnectGalleryManager';
import ConnectCustomizationFields, {
  ConnectCustomizationValues,
} from '@/components/ConnectCustomizationFields';
import ConnectBottomMessageFields, {
  ConnectBottomMessageValues,
} from '@/components/ConnectBottomMessageFields';
import ConnectContactFields, {
  ConnectContactValues,
} from '@/components/ConnectContactFields';
import ConnectSocialLinksFields, {
  ConnectSocialLinkItem,
} from '@/components/ConnectSocialLinksFields';
import { DEFAULT_THEME_COLOR } from '@/lib/connect-theme';
import { detectConnectPlatform, syncLegacySocialColumns } from '@/lib/connect-platforms';
import { normalizeConnectSlug, CONNECT_DESCRIPTION_MAX } from '@/lib/connect-utils';
import { ArrowLeft, Upload, Loader2, Sparkles } from 'lucide-react';

interface PageProps {
  params: { id: string };
}

const EMPTY_CONTACT: ConnectContactValues = {
  email: '',
  phone: '',
  websiteUrl: '',
  whatsappNumber: '',
  secondPhone: '',
  officePhone: '',
  address: '',
  fax: '',
};

export default function EditConnectBusinessPage({ params }: PageProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');

  const [contact, setContact] = useState<ConnectContactValues>(EMPTY_CONTACT);
  const [isActive, setIsActive] = useState(true);

  const [customization, setCustomization] = useState<ConnectCustomizationValues>({
    themeColor: DEFAULT_THEME_COLOR,
    category: '',
    bottomTaglinePreview: '',
    bottomButtonPreview: '',
  });
  const [bottomMessage, setBottomMessage] = useState<ConnectBottomMessageValues>({
    bottomTagline: '',
    bottomButtonText: '',
  });
  const [themingSupported, setThemingSupported] = useState(true);
  const [contactRowsSupported, setContactRowsSupported] = useState(true);
  const [bottomMessageSupported, setBottomMessageSupported] = useState(true);

  const [socialLinks, setSocialLinks] = useState<ConnectSocialLinkItem[]>([]);

  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [galleryFeaturedUrl, setGalleryFeaturedUrl] = useState('');
  const [galleryFeaturedSupported, setGalleryFeaturedSupported] = useState(true);

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patchContact = (patch: Partial<ConnectContactValues>) =>
    setContact((prev) => ({ ...prev, ...patch }));

  const patchCustomization = (patch: Partial<ConnectCustomizationValues>) =>
    setCustomization((prev) => ({ ...prev, ...patch }));

  const patchBottomMessage = (patch: Partial<ConnectBottomMessageValues>) =>
    setBottomMessage((prev) => {
      const next = { ...prev, ...patch };
      // Keep the theme swatch preview in step with the real bottom card.
      setCustomization((cur) => ({
        ...cur,
        bottomTaglinePreview: next.bottomTagline.trim(),
        bottomButtonPreview: next.bottomButtonText.trim(),
      }));
      return next;
    });

  const fetchBusiness = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/connect/businesses/${params.id}`);
      if (!res.ok) {
        setError('Business profile not found.');
        return;
      }
      const data: {
        business: ConnectBusiness;
        links: { id: string; label: string; url: string }[];
        capabilities?: {
          gallery_featured?: boolean;
          theming?: boolean;
          contact_rows?: boolean;
          bottom_message?: boolean;
        };
      } = await res.json();
      const b = data.business;

      setName(b.name);
      setSlug(b.slug);
      setDescription(b.description || '');
      setLogoUrl(b.logo_url || '');
      setCoverImageUrl(b.cover_image_url || '');
      setIsActive(b.is_active);
      setGalleryImages(Array.isArray(b.gallery_images) ? b.gallery_images : []);
      setGalleryFeaturedUrl(b.gallery_featured_url || '');

      setContact({
        email: b.email || '',
        phone: b.phone || '',
        websiteUrl: b.website_url || '',
        whatsappNumber: b.whatsapp_number || '',
        secondPhone: b.second_phone || '',
        officePhone: b.office_phone || '',
        address: b.address || '',
        fax: b.fax || '',
      });

      setBottomMessage({
        bottomTagline: b.bottom_tagline || '',
        bottomButtonText: b.bottom_button_text || '',
      });

      setCustomization({
        themeColor: b.theme_color || DEFAULT_THEME_COLOR,
        category: b.category || '',
        bottomTaglinePreview: (b.bottom_tagline || '').trim(),
        bottomButtonPreview: (b.bottom_button_text || '').trim(),
      });

      if (data.capabilities) {
        setGalleryFeaturedSupported(Boolean(data.capabilities.gallery_featured));
        setThemingSupported(data.capabilities.theming !== false);
        setContactRowsSupported(data.capabilities.contact_rows !== false);
        setBottomMessageSupported(data.capabilities.bottom_message !== false);
      }

      /**
       * Existing profiles keep their Instagram/Facebook/TikTok/YouTube values
       * in the old fixed columns. They are lifted into the unified list so the
       * editor shows one system, and they are still saved back into the fixed
       * columns on submit (see `syncLegacySocialColumns`) so the per-platform
       * analytics counters and older clients are unaffected.
       */
      const managed = (data.links || [])
        .filter((link) => link.url && link.url.trim())
        .map((link) => ({ id: link.id, url: link.url.trim(), label: (link.label || '').trim() }));

      const legacySeeds: ConnectSocialLinkItem[] = [];
      const legacyColumns: [string, string, string][] = [
        ['legacy-instagram', b.instagram_handle || '', 'https://instagram.com/'],
        ['legacy-facebook', b.facebook_url || '', 'https://facebook.com/'],
        ['legacy-tiktok', b.tiktok_handle || '', 'https://tiktok.com/'],
        ['legacy-youtube', b.youtube_url || '', 'https://youtube.com/'],
      ];

      for (const [id, raw, base] of legacyColumns) {
        const value = (raw || '').trim();
        if (!value) continue;
        const url = /^https?:\/\//i.test(value)
          ? value
          : `${base}${value.replace(/^@/, '').replace(/^\/+/, '')}`;
        legacySeeds.push({ id, url, label: '' });
      }

      // Managed links win; a legacy seed that duplicates one is dropped.
      const managedKeys = new Set(managed.map((link) => detectConnectPlatform(link.url).key));
      setSocialLinks([
        ...managed,
        ...legacySeeds.filter((seed) => !managedKeys.has(detectConnectPlatform(seed.url).key)),
      ]);
    } catch (err: any) {
      setError(`Failed loading profile: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBusiness();
  }, [params.id]);

  const handleFileUpload = async (file: File, kind: 'logo' | 'cover') => {
    try {
      if (kind === 'logo') setUploadingLogo(true);
      else setUploadingCover(true);

      setError(null);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('kind', kind);
      formData.append('business_id', params.id);

      const res = await fetch('/api/admin/assets', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Upload failed.');
        return;
      }

      if (kind === 'logo') setLogoUrl(data.url);
      else setCoverImageUrl(data.url);
    } catch (err: any) {
      setError(`Upload error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setUploadingLogo(false);
      setUploadingCover(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !slug.trim()) {
      setError('Business name and slug are required.');
      return;
    }

    const validLinks = socialLinks
      .filter((link) => link.url.trim())
      .map((link, index) => ({
        // Forward the id so the API updates this row in place and keeps its
        // historical click events attached.
        ...(link.id ? { id: link.id } : {}),
        label: (link.label.trim() || defaultLabelFor(link.url)).slice(0, 100),
        url: link.url.trim(),
        icon: detectConnectPlatform(link.url).key,
        sort_order: index,
      }));

    // Keep the old fixed social columns aligned with the managed list.
    const legacyMirror = syncLegacySocialColumns(validLinks);

    try {
      setSubmitting(true);
      const res = await fetch(`/api/admin/connect/businesses/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          description: description.trim(),
          logo_url: logoUrl,
          cover_image_url: coverImageUrl,
          phone: contact.phone.trim(),
          website_url: contact.websiteUrl.trim(),
          whatsapp_number: contact.whatsappNumber.trim(),
          ...legacyMirror,
          gallery_images: galleryImages,
          gallery_featured_url: galleryFeaturedUrl,
          theme_color: customization.themeColor,
          email: contact.email.trim(),
          address: contact.address.trim(),
          category: customization.category.trim(),
          second_phone: contact.secondPhone.trim(),
          office_phone: contact.officePhone.trim(),
          fax: contact.fax.trim(),
      bottom_tagline: bottomMessage.bottomTagline.trim(),
      bottom_button_text: bottomMessage.bottomButtonText.trim(),
          is_active: isActive,
          links: validLinks,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to update business profile.');
        return;
      }

      router.push('/admin');
    } catch (err: any) {
      setError(`Error saving profile: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted">
          <Loader2 className="h-7 w-7 animate-spin text-brand" />
          <span className="text-[13px]">Loading profile details...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh pb-14">
      <header className="sticky top-0 z-20 border-b border-line bg-glass backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Link
            href="/admin"
            className="ct-btn ct-btn-sm ct-btn-quiet"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Admin
          </Link>
          <div className="flex min-w-0 items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0 text-brand-text" />
            <h1 className="truncate text-[15px] font-semibold text-ink">Edit Connect Profile</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div
              role="alert"
              className="rounded-card border border-danger-border bg-danger-soft px-4 py-3 text-[13px] font-medium break-words text-danger"
            >
              {error}
            </div>
          )}

          {/* 1. BASIC INFO */}
          <section className="ct-card space-y-5 p-5 sm:p-6">
            <h2 className="ct-section-title">1. Basic Profile Information</h2>

            <div className="space-y-4">
              <div>
                <label className="ct-label">Business Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="ct-control"
                />
              </div>

              <div>
                <label className="ct-label">NFC Slug (URL identifier) *</label>
                <div className="ct-control flex items-center gap-1 px-3">
                  <span className="ct-num select-none text-[11.5px] text-muted-2">/connect/</span>
                  <input
                    type="text"
                    required
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="ct-num w-full bg-transparent text-xs font-semibold text-ink outline-none"
                  />
                </div>
                <p className="ct-hint mt-1.5">
                  Saved as <span className="font-mono">{normalizeConnectSlug(slug) || '…'}</span>
                </p>
              </div>

              <div>
                <label className="ct-label">Business Description</label>
                <textarea
                  rows={3}
                  maxLength={CONNECT_DESCRIPTION_MAX}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="ct-control resize-y"
                />
                <p className="ct-hint mt-1.5">
                  Shown under the business name on the public profile, and saved into the contact
                  card. {description.length}/{CONNECT_DESCRIPTION_MAX}
                </p>
              </div>
            </div>
          </section>

          {/* 2. LOGO & COVER */}
          <section className="ct-card space-y-5 p-5 sm:p-6">
            <h2 className="ct-section-title">2. Logo &amp; Cover Banner</h2>
            <p className="ct-hint -mt-2">
              The logo is shown as a circle on the card, so a square image works best.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="ct-label">Logo Image</label>
                {logoUrl ? (
                  <div className="ct-tile relative h-24 w-24 overflow-hidden border border-line bg-surface-2">
                    <Image src={logoUrl} alt="Logo" fill className="object-contain p-1.5" />
                  </div>
                ) : null}
                <label className="ct-btn ct-btn-sm cursor-pointer border border-line-strong">
                  {uploadingLogo ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Uploading Logo...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      <span>{logoUrl ? 'Change Logo' : 'Upload Logo'}</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    disabled={uploadingLogo}
                    onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'logo')}
                  />
                </label>
              </div>

              <div className="space-y-3">
                <label className="ct-label">Cover Banner Image</label>
                {coverImageUrl ? (
                  <div className="relative h-24 w-full overflow-hidden rounded-card border border-line bg-surface-2">
                    <Image src={coverImageUrl} alt="Cover" fill className="object-cover" />
                  </div>
                ) : null}
                <label className="ct-btn ct-btn-sm cursor-pointer border border-line-strong">
                  {uploadingCover ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Uploading Cover...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      <span>{coverImageUrl ? 'Change Cover' : 'Upload Cover Banner'}</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    disabled={uploadingCover}
                    onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'cover')}
                  />
                </label>
              </div>
            </div>
          </section>

          {/* 3. CARD APPEARANCE */}
          <ConnectCustomizationFields
            values={customization}
            onChange={patchCustomization}
            supported={themingSupported}
            categorySupported={contactRowsSupported}
          />

          {/* 4. CONTACT */}
          <section className="ct-card p-5 sm:p-6">
            <ConnectContactFields
              values={contact}
              onChange={patchContact}
              addressSupported={themingSupported}
              extraPhonesSupported={contactRowsSupported}
            />
          </section>

          {/* 5. LINKS & SOCIALS */}
          <section className="ct-card p-5 sm:p-6">
            <ConnectSocialLinksFields links={socialLinks} onChange={setSocialLinks} />
          </section>

          {/* 6. PHOTO GALLERY */}
          <section className="ct-card p-5 sm:p-6">
            <ConnectGalleryManager
              businessId={params.id}
              images={galleryImages}
              featuredUrl={galleryFeaturedUrl}
              featuredSupported={galleryFeaturedSupported}
              onChange={(nextImages, nextFeatured) => {
                setGalleryImages(nextImages);
                setGalleryFeaturedUrl(nextFeatured);
              }}
              onError={setError}
            />
          </section>

          {/* 7. BOTTOM MESSAGE */}
          <ConnectBottomMessageFields
            values={bottomMessage}
            onChange={patchBottomMessage}
            supported={bottomMessageSupported}
          />

          {/* STATUS TOGGLE */}
          <section className="ct-card flex items-center justify-between gap-4 p-5 sm:p-6">
            <div>
              <h3 className="ct-title text-[14.5px]">Profile Status</h3>
              <p className="ct-hint mt-1">Activate or disable public NFC profile page</p>
            </div>
            <label className="relative inline-flex shrink-0 cursor-pointer items-center">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="peer sr-only"
              />
              <span
                aria-hidden
                className="h-6 w-11 rounded-full bg-surface-3 transition-colors duration-200 peer-checked:bg-success peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:translate-x-0 after:rounded-full after:bg-surface after:shadow-sm after:transition-transform after:duration-200 after:content-[''] peer-checked:after:translate-x-5"
              />
            </label>
          </section>

          <button
            type="submit"
            disabled={submitting}
            className="ct-btn ct-btn-lg w-full bg-ink text-canvas hover:bg-ink-2 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Saving Profile Changes...</span>
              </>
            ) : (
              <span>Save Profile Changes</span>
            )}
          </button>
        </form>
      </main>
    </div>
  );
}

function defaultLabelFor(url: string): string {
  const platform = detectConnectPlatform(url);
  return platform.key === 'globe' ? 'Website' : platform.label;
}
