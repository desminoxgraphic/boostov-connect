import BrandMark from './BrandMark';
import { cn } from '@/lib/utils';

/**
 * "Powered by [mark] boostov.ma" -- the same footer line the Grow pages use
 * (cardifyv1 `PoweredBy`), linked to boostov.ma. Keep the two in step: same
 * mark, same 11px type, same ink/blue split on the wordmark.
 *
 * `tone="dark"` is for dark surfaces; on the public card it follows the
 * visitor's appearance through the `.dark-surface` scope instead.
 */
export default function BoostovPoweredBy({
  tone = 'light',
  className,
}: {
  tone?: 'light' | 'dark';
  className?: string;
}) {
  return (
    <a
      href="https://boostov.ma"
      target="_blank"
      rel="noreferrer"
      className={cn(
        'bc-powered group inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium',
        'transition-colors duration-150',
        tone === 'light' ? 'text-[#8A8A96] hover:text-[#26262B]' : 'text-white/45 hover:text-white/70',
        className
      )}
    >
      Powered by
      <span className="bc-powered-mark">
        <BrandMark size={14} adaptive />
      </span>
      <span className={cn('font-bold', tone === 'light' ? 'text-[#26262B]' : 'text-white/85')}>
        boostov<span className="text-[#2563EB]">.ma</span>
      </span>
    </a>
  );
}
