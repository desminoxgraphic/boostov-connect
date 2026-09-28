export type ConnectPlatformKey =
  | 'instagram'
  | 'facebook'
  | 'tiktok'
  | 'youtube'
  | 'linkedin'
  | 'x'
  | 'telegram'
  | 'whatsapp'
  | 'threads'
  | 'pinterest'
  | 'snapchat'
  | 'spotify'
  | 'globe';

export interface ConnectPlatform {
  key: ConnectPlatformKey;
  label: string;
  host: string;
}

interface PlatformDefinition {
  key: ConnectPlatformKey;
  label: string;
  hosts: string[];
}

/**
 * Host matching is done on the registrable-ish tail of the hostname so that
 * `www.`, `m.`, `mobile.` and `vm.` prefixes all resolve to the same platform.
 * Suffix entries are matched against the full host, which covers subdomains such
 * as `open.spotify.com` and `api.whatsapp.com`.
 */
const PLATFORM_DEFINITIONS: PlatformDefinition[] = [
  { key: 'instagram', label: 'Instagram', hosts: ['instagram.com', 'instagr.am'] },
  { key: 'facebook', label: 'Facebook', hosts: ['facebook.com', 'fb.com', 'fb.me', 'fb.watch'] },
  { key: 'tiktok', label: 'TikTok', hosts: ['tiktok.com', 'vm.tiktok.com'] },
  { key: 'youtube', label: 'YouTube', hosts: ['youtube.com', 'youtu.be', 'm.youtube.com'] },
  { key: 'linkedin', label: 'LinkedIn', hosts: ['linkedin.com', 'lnkd.in'] },
  { key: 'x', label: 'X', hosts: ['x.com', 'twitter.com', 't.co'] },
  { key: 'telegram', label: 'Telegram', hosts: ['t.me', 'telegram.me', 'telegram.org'] },
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    hosts: ['wa.me', 'whatsapp.com', 'api.whatsapp.com', 'chat.whatsapp.com'],
  },
  { key: 'threads', label: 'Threads', hosts: ['threads.net', 'threads.com'] },
  { key: 'pinterest', label: 'Pinterest', hosts: ['pinterest.com', 'pin.it'] },
  { key: 'snapchat', label: 'Snapchat', hosts: ['snapchat.com'] },
  { key: 'spotify', label: 'Spotify', hosts: ['spotify.com', 'spotify.link'] },
];

const GENERIC_PLATFORM: ConnectPlatform = { key: 'globe', label: 'Website', host: '' };

/** Prefixes people paste that are not part of the real host. */
const NOISE_PREFIXES = ['www.', 'm.', 'mobile.', 'vm.', 'web.'];

export function normalizeConnectUrl(value: string): string {
  const trimmed = (value || '').trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^(mailto|tel):/i.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/+/, '')}`;
}

/** Extracts a bare hostname from anything the admin might have typed. */
export function extractConnectHost(value: string): string {
  const raw = (value || '').trim();
  if (!raw) return '';
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw.replace(/^\/+/, '')}`;
  try {
    return new URL(withScheme).hostname.toLowerCase().replace(/\.$/, '');
  } catch {
    return '';
  }
}

function hostMatches(host: string, candidate: string): boolean {
  if (host === candidate) return true;
  return host.endsWith(`.${candidate}`);
}

/**
 * Identifies which platform a URL belongs to so the card can render the correct
 * brand mark without the admin ever picking an icon by hand.
 */
export function detectConnectPlatform(value: string): ConnectPlatform {
  const host = extractConnectHost(value);
  if (!host) return { ...GENERIC_PLATFORM };

  for (const definition of PLATFORM_DEFINITIONS) {
    if (definition.hosts.some((candidate) => hostMatches(host, candidate))) {
      return { key: definition.key, label: definition.label, host };
    }
  }

  const cleaned = NOISE_PREFIXES.reduce((acc, prefix) =>
    acc.startsWith(prefix) ? acc.slice(prefix.length) : acc
  , host);

  return { key: 'globe', label: cleaned || 'Website', host };
}

function pathSegments(value: string): string[] {
  const raw = (value || '').trim();
  if (!raw) return [];
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw.replace(/^\/+/, '')}`;
  try {
    return new URL(withScheme).pathname.split('/').filter(Boolean);
  } catch {
    return [];
  }
}

function stripQuery(value: string): string {
  return value.split(/[?#]/)[0];
}

function prettifyHost(host: string): string {
  const cleaned = host.replace(/^www\./, '');
  const base = cleaned.split('.')[0] || cleaned;
  return base.charAt(0).toUpperCase() + base.slice(1);
}

/**
 * Produces the secondary line under a link label. Handles read best as
 * `@name`; everything else falls back to something short and recognisable.
 */
export function formatConnectLinkValue(value: string, platform?: ConnectPlatform): string {
  const raw = (value || '').trim();
  if (!raw) return '';
  const detected = platform || detectConnectPlatform(raw);
  const segments = pathSegments(raw);
  const host = detected.host || extractConnectHost(raw);
  const first = segments[0] || '';
  const second = segments[1] || '';

  switch (detected.key) {
    case 'instagram':
    case 'tiktok':
    case 'x':
    case 'threads':
      return first ? `@${first.replace(/^@/, '')}` : `@${host.replace(/\..*$/, '')}`;
    case 'telegram':
      return first ? `@${first.replace(/^@/, '')}` : 'Telegram';
    case 'whatsapp':
      return first || 'WhatsApp';
    case 'youtube': {
      if (host.includes('youtu.be')) return 'Watch on YouTube';
      if (first.startsWith('@')) return first;
      if (['c', 'channel', 'user'].includes(first.toLowerCase()) && second) {
        return `@${second.replace(/^@/, '')}`;
      }
      return first || 'YouTube';
    }
    case 'linkedin': {
      if (['in', 'company', 'school', 'showcase'].includes(first.toLowerCase()) && second) {
        return `${first}/${second}`;
      }
      return first || 'LinkedIn';
    }
    case 'facebook':
      return first ? `/${first}` : 'Find us on Facebook';
    case 'pinterest':
      return first ? `/${first}` : 'Pinterest';
    case 'snapchat':
      return first ? `@${first.replace(/^@/, '')}` : 'Snapchat';
    case 'spotify':
      return segments.length > 1 ? segments.slice(0, 2).join('/') : 'Spotify';
    default: {
      const clean = stripQuery(raw)
        .replace(/^https?:\/\//i, '')
        .replace(/^www\./i, '')
        .replace(/\/$/, '');
      return clean.length > 42 ? `${clean.slice(0, 42)}…` : clean || prettifyHost(host);
    }
  }
}

/**
 * Default heading for a link the admin did not label. Falls back to the
 * platform name so the row never shows an empty title.
 */
export function defaultConnectLinkLabel(value: string, platform?: ConnectPlatform): string {
  const detected = platform || detectConnectPlatform(value);
  return detected.key === 'globe' ? 'Website' : detected.label;
}

/**
 * Canonical form used to recognise that a legacy fixed social column and a
 * managed link point at the same destination, so the public card can render
 * each destination only once.
 */
export function connectLinkDedupeKey(value: string, platform?: ConnectPlatform): string {
  const raw = normalizeConnectUrl(value).trim();
  if (!raw) return '';
  const detected = platform || detectConnectPlatform(raw);
  if (detected.key === 'globe') {
    return raw.toLowerCase().replace(/\/$/, '');
  }
  const formatted = formatConnectLinkValue(raw, detected);
  return `${detected.key}:${formatted.toLowerCase()}`;
}

/** The legacy fixed social columns, used to keep old rows rendering. */
export const LEGACY_SOCIAL_KEYS = ['instagram', 'facebook', 'tiktok', 'youtube'] as const;
export type LegacySocialKey = (typeof LEGACY_SOCIAL_KEYS)[number];

/** Human label for a platform key, usable without a URL. */
export function connectPlatformLabel(key: ConnectPlatformKey): string {
  const definition = PLATFORM_DEFINITIONS.find((item) => item.key === key);
  return definition ? definition.label : 'Link';
}

/**
 * Maps a platform onto the fixed column that used to hold it. The admin no
 * longer edits those columns directly, but keeping them in step means the
 * per-platform analytics counters, the vCard export and any older client that
 * still reads them keep working.
 */
export const LEGACY_SOCIAL_COLUMN: Partial<Record<ConnectPlatformKey, string>> = {
  instagram: 'instagram_handle',
  facebook: 'facebook_url',
  tiktok: 'tiktok_handle',
  youtube: 'youtube_url',
};

export interface LegacySocialPatch {
  instagram_handle: string;
  facebook_url: string;
  tiktok_handle: string;
  youtube_url: string;
}

/**
 * Derives the legacy fixed social columns from the managed link list.
 *
 * This is a move of ownership, not a deletion: the URLs live in
 * `connect_links` from this point on, and the fixed columns are kept as a
 * compatibility mirror so nothing that still reads them loses data.
 *
 * The value shape matches what each column historically held, because the
 * public card still renders un-migrated rows straight out of these columns:
 * the three `*_handle` columns keep a leading `@`, while `facebook_url` keeps
 * a bare path (`royalshop`, not `@royalshop` / `royalshop` with a scheme).
 */
export function syncLegacySocialColumns(links: { url: string }[]): LegacySocialPatch {
  const found: Partial<Record<ConnectPlatformKey, string>> = {};

  for (const link of links) {
    const url = (link?.url || '').trim();
    if (!url) continue;
    const platform = detectConnectPlatform(url);
    // Only the four platforms that used to have a fixed column are mirrored.
    if (!LEGACY_SOCIAL_KEYS.includes(platform.key as LegacySocialKey)) continue;
    // First link for a platform wins, so ordering stays predictable.
    if (found[platform.key]) continue;

    const formatted = formatConnectLinkValue(url, platform);
    if (!formatted) continue;

    if (platform.key === 'facebook') {
      // A page path is stored bare, with no leading slash or @; anything that
      // is already a full URL is kept verbatim.
      found.facebook = /^https?:\/\//i.test(formatted)
        ? formatted
        : formatted.replace(/^[@/]+/, '');
    } else {
      found[platform.key] = formatted.startsWith('@') ? formatted : `@${formatted}`;
    }
  }

  return {
    instagram_handle: found.instagram || '',
    facebook_url: found.facebook || '',
    tiktok_handle: found.tiktok || '',
    youtube_url: found.youtube || '',
  };
}
