import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { Bricolage_Grotesque } from 'next/font/google';
import ThemeProvider from '@/components/ThemeProvider';
import './globals.css';

/* Display face for names, headings and big numbers across every surface. */
const display = Bricolage_Grotesque({
  subsets: ['latin', 'latin-ext'],
  weight: ['600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Cardify - Post-Purchase Experience',
  description: 'Tap NFC for your post-purchase reward',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F6F7F9' },
    { media: '(prefers-color-scheme: dark)', color: '#090B10' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable} ${display.variable}`}
    >
      <body className="min-h-dvh bg-canvas font-sans text-ink antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
