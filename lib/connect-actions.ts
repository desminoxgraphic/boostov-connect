import {
  connectLinkDedupeKey,
  connectPlatformLabel,
  detectConnectPlatform,
  formatConnectLinkValue,
  normalizeConnectUrl,
  type ConnectPlatformKey,
} from './connect-platforms.ts';
import type {
  ConnectAnalyticsSummary,
  ConnectBusiness,
  ConnectEvent,
  ConnectEventType,
  ConnectLink,
} from './connect-types.ts';
import { calculateConnectCTR } from './connect-utils.ts';

/**
 * Where an action appears on the public card. The dashboard ignores this and
 * shows everything in one list, but the card needs it to keep its existing
 * "Contact" and "Links & Socials" grouping.
 */
export type ConnectActionSection = 'contact' | 'social' | 'page';

export type ConnectActionKind = 'contact' | 'link' | 'gallery' | 'save';

/**
 * Which mark to draw. The card maps these onto its own brand icons and the
 * dashboard maps them onto lucide icons, so neither has to re-derive anything
 * about the business.
 */
export type ConnectActionIcon =
  | 'mobile'
  | 'whatsapp'
  | 'smartphone'
  | 'office'
  | 'email'
  | 'maps'
  | 'website'
  | 'platform'
  | 'gallery'
  | 'save';

export interface ConnectActionDefinition {
  /**
   * Stable identity for this action, for example `contact.whatsapp`,
   * `link:8f0c...` or `page.save`. It never changes while the action exists,
   * which is what lets the dashboard group events without relying on labels.
   */
  key: string;
  kind: ConnectActionKind;
  section: ConnectActionSection;
  label: string;
  value: string;
  /** Undefined for actions that are not clickable, such as a bare fax number. */
  href?: string;
  platform: ConnectPlatformKey;
  icon: ConnectActionIcon;
  /** Written to `connect_events.event_type` when the action is used. */
  eventType: ConnectEventType;
  /** Set when the action is a managed `connect_links` row. */
  linkId?: string;
  external: boolean;
  /**
   * Event types this action owns when a stored event carries no `action_key`.
   * At most one action may own a given type, so no event is ever counted twice.
   */
  claimedEventTypes: ConnectEventType[];
  /**
   * Link ids that were dropped from the card because they pointed at the same
   * destination as this action. Their historical clicks still belong here.
   */
  aliasLinkIds: string[];
}

export interface ConnectActions {
  actions: ConnectActionDefinition[];
  byKey: Map<string, ConnectActionDefinition>;
  byLinkId: Map<string, ConnectActionDefinition>;
  byEventType: Map<ConnectEventType, ConnectActionDefinition>;
}

/** Contact actions in the order the public card has always rendered them. */
const CONTACT_ACTIONS: {
  key: string;
  label: string | ((b: ConnectBusiness) => string);
  icon: ConnectActionIcon;
  platform: ConnectPlatformKey;
  eventType: ConnectEventType;
  value: (b: ConnectBusiness) => string;
  href: (b: ConnectBusiness) => string;
  external: boolean;
  claimed: boolean;
}[] = [
  {
    key: 'contact.mobile',
    label: 'Mobile',
    icon: 'mobile',
    platform: 'globe',
    eventType: 'call',
    value: (b) => b.phone || '',
    href: (b) => `tel:${(b.phone || '').replace(/[^\d+]/g, '')}`,
    external: false,
    // Three rows can emit `call`; only the first one owns the legacy counter so
    // that historical phone taps land in exactly one bucket.
    claimed: true,
  },
  {
    key: 'contact.whatsapp',
    label: 'WhatsApp',
    icon: 'whatsapp',
    platform: 'whatsapp',
    eventType: 'whatsapp',
    value: (b) => b.whatsapp_number || '',
    href: (b) => `https://wa.me/${(b.whatsapp_number || '').replace(/\D/g, '')}`,
    external: true,
    claimed: true,
  },
  {
    key: 'contact.second-mobile',
    label: 'Second mobile',
    icon: 'smartphone',
    platform: 'globe',
    eventType: 'call',
    value: (b) => b.second_phone || '',
    href: (b) => `tel:${(b.second_phone || '').replace(/[^\d+]/g, '')}`,
    external: false,
    claimed: false,
  },
  {
    key: 'contact.office',
    label: 'Office phone',
    icon: 'office',
    platform: 'globe',
    eventType: 'call',
    value: (b) => b.office_phone || '',
    href: (b) => `tel:${(b.office_phone || '').replace(/[^\d+]/g, '')}`,
    external: false,
    claimed: false,
  },
  {
    key: 'contact.email',
    label: 'Email',
    icon: 'email',
    platform: 'globe',
    eventType: 'email',
    value: (b) => b.email || '',
    href: (b) => `mailto:${b.email || ''}`,
    external: false,
    claimed: true,
  },
  {
    key: 'contact.address',
    label: (b) => ((b.address || '').trim() ? 'Address' : 'Location'),
    icon: 'maps',
    platform: 'globe',
    eventType: 'maps',
    value: (b) => (b.address || '').trim() || 'Get directions',
    href: (b) => {
      const maps = b.google_maps_url?.trim() || '';
      if (maps) return maps;
      const address = b.address?.trim() || '';
      return address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : '';
    },
    external: true,
    claimed: true,
  },
  {
    key: 'contact.website',
    label: 'Website',
    icon: 'website',
    platform: 'globe',
    eventType: 'website',
    value: (b) => (b.website_url || '').replace(/^https?:\/\//, '').replace(/\/$/, ''),
    href: (b) => normalizeConnectUrl(b.website_url || ''),
    external: true,
    claimed: true,
  },
];

/**
 * Analytics event names that predate the unified link editor. Managed links
 * still write them when they resolve to one of these platforms, so historical
 * events and the four fixed social columns keep landing on the right action.
 */
const LEGACY_PLATFORM_EVENT: Partial<Record<ConnectPlatformKey, ConnectEventType>> = {
  instagram: 'instagram',
  facebook: 'facebook',
  tiktok: 'tiktok',
  youtube: 'youtube',
};

/** The legacy fixed social columns, still rendered for pre-unified-editor rows. */
const LEGACY_SOCIAL_COLUMNS: {
  platform: ConnectPlatformKey;
  column: (b: ConnectBusiness) => string;
}[] = [
  { platform: 'instagram', column: (b) => b.instagram_handle || '' },
  { platform: 'facebook', column: (b) => b.facebook_url || '' },
  { platform: 'tiktok', column: (b) => b.tiktok_handle || '' },
  { platform: 'youtube', column: (b) => b.youtube_url || '' },
];

/**
 * The legacy columns are inconsistent: `instagram_handle` and `tiktok_handle`
 * hold bare handles while `facebook_url` and `youtube_url` usually hold full
 * URLs. Everything has to become an absolute href before it can be rendered or
 * de-duplicated.
 */
export function connectLegacySocialHref(platform: ConnectPlatformKey, raw: string): string {
  const value = (raw || '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  const handle = value.startsWith('@') ? value : `@${value.replace(/^\/+/, '')}`;
  if (platform === 'tiktok') return `https://tiktok.com/${handle}`;
  if (platform === 'youtube') return `https://www.youtube.com/${handle}`;
  return `https://${platform}.com/${value.replace(/^\/+/, '')}`;
}

function makeAction(
  partial: Omit<ConnectActionDefinition, 'claimedEventTypes' | 'aliasLinkIds'> & {
    claimedEventTypes?: ConnectEventType[];
    aliasLinkIds?: string[];
  }
): ConnectActionDefinition {
  return {
    claimedEventTypes: [],
    aliasLinkIds: [],
    ...partial,
  };
}

/**
 * Builds the complete list of actions a business profile actually exposes,
 * in the order the public card renders them.
 *
 * This is the single source of truth shared by the card and the dashboard: the
 * card turns each action into a row, and the dashboard turns the same list into
 * the "Link Performance" table. Nothing about WhatsApp, Instagram or any other
 * platform is hardcoded on the dashboard, and an action only appears while the
 * profile still offers it.
 *
 * De-duplication is applied across *all* sources, not just the managed links.
 * That is what removes the duplicate Website row a profile used to get when the
 * same URL was both the website field and a custom link.
 */
export function buildConnectActions(
  business: Pick<
    ConnectBusiness,
    | 'phone'
    | 'whatsapp_number'
    | 'second_phone'
    | 'office_phone'
    | 'email'
    | 'address'
    | 'google_maps_url'
    | 'website_url'
    | 'gallery_images'
    | 'instagram_handle'
    | 'facebook_url'
    | 'tiktok_handle'
    | 'youtube_url'
  >,
  links: Pick<ConnectLink, 'id' | 'url' | 'label' | 'is_active'>[] = []
): ConnectActions {
  const actions: ConnectActionDefinition[] = [];

  // Destinations already shown as a contact row. Managed links pointing at the
  // same place are folded into the contact action instead of rendering twice.
  const claimedDestinations = new Set<string>();
  const contactByDedupeKey = new Map<string, ConnectActionDefinition>();

  for (const spec of CONTACT_ACTIONS) {
    const raw = spec.value(business as ConnectBusiness);
    if (!raw || !raw.trim()) continue;
    const href = spec.href(business as ConnectBusiness);
    if (!href) continue;

    const action = makeAction({
      key: spec.key,
      kind: 'contact',
      section: 'contact',
      label: typeof spec.label === 'function' ? spec.label(business as ConnectBusiness) : spec.label,
      value: raw,
      href,
      platform: spec.platform,
      icon: spec.icon,
      eventType: spec.eventType,
      external: spec.external,
      claimedEventTypes: spec.claimed ? [spec.eventType] : [],
    });

    actions.push(action);
    const dedupeKey = connectLinkDedupeKey(href, detectConnectPlatform(href));
    if (dedupeKey) {
      claimedDestinations.add(dedupeKey);
      contactByDedupeKey.set(dedupeKey, action);
    }
  }

  // An informational row (a bare fax number) has nothing to open, so it is not
  // an action: the card still renders it, but it can never be clicked or
  // counted, and the dashboard never lists it.

  for (const link of links) {
    if (link.is_active === false) continue;
    const url = (link.url || '').trim();
    if (!url) continue;

    const platform = detectConnectPlatform(url);
    const dedupeKey = connectLinkDedupeKey(url, platform);
    const duplicateOf = dedupeKey ? contactByDedupeKey.get(dedupeKey) : undefined;

    if (duplicateOf) {
      // Same destination as a contact row. Keep a single entry, but remember
      // the link id so the clicks it already recorded are not thrown away.
      duplicateOf.aliasLinkIds.push(link.id);
      continue;
    }
    if (dedupeKey && claimedDestinations.has(dedupeKey)) continue;
    if (dedupeKey) claimedDestinations.add(dedupeKey);

    const label = (link.label || '').trim() || (platform.key === 'globe' ? 'Website' : platform.label);
    actions.push(
      makeAction({
        key: `link:${link.id}`,
        kind: 'link',
        section: 'social',
        label,
        value: formatConnectLinkValue(url, platform),
        href: normalizeConnectUrl(url),
        platform: platform.key,
        icon: 'platform',
        eventType: LEGACY_PLATFORM_EVENT[platform.key] || 'custom_link',
        linkId: link.id,
        external: true,
        claimedEventTypes: [LEGACY_PLATFORM_EVENT[platform.key] || 'custom_link'],
      })
    );
  }

  for (const legacy of LEGACY_SOCIAL_COLUMNS) {
    const raw = legacy.column(business as ConnectBusiness);
    if (!raw || !raw.trim()) continue;
    const href = connectLegacySocialHref(legacy.platform, raw);
    if (!href) continue;

    const platform = detectConnectPlatform(href);
    const dedupeKey = connectLinkDedupeKey(href, { ...platform, key: legacy.platform });
    if (dedupeKey && claimedDestinations.has(dedupeKey)) continue;
    if (dedupeKey) claimedDestinations.add(dedupeKey);

    actions.push(
      makeAction({
        key: `contact.legacy-${legacy.platform}`,
        kind: 'contact',
        section: 'social',
        label: connectPlatformLabel(legacy.platform),
        value: formatConnectLinkValue(href, platform),
        href,
        platform: legacy.platform,
        icon: 'platform',
        eventType: LEGACY_PLATFORM_EVENT[legacy.platform] || 'custom_link',
        external: true,
      })
    );
  }

  const gallery = Array.isArray(business.gallery_images) ? business.gallery_images : [];
  if (gallery.length > 0) {
    actions.push(
      makeAction({
        key: 'page.gallery',
        kind: 'gallery',
        section: 'page',
        label: 'Gallery',
        value: `${gallery.length} photo${gallery.length === 1 ? '' : 's'}`,
        platform: 'globe',
        icon: 'gallery',
        eventType: 'gallery_open',
        external: true,
        claimedEventTypes: ['gallery_open'],
      })
    );
  }

  actions.push(
    makeAction({
      key: 'page.save',
      kind: 'save',
      section: 'page',
      label: 'Save Contact',
      value: 'Contact card saved',
      platform: 'globe',
      icon: 'save',
      eventType: 'vcard',
      external: false,
      claimedEventTypes: ['vcard'],
    })
  );

  const byKey = new Map<string, ConnectActionDefinition>();
  const byLinkId = new Map<string, ConnectActionDefinition>();
  const byEventType = new Map<ConnectEventType, ConnectActionDefinition>();

  for (const action of actions) {
    byKey.set(action.key, action);
    if (action.linkId) byLinkId.set(action.linkId, action);
    for (const alias of action.aliasLinkIds) byLinkId.set(alias, action);
    for (const eventType of action.claimedEventTypes) {
      if (!byEventType.has(eventType)) byEventType.set(eventType, action);
    }
  }

  return { actions, byKey, byLinkId, byEventType };
}

/**
 * Resolves a stored event onto the action it belongs to.
 *
 * New events carry `metadata.action_key` and resolve exactly. Older events do
 * not, so they fall back to the link id and then to the event type. Anything
 * that no longer matches a live action — a deleted custom link, say — returns
 * null so the dashboard can drop it instead of inventing a row for it.
 */
export function resolveConnectEventAction(
  event: Pick<ConnectEvent, 'event_type' | 'link_id' | 'metadata'>,
  actions: ConnectActions
): ConnectActionDefinition | null {
  const explicit = event.metadata?.action_key;
  if (typeof explicit === 'string' && explicit) {
    const match = actions.byKey.get(explicit);
    if (match) return match;
  }
  if (event.link_id) {
    const match = actions.byLinkId.get(event.link_id);
    if (match) return match;
  }
  return actions.byEventType.get(event.event_type) || null;
}

/**
 * How an action reads in the activity feed. "Google Maps opened" instead of
 * "Google Maps clicked", but "WhatsApp clicked" and "Contact saved".
 */
export function connectActionVerb(action: ConnectActionDefinition): string {
  switch (action.kind) {
    case 'save':
      return 'saved';
    case 'gallery':
      return 'opened';
    default:
      break;
  }
  if (action.eventType === 'maps') return 'opened';
  if (action.eventType === 'call') return 'called';
  if (action.eventType === 'email') return 'emailed';
  return 'clicked';
}

/** Human-readable title for one event, used by the activity feed. */
export function describeConnectEvent(
  event: Pick<ConnectEvent, 'event_type' | 'link_id' | 'metadata'>,
  actions: ConnectActions
): string {
  if (event.event_type === 'view') return 'Profile viewed';

  const action = resolveConnectEventAction(event, actions);
  if (action) {
    if (action.kind === 'save') return 'Contact saved';
    return `${action.label} ${connectActionVerb(action)}`;
  }

  // The action is gone from the profile (a removed custom link, typically).
  // Describe the event honestly instead of resurrecting a dashboard row for it.
  const label = typeof event.metadata?.label === 'string' ? event.metadata.label.trim() : '';
  if (label) return `${label} clicked`;
  return 'Link clicked';
}

/**
 * Turns raw `connect_events` rows into the dashboard summary.
 *
 * The rules, in one place:
 *   * a profile view is a view, never a click;
 *   * every other event is resolved to exactly one live action, so an
 *     interaction is never counted twice;
 *   * an event whose action is no longer on the profile is dropped, so a
 *     removed custom link stops inflating the totals;
 *   * the rows are the profile's own actions, most clicked first, including the
 *     ones nobody has clicked yet.
 *
 * Kept free of database access so the rules can be verified directly.
 */
export function summarizeConnectEvents(
  business: Parameters<typeof buildConnectActions>[0],
  links: Parameters<typeof buildConnectActions>[1],
  events: Pick<ConnectEvent, 'id' | 'event_type' | 'link_id' | 'metadata' | 'created_at'>[]
): ConnectAnalyticsSummary {
  const actionSet = buildConnectActions(business, links);

  const clicksByKey = new Map<string, number>();
  let total_views = 0;
  let total_clicks = 0;
  let saved_contacts = 0;

  for (const event of events) {
    if (event.event_type === 'view') {
      total_views++;
      continue;
    }
    const action = resolveConnectEventAction(event, actionSet);
    if (!action) continue;
    clicksByKey.set(action.key, (clicksByKey.get(action.key) || 0) + 1);
    total_clicks++;
    if (action.kind === 'save') saved_contacts++;
  }

  const actions = actionSet.actions
    .map((action, index) => ({ action, clicks: clicksByKey.get(action.key) || 0, index }))
    // Most clicked first; equal counts keep the order the card renders them in,
    // so the list never reshuffles itself between refreshes.
    .sort((a, b) => (b.clicks - a.clicks) || (a.index - b.index))
    .map(({ action, clicks }) => ({
      key: action.key,
      label: action.label,
      kind: action.kind,
      platform: action.platform,
      icon: action.icon,
      clicks,
      percent: total_clicks > 0 ? Number(((clicks / total_clicks) * 100).toFixed(1)) : 0,
    }));

  const recent_activity = events.slice(0, 15).map((event) => {
    const action = resolveConnectEventAction(event, actionSet);
    return {
      id: event.id,
      action_key: action ? action.key : null,
      title: describeConnectEvent(event, actionSet),
      created_at: event.created_at,
    };
  });

  return {
    total_views,
    total_clicks,
    ctr: calculateConnectCTR(total_views, total_clicks),
    saved_contacts,
    actions,
    recent_activity,
  };
}
