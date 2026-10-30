import type { ConnectActionIcon, ConnectActionKind } from '@/lib/connect-actions';
import type { ConnectPlatformKey } from '@/lib/connect-platforms';

export type ConnectEventType =
  | 'view'
  | 'whatsapp'
  | 'instagram'
  | 'facebook'
  | 'tiktok'
  | 'youtube'
  | 'maps'
  | 'call'
  | 'email'
  | 'website'
  | 'vcard'
  | 'gallery_open'
  | 'custom_link';

export interface ConnectBusiness {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  cover_image_url: string | null;
  description: string;
  whatsapp_number: string;
  instagram_handle: string;
  facebook_url: string;
  tiktok_handle: string;
  youtube_url: string;
  google_maps_url: string;
  phone: string;
  website_url: string;
  gallery_images: string[];
  gallery_featured_url: string;
  theme_color: string;
  email: string;
  address: string;
  bottom_tagline: string;
  bottom_button_text: string;
  category: string;
  second_phone: string;
  office_phone: string;
  fax: string;
  dashboard_token: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ConnectLink {
  id: string;
  business_id: string;
  label: string;
  url: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface ConnectEvent {
  id: string;
  business_id: string;
  event_type: ConnectEventType;
  link_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface CreateConnectLinkInput {
  id?: string;
  label: string;
  url: string;
  icon?: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface CreateConnectBusinessInput {
  id?: string;
  name: string;
  slug: string;
  logo_url?: string;
  cover_image_url?: string;
  description?: string;
  whatsapp_number?: string;
  instagram_handle?: string;
  facebook_url?: string;
  tiktok_handle?: string;
  youtube_url?: string;
  google_maps_url?: string;
  phone?: string;
  website_url?: string;
  gallery_images?: string[];
  gallery_featured_url?: string;
  theme_color?: string;
  email?: string;
  address?: string;
  bottom_tagline?: string;
  bottom_button_text?: string;
  category?: string;
  second_phone?: string;
  office_phone?: string;
  fax?: string;
  is_active?: boolean;
  links?: CreateConnectLinkInput[];
  /** Set only by the server for reseller-created merchants; never read from a request body. */
  reseller_id?: string;
}

export interface ConnectActionStat {
  /** Stable action key, matching `ConnectActionDefinition.key`. */
  key: string;
  label: string;
  kind: ConnectActionKind;
  platform: ConnectPlatformKey;
  /** Which mark to draw, so the dashboard never has to guess from the label. */
  icon: ConnectActionIcon;
  clicks: number;
  /** Share of total clicks, 0-100. */
  percent: number;
}

export interface ConnectAnalyticsSummary {
  total_views: number;
  total_clicks: number;
  ctr: number;
  saved_contacts: number;
  /**
   * One entry per action the profile currently exposes, never a hardcoded
   * platform list. Sorted by clicks, then by the order the card renders them.
   */
  actions: ConnectActionStat[];
  recent_activity: Array<{
    id: string;
    action_key: string | null;
    title: string;
    created_at: string;
  }>;
}
