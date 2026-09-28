'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Laptop, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';

const OPTIONS = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'System', Icon: Laptop },
] as const;

interface Props {
  /** `onCover` sits over a photo, so it needs its own translucent treatment. */
  variant?: 'default' | 'onCover';
  className?: string;
  align?: 'start' | 'end';
}

export default function ThemeToggle({ variant = 'default', className, align = 'end' }: Props) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const active = mounted ? (theme ?? 'system') : 'system';
  const onCover = variant === 'onCover';

  return (
    <div
      role="radiogroup"
      aria-label="Appearance"
      data-theme-state={mounted ? active : undefined}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-[14px] p-1',
        onCover
          ? 'border border-white/20 bg-black/35 backdrop-blur-md'
          : 'border border-line bg-surface-2',
        className
      )}
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const selected = active === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`${label} theme`}
            title={`${label} theme`}
            onClick={() => setTheme(value)}
            className={cn(
              'inline-flex h-8 w-8 items-center justify-center rounded-[10px] transition-all duration-150',
              onCover
                ? selected
                  ? 'bg-white text-ink shadow-xs'
                  : 'text-white/75 hover:bg-white/15 hover:text-white'
                : selected
                  ? 'bg-surface text-ink shadow-xs'
                  : 'text-muted hover:text-ink'
            )}
          >
            <Icon className="h-[15px] w-[15px]" strokeWidth={2} />
          </button>
        );
      })}
    </div>
  );
}
