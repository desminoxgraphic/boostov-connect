'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import AdminTopBar from '@/components/AdminTopBar';
import ConnectGalleryManager from '@/components/ConnectGalleryManager';
import ConnectCustomizationFields, {
  ConnectCustomizationValues,
} from '@/components/ConnectCustomizationFields';
import ConnectContactFields, { ConnectContactValues } from '@/components/ConnectContactFields';
import ConnectSocialLinksFields, {
  ConnectSocialLinkItem,
} from '@/components/ConnectSocialLinksFields';
import ConnectBottomMessageFields, {
  ConnectBottomMessageValues,
} from '@/components/ConnectBottomMessageFields';
import { DEFAULT_THEME_COLOR } from '@/lib/connect-theme';
import { CONNECT_DESCRIPTION_MAX } from '@/lib/connect-utils';
import { detectConnectPlatform, syncLegacySocialColumns } from '@/lib/connect-platforms';
import { ArrowLeft, Upload, Loader2, Sparkles } from 'lucide-react';

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

export default function NewConnectBusinessPage() {
  const router = useRouter();

  // Generated up front so logo / cover / gallery uploads land under the same
  // folder prefix that the business row will use once it is created.
  const [tempBusinessId] = useState(() => crypto.randomUUID());

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');

  const [contact, setContact] = useState<ConnectContactValues>(EMPTY_CONTACT);
  const [isActive, setIsActive] = useState(true);

  const [socialLinks, setSocialLinks] = useState<ConnectSocialLinkItem[]>([]);

  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [galleryFeaturedUrl, setGalleryFeaturedUrl] = useState('');
  const [galleryFeaturedSupported, setGalleryFeaturedSupported] = useState(true);

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

  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/connect/gallery')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data?.capabilities) return;
        setGalleryFeaturedSupported(Boolean(data.capabilities.gallery_featured));
        setThemingSupported(data.capabilities.theming !== false);
        setContactRowsSupported(data.capabilities.contact_rows !== false);
        setBottomMessageSupported(data.capabilities.bottom_message !== false);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setName(newName);
    if (!slug || slug === name.toLowerCase().replace(/[^a-z0-9-]+/g, '-')) {
      setSlug(
        newName
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/-{2,}/g, '-')
          .replace(/^-|-$/g, '')
      );
    }
  };

  const handleFileUpload = async (file: File, kind: 'logo' | 'cover') => {
    try {
      if (kind === 'logo') setUploadingLogo(true);
      else setUploadingCover(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('kind', kind);
      formData.append('business_id', tempBusinessId);

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
      .map((link, index) => {
        const platform = detectConnectPlatform(link.url);
        return {
          label: (link.label.trim() || (platform.key === 'globe' ? 'Website' : platform.label)).slice(
            0,
            100
          ),
          url: link.url.trim(),
          icon: platform.key,
          sort_order: index,
        };
      });

    // Mirror into the legacy fixed social columns so per-platform analytics
    // keep working for the dashboard.
    const legacyMirror = syncLegacySocialColumns(validLinks);

    try {
      setSubmitting(true);
      const res = await fetch('/api/admin/connect/businesses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: tempBusinessId,
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
        setError(data.error || 'Failed to create Connect business.');
        return;
      }

      router.push('/admin');
    } catch (err: any) {
      setError(`Error creating profile: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="sh-page min-h-dvh">
      <AdminTopBar
        narrow
        title="New Boostov Connect Profile"
        subtitle="Boostov Connect"
        leading={
          <Link
            href="/admin"
            className="ct-btn ct-btn-icon h-10 w-10 border border-line bg-surface"
            title="Back to Admin"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to Admin</span>
          </Link>
        }
      >
        <Sparkles className="hidden h-4 w-4 text-brand-text sm:block" aria-hidden />
      </AdminTopBar>

      <main className="mx-auto max-w-3xl px-4 pt-6 sm:pb-10 sm:pt-8">
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          {error && (
            <div
              role="alert"
              className="rounded-[18px] border border-danger-border bg-danger-soft px-4 py-3.5 text-[13px] font-medium break-words text-danger"
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
                  placeholder="e.g. Royal Barber Shop, Apex Gym, Dental Clinic..."
                  value={name}
                  onChange={handleNameChange}
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
                    placeholder="royal-barber-shop"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="ct-num w-full bg-transparent text-xs font-semibold text-ink outline-none"
                  />
                </div>
                <p className="ct-hint mt-1.5">
                  The public address of this profile. Lowercase letters, numbers and dashes only.
                </p>
              </div>

              <div>
                <label className="ct-label">Business Description</label>
                <textarea
                  rows={3}
                  maxLength={CONNECT_DESCRIPTION_MAX}
                  placeholder="Premium services & grooming. Tap to view our links or save contact."
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
                  <div className="relative h-24 w-24 overflow-hidden rounded-[9999px] border border-line bg-white shadow-sm">
                    <Image src={logoUrl} alt="Logo Preview" fill className="object-contain p-1.5" />
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
                  <div className="relative h-28 w-full overflow-hidden rounded-[18px] border border-line bg-surface-2 shadow-sm">
                    <Image src={coverImageUrl} alt="Cover Preview" fill className="object-cover" />
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
              businessId={tempBusinessId}
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

          <div className="sh-savebar">
            <button type="submit" disabled={submitting} className="sh-save">
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Creating Boostov Connect Business...</span>
                </>
              ) : (
                <span>Create Boostov Connect Business</span>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
