import { CONNECT_GALLERY_MAX_IMAGES } from './connect-utils';
import { RESELLER_MAX_GALLERY } from './reseller-connect';

export { RESELLER_MAX_GALLERY };

/**
 * The Connect create/edit forms are one component used by two audiences.
 * Only where they save and what they may change differs; the fields, layout
 * and public result are identical.
 */
export type ConnectFormVariant = 'admin' | 'reseller';

export interface ConnectFormConfig {
  assetsUrl: string;
  businessesUrl: string;
  capabilitiesUrl: string;
  backHref: string;
  backLabel: string;
  slugPrefix: string;
  /** Reseller merchants are capped to save free-tier storage. */
  maxGallery: number;
  /** Compress images in the browser before upload. */
  compress: boolean;
  /** Admin pages draw their own top bar; reseller pages sit inside the dashboard frame. */
  ownTopBar: boolean;
  /** A reseller's public link never changes once the card may be programmed. */
  slugEditableOnEdit: boolean;
  afterSave: (id: string) => string;
}

export const CONNECT_FORM_CONFIG: Record<ConnectFormVariant, ConnectFormConfig> = {
  admin: {
    assetsUrl: '/api/admin/assets',
    businessesUrl: '/api/admin/connect/businesses',
    capabilitiesUrl: '/api/admin/connect/gallery',
    backHref: '/admin',
    backLabel: 'Back to Admin',
    slugPrefix: '/connect/',
    maxGallery: CONNECT_GALLERY_MAX_IMAGES,
    compress: false,
    ownTopBar: true,
    slugEditableOnEdit: true,
    afterSave: () => '/admin',
  },
  reseller: {
    assetsUrl: '/api/reseller/assets',
    businessesUrl: '/api/reseller/connect/businesses',
    capabilitiesUrl: '/api/reseller/connect/capabilities',
    backHref: '/dashboard',
    backLabel: 'Back to dashboard',
    slugPrefix: '/m/',
    maxGallery: RESELLER_MAX_GALLERY,
    compress: true,
    ownTopBar: false,
    slugEditableOnEdit: false,
    afterSave: (id) => `/dashboard/merchants/${id}/share`,
  },
};
