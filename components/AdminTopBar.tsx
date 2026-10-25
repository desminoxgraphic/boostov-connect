import Image from 'next/image';
import { cn } from '@/lib/utils';

/**
 * Header shared by every admin screen: the Boostov mark, a title, an optional
 * subtitle and whatever actions the screen already had. Layout only.
 */
export default function AdminTopBar({
  title,
  subtitle,
  leading,
  children,
  narrow = false,
}: {
  title: string;
  subtitle?: string;
  /** Replaces the brand mark, e.g. a back link on the form screens. */
  leading?: React.ReactNode;
  children?: React.ReactNode;
  narrow?: boolean;
}) {
  return (
    <header className="sh-bar sticky top-0 z-20">
      <div
        className={cn(
          'mx-auto flex items-center justify-between gap-3 px-4 py-3',
          narrow ? 'max-w-3xl' : 'max-w-shell'
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          {leading ?? (
            <span className="sh-brand-mark" aria-hidden>
              <Image src="/boostov-logo.png" alt="" width={30} height={30} />
            </span>
          )}
          <div className="min-w-0">
            <h1 className="bc-display truncate text-[16px] font-extrabold leading-tight tracking-[-0.02em] text-ink">
              {title}
            </h1>
            {subtitle && <p className="truncate text-[12px] font-medium text-muted">{subtitle}</p>}
          </div>
        </div>
        {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
      </div>
    </header>
  );
}
