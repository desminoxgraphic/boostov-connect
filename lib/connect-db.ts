import { randomBytes } from 'crypto';
import { supabaseServer } from './supabase/server';
import {
  normalizeConnectSlug,
  calculateConnectCTR,
  normalizeGalleryImages,
  normalizeGalleryFeaturedUrl,
  normalizeConnectText,
  normalizeConnectEmail,
  normalizeConnectAddress,
  normalizeConnectPhone,
  CONNECT_CATEGORY_MAX,
  CONNECT_DESCRIPTION_MAX,
  CONNECT_BOTTOM_TAGLINE_MAX,
  CONNECT_BOTTOM_BUTTON_MAX,
} from './connect-utils';
import { normalizeThemeColor } from './connect-theme';
import {
  ConnectBusiness,
  ConnectLink,
  ConnectEvent,
  ConnectEventType,
  CreateConnectBusinessInput,
  ConnectAnalyticsSummary,
} from './connect-types';
import { summarizeConnectEvents } from './connect-actions';

export { normalizeConnectSlug, calculateConnectCTR };

function requireSupabase() {
  if (!supabaseServer) {
    throw new Error('DATABASE_NOT_CONFIGURED: Supabase server client is missing environment variables.');
  }
  return supabaseServer;
}

/**
 * Some `connect_businesses` columns were added after the table first shipped
 * and a number of live projects are missing them:
 *
 *   youtube_url          - absent from supabase/schema.sql, so the YouTube
 *                          field in the form could not be saved at all
 *   gallery_featured_url - ships in
 *                          supabase/migrations/202609270001_add_connect_gallery.sql
 *
 * PostgREST rejects an INSERT/UPDATE that names a column it cannot find, so
 * writes must not mention them until the migration has been run.
 *
 * Reads are unaffected: they use `select('*')`, so a missing column simply comes
 * back absent. `hydrateGallery` then treats it as "no featured photo", and the
 * form already coerces a missing YouTube value to an empty string.
 *
 * So we probe the optional columns once, cache the answer briefly, and drop the
 * unsupported ones from write payloads. The short TTL means the columns start
 * being saved automatically once the migration lands, with no redeploy.
 */
const OPTIONAL_PROBE_TTL_MS = 60_000;
const OPTIONAL_COLUMNS = [
  'youtube_url',
  'gallery_featured_url',
  'theme_color',
  'email',
  'address',
  'bottom_tagline',
  'bottom_button_text',
  'category',
  'second_phone',
  'office_phone',
  'fax',
] as const;

export type ConnectOptionalColumn = (typeof OPTIONAL_COLUMNS)[number];

let optionalColumnsCheckedAt = 0;
let supportedOptionalColumns: Set<string> | null = null;

async function getSupportedOptionalColumns(): Promise<Set<string>> {
  const now = Date.now();
  if (supportedOptionalColumns && now - optionalColumnsCheckedAt < OPTIONAL_PROBE_TTL_MS) {
    return supportedOptionalColumns;
  }

  const client = requireSupabase();
  const found = new Set<string>();

  await Promise.all(
    OPTIONAL_COLUMNS.map(async (column) => {
      try {
        const { error } = await client.from('connect_businesses').select(column).limit(1);
        if (!error) found.add(column);
      } catch {
        // Leave the column marked as unsupported.
      }
    })
  );

  supportedOptionalColumns = found;
  optionalColumnsCheckedAt = now;
  return found;
}

/** Removes any write-payload key the database does not have a column for. */
async function dropUnsupportedColumns(
  payload: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const supported = await getSupportedOptionalColumns();
  const result = { ...payload };

  for (const column of OPTIONAL_COLUMNS) {
    if (column in result && !supported.has(column)) {
      delete result[column];
    }
  }

  return result;
}

export interface ConnectCapabilities {
  gallery_featured: boolean;
  theming: boolean;
  contact_rows: boolean;
  bottom_message: boolean;
  youtube: boolean;
  optional_columns: string[];
}

/**
 * Optional columns shipped by 202609270003_add_connect_contact_rows.sql.
 * `whatsapp_number` is deliberately absent: it has existed since the original
 * Connect table, so the WhatsApp row works even before 003 is applied.
 */
const CONTACT_ROW_COLUMNS: ConnectOptionalColumn[] = [
  'category',
  'second_phone',
  'office_phone',
  'fax',
];

/** Optional columns shipped by 202609270004_add_connect_bottom_message.sql. */
const BOTTOM_MESSAGE_COLUMNS: ConnectOptionalColumn[] = [
  'bottom_tagline',
  'bottom_button_text',
];

export async function getConnectCapabilities(): Promise<ConnectCapabilities> {
  const supported = await getSupportedOptionalColumns();
  const themingColumns: ConnectOptionalColumn[] = ['theme_color', 'email', 'address'];
  return {
    gallery_featured: supported.has('gallery_featured_url'),
    theming: themingColumns.every((column) => supported.has(column)),
    contact_rows: CONTACT_ROW_COLUMNS.every((column) => supported.has(column)),
    bottom_message: BOTTOM_MESSAGE_COLUMNS.every((column) => supported.has(column)),
    youtube: supported.has('youtube_url'),
    optional_columns: OPTIONAL_COLUMNS.filter((column) => supported.has(column)),
  };
}

export async function supportsGalleryFeaturedColumn(): Promise<boolean> {
  const supported = await getSupportedOptionalColumns();
  return supported.has('gallery_featured_url');
}

export async function supportsConnectTheming(): Promise<boolean> {
  const supported = await getSupportedOptionalColumns();
  return (['theme_color', 'email', 'address'] as const).every((column) => supported.has(column));
}

/**
 * supabase-js types `select('*')` as `any`, so narrow it once here instead of
 * casting at every call site.
 */
function asBusiness(row: unknown): ConnectBusiness {
  return row as unknown as ConnectBusiness;
}

function asBusinesses(rows: unknown): ConnectBusiness[] {
  return (rows as unknown as ConnectBusiness[]) || [];
}

/**
 * PostgREST reports both "table absent" and "column absent" through similar
 * error codes, and the default message used to tell admins to re-create the
 * whole table when only one column was missing. Point at the real fix.
 */
function describeWriteFailure(error: {
  code?: string;
  message?: string;
  details?: string;
}): string {
  const detail = error.message || error.details || 'unknown error';

  if (error.code === 'PGRST205' || /schema cache/i.test(detail)) {
    return `TABLE_NOT_FOUND: The "connect_businesses" table is missing in Supabase. Run supabase/migrations/202609260001_add_boostov_connect.sql in the Supabase SQL editor. (${detail})`;
  }

  const missingColumn = detail.match(/column "([^"]+)" does not exist|Could not find the '([^']+)' column/);
  if (error.code === 'PGRST204' || error.code === '42703' || missingColumn) {
    const column = missingColumn ? missingColumn[1] || missingColumn[2] : 'unknown';
    return `MISSING_COLUMN: connect_businesses."${column}" does not exist in your Supabase project. Run supabase/migrations/202609270001_add_connect_gallery.sql in the Supabase SQL editor. (${detail})`;
  }

  if (error.code === '23505') {
    return 'SLUG_ALREADY_EXISTS: That slug is already in use.';
  }

  return `${detail} (Code: ${error.code})`;
}

/**
 * Defensive read-normalization: older rows (and rows written before the
 * gallery existed) may have a missing / malformed `gallery_images` jsonb value
 * or a stale `gallery_featured_url`. The public page relies on both being
 * clean, so every read goes through this.
 */
function hydrateGallery(business: ConnectBusiness): ConnectBusiness {
  const gallery = normalizeGalleryImages(business.gallery_images);
  const featured = normalizeGalleryFeaturedUrl(business.gallery_featured_url, gallery);

  return {
    ...business,
    gallery_images: gallery,
    gallery_featured_url: featured,
    theme_color: normalizeThemeColor(business.theme_color),
    email: typeof business.email === 'string' ? business.email.trim() : '',
    address: typeof business.address === 'string' ? business.address.trim() : '',
    description: normalizeConnectText(business.description, CONNECT_DESCRIPTION_MAX),
    bottom_tagline: normalizeConnectText(business.bottom_tagline, CONNECT_BOTTOM_TAGLINE_MAX),
    bottom_button_text: normalizeConnectText(
      business.bottom_button_text,
      CONNECT_BOTTOM_BUTTON_MAX
    ),
    category: normalizeConnectText(business.category, CONNECT_CATEGORY_MAX),
    second_phone: normalizeConnectPhone(business.second_phone),
    office_phone: normalizeConnectPhone(business.office_phone),
    fax: normalizeConnectPhone(business.fax),
  };
}

export async function getConnectBusinessBySlug(
  slug: string
): Promise<{ business: ConnectBusiness; links: ConnectLink[] } | null> {
  const cleanSlug = normalizeConnectSlug(slug);
  const { data: business, error } = await requireSupabase()
    .from('connect_businesses')
    .select('*')
    .eq('slug', cleanSlug)
    .maybeSingle();

  if (error || !business) return null;

  const { data: links } = await requireSupabase()
    .from('connect_links')
    .select('*')
    .eq('business_id', asBusiness(business).id)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  return {
    business: hydrateGallery(asBusiness(business)),
    links: (links as ConnectLink[]) || [],
  };
}

export async function getConnectBusinessByDashboardToken(
  token: string
): Promise<{ business: ConnectBusiness; links: ConnectLink[] } | null> {
  const { data: business, error } = await requireSupabase()
    .from('connect_businesses')
    .select('*')
    .eq('dashboard_token', token)
    .maybeSingle();

  if (error || !business) return null;

  const { data: links } = await requireSupabase()
    .from('connect_links')
    .select('*')
    .eq('business_id', asBusiness(business).id)
    .order('sort_order', { ascending: true });

  return {
    business: hydrateGallery(asBusiness(business)),
    links: (links as ConnectLink[]) || [],
  };
}

export async function getConnectBusinessById(
  id: string
): Promise<{ business: ConnectBusiness; links: ConnectLink[] } | null> {
  const { data: business, error } = await requireSupabase()
    .from('connect_businesses')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !business) return null;

  const { data: links } = await requireSupabase()
    .from('connect_links')
    .select('*')
    .eq('business_id', asBusiness(business).id)
    .order('sort_order', { ascending: true });

  return {
    business: hydrateGallery(asBusiness(business)),
    links: (links as ConnectLink[]) || [],
  };
}

export async function getAllConnectBusinesses(): Promise<
  Array<ConnectBusiness & { stats?: ConnectAnalyticsSummary }>
> {
  const { data: businesses, error } = await requireSupabase()
    .from('connect_businesses')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !businesses) {
    if (error) console.error('Error fetching connect_businesses:', error);
    return [];
  }

  const result: Array<ConnectBusiness & { stats?: ConnectAnalyticsSummary }> = [];
  const list = asBusinesses(businesses);
  if (list.length === 0) return result;

  // One query for every business's links, so the summaries below are built
  // from the same action list the public profile renders.
  const { data: allLinks } = await requireSupabase()
    .from('connect_links')
    .select('id, business_id, url, label, is_active, sort_order')
    .in(
      'business_id',
      list.map((b) => b.id)
    )
    .order('sort_order', { ascending: true });

  const linksByBusiness = new Map<string, ConnectLink[]>();
  for (const link of (allLinks || []) as ConnectLink[]) {
    const bucket = linksByBusiness.get(link.business_id);
    if (bucket) bucket.push(link);
    else linksByBusiness.set(link.business_id, [link]);
  }

  for (const b of list) {
    const stats = await getConnectAnalyticsSummary(hydrateGallery(b), linksByBusiness.get(b.id) || []);
    result.push({ ...b, stats });
  }

  return result;
}

export async function createConnectBusiness(
  input: CreateConnectBusinessInput
): Promise<{ business: ConnectBusiness; links: ConnectLink[] }> {
  const name = input.name.trim().slice(0, 100);
  const slug = normalizeConnectSlug(input.slug);
  if (!name || !slug) throw new Error('INVALID_BUSINESS: Name and slug are required.');

  const dashboard_token = randomBytes(32).toString('base64url');
  const galleryImages = normalizeGalleryImages(input.gallery_images);

  const payload: Record<string, unknown> = {
    name,
    slug,
    logo_url: input.logo_url?.trim() || null,
    cover_image_url: input.cover_image_url?.trim() || null,
    description: normalizeConnectText(input.description, CONNECT_DESCRIPTION_MAX),
    whatsapp_number: input.whatsapp_number?.trim() || '',
    instagram_handle: input.instagram_handle?.trim() || '',
    facebook_url: input.facebook_url?.trim() || '',
    tiktok_handle: input.tiktok_handle?.trim() || '',
    youtube_url: input.youtube_url?.trim() || '',
    google_maps_url: input.google_maps_url?.trim() || '',
    phone: input.phone?.trim() || '',
    website_url: input.website_url?.trim() || '',
    gallery_images: galleryImages,
    theme_color: normalizeThemeColor(input.theme_color),
    email: normalizeConnectEmail(input.email),
    address: normalizeConnectAddress(input.address),
    bottom_tagline: normalizeConnectText(input.bottom_tagline, CONNECT_BOTTOM_TAGLINE_MAX),
    bottom_button_text: normalizeConnectText(
      input.bottom_button_text,
      CONNECT_BOTTOM_BUTTON_MAX
    ),
    category: normalizeConnectText(input.category, CONNECT_CATEGORY_MAX),
    second_phone: normalizeConnectPhone(input.second_phone),
    office_phone: normalizeConnectPhone(input.office_phone),
    fax: normalizeConnectPhone(input.fax),
    dashboard_token,
    is_active: input.is_active !== undefined ? input.is_active : true,
  };

  if (await supportsGalleryFeaturedColumn()) {
    payload.gallery_featured_url = normalizeGalleryFeaturedUrl(
      input.gallery_featured_url,
      galleryImages
    );
  }

  if (input.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.id)) {
    payload.id = input.id;
  }

  const insertPayload = await dropUnsupportedColumns(payload);

  const { data: business, error } = await requireSupabase()
    .from('connect_businesses')
    .insert(insertPayload)
    .select('*')
    .single();

  if (error) {
    console.error('Supabase DB Error in createConnectBusiness:', error);
    throw new Error(`BUSINESS_CREATE_FAILED: ${describeWriteFailure(error)}`);
  }

  const createdBusiness = hydrateGallery(asBusiness(business));
  const createdLinks: ConnectLink[] = [];

  if (input.links && input.links.length > 0) {
    const linksToInsert = input.links.map((link, idx) => ({
      business_id: createdBusiness.id,
      label: link.label.trim().slice(0, 100),
      url: link.url.trim(),
      icon: link.icon?.trim() || 'link',
      sort_order: link.sort_order !== undefined ? link.sort_order : idx,
      is_active: link.is_active !== undefined ? link.is_active : true,
    }));

    const { data: linksData, error: linksError } = await requireSupabase()
      .from('connect_links')
      .insert(linksToInsert)
      .select();

    if (!linksError && linksData) {
      createdLinks.push(...(linksData as ConnectLink[]));
    } else if (linksError) {
      console.error('Error creating connect_links:', linksError);
    }
  }

  return { business: createdBusiness, links: createdLinks };
}

/**
 * Reconciles the managed link list against the stored rows.
 *
 * Rows are matched on `id` when the client sent one, then on url+label. Matching
 * rows are updated in place and only genuinely new/removed links are
 * inserted/deleted. This is deliberate: `connect_events.link_id` is
 * `on delete set null`, so blindly deleting and reinserting every link on save
 * would silently orphan historical click attributions and zero out the
 * per-link "top links" report.
 */
async function reconcileConnectLinks(
  businessId: string,
  incoming: CreateConnectBusinessInput['links']
): Promise<void> {
  const desired = (incoming || []).map((link, idx) => ({
    id: link.id,
    label: link.label.trim().slice(0, 100),
    url: link.url.trim(),
    icon: link.icon?.trim() || 'link',
    sort_order: link.sort_order !== undefined ? link.sort_order : idx,
    is_active: link.is_active !== undefined ? link.is_active : true,
  }));

  const { data: existingRows, error: readError } = await requireSupabase()
    .from('connect_links')
    .select('*')
    .eq('business_id', businessId);

  if (readError) {
    throw new Error(`LINKS_READ_FAILED: ${readError.message}`);
  }

  const existing = (existingRows as ConnectLink[]) || [];

  const claimed = new Set<string>();
  const toInsert: typeof desired = [];
  const updates: { id: string; patch: Omit<(typeof desired)[number], 'id'> }[] = [];

  // Pass 1: match by explicit id the client already knows about.
  const byId = new Map(existing.map((row) => [row.id, row]));
  for (const link of desired) {
    if (link.id && byId.has(link.id) && !claimed.has(link.id)) {
      claimed.add(link.id);
      const { id, ...patch } = link;
      updates.push({ id, patch });
    }
  }

  // Pass 2: match the remainder by url+label so clients that do not round-trip
  // ids still keep their click history.
  const bySignature = new Map<string, ConnectLink>(
    existing
      .filter((row) => !claimed.has(row.id))
      .map((row) => [`${row.url}::${row.label}`, row])
  );
  for (const link of desired) {
    if (link.id && claimed.has(link.id)) continue;
    const signature = `${link.url}::${link.label}`;
    const match = bySignature.get(signature);
    if (match && !claimed.has(match.id)) {
      claimed.add(match.id);
      updates.push({ id: match.id, patch: { label: link.label, url: link.url, icon: link.icon, sort_order: link.sort_order, is_active: link.is_active } });
    } else {
      toInsert.push(link);
    }
  }

  for (const { id, patch } of updates) {
    const { error } = await requireSupabase()
      .from('connect_links')
      .update(patch)
      .eq('id', id)
      .eq('business_id', businessId);
    if (error) {
      throw new Error(`LINK_UPDATE_FAILED: ${error.message}`);
    }
  }

  if (toInsert.length > 0) {
    const { error } = await requireSupabase()
      .from('connect_links')
      .insert(toInsert.map(({ id: _ignored, ...row }) => ({ business_id: businessId, ...row })));
    if (error) {
      throw new Error(`LINK_INSERT_FAILED: ${error.message}`);
    }
  }

  const removedIds = existing.filter((row) => !claimed.has(row.id)).map((row) => row.id);
  if (removedIds.length > 0) {
    const { error } = await requireSupabase()
      .from('connect_links')
      .delete()
      .eq('business_id', businessId)
      .in('id', removedIds);
    if (error) {
      throw new Error(`LINK_DELETE_FAILED: ${error.message}`);
    }
  }
}

export async function updateConnectBusiness(
  id: string,
  input: Partial<CreateConnectBusinessInput>
): Promise<{ business: ConnectBusiness; links: ConnectLink[] } | null> {
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.name !== undefined) updateData.name = input.name.trim().slice(0, 100);
  if (input.slug !== undefined) updateData.slug = normalizeConnectSlug(input.slug);
  if (input.logo_url !== undefined) updateData.logo_url = input.logo_url.trim() || null;
  if (input.cover_image_url !== undefined) updateData.cover_image_url = input.cover_image_url.trim() || null;
  if (input.description !== undefined) {
    updateData.description = normalizeConnectText(input.description, CONNECT_DESCRIPTION_MAX);
  }
  if (input.whatsapp_number !== undefined) updateData.whatsapp_number = input.whatsapp_number.trim();
  if (input.instagram_handle !== undefined) updateData.instagram_handle = input.instagram_handle.trim();
  if (input.facebook_url !== undefined) updateData.facebook_url = input.facebook_url.trim();
  if (input.tiktok_handle !== undefined) updateData.tiktok_handle = input.tiktok_handle.trim();
  if (input.youtube_url !== undefined) updateData.youtube_url = input.youtube_url.trim();
  if (input.google_maps_url !== undefined) updateData.google_maps_url = input.google_maps_url.trim();
  if (input.phone !== undefined) updateData.phone = input.phone.trim();
  if (input.website_url !== undefined) updateData.website_url = input.website_url.trim();
  if (input.gallery_images !== undefined) {
    updateData.gallery_images = normalizeGalleryImages(input.gallery_images);
  }
  if (input.theme_color !== undefined) {
    updateData.theme_color = normalizeThemeColor(input.theme_color);
  }
  if (input.email !== undefined) updateData.email = normalizeConnectEmail(input.email);
  if (input.address !== undefined) updateData.address = normalizeConnectAddress(input.address);
  if (input.bottom_tagline !== undefined) {
    updateData.bottom_tagline = normalizeConnectText(
      input.bottom_tagline,
      CONNECT_BOTTOM_TAGLINE_MAX
    );
  }
  if (input.bottom_button_text !== undefined) {
    updateData.bottom_button_text = normalizeConnectText(
      input.bottom_button_text,
      CONNECT_BOTTOM_BUTTON_MAX
    );
  }
  if (input.category !== undefined) {
    updateData.category = normalizeConnectText(input.category, CONNECT_CATEGORY_MAX);
  }
  if (input.second_phone !== undefined) {
    updateData.second_phone = normalizeConnectPhone(input.second_phone);
  }
  if (input.office_phone !== undefined) {
    updateData.office_phone = normalizeConnectPhone(input.office_phone);
  }
  if (input.fax !== undefined) {
    updateData.fax = normalizeConnectPhone(input.fax);
  }
  if (input.gallery_featured_url !== undefined || updateData.gallery_images) {
    const nextGallery = Array.isArray(updateData.gallery_images)
      ? (updateData.gallery_images as string[])
      : normalizeGalleryImages(input.gallery_images);
    updateData.gallery_featured_url = normalizeGalleryFeaturedUrl(
      input.gallery_featured_url,
      nextGallery
    );
  }
  if (input.is_active !== undefined) updateData.is_active = Boolean(input.is_active);

  const updatePayload = await dropUnsupportedColumns(updateData);

  const { data: business, error } = await requireSupabase()
    .from('connect_businesses')
    .update(updatePayload)
    .eq('id', id)
    .select('*')
    .maybeSingle();

  if (error) {
    console.error('Supabase DB Error in updateConnectBusiness:', error);
    throw new Error(`BUSINESS_UPDATE_FAILED: ${describeWriteFailure(error)}`);
  }

  if (!business) return null;

  if (input.links !== undefined) {
    await reconcileConnectLinks(id, input.links);
  }

  const { data: links } = await requireSupabase()
    .from('connect_links')
    .select('*')
    .eq('business_id', id)
    .order('sort_order', { ascending: true });

  return {
    business: hydrateGallery(asBusiness(business)),
    links: (links as ConnectLink[]) || [],
  };
}

export async function deleteConnectBusiness(id: string): Promise<boolean> {
  const { error } = await requireSupabase().from('connect_businesses').delete().eq('id', id);
  if (error) throw new Error(`BUSINESS_DELETE_FAILED: ${error.message}`);
  return true;
}

export async function recordConnectEvent(
  business_id: string,
  event_type: ConnectEventType,
  link_id?: string | null,
  metadata?: Record<string, unknown>
): Promise<ConnectEvent | null> {
  const { data, error } = await requireSupabase()
    .from('connect_events')
    .insert({
      business_id,
      event_type,
      link_id: link_id || null,
      metadata: metadata || {},
    })
    .select()
    .single();

  if (error || !data) {
    if (error) console.error('Error recording connect event:', error);
    return null;
  }
  return data as ConnectEvent;
}

/**
 * Builds the analytics summary for one business.
 *
 * Nothing here is keyed to a specific platform. The list of rows comes from
 * `buildConnectActions`, which derives it from the business profile and its
 * links, so the dashboard shows exactly the actions the profile exposes: no
 * Website row without a website, a Catalogue row the day it is added, and
 * nothing at all for a link that was removed.
 *
 * Every stored event resolves to at most one action, so no interaction is ever
 * counted twice, and an event whose action no longer exists is dropped instead
 * of being reported against a row the merchant cannot see.
 */
export async function getConnectAnalyticsSummary(
  business: ConnectBusiness,
  links: Pick<ConnectLink, 'id' | 'url' | 'label' | 'is_active'>[] = []
): Promise<ConnectAnalyticsSummary> {
  const { data: events, error } = await requireSupabase()
    .from('connect_events')
    .select('id, event_type, link_id, metadata, created_at')
    .eq('business_id', business.id)
    .order('created_at', { ascending: false });

  if (error || !events) {
    return summarizeConnectEvents(business, links, []);
  }

  return summarizeConnectEvents(business, links, (events as ConnectEvent[]) || []);
}
