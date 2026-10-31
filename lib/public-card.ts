import { getConnectBusinessBySlug } from './connect-db';
import type { ConnectBusiness, ConnectLink } from './connect-types';

/**
 * Loads a public card on the server. The secret stats token and the owner are
 * removed before anything reaches the visitor's browser.
 */
export async function loadPublicCard(
  slug: string
): Promise<{ business: ConnectBusiness | null; links: ConnectLink[] }> {
  const data = await getConnectBusinessBySlug(slug).catch(() => null);
  if (!data || !data.business.is_active) return { business: null, links: [] };
  const { dashboard_token: _token, reseller_id: _owner, ...publicBusiness } =
    data.business as ConnectBusiness & { reseller_id?: string | null };
  return { business: { ...publicBusiness, dashboard_token: '' } as ConnectBusiness, links: data.links };
}
