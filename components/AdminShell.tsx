import AdminTopBar from './AdminTopBar';
import AdminNav, { type AdminTab } from './AdminNav';
import ThemeToggle from './ThemeToggle';
import LogoutButton from './LogoutButton';

/** Frame for the server-rendered admin screens (resellers, all merchants). */
export default function AdminShell({
  tab,
  subtitle,
  children,
}: {
  tab: AdminTab;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="sh-page min-h-dvh">
      <AdminTopBar title="BOOSTOV Admin" subtitle={subtitle}>
        <ThemeToggle className="hidden sm:inline-flex" />
        <LogoutButton redirectTo="/admin/login" />
      </AdminTopBar>
      <main className="mx-auto max-w-shell space-y-5 px-4 pb-12 pt-5 sm:space-y-6 sm:pt-8">
        <AdminNav active={tab} />
        {children}
      </main>
    </div>
  );
}

export function StatusChip({ status }: { status: 'pending' | 'active' | 'suspended' }) {
  const styles = {
    active: 'border-success-border bg-success-soft text-success',
    pending: 'border-warning-border bg-warning-soft text-warning',
    suspended: 'border-danger-border bg-danger-soft text-danger',
  } as const;
  const labels = { active: 'Active', pending: 'Invite sent', suspended: 'Suspended' } as const;
  return <span className={`ct-chip border ${styles[status]}`}>{labels[status]}</span>;
}
