import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Boostov Admin',
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-canvas text-ink">{children}</div>;
}
