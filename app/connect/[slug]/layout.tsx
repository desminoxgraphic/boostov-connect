import { APPEARANCE_INIT_SCRIPT } from '@/lib/connect-appearance';

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
