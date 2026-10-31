import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { supabaseServer } from '@/lib/supabase/server';
import { loadAdminOverview, type AdminOverview } from '@/lib/admin-overview';
import AdminTopBar from '@/components/AdminTopBar';
import ThemeToggle from '@/components/ThemeToggle';
import LogoutButton from '@/components/LogoutButton';
import AdminHome from '@/components/admin/AdminHome';
import { getAppUrl } from '@/lib/app-url';

export const dynamic = 'force-dynamic';

const EMPTY: AdminOverview = { requests: [], resellers: [], cards: [], totals: { resellers: 0, cards: 0, taps: 0, taps_7d: 0 } };

/** The super admin panel: everything on one screen. */
export default async function AdminPage() {
  const overview = supabaseServer ? await loadAdminOverview(supabaseServer) : EMPTY;
  return (
    <div className="sh-page min-h-dvh">
      <AdminTopBar title="Boostov Admin" subtitle="Resellers & cards">
        <ThemeToggle className="hidden sm:inline-flex" />
        <Link
          href="/admin/mfa"
          className="ct-btn ct-btn-icon h-10 w-10 border border-line bg-surface"
          title="Security (2FA)"
          aria-label="Security settings"
        >
          <ShieldCheck className="h-4 w-4" />
        </Link>
        <LogoutButton redirectTo="/connexion" />
      </AdminTopBar>
      <main className="mx-auto max-w-shell px-4 pb-16 pt-5 sm:pt-8">
        <AdminHome overview={overview} appUrl={getAppUrl()} now={Date.now()} />
      </main>
    </div>
  );
}
