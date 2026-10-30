import Link from 'next/link';
import { cn } from '@/lib/utils';

const TABS = [
  { key: 'profiles', href: '/admin', label: 'My profiles' },
  { key: 'resellers', href: '/admin/resellers', label: 'Resellers' },
  { key: 'merchants', href: '/admin/merchants', label: 'All merchants' },
  { key: 'security', href: '/admin/mfa', label: 'Security' },
] as const;

export type AdminTab = (typeof TABS)[number]['key'];

/** Section switcher for the super admin panel. Scrolls sideways on phones. */
export default function AdminNav({ active }: { active: AdminTab }) {
  return (
    <nav aria-label="Admin sections" className="ct-scroll-none -mx-4 overflow-x-auto px-4">
      <div className="inline-flex gap-1 rounded-full border border-line bg-surface p-1 shadow-sm">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={active === tab.key ? 'page' : undefined}
            className={cn(
              'whitespace-nowrap rounded-full px-4 py-2 text-[13px] font-semibold transition-colors',
              active === tab.key ? 'bg-ink text-canvas' : 'text-muted hover:bg-surface-2 hover:text-ink'
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
