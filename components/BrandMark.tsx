import Image from 'next/image';
import { cn } from '@/lib/utils';

/**
 * The official Boostov mark from public/brand/. Never redrawn.
 * `adaptive` swaps to the white-stem version on dark surfaces (site dark mode
 * or a public card shown in dark appearance).
 */
export default function BrandMark({
  size,
  adaptive = false,
  priority = false,
  className,
}: {
  size: number;
  adaptive?: boolean;
  priority?: boolean;
  className?: string;
}) {
  const src = size <= 64 ? '/brand/boostov-logo-128.png' : '/brand/boostov-logo.png';
  const darkSrc = size <= 64 ? '/brand/boostov-logo-dark-128.png' : '/brand/boostov-logo-dark.png';
  return (
    <>
      <Image
        src={src}
        alt="Boostov"
        width={size}
        height={size}
        priority={priority}
        loading={priority ? undefined : 'eager'}
        unoptimized
        className={cn(adaptive && 'brand-light', className)}
      />
      {adaptive && (
        <Image src={darkSrc} alt="" width={size} height={size} loading="eager" unoptimized className={cn('brand-dark', className)} />
      )}
    </>
  );
}
