'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { ConnectBusiness, ConnectLink } from '@/lib/connect-types';
import { downloadVCard } from '@/lib/vcard';
import ConnectPublicGallery from '@/components/ConnectPublicGallery';
import ConnectAppearanceToggle from '@/components/ConnectAppearanceToggle';
import ConnectLinkRow, { ConnectRowItem } from '@/components/ConnectLinkRow';
import ConnectLogoAvatar from '@/components/ConnectLogoAvatar';
import ConnectPlatformIcon from '@/components/ConnectPlatformIcon';
import BoostovPoweredBy from '@/components/BoostovPoweredBy';
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

function SectionHeading({ label, index }: { label: string; index: number }) {
  return (
    <h2 className="mb-4 flex items-center gap-3">
      {/* Decorative running index; the label is what gets announced. */}
      <span aria-hidden className="bc-gal-index">
        {String(index).padStart(2, '0')}
      </span>
      <span className="bc-display min-w-0 text-[20px] font-extrabold leading-none tracking-[-0.025em] text-ink">
        {label}
      </span>
      <span aria-hidden className="bc-heading-rule" />
    </h2>
  );
}

/** Primary contact actions, drawn as large tiles above the grouped list. */
const BENTO_KEYS = ['contact.mobile', 'contact.whatsapp'];

/** The tilted orbit rings, reused in the hero and the page backdrop. */
function OrbitRings({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <span key={i} />
      ))}
    </>
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
  const [coverLoaded, setCoverLoaded] = useState(false);
  const appearance = useConnectAppearance();

  /* Pointer tilt for the floating logo. Writes two custom properties on one
   * node per frame; nothing re-renders. Skipped under reduced motion. */
  const tiltRef = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  const handleTilt = (event: React.PointerEvent<HTMLElement>) => {
    const node = tiltRef.current;
    if (!node || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      node.style.setProperty('--bc-ry', `${(x * 24).toFixed(2)}deg`);
      node.style.setProperty('--bc-rx', `${(-y * 20).toFixed(2)}deg`);
    });
  };
  const resetTilt = () => {
    const node = tiltRef.current;
    if (!node) return;
    cancelAnimationFrame(frame.current);
    node.style.removeProperty('--bc-ry');
    node.style.removeProperty('--bc-rx');
  };
  useEffect(() => () => cancelAnimationFrame(frame.current), []);

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

  /* ---------------- PRESENTATION ONLY ----------------
   * The primary contact actions are drawn as large bento tiles and the rest as
   * a grouped list. Same rows, same relative order, same behaviour. */
  const bentoRows = contactRows.filter((row) => BENTO_KEYS.includes(row.key));
  const listRows = contactRows.filter((row) => !BENTO_KEYS.includes(row.key));

  let sectionIndex = 0;
  const contactIndex = contactRows.length > 0 ? ++sectionIndex : 0;
  const socialIndex = socialRows.length > 0 ? ++sectionIndex : 0;
  const galleryIndex = galleryImages.length > 0 ? ++sectionIndex : 0;

  const onRow = (row: ConnectRowItem) => onTrack(row.event, row.linkId, row.metadata);
  const delay = (ms: number) => ({ '--d': `${ms}ms` }) as React.CSSProperties;

  return (
    <div
      /* Load-bearing: the inline accent has to sit on the element that also
       * carries `connect-scope`, because globals.css derives every --brand-*
       * token from --business-accent on that exact node. A custom property is
       * resolved where it is declared, so publishing it on the inner card
       * would leave the derived family falling through to the :root default
       * blue -- the colour only ever half-applied bug. */
      style={accent}
      className="connect-scope relative isolate flex min-h-dvh justify-center text-ink sm:px-6 sm:py-12"
      data-resolved-appearance={appearance.resolved}
    >
      {/* Ambient accent light and, on wide screens, slow orbit rings. */}
      <div aria-hidden className="bc-backdrop">
        <div className="bc-orbit bc-orbit-left">
          <div className="bc-orbit-plane">
            <OrbitRings count={3} />
          </div>
        </div>
        <div className="bc-orbit bc-orbit-right">
          <div className="bc-orbit-plane">
            <OrbitRings count={3} />
          </div>
        </div>
      </div>

      <div className="bc-card flex w-full max-w-card flex-col bg-surface">
        {/* ---------------- HERO: the floating logo ---------------- */}
        <header className="bc-hero" onPointerMove={handleTilt} onPointerLeave={resetTilt}>
          <div className="bc-hero-media">
            {/* The themed backdrop sits under the banner, so the hero is never
             * blank while the photo is still arriving. */}
            <div aria-hidden className="bc-hero-fallback" />
            {business.cover_image_url && (
              <Image
                src={business.cover_image_url}
                alt=""
                fill
                priority
                sizes="(max-width: 480px) 100vw, 440px"
                className={cn(
                  'object-cover transition-opacity duration-500',
                  coverLoaded ? 'opacity-100' : 'opacity-0'
                )}
                onLoad={() => setCoverLoaded(true)}
                onError={() => setCoverLoaded(true)}
              />
            )}
          </div>
          <div aria-hidden className="bc-hero-tint" />

          <div aria-hidden className="bc-signal">
            <div className="bc-signal-plane">
              <OrbitRings count={3} />
            </div>
          </div>

          <div className="bc-orb-stage">
            <span aria-hidden className="bc-orb-shadow" />
            <div className="bc-orb-float">
              <div ref={tiltRef} className="bc-orb-tilt">
                <div className="bc-orb">
                  <span aria-hidden className="bc-orb-glow" />
                  <span aria-hidden className="bc-orb-pulse" />
                  <span aria-hidden className="bc-orb-pulse" />
                  <span aria-hidden className="bc-orb-ring" />
                  {/* The logo goes through the shared circular component: its
                   * mask crops any upload to a circle and `contain` keeps wide,
                   * tall or transparent marks undistorted inside it. */}
                  <ConnectLogoAvatar
                    name={business.name}
                    logoUrl={business.logo_url}
                    size="lg"
                    ring="floating"
                    fallbackTone="accent"
                    className="bc-orb-logo h-[128px] w-[128px]"
                    imageClassName="p-3.5"
                    priority
                  />
                  <span aria-hidden className="bc-orb-gloss" />
                </div>
              </div>
            </div>
          </div>

          <div className="bc-toggle-slot">
            <ConnectAppearanceToggle
              preference={appearance.preference}
              onChange={appearance.setPreference}
              ready={appearance.ready}
            />
          </div>
        </header>

        <div className="bc-sheet flex flex-1 flex-col">
          {/* ------- NAME + CATEGORY + DESCRIPTION + SAVE CONTACT ------- */}
          <div className="px-6 pt-8">
            {category && (
              <p className="bc-in flex" style={delay(260)}>
                <span className="bc-kicker">
                  <span aria-hidden className="bc-kicker-dot" />
                  <span dir="auto" className="truncate">
                    {category}
                  </span>
                </span>
              </p>
            )}

            <h1
              dir="auto"
              style={delay(320)}
              className="bc-in bc-display bc-name mt-3.5 text-[clamp(28px,8.4vw,36px)] font-extrabold leading-[1.04] tracking-[-0.035em] text-ink"
            >
              {business.name}
            </h1>

            {description && (
              <p
                dir="auto"
                style={delay(380)}
                className="bc-in mt-3.5 max-w-[40ch] text-pretty text-[14.5px] leading-[1.6] text-ink-2"
              >
                {description}
              </p>
            )}

            <div className="bc-in mt-6" style={delay(440)}>
              <button type="button" onClick={handleSaveContact} className="bc-cta">
                <span>Save Contact</span>
                <span aria-hidden className="bc-cta-icon">
                  <UserPlus className="h-[19px] w-[19px]" strokeWidth={2.25} />
                </span>
              </button>
            </div>
          </div>

          {/* ---------------- CONTACT ---------------- */}
          {contactRows.length > 0 && (
            <section className="bc-in px-5 pt-10" style={delay(520)} aria-label="Contact">
              <SectionHeading label="Contact" index={contactIndex} />
              {bentoRows.length > 0 && (
                <div
                  className={cn(
                    'ct-stagger grid gap-2.5',
                    bentoRows.length > 1 ? 'grid-cols-2' : 'grid-cols-1',
                    listRows.length > 0 && 'mb-2.5'
                  )}
                >
                  {bentoRows.map((item, i) => (
                    <ConnectLinkRow
                      key={item.key}
                      item={item}
                      onSelect={onRow}
                      variant={i === 0 ? 'bento-solid' : 'bento'}
                    />
                  ))}
                </div>
              )}
              {listRows.length > 0 && (
                <div className="bc-group ct-stagger">
                  {listRows.map((item) => (
                    <ConnectLinkRow key={item.key} item={item} onSelect={onRow} />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ---------------- LINKS & SOCIALS ---------------- */}
          {socialRows.length > 0 && (
            <section className="bc-in px-5 pt-10" style={delay(580)} aria-label="Links and socials">
              <SectionHeading label="Links &amp; Socials" index={socialIndex} />
              <div className="bc-group ct-stagger">
                {socialRows.map((item) => (
                  <ConnectLinkRow key={item.key} item={item} onSelect={onRow} />
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
            sectionIndex={galleryIndex}
          />

          {/* ---------------- BOTTOM MESSAGE ----------------
           * Both fields are optional and are hidden independently, so a blank
           * value never leaves an empty pill or card behind.
           */}
          {(bottomTagline || bottomButtonText) && (
            <div className="bc-in px-5 pt-10">
              {bottomTagline && (
                <p
                  dir="auto"
                  className="bc-display mb-4 text-balance text-center text-[17px] font-bold leading-snug tracking-[-0.015em] text-ink"
                >
                  {bottomTagline}
                </p>
              )}

              {bottomButtonText && (
                <div
                  dir="auto"
                  className="bc-ticket bc-display text-balance text-center text-[20px] font-extrabold leading-tight tracking-[-0.02em]"
                >
                  <span aria-hidden className="bc-ticket-perf" />
                  <span aria-hidden className="bc-ticket-arcs">
                    <OrbitRings count={3} />
                  </span>
                  <span className="relative block [overflow-wrap:anywhere]">{bottomButtonText}</span>
                </div>
              )}
            </div>
          )}

          {/* ---------------- BOOSTOV FOOTER ----------------
           * The same "Powered by boostov.ma" line as the Grow pages. */}
          <footer className="mt-auto flex justify-center px-5 pb-[calc(20px+var(--bc-safe-bottom))] pt-12">
            <BoostovPoweredBy />
          </footer>
        </div>
      </div>
    </div>
  );
}
