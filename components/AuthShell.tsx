import Image from 'next/image';
import { Lock } from 'lucide-react';

/** Centered sign-in card shared by every auth screen (admin, reseller, links). */
export default function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="sh-page relative flex min-h-dvh items-center justify-center overflow-hidden p-4">
      <span aria-hidden className="sh-login-orbit">
        <span />
        <span />
        <span />
      </span>
      <div className="sh-rise relative w-full max-w-sm">
        <div className="mb-7 text-center">
          <div className="sh-brand-mark mx-auto h-16 w-16 rounded-[22px]">
            <Image src="/boostov-logo.png" alt="" width={46} height={46} priority />
          </div>
          <h1 className="ct-display mt-5 text-[28px]">{title}</h1>
          <p className="mt-1.5 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted">
            <Lock className="h-3.5 w-3.5" strokeWidth={2.25} />
            {subtitle}
          </p>
        </div>
        <div className="ct-card space-y-4 p-6 shadow-lg sm:p-7">{children}</div>
      </div>
    </div>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="rounded-[14px] border border-danger-border bg-danger-soft px-3.5 py-2.5 text-center text-[12.5px] font-medium text-danger"
    >
      {message}
    </div>
  );
}
