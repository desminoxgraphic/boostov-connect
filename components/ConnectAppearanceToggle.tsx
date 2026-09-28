'use client';

import { Laptop, Moon, Sun } from 'lucide-react';
import { AppearancePreference } from '@/lib/connect-appearance';
import { cn } from '@/lib/utils';

const OPTIONS = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'System', Icon: Laptop },
] as const;

interface Props {
  preference: AppearancePreference;
  onChange: (next: AppearancePreference) => void;
  /** Hidden until the stored choice is known, to avoid showing the wrong mode. */
  ready: boolean;
  className?: string;
}

/**
 * Appearance control for the public profile. Deliberately visitor-side: the
 * business only controls the accent colour, so this needs no admin setting and
 * no schema change.
 */
export default function ConnectAppearanceToggle({ preference, onChange, ready, className }: Props) {
  return (
    <div
      role="radiogroup"
      aria-label="Appearance"
      data-appearance-state={ready ? preference : undefined}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full border border-white/25 bg-black/35 p-1 backdrop-blur-md',
        'transition-opacity duration-200',
        ready ? 'opacity-100' : 'opacity-0',
        className
      )}
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const selected = ready && preference === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`${label} appearance`}
            title={`${label} appearance`}
            onClick={() => onChange(value)}
            className={cn(
              'inline-flex h-7 w-7 items-center justify-center rounded-full transition-all duration-150 active:scale-90',
              selected
                ? 'bg-white text-[#0B1220] shadow-xs'
                : 'text-white/80 hover:bg-white/20 hover:text-white'
            )}
          >
            <Icon className="h-[14px] w-[14px]" strokeWidth={2} />
          </button>
        );
      })}
    </div>
  );
}
