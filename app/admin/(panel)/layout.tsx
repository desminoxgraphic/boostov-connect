import { requirePage } from '@/lib/authz';

export const dynamic = 'force-dynamic';

/**
 * Server-side gate for every admin screen: super admin with a TOTP-verified
 * session only. A reseller gets a 404, even with the exact URL.
 */
export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  await requirePage('admin');
  return <>{children}</>;
}
