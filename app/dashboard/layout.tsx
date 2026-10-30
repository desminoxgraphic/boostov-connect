import type { Metadata } from 'next';
import { requirePage } from '@/lib/authz';
import AdminTopBar from '@/components/AdminTopBar';
import ThemeToggle from '@/components/ThemeToggle';
import LogoutButton from '@/components/LogoutButton';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Boostov Partner',
  robots: { index: false, follow: false },
};

/** Server-side gate: an active reseller only. Everything below reads through RLS. */
export default async function ResellerLayout({ children }: { children: React.ReactNode }) {
  const { ctx } = await requirePage('reseller');
  return (
    <div className="sh-page min-h-dvh bg-canvas text-ink">
      <AdminTopBar title="Boostov Partner" subtitle={ctx.email}>
        <ThemeToggle className="hidden sm:inline-flex" />
        <LogoutButton redirectTo="/login" />
      </AdminTopBar>
      <main className="mx-auto max-w-shell px-4 pb-12 pt-5 sm:pt-8">{children}</main>
    </div>
  );
}
