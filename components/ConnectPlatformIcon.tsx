'use client';

import React from 'react';
import { ConnectPlatformKey } from '@/lib/connect-platforms';
import {
  InstagramIcon,
  FacebookIcon,
  TikTokIcon,
  YouTubeIcon,
  LinkedInIcon,
  XIcon,
  TelegramIcon,
  WhatsAppIcon,
  ThreadsIcon,
  PinterestIcon,
  SnapchatIcon,
  SpotifyIcon,
  GlobeIcon,
  LinkChainIcon,
} from '@/components/connect-platform-icons';

interface Props {
  platform: ConnectPlatformKey;
  className?: string;
}

/**
 * Single mapping from a detected platform to its brand mark, so the admin form
 * and the public card can never drift apart on which icon a link gets.
 */
export default function ConnectPlatformIcon({ platform, className = 'h-[19px] w-[19px]' }: Props) {
  switch (platform) {
    case 'instagram':
      return <InstagramIcon className={className} />;
    case 'facebook':
      return <FacebookIcon className={className} />;
    case 'tiktok':
      return <TikTokIcon className={className} />;
    case 'youtube':
      return <YouTubeIcon className={className} />;
    case 'linkedin':
      return <LinkedInIcon className={className} />;
    case 'x':
      return <XIcon className={className} />;
    case 'telegram':
      return <TelegramIcon className={className} />;
    case 'whatsapp':
      return <WhatsAppIcon className={className} />;
    case 'threads':
      return <ThreadsIcon className={className} />;
    case 'pinterest':
      return <PinterestIcon className={className} />;
    case 'snapchat':
      return <SnapchatIcon className={className} />;
    case 'spotify':
      return <SpotifyIcon className={className} />;
    case 'globe':
      return <GlobeIcon className={className} />;
    default:
      return <LinkChainIcon className={className} />;
  }
}
