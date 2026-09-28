'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import { ConnectBusiness, ConnectLink } from '@/lib/connect-types';
import { downloadVCard } from '@/lib/vcard';
import ConnectPublicGallery from '@/components/ConnectPublicGallery';
import ConnectAppearanceToggle from '@/components/ConnectAppearanceToggle';
import ConnectLinkRow, { ConnectRowItem } from '@/components/ConnectLinkRow';
import ConnectLogoAvatar from '@/components/ConnectLogoAvatar';
import ConnectPlatformIcon from '@/components/ConnectPlatformIcon';
import {
  WhatsAppIcon,
  MapsIcon,
  PhoneIcon,
  GlobeIcon,
  MailIcon,
  BuildingIcon,
  PrinterIcon,
  SmartphoneIcon,
} from '@/components/connect-platform-icons';
import { buildConnectActions, type ConnectActionDefinition } from '@/lib/connect-actions';
import { accentTokens, buildTheme, buildThemeForMode } from '@/lib/connect-theme';
import { useConnectAppearance } from '@/lib/use-connect-appearance';
import { UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ConnectPublicCardProps {
  business: ConnectBusiness;
  links: ConnectLink[];
  onTrack: (eventType: string, linkId?: string, metadata?: Record<string, unknown>) => void;
}

function SectionHeading({ label }: { label: string }) {
  return (
    <h2 className="ct-section-title mb-2.5 flex items-center gap-2">
      <span className="h-3 w-[3px] rounded-full bg-brand" />
      {label}
    </h2>
  );
}

/** Maps an action onto the brand mark the card has always used for it. */
function actionIcon(action: ConnectActionDefinition, className: string): React.ReactNode {
  switch (action.icon) {
    case 'mobile':
      return <PhoneIcon className={className} />;
    case 'whatsapp':
      return <WhatsAppIcon className={className} />;
    case 'smartphone':
      return <SmartphoneIcon className={className} />;
    case 'office':
      return <BuildingIcon className={className} />;
    case 'email':
      return <MailIcon className={className} />;
    case 'maps':
      return <MapsIcon className={className} />;
    case 'website':
      return <GlobeIcon className={className} />;
    case 'platform':
      return <ConnectPlatformIcon platform={action.platform} className={className} />;
    default:
      return <ConnectPlatformIcon platform="globe" className={className} />;
  }
}

export default function ConnectPublicCard({ business, links, onTrack }: ConnectPublicCardProps) {
  const appearance = useConnectAppearance();

  /* One accent, published for both appearances. CSS picks the right tints from
   * the visitor's choice, which is already on <html> before first paint. */
  const accent = useMemo(
    () =>
      accentTokens(
        buildTheme(business.theme_color),
        buildThemeForMode(business.theme_color, 'dark')
      ),
    [business.theme_color]
  );

  /* ---------------- ACTIONS ----------------
   * The action registry is the single source of truth for what this profile
   * offers. It also decides which rows are rendered, so a destination that is
   * both a contact field and a managed link can only ever appear once.
   */
  const actionSet = useMemo(() => buildConnectActions(business, links), [business, links]);

  const rowsFor = (section: 'contact' | 'social') =>
    actionSet.actions.filter((action) => action.section === section);

  /** Analytics metadata always carries the stable action key. */
  const metaFor = (action: ConnectActionDefinition) => ({
    action_key: action.key,
    label: action.label,
    platform: action.platform,
  });

  const saveAction = actionSet.byKey.get('page.save');
  const galleryAction = actionSet.byKey.get('page.gallery');

  const handleSaveContact = () => {
    if (saveAction) onTrack(saveAction.eventType, undefined, metaFor(saveAction));
    else onTrack('vcard');
    downloadVCard({
      name: business.name,
      phone: business.phone || business.whatsapp_number,
      whatsapp: business.whatsapp_number,
      secondPhone: business.second_phone,
      officePhone: business.office_phone,
      fax: business.fax,
      email: business.email,
      address: business.address,
      description: business.description,
      websiteUrl: business.website_url || (typeof window !== 'undefined' ? window.location.href : ''),
    });
  };

  const handleGalleryOpen = () => {
    if (galleryAction) onTrack(galleryAction.eventType, undefined, metaFor(galleryAction));
    else onTrack('gallery_open');
  };

  const softTile = 'bg-brand-soft text-brand-text';
  const solidTile = 'bg-brand text-on-brand';
  const icon = 'h-[18px] w-[18px]';

  const rowFor = (action: ConnectActionDefinition): ConnectRowItem => ({
    key: action.key,
    label: action.label,
    value: action.value,
    href: action.href,
    event: action.eventType,
    linkId: action.linkId,
    metadata: metaFor(action),
    icon: actionIcon(action, icon),
    tile: action.key === 'contact.mobile' ? solidTile : softTile,
    external: action.external,
  });

  /* ---------------- CONTACT ROWS ---------------- */
  const contactRows: ConnectRowItem[] = rowsFor('contact').map(rowFor);

  const fax = (business.fax || '').trim();
  if (fax) {
    // Informational only: there is nothing to open, so this is never an action
    // and is never tracked or counted.
    contactRows.push({
      key: 'contact.fax',
      label: 'Fax',
      value: fax,
      event: 'call',
      icon: <PrinterIcon className={icon} />,
      tile: softTile,
      external: false,
    });
  }

  const socialRows: ConnectRowItem[] = rowsFor('social').map(rowFor);

  const galleryImages = Array.isArray(business.gallery_images) ? business.gallery_images : [];
  const category = business.category?.trim() || '';
  /* `description` is the single source of truth for the hero copy. It used to
   * fall back to (and be duplicated by) the old `tagline` column, which is why
   * the admin form had two fields that both claimed to be the description. */
  const description = business.description?.trim() || '';
  const bottomTagline = business.bottom_tagline?.trim() || '';
  const bottomButtonText = business.bottom_button_text?.trim() || '';

  return (
    <div
      /* Load-bearing: the inline accent has to sit on the element that also
       * carries `connect-scope`, because globals.css derives every --brand-*
       * token from --business-accent on that exact node. A custom property is
       * resolved where it is declared, so publishing it on the inner card
       * would leave the derived family falling through to the :root default
       * blue -- the colour only ever half-applied bug. */
      style={accent}
      className="connect-scope flex min-h-dvh justify-center bg-canvas text-ink sm:py-6"
      data-resolved-appearance={appearance.resolved}
    >
      <div className="flex w-full max-w-card flex-col border-x border-line bg-surface shadow-lg sm:rounded-card sm:border">
        {/* ---------------- COVER ---------------- */}
        <div className="relative h-[176px] w-full overflow-hidden bg-brand-soft sm:h-[200px] sm:rounded-t-card">
          {business.cover_image_url ? (
            <Image
              src={business.cover_image_url}
              alt=""
              fill
              priority
              sizes="440px"
              className="object-cover"
            />
          ) : (
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-br from-brand to-brand-deep"
            />
          )}

          {/* Dissolve the cover into the profile body so there is no hard seam.
           * Both stops are the surface token, so the fade follows the mode. */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[88px] bg-gradient-to-b from-transparent via-surface to-surface" />

          <ConnectAppearanceToggle
            preference={appearance.preference}
            onChange={appearance.setPreference}
            ready={appearance.ready}
            className="absolute right-3 top-3 z-10"
          />
        </div>

        {/* ------- LOGO + NAME + CATEGORY + DESCRIPTION + SAVE CONTACT ------- */}
        {/* One centred column: the avatar straddles the cover, then the profile
         * copy and the CTA all share the same optical centre line. */}
        <div className="relative -mt-[58px] px-5 text-center">
          {/* The logo circle straddles the cover, so it gets the floating ring:
           * without a theme-independent edge the disc is invisible against a
           * dark cover in dark mode and the rectangle behind it reads as the
           * logo's shape. */}
          <ConnectLogoAvatar
            name={business.name}
            logoUrl={business.logo_url}
            size="lg"
            ring="floating"
            fallbackTone="accent"
            className="mx-auto"
          />

          <h1 className="mx-auto mt-5 max-w-[22ch] text-balance text-[22px] font-semibold leading-[1.15] tracking-[-0.02em] text-ink">
            {business.name}
          </h1>

          {category && (
            <p className="mt-2.5 inline-flex">
              <span className="ct-chip bg-brand-soft text-brand-text">{category}</span>
            </p>
          )}

          {description && (
            <p
              dir="auto"
              className="mx-auto mt-3.5 max-w-[36ch] text-pretty text-[13.5px] leading-[1.6] text-ink-2"
            >
              {description}
            </p>
          )}

          <button
            type="button"
            onClick={handleSaveContact}
            className="ct-btn ct-btn-lg mt-6 w-full bg-brand text-on-brand shadow-md hover:bg-brand-hover"
          >
            <UserPlus className="h-[17px] w-[17px]" strokeWidth={2.25} />
            Save Contact
          </button>
        </div>

        {/* ---------------- CONTACT ---------------- */}
        {contactRows.length > 0 && (
          <section className="animate-rise px-5 pt-7" aria-label="Contact">
            <SectionHeading label="Contact" />
            <div className="ct-stagger space-y-2">
              {contactRows.map((item) => (
                <ConnectLinkRow
                  key={item.key}
                  item={item}
                  onSelect={(row) => onTrack(row.event, row.linkId, row.metadata)}
                />
              ))}
            </div>
          </section>
        )}

        {/* ---------------- LINKS & SOCIALS ---------------- */}
        {socialRows.length > 0 && (
          <section className="animate-rise px-5 pt-7" aria-label="Links and socials">
            <SectionHeading label="Links &amp; Socials" />
            <div className="ct-stagger space-y-2">
              {socialRows.map((item) => (
                <ConnectLinkRow
                  key={item.key}
                  item={item}
                  onSelect={(row) => onTrack(row.event, row.linkId, row.metadata)}
                />
              ))}
            </div>
          </section>
        )}

        {/* ---------------- PHOTO GALLERY ---------------- */}
        <ConnectPublicGallery
          images={galleryImages}
          featuredUrl={business.gallery_featured_url || ''}
          businessName={business.name}
          onImageOpen={handleGalleryOpen}
        />

        {/* ---------------- BOTTOM MESSAGE ----------------
         * Both fields are optional and are hidden independently, so a blank
         * value never leaves an empty pill or card behind.
         */}
        {(bottomTagline || bottomButtonText) && (
          <div className="animate-rise px-5 pt-7">
            {bottomTagline && (
              <p dir="auto" className="mb-3.5 text-center text-[13.5px] font-medium leading-relaxed text-ink-2">
                {bottomTagline}
              </p>
            )}

            {bottomButtonText && (
              <div
                dir="auto"
                className="flex w-full items-center justify-center rounded-card bg-brand px-5 py-5 text-center text-[17px] font-semibold leading-snug tracking-[-0.01em] text-on-brand shadow-md"
              >
                {bottomButtonText}
              </div>
            )}
          </div>
        )}

        {/* ---------------- BOOSTOV FOOTER ---------------- */}
        <footer className="mt-7 border-t border-line px-5 py-5 text-center">
          <p className="text-[11px] leading-relaxed text-muted">
            Create your free digital card at{' '}
            <a
              href="https://boostov.com"
              target="_blank"
              rel="noreferrer"
              className={cn(
                'font-semibold text-brand-text underline decoration-brand-soft-border decoration-2',
                'underline-offset-2 transition-colors hover:decoration-brand'
              )}
            >
              Boostov
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}
