import Link from 'next/link';
import Image from 'next/image';

export default function HomePage() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-[400px] rounded-card border border-line bg-surface p-8 text-center">
        <div className="relative mx-auto mb-6 h-20 w-20 overflow-hidden rounded-tile shadow-sm">
          <Image
            src="/cardify-logo.png"
            alt="Cardify Logo"
            fill
            className="object-cover"
            priority
          />
        </div>

        <h1 className="ct-display">CARDIFY</h1>
        <p className="ct-body mt-2">
          Post-purchase NFC customer experience platform for local businesses.
        </p>

        <Link
          href="/admin"
          className="ct-btn ct-btn-lg mt-6 w-full bg-brand text-on-brand hover:bg-brand-hover"
        >
          Admin Panel
        </Link>
      </div>
    </main>
  );
}
