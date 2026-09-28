'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ComponentProps } from 'react';

type Props = ComponentProps<typeof NextThemesProvider>;

/**
 * App shell theme (admin + merchant dashboard). The public profile has its own
 * visitor-controlled appearance, see lib/connect-appearance.ts.
 */
export default function ThemeProvider({ children, ...props }: Props) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey="boostov-appearance"
      themes={['light', 'dark', 'system']}
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
