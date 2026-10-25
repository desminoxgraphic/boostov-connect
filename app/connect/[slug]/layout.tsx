import type { Metadata, Viewport } from 'next';
import { APPEARANCE_INIT_SCRIPT } from '@/lib/connect-appearance';

/* The tab title is the only visible place the old product name leaked onto
 * the public profile. */
export const metadata: Metadata = {
  title: 'boostov.ma',
};

/* `cover` lets the hero run under the notch; the card pads itself with
 * env(safe-area-inset-*) so nothing lands beneath system UI. */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

/**
 * Resolves the visitor's stored appearance before first paint, so a public
 * profile never flashes the wrong mode while the card hydrates.
 */
export default function PublicProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: APPEARANCE_INIT_SCRIPT }} />
      {children}
    </>
  );
}
